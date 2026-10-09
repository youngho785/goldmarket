// 앱의 첫 금 가치 계산에서만 빠른 금 종류 선택을 구성합니다.
// 금 종류에 따른 계산 정책은 실제 productId를 통해 기존 카탈로그에서 결정합니다.
const QUICK_IDS = Object.freeze(["gold-14k-jewelry", "gold-18k-jewelry"]);
const PURE_IDS = Object.freeze(["gold-995-product", "gold-999-product"]);
const QUICK_SET = new Set([...QUICK_IDS, ...PURE_IDS]);

export function isQuickPureGoldType(productId) {
  return PURE_IDS.includes(String(productId || ""));
}

export function getQuickGoldTypeGroups(options = []) {
  const source = Array.isArray(options) ? options : [];
  const byId = new Map(source.map((option) => [option.productId, option]));
  return {
    quick: QUICK_IDS.map((id) => byId.get(id)).filter(Boolean),
    pure: PURE_IDS.map((id) => byId.get(id)).filter(Boolean),
    more: source.filter((option) => !QUICK_SET.has(option.productId)),
  };
}
