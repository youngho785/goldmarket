import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [
  packageText,
  firebaseSource,
  runnerSource,
  viteSource,
  configSource,
  regularConfigSource,
  helperSource,
  specSource,
  windowsRunnerSource,
  verifyEmailSource,
  registerSource,
  userServiceSource,
  appSource,
  authContextSource,
  loginSource,
  firestoreRulesSource,
  storageRulesSource,
  quizSource,
  navbarSource,
] = await Promise.all([
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../src/firebase/firebase.js", import.meta.url), "utf8"),
  readFile(new URL("../tests/e2e/run-auth-e2e.mjs", import.meta.url), "utf8"),
  readFile(new URL("../tests/e2e/start-auth-e2e-vite.mjs", import.meta.url), "utf8"),
  readFile(new URL("../tests/e2e/playwright.auth.config.mjs", import.meta.url), "utf8"),
  readFile(new URL("../tests/e2e/playwright.config.mjs", import.meta.url), "utf8"),
  readFile(new URL("../tests/e2e/helpers/firebase-emulator.mjs", import.meta.url), "utf8"),
  readFile(new URL("../tests/e2e/specs/auth-lifecycle.spec.mjs", import.meta.url), "utf8"),
  readFile(new URL("../tests/e2e/run-auth-e2e-inner.cmd", import.meta.url), "utf8"),
  readFile(new URL("../src/pages/VerifyEmail.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/pages/Register.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/services/userService.js", import.meta.url), "utf8"),
  readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/context/AuthContext.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/pages/Login.jsx", import.meta.url), "utf8"),
  readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
  readFile(new URL("../storage.rules", import.meta.url), "utf8"),
  readFile(new URL("../src/pages/QuizGoldBonus.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/common/Navbar.jsx", import.meta.url), "utf8"),
]);

const pkg = JSON.parse(packageText);

