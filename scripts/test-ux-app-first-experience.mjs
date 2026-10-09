import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("src/pages/AndroidHome.jsx");
const calc = read("src/components/gold/QuickGoldValueCalculator.jsx");
const exchange = read("src/pages/GoldExchange.jsx");
const exchangeForm = read("src/lib/goldExchangeForm.js");
const pkg = JSON.parse(read("package.json"));

test("앱의 첫 계산은 회원가입과 별도의 설명 화면 없이 시작한다", () => {
  assert.match(home, /\{!user\?\.uid && \(\s*<QuickGoldValueCalculator/);
  assert.match(calc, /const appFirstExperience = source === "app-home" \|\| source === "app-first-gold"/);
  assert.match(calc, /<ProductShapeChoices role="group" aria-label="제품 형태 선택">/);
  assert.match(calc, /aria-pressed=\{productShape === id\}/);
  for (const label of ["반지", "목걸이", "팔찌"]) assert.match(calc, new RegExp(`label: "${label}"`));
});

test("제품 그림은 순도·중량을 임의로 추정하지 않는다", () => {
  assert.match(calc, /onClick=\{\(\) => setProductShape\(id\)\}/);
  assert.doesNotMatch(calc, /onClick=\{\(\) => \{[^}]*setProductId\(.*shape/s);
  assert.match(calc, /const canCalculate = !!selected && validWeight/);
  assert.match(calc, /금 종류나 무게를 모르겠어요/);
  assert.match(calc, /to="\/gold-exchange\?mode=visit"/);
});

test("등록 금이 없는 신규 회원은 빈 자산 요약 대신 첫 금 계산 경험을 한다", () => {
  assert.match(home, /user\?\.uid && \(dashboard\.itemsLoading \|\| hasMyGold\)/);
  assert.match(home, /user\?\.uid && !dashboard\.itemsLoading && !hasMyGold/);
  assert.match(home, /source="app-first-gold"/);
  assert.match(home, /첫 금 기록/);
});

test("첫 계산 결과는 기록과 교환으로 이어지되 기존 교환 입력 형식을 따른다", () => {
  assert.match(calc, /내 금 기록하기/);
  assert.match(calc, /골드바로 바꾸면\?/);
  assert.match(calc, /params = new URLSearchParams\(\{/);
  for (const name of ["mode", "pid", "type", "w", "unit"]) {
    assert.match(calc, new RegExp(`\\b${name}:`));
  }
  assert.match(calc, /isGoldToGoldInputProduct\(selected\?\.productId\)/);
  assert.match(exchange, /getInitialExchangeProductsFromSearch\(location\.search\)/);
  assert.match(exchangeForm, /export function getInitialExchangeProductsFromSearch/);
});

test("기존 웹 계산기 및 금교환 서버 로직은 수정하지 않는다", () => {
  assert.match(calc, /MY GOLD에 기록하기/);
  assert.match(calc, /MY GOLD는 금 실물을 맡기는 보관 서비스가 아닙니다/);
  assert.equal(pkg.scripts["test:ux-app-first-experience"], "node scripts/test-ux-app-first-experience.mjs");
});
