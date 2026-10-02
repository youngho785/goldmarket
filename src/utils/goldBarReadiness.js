// 화면 표시용 999.9 골드바 규격입니다.
// 금교환 화면의 실제 선택 가능 규격과 동일한 순서/중량을 사용합니다.
export const GOLD_BAR_DENOMS = Object.freeze([
  { grams: 500, label: "500g 골드바" },
  { grams: 100, label: "100g 골드바" },
  { grams: 75, label: "20돈(75g) 골드바" },
  { grams: 56.25, label: "15돈(56.25g) 골드바" },
  { grams: 50, label: "50g 골드바" },
  { grams: 37.5, label: "10돈(37.5g) 골드바" },
  { grams: 30, label: "30g 골드바" },
  { grams: 20, label: "20g 골드바" },
  { grams: 18.75, label: "5돈(18.75g) 골드바" },
  { grams: 11.25, label: "3돈(11.25g) 골드바" },
  { grams: 10, label: "10g 골드바" },
  { grams: 7.5, label: "2돈(7.5g) 골드바" },
  { grams: 5, label: "5g 골드바" },
  { grams: 3.75, label: "1돈(3.75g) 골드바" },
  { grams: 3, label: "3g 골드바" },
  { grams: 1, label: "1g 골드바" },
]);

export function getGoldBarReadiness(pureGoldG) {
  const grams = Number(pureGoldG) || 0;
  if (grams <= 0) return null;

  const available = GOLD_BAR_DENOMS.find((item) => item.grams <= grams + 1e-9);
  if (available) {
    return {
      available: true,
      label: available.label,
      grams: available.grams,
      remainingG: Math.max(0, grams - available.grams),
    };
  }

  return {
    available: false,
    label: "1g 골드바",
    grams: 1,
    neededG: Math.max(0, 1 - grams),
  };
}
