// src/lib/goldExchangeDraft.js

const DRAFT_KEY = "kgm_gold_exchange_reservation_draft_v1";
const DRAFT_VERSION = 1;
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

const ALLOWED_TIMES = new Set([
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
]);

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeProducts(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 20).map((product) => ({
    goldType: String(product?.goldType || "").slice(0, 160),
    quantity: String(product?.quantity || "").slice(0, 32),
    inputUnit: product?.inputUnit === "don" ? "don" : "g",
    exchangeType: String(product?.exchangeType || "999.9골드바").slice(0, 80),
    finalWeight: Math.max(0, finiteNumber(product?.finalWeight, 0)),
  }));
}

function sanitizeDateKey(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function sanitizeVisitTime(value) {
  const text = String(value || "");
  return ALLOWED_TIMES.has(text) ? text : "";
}

function sanitizeDraft(input) {
  const barGroup = input?.barGroup === "grams" ? "grams" : "don";
  const idx = Math.max(0, Math.trunc(finiteNumber(input?.barChoice?.idx, 0)));
  const qty = Math.max(1, Math.trunc(finiteNumber(input?.barChoice?.qty, 1)));

  return {
    version: DRAFT_VERSION,
    savedAt: Date.now(),
    calculated: input?.calculated === true,
    products: sanitizeProducts(input?.products),
    barGroup,
    barChoice: { idx, qty },
    visitDate: sanitizeDateKey(input?.visitDate),
    visitTime: sanitizeVisitTime(input?.visitTime),
  };
}

/**
 * 예약 인증 전 진행상태만 저장합니다.
 * 성명/전화번호/동의 여부 같은 개인정보는 이 draft에 저장하지 않습니다.
 */
export function saveGoldExchangeDraft(input) {
  if (typeof window === "undefined") return false;

  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(sanitizeDraft(input)));
    return true;
  } catch (error) {
    console.warn("[goldExchangeDraft] save failed:", error?.message || error);
    return false;
  }
}

export function readGoldExchangeDraft() {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      parsed?.version !== DRAFT_VERSION ||
      !Number.isFinite(Number(parsed?.savedAt)) ||
      Date.now() - Number(parsed.savedAt) > DRAFT_TTL_MS
    ) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }

    return {
      ...sanitizeDraft(parsed),
      savedAt: Number(parsed.savedAt),
    };
  } catch (error) {
    console.warn("[goldExchangeDraft] read failed:", error?.message || error);
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    return null;
  }
}

export function clearGoldExchangeDraft() {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {}
}

export function draftDateToLocalDate(value) {
  const dateKey = sanitizeDateKey(value);
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}
