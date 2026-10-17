import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const home = read("src/pages/AppHome.jsx");
const dashboard = read("src/components/gold/AppMyGoldDashboard.jsx");
const journey = read("src/components/gold/AppGoldJourney.jsx");
const steps = read("src/components/goldExchange/GoldExchangeSteps.jsx");
const bars = steps.split("export function BarStep(")[1]?.split("/* ── Step 3:")[0] || "";

test("금 기록이 없는 PC 회원 홈은 하나의 첫 기록 카드만 보여준다", () => {
  assert.match(home, /<AppMyGoldDashboard/);
  assert.doesNotMatch(home, /<FirstGoldStart/);
  assert.match(dashboard, /첫 금 기록/);
  assert.match(dashboard, /먼저 금 가치 계산하기/);
});

test("골드바 선택 직후 한 번의 예상 결과를 표시한다", () => {
  assert.ok(bars.indexOf('<SubTitle>골드바 규격 선택') < bars.indexOf('id="bar-quantity"'));
  assert.ok(bars.indexOf('id="bar-quantity"') < bars.indexOf('<ExchangeOutcome'));
  assert.equal((bars.match(/<ExchangeOutcome/g) || []).length, 1);
  assert.equal((bars.match(/<ExchangeDecisionSummary/g) || []).length, 1);
  assert.match(bars, /aria-live="polite"/);
  assert.match(bars, /선택한 골드바 총중량/);
  assert.doesNotMatch(bars, /safeQty > 1/);
});

test("공임·부족량·순금 환산 계산을 변경하지 않는다", () => {
  assert.match(bars, /getGoldBarFeeEstimate\(\{[\s\S]*qty: safeQty/);
  assert.match(bars, /Math\.max\(0, selectedTotalG - totalGrams\)/);
  assert.match(bars, /Math\.max\(0, totalGrams - selectedTotalG\)/);
  assert.match(bars, /부족한 순금의 비용은 제작 공임과 별도입니다/);
  assert.match(bars, /매장에서 확인하고 동의한 뒤 확정해요/);
});

test("MY GOLD 목표는 진행률과 실제 교환 이동을 제공한다", () => {
  assert.match(journey, /role="progressbar"/);
  assert.match(journey, /aria-valuenow=\{Math\.round\(progress\)\}/);
  assert.match(journey, /<ExchangeNow/);
  assert.match(journey, /source: "my-gold", vaultProducts/);
  assert.match(journey, /prefers-reduced-motion: reduce/);
});
