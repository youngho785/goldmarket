import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const login = source("src/pages/Login.jsx");
const register = source("src/pages/Register.jsx");
const verify = source("src/pages/VerifyEmail.jsx");
const existingTests = source("scripts/test-ux-auth-continuity.mjs");

test("로그인 화면은 회원가입 안내보다 로그인 양식을 먼저 보여준다", () => {
  const formAt = login.indexOf("<Form onSubmit={handleSubmit}");
  const joinAt = login.indexOf("<LuxuryCta");
  assert.ok(formAt >= 0 && joinAt > formAt);
  assert.match(login, /처음이신가요\? 회원가입/);
  assert.match(login, /가입 없이 내 금 가치 확인하기/);
});

test("회원가입 화면은 기존 회원에게 로그인 이동을 제공하며 복귀 경로를 보존한다", () => {
  assert.match(register, /buildAuthPath\(\"\/login\", returnTo\)/);
  assert.match(register, /state=\{\{ from: returnTo \}\}/);
  assert.match(register, /<Link[\s\S]*?로그인[\s\S]*?<\/Link>/);
});

test("회원가입은 필수 동의와 이메일 인증 완료를 건너뛰지 않는다", () => {
  assert.match(register, /agreements\.age14 \|\| !agreements\.tos \|\| !agreements\.privacy/);
  assert.match(register, /navigate\(buildVerifyEmailPath\(onboardingPath\)/);
  assert.match(register, /<AgreementsSection value=\{agreements\}/);
});

test("인증 화면은 메일 확인 행동을 안내하면서 앱 자동 복귀 기능을 유지한다", () => {
  assert.match(verify, /메일에서 인증을 마친 뒤 앱으로 돌아오면 완료 여부를 자동으로 확인합니다/);
  assert.match(verify, /메일의 인증 링크를 누르면 이메일 확인이 완료됩니다/);
  assert.match(verify, /appReturnIntentUrl/);
  assert.match(verify, /reloadUserWithRetry\(user\)/);
  assert.match(verify, /이메일을 잘못 입력했어요/);
});

test("기존 금교환 인증 초안 복원과 외부 경로 차단 검사는 유지한다", () => {
  assert.match(existingTests, /2시간 지난 초안과 손상된 초안은 복구하지 않는다/);
  assert.match(existingTests, /sanitizeAppReturnPath/);
  assert.match(register, /markMemberOnboardingPending\(returnTo\)/);
});
