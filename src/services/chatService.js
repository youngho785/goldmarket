// src/services/chatService.js
import { db, storage } from "../firebase/firebase";
import {
  collection, doc, setDoc, onSnapshot, query, orderBy, where, getDocs,
  serverTimestamp, writeBatch, arrayUnion, limit, increment, updateDoc, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImage } from "../utils/imageCompression";

// Functions로 후처리(미읽음 카운트 등)를 할지 여부
const USE_CLOUD_FUNCTIONS = true;

/** 채팅방 ID 규칙: productId + 두 uid 사전순 */
function getChatRoomId(productId, userId1, userId2) {
  const [a, b] = [userId1, userId2].sort();
  return `${productId}_${a}_${b}`;
}

/** participants/메타 필드 보정(구문서 호환) */
async function fixChatDocShapeIfNeeded(chatRef, requiredUids = []) {
  const snap = await getDoc(chatRef);
  if (!snap.exists()) return null;

  const data = snap.data() || {};
  let changed = false;

  let participants = Array.isArray(data.participants) ? [...data.participants] : null;
  if (!participants) {
    const keys = Object.keys(data.participantsMap || {});
    participants = Array.from(new Set([...keys, ...requiredUids])).sort();
    changed = true;
  } else {
    requiredUids.forEach((u) => {
      if (u && !participants.includes(u)) { participants.push(u); changed = true; }
    });
    participants.sort();
  }

  const participantsMap = { ...(data.participantsMap || {}) };
  participants.forEach((u) => { if (!participantsMap[u]) participantsMap[u] = true; });

  const unreadCount = { ...(data.unreadCount || {}) };
  participants.forEach((u) => { if (typeof unreadCount[u] !== "number") unreadCount[u] = 0; });

  const updates = {};
  if (changed || !data.participants) {
    updates.participants = participants;
    updates.participantsMap = participantsMap;
    updates.unreadCount = unreadCount;
  }
  if (!data.lastUpdated) updates.lastUpdated = serverTimestamp();
  if (!data.updatedAt) updates.updatedAt = serverTimestamp();

  if (Object.keys(updates).length) await updateDoc(chatRef, updates);

  return { ...data, participants, participantsMap, unreadCount };
}

/**
 * ✅ 방 생성 or 기존 방 반환(더 견고)
 * 1) 규칙 기반 ID로 먼저 조회 → 있으면 반환
 * 2) 생성 시도(setDoc merge)
 * 3) 생성 실패(권한 등) 시 Fallback:
 *    - productId == X AND participants array-contains buyer 로 조회
 *    - 그중 participants에 seller가 포함된 방을 찾아 반환
 */
