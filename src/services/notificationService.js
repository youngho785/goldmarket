// src/services/notificationService.js
// 표준 스키마: notifications/{uid}/items/{docId}
import { auth, db } from "@/firebase/firebase";
import {
  collection,
  doc,
  documentId,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

const PAGE_SIZE_DEFAULT = 30;
const BATCH_SAFE_SIZE = 400;

function isStaleAuthSubscription(uid) {
  return !auth.currentUser || auth.currentUser.uid !== uid;
}

/** 최신 알림 N개 실시간 구독 */
export function listenToMyNotifications(uid, cb, take = 20, onError) {
  if (!uid) {
    cb?.([]);
    return () => {};
  }

  const qy = query(
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc"),
    limit(Math.max(1, Math.min(Number(take) || 20, 100)))
  );

  return onSnapshot(
    qy,
    (snap) => {
      if (isStaleAuthSubscription(uid)) return;
      cb?.(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    (error) => {
      if (isStaleAuthSubscription(uid)) return;
      console.warn("[notificationService] latest subscription failed:", error);
      cb?.([]);
      onError?.(error);
    }
  );
}

/** 읽지 않은 개수 실시간 구독 */
export function listenUnreadCount(uid, cb, onError) {
  if (!uid) {
    cb?.(0);
    return () => {};
  }

  const qy = query(
    collection(db, "notifications", uid, "items"),
    where("read", "==", false)
  );

  return onSnapshot(
    qy,
    (snap) => {
      if (isStaleAuthSubscription(uid)) return;
      cb?.(snap.size || 0);
    },
    (error) => {
      if (isStaleAuthSubscription(uid)) return;
      console.warn("[notificationService] unread subscription failed:", error);
      cb?.(0);
      onError?.(error);
    }
  );
}

/**
 * 알림 페이지 조회
 * @param {string} uid
 * @param {import("firebase/firestore").QueryDocumentSnapshot|null} cursor
 * @param {number} take
 */
export async function fetchNotificationsPage(
  uid,
  cursor = null,
  take = PAGE_SIZE_DEFAULT
) {
  if (!uid) {
    return { items: [], cursor: null, hasMore: false };
  }

  const size = Math.max(1, Math.min(Number(take) || PAGE_SIZE_DEFAULT, 100));
  const parts = [
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc"),
  ];

  const qy = cursor
    ? query(...parts, startAfter(cursor), limit(size))
    : query(...parts, limit(size));

  const snap = await getDocs(qy);
  const items = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  return {
    items,
    cursor: snap.docs.at(-1) || null,
    hasMore: snap.size === size,
  };
}

/** 단건 읽음 처리 */
export async function markNotificationAsRead(notificationId, uid) {
  const targetUid = uid || auth.currentUser?.uid;
  if (!targetUid || !notificationId) return false;

  const ref = doc(db, "notifications", targetUid, "items", notificationId);
  await updateDoc(ref, {
    read: true,
    readAt: serverTimestamp(),
  });
  return true;
}

/**
 * 모두 읽음 처리
 * Firestore batch 제한(500개)을 피하기 위해 최대 400개씩 반복합니다.
 */
export async function markAllNotificationsAsRead(uid) {
  const targetUid = uid || auth.currentUser?.uid;
  if (!targetUid) return 0;

  let updated = 0;

  for (;;) {
    const unreadQuery = query(
      collection(db, "notifications", targetUid, "items"),
      where("read", "==", false),
      orderBy(documentId()),
      limit(BATCH_SAFE_SIZE)
    );
    const snap = await getDocs(unreadQuery);
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach((item) => {
      batch.update(item.ref, {
        read: true,
        readAt: serverTimestamp(),
      });
    });
    await batch.commit();

    updated += snap.size;
    if (snap.size < BATCH_SAFE_SIZE) break;
  }

  return updated;
}

export const markAllAsReadForUser = markAllNotificationsAsRead;
