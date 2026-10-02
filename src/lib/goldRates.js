// src/lib/goldRates.js
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import goldRatesDefaults from "../../functions/src/goldRates.defaults.json";

export const GOLD_RATES_DOC = { coll: "appConfig", id: "goldRates" };
export const DON_TO_GRAMS = goldRatesDefaults.donToGrams;

// Legacy tables remain available so existing reservations and older stored rows can be read.
export const DEFAULT_PURITY = Object.freeze({ ...goldRatesDefaults.purity });
export const DEFAULT_EXCHANGE = Object.freeze({ ...goldRatesDefaults.exchange });
export const DEFAULT_GOLD_PRODUCTS = Object.freeze(
  Object.fromEntries(
    Object.entries(goldRatesDefaults.products || {}).map(([id, product]) => [
      id,
      Object.freeze({ id, ...product }),
    ])
  )
);
export const DEFAULT_GOLD_RATES_VERSION = goldRatesDefaults.version;

export const GOLD_CALCULATION_METHODS = Object.freeze({
  RATE: "rate",
  REFINING_FEE: "refining_fee",
  FULL: "full",
  MANUAL: "manual",
});

export const roundTo3Custom = (n) => {
  if (!isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const t = Math.floor(abs * 10000 + 1e-8);
  let thousands = Math.floor(t / 10);
  const fourth = t % 10;
  if (fourth >= 7) thousands += 1;
  return sign * (thousands / 1000);
};

export const toFixed3CustomStr = (n) => roundTo3Custom(n).toFixed(3);

const LEGACY_DEFAULT_DISPLAY_NAMES = Object.freeze({
  "gold-14k-jewelry": "14K(585) 제품",
  "gold-18k-jewelry": "18K(750) 제품",
  "gold-995-product": "순금 995 제품",
  "gold-999-product": "순금 999 제품",
  "gold-pure-decoration": "순금 장식 제품",
});

function normalizeGoldProductDisplayName(id, rawName, fallbackName) {
  const raw = String(rawName ?? "").trim();
  const fallback = String(fallbackName ?? id).trim();
  const legacyDefault = LEGACY_DEFAULT_DISPLAY_NAMES[id];
  return raw && raw !== legacyDefault
    ? raw.slice(0, 80)
    : fallback.slice(0, 80);
}

function normalizeProduct(id, value = {}, fallback = {}) {
  const source = value && typeof value === "object" ? value : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const method = ["rate", "refining_fee", "full", "manual"].includes(source.calculationMethod)
    ? source.calculationMethod
    : base.calculationMethod || "manual";
  const conversionRate = Number(source.conversionRate ?? base.conversionRate ?? 0);
  const refiningFeePerDon = Number(source.refiningFeePerDon ?? base.refiningFeePerDon ?? 0);
  const sortOrder = Number(source.sortOrder ?? base.sortOrder ?? 999);
  const basisRaw = String(source.valuationPriceBasis ?? base.valuationPriceBasis ?? "").toLowerCase();
  const inferredBasis = /14k/i.test(`${id} ${source.displayName || base.displayName || ""} ${source.legacyGoldType || base.legacyGoldType || ""}`)
    ? "14k"
    : /18k/i.test(`${id} ${source.displayName || base.displayName || ""} ${source.legacyGoldType || base.legacyGoldType || ""}`)
      ? "18k"
      : "pure";
  const valuationPriceBasis = ["pure", "18k", "14k"].includes(basisRaw) ? basisRaw : inferredBasis;

  return {
    id,
    displayName: normalizeGoldProductDisplayName(id, source.displayName, base.displayName),
    legacyGoldType: String(source.legacyGoldType ?? base.legacyGoldType ?? "").trim().slice(0, 180),
    calculationMethod: method,
    conversionRate: Number.isFinite(conversionRate) ? Math.max(0, Math.min(1, conversionRate)) : 0,
    refiningFeePerDon: Number.isFinite(refiningFeePerDon) ? Math.max(0, Math.round(refiningFeePerDon)) : 0,
    valuationPriceBasis,
    active: source.active ?? base.active ?? true,
    myGoldEnabled: source.myGoldEnabled ?? base.myGoldEnabled ?? true,
    exchangeEnabled: source.exchangeEnabled ?? base.exchangeEnabled ?? true,
    sortOrder: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 999,
  };
}

export function mergeGoldProducts(productsFromDb) {
  const remote = productsFromDb && typeof productsFromDb === "object" && !Array.isArray(productsFromDb)
    ? productsFromDb
    : {};
  const ids = new Set([...Object.keys(DEFAULT_GOLD_PRODUCTS), ...Object.keys(remote)]);
  return Object.fromEntries(
    [...ids].map((id) => [
      id,
      normalizeProduct(id, remote[id], DEFAULT_GOLD_PRODUCTS[id]),
    ])
  );
}

export function listGoldProducts(ratesOrProducts, options = {}) {
  const products = ratesOrProducts?.products || ratesOrProducts || DEFAULT_GOLD_PRODUCTS;
  const context = options.context || "all";
  const includeInactive = options.includeInactive === true;
  return Object.values(products)
    .filter((product) => includeInactive || product.active !== false)
    .filter((product) => context !== "myGold" || product.myGoldEnabled !== false)
    .filter((product) => context !== "exchange" || product.exchangeEnabled !== false)
    .sort((a, b) => (Number(a.sortOrder) || 999) - (Number(b.sortOrder) || 999) || String(a.displayName).localeCompare(String(b.displayName), "ko"));
}

export function findGoldProduct(ratesOrProducts, { productId, goldType } = {}) {
  const products = ratesOrProducts?.products || ratesOrProducts || DEFAULT_GOLD_PRODUCTS;
  const id = String(productId || "").trim();
  if (id && products[id]) return products[id];
  const legacy = String(goldType || "").trim();
  if (!legacy) return null;
  return Object.values(products).find((product) =>
    product.legacyGoldType === legacy || product.displayName === legacy
  ) || null;
}

export function getGoldProductLabel(ratesOrProducts, input = {}) {
  return findGoldProduct(ratesOrProducts, input)?.displayName || String(input.goldType || "금제품");
}

export function computeGoldPolicyResult({
  grams,
  productId,
  goldType,
  rates,
  pureGoldBuyPricePerDon,
  exchangeType = "999.9골드바",
}) {
  const inputGrams = Number(grams);
  const product = findGoldProduct(rates, { productId, goldType });
  const exchangeRaw = rates?.exchange?.[exchangeType] ?? DEFAULT_EXCHANGE[exchangeType] ?? 1;
  const exchangeRatio = Number.isFinite(Number(exchangeRaw)) ? Number(exchangeRaw) : 1;

  const empty = {
    product,
    calculationMethod: product?.calculationMethod || "manual",
    inputGrams: Number.isFinite(inputGrams) ? inputGrams : 0,
    finalWeightG: 0,
    conversionRateUsed: 0,
    refiningFeePerDonUsed: 0,
    refiningFeeWon: 0,
    refiningDeductionG: 0,
    exchangeRatioUsed: exchangeRatio,
    requiresManualCheck: true,
  };

  if (!product || !Number.isFinite(inputGrams) || inputGrams <= 0) return empty;

  if (product.calculationMethod === "manual") return empty;

  if (product.calculationMethod === "rate") {
    const rate = Number(product.conversionRate);
    const finalWeightG = roundTo3Custom(inputGrams * (Number.isFinite(rate) ? rate : 0) * exchangeRatio);
    return {
      ...empty,
      finalWeightG,
      conversionRateUsed: rate,
      requiresManualCheck: false,
    };
  }

  if (product.calculationMethod === "full") {
    return {
      ...empty,
      finalWeightG: roundTo3Custom(inputGrams * exchangeRatio),
      conversionRateUsed: 1,
      requiresManualCheck: false,
    };
  }

  const pricePerDon = Number(pureGoldBuyPricePerDon);
  const feePerDon = Math.max(0, Number(product.refiningFeePerDon) || 0);
  if (!Number.isFinite(pricePerDon) || pricePerDon <= 0) {
    return { ...empty, refiningFeePerDonUsed: feePerDon };
  }
  const inputDon = inputGrams / DON_TO_GRAMS;
  const refiningFeeWon = Math.round(inputDon * feePerDon);
  const refiningDeductionG = roundTo3Custom((refiningFeeWon / pricePerDon) * DON_TO_GRAMS);
  const finalWeightG = roundTo3Custom(Math.max(0, inputGrams - refiningDeductionG) * exchangeRatio);
  return {
    ...empty,
    finalWeightG,
    conversionRateUsed: 1,
    refiningFeePerDonUsed: feePerDon,
    refiningFeeWon,
    refiningDeductionG,
    requiresManualCheck: false,
  };
}

// Backward-compatible helper for older call sites. New code should use computeGoldPolicyResult.
export function computeFinalWeightFromRates({ grams, goldType, exchangeType, purity, exchange }) {
  const pRaw = (purity && purity[goldType]) ?? DEFAULT_PURITY[goldType];
  const eRaw = (exchange && exchange[exchangeType]) ?? DEFAULT_EXCHANGE[exchangeType];
  const p = typeof pRaw === "number" ? pRaw : 0;
  const e = typeof eRaw === "number" ? eRaw : 1;
  return roundTo3Custom(grams * p * e);
}

export function mergeGoldRates(data) {
  const inData = data || {};
  const purityFromDb = inData.purity && typeof inData.purity === "object" ? inData.purity : {};
  const exchangeFromDb = inData.exchange && typeof inData.exchange === "object" ? inData.exchange : {};
  return {
    purity: { ...DEFAULT_PURITY, ...purityFromDb },
    exchange: { ...DEFAULT_EXCHANGE, ...exchangeFromDb },
    products: mergeGoldProducts(inData.products),
    version: Number(inData.version) || DEFAULT_GOLD_RATES_VERSION,
    updatedAt: inData.updatedAt || null,
    updatedBy: inData.updatedBy || null,
    reason: String(inData.reason || ""),
  };
}

export async function getGoldRatesOnce(db) {
  try {
    const ref = doc(db, GOLD_RATES_DOC.coll, GOLD_RATES_DOC.id);
    const snap = await getDoc(ref);
    return snap.exists() ? mergeGoldRates(snap.data()) : mergeGoldRates({});
  } catch {
    return mergeGoldRates({});
  }
}

export function subscribeGoldRates(db, onChange, onError = console.error) {
  const ref = doc(db, GOLD_RATES_DOC.coll, GOLD_RATES_DOC.id);
  return onSnapshot(
    ref,
    (snap) => onChange(mergeGoldRates(snap.data() || {})),
    (err) => onError("goldRates subscribe failed", err)
  );
}
