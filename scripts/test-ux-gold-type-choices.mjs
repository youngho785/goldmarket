import assert from "node:assert/strict";
import test from "node:test";
import { getQuickGoldTypeGroups, isQuickPureGoldType } from "../src/lib/quickGoldTypeChoices.js";

const known = [
  { productId: "gold-9999-bar", label: "999.9 골드바" },
  { productId: "gold-pure-key", label: "순금 열쇠" },
  { productId: "gold-999-product", label: "순금 999 제품" },
  { productId: "gold-14k-jewelry", label: "14K 제품" },
  { productId: "gold-18k-jewelry", label: "18K 제품" },
  { productId: "gold-995-product", label: "순금 995 제품" },
];

test("주요 금 종류는 14K·18K, 순금은 995·999, 나머지는 기타 목록에 유지", () => {
  const groups = getQuickGoldTypeGroups(known);
  assert.deepEqual(groups.quick.map((option) => option.productId), ["gold-14k-jewelry", "gold-18k-jewelry"]);
  assert.deepEqual(groups.pure.map((option) => option.productId), ["gold-995-product", "gold-999-product"]);
  assert.deepEqual(groups.more.map((option) => option.productId), ["gold-9999-bar", "gold-pure-key"]);
  assert.equal(groups.quick.length + groups.pure.length + groups.more.length, known.length);
});

test("특정 금 종류가 관리자 설정에서 비활성화되면 선택지에 임의로 추가하지 않는다", () => {
  const groups = getQuickGoldTypeGroups(known.filter((option) => option.productId !== "gold-995-product"));
  assert.deepEqual(groups.pure.map((option) => option.productId), ["gold-999-product"]);
  assert.equal(isQuickPureGoldType("gold-999-product"), true);
  assert.equal(isQuickPureGoldType("gold-9999-bar"), false);
});

test("선택지 미제공·빈 상태도 안전하며 기존 순도 또는 공임을 계산하지 않는다", () => {
  assert.deepEqual(getQuickGoldTypeGroups([]), { quick: [], pure: [], more: [] });
  assert.deepEqual(getQuickGoldTypeGroups(null), { quick: [], pure: [], more: [] });
  assert.equal(isQuickPureGoldType(""), false);
});
