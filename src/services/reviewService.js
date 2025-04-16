import { db } from "../firebase/firebase";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";

/**
 * 상품 리뷰 추가 함수
 * @param {string} productId - 리뷰를 추가할 상품의 ID
 * @param {object} review - 추가할 리뷰 객체. 예: { userName, rating, comment, createdAt }
 * @returns {Promise<DocumentReference>} - 생성된 리뷰 문서의 참조
 * @throws {Error} - 리뷰 추가 중 오류 발생 시 에러를 throw합니다.
 */
export const addReview = async (productId, review) => {
  try {
    const reviewsRef = collection(db, "products", productId, "reviews");
    const docRef = await addDoc(reviewsRef, review);
    return docRef;
  } catch (error) {
    console.error("리뷰 추가 중 오류:", error);
    throw error;
  }
};

/**
 * 상품 리뷰 가져오기 함수 (최신 리뷰부터)
 * @param {string} productId - 리뷰를 조회할 상품의 ID
 * @returns {Promise<Array>} - 리뷰 배열, 각 리뷰는 { id, ...data } 형식
 */
export const fetchReviews = async (productId) => {
  try {
    const reviewsRef = collection(db, "products", productId, "reviews");
    const q = query(reviewsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("리뷰 불러오기 중 오류:", error);
    // 에러 발생 시 빈 배열 반환 (또는 필요하다면 에러를 throw 할 수도 있음)
    return [];
  }
};
