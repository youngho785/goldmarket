import { DON_TO_GRAMS } from "@/lib/goldRates";
import { validateGoldVaultValues } from "@/lib/goldVaultCatalog";

const STORAGE_KEY = "kgm_my_gold_guest_demo_v1";
const VERSION = 1;
const MAX_ITEMS = 30;

export const GUEST_MY_GOLD_BONUS_G = 0.03;

const EMPTY_GUEST_ALERT_GOALS = Object.freeze({
  enabled: false,
  valueTargetWon: null,
  priceTargetPerDon: null,
  priceDirection: "up",
  targetGoldBarG: null,
});

export const DEFAULT_GUEST_MY_GOLD_ITEMS = Object.freeze([
  {
    id: "guest-sample-bracelet",
    label: "18K 팔찌",
    goldType: "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
    weightG: 10,
    note: "체험 예시",
  },
  {
    id: "guest-sample-ring",
    label: "순금 돌반지",
    goldType: "순금 999제품(팔찌,목걸이, 반지,귀걸이)",
    weightG: DON_TO_GRAMS * 2,
    note: "체험 예시",
  },
]);

function makeGuestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `guest-${crypto.randomUUID()}`;
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  const next = [];
  for (const item of items.slice(0, MAX_ITEMS)) {
    try {
      const normalized = validateGoldVaultValues(item || {});
      next.push({
        id: String(item?.id || makeGuestId()),
        ...normalized,
      });
    } catch {
      // 체험 저장소에 잘못된 항목이 있으면 해당 항목만 무시합니다.
    }
  }
  return next;
}

function sanitizeGoals(value) {
  const source = value && typeof value === "object" ? value : {};
  const valueTargetWon = Number(source.valueTargetWon);
  const priceTargetPerDon = Number(source.priceTargetPerDon);
  const targetGoldBarG = Number(source.targetGoldBarG);
  const result = {
    enabled: source.enabled === true,
    valueTargetWon: Number.isFinite(valueTargetWon) && valueTargetWon > 0 ? valueTargetWon : null,
    priceTargetPerDon: Number.isFinite(priceTargetPerDon) && priceTargetPerDon > 0 ? priceTargetPerDon : null,
    priceDirection: source.priceDirection === "down" ? "down" : "up",
    targetGoldBarG: Number.isFinite(targetGoldBarG) && targetGoldBarG > 0 ? targetGoldBarG : null,
  };
  result.enabled = !!(
    result.enabled &&
    (result.valueTargetWon || result.priceTargetPerDon || result.targetGoldBarG)
  );
  return result;
}

function readStore() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStore(patch) {
  if (typeof window === "undefined") return;
  try {
    const current = readStore() || { version: VERSION };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, ...patch, version: VERSION, updatedAt: Date.now() })
    );
  } catch (error) {
    console.warn("[MY GOLD guest demo] local save failed:", error?.message || error);
  }
}

export function readGuestMyGoldItems() {
  const stored = readStore();
  if (Array.isArray(stored?.items)) return sanitizeItems(stored.items);
  return DEFAULT_GUEST_MY_GOLD_ITEMS.map((item) => ({ ...item }));
}

export function saveGuestMyGoldItems(items) {
  const sanitized = sanitizeItems(items);
  writeStore({ items: sanitized });
  return sanitized;
}

export function resetGuestMyGoldItems() {
  const items = DEFAULT_GUEST_MY_GOLD_ITEMS.map((item) => ({ ...item }));
  writeStore({ items });
  return items;
}

export function readGuestMyGoldAlertGoals() {
  return sanitizeGoals(readStore()?.alertGoals || EMPTY_GUEST_ALERT_GOALS);
}

export function saveGuestMyGoldAlertGoals(goals) {
  const sanitized = sanitizeGoals(goals);
  writeStore({ alertGoals: sanitized });
  return sanitized;
}

export function clearGuestMyGoldDemo() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
