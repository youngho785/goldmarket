import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const web = read('src/pages/LandingPage.jsx');
const memberWeb = read('src/pages/AppHome.jsx');
const android = read('src/pages/AndroidHome.jsx');
const calc = read('src/components/gold/QuickGoldValueCalculator.jsx');
const proof = read('src/components/common/TrustProofBar.jsx');
const board = read('src/components/gold/GoldPriceBoard.jsx');

test('web/mobile: value calculator is first; mobile skips duplicate 4-step cards', () => {
  const hero = web.indexOf('<Hero aria-labelledby=');
  const calculator = web.indexOf('<QuickGoldValueCalculator', hero);
  const price = web.indexOf('<GoldPriceBoard compact />', hero);
  const exchange = web.indexOf('<ExchangeTrust aria-labelledby=', hero);
  const trust = web.indexOf('<TrustProofBar compact />', hero);
  assert.ok(hero !== -1 && hero < calculator && calculator < price && price < exchange && exchange < trust);
  const css = web.split('const FlowStrip = styled.section`')[1]?.split('`;')[0] || '';
  assert.match(css, /@media\s*\(max-width:\s*700px\)[\s\S]*display:\s*none;/);
  assert.match(web, /<FlowStrip aria-label="한국골드마켓 이용 흐름">/);
  assert.match(web, /to="\/my-gold#goldbar-goal"/);
});

test('Android: guest tries goldbar exchange, member retains educational GOLD TO GOLD link', () => {
  assert.match(android, /to=\{hasMyGold \? "\/gold-to-gold" : "\/gold-exchange"\}/);
  assert.match(android, /골드바로 바꾸면 얼마나 될까요/);
  assert.match(android, /<QuickGoldValueCalculator/);
  assert.match(android, /<AppMyGoldDashboard/);
  assert.match(android, /<HomePriorityActions/);
});

test('first experience: actual result can be saved without forced signup', () => {
  assert.match(calc, /saveGuestMyGoldItems\(\[item\]\)/);
  assert.match(calc, /navigate\("\/my-gold"\)/);
  assert.match(calc, /<NextActions>/);
  assert.match(calc, /내 금 기록하기/);
  assert.match(calc, /gold-exchange/);
});

test('member experience: MY GOLD appears before extra actions; hints stay short', () => {
  assert.ok(memberWeb.indexOf('<AppMyGoldDashboard') < memberWeb.indexOf('<MemberGoldSummaryCard'));
  assert.match(memberWeb, /회원 혜택인 MEMBER GOLD는 별도로 관리됩니다/);
  assert.match(memberWeb, /<HomePriorityActions/);
});

test('trust is transparent and timely: stale prices are visually disclosed', () => {
  assert.match(board, /data.sourceDate && data.sourceDate !== todayKey/);
  assert.match(board, /<PriceFreshnessNotice role="status">/);
  assert.match(board, /거래 전 최신 가격을 확인/);
  assert.match(proof, /온라인 계산은 참고값/);
  assert.match(proof, /고객 동의/);
});
