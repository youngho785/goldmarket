import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

const [
  appSource,
  profileSource,
  walletSource,
  exchangeSource,
  exchangeHookSource,
  welcomeSource,
  rewardFunctionsSource,
  functionsIndexSource,
  notificationSource,
  analyticsSource,
  packageText,
] = await Promise.all([
  read("src/App.jsx"),
  read("src/pages/Profile.jsx"),
  read("src/pages/MemberGold.jsx"),
  read("src/pages/GoldExchange.jsx"),
  read("src/hooks/useGoldExchangeMemberGold.js"),
  read("src/pages/WelcomeOnboarding.jsx"),
  read("functions/src/rewards/functions.ts"),
  read("functions/src/index.ts"),
  read("functions/src/notifications/functions.ts"),
  read("src/analytics/productAnalytics.js"),
  read("package.json"),
]);

const packageJson = JSON.parse(packageText);

test("MEMBER GOLD는 인증 회원 전용 지갑 경로를 사용한다", () => {
  assert.match(appSource, /lazy\(\(\) => import\("@\/pages\/MemberGold"\)\)/);
  assert.match(appSource, /path:\s*"\/member-gold"[\s\S]*<MemberGold/);
  assert.match(appSource, /path === "\/member-gold"/);
});

test("Profile은 MEMBER GOLD 지급·상세 조회를 실행하지 않고 잔액 요약만 보여준다", () => {
  assert.match(profileSource, /useBonusGoldBalance\(user\?\.uid\)/);
  assert.match(profileSource, /to="\/member-gold"/);
  assert.doesNotMatch(profileSource, /claimWelcomeGoldBonus/);
  assert.doesNotMatch(profileSource, /getBonusGoldUsageState/);
  assert.doesNotMatch(profileSource, /getMemberBonusStatus/);
  assert.doesNotMatch(profileSource, /getGoldQuizBonusStatus/);
});

test("MEMBER GOLD overview는 신규 보상 지급 없이 mg 정수 기준 상태를 통합한다", () => {
  const start = rewardFunctionsSource.indexOf("export const memberGoldGetOverview");
  const end = rewardFunctionsSource.indexOf("export const memberBonusGetStatus", start);
  assert.ok(start >= 0 && end > start, "memberGoldGetOverview callable이 필요합니다.");
  const overviewSource = rewardFunctionsSource.slice(start, end);

  assert.match(functionsIndexSource, /memberGoldGetOverview/);
  assert.match(overviewSource, /WELCOME_BONUS_CREDIT_MG[\s\S]*MARKETING_PUSH_BONUS_CREDIT_MG[\s\S]*QUIZ_BONUS_CREDIT_MG/);
  assert.match(overviewSource, /maxMilliGrams:/);
  assert.match(overviewSource, /balanceMilliGrams:/);
  assert.match(overviewSource, /spendableMilliGrams:/);
  assert.match(overviewSource, /completedBenefitCount/);
  assert.match(overviewSource, /publicBonusUsageRequest\(requestData\)/);
  assert.doesNotMatch(overviewSource, /resolveWelcomeBonusState/);
});

test("지갑은 현재 잔액과 혜택 완료 상태를 분리하고 기존 ledger를 읽는다", () => {
  assert.match(walletSource, /회원혜택 현황/);
  assert.match(walletSource, /completedCount/);
  assert.match(walletSource, /availableBalanceG/);
  assert.match(walletSource, /collection\(db, "users", user\.uid, "ledger"\)/);
  assert.match(walletSource, /orderBy\("createdAt", "desc"\)/);
  assert.match(walletSource, /GOLD TO GOLD 사용/);
  assert.match(walletSource, /requestBonusGoldUsage/);
  assert.match(walletSource, /cancelBonusGoldUsage/);
});

test("재가입 혜택 진행률은 이번 계정 지급액이 아니라 인증 이메일 기준 완료 여부를 사용한다", () => {
  assert.match(welcomeSource, /getMemberGoldOverview/);
  assert.match(welcomeSource, /const optionalClaimedCount\s*=/);
  assert.match(welcomeSource, /status\.welcome\.previouslyReceived/);
  assert.match(welcomeSource, /status\.welcome\.claimed/);
  assert.match(welcomeSource, /status\.marketingPush\.claimed/);
  assert.match(welcomeSource, /status\.quiz\.claimed/);
  assert.doesNotMatch(welcomeSource, /receivedThisAccount\)\.length/);
});

test("MY GOLD 주간 참고가치는 MEMBER GOLD를 합산하지 않고 교환 준비량에서만 별도 사용한다", () => {
  assert.match(notificationSource, /MEMBER GOLD는 별도 회원혜택이며 MY GOLD 참고가치에는 합산하지 않습니다/);
  assert.match(notificationSource, /const currentValueWon\s*=\s*vault\.currentValueWon/);
  assert.match(notificationSource, /const exchangeReadyG\s*=\s*roundTo3\(vault\.pureGoldG \+ bonusGoldG\)/);
  assert.match(notificationSource, /MEMBER GOLD \+\$\{bonusGoldG\.toFixed\(2\)\}g/);
});

test("GOLD TO GOLD는 전용 hook으로 MEMBER GOLD를 예약 성공 뒤 연결한다", () => {
  assert.match(exchangeSource, /useGoldExchangeMemberGold/);
  assert.match(exchangeSource, /await submitGoldExchangeGroup\(payload\)[\s\S]*await linkMemberGoldToGroup\(res\.groupId\)/);
  assert.doesNotMatch(exchangeSource, /requestBonusGoldUsage/);
  assert.match(exchangeHookSource, /requestBonusGoldUsage\(groupId\)/);
  assert.match(exchangeHookSource, /예약 자체는 이미 성공한 뒤 호출됩니다/);
});

test("MEMBER GOLD 분석 이벤트는 개인정보 없이 제한된 allowlist를 사용한다", () => {
  for (const eventName of [
    "member_gold_view",
    "member_gold_reward_cta_clicked",
    "member_gold_exchange_cta_clicked",
    "member_gold_usage_requested",
  ]) {
    assert.match(analyticsSource, new RegExp(`${eventName}:`));
  }
  assert.match(analyticsSource, /member_gold_usage_requested:[\s\S]*wallet[\s\S]*exchange/);
});

test("MEMBER GOLD 전용 회귀 테스트 명령이 등록되어 있다", () => {
  assert.equal(packageJson.scripts?.["test:member-gold"], "node scripts/test-member-gold-wallet.mjs");
});
