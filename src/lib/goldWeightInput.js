// 입력 UI에서의 g/돈 전환 전용 유틸입니다. 실거래 환산율·저장 규칙은 변경하지 않습니다.
// 6자리 이하 소수점을 보존하여 화면 단위 전환으로 중량이 커지거나 작아지는 일을 막습니다.
export const GRAMS_PER_DON = 3.75;

export function toWeightGrams(value, unit) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return Number.NaN;
  return unit === "don" ? amount * GRAMS_PER_DON : amount;
}

/** 값을 지운 상태에서는 단위만 변경합니다. 유효한 값은 동일한 물리적 중량으로 전환합니다. */
export function switchGoldWeightUnit(value, fromUnit, toUnit) {
  const raw = String(value ?? "");
  if (fromUnit === toUnit || !raw.trim()) return raw;
  const grams = toWeightGrams(raw, fromUnit);
  if (!Number.isFinite(grams)) return raw; // 예상 못 한 입력은 숫자로 추정하지 않음
  const converted = toUnit === "don" ? grams / GRAMS_PER_DON : grams;
  // 소수점 6자리: 0.001g 이하를 포함한 UI 전환 오차를 매우 작게 억제합니다.
  return Number(converted.toFixed(6)).toString();
}
