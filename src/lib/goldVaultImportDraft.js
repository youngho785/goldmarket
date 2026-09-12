// src/lib/goldVaultImportDraft.js
import { DON_TO_GRAMS } from "@/lib/goldRates";
import {
  GOLD_VAULT_MAX_WEIGHT_G,
  getGoldVaultTypeLabel,
  isSupportedGoldVaultType,
  validateGoldVaultValues,
} from "@/lib/goldVaultCatalog";

const STORAGE_KEY = "kgm_my_gold_import_draft_v1";
const VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ITEMS = 20;

function roundWeight(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function toWeightG(product) {
  const quantity = Number(String(product?.quantity ?? "").replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return roundWeight(product?.inputUnit === "don" ? quantity * DON_TO_GRAMS : quantity);
}

function makeLabel(goldType, count) {
  const base = getGoldVaultTypeLabel(goldType);
  return count > 1 ? `${base} ${count}` : base;
}

function sanitizeProducts(products) {
  if (!Array.isArray(products)) return [];

  const counts = new Map();
  const items = [];

  for (const product of products.slice(0, MAX_ITEMS)) {
    const goldType = String(product?.goldType || "").trim();
    if (!isSupportedGoldVaultType(goldType)) continue;

    const weightG = toWeightG(product);
    if (
      !Number.isFinite(weightG) ||
      weightG <= 0 ||
      weightG > GOLD_VAULT_MAX_WEIGHT_G
    ) {
      continue;
    }

    const nextCount = (counts.get(goldType) || 0) + 1;
    counts.set(goldType, nextCount);

    items.push({
      label: makeLabel(goldType, nextCount),
      goldType,
      weightG,
      note: "",
    });
  }

  return items;
}

export function saveGoldVaultImportDraft(products) {
  if (typeof window === "undefined") {
    throw new Error("이 브라우저에서는 임시 저장을 사용할 수 없습니다.");
  }

  const items = sanitizeProducts(products);
  if (!items.length) {
    throw new Error("MY GOLD에 저장할 수 있는 금 종류와 중량을 찾지 못했습니다.");
  }

  const draft = {
    version: VERSION,
    source: "gold-exchange-calculator",
    savedAt: Date.now(),
    items,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn("[goldVaultImportDraft] save failed:", error?.message || error);
    throw new Error("계산한 금 정보를 임시 저장하지 못했습니다. 브라우저 저장공간 설정을 확인해 주세요.");
  }

  return draft;
}

function sanitizeGuestItems(items) {
  if (!Array.isArray(items)) return [];
  const result = [];
  for (const item of items.slice(0, MAX_ITEMS)) {
    try {
      const normalized = validateGoldVaultValues(item || {});
      result.push(normalized);
    } catch {
      // 유효하지 않은 체험 항목만 제외합니다.
    }
  }
  return result;
}

export function saveGoldVaultGuestDraft(items) {
  if (typeof window === "undefined") {
    throw new Error("이 브라우저에서는 임시 저장을 사용할 수 없습니다.");
  }

  const sanitized = sanitizeGuestItems(items);
  if (!sanitized.length) {
    throw new Error("저장할 체험 금이 없습니다.");
  }

  const draft = {
    version: VERSION,
    source: "guest-my-gold",
    savedAt: Date.now(),
    items: sanitized,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn("[goldVaultImportDraft] guest save failed:", error?.message || error);
    throw new Error("MY GOLD 체험 기록을 임시 저장하지 못했습니다. 브라우저 저장공간 설정을 확인해 주세요.");
  }

  return draft;
}

export function readGoldVaultImportDraft(expectedSource = "") {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);
    const source = String(parsed?.source || "");
    if (
      parsed?.version !== VERSION ||
      !["gold-exchange-calculator", "guest-my-gold"].includes(source) ||
      (expectedSource && source !== expectedSource) ||
      !savedAt ||
      Date.now() - savedAt > TTL_MS
    ) {
      if (!expectedSource || source === expectedSource || Date.now() - savedAt > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
      }
      return null;
    }

    const items = source === "guest-my-gold"
      ? sanitizeGuestItems(parsed?.items || [])
      : sanitizeProducts(
          (parsed?.items || []).map((item) => ({
            goldType: item?.goldType,
            quantity: item?.weightG,
            inputUnit: "g",
          }))
        );

    if (!items.length) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      version: VERSION,
      source,
      savedAt,
      items,
    };
  } catch (error) {
    console.warn("[goldVaultImportDraft] read failed:", error?.message || error);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return null;
  }
}

export function clearGoldVaultImportDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
