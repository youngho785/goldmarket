// src/services/chatService.js
import { db, storage } from "../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  onSnapshot,
  orderBy,
  getDoc,
  increment  // arrayUnion 제거
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * 두 사용자의 채팅방을 찾거나 없으면 새로 생성합니다.
 * @param {string} userId1 - 현재 사용자 (구매자)
 * @param {string} userId2 - 판매자
 * @param {string} productId - 상품 ID
 * @returns {Promise<string>} - 생성된 채팅방 ID
 */
export const createOrGetChatRoom = async (userId1, userId2, productId) => {
  // participantsKey: 두 UID를 정렬하여 연결 (예: "buyerUid_sellerUid")
  const participantsKey = [userId1, userId2].sort().join("_");
  const q = query(
    collection(db, "chats"),
    where("participantsKey", "==", participantsKey),
    where("productId", "==", productId)
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  // unreadCount 초기값: 각 참여자별로 0 설정
  const unreadCount = { [userId1]: 0, [userId2]: 0 };

  const docRef = await addDoc(collection(db, "chats"), {
    participants: [userId1, userId2],
    participantsKey,
    productId,
    lastMessage: "",
    lastUpdated: serverTimestamp(),
    unreadCount,
  });
  return docRef.id;
};

/**
 * 텍스트 메시지 전송 및 채팅방 메타 데이터 업데이트
 * @param {string} chatId 
 * @param {string} sender - 전송자 UID
 * @param {string} text - 메시지 내용
 */
export const sendMessage = async (chatId, sender, text) => {
  // 메시지 추가
  await addDoc(collection(db, "chats", chatId, "messages"), {
    sender,
    text,
    timestamp: serverTimestamp(),
    readBy: [sender], // 보낸 사람은 기본적으로 읽음 처리
  });
  // 채팅방 메타 데이터 업데이트: 마지막 메시지, 최근 업데이트, 상대방 unreadCount 증가
  const chatDocRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatDocRef);
  if (chatSnap.exists()) {
    const chatData = chatSnap.data();
    // 상대방 UID: participants 배열에서 sender 제외
    const otherUid = chatData.participants.find((uid) => uid !== sender);
    await updateDoc(chatDocRef, {
      lastMessage: text,
      lastUpdated: serverTimestamp(),
      [`unreadCount.${otherUid}`]: increment(1),
    });
  }
};

/**
 * 이미지 메시지 전송
 * @param {string} chatId 
 * @param {string} sender - 전송자 UID
 * @param {File} file - 이미지 파일
 */
export const sendImageMessage = async (chatId, sender, file) => {
  const storageRef = ref(storage, `chatImages/${chatId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const imageUrl = await getDownloadURL(storageRef);
  await addDoc(collection(db, "chats", chatId, "messages"), {
    sender,
    text: "",
    imageUrl,
    timestamp: serverTimestamp(),
    readBy: [sender],
  });
  const chatDocRef = doc(db, "chats", chatId);
  await updateDoc(chatDocRef, {
    lastMessage: "이미지 전송",
    lastUpdated: serverTimestamp(),
    // 상대방 unreadCount 증가
  });
};

/**
 * 채팅방의 메시지를 실시간 구독합니다.
 * @param {string} chatId 
 * @param {function} callback - 메시지 배열을 처리하는 콜백 함수
 * @returns {function} - 구독 해제 함수
 */
export const subscribeToMessages = (chatId, callback) => {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("timestamp", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(msgs);
  });
};

/**
 * 로그인한 사용자가 참여 중인 채팅방 목록 조회
 * @param {string} userId 
 * @returns {Promise<Array>} - 채팅방 목록 배열
 */
export const fetchChatRooms = async (userId) => {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
