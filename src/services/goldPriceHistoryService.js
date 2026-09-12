// src/services/goldPriceHistoryService.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/firebase";

const asOfCache = new Map();
const rangeCache = new Map();

export function compactGoldPriceDate(value) {
  return String(value || "").replace(/[^0-9]/g, "").slice(0, 8);
}

function normalizeHistory(documentData = {}, lookupDate = "", carriedForward = false) {
  const sourceDate = compactGoldPriceDate(documentData.sourceDate || lookupDate);
  const pureGoldBuyPerDon = Number(documentData?.market?.pureGoldBuyPerDon) || 0;
  if (!sourceDate || pureGoldBuyPerDon <= 0) return null;

  return {
    ...documentData,
    lookupDate: compactGoldPriceDate(lookupDate) || sourceDate,
    sourceDate,
    pureGoldBuyPerDon,
    carriedForward,
  };
}

export async function getGoldPriceAtOrBefore(dateValue) {
  const key = compactGoldPriceDate(dateValue);
  if (!/^\d{8}$/.test(key)) return null;
  if (asOfCache.has(key)) return asOfCache.get(key);

  const promise = (async () => {
    const exactSnap = await getDoc(doc(db, "goldPriceHistory", key));
    if (exactSnap.exists()) {
      const normalized = normalizeHistory(exactSnap.data() || {}, key, false);
      if (normalized) return normalized;
    }

    const fallbackQuery = query(
      collection(db, "goldPriceHistory"),
      where("sourceDate", "<=", key),
      orderBy("sourceDate", "desc"),
      limit(1)
    );
    const fallbackSnapshot = await getDocs(fallbackQuery);
    const fallbackDoc = fallbackSnapshot.docs[0];
    return fallbackDoc
      ? normalizeHistory(fallbackDoc.data() || {}, key, true)
      : null;
  })();

  asOfCache.set(key, promise);
  try {
    return await promise;
  } catch (error) {
    asOfCache.delete(key);
    throw error;
  }
}

export async function getGoldPriceHistoryRange(startDateValue, endDateValue) {
  const start = compactGoldPriceDate(startDateValue);
  const end = compactGoldPriceDate(endDateValue);
  if (!/^\d{8}$/.test(start) || !/^\d{8}$/.test(end) || start > end) return [];

  const cacheKey = `${start}:${end}`;
  if (rangeCache.has(cacheKey)) return rangeCache.get(cacheKey);

  const promise = (async () => {
    const historyQuery = query(
      collection(db, "goldPriceHistory"),
      where("sourceDate", ">=", start),
      where("sourceDate", "<=", end),
      orderBy("sourceDate", "asc")
    );
    const snapshot = await getDocs(historyQuery);
    const seen = new Set();
    const rows = [];

    snapshot.docs.forEach((historyDoc) => {
      const normalized = normalizeHistory(historyDoc.data() || {}, historyDoc.id, false);
      if (!normalized || seen.has(normalized.sourceDate)) return;
      seen.add(normalized.sourceDate);
      rows.push(normalized);
    });

    return rows;
  })();

  rangeCache.set(cacheKey, promise);
  try {
    return await promise;
  } catch (error) {
    rangeCache.delete(cacheKey);
    throw error;
  }
}
