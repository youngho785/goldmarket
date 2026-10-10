/** UI-only proportional visual width. Never used in gold weight, purity or fee calculation. */
export function getGoldBarVisualWidth(grams) {
  const weight = Number(grams);
  if (!Number.isFinite(weight) || weight <= 0) return 58;
  return Math.max(58, Math.min(88, Math.round(58 + 6 * Math.log2(weight))));
}
