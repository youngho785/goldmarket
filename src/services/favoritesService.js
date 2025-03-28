// src/services/favoritesService.js
import { db } from "../firebase/firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc 
} from "firebase/firestore";

// userId에 해당하는 사용자의 찜 목록에 상품을 추가합니다.
export const addFavorite = async (userId, product) => {
  const colRef = collection(db, "favorites", userId, "items");
  // 필요한 경우, 상품 객체에 고유 ID를 별도 필드(예: favoriteProductId)로 저장할 수 있습니다.
  return await addDoc(colRef, { ...product, favoriteProductId: product.id });
};

// userId에 해당하는 사용자의 찜 목록을 가져옵니다.
export const fetchFavorites = async (userId) => {
  const colRef = collection(db, "favorites", userId, "items");
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

// userId에 해당하는 사용자의 찜 목록에서 특정 상품을 제거합니다.
// productId는 해당 상품의 고유 ID입니다.
export const removeFavorite = async (userId, productId) => {
  const colRef = collection(db, "favorites", userId, "items");
  // favoriteProductId 필드를 기준으로 쿼리합니다.
  const q = query(colRef, where("favoriteProductId", "==", productId));
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map((docSnap) =>
    deleteDoc(doc(db, "favorites", userId, "items", docSnap.id))
  );
  await Promise.all(deletePromises);
};
