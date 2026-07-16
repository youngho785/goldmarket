// src/services/OrderService.js

import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";

// 주문 생성 (구매자가 거래 신청)
export async function createOrder({ productId, buyerId, sellerId, status = "requested" }) {
  const colRef = collection(db, "orders");
  const order = {
    productId,
    buyerId,
    sellerId,
    status, // requested, accepted, completed, canceled
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(colRef, order);
  return docRef.id;
}

// 특정 유저의 거래 내역 (role: buyer/seller)
export async function fetchOrdersByUser(userId, role = "buyer") {
  const colRef = collection(db, "orders");
  const q = query(
    colRef,
    where(role === "buyer" ? "buyerId" : "sellerId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 상품ID로 주문 찾기 (구매요청 중복방지, 상태확인)
export async function fetchOrderByProductId(productId) {
  const colRef = collection(db, "orders");
  const q = query(colRef, where("productId", "==", productId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// 주문 상태 변경(거래수락, 거래완료 등)
export async function updateOrderStatus(orderId, newStatus) {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, { status: newStatus });
}

// 주문 상세조회
export async function fetchOrderById(orderId) {
  const orderRef = doc(db, "orders", orderId);
  const docSnap = await getDoc(orderRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

/**
 * 특정 구매자가 특정 상품에 대해 주문(구매요청) 기록이 없는지 확인
 * - 주문 기록이 '없어야' true를 반환 (== 구매요청 버튼 노출 가능)
 * - 주문 기록이 이미 있으면 false
 */
export async function checkPurchasePermission(buyerId, productId) {
  const colRef = collection(db, "orders");
  const q = query(
    colRef,
    where("buyerId", "==", buyerId),
    where("productId", "==", productId)
  );
  const snap = await getDocs(q);
  return snap.empty; // true면 주문 기록 없음 → 구매 가능!
}
