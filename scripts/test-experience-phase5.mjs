import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const landing = read('src/pages/LandingPage.jsx');
const theme = read('src/theme.js');
const android = read('src/pages/AndroidHome.jsx');
const member = read('src/pages/AppHome.jsx');
const calc = read('src/components/gold/QuickGoldValueCalculator.jsx');
const exchange = read('src/components/goldExchange/GoldExchange.styles.js');
const onboarding = read('src/pages/WelcomeOnboarding.jsx');
const manifest = JSON.parse(read('public/manifest.webmanifest'));

test('PC/모바일 공개 홈은 메인 사진 없이 계산기가 시세보다 먼저 나온다', () => {
 const hero = landing.indexOf('<Hero aria-labelledby="landing-title">');
 const calculator = landing.indexOf('<QuickGoldValueCalculator source="landing"', hero);
 const rates = landing.indexOf('<GoldPriceBoard compact />', calculator);
 assert.ok(hero>=0 && calculator>hero && rates>calculator);
 assert.doesNotMatch(landing, /<HeroVisual>/);
 assert.match(landing, /<ServiceLine aria-label="이용 원칙">/);
});
test('메인에서 이미지 제거해도 실측과 공임 안내·매장 링크·후기 유지',()=>{
 assert.match(landing, /src=\{goldVerificationImage\}/);
 assert.doesNotMatch(landing, /<figcaption>|절차 이해를 돕기 위한 연출 이미지/);
 assert.match(landing, /고객 앞에서 순도·중량 확인/);
 assert.match(landing, /고객 앞에서 현장 실측/);
 assert.match(landing, /<VerifiedReviewSection compact/);
 assert.match(landing, /to="\/stores"/);
});
test('브랜드 톤: 공통 테마, 다크 테마, PWA가 일관된다',()=>{
 assert.match(theme, /background: "#FAF9F6"/);
 assert.match(theme, /primary: "#29443C"/);
 assert.match(theme, /export const darkTheme/);
 assert.match(theme, /background: "#111B17"/);
 assert.equal(manifest.theme_color,'#29443C');
});
test('웹 회원·앱 회원·비회원 계산과 금교환 UX 경로 보호',()=>{
 assert.match(member, /<AppMyGoldDashboard/);
 assert.match(member, /<HomePriorityActions/);
 assert.match(android, /<AppMyGoldDashboard/);
 assert.match(android, /<QuickGoldValueCalculator/);
 assert.match(calc, /appendGuestMyGoldItem\(item\)/);
 assert.match(calc, /navigate\("\/my-gold"\)/);
 assert.match(exchange, /export const ExchangePureGoldTotal/);
});
test('온보딩 3단계 보너스와 사용자 동의 요소는 그대로 있다',()=>{
 assert.match(onboarding, /0\.03g/);
 assert.match(onboarding, /0\.01g/);
 assert.match(onboarding, /알림/);
 assert.match(onboarding, /퀴즈/);
});
