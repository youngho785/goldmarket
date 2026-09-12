// src/lib/goldVaultCatalog.js
import {
  DEFAULT_EXCHANGE,
  DEFAULT_PURITY,
  DON_TO_GRAMS,
  computeFinalWeightFromRates,
} from "@/lib/goldRates";

export const GOLD_VAULT_MAX_ITEMS = 30;
export const GOLD_VAULT_MAX_WEIGHT_G = 10_000;
export const GOLD_VAULT_MAX_LABEL_LENGTH = 40;
export const GOLD_VAULT_MAX_NOTE_LENGTH = 200;
export const GOLD_VAULT_EXCHANGE_TYPE = "999.9골드바";

// GoldExchange.jsx의 현재 제품 분류와 동일한 key를 사용합니다.
export const GOLD_VAULT_TYPES = Object.freeze([
  {
    value: "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
    label: "14K(585) 제품",
  },
  {
    value: "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
    label: "18K(750) 제품",
  },
  {
    value: "순금 995제품(목걸이,팔찌,반지,귀걸이)",
    label: "순금 995 제품",
  },
  {
    value: "순금 999제품(팔찌,목걸이, 반지,귀걸이)",
    label: "순금 999 제품",
  },
  { value: "순금 열쇠", label: "순금 열쇠" },
  {
    value: "순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)",
    label: "순금 장식 제품",
  },
  {
    value: "순금 마고자 단추 / 색상이 들어있는 제품",
    label: "순금 마고자/색상 포함 제품",
  },
  {
    value: "999,24k 순금덩어리(순도 측정후 999일 경우)",
    label: "999·24K 순금덩어리",
  },
]);

const GOLD_VAULT_TYPE_SET = new Set(GOLD_VAULT_TYPES.map((item) => item.value));

export function isSupportedGoldVaultType(value) {
  return GOLD_VAULT_TYPE_SET.has(String(value || ""));
}

export function getGoldVaultTypeLabel(value) {
  return GOLD_VAULT_TYPES.find((item) => item.value === value)?.label || "금제품";
}

export function normalizeGoldVaultValues(values = {}) {
  return {
    label: String(values.label || "").trim().slice(0, GOLD_VAULT_MAX_LABEL_LENGTH),
    goldType: String(values.goldType || "").trim(),
    weightG: Number(values.weightG),
    note: String(values.note || "").trim().slice(0, GOLD_VAULT_MAX_NOTE_LENGTH),
  };
}

export function validateGoldVaultValues(values = {}) {
  const normalized = normalizeGoldVaultValues(values);

  if (!normalized.label) {
    throw new Error("금제품 이름을 입력해 주세요.");
  }
  if (!isSupportedGoldVaultType(normalized.goldType)) {
    throw new Error("금 종류를 선택해 주세요.");
  }
  if (
    !Number.isFinite(normalized.weightG) ||
    normalized.weightG <= 0 ||
    normalized.weightG > GOLD_VAULT_MAX_WEIGHT_G
  ) {
    throw new Error(`무게는 0g 초과 ${GOLD_VAULT_MAX_WEIGHT_G.toLocaleString("ko-KR")}g 이하로 입력해 주세요.`);
  }

  return normalized;
}

export function computeVaultPureGoldG(item, rates = {}) {
  const weightG = Number(item?.weightG);
  if (!Number.isFinite(weightG) || weightG <= 0) return 0;

  return computeFinalWeightFromRates({
    grams: weightG,
    goldType: item?.goldType,
    exchangeType: GOLD_VAULT_EXCHANGE_TYPE,
    purity: rates.purity || DEFAULT_PURITY,
    exchange: rates.exchange || DEFAULT_EXCHANGE,
  });
}

export function computeVaultValueWon(pureGoldG, customerSellPricePerDon) {
  const grams = Number(pureGoldG);
  const perDon = Number(customerSellPricePerDon);
  if (!Number.isFinite(grams) || grams <= 0 || !Number.isFinite(perDon) || perDon <= 0) {
    return 0;
  }
  return Math.round((grams / DON_TO_GRAMS) * perDon);
}
