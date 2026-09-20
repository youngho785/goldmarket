import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

const [
  pendingHookSource,
  navbarSource,
  bottomNavSource,
  loginModalSource,
  fcmSource,
  goldExchangeSource,
  goldExchangeStepsSource,
  goldExchangeStylesSource,
  goldExchangeUiSource,
  goldExchangeFormSource,
  goldExchangeRemoteDataSource,
  goldExchangeFunctionsSource,
  myExchangesSource,
  appHomeSource,
  appGoldPriceSummarySource,
  myGoldVaultSource,
  myGoldVaultStylesSource,
  goldVaultDashboardSource,
  goldVaultCatalogSource,
  goldPriceHistoryServiceSource,
  eslintSource,
  indexesSource,
  appSource,
  landingSource,
  quickGoldValueCalculatorSource,
  profileSource,
  verifiedReviewSectionSource,
  footerSource,
  reviewListSource,
] = await Promise.all([
  read("src/hooks/usePendingGoldExchangeCount.js"),
  read("src/components/common/Navbar.jsx"),
  read("src/components/common/BottomNav.jsx"),
  read("src/components/auth/ContinueAfterLoginModal.jsx"),
  read("src/components/common/FCMNotifications.jsx"),
  read("src/pages/GoldExchange.jsx"),
  read("src/components/goldExchange/GoldExchangeSteps.jsx"),
  read("src/components/goldExchange/GoldExchange.styles.js"),
  read("src/components/goldExchange/goldExchangeUi.js"),
  read("src/lib/goldExchangeForm.js"),
  read("src/hooks/useGoldExchangeRemoteData.js"),
  read("functions/src/goldExchange/functions.ts"),
  read("src/pages/MyExchanges.jsx"),
  read("src/pages/AppHome.jsx"),
  read("src/components/gold/AppGoldPriceSummary.jsx"),
  read("src/pages/MyGoldVault.jsx"),
  read("src/components/myGoldVault/MyGoldVault.styles.js"),
  read("src/hooks/useGoldVaultDashboard.js"),
  read("src/lib/goldVaultCatalog.js"),
  read("src/services/goldPriceHistoryService.js"),
  read("eslint.config.js"),
  read("firestore.indexes.json"),
  read("src/App.jsx"),
  read("src/pages/LandingPage.jsx"),
  read("src/components/gold/QuickGoldValueCalculator.jsx"),
  read("src/pages/Profile.jsx"),
  read("src/components/reviews/VerifiedReviewSection.jsx"),
  read("src/components/common/Footer.jsx"),
  read("src/components/reviews/GoldExchangeReviewList.jsx"),
]);

test("관리자 예약 대기 숫자는 하나의 공유 Firestore listener를 사용한다", () => {
  assert.match(pendingHookSource, /const sharedSubscribers = new Set\(\)/);
  assert.match(pendingHookSource, /sharedUnsubscribe = onSnapshot/);
  assert.match(navbarSource, /usePendingGoldExchangeCount\(\)/);
  assert.doesNotMatch(
    navbarSource,
    /where\("repStatus",\s*"==",\s*"requested"\)/,
    "Navbar가 관리자 대기 쿼리를 별도로 다시 열면 안 됩니다."
  );
});

