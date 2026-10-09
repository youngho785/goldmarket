import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { switchGoldWeightUnit, toWeightGrams } from "../src/lib/goldWeightInput.js";
import { markFirstValueStart, getFirstValueElapsedBucket } from "../src/lib/firstValueTiming.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const sources = {
  quick: read("src/components/gold/QuickGoldValueCalculator.jsx"),
  vault: read("src/pages/MyGoldVault.jsx"),
  exchange: read("src/pages/GoldExchange.jsx"),
  exchangeForm: read("src/lib/goldExchangeForm.js"),
  quantity: read("src/components/goldExchange/GoldExchangeSteps.jsx"),
  journey: read("src/components/gold/AppGoldJourney.jsx"),
  analytics: read("src/analytics/productAnalytics.js"),
  rates: JSON.parse(read("functions/src/goldRates.defaults.json")),
};

test("물리 중량 보존: 3.75g ↔ 1돈, 1.0g ↔ 돈", () => {
  assert.equal(sources.rates.donToGrams, 3.75);
  assert.equal(switchGoldWeightUnit("3.75", "g", "don"), "1");
  assert.equal(switchGoldWeightUnit("1", "don", "g"), "3.75");
  for (const grams of [0.001, 0.01, 1, 3.456, 3.75, 10.025, 37.5, 9999]) {
    let value = String(grams);
    for (let i = 0; i < 8; i += 1) {
      value = switchGoldWeightUnit(value, "g", "don");
      value = switchGoldWeightUnit(value, "don", "g");
    }
    const drift = Math.abs(toWeightGrams(value, "g") - grams);
    assert.ok(drift < 0.000005, `중량 ${grams}g 단위 왕복 후 오차 ${drift}g`);
  }
});

test("빈 입력과 단위 변경은 금을 임의로 생성하지 않는다", () => {
  assert.equal(switchGoldWeightUnit("", "g", "don"), "");
  assert.equal(switchGoldWeightUnit("  ", "g", "don"), "  ");
  assert.equal(switchGoldWeightUnit("0", "g", "don"), "0");
  assert.equal(switchGoldWeightUnit("입력오류", "g", "don"), "입력오류");
  assert.ok(Number.isNaN(toWeightGrams("입력오류", "g")));
});

test("앱 첫 계산, MY GOLD 기록, GOLD TO GOLD Step1의 3개 경로가 같은 중량변환을 사용한다", () => {
  assert.match(sources.quick, /setWeightValue\(\(current\) => switchGoldWeightUnit\(current, weightUnit, nextUnit\)\)/);
  assert.match(sources.quick, /onChange=\{\(event\) => changeWeightUnit\(event\.target\.value\)\}/);
  assert.match(sources.vault, /weightValue: switchGoldWeightUnit\(prev\.weightValue, prev\.weightUnit, nextUnit\)/);
  assert.match(sources.vault, /onClick=\{\(\) => changeRecordWeightUnit\("don"\)\}/);
  assert.match(sources.exchangeForm, /quantity: switchGoldWeightUnit\(row\.quantity, row\.inputUnit, value\)/);
  assert.match(sources.exchange, /changeExchangeProductField\(prev, idx, field, value\)/);
  assert.match(sources.quantity, /onCommit\(norm\)/);
  assert.doesNotMatch(sources.quantity, /roundTo3Custom\(v\)\.toFixed\(2\)/);
});

test("미공개/지연 시세는 0원 확정치처럼 표시하지 않고 기록 기준 교환 표현은 예상으로 제한한다", () => {
  assert.match(sources.quick, /publishedEstimateReady \? formatWon\(estimatedValueWon\)/);
  assert.match(sources.quick, /pureGoldEstimateReady \? formatGoldWeightPair\(pureGoldG\)/);
  assert.match(sources.journey, /예상 교환 가능/);
  assert.doesNotMatch(sources.journey, /교환 가능합니다\./);
  assert.match(sources.journey, /기록 기준 예상/);
});

test("첫 가치 확인 계측은 시간 구간만 수집하고 금액/무게/개인정보는 사용하지 않는다", () => {
  const data = new Map();
  const storage = {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, value); },
  };
  markFirstValueStart(100_000, storage);
  markFirstValueStart(102_000, storage);
  assert.equal(getFirstValueElapsedBucket(105_000, storage), "under_10s");
  assert.equal(getFirstValueElapsedBucket(115_000, storage), "10_20s");
  assert.equal(getFirstValueElapsedBucket(125_000, storage), "20_30s");
  assert.equal(getFirstValueElapsedBucket(131_000, storage), "over_30s");
  assert.match(sources.analytics, /app_first_value_calculated: Object\.freeze/);
  assert.match(sources.analytics, /elapsed_bucket: new Set/);
  assert.match(sources.quick, /"app_first_value_calculated"/);
  assert.doesNotMatch(sources.quick, /app_first_value_calculated"\s*,\s*\{[^}]*\b(?:weight|amount|price|grams)\b/);
});
