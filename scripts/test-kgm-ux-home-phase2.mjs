import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const web = read('src/pages/LandingPage.jsx');
const native = read('src/pages/AndroidHome.jsx');
const home = read('src/pages/AppHome.jsx');
const calculator = read('src/components/gold/QuickGoldValueCalculator.jsx');

test('홈 계산기의 미리보기는 기존 데이터 계산 함수를 재사용', () => {
  assert.match(web, /onPreviewChange=\{setGoldPreview\}/);
  assert.match(web, /\{goldPreview && <SaveNote aria-live="polite">/);
  assert.match(web, /가입 전에는 이 기기에만 저장돼요/);
  assert.match(calculator, /onPreviewChange\(\{/);
  assert.match(calculator, /appendGuestMyGoldItem\(item\)/);
});

test('운영 홈 정밀저울 이미지는 실제 포함된 자산 사용', () => {
  assert.match(web, /src=\{goldVerificationImage\}/);
  assert.doesNotMatch(web, /gold-verification\.jpg/);
});

test('웹 신규회원은 중복 카드 없이 MY GOLD 안에서 기록 또는 계산 선택', () => {
  const dashboard = read('src/components/gold/AppMyGoldDashboard.jsx');
  assert.doesNotMatch(home, /<FirstGoldStart/);
  assert.match(home, /<AppMyGoldDashboard/);
  assert.match(dashboard, /첫 금 기록/);
  assert.match(dashboard, /먼저 금 가치 계산하기/);
  assert.match(dashboard, /to="\/gold-value"/);
  assert.match(home, /\{hasMyGold && <HomePriorityActions \/>\}/);
});

test('Android 새 회원에게 첫 기록과 매장 실측 대안 제공', () => {
  assert.match(native, /!dashboard\.itemsLoading && !hasMyGold/);
  assert.match(native, /aria-label="첫 금 기록 다른 방법"/);
  assert.match(native, /to="\/my-gold\/items\?add=1"/);
  assert.match(native, /to="\/gold-exchange\?mode=visit"/);
  assert.match(native, /<MemberGoldSummaryCard uid=\{user\?\.uid\} compact \/>/);
});
