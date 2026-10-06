import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [header, bottomNav, androidUx] = await Promise.all([
  read("src/components/common/AndroidAppHeader.jsx"),
  read("src/components/common/BottomNav.jsx"),
  read("src/platform/androidUx.js"),
]);

test("Android 햄버거는 오른쪽 스와이프 닫기 제스처를 제공한다", () => {
  assert.match(header, /touch-action:\s*pan-y/);
  assert.match(header, /onPointerDown=\{handleDrawerPointerDown\}/);
  assert.match(header, /onPointerMove=\{handleDrawerPointerMove\}/);
  assert.match(header, /onPointerUp=\{finishDrawerGesture\}/);
  assert.match(header, /totalDx >= Math\.max\(72, width \* 0\.22\)/);
  assert.match(header, /velocity >= 0\.55/);
  assert.match(header, /\$dragRatio=\{drawerDragRatio\}/);
});

test("Android 하드웨어 뒤로가기는 메뉴를 먼저 닫고 홈에서는 앱을 종료한다", () => {
  assert.match(header, /addAndroidBackButtonListener/);
  assert.match(header, /if \(menuOpen\)[\s\S]*closeMenu\(\{ feedback: true \}\)/);
  assert.match(header, /if \(pathname !== "\/"\)/);
  assert.match(header, /void exitAndroidApp\(\)/);
  assert.match(androidUx, /CapacitorApp\.addListener\("backButton"/);
  assert.match(androidUx, /CapacitorApp\.exitApp\(\)/);
});

test("Android 주요 터치에는 가벼운 햅틱을 사용한다", () => {
  assert.match(header, /void hapticTap\(\)/);
  assert.match(bottomNav, /if \(isAndroid\) void hapticTap\(\)/);
  assert.match(androidUx, /Haptics\.impact\(\{ style: ImpactStyle\.Light \}\)/);
});

test("햄버거 메뉴는 MEMBER GOLD와 회원 핵심 행동을 우선한다", () => {
  assert.match(header, /if \(pathname === "\/member-gold"\) return "MEMBER GOLD"/);
  assert.match(header, /to="\/member-gold"[\s\S]*MEMBER GOLD/);
  assert.match(header, /<strong>알림함<\/strong>/);
  assert.match(header, /<strong>설정<\/strong>[\s\S]*알림·계정·보안/);
  assert.match(header, /to="\/support"[\s\S]*<strong>1:1 문의<\/strong>/);
  assert.doesNotMatch(header, /to="\/quiz\/gold-bonus"[\s\S]*금 퀵퀴즈 · 순금 0\.01g/);
});

test("Android 하단탭은 금 추가와 MY GOLD의 이중 활성 상태를 방지한다", () => {
  assert.match(
    bottomNav,
    /isAndroid && itemPath === "\/my-gold" && pathname === "\/my-gold\/items"[\s\S]*\? false/
  );
  assert.match(bottomNav, /window\.scrollTo\(\{ top: 0, behavior: "smooth" \}\)/);
});
