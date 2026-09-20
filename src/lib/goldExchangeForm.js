import {
  DON_TO_GRAMS,
  computeGoldPolicyResult,
  findGoldProduct,
  roundTo3Custom,
} from "./goldRates.js";

export const GOLD_TO_GOLD_EXCLUDED_PRODUCT_IDS = Object.freeze([
  "gold-9999-lump",
  "gold-9999-bar",
]);

const GOLD_TO_GOLD_EXCLUDED_SET = new Set(GOLD_TO_GOLD_EXCLUDED_PRODUCT_IDS);

export function isGoldToGoldInputProduct(productOrId) {
  const id = typeof productOrId === "string"
    ? String(productOrId || "").trim()
    : String(productOrId?.id || productOrId?.productId || "").trim();
  if (!id) return true;
  return !GOLD_TO_GOLD_EXCLUDED_SET.has(id);
}

export function createEmptyExchangeProduct() {
  return {
    productId: "",
    productName: "",
    calculationMethod: "",
    goldType: "",
    quantity: "",
    inputUnit: "g",
    exchangeType: "999.9골드바",
    finalWeight: 0,
  };
}

export function normalizeExchangeProducts(rawProducts, maxProducts) {
  const source = Array.isArray(rawProducts) ? rawProducts : [];
  const limit = Number.isFinite(Number(maxProducts)) && Number(maxProducts) > 0
    ? Number(maxProducts)
    : source.length;

  return source
    .slice(0, limit)
    .map((product) => {
      const productId = String(product?.productId || "").trim();
      const goldType = String(product?.goldType || "").trim();
      const quantity = Number(product?.quantity);
      const inputUnit = product?.inputUnit === "don" ? "don" : "g";
      const exchangeType = String(product?.exchangeType || "999.9골드바").trim();

      if (!goldType || !Number.isFinite(quantity) || quantity <= 0) return null;

      return {
        productId,
        goldType,
        productName: String(product?.productName || "").trim(),
        calculationMethod: String(product?.calculationMethod || ""),
        quantity: String(quantity),
        inputUnit,
        exchangeType: exchangeType || "999.9골드바",
        finalWeight: 0,
      };
    })
    .filter(Boolean);
}

export function getInitialExchangeProductsFromSearch(search = "") {
  const emptyProduct = createEmptyExchangeProduct();
  const params = new URLSearchParams(String(search || ""));
  const productId = String(params.get("pid") || "").trim();
  const goldType = String(params.get("type") || "").trim();
  const rawWeight = Number(params.get("w"));
  const inputUnit = params.get("unit") === "don" ? "don" : "g";

  if (!goldType || !Number.isFinite(rawWeight) || rawWeight <= 0) {
    return [emptyProduct];
  }

  return [{
    ...emptyProduct,
    productId,
    goldType,
    quantity: String(rawWeight),
    inputUnit,
  }];
}

export function importVaultItemsToExchangeProducts(items, rates, maxProducts) {
  const source = Array.isArray(items) ? items : [];
  const limit = Number.isFinite(Number(maxProducts)) && Number(maxProducts) > 0
    ? Number(maxProducts)
    : source.length;

  return source
    .slice(0, limit)
    .map((item) => {
      const policy = findGoldProduct(rates, {
        productId: item?.productId,
        goldType: item?.goldType,
      });

      if (!isGoldToGoldInputProduct(policy || item?.productId)) return null;

      return {
        ...createEmptyExchangeProduct(),
        productId: policy?.id || item?.productId || "",
        goldType: item?.goldType || policy?.legacyGoldType || policy?.displayName || "",
        productName: policy?.displayName || item?.productName || "",
        calculationMethod: policy?.calculationMethod || "",
        quantity: String(Number(item?.weightG || 0)),
        inputUnit: "g",
        exchangeType: "999.9골드바",
        sourceItemId: item?.id,
        sourceLabel: item?.label || "금제품",
      };
    })
    .filter((item) => item && item.goldType && Number(item.quantity) > 0);
}

export function syncExchangeProductsWithRates(products, rates) {
  return (Array.isArray(products) ? products : []).map((row) => {
    const policy = findGoldProduct(rates, {
      productId: row?.productId,
      goldType: row?.goldType,
    });
    if (!policy) return row;
    if (
      row.productId === policy.id &&
      row.productName === policy.displayName &&
      row.calculationMethod === policy.calculationMethod
    ) {
      return row;
    }
    return {
      ...row,
      productId: policy.id,
      productName: policy.displayName,
      calculationMethod: policy.calculationMethod,
      goldType: row.goldType || policy.legacyGoldType || policy.displayName,
    };
  });
}

