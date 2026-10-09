import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const android = read("src/pages/AndroidHome.jsx");
const web = read("src/pages/AppHome.jsx");
const actions = read("src/components/home/HomePriorityActions.jsx");
const nav = read("src/components/common/BottomNav.jsx");
const disclosure = read("src/components/home/HomeOptionalDetails.jsx");
const pkg = JSON.parse(read("package.json"));

test("홈은 금 기록 회원에게 첫 행동 두 개만 우선 제시한다", () => {
  assert.match(actions, /내 금 추가하기/);
  assert.match(actions, /골드바 교환 예상/);
  assert.match(actions, /to="\/my-gold\/items\?add=1"/);
  assert.match(actions, /to="\/gold-exchange\?mode=vault&auto=1"/);
  assert.doesNotMatch(actions, /setDoc|updateDoc|addDoc|fetch\(/);
});

test("홈의 최우선 행동은 등록한 금이 있을 때만 보이고 회원혜택보다 앞에 둔다", () => {
  for (const home of [android, web]) {
    assert.match(home, /\{hasMyGold && <HomePriorityActions \/>\}/);
    assert.ok(home.indexOf("<HomePriorityActions") < home.indexOf("<MemberGoldSummaryCard"));
    assert.ok(home.indexOf("<MemberGoldSummaryCard") < home.indexOf("<AppGoldJourney"));
  }
});

test("골드바 목표는 선택적으로 펼치는 정보로 제공한다", () => {
  for (const home of [android, web]) {
    assert.match(home, /<HomeOptionalDetails>[\s\S]*<AppGoldJourney/);
  }
});

test("비회원 앱은 회원 전용 알림 카드 대신 계산과 금시세를 우선한다", () => {
  assert.match(android, /\{!user\?\.uid && \(\s*<QuickGoldValueCalculator/);
  assert.match(android, /\{user\?\.uid && \(\s*<MemberUtilities[\s\S]*<MyGoldAlertSummary/);
  assert.match(android, /<PriceCard/);
});

test("앱 회원·비회원은 금교환 및 금 추가 메뉴 위치를 공유한다", () => {
  for (const constant of ["MEMBER_ANDROID_ITEMS", "GUEST_ANDROID_ITEMS"]) {
    const items = nav.match(new RegExp(`const ${constant} = \\[([\\s\\S]*?)\\];`))?.[1];
    assert.ok(items, `missing ${constant}`);
    const routes = [...items.matchAll(/to: "([^"]+)"/g)].map((hit) => hit[1]);
    assert.equal(routes.length, 5);
    assert.equal(routes[2], "/my-gold/items?add=1");
    assert.equal(routes[3], "/gold-exchange");
  }
  assert.match(nav, /font-size: 0\.76rem/);
});

test("홈 행동 카드와 목표 펼치기는 키보드로도 접근 가능하다", () => {
  assert.match(actions, /min-height: 76px/);
  assert.match(actions, /:focus-visible/);
  assert.match(web, /<HomeOptionalDetails>/);
  assert.match(android, /<HomeOptionalDetails>/);
  assert.match(disclosure, /<summary>골드바 목표와 교환 가능량 자세히 보기<\/summary>/);
  assert.match(disclosure, /summary:focus-visible/);
  assert.match(disclosure, /\{open && children\}/);
  assert.equal(pkg.scripts["test:ux-home-priority"], "node scripts/test-ux-home-priority.mjs");
});
