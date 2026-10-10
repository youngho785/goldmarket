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

test("앱 금시세는 가입 유도 문구 없이 퀵퀴즈와 GOLD TO GOLD 이야기 연결", () => {
  const native = read("src/components/goldPrice/NativeGoldPriceOverview.jsx");
  const intro = read("src/pages/GoldToGoldIntro.jsx");
  const exchange = read("src/pages/GoldExchange.jsx");
  assert.doesNotMatch(native, /회원 혜택 알아보기/);
  assert.match(native, /최대 순금 0\.03g 혜택/);
  assert.match(native, /to=\{isMember \? "\/member-gold" : "\/quiz\/gold-bonus"\}/);
  assert.match(native, /<AppPricePrimary to="\/">/);
  assert.match(native, /to="\/gold-to-gold"/);
  assert.match(intro, /GOLD TO GOLD란\?/);
  assert.match(exchange, /to="\/gold-to-gold"/);
});
