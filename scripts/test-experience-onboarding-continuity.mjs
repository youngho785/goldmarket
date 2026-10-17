import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildAuthPath, buildVerifyEmailPath, getAuthReturnPath } from '../src/lib/authReturn.js';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const vault = read('src/pages/MyGoldVault.jsx');
const registration = read('src/pages/Register.jsx');
const onboarding = read('src/pages/WelcomeOnboarding.jsx');
const prompt = read('src/components/gold/MyGoldImportPrompt.jsx');
const vaultService = read('src/services/goldVaultService.js');
const importDraft = read('src/lib/goldVaultImportDraft.js');

test('MY GOLD 체험 가입 버튼은 가입으로 직행하며 로그인 선택은 유지한다', () => {
  assert.match(vault, /navigate\("\/register\?next=%2Fmy-gold%3Fimport%3Dguest"/);
  assert.match(vault, /saveGoldVaultGuestDraft\(guestRawItems\)/);
  assert.match(registration, /<Link[\s\S]*?to=\{buildAuthPath\("\/login", returnTo\)\}/);
  const next = '/my-gold?import=guest';
  assert.equal(getAuthReturnPath({ search: new URL(buildAuthPath('/register', next), 'https://kgm.test').search }), next);
  assert.equal(getAuthReturnPath({ search: new URL(buildVerifyEmailPath(`/welcome?next=${encodeURIComponent(next)}`), 'https://kgm.test').search }), `/welcome?next=${encodeURIComponent(next)}`);
});

test('회원가입 중에는 계정 저장 완료를 약속하지 않고 실제 기록 개수를 안내한다', () => {
  assert.match(registration, /guestRecordCount = returningToGuestMyGoldImport/);
  assert.match(registration, /이 기기에 기록한 금 \${guestRecordCount}개를 이어갑니다/);
  assert.match(registration, /이메일 인증하고 내 금 이어가기/);
  assert.match(registration, /markGuestMyGoldAutoImportPending\(user\.uid\)/);
  assert.match(registration, /navigate\(buildVerifyEmailPath\(onboardingPath\), \{ replace: true \}\)/);
});

test('인증 완료 화면은 3단계 혜택을 먼저 요약하고 원래 작업으로 바로 이어지게 한다', () => {
  const continuation = onboarding.indexOf('<ContinueCard aria-label="가입 후 다음 행동">');
  const reward = onboarding.indexOf('<WelcomeRewardCard aria-label="신규 회원 최대 순금 혜택">');
  const extras = onboarding.indexOf('<Steps>');
  assert.ok(reward >= 0 && continuation > reward && extras > continuation);
  assert.match(onboarding, /신규 회원 최대 순금 0\.03g/);
  assert.match(onboarding, /<RewardMilestones aria-label="혜택 3단계 진행 현황">/);
  assert.match(onboarding, /이메일 인증/);
  assert.match(onboarding, /금 퀵퀴즈/);
  assert.match(onboarding, /기본 혜택: \{welcomeRewardLabel\}/);
  assert.match(onboarding, /기록한 금 \${guestRecordCount}개 이어가기/);
  assert.match(onboarding, /setContinueError\("이어갈 금 기록을 찾지 못했습니다/);
  assert.match(onboarding, /prepareGuestMyGoldImportDraft\(\)/);
  assert.match(onboarding, /readGoldVaultImportDraft\("guest-my-gold"\)/);
  assert.match(onboarding, /clearMemberOnboardingPending\(\)/);
  assert.match(onboarding, /const handleMarketingReward = async \(\) =>/);
  assert.doesNotMatch(onboarding, /setTimeout\(handleMarketingReward|setTimeout\(handleQuiz/);
});

test('가져올 기록이 많아도 개수를 숨기지 않고 전부 확인 가능하며 저장 대상은 전부 유지한다', () => {
  assert.match(prompt, /items\.slice\(0, 3\)\.map/);
  assert.match(prompt, /items\.slice\(3\)\.map/);
  assert.match(prompt, /나머지 \{items\.length - 3\}개 기록 모두 보기/);
  assert.match(prompt, /const hasRoom = items\.length <= availableSlots/);
  assert.match(prompt, /onConfirm\(duplicateApproved\)/);
  assert.match(vault, /findPossibleMyGoldDuplicates\(pendingItems, items\)/);
  assert.match(vault, /await createGoldVaultItems\(user\.uid, pendingItems\)/);
  assert.match(vaultService, /const batch = writeBatch\(db\)/);
  assert.match(vaultService, /await batch\.commit\(\)/);
  assert.match(importDraft, /const MAX_GUEST_ITEMS = GOLD_VAULT_MAX_ITEMS/);
});

test('고객 기록과 회원혜택은 명확히 분리하고 자동 동의를 금지한다', () => {
  assert.match(onboarding, /가입 혜택은 MEMBER GOLD에서 확인할 수 있어요/);
  assert.match(onboarding, /my-gold\?import=guest/);
  assert.match(registration, /marketing: false/);
  assert.match(onboarding, /버튼을 누른 경우에만 OS\/브라우저 알림 권한을 요청합니다/);
});


test('기본·알림·퀴즈 보너스 지급 경로와 자발적 참여 원칙을 보존한다', () => {
  assert.match(onboarding, /await claimWelcomeGoldBonus\(\)/);
  assert.match(onboarding, /await saveMarketingNotificationConsent\(user\.uid, true\)/);
  assert.match(onboarding, /await saveMarketingPushTarget\(/);
  assert.match(onboarding, /claimGoldQuizBonus\(\{ answers: pendingQuiz\.answers \}\)/);
  assert.match(onboarding, /onClick=\{handleQuiz\}/);
  assert.match(onboarding, /onClick=\{handleMarketingReward\}/);
  assert.match(onboarding, /maxG: Number\(source\?\.maxG \?\? 0\.03\)/);
  assert.match(onboarding, /const optionalClaimedCount/);
  assert.doesNotMatch(onboarding, /setTimeout\(handleMarketingReward|setTimeout\(handleQuiz/);
});
