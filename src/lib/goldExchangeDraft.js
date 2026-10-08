// src/lib/goldExchangeDraft.js

const DRAFT_KEY = "kgm_gold_exchange_reservation_draft_v1";
const DRAFT_VERSION = 1;
// 이메일 인증 링크가 같은 브라우저의 새 탭에서 열려도 예약 입력을 이어갈 수 있도록
// 임시 입력값만 같은 출처의 localStorage에 최대 2시간 보존합니다.
// 개인 연락처, 계정정보, 개인정보 동의 여부는 초안에 포함하지 않습니다.
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
    productId: String(product?.productId || "").slice(0, 80),
    productName: String(product?.productName || "").slice(0, 80),
    calculationMethod: String(product?.calculationMethod || "").slice(0, 24),
    goldType: String(product?.goldType || "").slice(0, 180),
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
function getDraftStorage(name) {
  try { return window[name]; } catch { return null; }
}

function readFromStorage(storage) {
  try {
    if (!storage) return null;
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt);
    if (
      parsed?.version !== DRAFT_VERSION ||
      !Number.isFinite(savedAt) ||
      savedAt <= 0 ||
      savedAt > Date.now() ||
      Date.now() - savedAt > DRAFT_TTL_MS
    ) {
      storage.removeItem(DRAFT_KEY);
      return null;
    }

    return {
      ...sanitizeDraft(parsed),
      savedAt,
    };
  } catch {
    try { storage?.removeItem(DRAFT_KEY); } catch {}
    return null;
  }
}

export function saveGoldExchangeDraft(input) {
  if (typeof window === "undefined") return false;

  const draft = JSON.stringify(sanitizeDraft(input));
  let saved = false;
  // 같은 탭 우선. 다른 탭에서 이메일 인증을 완료하는 경우 localStorage로 복구합니다.
  for (const storage of [getDraftStorage("sessionStorage"), getDraftStorage("localStorage")]) {
    try {
      if (!storage || typeof storage.setItem !== "function") continue;
      storage.setItem(DRAFT_KEY, draft);
      saved = true;
    } catch {
      // 비공개 모드 등에서 한 저장소가 차단되더라도 다른 저장소는 시도합니다.
    }
  }
  return saved;
}

export function readGoldExchangeDraft() {
  if (typeof window === "undefined") return null;
  // 같은 탭 초안을 우선 사용하고, 인증 메일이 열린 새 탭에서만 로컬 초안을 사용합니다.
  return readFromStorage(getDraftStorage("sessionStorage")) || readFromStorage(getDraftStorage("localStorage"));
}

export function clearGoldExchangeDraft() {
  if (typeof window === "undefined") return;
  for (const storage of [getDraftStorage("sessionStorage"), getDraftStorage("localStorage")]) {
    try { storage?.removeItem(DRAFT_KEY); } catch {}
  }
}

export function draftDateToLocalDate(value) {
  const dateKey = sanitizeDateKey(value);
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}
