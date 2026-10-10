import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const welcome = read('src/pages/WelcomeOnboarding.jsx');
const quiz = read('src/pages/QuizGoldBonus.jsx');
const register = read('src/pages/Register.jsx');
const verify = read('src/pages/VerifyEmail.jsx');
const notification = read('src/services/notificationPreferences.js');
const rewardServer = read('functions/src/rewards/functions.ts');

test('5차 수정: 가입→이메일 인증→축하 온보딩 진입 경로 유지', () => {
  assert.match(register, /const onboardingPath = buildMemberOnboardingPath\(returnTo\)/);
  assert.match(register, /navigate\(buildVerifyEmailPath\(onboardingPath\), \{ replace: true \}\)/);
  assert.match(verify, /readMemberOnboardingPath\(""\)/);
  assert.match(welcome, /<Title>회원가입을 축하합니다!<\/Title>/);
  assert.match(welcome, /claimWelcomeGoldBonus\(\)/);
});
test('5차 수정: 알림은 사용자 직접 요청·기기 등록 완료 후 선택 동의', () => {
  assert.match(welcome, /onClick=\{handleMarketingReward\}/);
  assert.match(welcome, /requestNativePushPermission\(user\.uid\)/);
  assert.match(welcome, /registerForPush\(user\.uid\)/);
  assert.match(welcome, /if \(!token\)/);
  assert.match(welcome, /saveMarketingNotificationConsent\(user\.uid, true\)/);
  assert.match(welcome, /saveMarketingPushTarget\(/);
  assert.match(notification, /claimMarketingPushGoldBonus\(\)/);
});
test('5차 수정: 알림 혜택이 확인되면 퀵퀴즈 다음 행동을 직접 제안', () => {
  assert.match(welcome, /status\.marketingPush\.claimed && !status\.quiz\.claimed && !loading && !error/);
  assert.match(welcome, /다음 혜택 · 금 퀵퀴즈 시작하기/);
  assert.match(welcome, /const handleQuiz = \(\) => \{/);
  assert.match(welcome, /`\/quiz\/gold-bonus\?next=\$\{encodeURIComponent\(welcomePath\)\}`/);
  assert.match(welcome, /type="button" onClick=\{handleQuiz\}/);
});
test('5차 수정: 퀵퀴즈는 서버에서 채점하고 가입 혜택 화면으로 복귀', () => {
  assert.match(quiz, /await claimGoldQuizBonus\(\{ answers \}\)/);
  assert.match(quiz, /returningToOnboarding/);
  assert.match(quiz, /가입 혜택 화면으로 돌아가기/);
  assert.match(quiz, /navigate\(nextPath, \{ replace: true \}\)/);
});
test('5차 수정: 2개 완료 상태는 서버 확인값으로만 표시하고 원래 작업 계속 가능', () => {
  assert.match(welcome, /const optionalClaimedCount\s*=\s*Number\(status\.marketingPush\.claimed\) \+\s*Number\(status\.quiz\.claimed\)/);
  assert.match(welcome, /!loading && !error && optionalClaimedCount === 2/);
  assert.match(welcome, /선택 혜택 2개를 모두 완료했습니다!/);
  assert.match(welcome, /status\.balanceG\.toFixed\(2\)/);
  assert.match(welcome, /<ActionButton type="button" onClick=\{handleFinish\}>/);
  assert.match(welcome, /clearMemberOnboardingPending\(\)/);
});
test('5차 수정: 퀴즈·알림은 건너뛰기 가능, 기본 가입 0.01g과 분리', () => {
  const continueIdx = welcome.indexOf('<ContinueCard');
  const stepsIdx = welcome.indexOf('<Steps>');
  assert.ok(continueIdx > 0 && stepsIdx > continueIdx);
  assert.match(welcome, /선택 1\. 금시세·혜택 소식 알림/);
  assert.match(welcome, /선택 2\. 금 퀵퀴즈 혜택/);
  assert.match(welcome, /기본 혜택 · 인증 이메일 기준 1회/);
  assert.match(welcome, /추가 선택 혜택 · 최대 순금 0\.02g/);
  assert.match(rewardServer, /benefitClaimLockRef/);
  assert.doesNotMatch(welcome, /setTimeout\(handleMarketingReward|setTimeout\(handleQuiz/);
});
