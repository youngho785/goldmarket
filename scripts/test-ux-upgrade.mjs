import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [
  registerSource,
  loginSource,
  authServiceSource,
  userServiceSource,
  welcomeSource,
  myGoldSource,
  myGoldItemsSource,
  appHomeSource,
  exchangeSource,
  autoVaultSource,
  exchangeStepsSource,
  supportSource,
  createInquirySource,
  inquiryDetailSource,
  myExchangesSource,
  rulesSource,
] = await Promise.all([
  read("src/pages/Register.jsx"),
  read("src/pages/Login.jsx"),
  read("src/services/authService.js"),
  read("src/services/userService.js"),
  read("src/pages/WelcomeOnboarding.jsx"),
  read("src/pages/MyGoldVault.jsx"),
  read("src/components/myGoldVault/MyGoldItemsSection.jsx"),
  read("src/pages/AppHome.jsx"),
  read("src/pages/GoldExchange.jsx"),
  read("src/hooks/useGoldExchangeAutoVault.js"),
  read("src/components/goldExchange/GoldExchangeSteps.jsx"),
  read("src/services/supportService.js"),
  read("src/pages/CreateInquiry.jsx"),
  read("src/pages/InquiryDetail.jsx"),
  read("src/pages/MyExchanges.jsx"),
  read("firestore.rules"),
]);

test("회원가입은 최소 계정 생성과 점진적 프로필 구조를 사용한다", () => {
  assert.match(registerSource, /id="regEmail"/);
  assert.match(registerSource, /id="regPassword"/);
  assert.doesNotMatch(registerSource, /id="regName"|id="regPhone"|id="regNickname"/);
  assert.match(registerSource, /이름·전화번호·닉네임은 이메일 인증 후 필요한 순간에 설정/);
  assert.match(authServiceSource, /if \(safeNickname\)/);
  assert.match(userServiceSource, /if \(!email\) throw new Error/);
  assert.doesNotMatch(userServiceSource, /if \(!displayName\) throw new Error\("가입 이름 정보가 없습니다/);
  assert.doesNotMatch(userServiceSource, /if \(!phone\) throw new Error\("가입 휴대전화 정보가 없습니다/);
});

test("가입 CTA는 사용자의 원래 목적을 말하고 혜택은 보조로 둔다", () => {
  assert.match(registerSource, /내 금 저장하고 시작하기/);
  assert.match(registerSource, /계산 결과 이어서 예약하기/);
  assert.match(loginSource, /내 금 저장하고 시작하기/);
  assert.match(loginSource, /계산 결과 이어서 예약하기/);
  assert.match(loginSource, /가입은 간단하게 · MY GOLD 기록과 가치 확인을 이어가세요/);
});

test("이메일 인증 후에는 원래 하던 일을 혜택보다 먼저 이어간다", () => {
  const continueIndex = welcomeSource.indexOf("<ContinueCard");
  const rewardsIndex = welcomeSource.indexOf("<Steps>");
  assert.ok(continueIndex >= 0 && rewardsIndex > continueIndex);
  assert.match(welcomeSource, /navigate\(nextPath \|\| "\/", \{ replace: true \}\)/);
  assert.match(welcomeSource, /하던 일을 먼저 이어가세요/);
});

test("푸시 권한은 가치 설명 뒤 사용자 행동으로 요청하고 보너스는 부가 혜택으로 둔다", () => {
  assert.match(welcomeSource, /금시세·MY GOLD 알림 받아보기/);
  assert.match(welcomeSource, /직접 알림 받기를 눌렀을 때만 기기 권한을 요청/);
  assert.match(welcomeSource, /알림 받고 순금 0\.01g 혜택 받기/);
  assert.match(welcomeSource, /onClick=\{handleMarketingReward\}/);
});

test("MY GOLD는 저장한 금으로 GOLD TO GOLD 결과 단계까지 자동 연결한다", () => {
  assert.match(myGoldSource, /\/gold-exchange\?mode=vault&auto=1/);
  assert.match(appHomeSource, /\/gold-exchange\?mode=vault&auto=1/);
  assert.match(exchangeSource, /useGoldExchangeAutoVault/);
  assert.match(autoVaultSource, /validateExchangeProductsForCalculation/);
  assert.match(autoVaultSource, /applyExchangeFinalWeights/);
  assert.match(autoVaultSource, /setStep\(STEP\.BARS\)/);
});



test("MY GOLD는 회원혜택 잔액을 합산하지 않고 기록한 금만 보여준다", () => {
  assert.match(myGoldSource, /MY GOLD는 사용자가 실제로 보유한 금을 기록해 보는 개인 기록 공간/);
  assert.match(myGoldSource, /const vaultValueWon = Number\(activeSummary\.estimatedValueWon \|\| 0\)/);
  assert.match(myGoldSource, /MEMBER GOLD는 별도 회원혜택으로 MY GOLD 참고가치에 포함되지 않습니다/);
  assert.doesNotMatch(appHomeSource, /<BenefitCard/);
});

test("MY GOLD는 한 개·일부·전체 기록으로 GOLD TO GOLD 예상 확인을 지원한다", () => {
  assert.match(myGoldSource, /MyGoldItemsSection/);
  assert.match(myGoldItemsSource, /선택해서 예상 확인/);
  assert.match(myGoldItemsSource, /selectedIds/);
  assert.match(myGoldItemsSource, /openSelectedItemsExchange/);
  assert.match(myGoldItemsSource, /navigateWithProducts\(selectedItems\.map\(toVaultExchangeProduct\)\)/);
  assert.match(myGoldItemsSource, /선택 금 예상 확인/);
  assert.match(myGoldItemsSource, /전체 예상 확인 \(\{sortedItems\.length\}\)/);
  assert.match(myGoldItemsSource, /openSingleItemExchange/);
  assert.match(myGoldItemsSource, /maxExchangeProducts/);
});

test("예약 연락처는 이미 알면 확인만 하고 첫 입력 후 다음 예약에 저장한다", () => {
  assert.match(exchangeStepsSource, /예약자 정보/);
  assert.match(exchangeStepsSource, /정보 변경/);
  assert.match(exchangeStepsSource, /한 번 예약하면 입력한 이름과 전화번호를 다음 예약에 자동으로 불러옵니다/);
  assert.match(exchangeSource, /saveReservationContact\(user\.uid/);
  assert.match(userServiceSource, /export async function saveReservationContact/);
});

test("앱 홈은 다가오는 예약을 MY GOLD보다 먼저 보여준다", () => {
  const reservationIndex = appHomeSource.indexOf('<ReservationCard to="/my-exchanges"');
  const dashboardIndex = appHomeSource.indexOf("<AppMyGoldDashboard");
  assert.ok(reservationIndex >= 0 && dashboardIndex > reservationIndex);
  assert.match(appHomeSource, /지금 가장 먼저 확인할 일정/);
});

test("교환내역에서 시작한 1:1 문의는 해당 교환건과 안전하게 연결된다", () => {
  assert.match(myExchangesSource, /이 교환건 문의하기/);
  assert.match(myExchangesSource, /\/support\/new\?groupId=/);
  assert.match(createInquirySource, /relatedGroupId/);
  assert.match(supportSource, /payload\.relatedGroupId = cleanRelatedGroupId/);
  assert.match(inquiryDetailSource, /연결된 GOLD TO GOLD 교환건/);
  assert.match(rulesSource, /'relatedGroupId'/);
  assert.match(rulesSource, /ownsGoldExchangeGroup\(data\.relatedGroupId\)/);
});
