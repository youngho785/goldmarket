import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = async path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Premium Trust: 동일한 신뢰 안내를 비회원 웹과 회원 웹·Android 홈에 제공', async () => {
  const [landing, web, android, proof] = await Promise.all([
    read('src/pages/LandingPage.jsx'), read('src/pages/AppHome.jsx'),
    read('src/pages/AndroidHome.jsx'), read('src/components/common/TrustProofBar.jsx'),
  ]);
  for (const source of [landing, web]) assert.match(source, /<TrustProofBar(?: compact)?\s*\/>/);
  assert.match(proof, /부산 원일귀금속 직접 운영/);
  assert.match(proof, /과정은 더 투명하게/);
  assert.match(proof, /실측·동의 후 확정/);
  assert.match(proof, /to="\/stores"/);
});

test('Premium Trust: 신뢰 메시지가 온라인 예상과 매장 확정을 혼동하지 않는다', async () => {
  const [landing, exchange, steps, proof] = await Promise.all([
    read('src/pages/LandingPage.jsx'), read('src/pages/GoldExchange.jsx'),
    read('src/components/goldExchange/GoldExchangeSteps.jsx'),
    read('src/components/common/TrustProofBar.jsx'),
  ]);
  assert.match(landing, /회원가입 없이 먼저 계산/);
  assert.match(exchange, /온라인 화면은 예상값입니다/);
  assert.match(steps, /방문 예약 요청/);
  assert.match(proof, /온라인 계산은 참고값/);
  assert.doesNotMatch(proof, /100% 안전|무조건 보장|정부 인증|공식 금융기관/);
});

test('Premium Trust: 프리미엄 테마·모바일·다크모드 분기 보존', async () => {
  const [theme, global, proof, bottom] = await Promise.all([
    read('src/theme.js'), read('src/styles/GlobalStyle.js'),
    read('src/components/common/TrustProofBar.jsx'),
    read('src/components/common/BottomNav.jsx'),
  ]);
  assert.match(theme, /export const darkTheme/);
  assert.match(theme, /small: "8px"/);
  assert.match(global, /prefers-reduced-motion: reduce/);
  assert.match(global, /color-mix\(in srgb/);
  assert.match(proof, /max-width: 560px/);
  assert.match(bottom, /safe-area-inset-bottom/);
});

test('Premium Trust: 기존 MY GOLD·금교환·MEMBER GOLD 진입 유지', async () => {
  const [web, android, landing, member] = await Promise.all([
    read('src/pages/AppHome.jsx'), read('src/pages/AndroidHome.jsx'),
    read('src/pages/LandingPage.jsx'),
    read('src/components/gold/MemberGoldSummaryCard.jsx'),
  ]);
  assert.match(web, /<AppMyGoldDashboard/);
  assert.match(android, /<AppMyGoldDashboard/);
  assert.match(landing, /<QuickGoldValueCalculator/);
  assert.match(member, /to="\/member-gold"/);
});
