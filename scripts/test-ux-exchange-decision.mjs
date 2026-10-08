import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const steps = read("src/components/goldExchange/GoldExchangeSteps.jsx");
const styles = read("src/components/goldExchange/GoldExchange.styles.js");
const myGold = read("src/pages/MyGoldVault.jsx");
const pkg = JSON.parse(read("package.json"));

const section = (begin, end) => steps.slice(steps.indexOf(begin), steps.indexOf(end));

test("시작 화면은 직접 계산→정보 모름→기록 불러오기 순서로 제공한다", () => {
  const flow = section("export function StartMethodScreen", "/* ── Step 1:");
  assert.ok(flow.indexOf('onChoose("manual")') < flow.indexOf('onChoose("visit")'));
  assert.ok(flow.indexOf('onChoose("visit")') < flow.indexOf('onChoose("vault")'));
  assert.match(flow, /금 종류와 중량만 입력/);
  assert.match(flow, /순도나 무게를 몰라도 괜찮습니다/);
  assert.match(flow, /다시 입력하지 않고 예상 교환량/);
  assert.doesNotMatch(flow, /openGate|navigate|setDoc|updateDoc/);
});

test("골드바 결과의 핵심 세 항목을 규격 선택·상세 표보다 먼저 보여준다", () => {
  const bar = section("export function BarStep", "/* ── Step 3:");
  const summaryAt = bar.indexOf('<ExchangeDecisionSummary');
  assert.ok(summaryAt > bar.indexOf('<ExchangeOutcome'));
  assert.ok(summaryAt < bar.indexOf('<details'));
  assert.ok(summaryAt < bar.indexOf('<SubTitle>골드바 규격 선택'));
  for (const copy of ["선택한 골드바 총중량", "추가로 필요한 금", "예상 남는 순금", "예상 제작 공임"]) {
    assert.ok(bar.includes(copy), `${copy} missing`);
  }
});

test("예상 부족·잔여와 공임은 기존 계산식을 재사용하며 음수로 표시하지 않는다", () => {
  const bar = section("export function BarStep", "/* ── Step 3:");
  assert.match(bar, /getGoldBarFeeEstimate\(\{[\s\S]*qty: safeQty/);
  assert.match(bar, /Math\.max\(0, selectedTotalG - totalGrams\)/);
  assert.match(bar, /Math\.max\(0, totalGrams - selectedTotalG\)/);
  assert.match(bar, /feeEstimate\.totalFee == null/);
  assert.match(bar, /formatGoldBarFee\(feeEstimate\.totalFee\)/);
  assert.match(bar, /매장에서 고객과 확인하고 동의 후 확정/);
  assert.doesNotMatch(bar, /updateDoc|addDoc|runTransaction|setDoc/);
});

test("첫 금교환은 먼저 결과를 확인하고, 기록은 선택적으로 제안한다", () => {
  const bar = section("export function BarStep", "/* ── Step 3:");
  assert.match(bar, /선택한 골드바로 방문 예약 계속/);
  assert.match(bar, /지금 교환하지 않고 내 금 기록하기/);
  assert.ok(bar.indexOf('onGoReserve}>선택한 골드바로 방문 예약') < bar.lastIndexOf('onSaveToMyGold}>지금 교환하지 않고'));
});

test("MY GOLD는 한 번 기록의 편리함과 정보 미확인 고객의 현장 확인 경로를 보여준다", () => {
  assert.match(myGold, /한 번 기록하면 다음에 다시 입력하지 않고/);
  assert.match(myGold, /to="\/gold-exchange\?mode=visit"/);
});

test("접근성 기본 속성과 신규 회귀 명령을 등록한다", () => {
  assert.match(steps, /aria-label="교환 예상 핵심 요약"/);
  assert.match(styles, /export const ExchangeDecisionSummary/);
  assert.match(styles, /export const ExchangeDecisionFact/);
  assert.match(styles, /&:focus-visible/);
  assert.equal(pkg.scripts["test:ux-exchange-decision"], "node scripts/test-ux-exchange-decision.mjs");
});
