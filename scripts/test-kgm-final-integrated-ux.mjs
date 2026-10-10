import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = (path) => readFileSync(path, 'utf8');
const home = file('src/pages/AndroidHome.jsx');
const calculator = file('src/components/gold/QuickGoldValueCalculator.jsx');
const price = file('src/pages/GoldPrice.jsx');
const nativePrices = file('src/components/goldPrice/NativeGoldPriceOverview.jsx');
const priceStyles = file('src/components/goldPrice/GoldPrice.styles.js');
const steps = file('src/components/goldExchange/GoldExchangeSteps.jsx');
const header = file('src/components/common/AndroidAppHeader.jsx');
const optional = file('src/components/home/HomeOptionalDetails.jsx');

test('앱 첫 계산 카드만 간결화하고 기존 g/돈 입력 의미를 유지한다', () => {
  assert.match(calculator, /\$nativeFirst=\{compact && appFirstExperience\}/);
  assert.match(calculator, /QuickTypeHeading/);
  assert.match(calculator, /compact && !appFirstExperience/);
  assert.match(calculator, /nextUnit === weightUnit/);
  assert.match(calculator, /setWeightUnit\(nextUnit\)/);
  assert.match(calculator, /weightUnit === "don" \? parsed \* DON_TO_GRAMS : parsed/);
  assert.match(calculator, /aria-pressed=\{productId === option.productId\}/);
});

test('홈 금 가치 계산·오늘 시세·GOLD TO GOLD 스토리 동선을 유지한다', () => {
  assert.match(home, /source="app-home"/);
  assert.match(home, /<PriceCard to="\/gold-price"/);
  assert.match(home, /<GoldToGoldStory\s+to="\/gold-to-gold"/);
});

test('회원 홈에서 교환 보장이 아닌 기록 기준 순금과 목표를 표시한다', () => {
  assert.match(optional, /summary = "골드바 목표와 교환 가능량 자세히 보기"/);
  assert.match(home, /summary=\{`기록한 금의 예상 순금 \$\{formatGoldWeightPair\(/);
  assert.match(home, /dashboard\.ratesReady/);
  assert.doesNotMatch(home, /골드바 교환 가능합니다/);
});

test('네이티브 금시세 비교표·톡톡이·골드바를 함께 제공한다', () => {
  assert.match(nativePrices, /<CompactMarket/);
  assert.match(price, /size=\{isNative \? 37 : 54\}/);
  assert.match(price, /ariaLabel="톡톡이 금빛 효과 보기"/);
  assert.match(price, /<GoldVisual \$native=\{isNative\}>/);
  assert.match(price, /<GoldBar aria-hidden>/);
  assert.match(priceStyles, /\$native\s*\}\s*\)\s*=>|\$native/);
  assert.match(price, /goldData\?\.sourceDate/);
  assert.doesNotMatch(price, /sourceDate \|\| getKoreaTodayDateKey/);
});

test('앱 금시세는 가입 유도 문구만 제거하고 퀵퀴즈와 회원 알림 설정은 유지한다', () => {
  assert.doesNotMatch(nativePrices, /회원 혜택 알아보기/);
  assert.match(nativePrices, /최대 순금 0\.03g/);
  assert.match(nativePrices, /to=\{isMember \? "\/member-gold" : "\/quiz\/gold-bonus"\}/);
  assert.match(nativePrices, /isMember && <Link to="\/settings">금시세 알림 설정<\/Link>/);
  assert.match(price, /오늘 날짜 \$\{formatDateKey\(todayKey\)\}/);
  assert.match(price, /최근 공개 시세/);
});

test('금교환 Step 2는 잔여 참고 조합을 조건부로 표시하고 공임을 분리한다', () => {
  assert.match(steps, /const remainingCombo = remainingG > 0 \? breakdownByDenoms\(remainingG\)/);
  assert.match(steps, /neededG === 0 && remainingCombo\.items\.length > 0/);
  assert.match(steps, /추가 골드바의 제작 가능 여부·공임/);
  assert.match(steps, /getGoldBarFeeEstimate\(/);
  assert.match(steps, /골드바 선택/);
  assert.match(steps, /<ExchangePureGoldTotal/);
});

test('햄버거 메뉴의 금교환 계산 및 브랜드 이야기와 접근성 유지', () => {
  assert.match(header, /padding-top: 0; \/\* GlobalStyle body already reserves env/);
  assert.match(header, /aria-label="한국골드마켓 전체 메뉴"/);
  assert.match(header, /to="\/gold-to-gold"/);
  assert.match(header, /to="\/gold-exchange"/);
  assert.match(header, /to="\/quiz\/gold-bonus"/);
  assert.match(header, /onPointerDown=\{handleDrawerPointerDown\}/);
});
