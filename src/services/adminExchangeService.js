// src/services/adminExchangeService.js
import { db } from "@/firebase/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";

const PAGE_SIZE_DEFAULT = 20;

function normalizeStatusFilter(status) {
  const value = String(status || "").trim();
  if (value === "active") return ["scheduled", "in_progress"];
  if (
    ["requested", "scheduled", "in_progress", "completed", "rejected", "canceled"].includes(value)
  ) {
    return [value];
  }
  return [];
}

export async function fetchAdminExchangeGroupsPage({
  status = "",
  cursor = null,
  pageSize = PAGE_SIZE_DEFAULT,
} = {}) {
  const size = Math.max(1, Math.min(Number(pageSize) || PAGE_SIZE_DEFAULT, 50));
  const statusValues = normalizeStatusFilter(status);

  const constraints = [];
  if (statusValues.length === 1) {
    constraints.push(where("repStatus", "==", statusValues[0]));
  } else if (statusValues.length > 1) {
    constraints.push(where("repStatus", "in", statusValues));
  }

  constraints.push(orderBy("updatedAt", "desc"));
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(size));

  const snapshot = await getDocs(
    query(collection(db, "goldExchangeGroups"), ...constraints)
  );

  return {
    groups: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    cursor: snapshot.docs.at(-1) || null,
    hasMore: snapshot.size === size,
  };
}

export async function fetchAdminExchangeGroup(groupId) {
  const normalized = String(groupId || "").trim();
  if (!normalized) return null;

  const snapshot = await getDoc(doc(db, "goldExchangeGroups", normalized));
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function fetchAdminExchangeGroupItems(groupId) {
  const normalized = String(groupId || "").trim();
  if (!normalized) return [];

  const snapshot = await getDocs(
    query(
      collection(db, "goldExchanges"),
      where("groupId", "==", normalized)
    )
  );

  if (!snapshot.empty) {
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }

  // 예전 단일 문서 구조 호환
  const direct = await getDoc(doc(db, "goldExchanges", normalized));
  return direct.exists ? [{ id: direct.id, ...direct.data() }] : [];
}

export async function fetchAdminProfile(uid) {
  const normalized = String(uid || "").trim();
  if (!normalized) return null;

  const snapshot = await getDoc(doc(db, "profiles", normalized));
  return snapshot.exists ? snapshot.data() : null;
}
