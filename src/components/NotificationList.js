// src/components/notificationsList.js
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, updateDoc, doc 
} from "firebase/firestore";
import { db } from "./firebase";

// 실시간 구독 (알림함)
export function subscribeNotifications(userId, callback) {
  const q = query(
    collection(db, "notifications"),
    where("to", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list);
  });
}

// 읽음 처리
export function markAsRead(notificationId) {
  const ref = doc(db, "notifications", notificationId);
  return updateDoc(ref, { read: true });
}

// 전체 읽음 처리
export async function markAllAsRead(userId) {
  const q = query(
    collection(db, "notifications"),
    where("to", "==", userId),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.forEach(d => batch.update(d.ref, { read: true }));
  return batch.commit();
}

// 서버(Cloud Function)에서 호출할 수도 있는 “새 알림 등록” 함수
export function sendNotification(toUserId, { title, body, data = {} }) {
  return addDoc(collection(db, "notifications"), {
    to:      toUserId,
    title,
    body,
    data,
    read:    false,
    createdAt: serverTimestamp()
  });
}