export function computeExchangeFinalWeight(
  { quantity, inputUnit, productId, goldType, exchangeType },
  { rates, pureGoldBuyPricePerDon }
) {
  const n = parseFloat(quantity);
  if (Number.isNaN(n) || n <= 0) return 0;
  const grams = inputUnit === "g" ? n : n * DON_TO_GRAMS;
  return computeGoldPolicyResult({
    grams,
    productId,
    goldType,
    exchangeType,
    rates,
    pureGoldBuyPricePerDon,
  }).finalWeightG;
}

export function validateExchangeProductsForCalculation(
  products,
  { rates, pureGoldBuyPricePerDon, maxProducts, maxProductGrams }
) {
  const source = Array.isArray(products) ? products : [];

  if (source.length > maxProducts) {
    return {
      ok: false,
      error: `제품은 한 예약에 최대 ${maxProducts}개까지 등록할 수 있습니다.`,
      requiresManualCheck: false,
    };
  }

  for (const product of source) {
    const policy = findGoldProduct(rates, {
      productId: product?.productId,
      goldType: product?.goldType,
    });
    if (!isGoldToGoldInputProduct(policy || product?.productId)) {
      return {
        ok: false,
        error: "순금 999.9 덩어리와 999.9 골드바는 GOLD TO GOLD 교환 대상 제품에서 제외됩니다.",
        requiresManualCheck: false,
      };
    }

    const quantity = Number(product?.quantity);
    const grams = product?.inputUnit === "don" ? quantity * DON_TO_GRAMS : quantity;
    if (
      (!product?.productId && !product?.goldType) ||
      !product?.exchangeType ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return {
        ok: false,
        error: "모든 제품 항목을 정확히 입력해주세요.",
        requiresManualCheck: false,
      };
    }
    if (!Number.isFinite(grams) || grams > maxProductGrams) {
      return {
        ok: false,
        error: `제품 한 항목의 중량은 ${maxProductGrams.toLocaleString("ko-KR")}g 이하여야 합니다.`,
        requiresManualCheck: false,
      };
    }
  }

  const hasRefiningFeeProduct = source.some((product) =>
    (
      findGoldProduct(rates, {
        productId: product?.productId,
        goldType: product?.goldType,
      })?.calculationMethod || product?.calculationMethod
    ) === "refining_fee"
  );

  if (
    hasRefiningFeeProduct &&
    (!Number.isFinite(Number(pureGoldBuyPricePerDon)) || Number(pureGoldBuyPricePerDon) <= 0)
  ) {
    return {
      ok: false,
      error: "현재 순금 매입시세를 확인할 수 없어 정련비 적용 제품을 계산할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      requiresManualCheck: false,
    };
  }

  const requiresManualCheck = source.some((product) =>
    (
      findGoldProduct(rates, {
        productId: product?.productId,
        goldType: product?.goldType,
      })?.calculationMethod || product?.calculationMethod
    ) === "manual"
  );

  return { ok: true, error: "", requiresManualCheck };
}

export function applyExchangeFinalWeights(products, options) {
  return (Array.isArray(products) ? products : []).map((product) => ({
    ...product,
    finalWeight: computeExchangeFinalWeight(product, options),
  }));
}

export function recalculateExchangeProducts(products, options) {
  const { rates, pureGoldBuyPricePerDon } = options || {};
  return (Array.isArray(products) ? products : []).map((product) => {
    const quantity = Number(product?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || !product?.goldType) {
      return { ...product, finalWeight: 0 };
    }

    const policy = findGoldProduct(rates, {
      productId: product?.productId,
      goldType: product?.goldType,
    });
    const finalWeight = computeExchangeFinalWeight(
      {
        ...product,
        productId: policy?.id || product?.productId,
      },
      { rates, pureGoldBuyPricePerDon }
    );

    return {
      ...product,
      productId: policy?.id || product?.productId,
      productName: policy?.displayName || product?.productName || product?.goldType,
      calculationMethod: policy?.calculationMethod || product?.calculationMethod,
      finalWeight,
    };
  });
}

export function getExchangeTotals(products) {
  const totalGramsRaw = (Array.isArray(products) ? products : []).reduce(
    (sum, product) => sum + (Number(product?.finalWeight) || 0),
    0
  );
  const totalGrams = roundTo3Custom(totalGramsRaw);
  return {
    totalGrams,
    totalDon: totalGrams / DON_TO_GRAMS,
  };
}

export function buildReservationProducts(products) {
  return (Array.isArray(products) ? products : []).map((product) => {
    const quantity = Number(product?.quantity || 0);
    const gramsInput = product?.inputUnit === "g"
      ? quantity
      : roundTo3Custom(quantity * DON_TO_GRAMS);

    return {
      productId: product?.productId || undefined,
      goldType: product?.goldType,
      quantity: roundTo3Custom(gramsInput),
      inputUnit: "g",
      exchangeType: product?.exchangeType,
    };
  });
}
