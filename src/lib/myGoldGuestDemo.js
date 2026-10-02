import { validateGoldVaultValues } from "@/lib/goldVaultCatalog";

const STORAGE_KEY = "kgm_my_gold_guest_demo_v1";
const VERSION = 2;
const MAX_ITEMS = 30;
const LEGACY_SAMPLE_IDS = new Set([
  "guest-sample-bracelet",
  "guest-sample-ring",
]);

// 게스트 MY GOLD는 실제 회원혜택 순금을 가정하지 않습니다.
// 사용자가 직접 입력한 금만 MY GOLD 가치에 반영합니다.
export const GUEST_MY_GOLD_BONUS_G = 0;

const EMPTY_GUEST_ALERT_GOALS = Object.freeze({
  enabled: false,
  valueTargetWon: null,
  priceTargetPerDon: null,
  priceDirection: "up",
  targetGoldBarG: null,
});

// 새 게스트 MY GOLD는 샘플 금을 자동으로 넣지 않습니다.
// 사용자가 계산기/직접 입력으로 만든 금만 표시합니다.
export const DEFAULT_GUEST_MY_GOLD_ITEMS = Object.freeze([]);

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
    if (LEGACY_SAMPLE_IDS.has(String(item?.id || ""))) continue;
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
    if (![1, VERSION].includes(Number(parsed?.version))) return null;

    // v1에서 자동으로 들어가던 샘플 두 개만 제거하고 사용자가 만든 기록은 보존합니다.
    if (Number(parsed?.version) === 1) {
      const migrated = {
        ...parsed,
        version: VERSION,
        items: sanitizeItems(parsed?.items),
        updatedAt: Date.now(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      } catch {}
      return migrated;
    }

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

export function readSavedGuestMyGoldItems() {
  const stored = readStore();
  if (!Array.isArray(stored?.items)) return [];
  return sanitizeItems(stored.items);
}

export function readGuestMyGoldItems() {
  const stored = readStore();
  if (Array.isArray(stored?.items)) return sanitizeItems(stored.items);
  return [];
}

export function saveGuestMyGoldItems(items) {
  const sanitized = sanitizeItems(items);
  writeStore({ items: sanitized });
  return sanitized;
}

export function resetGuestMyGoldItems() {
  const items = [];
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
