import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const price = read("src/pages/GoldPrice.jsx");
const landing = read("src/pages/LandingPage.jsx");
const exchange = read("src/pages/GoldExchange.jsx");
const vault = read("src/pages/MyGoldVault.jsx");
const webMemberHome = read("src/pages/AppHome.jsx");
const navbar = read("src/components/common/Navbar.jsx");
const nativeHome = read("src/pages/AndroidHome.jsx");
const smokeHelper = read("tests/smoke/helpers/smoke.mjs");

test("웹 금시세의 히어로·24K/18K/14K 전일 대비는 고객이 팔 때 기준으로 통일", () => {
  assert.match(price, /const heroChange = changeInfo\(pureRow\?\.buy, pureRow\?\.previousBuy\)/);
  assert.match(price, /const customerSellingChange = changeInfo\(row.buy, row.previousBuy\)/);
  assert.equal((price.match(/customerSellingChange = changeInfo\(row.buy, row.previousBuy\)/g) || []).length, 2);
  assert.match(price, /팔 때 전일 대비 \$\{changeText\(customerSellingChange\)\}/);
  assert.match(price, /<MatrixCell \$first \$label>팔 때 전일<\/MatrixCell>/);
  assert.doesNotMatch(price, /sellChange = changeInfo\(row.sell, row.previousSell\)/);
});

test("웹 금시세의 첫 동작은 시세 후 가치 계산·알림 혜택·브랜드 이야기", () => {
  assert.match(price, /!isNative && \(\s*<WebActionStrip/);
  assert.match(price, /href="#web-gold-value-calculator"/);
  assert.match(price, /href="#web-gold-alerts"/);
  assert.match(price, /to="\/gold-to-gold">GOLD TO GOLD 이야기/);
  assert.match(price, /id="web-gold-value-calculator"/);
  assert.match(price, /id="web-gold-alerts"/);
  assert.match(price, /<RewardCard>/);
  assert.match(price, /<QuizButton/);
});

test("알림 활성화와 0.01g 지급 확정을 별개로 안내", () => {
  assert.match(price, /알림 수신 설정만으로 지급이 확정되지는 않습니다/);
  assert.match(price, /금시세 알림 설정하기/);
  assert.doesNotMatch(price, /금시세 알림 받고 순금 0\.01g 더 받기/);
  assert.match(price, /금시세 알림 <b>0\.01g<\/b>/);
  assert.match(price, /const notificationActive = pushStatus === "active"/);
});

test("웹 금교환은 계산 화면부터 시작하고 기존 시작방법 선택도 명시적으로 유지", () => {
  assert.match(exchange, /const webStartChoicesRequested = !isNative && requestedEntryMode === "start"/);
  assert.match(exchange, /const showStartMethod =\s*\(isNative \? !entryMode : webStartChoicesRequested\) &&/);
  assert.match(exchange, /to="\/gold-exchange\?mode=start"/);
  assert.match(exchange, /<StartMethodScreen onChoose=\{chooseStartMethod\}/);
  assert.match(exchange, /!showStartMethod && step === STEP.CALC/);
  assert.match(smokeHelper, /if \(await legacyStartButton\.isVisible\(\)\.catch\(\(\) => false\)\)/);
});

test("랜딩 골드바 목표 링크는 MY GOLD의 실제 목표 블록에 도착", () => {
  assert.match(landing, /to="\/my-gold#goldbar-goal"/);
  assert.match(vault, /id="goldbar-goal"/);
  assert.match(vault, /location.hash !== "#goldbar-goal"/);
  assert.match(vault, /scrollIntoView/);
  assert.match(vault, /MY GOLD에 금을 기록하면 예상 순금량으로 골드바 목표/);
});

test("웹 회원 홈은 목표에 바로 이동하면서 목표 상세 펼침은 유지", () => {
  assert.match(webMemberHome, /<WebGoalLink to="\/my-gold#goldbar-goal">/);
  assert.match(webMemberHome, /예상 순금 \{pureGoldG.toFixed\(2\)\}g/);
  assert.match(webMemberHome, /<HomeOptionalDetails>/);
  assert.match(webMemberHome, /<AppGoldJourney/);
});

test("웹 상단과 모바일 웹 전체 메뉴는 계산과 스토리를 분리, Android 홈은 미변경", () => {
  assert.match(navbar, /to: "\/gold-exchange", label: "금교환 계산"/);
  assert.match(navbar, /to: "\/gold-to-gold", label: "GOLD TO GOLD 이야기"/);
  assert.match(navbar, /<DrawerLink key=\{to\} to=\{to\}/);
  assert.match(navbar, /max-width: 1180px/);
  assert.match(nativeHome, /<GoldToGoldStory\s+to="\/gold-to-gold"/);
  assert.match(nativeHome, /<QuickGoldValueCalculator/);
});
