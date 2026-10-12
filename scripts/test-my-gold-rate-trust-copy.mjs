import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (name) => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const home = read('src/components/gold/AppMyGoldDashboard.jsx');
const vault = read('src/pages/MyGoldVault.jsx');

test('홈에서는 시세 등록일을 노출하지 않고 비교 기준을 구분한다', () => {
  assert.doesNotMatch(home, /시세 등록일/);
  assert.match(home, /이전 시세 대비 \{formatSignedWon\(totals\.amount\)\}/);
  assert.doesNotMatch(home, /오늘 \{formatSignedWon\(totals\.amount\)\}/);
});
test('MY GOLD 상세에서는 전일 변화라고 단정하지 않는다', () => {
  assert.match(vault, /이전 시세 대비 \$\{formatSignedWon\(currentChange\.amount\)\}/);
  assert.doesNotMatch(vault, /어제보다 \$\{formatSignedWon/);
  assert.doesNotMatch(vault, /전일 비교 준비 중/);
  assert.doesNotMatch(vault, /시세 등록일/);
});
test('고객의 금 기록과 회원혜택은 합산하지 않는다', () => {
  assert.match(home, /dashboard\.summary\.estimatedValueWon/);
  assert.match(vault, /const vaultValueWon = Number\(activeSummary\.estimatedValueWon \|\| 0\)/);
  assert.doesNotMatch(home, /bonusGoldG|bonusGoldMilliGrams|bonusValueWon/);
});
test('기존 예상 참고가치 및 실측 고지를 유지한다', () => {
  assert.match(home, /기록한 금의 예상 참고가치 · 실제 금액은 실측 후 확정/);
  assert.match(vault, /실제 금액은 매장 실측 후 확정됩니다/);
});
