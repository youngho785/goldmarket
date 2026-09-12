// src/lib/goldRates.js
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import goldRatesDefaults from "../../functions/src/goldRates.defaults.json";

/** Firestore 문서 경로 */
export const GOLD_RATES_DOC = { coll: "appConfig", id: "goldRates" };

/** 단위 상수 */
export const DON_TO_GRAMS = goldRatesDefaults.donToGrams;

/** 기본 환산률(라벨 그대로 사용) */
export const DEFAULT_PURITY = Object.freeze({ ...goldRatesDefaults.purity });

export const DEFAULT_EXCHANGE = Object.freeze({ ...goldRatesDefaults.exchange });
export const DEFAULT_GOLD_RATES_VERSION = goldRatesDefaults.version;

/** 화면과 동일한 반올림(소수 4번째 자리 7이상 올림) */
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
  const exchangeFromDb =
    inData.exchange && typeof inData.exchange === "object" ? inData.exchange : {};

  const purity = { ...DEFAULT_PURITY, ...purityFromDb };
  const exchange = { ...DEFAULT_EXCHANGE, ...exchangeFromDb };

  return {
    purity,
    exchange,
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
    return snap.exists()
      ? mergeGoldRates(snap.data())
      : mergeGoldRates({});
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
