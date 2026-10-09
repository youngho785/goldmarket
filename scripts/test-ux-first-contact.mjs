import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const calc = read("src/components/gold/QuickGoldValueCalculator.jsx");
const android = read("src/pages/AndroidHome.jsx");
const landing = read("src/pages/LandingPage.jsx");
const analytics = read("src/analytics/productAnalytics.js");

test("first-time calculator offers a no-extra-click path and an accessible unknown-information path", () => {
  assert.match(calc, /useState\("known"\)/);
  assert.match(calc, /aria-pressed=\{entryMode === "known"\}/);
  assert.match(calc, /aria-pressed=\{entryMode === "unknown"\}/);
  assert.match(calc, /네, 알고 있어요/);
  assert.match(calc, /잘 모르겠어요/);
  assert.match(calc, /<Fields>/);
});

test("unknown-information users can book an in-store measurement without inventing weights or purities", () => {
  assert.match(calc, /to="\/gold-exchange\?mode=visit"/);
  assert.match(calc, /사진만으로 무게를 알 수는 없습니다/);
  assert.match(calc, /각인은 참고용이며 실제 순도를 확정하지 않습니다/);
  assert.doesNotMatch(calc, /setWeightValue\("[0-9]/);
});

test("guest Android home shows direct calculator, rather than duplicate MY GOLD marketing card", () => {
  assert.match(android, /\{user\?\.uid && \(dashboard\.itemsLoading \|\| hasMyGold\) && \(\s*<AppMyGoldDashboard/);
  assert.match(android, /\{!user\?\.uid && \(\s*<QuickGoldValueCalculator/);
  assert.match(android, /회원가입 없이 금 가치 확인/);
});

test("web landing describes an unknown-purity route and doesn't require signup for a price check", () => {
  assert.match(landing, /잘 모르셔도 확인 방법부터 안내해 드립니다/);
  assert.match(landing, /회원가입 없이 먼저 계산/);
});

test("new measurement-help analytics sends source only, not weight, price, or personal data", () => {
  assert.match(analytics, /quick_calc_help_opened:[\s\S]*source: new Set/);
  assert.match(analytics, /quick_calc_store_visit_clicked:[\s\S]*source: new Set/);
  assert.match(calc, /quick_calc_help_opened/);
  assert.match(calc, /quick_calc_store_visit_clicked/);
});
