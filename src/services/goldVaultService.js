// src/services/goldVaultService.js
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/firebase/firebase";
import { validateGoldVaultValues } from "@/lib/goldVaultCatalog";

function vaultCollection(uid) {
  return collection(db, "users", uid, "goldVaultItems");
}

export function subscribeGoldVaultItems(uid, onChange, onError = console.error) {
  if (!uid) {
    onChange?.([]);
    return () => {};
  }

  const q = query(vaultCollection(uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      onChange?.(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    (error) => onError?.(error)
  );
}

export async function createGoldVaultItem(uid, values) {
  if (!uid) throw new Error("로그인이 필요합니다.");
  const normalized = validateGoldVaultValues(values);

  return addDoc(vaultCollection(uid), {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createGoldVaultItems(uid, valuesList) {
  if (!uid) throw new Error("로그인이 필요합니다.");
  if (!Array.isArray(valuesList) || valuesList.length === 0) {
    throw new Error("저장할 금제품이 없습니다.");
  }

  const normalizedItems = valuesList.map((values) => validateGoldVaultValues(values));
  const batch = writeBatch(db);

  normalizedItems.forEach((normalized) => {
    const itemRef = doc(vaultCollection(uid));
    batch.set(itemRef, {
      ...normalized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return normalizedItems.length;
}

export async function updateGoldVaultItem(uid, itemId, values) {
  if (!uid) throw new Error("로그인이 필요합니다.");
  if (!itemId) throw new Error("수정할 금제품을 찾을 수 없습니다.");
  const normalized = validateGoldVaultValues(values);

  await updateDoc(doc(db, "users", uid, "goldVaultItems", itemId), {
    ...normalized,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGoldVaultItem(uid, itemId) {
  if (!uid) throw new Error("로그인이 필요합니다.");
  if (!itemId) throw new Error("삭제할 금제품을 찾을 수 없습니다.");
  await deleteDoc(doc(db, "users", uid, "goldVaultItems", itemId));
}
