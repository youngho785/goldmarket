// src/lib/goldRates.js
import { doc, getDoc, onSnapshot } from "firebase/firestore";

/** Firestore 문서 경로 */
export const GOLD_RATES_DOC = { coll: "appConfig", id: "goldRates" };

/** 단위 상수 */
export const DON_TO_GRAMS = 3.75;

/** 기본 환산률(라벨 그대로 사용) */
export const DEFAULT_PURITY = {
  "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.53,
  "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.71,
  "순금 995제품(목걸이,팔찌,반지,귀걸이)": 0.945,
  "순금 999제품(팔찌,목걸이, 반지,귀걸이)": 0.95,
  "순금 열쇠": 0.943,
  "순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)": 0.94,
  "순금 마고자 단추 / 색상이 들어있는 제품": 0.93,
  "999,24k 순금덩어리(순도 측정후 999일 경우)": 0.96,
};

export const DEFAULT_EXCHANGE = { "999.9골드바": 1 };

/** 화면과 동일한 반올림(소수 4번째 자리 7이상 올림) */
export const roundTo3Custom = (n) => {
  if (!isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const t = Math.floor(abs * 10000 + 1e-8); // 4번째 자리까지 정수화
  let thousands = Math.floor(t / 10);       // 3번째 자리까지
  const fourth = t % 10;
  if (fourth >= 7) thousands += 1;
  return sign * (thousands / 1000);
};

export const toFixed3CustomStr = (n) => roundTo3Custom(n).toFixed(3);

/** 표준 계산식(반올림 포함) */
export function computeFinalWeightFromRates({ grams, goldType, exchangeType, purity, exchange }) {
  const pRaw = (purity && purity[goldType]) ?? DEFAULT_PURITY[goldType];
  const eRaw = (exchange && exchange[exchangeType]) ?? DEFAULT_EXCHANGE[exchangeType];
  const p = typeof pRaw === "number" ? pRaw : 0;
  const e = typeof eRaw === "number" ? eRaw : 1;
  return roundTo3Custom(grams * p * e);
}

/** Firestore 설정 병합 (레거시 키 변환 제거) */
export function mergeGoldRates(data) {
  const inData = data || {};
  const purityFromDb = inData.purity && typeof inData.purity === "object" ? inData.purity : {};
  const exchangeFromDb =
    inData.exchange && typeof inData.exchange === "object" ? inData.exchange : {};

  // DB 값이 우선, 없으면 기본값 사용
  const purity = { ...DEFAULT_PURITY, ...purityFromDb };
  const exchange = { ...DEFAULT_EXCHANGE, ...exchangeFromDb };

  return { purity, exchange };
}

/** 1회 조회 */
export async function getGoldRatesOnce(db) {
  try {
    const ref = doc(db, GOLD_RATES_DOC.coll, GOLD_RATES_DOC.id);
    const snap = await getDoc(ref);
    return snap.exists()
      ? mergeGoldRates(snap.data())
      : { purity: DEFAULT_PURITY, exchange: DEFAULT_EXCHANGE };
  } catch {
    return { purity: DEFAULT_PURITY, exchange: DEFAULT_EXCHANGE };
  }
}

/** 실시간 구독 */
export function subscribeGoldRates(db, onChange, onError = console.error) {
  const ref = doc(db, GOLD_RATES_DOC.coll, GOLD_RATES_DOC.id);
  return onSnapshot(
    ref,
    (snap) => onChange(mergeGoldRates(snap.data() || {})),
    (err) => onError("goldRates subscribe failed", err)
  );
}