test("비회원 하단 메뉴는 보호 화면 대신 공개 핵심 기능과 로그인으로 안내한다", () => {
  assert.match(bottomNavSource, /const GUEST_WEB_ITEMS = \[/);
  assert.match(bottomNavSource, /to: "\/gold-price"[\s\S]*label: "금시세"/);
  assert.match(bottomNavSource, /to: "\/login"[\s\S]*label: "로그인"/);
  assert.match(bottomNavSource, /const MEMBER_WEB_ITEMS = \[[\s\S]*label: "금시세"[\s\S]*label: "MY GOLD"[\s\S]*label: "금교환"[\s\S]*label: "MY"/);
  assert.match(bottomNavSource, /const MEMBER_ANDROID_ITEMS = \[[\s\S]*label: "금시세"[\s\S]*label: "MY GOLD"[\s\S]*center: true[\s\S]*label: "금교환"[\s\S]*label: "MY"/);
  assert.match(bottomNavSource, /isMember \? MEMBER_WEB_ITEMS : GUEST_WEB_ITEMS/);
  assert.match(bottomNavSource, /isMember \? MEMBER_ANDROID_ITEMS : GUEST_ANDROID_ITEMS/);
});

test("2.1 상단 메뉴는 비회원과 회원의 핵심 행동을 각각 4개로 정리한다", () => {
  assert.match(navbarSource, /if \(isMember\) \{[\s\S]*label: "MY GOLD"[\s\S]*label: "금시세"[\s\S]*label: "GOLD TO GOLD"[\s\S]*label: "교환내역"/);
  assert.match(navbarSource, /return \[[\s\S]*label: "금시세"[\s\S]*label: "MY GOLD"[\s\S]*label: "GOLD TO GOLD"[\s\S]*label: "매장안내"/);
  assert.match(navbarSource, /<AccountLink to="\/register">시작하기<\/AccountLink>/);
  assert.match(navbarSource, /aria-label="MY 계정 메뉴"/);
});

test("2.2.1 PC 회원 MY 메뉴에서 계정 필수 기능과 로그아웃에 접근할 수 있다", () => {
  assert.match(navbarSource, /<AccountMenuItem to="\/profile"[\s\S]*내 정보/);
  assert.match(navbarSource, /<AccountMenuItem to="\/settings"[\s\S]*설정/);
  assert.match(navbarSource, /<AccountMenuItem to="\/support"[\s\S]*1:1 문의/);
  assert.match(navbarSource, /<AccountMenuLogout[\s\S]*onClick=\{handleLogout\}[\s\S]*로그아웃/);
  assert.match(navbarSource, /aria-haspopup="menu"/);
  assert.match(navbarSource, /aria-expanded=\{accountMenuOpen\}/);
  assert.match(navbarSource, /event\.key !== "Escape"/);
  assert.match(navbarSource, /document\.addEventListener\("pointerdown", handlePointerDown\)/);
});

test("2.2.1 로그인·보호 화면의 기본 메시지는 회원혜택보다 MY GOLD 목적을 먼저 말한다", async () => {
  const [loginSource, protectedRouteSource, androidHeaderSource] = await Promise.all([
    read("src/pages/Login.jsx"),
    read("src/components/common/ProtectedRoute.jsx"),
    read("src/components/common/AndroidAppHeader.jsx"),
  ]);
  assert.match(loginSource, /가입은 간단하게 · MY GOLD 기록과 가치 확인을 이어가세요/);
  assert.match(protectedRouteSource, /MY GOLD 기록을 이어가세요/);
  assert.match(protectedRouteSource, /내가 가진 금의 기록과 오늘 가치 확인/);
  assert.match(androidHeaderSource, /내 금 기록을 시작해 보세요/);
  assert.match(androidHeaderSource, /MY GOLD에 내가 가진 금을 기록하고 오늘의 참고가치와 변화를 확인/);
});

test("2.1 회원 홈은 PC에서 넓은 2열 대시보드와 작은 MY GOLD 안내를 사용한다", async () => {
  const myGoldDashboardSource = await read("src/components/gold/AppMyGoldDashboard.jsx");
  assert.match(appHomeSource, /width: min\(1160px, 100%\)/);
  assert.match(appHomeSource, /grid-template-columns: minmax\(0, 1\.75fr\) minmax\(290px, \.75fr\)/);
  assert.match(appHomeSource, /<OverviewGrid aria-label="내 금과 오늘 금시세">/);
  assert.match(appHomeSource, /MY GOLD는 개인 기록 공간입니다/);
  assert.match(myGoldDashboardSource, /font-variant-numeric: tabular-nums/);
});

test("2.2 최종 홈은 데이터 숫자와 2열 높이 균형, 기록 기준 교환 문구를 사용한다", async () => {
  const myGoldDashboardSource = await read("src/components/gold/AppMyGoldDashboard.jsx");
  const appGoldPriceSummarySource = await read("src/components/gold/AppGoldPriceSummary.jsx");
  assert.match(myGoldDashboardSource, /const SummaryShell = styled\.div`[\s\S]*height: 100%/);
  assert.match(myGoldDashboardSource, /const SummaryInner = styled\(Inner\)`[\s\S]*min-height: 242px[\s\S]*height: 100%/);
  assert.match(myGoldDashboardSource, /font-family: "Segoe UI", "Malgun Gothic", Arial, sans-serif/);
  assert.match(appGoldPriceSummarySource, /font-family: "Segoe UI", "Malgun Gothic", Arial, sans-serif/);
  assert.match(appHomeSource, /GOLD TO GOLD · 기록 기준 예상/);
  assert.match(appHomeSource, /기록한 금 기준 · \$\{readiness\.label\} 교환 가능 예상/);
  assert.match(appHomeSource, /실제 교환량은 매장 실측 후 확정합니다/);
});

test("2.3 MY GOLD는 PC 핵심 화면을 2열로 넓히고 기록·가치·예상교환의 우선순위를 분리한다", async () => {
  const myGoldItemsSource = await read("src/components/myGoldVault/MyGoldItemsSection.jsx");
  assert.match(myGoldVaultStylesSource, /max-width: 1160px/);
  assert.match(myGoldVaultStylesSource, /export const SummaryOverviewGrid = styled\.div`[\s\S]*grid-template-columns: minmax\(0, 1\.65fr\) minmax\(300px, 0\.75fr\)/);
  assert.match(myGoldVaultSource, /<SummaryOverviewGrid aria-label="MY GOLD 요약">/);
  assert.match(myGoldVaultSource, /<span>기록한 금<\/span>[\s\S]*activeSummary\.itemCount/);
  assert.match(myGoldVaultSource, /내 금 관리/);
  assert.match(myGoldVaultSource, /GOLD TO GOLD · 기록 기준 예상/);
  assert.match(myGoldVaultSource, /실제 교환은 매장 실측 후 확정/);
  assert.doesNotMatch(myGoldVaultSource, /같은 양의 999\.9를 오늘 새로 구입하면/);
  assert.match(myGoldItemsSource, /선택해서 예상 확인/);
  assert.match(myGoldItemsSource, /선택 금 예상 확인/);
  assert.match(myGoldItemsSource, /전체 예상 확인/);
  assert.doesNotMatch(myGoldItemsSource, />\s*교환\s*<\/button>/);
  assert.doesNotMatch(myGoldItemsSource, /같은 양의 999\.9 신규구매가/);
});

test("2.3.1 MY GOLD는 참고가치 표현과 간결한 안내, 안정적인 가치 그래프를 사용한다", async () => {
  const myGoldItemsSource = await read("src/components/myGoldVault/MyGoldItemsSection.jsx");
  const myGoldTrendSource = await read("src/components/gold/MyGoldValueTrend.jsx");
  assert.match(myGoldVaultSource, /내 금의 오늘 참고가치/);
  assert.match(myGoldVaultSource, /실물 금을 보관·예치하는 서비스가 아닙니다/);
  assert.match(myGoldVaultSource, /MEMBER GOLD는 별도 회원혜택으로 MY GOLD 참고가치에 포함되지 않습니다/);
  assert.match(myGoldItemsSource, /오늘 참고가치/);
  assert.match(myGoldItemsSource, /선택해서 예상 확인/);
  assert.match(myGoldItemsSource, /전체 예상 확인/);
  assert.match(myGoldItemsSource, /교환 예상/);
  assert.match(myGoldTrendSource, /내 금 참고가치 변화/);
  assert.match(myGoldTrendSource, /const chartLineIn = keyframes/);
  assert.doesNotMatch(myGoldTrendSource, /stroke-dasharray:\s*1|stroke-dashoffset:\s*1/);
  assert.doesNotMatch(myGoldTrendSource, /pathLength="1"/);
});

test("2.4 GOLD TO GOLD는 온라인 예상과 실제 매장 확정을 분리하고 방문 예약 흐름을 명확히 한다", () => {
  assert.match(goldExchangeStylesSource, /max-width: 1160px/);
  assert.match(goldExchangeSource, /온라인 화면은 예상값입니다/);
  assert.match(goldExchangeSource, /실제 순도·중량·골드바 제작공임과 교환 조건은 매장에서 실물을 확인하고 고객이 동의한 뒤 확정/);
  assert.match(goldExchangeStepsSource, /선택한 규격의 예상 제작 공임/);
  assert.match(goldExchangeStepsSource, /전체 공임표 보기/);
  assert.match(goldExchangeStepsSource, /이 예상으로 방문 예약 계속/);
  assert.match(goldExchangeStepsSource, /<Title>방문 예약 요청<\/Title>/);
  assert.match(goldExchangeStepsSource, /온라인 예상 · 매장 확정 전/);
  assert.match(goldExchangeStepsSource, /현재 상태 · 예약 확인 대기/);
  assert.match(goldExchangeStepsSource, /아직 예약 확정이나 교환 완료 상태가 아닙니다/);
});

test("2.4.1 비회원 MY GOLD 불러오기는 초기 로그인을 요구하지 않고 예약 마지막에 인증한다", async () => {
  const [guestMyGoldSource, vaultImportHookSource] = await Promise.all([
    read("src/lib/myGoldGuestDemo.js"),
    read("src/hooks/useGoldExchangeVaultImport.js"),
  ]);
  assert.match(goldExchangeSource, /useGoldExchangeVaultImport/);
  assert.match(vaultImportHookSource, /readSavedGuestMyGoldItems/);
  assert.match(vaultImportHookSource, /이 브라우저에 저장된 MY GOLD 기록을 불러왔습니다/);
  assert.match(vaultImportHookSource, /로그인은 방문 예약 마지막 단계에서 진행합니다/);
  assert.doesNotMatch(goldExchangeSource, /purposeLabel:\s*"MY GOLD 불러오기"/);
  assert.match(goldExchangeSource, /purposeLabel:\s*"방문 예약"/);
  assert.match(goldExchangeSource, /next:\s*"\/gold-exchange\?resume=reservation"/);
  assert.match(guestMyGoldSource, /export function readSavedGuestMyGoldItems/);
});

test("2.4.1 GOLD TO GOLD 입력에서는 순금 999.9 덩어리와 999.9 골드바를 제외한다", async () => {
  const defaultsSource = await read("functions/src/goldRates.defaults.json");
  assert.match(goldExchangeFormSource, /GOLD_TO_GOLD_EXCLUDED_PRODUCT_IDS/);
  assert.match(goldExchangeFormSource, /"gold-9999-lump"/);
  assert.match(goldExchangeFormSource, /"gold-9999-bar"/);
  assert.match(goldExchangeSource, /listGoldProducts\(rates, \{ context: "exchange" \}\)\.filter\(isGoldToGoldInputProduct\)/);
  assert.match(goldExchangeFormSource, /순금 999\.9 덩어리와 999\.9 골드바는 GOLD TO GOLD 교환 대상 제품에서 제외됩니다/);
  const defaults = JSON.parse(defaultsSource);
  assert.equal(defaults.products["gold-9999-lump"].exchangeEnabled, false);
  assert.equal(defaults.products["gold-9999-bar"].exchangeEnabled, false);
});

test("2.4 골드바 제작 공임 규칙은 공임 안내와 GOLD TO GOLD가 하나의 공용 모듈을 사용한다", async () => {
  const [feeSource, feePageSource] = await Promise.all([
    read("src/lib/goldBarFee.js"),
    read("src/pages/GoldbarFee.jsx"),
  ]);
  assert.match(feeSource, /export function getGoldBarFee/);
  assert.match(feeSource, /export function getGoldBarFeeEstimate/);
  assert.match(goldExchangeStepsSource, /from "@\/lib\/goldBarFee"/);
  assert.match(feePageSource, /from "@\/lib\/goldBarFee"/);
  assert.doesNotMatch(feePageSource, /const SPECIAL_GRAM_FEES/);
  assert.doesNotMatch(feePageSource, /const FEE_RULES_DON/);
});

test("2.2 최종 랜딩은 히어로와 시세·후기를 더 압축하고 후기 제목 중복을 없앤다", async () => {
  const goldPriceBoardSource = await read("src/components/gold/GoldPriceBoard.jsx");
  assert.match(landingSource, /min-height: min\(500px, calc\(100svh - 132px\)\)/);
  assert.match(landingSource, /const CompactSection = styled\(Section\)/);
  assert.match(landingSource, /<CompactSection aria-labelledby="live-title">/);
  assert.match(landingSource, /<CompactSection aria-label="교환 완료 고객 후기">[\s\S]*<VerifiedReviewSection compact showInquiryAction=\{false\} \/>/);
  assert.doesNotMatch(landingSource, /<SectionTitle>실제 교환 경험<\/SectionTitle>/);
  assert.match(goldPriceBoardSource, /\$compact \? "34px" : "44px"/);
  assert.match(goldPriceBoardSource, /\$compact \? "46px" : "62px"/);
});



test("회원 웹 홈은 제품형 AppHome을 사용하고 공개 웹은 랜딩을 유지한다", () => {
  assert.match(appSource, /if \(isAndroid \|\| user\) return <AppHome \/>/);
  assert.match(appSource, /return <LandingPage \/>/);
});

test("공개 홈과 MY에서 검증 후기와 1:1 문의를 찾을 수 있다", () => {
  assert.match(landingSource, /VerifiedReviewSection/);
  assert.match(profileSource, /to="\/support"[\s\S]*고객지원 · 1:1 문의/);
  assert.match(profileSource, /to="\/reviews"[\s\S]*교환 완료 고객 후기/);
});

test("홈의 검증 후기는 최신 1건을 2줄 미리보기로만 보여준다", () => {
  assert.match(verifiedReviewSectionSource, /limitCount=\{1\}/);
  assert.match(verifiedReviewSectionSource, /preview/);
  assert.match(verifiedReviewSectionSource, /showSummary=\{false\}/);
  assert.match(reviewListSource, /-webkit-line-clamp:\s*2/);
  assert.match(reviewListSource, /!preview && \(/);
});

test("비회원 랜딩은 계산 → 기록 흐름 → 금시세 → GOLD TO GOLD/실측 → 후기 흐름으로 간결해진다", () => {
  assert.match(landingSource, /<QuickGoldValueCalculator source="landing" \/>/);
  assert.match(landingSource, /MY GOLD는 내가 가진 금을 기록하고 가치의 변화를 확인하는 개인 기록 공간/);
  assert.match(landingSource, /실물 금을 보관·예치하는 서비스가 아닙니다/);
  assert.match(landingSource, /<FlowStrip/);
  assert.match(landingSource, /<GoldPriceBoard compact \/>/);
  assert.match(landingSource, /기록은 MY GOLD에서, 실제 교환은 매장에서 확인합니다/);
  assert.match(landingSource, /<VerifiedReviewSection compact showInquiryAction=\{false\} \/>/);
  assert.doesNotMatch(landingSource, /MY GOLD PREVIEW|ONE FLOW|0\.01g|0\.03g|금 퀵퀴즈/);
});

test("비회원 랜딩의 첫 행동은 MY GOLD 기록으로 집중한다", () => {
  assert.match(quickGoldValueCalculatorSource, /MY GOLD에 기록해 보기/);
  assert.match(quickGoldValueCalculatorSource, /saveGuestMyGoldItems\(\[item\]\)/);
  assert.match(quickGoldValueCalculatorSource, /navigate\("\/my-gold"\)/);
  assert.match(landingSource, /<QuickGoldValueCalculator source="landing" \/>/);
});

test("공용 금 가치 계산기는 MY GOLD 지원 제품 전체를 한 목록에서 선택한다", () => {
  assert.match(quickGoldValueCalculatorSource, /getGoldVaultProductOptions\(effectiveRates\)/);
  assert.match(quickGoldValueCalculatorSource, /const orderedProductOptions = useMemo/);
  assert.match(quickGoldValueCalculatorSource, /PRIORITY_PRODUCT_IDS = \[/);
  assert.match(quickGoldValueCalculatorSource, /orderedProductOptions\.map\(\(option\) => \(/);
  assert.doesNotMatch(quickGoldValueCalculatorSource, /<optgroup/);
});

test("랜딩 금시세는 중복 계산기 없이 컴팩트 시세표와 전체보기로 연결한다", () => {
  assert.match(landingSource, /<GoldPriceBoard compact \/>/);
  assert.match(landingSource, /to="\/gold-price">전체 시세 보기/);
  assert.doesNotMatch(landingSource, /MY GOLD PREVIEW/);
});

test("푸터는 한국골드마켓 브랜드와 바로가기·문의 중심으로 간결하게 마감한다", () => {
  assert.match(footerSource, /한국골드마켓[\s\S]*KOREA GOLD MARKET/);
  assert.match(footerSource, /<h2>금의 가치를 이어가다<\/h2>/);
  assert.match(footerSource, /<h3>바로가기<\/h3>/);
  assert.match(footerSource, /<h3>문의 · 안내<\/h3>/);
  assert.match(footerSource, /to="\/support\/new"[\s\S]*1:1 문의/);
  assert.match(footerSource, /to="\/stores"[\s\S]*매장 안내/);
  assert.match(
    footerSource,
    /온라인 계산은 예상값이며, 최종 순도·중량·공임은 매장 확인 후 고객 동의로 확정됩니다/
  );
  assert.doesNotMatch(footerSource, /원일귀금속 직접 운영/);
  assert.doesNotMatch(footerSource, /범천동/);
  assert.doesNotMatch(footerSource, /OPERATOR\.address/);
  assert.match(footerSource, /\{OPERATOR\.company\} · 대표 \{OPERATOR\.representative\}/);
  assert.match(footerSource, /if \(isMember\)/);
  assert.match(footerSource, /<CompactFooter>/);
  assert.match(footerSource, /1:1 문의/);
});
test("로그인 유도 모달은 ESC, focus trap, scroll lock, focus restore를 유지한다", () => {
  assert.match(loginModalSource, /event\.key === "Escape"/);
  assert.match(loginModalSource, /event\.key !== "Tab"/);
  assert.match(loginModalSource, /document\.body\.style\.overflow = "hidden"/);
  assert.match(loginModalSource, /previousFocus\.focus\(\)/);
  assert.match(loginModalSource, /aria-describedby=\{messageId\}/);
});

test("포그라운드 푸시 토스트는 키보드로 열 수 있고 내부 경로만 사용한다", () => {
  assert.match(fcmSource, /normalizeInternalPath/);
  assert.match(fcmSource, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(fcmSource, /role=\{n\.clickAction \? "button" : undefined\}/);
  assert.match(fcmSource, /type="button"[\s\S]*aria-label="알림 닫기"/);
  assert.doesNotMatch(fcmSource, /window\.location\.href\s*=\s*toast\.clickAction/);
});

test("금교환 핵심 입력은 label과 control id가 연결되어 있다", () => {
  const pairs = [
    ["exchange-visit-date", "방문 날짜"],
    ["exchange-visit-time", "방문 시간"],
    ["exchange-name", "성명"],
    ["exchange-phone", "전화번호"],
    ["bar-quantity", "수량"],
  ];
  for (const [id, label] of pairs) {
    assert.match(
      goldExchangeStepsSource,
      new RegExp(`<Label htmlFor=["']${id}["']>${label}<\\/Label>`)
    );
    assert.match(goldExchangeStepsSource, new RegExp(`id=["\']${id}["\']`));
  }
  assert.match(goldExchangeStepsSource, /htmlFor=\{`product-\$\{idx\}`\}/);
  assert.match(goldExchangeStepsSource, /id=\{`product-\$\{idx\}`\}/);
  assert.match(goldExchangeStepsSource, /htmlFor=\{`quantity-\$\{idx\}`\}/);
  assert.match(goldExchangeStepsSource, /id=\{`quantity-\$\{idx\}`\}/);
});

test("신규 예약의 활성 예약 확인은 예약 그룹 요약을 우선 사용한다", () => {
  assert.match(
    goldExchangeFunctionsSource,
    /exchangeGroups\.where\("ownerUid",\s*"==",\s*uid\)/
  );
  assert.match(goldExchangeFunctionsSource, /row\.repStatus \|\| "requested"/);
  assert.match(goldExchangeFunctionsSource, /if \(userGroupsSnapshot\.empty\)/);
  assert.match(
    goldExchangeFunctionsSource,
    /legacyBookingsSnapshot = await tx\.get\(exchanges\.where\("userId",\s*"==",\s*uid\)\)/
  );
});

test("2.5 교환내역은 지난 예약을 확인 필요로 분리하고 예상·확정 중량과 부족·잔여를 명확히 구분한다", () => {
  assert.match(myExchangesSource, /attention: '확인 필요'/);
  assert.match(myExchangesSource, /visitDate < todayKey/);
  assert.match(myExchangesSource, /방문일 경과 · 확인 필요/);
  assert.match(myExchangesSource, /방문 예정일이 지났지만 완료·취소 처리가 확인되지 않았습니다/);
  assert.match(myExchangesSource, /확인 필요<\/small>/);
  assert.match(myExchangesSource, /예상 순금량 합계/);
  assert.match(myExchangesSource, /확정 순금량 합계/);
  assert.match(myExchangesSource, /부족 예상/);
  assert.match(myExchangesSource, /잔여 예상/);
  assert.match(myExchangesSource, /<summary>요청 상세정보<\/summary>/);
  assert.match(myExchangesSource, /aria-label="교환 진행 단계"/);
  assert.match(myExchangesSource, /\$variant="danger"/);
  assert.doesNotMatch(myExchangesSource, /<PlanLabel>추가 예정<\/PlanLabel>/);
  assert.doesNotMatch(myExchangesSource, />교환 중량<\/th>/);
});


test("2.6 관리자 금교환은 고객과 같은 상태 체계와 방문일 경과 확인 필요를 사용한다", async () => {
  const [adminPageSource, exchangeListSource, adminServiceSource] = await Promise.all([
    read("src/pages/admin/AdminGoldExchange.jsx"),
    read("src/components/admin/ExchangeList.jsx"),
    read("src/services/adminExchangeService.js"),
  ]);

  assert.match(adminPageSource, /요청 접수/);
  assert.match(adminPageSource, /확인 대기/);
  assert.match(adminPageSource, /예약 확정/);
  assert.match(adminPageSource, /방문 예정/);
  assert.match(adminPageSource, /매장 확인/);
  assert.match(adminPageSource, /교환 완료/);
  assert.match(adminPageSource, /status=attention/);

  assert.match(exchangeListSource, /attention: "방문일 경과 · 확인 필요"/);
  assert.match(exchangeListSource, /visitDate < todayKey/);
  assert.match(exchangeListSource, /고객 화면도 같은 기록을 “방문일 경과 · 확인 필요”로 표시합니다/);
  assert.match(exchangeListSource, /aria-label="교환 진행 단계"/);
  assert.match(exchangeListSource, /매장 확인 시작/);
  assert.match(exchangeListSource, /교환 완료/);
  assert.match(exchangeListSource, /부족 예상/);
  assert.match(exchangeListSource, /잔여 예상/);
  assert.match(exchangeListSource, /예상 순금량 합계/);
  assert.match(exchangeListSource, /const SecondaryActionButton = styled\(ActionButton\)/);
  assert.doesNotMatch(exchangeListSource, />진행 중</);

  assert.match(adminServiceSource, /if \(value === "attention"\) return \["requested", "scheduled"\]/);
  assert.match(myExchangesSource, /in_progress: '매장 확인 중'/);
});

test("2.7 매장 실측은 예상값을 보존하고 실측·동의 확정 후에만 교환 완료한다", async () => {
  const [exchangeListSource, measurementSource, customerSource, functionsSource, indexSource] = await Promise.all([
    read("src/components/admin/ExchangeList.jsx"),
    read("src/components/admin/StoreMeasurementPanel.jsx"),
    read("src/pages/MyExchanges.jsx"),
    read("functions/src/goldExchange/functions.ts"),
    read("functions/src/index.ts"),
  ]);

  assert.match(exchangeListSource, /StoreMeasurementPanel/);
  assert.match(exchangeListSource, /실측·동의 확인 필요/);
  assert.match(measurementSource, /온라인 예상값은 원본 기록으로 보존됩니다/);
  assert.match(measurementSource, /실측 중량\(g\)/);
  assert.match(measurementSource, /확정 순금량\(g\)/);
  assert.match(measurementSource, /최종 제작공임\(원\)/);
  assert.match(measurementSource, /고객이 실측 중량·확정 순금량·골드바 규격·부족\/잔여 및 최종 공임을 확인했고/);
  assert.match(measurementSource, /saveExchangeMeasurement/);

  assert.match(functionsSource, /export const saveExchangeMeasurement/);
  assert.match(functionsSource, /measurementStatus !== "confirmed"/);
  assert.match(functionsSource, /실측 결과·최종 골드바·공임을 저장하고 고객 동의를 확인한 뒤 교환 완료 처리해 주세요/);
  assert.match(functionsSource, /confirmedPureGoldG/);
  assert.match(functionsSource, /finalBarsPlan/);
  assert.match(functionsSource, /finalFeeWon/);
  assert.match(indexSource, /saveExchangeMeasurement/);

  assert.match(customerSource, /매장 실측 확정/);
  assert.match(customerSource, /최종 제작공임/);
  assert.match(customerSource, /finalBarsPlan/);
});


test("2.7.1 관리자 교환 완료는 고객 추가 확인 없이 완료 상태와 고객 알림을 함께 확정한다", async () => {
  const [exchangeListSource, customerSource, functionsSource] = await Promise.all([
    read("src/components/admin/ExchangeList.jsx"),
    read("src/pages/MyExchanges.jsx"),
    read("functions/src/goldExchange/functions.ts"),
  ]);

  assert.match(exchangeListSource, /교환 완료 확정/);
  assert.match(customerSource, /고객이 온라인에서 별도로 완료 확인할 필요는 없습니다/);
  assert.match(functionsSource, /exchange-completed-\$\{groupId\}/);
  assert.match(functionsSource, /GOLD TO GOLD 교환이 완료되었습니다/);
  assert.match(functionsSource, /tx\.set\(completionNotificationRef/);
  assert.match(functionsSource, /result\.targetUid && status !== "completed"/);
});


test("내 교환내역은 최근 그룹 요약을 먼저 읽고 펼친 그룹 상세만 구독한다", () => {
  assert.match(myExchangesSource, /const GROUP_PAGE_SIZE = 20/);
  assert.match(
    myExchangesSource,
    /where\('ownerUid',\s*'==',\s*user\.uid\)[\s\S]*orderBy\('updatedAt',\s*'desc'\)[\s\S]*limit\(GROUP_PAGE_SIZE\)/
  );
  assert.match(
    myExchangesSource,
    /where\('groupId',\s*'==',\s*groupId\)/
  );
  assert.match(myExchangesSource, /이전 교환내역 더보기/);
  assert.doesNotMatch(
    myExchangesSource,
    /const qUser = query\(collection\(db, 'goldExchanges'\), where\('userId',[\s\S]*const qGroups/,
    "일반 경로에서 제품 전체 이력과 그룹 요약을 동시에 상시 구독하면 안 됩니다."
  );
});

test("Navbar 교환 새소식은 마지막 확인 이후 최대 100개 그룹만 구독한다", () => {
  assert.match(navbarSource, /where\("updatedAt",\s*">",\s*Timestamp\.fromMillis\(lastSeenMs\)\)/);
  assert.match(navbarSource, /orderBy\("updatedAt",\s*"desc"\)/);
  assert.match(navbarSource, /limit\(100\)/);
  assert.match(navbarSource, /const menuButton = menuButtonRef\.current/);
});

test("앱 홈 다가오는 예약은 진행 상태와 오늘 이후 일정만 제한 조회한다", () => {
  assert.match(appHomeSource, /where\("repStatus",\s*"in",\s*\["requested", "scheduled", "in_progress", "교환중"\]\)/);
  assert.match(appHomeSource, /where\("visitDate",\s*">=",\s*toLocalDateKey\(\)\)/);
  assert.match(appHomeSource, /orderBy\("visitDate",\s*"asc"\)/);
  assert.match(appHomeSource, /limit\(10\)/);
});


test("앱 홈 금시세는 MY GOLD 시세 listener를 재사용하고 활성 예약을 시세보다 먼저 보여준다", () => {
  assert.doesNotMatch(appGoldPriceSummarySource, /onSnapshot|firebase\/firestore|@\/firebase\/firebase/);
  assert.match(
    appGoldPriceSummarySource,
    /export default function AppGoldPriceSummary\(\{[\s\S]*market = \{\},[\s\S]*previousMarket = \{\},[\s\S]*enabled = false,[\s\S]*priceLoading = false,[\s\S]*configLoading = false/
  );
  assert.match(goldVaultDashboardSource, /const \[marketLoading, setMarketLoading\] = useState\(true\)/);
  assert.match(goldVaultDashboardSource, /const \[publicPriceLoading, setPublicPriceLoading\] = useState\(true\)/);
  assert.match(appHomeSource, /market=\{myGoldDashboard\.market\}/);
  assert.match(appHomeSource, /previousMarket=\{myGoldDashboard\.previousMarket\}/);
  assert.match(appHomeSource, /enabled=\{myGoldDashboard\.publicPriceEnabled\}/);
  assert.match(appHomeSource, /priceLoading=\{myGoldDashboard\.marketLoading\}/);
  assert.match(appHomeSource, /configLoading=\{myGoldDashboard\.publicPriceLoading\}/);

  const myGoldIndex = appHomeSource.indexOf("<AppMyGoldDashboard");
  const reservationIndex = appHomeSource.indexOf("<ReservationCard to=\"/my-exchanges\"");
  const goldPriceIndex = appHomeSource.indexOf("<AppGoldPriceSummary");
  assert.ok(reservationIndex >= 0 && myGoldIndex > reservationIndex && goldPriceIndex > myGoldIndex);
});

test("GoldExchange 진입 모드는 URL을 기준으로 한 곳에서 상태를 전환한다", () => {
  assert.match(
    goldExchangeSource,
    /const entryMode = explicitEntryMode \|\| \(importedFromMyGold \? "vault" : ""\)/
  );
  assert.match(goldExchangeSource, /const previousEntryModeRef = useRef\(entryMode\)/);
  assert.match(goldExchangeSource, /if \(previousMode === entryMode\) return/);
  assert.match(goldExchangeSource, /if \(entryMode === "manual"\)[\s\S]*setProducts\(getInitialExchangeProductsFromSearch\(location\.search\)\)[\s\S]*setStep\(STEP\.CALC\)/);
  assert.match(goldExchangeSource, /if \(entryMode === "vault"\)[\s\S]*setVaultImportedCount\(initialVaultProductsRef\.current\.length\)/);
  assert.match(goldExchangeSource, /const fromVault =[\s\S]*entryMode === "vault"/);

  const chooseStartMethodSection = goldExchangeSource.match(
    /const chooseStartMethod = \(mode\) => \{[\s\S]*?\n  \};/
  )?.[0] || "";
  assert.match(chooseStartMethodSection, /nextMode === "vault"[\s\S]*\/gold-exchange\?mode=vault&auto=1/);
  assert.match(chooseStartMethodSection, /navigate\(nextPath, \{ state: null \}\)/);
  assert.doesNotMatch(chooseStartMethodSection, /setProducts|setCalculated|setStep|setVaultImportedCount/);
  assert.match(goldExchangeSource, /!showStartMethod && step === STEP\.CALC/);
  assert.match(goldExchangeSource, /!showStartMethod && step === STEP\.BARS/);
  assert.match(goldExchangeSource, /!showStartMethod && step === STEP\.RESERVE/);
  assert.match(goldExchangeSource, /!showStartMethod && step === STEP\.DONE/);
});


test("GoldExchange 효과 의존성은 URL mode와 환산율 변경을 빠뜨리지 않는다", async () => {
  const vaultImportHookSource = await read("src/hooks/useGoldExchangeVaultImport.js");
  const marketHookIndex = goldExchangeSource.indexOf("useGoldExchangeMarketData()");
  const vaultHookIndex = goldExchangeSource.indexOf("useGoldExchangeVaultImport({");
  assert.ok(marketHookIndex >= 0 && vaultHookIndex > marketHookIndex, "vault import hook must receive market data after it is available");
  assert.match(vaultImportHookSource, /entryMode,[\s\S]*importedFromMyGold,[\s\S]*rates,[\s\S]*userId,[\s\S]*\]\);/);
  assert.match(
    goldExchangeSource,
    /authDraft,[\s\S]*directReservationRequested,[\s\S]*entryMode,[\s\S]*importedFromMyGold,[\s\S]*isRebook,[\s\S]*location\.search,[\s\S]*user\?\.uid,[\s\S]*\]\);/
  );
});

test("MY GOLD 비동기 불러오기는 레거시 goldType만 있어도 제품 선택값을 복원한다", async () => {
  const vaultImportHookSource = await read("src/hooks/useGoldExchangeVaultImport.js");
  assert.match(
    vaultImportHookSource,
    /importVaultItemsToExchangeProducts\([\s\S]*items,[\s\S]*rates,[\s\S]*maxProducts/
  );
  assert.match(
    goldExchangeFormSource,
    /const policy = findGoldProduct\(rates, \{[\s\S]*productId: item\?\.productId,[\s\S]*goldType: item\?\.goldType,[\s\S]*\}\)/
  );
  assert.match(
    goldExchangeFormSource,
    /productId: policy\?\.id \|\| item\?\.productId \|\| ""/
  );
  assert.match(
    goldExchangeFormSource,
    /productName: policy\?\.displayName \|\| item\?\.productName \|\| ""/
  );
  assert.match(
    goldExchangeFormSource,
    /calculationMethod: policy\?\.calculationMethod \|\| ""/
  );
});

test("GoldExchange 원격 읽기와 프로필 초기값은 전용 hook으로 분리한다", () => {
  assert.match(goldExchangeSource, /from "@\/hooks\/useGoldExchangeRemoteData"/);
  assert.match(goldExchangeSource, /const \{ rates, pureGoldBuyPricePerDon \} = useGoldExchangeMarketData\(\)/);
  assert.match(goldExchangeSource, /const status = useGoldExchangeStatus\(exchangeId\)/);
  assert.match(goldExchangeSource, /useGoldExchangeProfileDefaults\(user, setName, setPhone\)/);
  assert.doesNotMatch(goldExchangeSource, /from "firebase\/firestore"|fetchMyProfile|subscribeGoldRates/);
  assert.match(goldExchangeRemoteDataSource, /export function useGoldExchangeMarketData/);
  assert.match(goldExchangeRemoteDataSource, /subscribeGoldRates\(/);
  assert.match(goldExchangeRemoteDataSource, /doc\(db, "goldPrices", "current"\)/);
  assert.match(goldExchangeRemoteDataSource, /export function useGoldExchangeStatus/);
  assert.match(goldExchangeRemoteDataSource, /doc\(db, "goldExchangeGroups", exchangeId\)/);
  assert.match(goldExchangeRemoteDataSource, /export function useGoldExchangeProfileDefaults/);
  assert.match(goldExchangeRemoteDataSource, /fetchMyProfile\(user\.uid\)/);
  assert.doesNotMatch(goldExchangeRemoteDataSource, /submitGoldExchangeGroup|setProducts|saveGoldExchangeDraft/);
  assert.ok(goldExchangeSource.split("\n").length < 780, "GoldExchange.jsx가 원격 읽기 effect를 다시 끌어안으면 안 됩니다.");
});

test("GoldExchange 제품 폼과 계산 보조 로직은 순수 모듈로 분리한다", () => {
  assert.match(goldExchangeSource, /from "@\/lib\/goldExchangeForm"/);
  assert.match(goldExchangeFormSource, /export function createEmptyExchangeProduct/);
  assert.match(goldExchangeFormSource, /export function normalizeExchangeProducts/);
  assert.match(goldExchangeFormSource, /export function getInitialExchangeProductsFromSearch/);
  assert.match(goldExchangeFormSource, /export function importVaultItemsToExchangeProducts/);
  assert.match(goldExchangeFormSource, /export function syncExchangeProductsWithRates/);
  assert.match(goldExchangeFormSource, /export function validateExchangeProductsForCalculation/);
  assert.match(goldExchangeFormSource, /export function applyExchangeFinalWeights/);
  assert.match(goldExchangeFormSource, /export function buildReservationProducts/);
  assert.doesNotMatch(goldExchangeFormSource, /useState|useEffect|onSnapshot|submitGoldExchangeGroup/);
  assert.match(goldExchangeSource, /validateExchangeProductsForCalculation\(products/);
  assert.match(goldExchangeSource, /applyExchangeFinalWeights\(prev/);
  assert.match(goldExchangeSource, /buildReservationProducts\(products\)/);
});

test("GoldExchange 화면과 제품 보조 로직은 모듈화하고 예약 제출은 페이지에 남긴다", () => {
  assert.match(goldExchangeSource, /from "@\/components\/goldExchange\/GoldExchangeSteps"/);
  assert.match(goldExchangeSource, /from "@\/components\/goldExchange\/GoldExchange\.styles"/);
  assert.match(goldExchangeSource, /from "@\/components\/goldExchange\/goldExchangeUi"/);
  assert.ok(goldExchangeSource.split("\n").length < 780, "GoldExchange.jsx가 순수 계산 로직을 다시 끌어안으면 안 됩니다.");
  assert.match(goldExchangeSource, /useGoldExchangeAutoVault/);
  assert.match(goldExchangeSource, /submitGoldExchangeGroup/);
  assert.match(goldExchangeSource, /goldExchangeForm/);
  assert.doesNotMatch(goldExchangeStepsSource, /submitGoldExchangeGroup|computeGoldPolicyResult/);
  assert.match(goldExchangeStepsSource, /export function CalcStep/);
  assert.match(goldExchangeStepsSource, /export function BarStep/);
  assert.match(goldExchangeStepsSource, /export function ReserveStep/);
  assert.match(goldExchangeStepsSource, /export function DoneStep/);
  assert.match(goldExchangeStylesSource, /export const Card = styled\.div/);
  assert.match(goldExchangeUiSource, /export const BAR_GROUPS =/);
});

test("GoldExchange 재계산과 골드바 예약계획은 순수 helper로 유지한다", () => {
  assert.match(goldExchangeFormSource, /export function recalculateExchangeProducts/);
  assert.match(goldExchangeFormSource, /export function getExchangeTotals/);
  assert.match(goldExchangeFormSource, /computeGoldPolicyResult/);
  assert.match(goldExchangeUiSource, /export const buildGoldBarPlan/);
  assert.match(goldExchangeUiSource, /const maxSelectableQty = Math\.max/);
  assert.match(goldExchangeUiSource, /autoBreakdown: extraCombo\.items\.map/);
  assert.match(goldExchangeSource, /recalculateExchangeProducts\(prev, \{ rates, pureGoldBuyPricePerDon \}\)/);
  assert.match(goldExchangeSource, /const \{ totalGrams, totalDon \} = getExchangeTotals\(products\)/);
  assert.match(goldExchangeSource, /buildGoldBarPlan\(\{/);
  assert.doesNotMatch(goldExchangeSource, /computeGoldPolicyResult|breakdownByDenoms|const totalGramsRaw/);
  assert.doesNotMatch(goldExchangeFormSource, /useState|useEffect|onSnapshot|submitGoldExchangeGroup/);
});



test("MY GOLD page keeps behavior together while page-only styles stay separate", () => {
  assert.match(myGoldVaultSource, /from "@\/components\/myGoldVault\/MyGoldVault\.styles"/);
  assert.doesNotMatch(myGoldVaultSource, /styled-components|const viewEnter = keyframes/);
  assert.ok(
    myGoldVaultSource.split("\n").length < 1320,
    "MyGoldVault.jsx should not pull page-only styles or duplicated dashboard calculations back into the page."
  );
  assert.match(myGoldVaultSource, /createGoldVaultItem/);
  assert.match(myGoldVaultSource, /updateGoldVaultItem/);
  assert.match(myGoldVaultSource, /deleteGoldVaultItem/);
  assert.match(myGoldVaultSource, /const compareHistory = async \(\) =>/);
  assert.match(myGoldVaultStylesSource, /export const Page = styled\.div/);
  assert.match(myGoldVaultStylesSource, /export const FormOverlay = styled\.div/);
  assert.match(myGoldVaultStylesSource, /export const ItemCard = styled\.article/);
  assert.doesNotMatch(
    myGoldVaultStylesSource,
    /firebase\/firestore|createGoldVaultItem|useState|useEffect/,
    "The styles module must stay presentation-only."
  );
});

test("MY GOLD account and guest dashboards share vault calculations and history reads", () => {
  assert.match(goldVaultCatalogSource, /export function enrichGoldVaultItems/);
  assert.match(goldVaultCatalogSource, /export function summarizeGoldVaultItems/);
  assert.match(goldVaultDashboardSource, /enrichGoldVaultItems\(items, \{/);
  assert.match(goldVaultDashboardSource, /summarizeGoldVaultItems\(enrichedItems\)/);
  assert.match(myGoldVaultSource, /enrichGoldVaultItems\(guestRawItems, \{/);
  assert.match(myGoldVaultSource, /summarizeGoldVaultItems\(guestItems\)/);
  assert.match(myGoldVaultSource, /getGoldPriceAtOrBefore\(key\)/);
  assert.match(goldPriceHistoryServiceSource, /export async function getGoldPriceAtOrBefore/);
  assert.doesNotMatch(
    myGoldVaultSource,
    /from "firebase\/firestore"|doc\(db, "goldPriceHistory"/,
    "MyGoldVault should use the shared history service instead of opening duplicate Firestore reads."
  );
});



test("Settings keeps account actions in the page and isolates the notification feature", async () => {
  const [pageSource, stylesSource, notificationsSource] = await Promise.all([
    readFile(new URL("../src/pages/Settings.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/settings/Settings.styles.js", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../src/components/settings/SettingsNotificationsSection.jsx",
        import.meta.url
      ),
      "utf8"
    ),
  ]);

  assert.match(pageSource, /export default function Settings\(\)/);
  assert.match(pageSource, /handleDeleteAccount/);
  assert.match(pageSource, /handlePasswordSubmit/);
  assert.match(pageSource, /<SettingsNotificationsSection user=\{user\} \/>/);
  assert.doesNotMatch(pageSource, /registerForPush|getNotificationPreferences|collectPushDiagnostics/);
  assert.doesNotMatch(pageSource, /styled-components/);
  assert.ok(
    pageSource.split("\n").length < 750,
    "Settings.jsx should stay focused on account/security orchestration."
  );

  assert.match(
    notificationsSource,
    /export default function SettingsNotificationsSection\(\{ user \}\)/
  );
  assert.match(notificationsSource, /getNotificationPreferences/);
  assert.match(notificationsSource, /registerForPush/);
  assert.match(notificationsSource, /collectPushDiagnostics/);
  assert.match(notificationsSource, /sendCurrentDevicePushTest/);
  assert.doesNotMatch(
    notificationsSource,
    /handleDeleteAccount|reauthenticateWithCredential|callDeleteMyAccount/
  );

  assert.match(stylesSource, /export const Container = styled\.div/);
  assert.match(stylesSource, /export const SettingLink = styled\(Link\)/);
});


test("GoldPrice keeps public price behavior together while page-only styles stay separate", async () => {
  const [pageSource, stylesSource] = await Promise.all([
    read("src/pages/GoldPrice.jsx"),
    read("src/components/goldPrice/GoldPrice.styles.js"),
  ]);

  assert.match(pageSource, /from "@\/components\/goldPrice\/GoldPrice\.styles"/);
  assert.doesNotMatch(pageSource, /styled-components|livingGoldGlint|livingGoldReveal/);
  assert.ok(
    pageSource.split("\n").length < 900,
    "GoldPrice.jsx should keep page behavior without pulling page-only styles back in."
  );
  assert.match(pageSource, /doc\(db, "goldPrices", "current"\)/);
  assert.match(pageSource, /doc\(db, "goldPricePublic", "config"\)/);
  assert.match(pageSource, /registerForPush/);
  assert.match(pageSource, /saveMarketingNotificationConsent/);

  assert.match(stylesSource, /export const Page = styled\.div/);
  assert.match(stylesSource, /export const PriceCard = styled\.article/);
  assert.match(stylesSource, /export const AlertCard = styled\.div/);
  assert.match(stylesSource, /export const CrossLink = styled\(Link\)/);
  assert.doesNotMatch(
    stylesSource,
    /firebase\/firestore|onSnapshot|registerForPush|useState|useEffect/,
    "GoldPrice styles must stay presentation-only."
  );
});

test("오래 열린 웹 탭의 지연 로딩 실패는 한 번만 복구하고 오류 화면에 재시도 동작을 제공한다", async () => {
  const [mainSource, appSource, hostingSource] = await Promise.all([
    read("src/main.jsx"),
    read("src/App.jsx"),
    read("firebase.json"),
  ]);

  assert.match(mainSource, /vite:preloadError/);
  assert.match(mainSource, /isWeb && import\.meta\.env\.PROD/);
  assert.match(mainSource, /navigator\.onLine === false/);
  assert.match(mainSource, /sessionStorage\.getItem\(PRELOAD_RECOVERY_KEY\)/);
  assert.match(mainSource, /PRELOAD_RECOVERY_WINDOW_MS = 30 \* 1000/);
  assert.match(mainSource, /event\.preventDefault\(\)/);
  assert.match(mainSource, /window\.location\.reload\(\)/);

  assert.match(appSource, /useRouteError/);
  assert.match(appSource, /isDynamicImportLoadError/);
  assert.match(appSource, /최신 화면 다시 불러오기/);
  assert.match(appSource, /window\.history\.back\(\)/);

  const hosting = JSON.parse(hostingSource);
  const indexHeaders = hosting.hosting.headers.find(
    (entry) => entry.source === "/index.html"
  );
  assert.ok(indexHeaders, "index.html cache policy must stay explicit.");
  assert.ok(
    indexHeaders.headers.some(
      (header) =>
        header.key === "Cache-Control" &&
        String(header.value).toLowerCase() === "no-cache"
    ),
    "index.html must remain no-cache so a recovery reload can pick up current chunks."
  );
});

test("핵심 웹 모달은 키보드 포커스를 가두고 닫힌 뒤 원래 위치로 돌려준다", async () => {
  const [layoutSource, myGoldSource, exchangeStepsSource] = await Promise.all([
    read("src/components/common/MainLayout.jsx"),
    read("src/pages/MyGoldVault.jsx"),
    read("src/components/goldExchange/GoldExchangeSteps.jsx"),
  ]);

  assert.match(layoutSource, /role="status"/);
  assert.match(layoutSource, /aria-live="polite"/);
  assert.match(layoutSource, /화면을 불러오는 중입니다/);

  assert.match(myGoldSource, /const formDialogRef = useRef\(null\)/);
  assert.match(myGoldSource, /event\.key !== "Tab" \|\| !dialog/);
  assert.match(myGoldSource, /previousFocus\?\.focus\?\.\(\)/);
  assert.match(myGoldSource, /<FormSheet ref=\{formDialogRef\} role="dialog"/);

  assert.match(exchangeStepsSource, /const privacyDialogRef = useRef\(null\)/);
  assert.match(exchangeStepsSource, /event\.key !== "Tab" \|\| !dialog/);
  assert.match(exchangeStepsSource, /previousFocus\.focus\(\)/);
  assert.match(exchangeStepsSource, /ref=\{privacyDialogRef\}[\s\S]*?role="dialog"/);
});

test("관리자 금교환 검색은 펼치지 않은 그룹의 상세 검색값도 필요할 때만 불러온다", async () => {
  const source = await read("src/components/admin/ExchangeList.jsx");

  assert.match(source, /if \(!qText\.trim\(\)\) return;/);
  assert.match(source, /const missingGroups = groups\.filter/);
  assert.match(source, /void ensureDetails\(group\.id\)/);
  assert.match(source, /const searchDetailsPending = useMemo/);
  assert.match(source, /요청자·전화·제품 검색 정보를 불러오는 중/);
  assert.match(
    source,
    /activeGroups\.map\(async \(group\) => \{[\s\S]*?fetchAdminExchangeGroupItems\(group\.id\)/,
    "Today reservations should keep their existing loading path in this search-only patch."
  );
});

test("개발 백업은 lint 대상에서 제외되고 필요한 교환 그룹 인덱스가 선언돼 있다", () => {
  assert.match(eslintSource, /'_patch_backups\/\*\*'/);
  const indexes = JSON.parse(indexesSource);
  const fieldsFor = (index) => index.fields.map((field) => `${field.fieldPath}:${field.order || field.arrayConfig}`);
  const groupIndexes = indexes.indexes
    .filter((index) => index.collectionGroup === "goldExchangeGroups")
    .map(fieldsFor);
  assert.ok(groupIndexes.some((fields) => fields.join("|") === "ownerUid:ASCENDING|updatedAt:DESCENDING"));
  assert.ok(groupIndexes.some((fields) => fields.join("|") === "ownerUid:ASCENDING|repStatus:ASCENDING|visitDate:ASCENDING"));
});

test("운영 오류 모니터링은 공통 계층에서 React Router, ErrorBoundary, preload 복구를 수집한다", async () => {
  const [mainSource, appSource, boundarySource, monitoringSource, privacySource, viteSource] =
    await Promise.all([
      read("src/main.jsx"),
      read("src/App.jsx"),
      read("src/components/common/ErrorBoundary.jsx"),
      read("src/monitoring/operationalMonitoring.js"),
      read("src/monitoring/privacy.js"),
      read("vite.config.js"),
    ]);

  assert.match(mainSource, /initializeOperationalMonitoring/);
  assert.match(mainSource, /createFirebaseMonitoringTransport/);
  assert.match(mainSource, /queueOperationalError\(preloadError/);
  assert.match(appSource, /captureOperationalError\(error \|\| "React Router route error"/);
  assert.match(boundarySource, /captureOperationalError\(error/);
  assert.doesNotMatch(boundarySource, /globalThis\?\.Sentry|captureException/);

  assert.match(monitoringSource, /MAX_EVENTS_PER_MINUTE = 6/);
  assert.match(monitoringSource, /MAX_EVENTS_PER_SESSION = 30/);
  assert.match(monitoringSource, /DEDUPE_WINDOW_MS = 30 \* 1000/);
  assert.match(monitoringSource, /window\.addEventListener\("unhandledrejection"/);
  assert.match(privacySource, /sanitizeRoute/);
  assert.match(privacySource, /SENSITIVE_QUERY_PATTERN/);
  assert.match(viteSource, /import\.meta\.env\.VITE_KGM_RELEASE/);
  assert.match(viteSource, /git", \["rev-parse", "--short=12", "HEAD"\]/);
});

test("클라이언트 오류 Cloud Function은 개인정보 대신 구조화 진단값만 제한적으로 기록한다", async () => {
  const [reporterSource, loggerSource, indexSource] = await Promise.all([
    read("functions/src/monitoring/clientErrorReporting.ts"),
    read("functions/src/monitoring/structuredLogger.ts"),
    read("functions/src/index.ts"),
  ]);

  assert.match(reporterSource, /enforceAppCheck:\s*ENFORCE_APP_CHECK/);
  assert.match(reporterSource, /maxInstances:\s*3/);
  assert.match(reporterSource, /RATE_LIMIT_PER_CLIENT = 30/);
  assert.match(reporterSource, /authenticated:\s*Boolean\(request\.auth\?\.uid\)/);
  assert.match(reporterSource, /appCheck:\s*request\.app \? "valid" : "missing"/);
  assert.match(reporterSource, /\[redacted-email\]/);
  assert.match(reporterSource, /\[redacted-phone\]/);
  assert.doesNotMatch(reporterSource, /getFirestore|collection\(|addDoc|setDoc/);
  assert.match(loggerSource, /kgmMonitoring:\s*\{/);
  assert.match(loggerSource, /schemaVersion:\s*1/);
  assert.match(indexSource, /reportClientError/);
});


test("관리자 문의는 관리자 레이아웃 안에서 열고 답변 후 관리자 목록으로 돌아간다", async () => {
  const [appSource, listSource, detailSource] = await Promise.all([
    read("src/App.jsx"),
    read("src/pages/admin/AdminInquiries.jsx"),
    read("src/pages/InquiryDetail.jsx"),
  ]);

  assert.match(appSource, /path: "support\/:postId", element: <InquiryDetail \/>/);
  assert.match(listSource, /navigate\(`\/admin\/support\/\$\{post\.id\}`\)/);
  assert.match(detailSource, /location\.pathname\.startsWith\("\/admin\/"\)/);
  assert.match(detailSource, /const listPath = adminContext \? "\/admin\/support" : "\/support"/);
  assert.match(detailSource, /navigate\(listPath\)/);
});

test("문의 오류는 브라우저 alert 대신 화면 안에서 복구 가능한 상태로 보여준다", async () => {
  const [mySource, detailSource] = await Promise.all([
    read("src/pages/MyInquiries.js"),
    read("src/pages/InquiryDetail.jsx"),
  ]);

  assert.doesNotMatch(mySource, /\balert\s*\(/);
  assert.match(mySource, /<ErrorNotice role="alert">\{error\}<\/ErrorNotice>/);
  assert.match(detailSource, /setActionError\(error\?\.message \|\| "답변을 저장하지 못했습니다\."\)/);
  assert.match(detailSource, /<ErrorNotice role="alert">\{actionError\}<\/ErrorNotice>/);
});

test("관리자 대시보드는 금교환 요청과 답변 대기 문의를 모두 우선 업무로 노출한다", async () => {
  const source = await read("src/pages/AdminDashboard.jsx");

  assert.match(source, /aria-label="우선 처리 업무"/);
  assert.match(source, /신규 금교환 요청 \{pendingGoldExchangeCount\}건/);
  assert.match(source, /답변 대기 문의 \{pendingInquiryCount\}건/);
  assert.match(source, /<UrgentCard to="support" \$warning>/);
});

test("관리자 통계는 최근 1000건 표본과 종결 건 완료율을 명확히 구분한다", async () => {
  const source = await read("src/pages/admin/StatisticsDashboard.jsx");

  assert.match(source, /limit\(1000\)/);
  assert.match(source, /분석 대상 금교환/);
  assert.match(source, /종결 건 완료율/);
  assert.match(source, /const terminalCount = completed \+ canceled \+ rejected/);
  assert.match(source, /terminalCount \? \(completed \/ terminalCount\) \* 100 : 0/);
  assert.match(source, /실서비스 전체 누적 건수|서비스 전체 누적 건수/);
  assert.match(source, /role="alert"/);
});

test("관리자 감사 로그는 교환 외 회원 권한·정지·알림 발송도 사람이 읽을 수 있게 표시한다", async () => {
  const source = await read("src/pages/admin/AdminAuditLogs.jsx");

  assert.match(source, /user_role_changed: "회원 권한 변경"/);
  assert.match(source, /user_disabled: "회원 계정 정지"/);
  assert.match(source, /user_enabled: "회원 계정 복구"/);
  assert.match(source, /manual_notification_sent: "관리자 알림 발송"/);
  assert.match(source, /item\.targetUid/);
  assert.match(source, /item\.batchId/);
  assert.match(source, /item\.recipientCount/);
});

test("404 화면은 한국어 안내와 홈·이전 화면 복구 동작을 제공한다", async () => {
  const source = await read("src/pages/NotFound.jsx");

  assert.match(source, /페이지를 찾을 수 없습니다/);
  assert.match(source, /<HomeLink to="\/">홈으로 가기<\/HomeLink>/);
  assert.match(source, /window\.history\.back\(\)/);
});

test("비회원 랜딩은 첫 체험에 집중하고 GOLD TO GOLD와 실측 신뢰를 하나의 섹션으로 묶는다", async () => {
  const [landingSource, reviewSource] = await Promise.all([
    read("src/pages/LandingPage.jsx"),
    read("src/components/reviews/VerifiedReviewSection.jsx"),
  ]);

  assert.doesNotMatch(landingSource, /MyGoldTicker|ExchangeBand|TrustGrid/);
  assert.match(landingSource, /<QuickGoldValueCalculator source="landing"/);
  assert.match(landingSource, /<ExchangeTrust aria-labelledby="exchange-trust-title">/);
  assert.match(landingSource, /<VerifiedReviewSection compact showInquiryAction=\{false\} \/>/);

  const priceIndex = landingSource.indexOf('<CompactSection aria-labelledby="live-title">');
  const exchangeIndex = landingSource.indexOf('<ExchangeTrust aria-labelledby="exchange-trust-title">');
  const reviewIndex = landingSource.indexOf('<CompactSection aria-label="교환 완료 고객 후기">');
  assert.ok(priceIndex >= 0 && exchangeIndex > priceIndex && reviewIndex > exchangeIndex);

  assert.match(reviewSource, /VerifiedReviewSection\(\{ compact = false, showInquiryAction = true \}\)/);
});

test("랜딩 마지막 CTA와 푸터는 홈에서 자연스럽게 이어진다", async () => {
  const [landingSource, footerSource] = await Promise.all([
    read("src/pages/LandingPage.jsx"),
    read("src/components/common/Footer.jsx"),
  ]);

  assert.match(landingSource, /<Final aria-labelledby="final-title">/);
  assert.match(landingSource, /MY GOLD 시작하기/);
  assert.match(footerSource, /const \{ pathname \} = useLocation\(\)/);
  assert.match(footerSource, /const joinLanding = pathname === "\/"/);
});

test("앱 홈 다크모드는 MY GOLD 이동 대비를 보강하고 검증 후기를 컴팩트하게 유지한다", async () => {
  const [homeSource, myGoldSource, reviewSectionSource, reviewListSource] = await Promise.all([
    read("src/pages/AppHome.jsx"),
    read("src/components/gold/AppMyGoldDashboard.jsx"),
    read("src/components/reviews/VerifiedReviewSection.jsx"),
    read("src/components/reviews/GoldExchangeReviewList.jsx"),
  ]);

  assert.match(homeSource, /<VerifiedReviewSection compact showInquiryAction=\{false\} \/>/);
  assert.ok(myGoldSource.includes("color-mix(in srgb, ${({ theme }) => theme.colors.gold} 62%, white)"));
  assert.ok(myGoldSource.includes("font-weight: 950;"));
  assert.ok(reviewSectionSource.includes('gap: ${({ $compact }) => ($compact ? "7px" : "18px")};'));
  assert.ok(reviewSectionSource.includes('min-height: ${({ $compact }) => ($compact ? "32px" : "39px")};'));
  assert.ok(reviewListSource.includes('$preview && $compact ? "9px 11px"'));
  assert.ok(reviewListSource.includes('$compact && $preview ? "0.76rem"'));
  assert.ok(reviewListSource.includes('<CardStars $compact={compact}'));
  assert.ok(reviewListSource.includes('<Verified $compact={compact}>'));
});

test("앱 홈 컴팩트 후기에서는 검증 설명을 반복하지 않고 전체 후기 화면에는 유지한다", async () => {
  const reviewSectionSource = await read("src/components/reviews/VerifiedReviewSection.jsx");

  assert.ok(
    reviewSectionSource.includes(
      '{!compact ? <p>실제 금교환이 완료된 고객이 남긴 후기만 공개됩니다.</p> : null}'
    )
  );
  assert.match(reviewSectionSource, /실제로 가치를 이어간 고객들/);
  assert.match(reviewSectionSource, /VERIFIED REVIEW/);
});


test("2.8.3 교환 완료 트랜잭션은 모든 Firestore 읽기 뒤에 완료 알림을 원자 기록한다", async () => {
  const source = await read("functions/src/goldExchange/functions.ts");
  const functionStart = source.indexOf("export const setExchangeGroupStatus");
  const transactionStart = source.indexOf("const result = await db().runTransaction", functionStart);
  const transactionEnd = source.indexOf("if (!result.changed)", transactionStart);

  assert.ok(functionStart >= 0 && transactionStart > functionStart && transactionEnd > transactionStart);

  const transactionSource = source.slice(transactionStart, transactionEnd);
  const notificationIndex = transactionSource.indexOf("exchange-completed-${groupId}");
  const lastReadIndex = transactionSource.lastIndexOf("tx.get(");

  assert.ok(notificationIndex > 0, "완료 알림 트랜잭션 기록이 있어야 합니다.");
  assert.ok(lastReadIndex >= 0, "트랜잭션 read가 있어야 합니다.");
  assert.ok(
    notificationIndex > lastReadIndex,
    "Firestore transaction의 완료 알림 write는 모든 tx.get read 뒤에 있어야 합니다."
  );
  assert.match(source, /if \(result\.targetUid && status !== "completed"\)/);
});

test("2.8.3 프로필 저장은 보조 Auth 프로필 동기화를 기다리지 않고 즉시 완료 UI로 전환한다", async () => {
  const source = await read("src/pages/Profile.jsx");
  const submitStart = source.indexOf("const handleProfileSubmit = async");
  const submitEnd = source.indexOf("const handleEmailChangeRequest", submitStart);
  const submitSource = source.slice(submitStart, submitEnd);

  const editingDoneIndex = submitSource.indexOf("setEditing(false)");
  const backgroundSyncIndex = submitSource.indexOf("void updateAuthProfile");

  assert.ok(editingDoneIndex >= 0);
  assert.ok(backgroundSyncIndex > editingDoneIndex);
  assert.doesNotMatch(submitSource, /await updateAuthProfile/);
  assert.match(submitSource, /Auth 프로필 동기화 지연/);
});


test("2.8.5 PC MY 계정 드롭다운은 메인 콘텐츠보다 높은 stacking context에서 실제 클릭 가능하게 유지한다", async () => {
  const [navbarSource, layoutSource, memberE2ESource] = await Promise.all([
    read("src/components/common/Navbar.jsx"),
    read("src/components/common/MainLayout.jsx"),
    read("tests/e2e/specs/full-member-journey.spec.mjs"),
  ]);

  assert.match(navbarSource, /const Header = styled\.header`[\s\S]*z-index: 1400;[\s\S]*overflow: visible;[\s\S]*isolation: isolate;/);
  assert.match(navbarSource, /const AccountMenuWrap = styled\.div`[\s\S]*z-index: 1450;/);
  assert.match(navbarSource, /const AccountMenu = styled\.div`[\s\S]*z-index: 1500;[\s\S]*pointer-events: auto;/);
  assert.match(layoutSource, /const MainContent = styled\.main`[\s\S]*position: relative;[\s\S]*z-index: 0;/);
  assert.match(memberE2ESource, /document\.elementFromPoint/);
  assert.match(memberE2ESource, /await clickByRealPointer\(page, profileMenuItem\)/);
});


test("2.8.6 로그인·화면 전환 직후 MY 메뉴 클릭은 지연된 route effect에 다시 닫히지 않는다", async () => {
  const [navbarSource, memberE2ESource] = await Promise.all([
    read("src/components/common/Navbar.jsx"),
    read("tests/e2e/specs/full-member-journey.spec.mjs"),
  ]);

  assert.match(
    navbarSource,
    /import React, \{ useEffect, useLayoutEffect, useMemo, useRef, useState \} from "react";/
  );
  assert.match(
    navbarSource,
    /useLayoutEffect\(\(\) => \{\s*setDrawerOpen\(false\);\s*setAccountMenuOpen\(false\);\s*\}, \[location\.pathname, location\.search\]\);/
  );
  assert.doesNotMatch(
    navbarSource,
    /useEffect\(\(\) => \{\s*setDrawerOpen\(false\);\s*setAccountMenuOpen\(false\);\s*\}, \[location\.pathname, location\.search\]\);/
  );
  assert.match(memberE2ESource, /toHaveAttribute\("aria-expanded", "true"\)/);
  assert.match(memberE2ESource, /await clickByRealPointer\(page, profileMenuItem\)/);
});
