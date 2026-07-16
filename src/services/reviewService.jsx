import { db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

/** 상품 리뷰 추가 (products/{productId}/reviews) */
export const addReview = async (productId, review) => {
  try {
    const reviewsRef = collection(db, "products", productId, "reviews");
    const payload = { ...review, createdAt: serverTimestamp() };
    const docRef = await addDoc(reviewsRef, payload);
    return docRef;
  } catch (error) {
    console.error("[reviews] add fail:", error);
    throw error;
  }
};

/** 상품 리뷰 가져오기 (최신순) */
export const fetchReviews = async (productId) => {
  try {
    const reviewsRef = collection(db, "products", productId, "reviews");
    const q = query(reviewsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error(`[reviews] read fail for product=${productId}`, error);
    return [];
  }
};
