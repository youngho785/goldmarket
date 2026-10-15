import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const [steps, page, intro, release] = await Promise.all([
  read('src/components/goldExchange/GoldExchangeSteps.jsx'),
  read('src/pages/GoldExchange.jsx'),
  read('src/pages/GoldToGoldIntro.jsx'),
  read('scripts/test-release-simple.mjs'),
]);

// Text-focused regression tests: business rules and the reservation callable remain unchanged.
test('골드바 선택에서 부족한 중량을 순금으로 명확하게 표시한다', () => {
  assert.match(steps, /neededG > 0 \? "추가로 필요한 순금" : "예상 남는 순금"/);
  assert.match(steps, /neededG > 0 && " 부족한 순금의 비용은 제작 공임과 별도입니다\."/);
  assert.match(steps, /추가 골드바 제작 공임도 별도입니다/);
});

test('예약 단계는 부족분 비용·공임과 실측 확정을 구분한다', () => {
  assert.match(steps, /부족한 순금의 비용과 추가 골드바 공임은 별도입니다/);
  assert.match(steps, /실제 순도·중량·공임·남는 금 처리는 매장 실측과 고객 동의 후 확정됩니다/);
  assert.match(steps, /예약 요청 시 공임을 다시 확인하며, 실측과 고객 동의 후 확정됩니다/);
  assert.doesNotMatch(steps, /적용 예정 공임표 버전/);
});

test('방문 날짜·시간 선택만으로 일정이 선점되거나 확정되지 않음을 안내한다', () => {
  assert.match(steps, /visitTime && <small>예약 요청을 접수한 뒤 매장에서 확인합니다\. 아직 예약 확정·시간 선점 상태는 아닙니다/);
  assert.match(steps, /예약 요청을 접수한 뒤 매장에서 확인합니다/);
});

test('예약 요청 버튼 근처에서는 접수와 확정을 한 번만 간결하게 안내한다', () => {
  assert.equal((steps.match(/아래 버튼은 방문 예약 <b>요청<\/b>입니다/g) || []).length, 1);
  assert.doesNotMatch(steps, /이 버튼은 예약 <b>요청<\/b>입니다/);
  assert.match(steps, /\{loading \? "제출 중\.\.\." : "방문 예약 요청"\}/);
});

test('비회원은 계산·방문 시간 선택 후 인증할 수 있다', () => {
  assert.match(page, /예약 요청만 로그인 또는 회원가입 후 완료합니다/);
  assert.match(steps, /user \? "이메일 인증하고 예약 이어가기" : "로그인·가입하고 예약 이어가기"/);
  assert.match(page, /saveGoldExchangeDraft\(/);
});

test('MEMBER GOLD는 선택사항이며 매장에서 교환 확정 시 차감한다', () => {
  assert.match(steps, /선택하지 않아도 방문 예약은 가능합니다/);
  assert.match(steps, /선택해도 지금 바로 차감되지 않습니다/);
  assert.match(steps, /매장에서 6자리 확인 코드를 확인하고 실제 교환을 확정할 때 차감됩니다/);
});

test('완료 화면은 예약 대기와 확정을 구분한다', () => {
  assert.match(steps, /현재 상태 · 예약 확인 대기/);
  assert.match(steps, /방문 예약 요청이 접수되었습니다/);
  assert.match(steps, /현재 상태 · 예약 확정/);
});

test('교환 소개는 시세 공개일을 오늘로 단정하지 않는다', () => {
  assert.match(intro, /공개 시세 기준 참고가치를 확인할 수 있습니다/);
  assert.doesNotMatch(intro, /내 금의 오늘 가치를 기록/);
});

test('금교환 예약 UX 회귀검사를 출시 검사에 포함한다', () => {
  assert.match(release, /GOLD EXCHANGE RESERVATION UX/);
  assert.match(release, /scripts\/test-gold-exchange-reservation-clarity\.mjs/);
});
