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
  goldExchangeFunctionsSource,
] = await Promise.all([
  read("src/hooks/usePendingGoldExchangeCount.js"),
  read("src/components/common/Navbar.jsx"),
  read("src/components/common/BottomNav.jsx"),
  read("src/components/auth/ContinueAfterLoginModal.jsx"),
  read("src/components/common/FCMNotifications.jsx"),
  read("src/pages/GoldExchange.jsx"),
  read("functions/src/goldExchange/functions.ts"),
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
      goldExchangeSource,
      new RegExp(`<Label htmlFor=["']${id}["']>${label}<\\/Label>`)
    );
    assert.match(goldExchangeSource, new RegExp(`id=["']${id}["']`));
  }
  assert.match(goldExchangeSource, /htmlFor=\{`product-\$\{idx\}`\}/);
  assert.match(goldExchangeSource, /id=\{`product-\$\{idx\}`\}/);
  assert.match(goldExchangeSource, /htmlFor=\{`quantity-\$\{idx\}`\}/);
  assert.match(goldExchangeSource, /id=\{`quantity-\$\{idx\}`\}/);
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
