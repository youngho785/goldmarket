import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const read = (name) => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const home = read('src/components/gold/AppMyGoldDashboard.jsx');
const vault = read('src/pages/MyGoldVault.jsx');

// Execute the actual component's comparison expressions, rather than requiring
// an old literal JSX sentence or duplicating its decision logic in the test.
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const ts = require('typescript');
const ast = ts.createSourceFile('AppMyGoldDashboard.jsx', home, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
function initializer(name) {
  const matches = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name && node.initializer) {
      matches.push(node.initializer.getText(ast));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(matches.length, 1, `${name}: expected one comparison declaration`);
  return matches[0];
}
const comparisonCode = `const hasWeeklyComparison = ${initializer('hasWeeklyComparison')};
  const displayedComparison = ${initializer('displayedComparison')}; displayedComparison;`;
const chooseComparison = (ratesReady, weeklyTrend, totals) =>
  runInNewContext(comparisonCode, { ratesReady, weeklyTrend, totals }, { timeout: 1000 });
const previous = { direction: 'down', amount: -10000, percent: -2 };
const weekly = { hasReference: true, direction: 'up', amount: 30000, percent: 6 };

test('홈에서는 시세 등록일을 노출하지 않고 비교 기준을 구분한다', () => {
  assert.doesNotMatch(home, /시세 등록일/);
  assert.match(home, /\{displayedComparison\.label\}\s*\{formatSignedWon\(displayedComparison\.amount\)\}/);
  assert.match(home, /formatSignedPercent\(displayedComparison\.percent\)/);
  assert.match(home, /\$direction=\{displayedComparison\.direction\}/);
  assert.match(home, /dashboard\.publicPriceEnabled && displayedComparison/);
  assert.doesNotMatch(home, /오늘 \{formatSignedWon\(totals\.amount\)\}/);
});

test('7일 기준 시세가 있으면 최근 7일 문구와 해당 금액·비율을 함께 사용한다', () => {
  assert.deepEqual({ ...chooseComparison(true, weekly, previous) }, {
    label: '최근 7일', direction: 'up', amount: 30000, percent: 6,
  });
});

test('7일 기준 시세가 없으면 이전 시세 문구와 해당 금액·비율로 전환한다', () => {
  for (const unavailable of [undefined, null, { ...weekly, hasReference: false }]) {
    assert.deepEqual({ ...chooseComparison(true, unavailable, previous) }, {
      label: '이전 시세 대비', ...previous,
    });
  }
});

test('환산 기준 확인 중에는 어느 비교 수치도 표시하지 않는다', () => {
  assert.equal(chooseComparison(false, weekly, previous), null);
});

test('가격 변화가 0인 경우에도 유효한 비교는 유지한다', () => {
  const flat = { direction: 'flat', amount: 0, percent: 0 };
  assert.deepEqual({ ...chooseComparison(true, { ...flat, hasReference: true }, previous) }, {
    label: '최근 7일', ...flat,
  });
  assert.deepEqual({ ...chooseComparison(true, null, flat) }, {
    label: '이전 시세 대비', ...flat,
  });
});

test('7일 기준도 유효한 이전 비교율도 없으면 비교를 만들어내지 않는다', () => {
  for (const percent of [undefined, null, NaN, Infinity, -Infinity]) {
    assert.equal(chooseComparison(true, null, { ...previous, percent }), null);
  }
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
