import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const steps = read('src/components/goldExchange/GoldExchangeSteps.jsx');
const exchange = read('src/pages/GoldExchange.jsx');
const styles = read('src/components/goldExchange/GoldExchange.styles.js');
const pkg = JSON.parse(read('package.json'));
const bar = steps.slice(steps.indexOf('export function BarStep'), steps.indexOf('/* ── Step 3:'));
const reservation = steps.slice(steps.indexOf('export function ReserveStep'), steps.indexOf('/* ── Step 4:'));

test('MY GOLD 불러오기 안내는 계산 단계에만 표시해 뒤 단계에서 반복되지 않는다', () => {
  assert.match(exchange, /fromVault && step === STEP\.CALC/);
  assert.match(exchange, /!showStartMethod && step === STEP\.CALC && \(\s*<EstimateBoundary>/);
  assert.match(exchange, /실제 순도·중량·골드바 제작공임과 교환 조건/);
});

test('골드바 선택은 예상 순금·선택 중량·남는 금·제작 공임을 분리하고, 부족분을 공임과 혼동하지 않는다', () => {
  assert.match(bar, /내 금의 예상 순금량/);
  assert.match(bar, /선택한 골드바 총중량/);
  assert.match(bar, /추가로 필요한 금/);
  assert.match(bar, /예상 남는 순금/);
  assert.match(bar, /예상 제작 공임/);
  assert.match(bar, /추가로 필요한 금의 비용은 위 제작 공임에 포함되지 않습니다/);
  assert.match(bar, /if \(disabled\) return null/);
  assert.match(bar, /골드바로 방문 예약 계속/);
});

test('추가 골드바 자동 계산안은 참고로만 제시하고 별도 공임을 안내한다', () => {
  assert.match(bar, /extraCombo\.items\.map/);
  assert.match(bar, /추가 골드바 조합 보기 \(참고\)/);
  assert.match(bar, /자동 계산한 참고안이며, 실제 제작 여부는 방문 시 결정됩니다/);
  assert.match(bar, /추가 조합의 제작 공임은 위 예상 공임에 포함되지 않으며/);
});

test('예약 화면은 실제 선택·잔여·공임과 요청/확정 차이를 안내하며 서버 처리 로직을 건드리지 않는다', () => {
  assert.match(reservation, /내 금 예상 순금/);
  assert.match(reservation, /선택 후 예상 남는 순금/);
  assert.match(reservation, /추가 필요 \(별도 정산\)/);
  assert.match(reservation, /예상 제작 공임/);
  assert.match(reservation, /MEMBER GOLD는 위 내 금 예상 순금량에 합산되지 않은 별도 혜택/);
  assert.match(reservation, /매장 확인 후 방문 예약이 확정됩니다/);
  assert.match(reservation, /onSubmitReservation\(e\)/);
  assert.doesNotMatch(reservation, /addDoc\(|setDoc\(|updateDoc\(/);
});

test('모바일 카드·진행 단계 글꼴과 요약 배치, 회귀 명령이 등록된다', () => {
  assert.match(styles, /export const ExchangeDecisionSummary/);
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /export const FlowItem/);
  assert.match(styles, /font-size: \.69rem/);
  assert.match(styles, /export const ReservationSummary/);
  assert.equal(pkg.scripts['test:ux-exchange-mobile-finish'], 'node scripts/test-ux-exchange-mobile-finish.mjs');
});

// Step 2 displays grams and don together, emphasizing estimated pure gold before the bar choice.
test('Step 2 최상단에 예상 순금량을 강조하고 g·돈을 병행 표기한다', () => {
  assert.match(steps, /<ExchangePureGoldTotal role="group" aria-label="내 금의 예상 순금량">/);
  assert.match(steps, /<strong>\{fmtG\(totalGrams\)\}g<\/strong>/);
  assert.match(steps, /<span>\(\{fmtD\(totalDon\)\}돈\)<\/span>/);
  assert.match(steps, /1돈 = 3\.75g · 매장 실측 후 최종 확정/);
  assert.match(bar, /fmtD\(selectedTotalG \/ DON_TO_GRAMS\)/);
  assert.match(bar, /fmtD\(\(neededG > 0 \? neededG : remainingG\) \/ DON_TO_GRAMS\)/);
  assert.match(styles, /export const ExchangePureGoldTotal = styled\.div/);
  assert.match(styles, /\.pure-gold-amount strong/);
});
