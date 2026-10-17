import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const proof = read('src/components/common/TrustProofBar.jsx');
const landing = read('src/pages/LandingPage.jsx');
const header = read('src/components/common/AndroidAppHeader.jsx');
const android = read('src/pages/AndroidHome.jsx');
const hook = read('src/hooks/useGoldVaultDashboard.js');

test('Trust: short mobile summary and opt-in detailed steps', () => {
  assert.match(proof, /const MobileSteps = styled\.details/);
  assert.match(proof, /<MobileSteps>/);
  assert.match(proof, /<summary>금교환 절차 자세히 보기<\/summary>/);
  assert.match(proof, /온라인 계산은 참고값입니다/);
  assert.match(proof, /매장 실측·비용 안내와 고객 동의 후 확정됩니다/);
  assert.match(proof, /@media \(max-width: 620px\) \{ display: none/);
  assert.match(proof, /to="\/stores"/);
});
test('Web mobile: calculator entry is direct and trust copy is not repeated in multiple bars', () => {
  assert.match(landing, /<CalculatorSection aria-label="내 금 가치 바로 계산하기">/);
  assert.match(landing, /id="landing-calculator"/);
  assert.match(landing, /<QuickGoldValueCalculator\s+source="landing"/);
  assert.match(landing, /<ServiceLine aria-label="이용 원칙">/);
  assert.match(landing, /고객 앞에서 순도·중량 확인/);
  assert.match(landing, /비용 안내와 고객 동의 후 교환/);
  assert.doesNotMatch(landing, /<TrustProofBar(?: compact)?\s*\/>/);
  assert.match(landing, /@media \(max-width: 850px\) \{ grid-template-columns: 1fr/);
  assert.match(landing, /<GoldPriceBoard compact \/>/);
});
test('Android header: body handles status bar inset, header exposes accessible brand link', () => {
  const global = read('src/styles/GlobalStyle.js');
  assert.match(global, /padding-top: env\(safe-area-inset-top\)/);
  assert.match(global, /height: env\(safe-area-inset-top, 0px\)/);
  assert.match(header, /const Header = styled.header`[\s\S]*?padding-top:0;/);
  assert.match(header, /<BrandMark[\s\S]{0,90}to="\/"/);
  assert.match(header, /aria-label="한국골드마켓 홈"/);
  assert.match(header, />\s*금\s*<\/BrandMark>/);
  assert.match(header, /<Header role="banner">/);
});
test('Android gold price uses Korean today label and retains previous-day reference', () => {
  assert.match(hook, /const \[marketSourceDate, setMarketSourceDate\] = useState\(""\)/);
  assert.match(hook, /setMarketSourceDate\(normalizeGoldPriceDate\(data\.sourceDate\)\)/);
  assert.match(android, /getGoldPriceDatePresentation\(todayKey, dashboard\.marketSourceDate, true\)/);
  assert.doesNotMatch(android, /최근 등록 금시세|시세 등록일/);
  assert.match(android, /pureGoldBuyPerDon/);
});
test('Main app journeys remain intact', () => {
  assert.match(android, /<QuickGoldValueCalculator/);
  assert.match(android, /<AppMyGoldDashboard/);
  assert.match(android, /<HomePriorityActions/);
  assert.match(android, /<MemberGoldSummaryCard/);
  assert.doesNotMatch(android, /<TrustProofBar compact \/>/);
  assert.match(landing, /to="\/gold-exchange"/);
});
