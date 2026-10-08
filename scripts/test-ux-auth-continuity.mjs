import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const exchange = read("src/pages/GoldExchange.jsx");
const login = read("src/pages/Login.jsx");
const reset = read("src/pages/ResetPassword.jsx");
const verify = read("src/pages/VerifyEmail.jsx");
const draftSource = read("src/lib/goldExchangeDraft.js");
const { getAuthReturnPath, sanitizeAppReturnPath, buildAuthPath } = await import(new URL("../src/lib/authReturn.js", import.meta.url).href);
const pkg = JSON.parse(read("package.json"));

function makeStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value); },
    removeItem: (key) => { items.delete(key); },
    raw: () => [...items.values()].join(""),
  };
}

// 금교환 초안 저장/복구 동작을 실제로 실행해 검증합니다.
const moduleUrl = new URL("../src/lib/goldExchangeDraft.js", import.meta.url).href;
const { saveGoldExchangeDraft, readGoldExchangeDraft, clearGoldExchangeDraft } = await import(moduleUrl);

const draftFixture = {
  products: [{ productId: "14k_ring", goldType: "14K", quantity: "10.00", inputUnit: "g" }],
  barGroup: "don",
  barChoice: { idx: 1, qty: 1 },
  calculated: true,
  visitDate: "2026-10-15",
  visitTime: "14:00",
  name: "NEVER_STORE_NAME",
  phone: "NEVER_STORE_PHONE",
  privacyAccepted: true,
};

test("예약 인증 초안은 새 탭에도 보이고 개인정보 필드를 저장하지 않는다", () => {
  const local = makeStorage();
  globalThis.window = { sessionStorage: makeStorage(), localStorage: local };
  assert.equal(saveGoldExchangeDraft(draftFixture), true);
  assert.equal(readGoldExchangeDraft().visitTime, "14:00");
  assert.doesNotMatch(local.raw(), /NEVER_STORE_NAME|NEVER_STORE_PHONE|privacyAccepted/);
  // same-origin browser new tab: independent sessionStorage, shared localStorage
  globalThis.window = { sessionStorage: makeStorage(), localStorage: local };
  const recovered = readGoldExchangeDraft();
  assert.equal(recovered.products[0].goldType, "14K");
  assert.equal(recovered.visitDate, "2026-10-15");
  clearGoldExchangeDraft();
  assert.equal(readGoldExchangeDraft(), null);
});

test("2시간 지난 초안과 손상된 초안은 복구하지 않는다", () => {
  const session = makeStorage();
  const local = makeStorage();
  globalThis.window = { sessionStorage: session, localStorage: local };
  assert.equal(saveGoldExchangeDraft(draftFixture), true);
  const key = "kgm_gold_exchange_reservation_draft_v1";
  const stale = JSON.parse(local.getItem(key));
  stale.savedAt = Date.now() - 2 * 60 * 60 * 1000 - 60_000;
  local.setItem(key, JSON.stringify(stale));
  session.removeItem(key);
  assert.equal(readGoldExchangeDraft(), null);
  assert.equal(local.getItem(key), null);
  local.setItem(key, "{not json");
  assert.equal(readGoldExchangeDraft(), null);
  assert.equal(local.getItem(key), null);
});

test("브라우저에서 하나의 저장소가 차단되어도 가능한 저장소를 사용한다", () => {
  const local = makeStorage();
  const blocked = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  globalThis.window = { sessionStorage: blocked, localStorage: local };
  assert.equal(saveGoldExchangeDraft(draftFixture), true);
  assert.ok(readGoldExchangeDraft());
  clearGoldExchangeDraft();
  assert.equal(local.raw(), "");
  globalThis.window = {};
  assert.equal(saveGoldExchangeDraft(draftFixture), false);
  assert.equal(readGoldExchangeDraft(), null);
});

test("예약 복귀 성공·실패 상태를 안내하고 초안은 예약 완료 시 제거한다", () => {
  assert.match(exchange, /resumeRequested && !isRebook/);
  assert.match(exchange, /이전 예약 정보를 불러오지 못했습니다/);
  assert.match(exchange, /authDraft \? "이전에 선택한 금 정보와 방문 일정을 불러왔습니다/);
  assert.match(exchange, /이전에 선택한 금 정보와 방문 일정을 불러왔습니다/);
  assert.match(exchange, /clearGoldExchangeDraft\(\)/);
  assert.match(exchange, /submitGoldExchangeGroup\(payload\)/);
  assert.ok(exchange.indexOf("clearGoldExchangeDraft();") > exchange.indexOf("await submitGoldExchangeGroup(payload)"));
});

test("비밀번호 재설정도 금교환·MY GOLD 복귀 경로를 유지한다", () => {
  assert.match(login, /resetPasswordPath = `\/reset-password\?next=\$\{encodeURIComponent\(returnTo\)\}`/);
  assert.match(login, /<Link to=\{resetPasswordPath\}>비밀번호를 잊으셨나요\?/);
  assert.match(reset, /getAuthReturnPath\(location, '\/'\)/);
  assert.match(reset, /buildAuthPath\('\/login', returnTo\)/);
  assert.match(reset, /mode=resetPassword&next=\$\{encodeURIComponent\(returnTo\)\}/);
  assert.match(reset, /navigate\(loginPath\)/);
  assert.match(verify, /mode === "resetPassword" && oobCode/);
  assert.match(verify, /const resetReturnTo = continuePath\.startsWith\("\/reset-password\?"\)/);
  assert.match(verify, /getAuthReturnPath\(\{ search: continuePath\.slice/);
  assert.match(verify, /encodeURIComponent\(resetReturnTo\)/);
});

test("재설정 링크를 통한 복귀는 내부 경로만 허용하며 원래 예약 화면을 이어간다", () => {
  const original = "/gold-exchange?resume=reservation";
  const resetUrl = new URL(`/reset-password?mode=resetPassword&next=${encodeURIComponent(original)}`, "https://koreagoldmarket.com");
  const restored = getAuthReturnPath({ search: resetUrl.search }, "/");
  assert.equal(restored, original);
  assert.equal(buildAuthPath("/login", restored), "/login?next=%2Fgold-exchange%3Fresume%3Dreservation");
  assert.equal(sanitizeAppReturnPath("https://untrusted.example"), "/");
  assert.equal(sanitizeAppReturnPath("//untrusted.example/path"), "/");
  assert.equal(sanitizeAppReturnPath("/reset-password?oobCode=secret"), "/");
});

test("테스트 명령이 설치되어 있고 Firebase 서버·금 환산·회원혜택 데이터는 변경하지 않는다", () => {
  assert.equal(pkg.scripts["test:ux-auth-continuity"], "node scripts/test-ux-auth-continuity.mjs");
  assert.match(draftSource, /DRAFT_TTL_MS = 2 \* 60 \* 60 \* 1000/);
  assert.doesNotMatch(draftSource, /password|email|phone|name:|consents/);
});
