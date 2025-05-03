// src/services/chatService.js
import { db, storage } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,       // ← participants 명시적 업데이트용
  doc,
  runTransaction,
  serverTimestamp,
  increment,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * 채팅방 생성 또는 기존 채팅방 조회
 * participantsKey: 두 UID를 정렬하여 고유 키 생성
 */
export async function createOrGetChatRoom(userId1, userId2, productId) {
  const participantsKey = [userId1, userId2].sort().join("_");
  const chatsRef = collection(db, "chats");

  // 1) 이미 존재하는 방이 있는지 검사
  const q = query(
    chatsRef,
    where("participantsKey", "==", participantsKey),
    where("productId", "==", productId)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].id;
  }

  // 2) 새 방 생성 (participants 제외)
  const newRoomRef = await addDoc(chatsRef, {
    participantsKey,
    productId,
    lastMessage: "",
    lastUpdated: serverTimestamp(),
    unreadCount: { [userId1]: 0, [userId2]: 0 },
  });

  // 3) participants 를 명시적으로 추가
  await updateDoc(newRoomRef, {
    participants: [userId1, userId2],
  });

  return newRoomRef.id;
}

/**
 * 텍스트 메시지 전송
 * 트랜잭션으로 lastMessage, lastUpdated, unreadCount 동시 업데이트
 */
export async function sendMessage(chatId, senderId, text) {
  const chatDocRef = doc(db, "chats", chatId);
  const messagesCol = collection(db, "chats", chatId, "messages");

  await runTransaction(db, async tx => {
    const chatSnap = await tx.get(chatDocRef);
    if (!chatSnap.exists()) throw new Error("채팅방이 존재하지 않습니다.");

    const data = chatSnap.data();
    const otherId = data.participants.find(id => id !== senderId);

    // (1) 메시지 추가
    await tx.set(doc(messagesCol), {
      sender: senderId,
      text,
      timestamp: serverTimestamp(),
      readBy: [senderId],
    });

    // (2) 채팅방 메타 업데이트
    tx.update(chatDocRef, {
      lastMessage: text,
      lastUpdated: serverTimestamp(),
      [`unreadCount.${otherId}`]: increment(1),
    });
  });
}

/**
 * 이미지 메시지 전송
 * Storage 업로드 후 URL 저장
 */
export async function sendImageMessage(chatId, senderId, file) {
  // 1) 이미지 업로드
  const path = `chatImages/${chatId}/${Date.now()}_${file.name}`;
  const imgRef = ref(storage, path);
  const snapshot = await uploadBytes(imgRef, file);
  const url = await getDownloadURL(snapshot.ref);

  // 2) 메시지 저장 + 채팅방 업데이트
  const chatDocRef = doc(db, "chats", chatId);
  const messagesCol = collection(db, "chats", chatId, "messages");

  await runTransaction(db, async tx => {
    const chatSnap = await tx.get(chatDocRef);
    if (!chatSnap.exists()) throw new Error("채팅방이 존재하지 않습니다.");

    const data = chatSnap.data();
    const otherId = data.participants.find(id => id !== senderId);

    await tx.set(doc(messagesCol), {
      sender: senderId,
      imageUrl: url,
      timestamp: serverTimestamp(),
      readBy: [senderId],
    });

    tx.update(chatDocRef, {
      lastMessage: "[이미지]",
      lastUpdated: serverTimestamp(),
      [`unreadCount.${otherId}`]: increment(1),
    });
  });
}

/**
 * 특정 채팅방 메시지 실시간 구독
 * callback: 메시지 배열
 */
export function subscribeToMessages(chatId, callback) {
  const msgRef = collection(db, "chats", chatId, "messages");
  const q = query(msgRef, orderBy("timestamp", "asc"));
  return onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
}

/**
 * 로그인 사용자가 참여 중인 채팅방 목록 조회
 */
export async function fetchChatRooms(userId) {
  const chatsRef = collection(db, "chats");
  const q = query(
    chatsRef,
    where("participants", "array-contains", userId),
    orderBy("lastUpdated", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
