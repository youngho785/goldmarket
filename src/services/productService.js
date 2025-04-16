// src/services/ProductService.js
import { db } from "../firebase/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

/**
 * 상품을 Firestore의 "products" 컬렉션에 추가합니다.
 * @param {Object} product - 추가할 상품 객체 (예: { title, description, price, category, ... })
 * @returns {Promise<DocumentReference>} - 추가된 문서의 참조
 * @throws {Error} - 추가 과정에서 에러 발생 시 에러를 throw합니다.
 */
export const addProduct = async (product) => {
  try {
    const colRef = collection(db, "products");
    const docRef = await addDoc(colRef, product);
    return docRef;
  } catch (error) {
    console.error("상품 추가 중 오류 발생:", error);
    throw error;
  }
};

/**
 * Firestore의 "products" 컬렉션에서 상품 목록을 조회합니다.
 * @returns {Promise<Array>} - 각 상품 객체에 id 및 데이터가 포함된 배열
 * @throws {Error} - 조회 과정에서 에러 발생 시 에러를 throw합니다.
 */
export const fetchProducts = async () => {
  try {
    const colRef = collection(db, "products");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("상품 조회 중 오류 발생:", error);
    throw error;
  }
};
