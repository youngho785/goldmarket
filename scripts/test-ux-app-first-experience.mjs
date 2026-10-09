import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("src/pages/AndroidHome.jsx");
const calc = read("src/components/gold/QuickGoldValueCalculator.jsx");
const exchange = read("src/pages/GoldExchange.jsx");
const exchangeForm = read("src/lib/goldExchangeForm.js");
const pkg = JSON.parse(read("package.json"));

test("앱의 첫 계산은 금 종류와 중량만 선택하고 별도의 제품 모양 선택을 강요하지 않는다", () => {
  assert.match(home, /\{!user\?\.uid && \(\s*<QuickGoldValueCalculator/);
  assert.match(calc, /const appFirstExperience = source === "app-home" \|\| source === "app-first-gold"/);
  assert.doesNotMatch(calc, /ProductShapeChoices|PRODUCT_SHAPES|productShape/);
  assert.match(calc, /<span>금 종류<\/span>/);
  assert.match(calc, /aria-label="금 종류"/);
  assert.match(calc, /aria-label="내 금 중량"/);
  assert.match(calc, /const canCalculate = !!selected && validWeight/);
});

test("금 종류나 중량을 모를 때는 계산 없이 확인 방법과 매장 실측 예약으로 이동할 수 있다", () => {
  assert.match(calc, /금 종류나 무게를 모르겠어요/);
  assert.match(calc, /to="\/gold-exchange\?mode=visit"/);
  assert.match(calc, /각인 확인 방법/);
  assert.doesNotMatch(calc, /onClick=\{\(\) => setProductShape\(id\)\}/);
});


test("앱 금 종류는 14K·18K 바로 선택, 순금 995/999 세부 선택, 기타 접기로 구분한다", () => {
  assert.match(calc, /getQuickGoldTypeGroups\(orderedProductOptions\)/);
  assert.match(calc, /aria-label="자주 선택하는 금 종류"/);
  assert.match(calc, /aria-label="순금 종류 선택"/);
  assert.match(calc, /99\.5% \(995\)/);
  assert.match(calc, /99\.9% \(999\)/);
  assert.match(calc, /다른 금 종류 보기/);
  assert.match(calc, /aria-expanded=\{moreTypesOpen \|\| hasMoreSelection\}/);
  assert.match(calc, /role="group" aria-label="자주 선택하는 금 종류"/);
});

test("순금을 눌렀다는 이유만으로 995 또는 999 값을 자동 확정하지 않는다", () => {
  assert.match(calc, /if \(!hasPureSelection\) setProductId\(""\);/);
  assert.match(calc, /onClick=\{openPureTypes\}/);
  assert.match(calc, /aria-pressed=\{productId === option\.productId\}/);
  assert.match(calc, /const canCalculate = !!selected && validWeight/);
  assert.match(calc, /onClick=\{\(\) => chooseQuickType\(option\.productId\)\}/);
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