export async function createOrGetChatRoom(productId, sellerId, buyerId) {
  if (!productId || !sellerId || !buyerId) {
    throw new Error("createOrGetChatRoom: 파라미터 오류");
  }

  const chatRoomId = getChatRoomId(productId, sellerId, buyerId);
  const chatRef = doc(db, "chats", chatRoomId);

  // 1) 규칙 기반 ID로 먼저 확인
  try {
    const existSnap = await getDoc(chatRef);
    if (existSnap.exists()) {
      try { await fixChatDocShapeIfNeeded(chatRef, [sellerId, buyerId]); } catch {}
      return chatRoomId;
    }
  } catch (e) {
    // 그냥 진행 (네트워크 일시 오류일 수 있음)
  }

  // 2) 생성 시도(merge)
  try {
    await setDoc(
      chatRef,
      {
        productId,
        participants: [sellerId, buyerId].sort(),
        participantsMap: { [sellerId]: true, [buyerId]: true },
        unreadCount: { [sellerId]: 0, [buyerId]: 0 },
        lastMessage: "",
        lastMessageAt: null,
        lastUpdated: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    try { await fixChatDocShapeIfNeeded(chatRef, [sellerId, buyerId]); } catch {}
    return chatRoomId;
  } catch (createErr) {
    // 3) Fallback: 권한 문제 등으로 생성이 막힐 때, 기존 방을 찾아 반환
    try {
      const q = query(
        collection(db, "chats"),
        where("productId", "==", productId),
        where("participants", "array-contains", buyerId),
        limit(10)
      );
      const snaps = await getDocs(q);
      const found = snaps.docs.find((d) => {
        const p = d.data()?.participants || [];
        return Array.isArray(p) && p.includes(sellerId);
      });
      if (found) {
        const foundRef = doc(db, "chats", found.id);
        try { await fixChatDocShapeIfNeeded(foundRef, [sellerId, buyerId]); } catch {}
        return found.id;
      }
    } catch (fallbackErr) {
      // 무시하고 최종 throw
    }
    // 최종 실패
    throw createErr;
  }
}

/** 내 채팅방 목록(최신순) */
export async function fetchChatRooms(myUid) {
  if (!myUid) return [];
  const snaps = await getDocs(query(
    collection(db, "chats"),
    where("participants", "array-contains", myUid),
    orderBy("lastUpdated", "desc")
  ));
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 내 채팅방 실시간 구독 */
export function subscribeMyChats(myUid, onChange, onError) {
  if (!myUid) return () => {};
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", myUid),
    orderBy("lastUpdated", "desc")
  );
  return onSnapshot(q, (snap) => {
    onChange?.(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/** 메시지 실시간 구독 */
export function subscribeToMessages(chatRoomId, callback, onError) {
  const q = query(collection(db, "chats", chatRoomId, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/** 텍스트 메시지 전송 */
export async function sendMessage(chatRoomId, senderId, text) {
  if (!chatRoomId || !senderId || !text) return null;

  const chatRef = doc(db, "chats", chatRoomId);
  const fixed = await fixChatDocShapeIfNeeded(chatRef);
  const participants = fixed?.participants || [];

  const msgRef = doc(collection(chatRef, "messages"));

  if (USE_CLOUD_FUNCTIONS) {
    await setDoc(msgRef, {
      sender: senderId,
      text,
      imageUrl: null,
      timestamp: serverTimestamp(),
      readBy: [senderId],
    });
    return msgRef.id;
  }

  const batch = writeBatch(db);
  batch.set(msgRef, {
    sender: senderId,
    text,
    imageUrl: null,
    timestamp: serverTimestamp(),
    readBy: [senderId],
  });

  const receivers = participants.filter((u) => u !== senderId);
  const updates = {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  receivers.forEach((uid) => { updates[`unreadCount.${uid}`] = increment(1); });

  batch.update(chatRef, updates);
  await batch.commit();
  return msgRef.id;
}

/** 이미지 메시지 전송 */
export async function sendImageMessage(
  chatRoomId,
  senderId,
  file,
  opts = { compress: true, maxW: 2048, maxH: 2048, quality: 0.82, preferMime: "image/jpeg", maxSizeMB: 15 }
) {
  if (!chatRoomId || !senderId || !file) return null;
  const { compress = true, maxW = 2048, maxH = 2048, quality = 0.82, preferMime = "image/jpeg", maxSizeMB = 15 } = opts;
  const MAX_SIZE = maxSizeMB * 1024 * 1024;

  let work = file;
  if (compress && file.size > 1 * 1024 * 1024) {
    try { work = await compressImage(file, { maxW, maxH, quality, preferMime }); }
    catch (e) { console.warn("image compress failed:", e); }
  }
  if (work.size > MAX_SIZE) throw new Error(`이미지 용량이 ${maxSizeMB}MB를 초과합니다.`);

  const safeName = (work.name || file.name || "image").replace(/[^\w.-]/g, "_");
  const fileRef = ref(storage, `chatImages/${chatRoomId}/${Date.now()}_${safeName}`);
  await uploadBytes(fileRef, work);
  const imageUrl = await getDownloadURL(fileRef);

  const chatRef = doc(db, "chats", chatRoomId);
  const fixed = await fixChatDocShapeIfNeeded(chatRef);
  const participants = fixed?.participants || [];

  const msgRef = doc(collection(chatRef, "messages"));

  if (USE_CLOUD_FUNCTIONS) {
    await setDoc(msgRef, {
      sender: senderId,
      text: "",
      imageUrl,
      timestamp: serverTimestamp(),
      readBy: [senderId],
    });
    return msgRef.id;
  }

  const batch = writeBatch(db);
  batch.set(msgRef, {
    sender: senderId,
    text: "",
    imageUrl,
    timestamp: serverTimestamp(),
    readBy: [senderId],
  });

  const receivers = participants.filter((u) => u !== senderId);
  const updates = {
    lastMessage: "[이미지]",
    lastMessageAt: serverTimestamp(),
    lastUpdated: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  receivers.forEach((uid) => { updates[`unreadCount.${uid}`] = increment(1); });

  batch.update(chatRef, updates);
  await batch.commit();
  return msgRef.id;
}

/** 읽음 처리(최근 N개) */
export async function markMessagesAsRead(chatRoomId, myUid, take = 200) {
  if (!chatRoomId || !myUid) return;

  const snaps = await getDocs(query(
    collection(db, "chats", chatRoomId, "messages"),
    orderBy("timestamp", "desc"), limit(take)
  ));

  const batch = writeBatch(db);
  snaps.docs.forEach((s) => {
    const m = s.data();
    if (m.sender !== myUid && !(m.readBy?.includes(myUid))) {
      batch.update(doc(db, "chats", chatRoomId, "messages", s.id), { readBy: arrayUnion(myUid) });
    }
  });
  batch.update(doc(db, "chats", chatRoomId), { [`unreadCount.${myUid}`]: 0 });
  await batch.commit();
}

/** 타이핑 표시(서브컬렉션) */
export async function setTyping(chatRoomId, uid, isTyping) {
  if (!chatRoomId || !uid) return;
  try {
    await setDoc(doc(db, "chats", chatRoomId, "typing", uid), {
      uid, isTyping: !!isTyping, updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) { console.warn("setTyping failed:", e?.message || e); }
}

/** 상대 타이핑 구독 */
export function subscribeTyping(chatRoomId, watchUid, cb) {
  if (!chatRoomId || !watchUid) return () => {};
  return onSnapshot(doc(db, "chats", chatRoomId, "typing", watchUid),
    (snap) => cb?.(!!snap.data()?.isTyping),
    () => cb?.(false)
  );
}

/** FCM 토큰 저장(옵션) */
export async function registerFcmToken(uid, token) {
  if (!uid || !token) return;
  try {
    await setDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) }, { merge: true });
  } catch (e) { console.warn("registerFcmToken failed:", e?.message || e); }
}
