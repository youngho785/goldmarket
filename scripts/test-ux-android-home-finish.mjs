import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("src/pages/AndroidHome.jsx");
const actions = read("src/components/home/HomePriorityActions.jsx");
const calc = read("src/components/gold/QuickGoldValueCalculator.jsx");
const dashboard = read("src/components/gold/AppMyGoldDashboard.jsx");
const member = read("src/components/gold/MemberGoldSummaryCard.jsx");
const nav = read("src/components/common/BottomNav.jsx");

const between = (start, end) => home.slice(home.indexOf(start), home.indexOf(end));

test("회원 홈에는 같은 알림·금시세 이동 카드를 중복 배치하지 않는다", () => {
  assert.match(home, /<MemberUtilities[\s\S]*<MyGoldAlertSummary/);
  assert.equal((home.match(/<MyGoldAlertSummary/g) || []).length, 1);
  assert.equal((home.match(/<PriceCard/g) || []).length, 1);
  assert.doesNotMatch(home, /<QuickAction to="\/my-gold\/alerts"/);
  assert.doesNotMatch(home, /<QuickAction to="\/gold-price"/);
  assert.match(home, /<QuickAction to="\/my-exchanges"/);
  assert.ok(home.indexOf("<HomePriorityActions") < home.indexOf("<MemberGoldSummaryCard"));
  assert.ok(home.indexOf("<MemberUtilities") < home.indexOf("<PriceCard"));
  assert.ok(home.indexOf("<PriceCard") < home.indexOf("<HomeOptionalDetails"));
});

test("주요 행동은 작은 화면에서도 나란히 표시하되 접근성을 유지한다", () => {
  assert.match(actions, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(actions, /@media \(max-width: 560px\)/);
  assert.match(actions, /:focus-visible/);
  assert.match(actions, /to="\/my-gold\/items\?add=1"/);
  assert.match(actions, /to="\/gold-exchange\?mode=vault&auto=1"/);
});

test("MY GOLD 가치는 실측 금액으로 오인되지 않게 표시하고 회원 혜택과 구분한다", () => {
  assert.match(dashboard, /기록한 금의 예상 참고가치 · 실제 금액은 실측 후 확정/);
  assert.match(member, /MY GOLD와 별도 혜택/);
  assert.match(nav, /label: "금 기록"/);
});

test("비회원 계산기는 결과 입력 전 큰 빈 카드와 비활성 저장 버튼을 숨긴다", () => {
  assert.match(calc, /\{canCalculate && \(\s*<Results/);
  assert.match(calc, /\{canCalculate && \(\s*<>[\s\S]*<Action type="button" onClick=\{continueToMyGold\}/);
  assert.equal((calc.match(/\{\(\(!compact && !webLandingExperience\) \|\| entryMode === "unknown"\) && <HelpRow>/g) || []).length, 2);
  assert.match(calc, /오늘 예상 참고가치/);
  assert.doesNotMatch(calc, /<Action type="button" disabled=\{!canCalculate\}/);
  assert.doesNotMatch(calc, /setWeightValue\("[0-9]/);
});

test("홈 개선에는 Firestore 기록·금 계산·예약 서버 로직 변경이 없다", () => {
  assert.doesNotMatch(home, /setDoc\(|updateDoc\(|addDoc\(/);
  assert.match(home, /<AppMyGoldDashboard/);
  assert.match(home, /<MemberGoldSummaryCard/);
  assert.match(home, /<HomeOptionalDetails(?:\s+[^>]*)?>/);
  assert.ok(between("<MemberUtilities", "<PriceCard").includes("<MyGoldAlertSummary"));
});
