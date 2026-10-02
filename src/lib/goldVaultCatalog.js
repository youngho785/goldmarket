// src/lib/goldVaultCatalog.js
import {
  DON_TO_GRAMS,
  DEFAULT_GOLD_PRODUCTS,
  computeGoldPolicyResult,
  findGoldProduct,
  getGoldProductLabel,
  listGoldProducts,
} from "@/lib/goldRates";

export const GOLD_VAULT_MAX_ITEMS = 30;
export const GOLD_VAULT_MAX_WEIGHT_G = 10_000;
export const GOLD_VAULT_MAX_LABEL_LENGTH = 40;
export const GOLD_VAULT_MAX_NOTE_LENGTH = 200;
export const GOLD_VAULT_EXCHANGE_TYPE = "999.9골드바";

export const GOLD_VALUE_PRICE_BASIS = Object.freeze({
  PURE: "pure",
  GOLD_18K: "18k",
  GOLD_14K: "14k",
});

// Legacy export kept for components that still expect a simple option array.
export const GOLD_VAULT_TYPES = Object.freeze(
  listGoldProducts({ products: DEFAULT_GOLD_PRODUCTS }, { context: "myGold" }).map((product) => ({
    productId: product.id,
    value: product.legacyGoldType || product.displayName,
    label: product.displayName,
  }))
);

export function getGoldVaultProductOptions(rates, { includeInactive = false } = {}) {
  return listGoldProducts(rates, { context: "myGold", includeInactive }).map((product) => ({
    productId: product.id,
    value: product.legacyGoldType || product.displayName,
    label: product.displayName,
    product,
  }));
}

export function isSupportedGoldVaultType(value, rates, productId = "") {
  return !!findGoldProduct(rates || { products: DEFAULT_GOLD_PRODUCTS }, { productId, goldType: value });
}

export function getGoldVaultTypeLabel(value, rates, productId = "") {
  return getGoldProductLabel(rates || { products: DEFAULT_GOLD_PRODUCTS }, { productId, goldType: value });
}

export function normalizeGoldVaultValues(values = {}) {
  return {
    label: String(values.label || "").trim().slice(0, GOLD_VAULT_MAX_LABEL_LENGTH),
    productId: String(values.productId || "").trim().slice(0, 80),
    goldType: String(values.goldType || "").trim().slice(0, 180),
    weightG: Number(values.weightG),
    note: String(values.note || "").trim().slice(0, GOLD_VAULT_MAX_NOTE_LENGTH),
  };
}

export function validateGoldVaultValues(values = {}, rates = null) {
  const normalized = normalizeGoldVaultValues(values);
  if (!normalized.label) throw new Error("금제품 이름을 입력해 주세요.");

  const product = findGoldProduct(rates || { products: DEFAULT_GOLD_PRODUCTS }, normalized);
  if (!product && !normalized.productId) throw new Error("금 종류를 선택해 주세요.");
  if (product) {
    normalized.productId = product.id;
    normalized.goldType = product.legacyGoldType || product.displayName;
  }
  if (!normalized.goldType) throw new Error("금 종류를 선택해 주세요.");

  if (
    !Number.isFinite(normalized.weightG) ||
    normalized.weightG <= 0 ||
    normalized.weightG > GOLD_VAULT_MAX_WEIGHT_G
  ) {
    throw new Error(`무게는 0g 초과 ${GOLD_VAULT_MAX_WEIGHT_G.toLocaleString("ko-KR")}g 이하로 입력해 주세요.`);
  }
  return normalized;
}

export function computeVaultPureGoldG(item, rates = {}, pureGoldBuyPricePerDon = 0) {
  const weightG = Number(item?.weightG);
  if (!Number.isFinite(weightG) || weightG <= 0) return 0;
  return computeGoldPolicyResult({
    grams: weightG,
    productId: item?.productId,
    goldType: item?.goldType,
    exchangeType: GOLD_VAULT_EXCHANGE_TYPE,
    rates,
    pureGoldBuyPricePerDon,
  }).finalWeightG;
}

export function computeVaultValueWon(pureGoldG, pureGoldBuyPricePerDon) {
  const grams = Number(pureGoldG);
  const perDon = Number(pureGoldBuyPricePerDon);
  if (!Number.isFinite(grams) || grams <= 0 || !Number.isFinite(perDon) || perDon <= 0) return 0;
  return Math.round((grams / DON_TO_GRAMS) * perDon);
}

