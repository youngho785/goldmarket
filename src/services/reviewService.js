import { db } from "../firebase/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

// 상품 리뷰 추가 (review 객체에는 userName, rating, comment, createdAt 등이 포함)
export const addReview = async (productId, review) => {
  const reviewsRef = collection(db, "products", productId, "reviews");
  return await addDoc(reviewsRef, review);
};

// 상품 리뷰 가져오기 (최신 리뷰부터)
export const fetchReviews = async (productId) => {
  const reviewsRef = collection(db, "products", productId, "reviews");
  const q = query(reviewsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
