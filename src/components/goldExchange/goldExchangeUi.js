import { DON_TO_GRAMS, roundTo3Custom } from "@/lib/goldRates";

export const STORE_INFO = {
  name: "원일귀금속",
  address: "부산광역시 부산진구 골드테마길 21",
  phone: "051-646-9700",
  mobile: "010-7713-3739",
};


export const STEP = { CALC: 0, BARS: 1, RESERVE: 2, DONE: 3 };
export const TIME_SLOTS = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
export const MAX_BOOKING_DAYS_AHEAD = 60;
export const MAX_PRODUCTS_PER_BOOKING = 20;
export const MAX_PRODUCT_GRAMS = 10_000;
export const MAX_NAME_LENGTH = 40;
export const MAX_PHONE_LENGTH = 20;

/** 골드바 규격 정의 */
export const BAR_GROUPS = {
  grams: [
    { key: "g-1",   grams: 1,   don: 1 / DON_TO_GRAMS,   label: "1g 골드바" },
    { key: "g-3",   grams: 3,   don: 3 / DON_TO_GRAMS,   label: "3g 골드바" },
    { key: "g-5",   grams: 5,   don: 5 / DON_TO_GRAMS,   label: "5g 골드바" },
    { key: "g-10",  grams: 10,  don: 10 / DON_TO_GRAMS,  label: "10g 골드바" },
    { key: "g-20",  grams: 20,  don: 20 / DON_TO_GRAMS,  label: "20g 골드바" },
    { key: "g-30",  grams: 30,  don: 30 / DON_TO_GRAMS,  label: "30g 골드바" },
    { key: "g-50",  grams: 50,  don: 50 / DON_TO_GRAMS,  label: "50g 골드바" },
    { key: "g-100", grams: 100, don: 100 / DON_TO_GRAMS, label: "100g 골드바" },
    { key: "g-500", grams: 500, don: 500 / DON_TO_GRAMS, label: "500g 골드바" },
  ],
  don: [
    { key: "d-1",   grams: 3.75,   don: 1,  label: "1돈 (3.75g) 골드바" },
    { key: "d-2",   grams: 7.5,    don: 2,  label: "2돈 (7.5g) 골드바" },
    { key: "d-3",   grams: 11.25,  don: 3,  label: "3돈 (11.25g) 골드바" },
    { key: "d-5",   grams: 18.75,  don: 5,  label: "5돈 (18.75g, 약 19g) 골드바" },
    { key: "d-10",  grams: 37.5,   don: 10, label: "10돈 (37.5g) 골드바" },
    { key: "d-15",  grams: 56.25,  don: 15, label: "15돈 (56.25g) 골드바" },
    { key: "d-20",  grams: 75,     don: 20, label: "20돈 (75g) 골드바" },
  ],
};
/** 잔여 조합용: 모든 규격(오름차순) */
export const ALL_DENOMS = [...BAR_GROUPS.grams, ...BAR_GROUPS.don].sort((a, b) => a.grams - b.grams);
export const MIN_BAR_GRAMS = ALL_DENOMS[0].grams;

/* Product options are loaded from appConfig/goldRates so admin changes apply without a redeploy. */

/* ── 입력값 표시 ───────────────────────── */
export const DON_TO_GRAMS_CONST = DON_TO_GRAMS;
export const displayOriginal = (qty, unit) => {
  const n = parseFloat(qty);
  if (isNaN(n) || n <= 0) return "0";
  return unit === "g"
    ? `${Number(n).toFixed(2)} g (${(roundTo3Custom(n / DON_TO_GRAMS_CONST)).toFixed(2)} 돈)`
    : `${Number(n * DON_TO_GRAMS_CONST).toFixed(2)} g (${(roundTo3Custom(n)).toFixed(2)} 돈)`;
};
export const qtyHelperText = (qty, unit) => {
  const n = parseFloat(qty);
  if (isNaN(n) || n <= 0) return "그램(g) 또는 돈 단위를 선택하고 값을 입력하면 자동 환산됩니다.";
  return unit === "g"
    ? `${Number(n).toFixed(2)} g ≈ ${(roundTo3Custom(n / DON_TO_GRAMS_CONST)).toFixed(2)} 돈`
    : `${(roundTo3Custom(n)).toFixed(2)} 돈 ≈ ${Number(n * DON_TO_GRAMS_CONST).toFixed(2)} g`;
};

/** 잔여 조합(그리디) — 부동소수 보정 강화 */
export const breakdownByDenoms = (grams) => {
  let remain = Math.max(0, roundTo3Custom(grams));
  const items = [];
  for (let i = ALL_DENOMS.length - 1; i >= 0; i--) {
    const d = ALL_DENOMS[i];
    const qty = Math.floor((remain + 1e-9) / d.grams);
    if (qty > 0) {
      items.push({ denom: d, qty });
      remain -= qty * d.grams;
      remain = Math.max(0, roundTo3Custom(remain));
    }
  }
  return { items, remain: Math.max(0, remain) };
};

/** 총량 이하에서 가장 큰 규격 추천 */
export const findBestChoice = (totalGrams) => {
  let best = ALL_DENOMS[0];
  for (const d of ALL_DENOMS) if (d.grams <= totalGrams) best = d;
  const group = BAR_GROUPS.grams.some((x) => x.key === best.key) ? "grams" : "don";
  const idx = Math.max(0, BAR_GROUPS[group].findIndex((x) => x.key === best.key));
  return { group, idx };
};

/** 그룹별 최적 인덱스 (탭 전환용) */
export const bestIdxForGroup = (group, totalGrams) => {
  const arr = BAR_GROUPS[group];
  let idx = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].grams <= totalGrams) idx = i;
  }
  return idx;
};

/* ── 독립 입력 컴포넌트 ───────────────────────── */