test("Auth E2E는 별도 명령으로만 실행되고 일반 UI E2E에서 제외된다", () => {
  assert.equal(pkg.scripts["test:e2e"], "npm --prefix tests/e2e test");
  assert.equal(pkg.scripts["test:auth-e2e"], "node tests/e2e/run-auth-e2e.mjs");
  assert.equal(pkg.scripts["test:auth-e2e:static"], "node scripts/test-auth-e2e-safety.mjs");
  assert.match(regularConfigSource, /testIgnore:\s*["']\*\*\/auth-lifecycle\.spec\.mjs["']/);
});

test("인증 완료 PC 회원은 MY 계정 메뉴에서 로그아웃·설정·문의에 접근할 수 있다", () => {
  assert.match(navbarSource, /aria-label="MY 계정 메뉴"/);
  assert.match(navbarSource, /to="\/settings"[\s\S]*설정/);
  assert.match(navbarSource, /to="\/support"[\s\S]*1:1 문의/);
  assert.match(navbarSource, /onClick=\{handleLogout\}[\s\S]*로그아웃/);
  assert.match(specSource, /getByRole\("button", \{ name: "MY 계정 메뉴" \}\)/);
  assert.match(specSource, /getByRole\("menuitem", \{ name: "로그아웃", exact: true \}\)/);
});

test("Firebase Emulator 연결은 DEV + 명시적 VITE 플래그로만 켜진다", () => {
  assert.match(firebaseSource, /import\.meta\.env\.DEV/);
  assert.match(firebaseSource, /VITE_USE_FIREBASE_EMULATORS/);
  assert.match(firebaseSource, /connectAuthEmulator/);
  assert.match(firebaseSource, /connectFirestoreEmulator/);
  assert.match(firebaseSource, /connectFunctionsEmulator/);
  assert.match(firebaseSource, /connectStorageEmulator/);
});

test("Auth E2E는 demo 프로젝트와 로컬 에뮬레이터만 사용하고 App Check 강제를 끈다", () => {
  assert.match(runnerSource, /demo-goldmarket/);
  assert.match(runnerSource, /auth,firestore,functions,storage/);
  assert.match(runnerSource, /ENFORCE_APP_CHECK:\s*"false"/);
  assert.match(viteSource, /VITE_FIREBASE_PROJECT_ID:\s*"demo-goldmarket"/);
  assert.match(viteSource, /VITE_PRODUCT_ANALYTICS_ENABLED:\s*"false"/);
  assert.match(configSource, /127\.0\.0\.1:4174/);
  assert.doesNotMatch(configSource, /E2E_BASE_URL/);
});

test("브라우저 Auth E2E는 운영 Firebase 및 Analytics 요청을 차단한다", () => {
  assert.match(helperSource, /identitytoolkit\\\.googleapis\\\.com/);
  assert.match(helperSource, /firestore\\\.googleapis\\\.com/);
  assert.match(helperSource, /cloudfunctions\\\.net/);
  assert.match(helperSource, /google-analytics\\\.com/);
  assert.match(helperSource, /route\.abort\("blockedbyclient"\)/);
});




test("Auth E2E는 Firebase CLI 버전과 Functions Emulator 진단을 고정한다", () => {
  assert.match(runnerSource, /FIREBASE_TOOLS_VERSION\s*=\s*["']15\.30\.1["']/);
  assert.match(runnerSource, /firebase-tools@\$\{FIREBASE_TOOLS_VERSION\}/);
  assert.match(runnerSource, /FUNCTIONS_DISCOVERY_TIMEOUT:\s*["']60["']/);
  assert.match(runnerSource, /runCaptured/);
  assert.match(runnerSource, /firebase-emulator-output\.log/);
  assert.match(runnerSource, /writeFile\(emulatorOutputPath/);
  assert.match(runnerSource, /Failed to handle request for function/);
  assert.match(runnerSource, /Failed to start functions/);
  assert.match(runnerSource, /Failed to load function definition from source/);
  assert.match(runnerSource, /assertCleanFunctionsEmulatorOutput/);
});

test("Windows Auth E2E 실행기는 firebase CLI에 npm --prefix를 직접 넘기지 않는다", () => {
  assert.match(runnerSource, /process\.platform === "win32"/);
  assert.match(runnerSource, /run-auth-e2e-inner\.cmd/);
  assert.match(runnerSource, /KGM_AUTH_E2E_HEADED/);
  assert.match(windowsRunnerSource, /pushd "%~dp0"/i);
  assert.match(windowsRunnerSource, /npm run test:auth:inner/i);
  assert.match(windowsRunnerSource, /npm run test:auth:headed-inner/i);
  assert.doesNotMatch(windowsRunnerSource, /--prefix/);
});

test("회원가입은 이메일·비밀번호·필수동의 한 단계로 진행하고 개인정보를 미리 강제하지 않는다", () => {
  assert.match(specSource, /#regEmail/);
  assert.match(specSource, /#regPassword/);
  assert.match(specSource, /#agree_age14/);
  assert.match(specSource, /#agree_tos/);
  assert.match(specSource, /#agree_privacy/);
  assert.doesNotMatch(specSource, /#regName|#regPhone|#regNickname/);
  assert.doesNotMatch(registerSource, /id="regName"|id="regPhone"|id="regNickname"/);
  assert.match(registerSource, /이름·전화번호·닉네임은 이메일 인증 후 필요한 순간에 설정/);
  assert.match(userServiceSource, /회원가입은 이메일만으로 최소 계정을 만듭니다/);
});

test("미인증 Auth 세션은 회원 상태로 승격되지 않고 인증 경계를 우회할 수 없다", () => {
  assert.match(authContextSource, /const isMember = Boolean\(user && isEmailVerified\)/);
  assert.match(authContextSource, /const memberUser = isMember \? user : null/);
  assert.match(authContextSource, /const verified = currentUser\.emailVerified === true/);
  assert.match(authContextSource, /verified &&[\s\S]{0,100}tokenResult\.claims\.admin/);
  assert.match(appSource, /user && !isEmailVerified[\s\S]{0,180}buildVerifyEmailPath/);
  assert.match(appSource, /function MyGoldRoute/);
  assert.match(appSource, /<MyGoldRoute \/>/);
  assert.match(appSource, /<MyGoldRoute alerts \/>/);
  assert.doesNotMatch(appSource, /<ProtectedRoute allowUnverified/);
  assert.doesNotMatch(registerSource, /returnAllowsUnverified/);
  assert.doesNotMatch(registerSource, /getDoc\(userRef\)/);
  assert.match(registerSource, /const \{ user, createdNow \} = await signUp/);
  assert.match(registerSource, /navigate\(buildVerifyEmailPath\(onboardingPath\)/);
  assert.doesNotMatch(loginSource, /returnAllowsUnverified/);
  assert.match(loginSource, /if \(!user\.emailVerified\)[\s\S]{0,220}buildVerifyEmailPath/);
  assert.match(firestoreRulesSource, /function verifiedSignedIn\(\)/);
  assert.match(firestoreRulesSource, /request\.auth\.token\.get\('email_verified', false\) == true/);
  assert.match(firestoreRulesSource, /match \/users\/\{uid\}[\s\S]{0,240}allow read: if isVerifiedOwner\(uid\) \|\| isAdmin\(\)/);
  assert.match(firestoreRulesSource, /match \/users\/\{uid\}\/goldVaultItems\/\{itemId\}[\s\S]{0,200}isVerifiedOwner/);
  assert.match(storageRulesSource, /function verifiedSignedIn\(\)/);
  assert.match(storageRulesSource, /function isOwner\(uid\)[\s\S]{0,140}verifiedSignedIn/);
  assert.match(quizSource, /if \(!isEmailVerified\)[\s\S]{0,500}needVerification: true/);
  assert.match(quizSource, /const status = await getGoldQuizBonusStatus\(user\.uid\)/);
  assert.match(specSource, /이메일 인증을 건너뛴 계정은 회원 홈과 MY GOLD 회원 화면으로 진입할 수 없다/);
  assert.match(specSource, /page\.goto\("\/my-gold"/);
});

test("인증메일 재전송은 백그라운드 인증 상태 폴링 중에도 사용할 수 있다", () => {
  assert.match(verifyEmailSource, /onClick=\{handleResend\}[\s\S]{0,240}disabled=\{resending\}/);
  assert.doesNotMatch(verifyEmailSource, /onClick=\{handleResend\}[\s\S]{0,240}disabled=\{checking\s*\|\|\s*resending\}/);
  assert.match(specSource, /resendButton\)\.toBeEnabled/);
});


test("중복 이메일 E2E는 인증 세션이 없는 새 브라우저 컨텍스트에서 검사한다", () => {
  assert.match(specSource, /const duplicateContext = await browser\.newContext\(\)/);
  assert.match(specSource, /const duplicatePage = await duplicateContext\.newPage\(\)/);
  assert.match(specSource, /fillRegistration\(duplicatePage/);
  assert.match(specSource, /duplicateContext\.close\(\)/);
});

test("이메일 변경 E2E는 짧은 성공 문구보다 Auth Emulator의 실제 주소 변경을 검사한다", () => {
  assert.match(specSource, /expect\.poll\(async \(\) => \{[\s\S]{0,600}signInWithPasswordRest\(changedEmail, RESET_PASSWORD\)/);
  assert.match(specSource, /signInWithPasswordRest\(identity\.alternateEmail, INITIAL_PASSWORD\)/);
  assert.match(specSource, /signInWithPasswordRest\(identity\.email, INITIAL_PASSWORD\)\)\.rejects\.toThrow/);
  assert.doesNotMatch(specSource, /getByText\(\/이메일\.\*변경\.\*완료\|새 이메일 확인이 완료\/\)\.first\(\)\)\.toBeVisible/);
});

test("핵심 Auth 회귀 흐름을 모두 브라우저 테스트한다", () => {
  for (const marker of [
    "신규 회원가입",
    "인증메일 재전송",
    "이메일 인증 링크",
    "중복 이메일",
    "잘못된 비밀번호",
    "비밀번호 재설정",
    "로그인 이메일 변경",
    "이메일 오타 수정",
    "이메일 인증을 건너뛴 계정",
  ]) {
    assert.ok(specSource.includes(marker), `누락된 Auth E2E 단계: ${marker}`);
  }
});
