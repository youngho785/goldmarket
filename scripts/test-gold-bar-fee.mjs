import assert from "node:assert/strict";
import test from "node:test";
import {
  getGoldBarFee,
  getGoldBarFeeEstimate,
  formatGoldBarFee,
} from "../src/lib/goldBarFee.js";

test("1g 골드바 예상 공임은 40,000원이다", () => {
  assert.equal(getGoldBarFee(1 / 3.75, 1), 40000);
});

test("3g 골드바 예상 공임은 40,000원이다", () => {
  assert.equal(getGoldBarFee(3 / 3.75, 3), 40000);
});

test("3돈 골드바 특별 공임은 40,000원이다", () => {
  assert.equal(getGoldBarFee(3, 11.25), 40000);
});

test("5돈 골드바 예상 공임은 50,000원이다", () => {
  assert.equal(getGoldBarFee(5, 18.75), 50000);
});

test("15돈 골드바 특별 공임은 70,000원이다", () => {
  assert.equal(getGoldBarFee(15, 56.25), 70000);
});

test("20돈 골드바 예상 공임은 70,000원이다", () => {
  assert.equal(getGoldBarFee(20, 75), 70000);
});

test("선택 수량에 따라 총 예상 공임을 계산한다", () => {
  const result = getGoldBarFeeEstimate({ don: 3, grams: 11.25, qty: 2 });
  assert.equal(result.unitFee, 40000);
  assert.equal(result.totalFee, 80000);
  assert.equal(formatGoldBarFee(result.totalFee), "80,000원");
});
