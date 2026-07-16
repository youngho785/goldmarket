// src/services/exchange.js
import { db } from '../firebase/firebase';
import {
  collection, addDoc, doc, updateDoc,
  serverTimestamp, Timestamp
} from 'firebase/firestore';

// 교환 요청 생성 (생성 시 Cloud Functions가 "요청 알림" 전송)
export async function createExchange({
  userId,            // 요청자 uid (필수)
  buyerUid,          // 구매자 uid (옵션)
  sellerUid,         // 판매자 uid (옵션)
  requesterName,     // 요청자 표시명 (옵션)
  productTitle,      // 상품명 (옵션)
  quantity,          // g 단위 (옵션)
  note               // 메모 (옵션)
}) {
  const payload = {
    userId: userId || null,
    buyerUid: buyerUid || null,
    sellerUid: sellerUid || null,
    requesterName: requesterName || null,
    productTitle: productTitle || null,
    quantity: quantity != null ? Number(quantity) : null,
    status: 'requested',                 // 최초 상태
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(note ? { note } : {})
  };

  const ref = await addDoc(collection(db, 'goldExchanges'), payload);
  return ref.id; // 새 교환 문서 ID
}

// 공통 상태 변경 (진행중/완료/거절 등)
export async function setExchangeStatus(exchangeId, status, extras = {}) {
  await updateDoc(doc(db, 'goldExchanges', exchangeId), {
    status,
    updatedAt: serverTimestamp(),
    ...extras,
  });
  // 상태가 바뀌면 Cloud Functions가 알아서 해당 알림을 쏩니다.
}

// 예약 확정: 예약 일시(when)를 Date 또는 Firestore Timestamp로 전달
export async function setExchangeScheduled(exchangeId, when) {
  const ts = when instanceof Date ? Timestamp.fromDate(when) : when || null;
  await updateDoc(doc(db, 'goldExchanges', exchangeId), {
    status: 'scheduled',
    scheduledAt: ts,
    updatedAt: serverTimestamp(),
  });
}
