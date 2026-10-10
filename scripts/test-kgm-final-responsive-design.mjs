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
test('Web mobile: calculator prioritized and duplicate trust blocks reduced', () => {
  assert.match(landing, /gap: 11px;[\s\S]{0,80}padding: 17px 13px 16px/);
  assert.match(landing, /<TrustProofBar compact \/>/);
  assert.match(landing, /const FlowStrip = styled\.section/);
  const heroTrustStyles = landing.split('const HeroTrust = styled.div`')[1]?.split('`;')[0] ?? '';
  const journeyNoteStyles = landing.split('const JourneyNote = styled.p`')[1]?.split('`;')[0] ?? '';

  assert.match(heroTrustStyles, /@media\s*\(max-width:\s*700px\)\s*\{\s*display:\s*none;\s*\}/);
  assert.match(journeyNoteStyles, /@media\s*\(max-width:\s*700px\)\s*\{\s*display:\s*none;\s*\}/);
  assert.match(landing, /<QuickGoldValueCalculator/);
  assert.match(landing, /<GoldPriceBoard compact \/>/);
});
test('Android header: use one safe-area and Korean brand mark', () => {
  assert.match(header, /GlobalStyle body already reserves env\(safe-area-inset-top\)/);
  assert.match(header, />\s*금\s*<\/BrandMark>/);
  assert.match(header, /<Header role="banner">/);
});
test('Android visible price references its original registration date', () => {
  assert.match(hook, /const \[marketSourceDate, setMarketSourceDate\] = useState\(""\)/);
  assert.match(hook, /setMarketSourceDate\(normalizeGoldPriceDate\(data\.sourceDate\)\)/);
  assert.match(hook, /import \{ normalizeGoldPriceDate \} from "@\/lib\/goldPriceDate"/);
  assert.match(android, /dashboard\.marketSourceDate === toLocalDateKey\(\)/);
  assert.match(android, /최근 등록 금시세/);
  assert.match(android, /시세 등록일/);
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
