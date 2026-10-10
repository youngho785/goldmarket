import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getGoldBarVisualWidth } from '../src/components/goldExchange/goldBarVisual.js';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const steps = read('src/components/goldExchange/GoldExchangeSteps.jsx');
const styles = read('src/components/goldExchange/GoldExchange.styles.js');
const prices = read('src/lib/goldBarFee.js');
const ui = read('src/components/goldExchange/goldExchangeUi.js');

test('중량별 시각 차이는 UI 전용이며 계산에 사용되지 않는다', () => {
  assert.ok(getGoldBarVisualWidth(1) < getGoldBarVisualWidth(5));
  assert.ok(getGoldBarVisualWidth(5) < getGoldBarVisualWidth(50));
  assert.ok(getGoldBarVisualWidth(50) <= getGoldBarVisualWidth(500));
  assert.equal(getGoldBarVisualWidth(0), 58);
  assert.ok(getGoldBarVisualWidth(500) <= 88);
  assert.match(steps, /getGoldBarVisualWidth\(d\.grams\)/);
  assert.match(steps, /denom-ingot/);
});
test('추천/부족분/선택 상태와 접근성은 보존된다', () => {
  assert.match(steps, /<PremiumDenomTile/);
  assert.match(steps, /role="radio"/);
  assert.match(steps, /aria-checked=\{active\}/);
  assert.match(steps, /현재 금 추천/);
  assert.match(steps, /g 더 필요<\/AIBadge>/);
  assert.match(steps, /selected-chip/);
  assert.match(steps, /골드바 모형은 규격 선택을 돕는 예시/);
});
test('제작공임은 보조 영역으로 축소하되 사용자에게 숨기지 않는다', () => {
  assert.match(steps, /<ExchangeFeeNote role="group" aria-label="예상 제작 공임">/);
  assert.match(steps, /<strong>\{feeLabel\}<\/strong>/);
  assert.match(steps, /전체 공임표 보기/);
  assert.match(steps, /추가로 필요한 금의 비용은 위 제작 공임에 포함되지 않습니다/);
  assert.match(styles, /export const ExchangeFeeNote/);
});
test('골드바 미리보기는 Android와 웹에 모두 남는다', () => {
  assert.match(steps, /<MiniGoldBar aria-hidden="true">/);
  assert.match(styles, /export const PremiumDenomTile/);
  assert.match(styles, /> :last-child \{ display: grid; \}/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
test('기존 금 환산·공임 모듈·금교환 수량 제한은 그대로 연결된다', () => {
  assert.match(steps, /getGoldBarFeeEstimate/);
  assert.match(steps, /const selectedTotalG = roundTo3Custom\(selectedBar\.grams \* safeQty\)/);
  assert.match(steps, /const neededG = roundTo3Custom/);
  assert.match(steps, /const remainingG = roundTo3Custom/);
  assert.match(steps, /const maxSelectableQty = Math\.max\(1, Math\.ceil/);
  assert.match(steps, /선택한 골드바로 방문 예약 계속/);
  assert.match(prices, /export function getGoldBarFee/);
  assert.match(ui, /export const BAR_GROUPS =/);
});
