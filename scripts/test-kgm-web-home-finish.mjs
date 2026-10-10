import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const landing = read("src/pages/LandingPage.jsx");
const quick = read("src/components/gold/QuickGoldValueCalculator.jsx");
const price = read("src/components/gold/GoldPriceBoard.jsx");
const bottom = read("src/components/common/BottomNav.jsx");
const nativeHome = read("src/pages/AndroidHome.jsx");

test("모바일 공개 웹은 첫 화면에서 계산기를 먼저 발견하게 하고 제목 반복을 피한다", () => {
  assert.match(landing, /<MobileHeadline>내 금,/);
  assert.match(landing, /<DesktopHeadline>잠들어 있던/);
  assert.match(landing, /gap: 11px;\s*padding: 17px 13px 16px/);
  assert.match(landing, /source="landing"[\s\S]*title="내 금 가치 계산하기"/);
  assert.doesNotMatch(landing, /금 종류와 무게를 알고 있다면 바로 참고가치를/);
});

test("웹 랜딩만 14K·18K·순금 버튼을 즉시 제공하고 모르겠어요 도움말은 유지한다", () => {
  assert.match(quick, /const webLandingExperience = source === "landing"/);
  assert.match(quick, /const quickEntryExperience = appFirstExperience \|\| webLandingExperience/);
  assert.match(quick, /!quickEntryExperience && <EntryModeChooser>/);
  assert.match(quick, /quickEntryExperience \? \(\s*<QuickTypeGroup/);
  assert.match(quick, /금 종류·무게를 모르겠어요/);
  assert.match(quick, /<QuickTypeButtons role="group" aria-label="자주 선택하는 금 종류">/);
  assert.match(quick, /onClick=\{openPureTypes\}/);
  assert.match(quick, /금 종류를 모르시나요\?/);
  assert.match(quick, /무게를 모르시나요\?/);
  assert.match(quick, /<UnknownVisitLink/);
  assert.match(quick, /quickTypeGroups\.more\.map/);
});

test("g·돈 의미, 기록 저장, 매장 교환 URL은 기존 로직을 그대로 사용한다", () => {
  assert.match(quick, /weightUnit === "don" \? parsed \* DON_TO_GRAMS : parsed/);
  assert.match(quick, /const exchangeUrl = useMemo/);
  assert.match(quick, /const params = new URLSearchParams/);
  assert.match(quick, /saveGuestMyGoldItems\(\[item\]\)/);
  assert.match(quick, /<NextActions>/);
  assert.match(quick, /골드바로 바꾸면\?/);
  assert.match(quick, /실제 교환은 매장 실측·동의 후 확정/);
});

test("PC 홈페이지 제목과 계산기 행동을 구분하고 4단계 메뉴는 유지한다", () => {
  assert.match(landing, /잠들어 있던 <em>금의 가치를 발견하세요/);
  assert.match(landing, /<FlowStrip aria-label="한국골드마켓 이용 흐름">/);
  assert.match(landing, /to="\/my-gold#goldbar-goal"/);
  assert.match(landing, /const FlowStrip = styled\.section[\s\S]*@media \(max-width: 700px\)[\s\S]*display: none;/);
});

test("브랜드 스토리·실측은 한 섹션, 전용 이야기/예약/매장 링크 보존", () => {
  assert.equal((landing.match(/<ExchangeTrust aria-labelledby=/g) || []).length, 1);
  assert.doesNotMatch(landing, /<GoldToGoldStory aria-labelledby=/);
  assert.match(landing, /쓰지 않는 금의 가치를, 다시 금으로 이어갑니다/);
  assert.match(landing, /loading="lazy"/);
  assert.match(landing, /to="\/gold-exchange">예상 교환 확인/);
  assert.match(landing, /to="\/gold-to-gold">GOLD TO GOLD 이야기/);
  assert.match(landing, /to="\/stores">매장·절차 안내/);
  assert.match(landing, /고객 앞에서 현장 실측/);
  assert.match(landing, /동의 후 최종 확정/);
});

test("금시세의 오늘 기준일과 마지막 시세 등록일은 별도 항목으로 표시", () => {
  assert.match(price, /const todayKey = useKoreaTodayDate\(\)/);
  assert.match(price, /기준일 <strong>\{formatDateKey\(todayKey\)\}<\/strong>/);
  assert.match(price, /시세 등록일 <strong>\{data\.sourceDate \? formatDateKey\(data\.sourceDate\) : "확인 중"\}<\/strong>/);
  assert.match(price, /publicationTime\(data\.updatedAt\)/);
  assert.match(price, /timeZone: "Asia\/Seoul"/);
  assert.match(price, /1돈\(3\.75g\) 기준/);
  assert.match(price, /등록 시각/);
});

test("모바일 웹 하단 메뉴 높이는 축소하고 Android 전용 분기는 보호", () => {
  assert.match(bottom, /\$android\s*\? css`/);
  assert.match(bottom, /min-height: calc\(72px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(bottom, /min-height: 62px/);
  assert.match(bottom, /min-height: 60px/);
  assert.match(nativeHome, /to=\{hasMyGold \? "\/gold-to-gold" : "\/gold-exchange"\}/);
});

test("검증된 후기 한 건과 매장 정보의 균형을 맞추며 가짜 후기를 만들지 않는다", () => {
  assert.match(landing, /<VerifiedReviewSection compact showInquiryAction=\{false\} \/>/);
  assert.match(landing, /<ReviewStore>/);
  assert.match(landing, /부산 골드테마길 원일귀금속/);
  assert.match(landing, /@media \(max-width: 820px\) \{ display: none; \}/);
  assert.doesNotMatch(landing, /가상 고객|가상 후기|샘플 후기/);
});
