// KRX public gold-price collection and publication management.
import { FieldValue } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, ENFORCE_APP_CHECK, requireCurrentAdmin, DON_TO_GRAMS } from "../core/runtime.js";

/* ─────────────────────────────────────────────────────────────
 * KRX 금시세 수집/관리
 * 주의: 아래 금시세 가격 기능은 appConfig/goldRates 및 DEFAULT_PURITY와
 * 완전히 분리되어 있으며 금교환 중량 계산에 영향을 주지 않습니다.
 * ───────────────────────────────────────────────────────────── */
const DATA_GO_KR_SERVICE_KEY = defineSecret("DATA_GO_KR_SERVICE_KEY");
const GOLD_PRICE_SETTINGS_REF = "goldPriceSettings/current";
const GOLD_PRICE_PENDING_REF = "goldPrices/pending";
const GOLD_PRICE_KRX_HISTORY = "goldPriceKrxHistory";
const GOLD_PRICE_API_URL =
  "https://apis.data.go.kr/1160100/service/GetGeneralProductInfoService/getGoldPriceInfo";

type GoldPriceRule = {
  rate: number;
  adjustmentPerDon: number;
};

type GoldPriceSettings = {
  enabled: boolean;
  publishMode: "approval" | "auto";
  roundingUnit: number;
  pureGoldBuy: GoldPriceRule;
  pureGoldSell: GoldPriceRule;
  gold18kBuy: GoldPriceRule;
  gold14kBuy: GoldPriceRule;
};

const DEFAULT_GOLD_PRICE_SETTINGS: GoldPriceSettings = {
  enabled: false,
  publishMode: "approval",
  roundingUnit: 1000,
  pureGoldBuy: { rate: 1, adjustmentPerDon: 0 },
  pureGoldSell: { rate: 1, adjustmentPerDon: 0 },
  gold18kBuy: { rate: 0.75, adjustmentPerDon: 0 },
  gold14kBuy: { rate: 0.585, adjustmentPerDon: 0 },
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeGoldPriceRule(value: unknown, fallback: GoldPriceRule): GoldPriceRule {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const rate = toFiniteNumber(raw.rate, fallback.rate);
  const adjustmentPerDon = toFiniteNumber(
    raw.adjustmentPerDon,
    fallback.adjustmentPerDon
  );
  if (rate < 0 || rate > 3) {
    throw new HttpsError("invalid-argument", "가격 적용비율은 0~3 사이여야 합니다.");
  }
  if (Math.abs(adjustmentPerDon) > 10_000_000) {
    throw new HttpsError("invalid-argument", "가감액 범위를 확인해 주세요.");
  }
  return { rate, adjustmentPerDon: Math.round(adjustmentPerDon) };
}

function normalizeGoldPriceSettings(value: unknown): GoldPriceSettings {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const roundingUnit = Math.round(
    toFiniteNumber(raw.roundingUnit, DEFAULT_GOLD_PRICE_SETTINGS.roundingUnit)
  );
  if (![1, 10, 100, 1000, 10000].includes(roundingUnit)) {
    throw new HttpsError(
      "invalid-argument",
      "가격 처리 단위는 1, 10, 100, 1,000, 10,000원 중에서 선택해 주세요."
    );
  }
  const publishMode = raw.publishMode === "auto" ? "auto" : "approval";
  return {
    enabled: raw.enabled === true,
    publishMode,
    roundingUnit,
    pureGoldBuy: normalizeGoldPriceRule(raw.pureGoldBuy, DEFAULT_GOLD_PRICE_SETTINGS.pureGoldBuy),
    pureGoldSell: normalizeGoldPriceRule(raw.pureGoldSell, DEFAULT_GOLD_PRICE_SETTINGS.pureGoldSell),
    gold18kBuy: normalizeGoldPriceRule(raw.gold18kBuy, DEFAULT_GOLD_PRICE_SETTINGS.gold18kBuy),
    gold14kBuy: normalizeGoldPriceRule(raw.gold14kBuy, DEFAULT_GOLD_PRICE_SETTINGS.gold14kBuy),
  };
}

function roundPrice(value: number, unit: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value / unit) * unit;
}

