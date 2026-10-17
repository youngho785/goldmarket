// src/lib/goldVaultImportDraft.js
import { DON_TO_GRAMS } from "@/lib/goldRates";
import {
  GOLD_VAULT_MAX_ITEMS,
  GOLD_VAULT_MAX_WEIGHT_G,
  getGoldVaultTypeLabel,
  isSupportedGoldVaultType,
  validateGoldVaultValues,
} from "@/lib/goldVaultCatalog";

const STORAGE_KEY = "kgm_my_gold_import_draft_v1";
const VERSION = 1;
const TTL_MS = 24 * 60 * 60 * 1000;
// GOLD TO GOLD starts with at most 20 exchange products, while the guest
// MY GOLD vault may contain 30. Never silently drop guest records on sign-up.
const MAX_EXCHANGE_ITEMS = 20;
const MAX_GUEST_ITEMS = GOLD_VAULT_MAX_ITEMS;

function roundWeight(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function toWeightG(product) {
  const quantity = Number(String(product?.quantity ?? "").replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return roundWeight(product?.inputUnit === "don" ? quantity * DON_TO_GRAMS : quantity);
}

function makeLabel(product, count) {
  const base = String(product?.productName || "").trim() || getGoldVaultTypeLabel(product?.goldType);
  return count > 1 ? `${base} ${count}` : base;
}

function sanitizeProducts(products) {
  if (!Array.isArray(products)) return [];

  const counts = new Map();
  const items = [];

  for (const product of products.slice(0, MAX_EXCHANGE_ITEMS)) {
    const productId = String(product?.productId || "").trim();
    const goldType = String(product?.goldType || "").trim();
    if (!productId && !isSupportedGoldVaultType(goldType)) continue;

    const weightG = toWeightG(product);
    if (
      !Number.isFinite(weightG) ||
      weightG <= 0 ||
      weightG > GOLD_VAULT_MAX_WEIGHT_G
    ) {
      continue;
    }

    const countKey = productId || goldType;
    const nextCount = (counts.get(countKey) || 0) + 1;
    counts.set(countKey, nextCount);

    items.push({
      label: makeLabel(product, nextCount),
      productId,
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
  for (const item of items.slice(0, MAX_GUEST_ITEMS)) {
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

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("저장할 체험 금이 없습니다.");
  }
  if (items.length > MAX_GUEST_ITEMS) {
    throw new Error(`MY GOLD 체험 기록은 최대 ${MAX_GUEST_ITEMS}개까지 옮길 수 있습니다.`);
  }
  const sanitized = sanitizeGuestItems(items);
  // Invalid records must not vanish silently during guest-to-account transfer.
  if (sanitized.length !== items.length) {
    throw new Error("체험 기록 중 확인이 필요한 항목이 있습니다. MY GOLD에서 기록을 확인한 후 다시 시도해 주세요.");
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
            productId: item?.productId,
            goldType: item?.goldType,
            quantity: item?.weightG,
            inputUnit: "g",
          }))
        );

    if (!items.length) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // A corrupted draft must not appear as a successful partial import.
    // Keep the guest MY GOLD source intact so the customer can retry safely.
    if (source === "guest-my-gold" && (
      !Array.isArray(parsed.items) ||
      parsed.items.length > MAX_GUEST_ITEMS ||
      items.length !== parsed.items.length
    )) {
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
