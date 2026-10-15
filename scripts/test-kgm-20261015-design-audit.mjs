// Self-contained verification for the 2026-10-15 KGM design snapshot.
// This checks critical UI contracts; it does not replace production build,
// Android tests, Firebase emulators, or human visual review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const landing = read('src/pages/LandingPage.jsx');
const app = read('src/pages/AndroidHome.jsx');
const price = read('src/pages/GoldPrice.jsx');
const priceBoard = read('src/components/gold/GoldPriceBoard.jsx');
const exchange = read('src/components/goldExchange/GoldExchangeSteps.jsx');
const rates = JSON.parse(read('functions/src/goldRates.defaults.json'));
const gateway = read('functions/src/index.ts');
const homeActions = read('src/components/home/HomePriorityActions.jsx');

test('웹 홈: 계산, 금시세, 교환으로 진입하는 경로가 모두 있다', () => {
  assert.match(landing, /내 금 가치 확인하기/);
  assert.match(landing, /id="landing-calculator"/);
  assert.match(landing, /<QuickGoldValueCalculator/);
  assert.match(landing, /<GoldPriceBoard compact \/>/);
  assert.match(landing, /to="\/gold-price"/);
  assert.match(landing, /to="\/gold-exchange"/);
});

test('웹 홈: 순금 실측·동의와 MY GOLD의 성격을 명시한다', () => {
  assert.match(landing, /고객 앞에서 순도·중량 확인/);
  assert.match(landing, /비용 안내와 고객 동의 후 교환/);
  assert.match(landing, /보관하거나 예치받는 서비스가 아닙니다/);
  assert.match(landing, /오늘, 금의 기준/);
});

test('웹 홈: 실제로 참조하는 에디토리얼 이미지가 포함되어 있다', () => {
  assert.match(landing, /\/images\/kgm-editorial-gold\.webp/);
  assert.ok(existsSync(new URL('../public/images/kgm-editorial-gold.webp', import.meta.url)));
});

test('앱 홈: 비회원 계산과 회원 MY GOLD 우선 진입', () => {
  assert.match(app, /<AppMyGoldDashboard/);
  assert.match(app, /<QuickGoldValueCalculator/);
  assert.match(app, /source="app-home"/);
  assert.match(app, /<PriceCard to="\/gold-price"/);
  assert.match(app, /to="\/my-exchanges"/);
  assert.match(app, /to="\/gold-to-gold"/);
  assert.match(homeActions, /\/my-gold\/items\?add=1/);
});

test('금시세: 사용자 조회 날짜 표시, 공개 시세와 정산 금액 분리', () => {
  assert.match(price, /getGoldPriceDatePresentation/);
  assert.match(priceBoard, /getGoldPriceDatePresentation/);
  assert.match(price, /실제 거래/);
  assert.match(price, /1돈\(3\.75g\)/);
});

test('금교환: 부족 순금량·제작 공임·실측 확정 안내가 있다', () => {
  assert.match(exchange, /추가로 필요한 순금/);
  assert.match(exchange, /예상 제작 공임/);
  assert.match(exchange, /부족한 순금의 비용과 추가 골드바 공임은 별도입니다/);
  assert.match(exchange, /실측과 고객 동의 후 확정/);
  assert.match(exchange, /방문 예약 요청/);
});

test('예약: 선택만으로 시간 선점 또는 최종 확정하지 않는다', () => {
  assert.match(exchange, /아직 예약 확정·시간 선점 상태는 아닙니다/);
  assert.match(exchange, /예약 확인 대기/);
  assert.match(exchange, /인증 중에도 시간은 선점되지 않으므로/);
});

test('금 환산: 1돈 3.75g 및 품목 기본설정 유지', () => {
  assert.equal(rates.donToGrams, 3.75);
  assert.ok(rates.products && Object.keys(rates.products).length >= 5);
  assert.ok(read('src/lib/goldRates.js').includes('roundTo3Custom'));
});

test('운영용 함수: 예약·보너스·금시세 함수 연결 유지', () => {
  assert.match(gateway, /requestGoldExchangeGroup/);
  assert.match(gateway, /bonusRequestGoldUsage/);
  assert.match(gateway, /saveGoldPriceSettings/);
});