export function getVaultBuyPricePerDon(item, rates = {}, market = {}) {
  const product = findGoldProduct(rates || { products: DEFAULT_GOLD_PRODUCTS }, {
    productId: item?.productId,
    goldType: item?.goldType,
  });
  const basis = product?.valuationPriceBasis || GOLD_VALUE_PRICE_BASIS.PURE;
  const key = basis === GOLD_VALUE_PRICE_BASIS.GOLD_14K
    ? "gold14kBuyPerDon"
    : basis === GOLD_VALUE_PRICE_BASIS.GOLD_18K
      ? "gold18kBuyPerDon"
      : "pureGoldBuyPerDon";
  const price = Number(market?.[key]);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function computeVaultMarketValueWon(item, rates = {}, market = {}) {
  const grams = Number(item?.weightG);
  const product = findGoldProduct(rates || { products: DEFAULT_GOLD_PRODUCTS }, {
    productId: item?.productId,
    goldType: item?.goldType,
  });
  const perDon = getVaultBuyPricePerDon(item, rates, market);
  if (!Number.isFinite(grams) || grams <= 0 || perDon <= 0) return 0;

  const inputDon = grams / DON_TO_GRAMS;
  const grossValueWon = inputDon * perDon;
  const refiningFeeWon = product?.calculationMethod === "refining_fee"
    ? inputDon * Math.max(0, Number(product.refiningFeePerDon) || 0)
    : 0;
  return Math.max(0, Math.round(grossValueWon - refiningFeeWon));
}

export function computeVaultReplacementValueWon(pureGoldG, pureGoldSellPricePerDon) {
  return computeVaultValueWon(pureGoldG, pureGoldSellPricePerDon);
}

export function enrichGoldVaultItems(
  items = [],
  {
    rates = {},
    market = {},
    previousMarket = {},
    publicPriceEnabled = false,
    pureGoldBuyPricePerDon = 0,
    previousPureGoldBuyPricePerDon = 0,
    pureGoldSellPricePerDon = 0,
  } = {}
) {
  const sourceItems = Array.isArray(items) ? items : [];
  return sourceItems.map((item) => {
    const pureGoldG = computeVaultPureGoldG(item, rates, pureGoldBuyPricePerDon);
    const previousPureGoldG = computeVaultPureGoldG(
      item,
      rates,
      previousPureGoldBuyPricePerDon
    );
    const estimatedValueWon = publicPriceEnabled
      ? computeVaultMarketValueWon(item, rates, market)
      : 0;
    const previousEstimatedValueWon = publicPriceEnabled
      ? computeVaultMarketValueWon(item, rates, previousMarket)
      : 0;
    const replacementValueWon = publicPriceEnabled
      ? computeVaultReplacementValueWon(pureGoldG, pureGoldSellPricePerDon)
      : 0;

    return {
      ...item,
      pureGoldG,
      previousPureGoldG,
      estimatedValueWon,
      previousEstimatedValueWon,
      replacementValueWon,
    };
  });
}

export function summarizeGoldVaultItems(items = []) {
  const summary = (Array.isArray(items) ? items : []).reduce(
    (acc, item) => ({
      itemCount: acc.itemCount + 1,
      totalWeightG: acc.totalWeightG + (Number(item?.weightG) || 0),
      pureGoldG: acc.pureGoldG + (Number(item?.pureGoldG) || 0),
      estimatedValueWon: acc.estimatedValueWon + (Number(item?.estimatedValueWon) || 0),
      previousEstimatedValueWon:
        acc.previousEstimatedValueWon + (Number(item?.previousEstimatedValueWon) || 0),
      replacementValueWon:
        acc.replacementValueWon + (Number(item?.replacementValueWon) || 0),
    }),
    {
      itemCount: 0,
      totalWeightG: 0,
      pureGoldG: 0,
      estimatedValueWon: 0,
      previousEstimatedValueWon: 0,
      replacementValueWon: 0,
    }
  );

  const current = Number(summary.estimatedValueWon) || 0;
  const previous = Number(summary.previousEstimatedValueWon) || 0;
  const changeWon = current > 0 && previous > 0 ? current - previous : 0;
  const changePercent = previous > 0 ? (changeWon / previous) * 100 : null;

  return {
    ...summary,
    changeWon,
    changePercent,
    changeDirection:
      changeWon > 0 ? "up" : changeWon < 0 ? "down" : previous > 0 ? "same" : "unknown",
  };
}

