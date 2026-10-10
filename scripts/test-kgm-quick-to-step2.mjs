import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const quick = read('src/components/gold/QuickGoldValueCalculator.jsx');
const exchange = read('src/pages/GoldExchange.jsx');
const hook = read('src/hooks/useGoldExchangeAutoVault.js');
const form = read('src/lib/goldExchangeForm.js');

test('계산 결과에서 금 종류·중량·단위를 유지하며 빠른 이동만 요청한다', () => {
  assert.match(quick, /quick: "1"/);
  for (const key of ['mode', 'pid', 'type', 'w', 'unit']) assert.match(quick, new RegExp('\\b' + key + ':'));
  assert.match(quick, /isGoldToGoldInputProduct\(selected\?\.productId\)/);
  assert.match(quick, /<NextExchangeLink to=\{exchangeUrl\}>/);
});

test('기존 금교환 입력값 파서와 스텝 1 계산기 검증을 재사용한다', () => {
  assert.match(form, /export function getInitialExchangeProductsFromSearch/);
  assert.match(exchange, /getInitialExchangeProductsFromSearch\(location\.search\)/);
  assert.match(exchange, /requestedEntryMode === "manual" && searchParams\.get\("quick"\) === "1"/);
  assert.match(exchange, /enabled: autoVaultRequested \|\| quickBarsRequested/);
  assert.match(exchange, /allowManualQuick: quickBarsRequested/);
  assert.match(exchange, /const onCalculateCore =/);
});

test('검증 성공 시에만 Step 2로 이동하고 기존 예약 절차는 보호한다', () => {
  assert.match(hook, /entryMode === "vault" \|\| \(entryMode === "manual" && allowManualQuick\)/);
  assert.match(hook, /validateExchangeProductsForCalculation\(products/);
  assert.match(hook, /if \(!validation\.ok\)/);
  assert.match(hook, /applyExchangeFinalWeights\(current, \{ rates, pureGoldBuyPricePerDon \}\)/);
  assert.match(hook, /setCalculated\(true\)/);
  assert.match(hook, /setStep\(STEP\.BARS\)/);
  assert.doesNotMatch(hook, /submitGoldExchangeGroup|setDoc\(|updateDoc\(|addDoc\(/);
});
