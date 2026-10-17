import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = (path) => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const landing=read('src/pages/LandingPage.jsx');
const calc=read('src/components/gold/QuickGoldValueCalculator.jsx');
const my=read('src/components/gold/AppMyGoldDashboard.jsx');
const prices=read('src/components/gold/AppGoldPriceSummary.jsx');
const market=read('src/components/goldPrice/GoldPrice.styles.js');
const exchange=read('src/components/goldExchange/GoldExchange.styles.js');
const android=read('src/pages/AndroidHome.jsx');
const member=read('src/pages/AppHome.jsx');
const benefits=read('src/pages/WelcomeOnboarding.jsx');
test('공개 홈 사진 대신 실제 계산기가 첫 화면을 차지한다',()=>{
  assert.ok(landing.indexOf('<QuickGoldValueCalculator source="landing"') > landing.indexOf('<Hero aria-labelledby="landing-title">'));
  assert.ok(landing.indexOf('<GoldPriceBoard compact />')>landing.indexOf('<QuickGoldValueCalculator source="landing"'));
  assert.doesNotMatch(landing,/<HeroVisual>/);
  assert.match(landing,/goldVerificationImage/);
  assert.doesNotMatch(landing, /<figcaption>|절차 이해를 돕기 위한 연출 이미지/);
  assert.match(landing, /고객 앞에서 순도·중량 확인/);
});
test('계산기는 독립된 짙은 머리글과 2개의 명확한 숫자 영역을 가진다',()=>{
  assert.match(calc,/linear-gradient\(115deg,#25463A/);
  assert.match(calc,/border-top-width:/);
  assert.match(calc,/appendGuestMyGoldItem/);
});
test('회원 MY GOLD는 진한 보석톤, 시세 요약은 밝은 샴페인톤으로 구분된다',()=>{
  assert.match(my,/radial-gradient\(circle at 95% -10%/);
  assert.match(prices,/border-top:4px solid var\(--gm-gold\)/);
  assert.match(member,/<AppMyGoldDashboard/);
  assert.match(member,/<AppGoldPriceSummary/);
});
test('금시세 상세는 밝은 금빛 정보판, GOLD TO GOLD는 별도 무광 골드바 선택 경험을 제공한다',()=>{
  assert.match(market,/background:linear-gradient\(130deg,#F5EDDB/);
  assert.match(market,/color:#29443C/);
  assert.match(exchange,/export const PremiumDenomTile/);
  assert.match(exchange,/#F2DDA9/);
  assert.match(exchange,/export const ExchangePureGoldTotal/);
});
test('앱은 비회원 계산 우선, 회원 금 관리 우선 유지하고 3단계 보너스는 건드리지 않는다',()=>{
  assert.match(android,/<QuickGoldValueCalculator/);
  assert.match(android,/<AppMyGoldDashboard/);
  assert.match(android,/linear-gradient\(120deg,#213E32,#315949\)/);
  assert.match(benefits,/0\.03g/);
  assert.match(benefits,/퀴즈/);
});
