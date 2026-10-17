import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (relative) => readFile(new URL(`../${relative}`, import.meta.url), "utf8");
const [pkgText, firebase, smokeConfig, smokeSpec, mobileSpec, app, auth, register, verify, rules, storage, authGuard] = await Promise.all([
  read("package.json"), read("src/firebase/firebase.js"),
  read("tests/smoke/playwright.config.mjs"), read("tests/smoke/specs/smoke.spec.mjs"),
  read("tests/smoke/specs/mobile.spec.mjs"), read("src/App.jsx"),
  read("src/context/AuthContext.jsx"), read("src/pages/Register.jsx"),
  read("src/pages/VerifyEmail.jsx"), read("firestore.rules"),
  read("storage.rules"), read("scripts/test-auth-core-safety.mjs"),
]);
const pkg = JSON.parse(pkgText);

// Replaces the obsolete tests/e2e path guard.  This is only a *static guard*;
// it does not claim full auth-browser coverage or replace emulator/Playwright runs.
test("현재 인증 브라우저 검사는 tests/smoke에서 별도로 실행된다", () => {
  assert.equal(pkg.scripts["test:smoke"], "node scripts/run-smoke.mjs");
  assert.equal(pkg.scripts["test:mobile"], "node scripts/run-mobile-smoke.mjs");
  assert.match(smokeConfig, /testDir/);
  assert.match(smokeSpec, /회원가입 → 이메일 인증 → 새 브라우저 로그인/);
  assert.match(smokeSpec, /oobCode/);
  assert.match(smokeSpec, /loginFromUi/);
  assert.match(mobileSpec, /모바일 로그인/);
});

test("Firebase emulator 연결은 DEV이고 명시적 플래그가 켜진 때만 허용된다", () => {
  assert.match(firebase, /import\.meta\.env\.DEV/);
  assert.match(firebase, /VITE_USE_FIREBASE_EMULATORS/);
  for (const name of ["connectAuthEmulator", "connectFirestoreEmulator", "connectFunctionsEmulator", "connectStorageEmulator"]) {
    assert.ok(firebase.includes(name), `${name} required`);
  }
});

test("미인증 사용자를 회원으로 취급하지 않으며 Firestore/Storage 소유자 검증을 유지한다", () => {
  assert.match(auth, /const isMember = Boolean\(user && isEmailVerified\)/);
  assert.match(app, /user && !isEmailVerified/);
  assert.match(app, /function MyGoldRoute/);
  assert.match(rules, /function verifiedSignedIn\(\)/);
  assert.match(rules, /function isVerifiedOwner\(uid\)/);
  assert.match(storage, /function verifiedSignedIn\(\)/);
  assert.match(storage, /function isOwner\(uid\)/);
});

test("회원가입 후 이메일 인증 화면으로 이동하고 인증메일 재전송은 차단되지 않는다", () => {
  assert.match(register, /navigate\(buildVerifyEmailPath\(onboardingPath\)/);
  assert.match(verify, /onClick=\{handleResend\}[\s\S]{0,260}disabled=\{resending\}/);
  assert.match(authGuard, /Quiz bonus does not call member status while email is unverified/);
});
