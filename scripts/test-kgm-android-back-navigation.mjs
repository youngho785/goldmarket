import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ANDROID_BACK_OVERLAY_EVENT,
  closeAndroidBackOverlay,
  resolveAndroidBackAction,
} from "../src/platform/androidBackRoute.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("금시세 → 금교환/홈 이동 뒤 Android Back은 금시세로 정확히 한 번 복귀한다", () => {
  // A Link pushes a new React Router history entry (idx 1 after idx 0).
  assert.equal(resolveAndroidBackAction("/gold-exchange", { idx: 1 }), "previous");
  assert.equal(resolveAndroidBackAction("/", { idx: 1 }), "previous");
});

test("홈·MY GOLD·예약·설정 등 다른 화면도 동일한 뒤로가기 정책을 따른다", () => {
  for (const pathname of ["/gold-price", "/my-gold", "/settings", "/stores", "/notifications", "/gold-to-gold"]) {
    assert.equal(resolveAndroidBackAction(pathname, { idx: 3 }), "previous", pathname);
  }
});

test("외부 링크로 바로 시작한 화면은 다른 앱 기록으로 이탈하지 않고 홈으로 돌아간다", () => {
  assert.equal(resolveAndroidBackAction("/gold-exchange", { idx: 0 }), "home");
  assert.equal(resolveAndroidBackAction("/gold-price", null), "home");
  assert.equal(resolveAndroidBackAction("/", { idx: 0 }), "background");
});

test("메뉴가 열려 있으면 뒤로가기를 소비하고 하위 페이지를 건드리지 않는다", () => {
  const target = new EventTarget();
  target.addEventListener(ANDROID_BACK_OVERLAY_EVENT, (event) => event.preventDefault());
  assert.equal(closeAndroidBackOverlay(target), true);
  assert.equal(closeAndroidBackOverlay(new EventTarget()), false);
});

test("Android backButton 등록은 앱 전체에 정확히 하나이고 상단 화살표는 같은 정책을 따른다", async () => {
  const [app, header, ux, helper] = await Promise.all([
    read("src/App.jsx"),
    read("src/components/common/AndroidAppHeader.jsx"),
    read("src/platform/androidUx.js"),
    read("src/platform/androidBackRoute.js"),
  ]);
  const listeners = [app, header, ux, helper].reduce(
    (sum, source) => sum + (source.match(/(?:CapacitorApp|App)\.addListener\(\s*["']backButton["']/g) || []).length,
    0
  );
  assert.equal(listeners, 1);
  assert.match(app, /if \(closeAndroidBackOverlay\(window\)\) return/);
  assert.match(header, /resolveAndroidBackAction\(pathname, window\.history\.state\)/);
  assert.doesNotMatch(header, /addAndroidBackButtonListener/);
  assert.match(app, /<AndroidBackButtonBridge \/>/);
});
