// src/services/notificationService.js
// 표준 스키마: notifications/{uid}/items/{docId}
import { auth, db } from "@/firebase/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

/** 알림 생성 (일반적으로는 Cloud Functions에서 생성 권장) */
export async function addNotificationForUser(
  toUid,
  { type = "system", title = "", body = "", link = "", meta = {} }
) {
  if (!toUid) throw new Error("toUid is required");
  const col = collection(db, "notifications", toUid, "items");
  await addDoc(col, {
    type,
    title,
    body,
    link,
    data: { ...meta, type, link },
    read: false,
    createdAt: serverTimestamp(), // 서버시간
  });
}

/** 최신 알림 N개 실시간 구독 */
export function listenToMyNotifications(uid, cb, take = 20) {
  if (!uid) return () => {};
  const qy = query(
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc"),
    limit(take)
  );
  return onSnapshot(qy, (snap) => {
    const arr = [];
    snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
    cb(arr);
  });
}

/** 읽지 않은 개수 실시간 구독 */
export function listenUnreadCount(uid, cb) {
  if (!uid) return () => cb(0);
  const qy = query(
    collection(db, "notifications", uid, "items"),
    where("read", "==", false)
  );
  return onSnapshot(qy, (snap) => cb(snap.size || 0));
}

/** ✅ 단건 읽음 처리
 *  사용법:
 *    markNotificationAsRead(notificationId)       // 현재 로그인 사용자
 *    markNotificationAsRead(notificationId, uid)  // 특정 사용자
 */
export async function markNotificationAsRead(notificationId, uid) {
  const _uid = uid || auth.currentUser?.uid;
  if (!_uid || !notificationId) return;
  const ref = doc(db, "notifications", _uid, "items", notificationId);
  await updateDoc(ref, { read: true, readAt: serverTimestamp?.() });
}

/** ✅ 모두 읽음 처리 */
export async function markAllNotificationsAsRead(uid) {
  const _uid = uid || auth.currentUser?.uid;
  if (!_uid) return;
  const qy = query(
    collection(db, "notifications", _uid, "items"),
    where("read", "==", false)
  );
  const snap = await getDocs(qy);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.forEach((d) => batch.update(d.ref, { read: true, readAt: serverTimestamp?.() }));
  await batch.commit();
}

/* 하위호환 별칭 */
export const markAllAsReadForUser = markAllNotificationsAsRead;
