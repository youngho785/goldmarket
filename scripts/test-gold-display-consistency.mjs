import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const displayFiles = [
  'src/components/gold/QuickGoldValueCalculator.jsx',
  'src/components/gold/MyGoldAlertGoals.jsx',
  'src/components/goldExchange/GoldExchangeSteps.jsx',
  'src/components/admin/StoreMeasurementPanel.jsx',
  'src/components/admin/ExchangeList.jsx',
  'src/pages/MyExchanges.jsx',
  'src/pages/Profile.jsx',
  'src/pages/admin/OverviewDashboard.jsx',
  'src/pages/admin/AdminMembers.jsx',
  'functions/src/rewards/functions.ts',
];

for (const file of displayFiles) {
  const source = read(file);
  assert(!/toFixed\(3\)/.test(source), `${file}: 사용자/관리자 중량 표시에 toFixed(3)이 남아 있습니다.`);
}

const goldExchangeSteps = read('src/components/goldExchange/GoldExchangeSteps.jsx');
assert(!goldExchangeSteps.includes('toFixed3CustomStr'), 'GoldExchangeSteps: 3자리 표시 helper가 남아 있습니다.');
assert(goldExchangeSteps.includes('formatGoldWeightPair(barsPlan.totalGrams || 0)'), 'GoldExchangeSteps: 예약 요약의 g/돈 병행 표기가 필요합니다.');

const quickCalculator = read('src/components/gold/QuickGoldValueCalculator.jsx');
assert(quickCalculator.includes('formatGoldWeightPair(pureGoldG)'), 'QuickGoldValueCalculator: 예상 순금량은 g/돈 2자리 병행 표기를 사용해야 합니다.');

const myExchanges = read('src/pages/MyExchanges.jsx');
assert(!myExchanges.includes('fmtG3'), 'MyExchanges: 3자리 g 포맷이 남아 있습니다.');
assert(/fmtG2\(finalDisplayG\)\}g \(\{fmtD2\(finalDisplayG \/ DON_TO_GRAMS\)\}돈\)/.test(myExchanges), 'MyExchanges: 대표 중량은 g/돈 병행 표기여야 합니다.');

const adminUi = [
  read('src/pages/admin/OverviewDashboard.jsx'),
  read('src/pages/admin/AdminMembers.jsx'),
  read('src/pages/admin/AdminNotifications.jsx'),
].join('\n');
assert(!/(내금고|나의 금고|나의 금 등록|나의 금 미등록)/.test(adminUi), '관리자 UI: MY GOLD 명칭 통일이 깨졌습니다.');

const goldDisplay = read('src/lib/goldDisplay.js');
assert(goldDisplay.includes('minimumFractionDigits: 2'), 'goldDisplay: 최소 소수점 2자리 규칙이 필요합니다.');
assert(goldDisplay.includes('maximumFractionDigits: 2'), 'goldDisplay: 최대 소수점 2자리 규칙이 필요합니다.');
assert(goldDisplay.includes('formatGoldWeightPair'), 'goldDisplay: g/돈 병행 포맷 helper가 필요합니다.');

if (failures.length) {
  console.error('GOLD DISPLAY CONSISTENCY: FAIL');
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  process.exit(1);
}

console.log('GOLD DISPLAY CONSISTENCY: PASS');
console.log('UI gold weights use 2 decimals; g/don paired display and MY GOLD admin naming are guarded.');
