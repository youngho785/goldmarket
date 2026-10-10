const DON_TO_GRAMS = 3.75;

// Pure helper: keep goldBarFee.js directly testable in Node without Firebase/browser dependencies.
const feeNear = (a, b) => Math.abs(a - b) < 1e-6;
export function goldBarFeeKey(donValue, gramValue, { calculatorRangeOverride = false } = {}) {
  const don = Number(donValue);
  const grams = Number(gramValue);
  if (!Number.isFinite(don) || !Number.isFinite(grams) || don <= 0 || grams <= 0) return "";
  for (const g of [1, 2, 3, 5, 10, 20, 30, 50, 100, 500]) if (feeNear(grams, g)) return `g-${g}`;
  for (const d of [1, 2, 3, 5, 10, 15, 20, 50]) if (feeNear(don, d)) return `d-${d}`;
  if (calculatorRangeOverride && don >= 11 - 1e-6 && don <= 14 + 1e-6) return "range-11-14";
  if (don >= 1 && don < 3) return "range-1-3";
  if (don >= 3 && don <= 10) return "range-3-10";
  if (don >= 20 && don <= 30) return "range-20-30";
  return "";
}

const SPECIAL_GRAM_FEES = new Map([
  [1, 40000],
  [2, 40000],
  [3, 40000],
  [50, 60000],
  [500, 150000],
]);

const SPECIAL_DON_FEES = new Map([
  [3, 40000],
  [15, 70000],
]);

const FEE_RULES_DON = [
  { test: (d) => d >= 1 && d < 3, fee: 40000 },
  { test: (d) => d >= 3 && d <= 10, fee: 50000 },
  { test: (d) => d >= 20 && d <= 30, fee: 70000 },
  { test: (d) => Math.abs(d - 50) < 1e-6, fee: 100000 },
];

const approxEq = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const inRange = (x, a, b, eps = 1e-6) => x > a - eps && x < b + eps;

export function getGoldBarFee(donValue, gramValue, { calculatorRangeOverride = false, feeConfig = null } = {}) {
  const don = Number(donValue);
  const grams = Number(gramValue);
  if (!Number.isFinite(don) || !Number.isFinite(grams) || don <= 0 || grams <= 0) return null;

  // A loaded dynamic policy must not silently substitute an outdated fallback price.
  if (feeConfig !== null) {
    const key = goldBarFeeKey(don, grams, { calculatorRangeOverride });
    if (!key || !feeConfig?.fees) return null;
    const value = feeConfig.fees[key];
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
  }

  if (calculatorRangeOverride && inRange(don, 11, 14)) return 60000;

  for (const [g, fee] of SPECIAL_GRAM_FEES.entries()) {
    if (approxEq(grams, g)) return fee;
  }
  for (const [d, fee] of SPECIAL_DON_FEES.entries()) {
    if (approxEq(don, d)) return fee;
  }
  for (const rule of FEE_RULES_DON) {
    if (rule.test(don)) return rule.fee;
  }
  return null;
}

export function getGoldBarFeeEstimate({ grams, don, qty = 1, feeConfig = null } = {}) {
  const normalizedGrams = Number(grams);
  const normalizedDon = Number.isFinite(Number(don)) ? Number(don) : normalizedGrams / DON_TO_GRAMS;
  const normalizedQty = Math.max(1, Math.trunc(Number(qty) || 1));
  const unitFee = getGoldBarFee(normalizedDon, normalizedGrams, { feeConfig });
  return {
    unitFee,
    qty: normalizedQty,
    totalFee: unitFee == null ? null : unitFee * normalizedQty,
  };
}

export function formatGoldBarFee(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toLocaleString("ko-KR")}원`
    : "매장 문의";
}

export const GOLD_BAR_FEE_DON_TO_GRAMS = DON_TO_GRAMS;
