import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { toWeightGrams } from "../src/lib/goldWeightInput.js";

const read = (path) => readFileSync(path, "utf8");

test("10 입력 후 돈 선택: 금교환에서 10돈으로 계산된다", () => {
  const source = read("src/lib/goldExchangeForm.js");
  assert.match(source, /row\.sourceItemId/);
  assert.match(source, /: row\.quantity/);
  assert.equal(toWeightGrams("10", "don"), 37.5);
});

test("앱 금시세에 가입/퀵퀴즈/최대 0.03g 및 GOLD TO GOLD 이야기 유지", () => {
  const native = read("src/components/goldPrice/NativeGoldPriceOverview.jsx");
  const intro = read("src/pages/GoldToGoldIntro.jsx");
  const exchange = read("src/pages/GoldExchange.jsx");
  assert.match(native, /최대 순금 0\.03g 혜택/);
  assert.match(native, /to=\{isMember \? "\/member-gold" : "\/quiz\/gold-bonus"\}/);
  assert.match(native, /to="\/gold-to-gold"/);
  assert.match(intro, /GOLD TO GOLD란\?/);
  assert.match(exchange, /to="\/gold-to-gold"/);
});
