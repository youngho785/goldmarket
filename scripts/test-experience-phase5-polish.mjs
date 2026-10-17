import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (name) => readFileSync(resolve(root, name), 'utf8');

const landing = read('src/pages/LandingPage.jsx');
const prices = read('src/components/gold/GoldPriceBoard.jsx');
const myGoldStyle = read('src/components/myGoldVault/MyGoldVault.styles.js');

test('모바일 공개 홈은 브랜드 장문보다 계산을 우선한다', () => {
  assert.match(landing, /mobile-headline\">내 금, 지금 얼마일까요\?/);
  assert.match(landing, /@media \(max-width: 850px\)[\s\S]*?\.desktop-headline, \.hero-eyebrow, \.hero-description, \.hero-actions, \.hero-foot \{ display: none; \}/);
  assert.match(landing, /\.mobile-headline \{ display: block; \}/);
  const hero = landing.slice(landing.indexOf('<Hero aria-labelledby='), landing.indexOf('</Hero>'));
  assert.ok(hero.indexOf('<HeroCopy>') < hero.indexOf('<CalculatorSection'));
  assert.ok(hero.indexOf('QuickGoldValueCalculator') < hero.indexOf('<MobileAfterCalculator>'));
  assert.match(hero, /id="landing-calculator"/);
});

test('데스크톱 메인 메시지는 그대로 두고 제목과 여백만 절제한다', () => {
  assert.match(landing, /desktop-headline\">간직한 금의 가치/);
  assert.match(landing, /font-size: clamp\(38px, 4\.3vw, 60px\)/);
  assert.match(landing, /min-height: min\(650px, calc\(100svh - 145px\)\)/);
});

test('GOLD TO GOLD의 소개 및 계산 링크는 유지한다', () => {
  assert.match(landing, /to="\/gold-to-gold">GOLD TO GOLD 알아보기/g);
  assert.match(landing, /<Exchange aria-labelledby="exchange-trust-title">/);
  assert.match(landing, /to="\/gold-exchange">예상 교환 확인/);
  assert.match(landing, /to="\/goldbar-fee">제작 공임 보기/);
});

test('MY GOLD 비회원 기록이 기기에만 저장된다는 경고를 읽기 쉽게 표시한다', () => {
  assert.match(myGoldStyle, /export const GuestModeNote = styled\.p`/);
  const declaration = myGoldStyle.split('export const GuestModeNote = styled.p`')[1].split('`;')[0];
  assert.match(declaration, /font-size: \.79rem/);
  assert.match(declaration, /text-align: left/);
  assert.match(read('src/pages/MyGoldVault.jsx'), /가입 전 기록은 현재 기기에만 보관됩니다/);
});

test('공개 금시세의 원화 숫자를 강화하되 모바일 3열 표와 날짜 정책을 보존한다', () => {
  assert.match(prices, /font-size:clamp\(16px,1\.8vw,24px\); font-weight:750/);
  assert.match(prices, /@media\(max-width:520px\) \{ font-size:15px; \}/);
  assert.match(prices, /grid-template-columns:60px minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(prices, /getGoldPriceDatePresentation/);
});