function ymdInSeoul(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}`;
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return ymdInSeoul(date);
}

type UnknownRecord = Record<string, unknown>;

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asUnknownRecord(value: unknown): UnknownRecord {
  return isUnknownRecord(value) ? value : {};
}

function apiItems(payload: unknown): Array<UnknownRecord> {
  const root = asUnknownRecord(payload);
  const response = asUnknownRecord(root.response);
  const body = asUnknownRecord(response.body);
  const itemsContainer = asUnknownRecord(body.items);
  const items = itemsContainer.item;

  if (Array.isArray(items)) return items.filter(isUnknownRecord);
  if (isUnknownRecord(items)) return [items];
  return [];
}

function normalizePublicDataServiceKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (!trimmed) return "";

  // 공공데이터포털의 Encoding 인증키를 Secret에 저장한 경우
  // URLSearchParams가 %를 다시 인코딩하지 않도록 한 번 디코딩합니다.
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

async function fetchLatestKrxGoldPrice(rawServiceKey: string) {
  const serviceKey = normalizePublicDataServiceKey(rawServiceKey);
  let lastReason = "조회 가능한 금시세가 없습니다.";

  for (let daysAgo = 0; daysAgo <= 10; daysAgo += 1) {
    const basDt = dateDaysAgo(daysAgo);
    const url = new URL(GOLD_PRICE_API_URL);
    url.searchParams.set("serviceKey", serviceKey);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "20");
    url.searchParams.set("resultType", "json");
    url.searchParams.set("basDt", basDt);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      const responseText = await response.text();

      if (!response.ok) {
        lastReason = `공공데이터 API HTTP ${response.status}`;
        console.warn("[fetchLatestKrxGoldPrice] HTTP error", {
          basDt,
          status: response.status,
          bodyPreview: responseText.slice(0, 300),
        });
        continue;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(responseText) as unknown;
      } catch {
        lastReason = "공공데이터 API가 JSON이 아닌 응답을 반환했습니다.";
        console.warn("[fetchLatestKrxGoldPrice] non-JSON response", {
          basDt,
          bodyPreview: responseText.slice(0, 500),
        });
        continue;
      }

      const root = asUnknownRecord(payload);
      const responseRoot = asUnknownRecord(root.response);
      const header = asUnknownRecord(responseRoot.header);
      const resultCode = String(header.resultCode ?? "");
      const resultMessage = String(header.resultMsg ?? "");

      if (resultCode && resultCode !== "00") {
        lastReason = resultMessage || `공공데이터 API 오류 코드 ${resultCode}`;
        console.warn("[fetchLatestKrxGoldPrice] API error", {
          basDt,
          resultCode,
          resultMessage,
        });
        continue;
      }

      const items = apiItems(payload);
      const item = items.find((row) => {
        const name = String(row.itmsNm || "").replace(/\s/g, "").toLowerCase();
        return name.includes("금99.99_1kg") || name.includes("금99.99_1㎏");
      });

      if (!item) {
        lastReason = `${basDt} 기준 금 99.99_1kg 데이터가 없습니다.`;
        continue;
      }

      const pricePerGram = toFiniteNumber(item.clpr, 0);
      if (pricePerGram <= 0) {
        lastReason = "KRX 종가가 올바르지 않습니다.";
        continue;
      }

      return {
        sourceDate: String(item.basDt || basDt),
        itemName: String(item.itmsNm || "금 99.99_1kg"),
        shortCode: String(item.srtnCd || ""),
        isinCode: String(item.isinCd || ""),
        pricePerGram: Math.round(pricePerGram),
        pricePerDon: Math.round(pricePerGram * DON_TO_GRAMS),
        marketOpen: toFiniteNumber(item.mkp, 0),
        marketHigh: toFiniteNumber(item.hipr, 0),
        marketLow: toFiniteNumber(item.lopr, 0),
        change: toFiniteNumber(item.vs, 0),
        changeRate: toFiniteNumber(item.fltRt, 0),
        volume: toFiniteNumber(item.trqu, 0),
        tradingValue: toFiniteNumber(item.trPrc, 0),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastReason = `공공데이터 API 호출 실패: ${message}`;
      console.error("[fetchLatestKrxGoldPrice] request failed", {
        basDt,
        message,
      });
    }
  }

  throw new Error(lastReason);
}

function calculateMarketPrices(
  krxPerDon: number,
  settings: GoldPriceSettings
) {
  const calc = (rule: GoldPriceRule) => roundPrice(
    krxPerDon * rule.rate + rule.adjustmentPerDon,
    settings.roundingUnit
  );
  return {
    pureGoldBuyPerDon: calc(settings.pureGoldBuy),
    pureGoldSellPerDon: calc(settings.pureGoldSell),
    gold18kBuyPerDon: calc(settings.gold18kBuy),
    gold14kBuyPerDon: calc(settings.gold14kBuy),
  };
}

async function loadGoldPriceSettings(): Promise<GoldPriceSettings> {
  const snap = await db().doc(GOLD_PRICE_SETTINGS_REF).get();
  if (!snap.exists) return DEFAULT_GOLD_PRICE_SETTINGS;
  return normalizeGoldPriceSettings(snap.data());
}

async function syncGoldPriceFromKrx(trigger: "schedule" | "manual") {
  const serviceKey = DATA_GO_KR_SERVICE_KEY.value().trim();
  if (!serviceKey) throw new Error("DATA_GO_KR_SERVICE_KEY Secret이 설정되지 않았습니다.");

  const [krx, settings] = await Promise.all([
    fetchLatestKrxGoldPrice(serviceKey),
    loadGoldPriceSettings(),
  ]);
  const market = calculateMarketPrices(krx.pricePerDon, settings);
  const now = FieldValue.serverTimestamp();
  const payload = {
    source: "KRX_PUBLIC_DATA",
    sourceLabel: "금융위원회 일반상품시세정보",
    sourceDate: krx.sourceDate,
    trigger,
    krx,
    market,
    settingsSnapshot: settings,
    fetchedAt: now,
    status: settings.enabled ? "ready" : "disabled",
  };

  await db().doc(GOLD_PRICE_PENDING_REF).set(payload, { merge: false });
  await db().collection(GOLD_PRICE_KRX_HISTORY).doc(`${krx.sourceDate}_${Date.now()}`).set(payload);

  // KRX 값은 관리자 참고용으로만 저장합니다.
  // 홈페이지 공개 시세(goldPrices/current)는 관리자 직접 입력 화면에서만 갱신합니다.
  return { ok: true, krx, market, settings };
}

export const syncKrxGoldPrice = onSchedule(
  {
    schedule: "30 13 * * 1-5",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    secrets: [DATA_GO_KR_SERVICE_KEY],
    retryCount: 2,
  },
  async () => {
    try {
      await syncGoldPriceFromKrx("schedule");
    } catch (error) {
      console.error("[syncKrxGoldPrice] failed", error);
      throw error;
    }
  }
);

export const refreshGoldPriceNow = onCall(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
    secrets: [DATA_GO_KR_SERVICE_KEY],
    timeoutSeconds: 60,
  },
  async (req) => {
    try {
      await requireCurrentAdmin(req.auth?.uid);

      console.log("[refreshGoldPriceNow] request", {
        uid: req.auth?.uid || null,
        hasSecret: DATA_GO_KR_SERVICE_KEY.value().trim().length > 0,
      });

      await syncGoldPriceFromKrx("manual");
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[refreshGoldPriceNow] failed", {
        message,
        stack: error instanceof Error ? error.stack : null,
        uid: req.auth?.uid || null,
      });

      if (error instanceof HttpsError) throw error;

      throw new HttpsError(
        "internal",
        `금시세 조회 실패: ${message}`
      );
    }
  }
);

export const saveGoldPriceSettings = onCall<{ settings: unknown }>(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    try {
      if (!req.auth?.uid) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
      }

      const token = (req.auth.token || {}) as Record<string, unknown>;

      console.log("[saveGoldPriceSettings] request", {
        uid: req.auth.uid,
        admin: token.admin === true,
        superAdmin: token.superAdmin === true,
        hasSettings: req.data?.settings != null,
      });

      await requireCurrentAdmin(req.auth?.uid);

      const settings = normalizeGoldPriceSettings(req.data?.settings);

      await db().doc(GOLD_PRICE_SETTINGS_REF).set(
        {
          ...settings,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: req.auth.uid,
        },
        { merge: true }
      );

      console.log("[saveGoldPriceSettings] saved", {
        uid: req.auth.uid,
        enabled: settings.enabled,
        publishMode: settings.publishMode,
        roundingUnit: settings.roundingUnit,
      });

      // Callable 응답은 직렬화 오류 가능성을 줄이기 위해
      // 저장 성공 여부만 반환합니다. 최신 설정값은 Firestore 실시간 구독으로 반영됩니다.
      return { ok: true };
    } catch (error) {
      console.error("[saveGoldPriceSettings] failed", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        uid: req.auth?.uid || null,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        error instanceof Error
          ? `금시세 설정 저장 실패: ${error.message}`
          : "금시세 설정을 저장하지 못했습니다."
      );
    }
  }
);

export const publishPendingGoldPrice = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);
    throw new HttpsError(
      "failed-precondition",
      "KRX 시세는 참고용입니다. 홈페이지 시세는 관리자 직접 입력 화면에서 저장해 주세요."
    );
  }
);
