// src/services/favoritesService.jsx
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

/** 표준 경로: users/{uid}/favorites/{productId} */
const favDoc = (uid, pid) => doc(db, "users", uid, "favorites", String(pid));
const favCol = (uid) => collection(db, "users", uid, "favorites");

/** 찜 추가 (문서 ID = productId, 중복 방지) */
export const addFavorite = async (userId, productId) => {
  const uid = String(userId || "");
  const pid = String(productId || "");
  if (!uid || !pid) {
    const err = new Error("addFavorite: invalid args");
    err.code = "invalid-argument";
    throw err;
  }
  await setDoc(
    favDoc(uid, pid),
    { favoriteProductId: pid, createdAt: serverTimestamp() },
    { merge: true }
  );
  return pid;
};

/** 찜 목록 조회 */
export const fetchFavorites = async (userId) => {
  const uid = String(userId || "");
  if (!uid) return [];
  const snap = await getDocs(favCol(uid));
  return snap.docs.map((d) => ({ id: d.id, favoriteProductId: d.id }));
};

/** 찜 제거 */
export const removeFavorite = async (userId, productId) => {
  const uid = String(userId || "");
  const pid = String(productId || "");
  if (!uid || !pid) {
    const err = new Error("removeFavorite: invalid args");
    err.code = "invalid-argument";
    throw err;
  }
  await deleteDoc(favDoc(uid, pid));
};
