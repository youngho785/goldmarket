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
  eslintSource,
  indexesSource,
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
  read("eslint.config.js"),
  read("firestore.indexes.json"),
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
  assert.match(bottomNavSource, /user \? MEMBER_WEB_ITEMS : GUEST_WEB_ITEMS/);
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
  assert.match(chooseStartMethodSection, /navigate\(`\/gold-exchange\?mode=\$\{nextMode\}`/);
  assert.doesNotMatch(chooseStartMethodSection, /setProducts|setCalculated|setStep|setVaultImportedCount/);
  assert.match(goldExchangeSource, /!showStartMethod && step === STEP\.CALC/);
  assert.match(goldExchangeSource, /!showStartMethod && step === STEP\.BARS/);
  assert.match(goldExchangeSource, /!showStartMethod && step === STEP\.RESERVE/);
  assert.match(goldExchangeSource, /!showStartMethod && step === STEP\.DONE/);
});


test("GoldExchange 효과 의존성은 URL mode와 환산율 변경을 빠뜨리지 않는다", () => {
  const marketHookIndex = goldExchangeSource.indexOf("useGoldExchangeMarketData()");
  const vaultEffectIndex = goldExchangeSource.indexOf('if (entryMode !== "vault" || importedFromMyGold) return undefined;');
  assert.ok(marketHookIndex >= 0 && vaultEffectIndex > marketHookIndex, "vault import effect must run after market data is available");
  assert.match(
    goldExchangeSource,
    /\}, \[entryMode, importedFromMyGold, rates, user\?\.uid\]\);/
  );
  assert.match(
    goldExchangeSource,
    /authDraft,[\s\S]*directReservationRequested,[\s\S]*entryMode,[\s\S]*importedFromMyGold,[\s\S]*isRebook,[\s\S]*location\.search,[\s\S]*user\?\.uid,[\s\S]*\]\);/
  );
});

test("MY GOLD 비동기 불러오기는 레거시 goldType만 있어도 제품 선택값을 복원한다", () => {
  assert.match(
    goldExchangeSource,
    /importVaultItemsToExchangeProducts\([\s\S]*items,[\s\S]*rates,[\s\S]*MAX_PRODUCTS_PER_BOOKING/
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
  assert.ok(goldExchangeSource.split("\n").length < 720, "GoldExchange.jsx가 순수 계산 로직을 다시 끌어안으면 안 됩니다.");
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

