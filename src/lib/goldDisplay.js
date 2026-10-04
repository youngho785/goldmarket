import { DON_TO_GRAMS } from "@/lib/goldRates";

const twoDecimalFormatter = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

/** UI display only. Calculation/storage precision must remain unchanged. */
export function formatGoldNumber2(value) {
  return twoDecimalFormatter.format(toFiniteNumber(value));
}

export function formatGoldGrams(value, { showTiny = true } = {}) {
  const number = toFiniteNumber(value);
  if (showTiny && number > 0 && number < 0.005) return "<0.01g";
  return `${formatGoldNumber2(number)}g`;
}

export function formatGoldDon(value, { showTiny = true } = {}) {
  const number = toFiniteNumber(value);
  if (showTiny && number > 0 && number < 0.005) return "<0.01돈";
  return `${formatGoldNumber2(number)}돈`;
}

export function formatGoldWeightPair(valueInGrams) {
  const grams = toFiniteNumber(valueInGrams);
  return `${formatGoldGrams(grams)} (${formatGoldDon(grams / DON_TO_GRAMS)})`;
}
