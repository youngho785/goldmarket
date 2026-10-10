import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL(`../${name}`,import.meta.url), 'utf8');
const login = read('src/pages/Login.jsx');
const register = read('src/pages/Register.jsx');
const verify = read('src/pages/VerifyEmail.jsx');
const authReturn = read('src/lib/authReturn.js');
const exchange = read('src/pages/GoldExchange.jsx');

test('5차 로그인: 이메일/비밀번호 양식이 신규가입 안내보다 먼저 노출된다',()=>{
  assert.ok(login.indexOf('<Form onSubmit={handleSubmit}') < login.indexOf('aria-label="처음이신가요? 회원가입"'));
  assert.match(login,/autoComplete="current-password"/);
  assert.match(login,/autoComplete="username email"/);
});
test('5차 로그인: 비밀번호 보기/숨기기와 모바일 접근성',()=>{
  assert.match(login,/type=\{passwordVisible \? "text" : "password"\}/);
  assert.match(login,/aria-pressed=\{passwordVisible\}/);
  assert.match(login,/min-width: 44px/);
  assert.match(login,/setPasswordVisible/);
});
test('5차 가입: 본인 목적 안내와 계정 입력·필수동의를 혜택보다 우선한다',()=>{
  assert.ok(register.indexOf('<Form onSubmit={handleSubmit}') < register.indexOf('<BenefitDetails>'));
  assert.ok(register.indexOf('이미 계정이 있으신가요?') < register.indexOf('<BenefitDetails>'));
  assert.match(register,/AgreementsSection value=\{agreements\}/);
  assert.match(register,/max-width: 520px/);
});
test('5차 가입: 혜택이 조건부·선택임을 정확히 알리고 자동동의 금지',()=>{
  assert.match(register,/인증 이메일 기준 1회 지급됩니다/);
  assert.match(register,/가입만으로 자동 동의되지 않습니다/);
  assert.match(register,/선택 회원혜택 안내/);
  assert.match(register,/buildAuthPath\("\/login", returnTo\)/);
});
test('5차 인증: 메일→앱/웹 복귀→계속하기 흐름을 상태별로 안내한다',()=>{
  assert.match(verify,/VerificationSteps aria-label="이메일 인증 진행 순서"/);
  assert.match(verify,/인증 후 앱으로 돌아오세요/);
  assert.match(verify,/인증 상태가 확인되면 진행하던 화면으로 이동합니다/);
  assert.match(verify,/!processingLink && displayUser && !displayUser.emailVerified && !reloginRequired/);
});
test('5차 안전: 인증 상태 갱신·재전송·이메일 수정·앱복귀 보존',()=>{
  assert.match(verify,/applyActionCode\(auth, oobCode\)/);
  assert.match(verify,/reloadUserWithRetry\(user\)/);
  assert.match(verify,/setInterval\(checkVerification, 4000\)/);
  assert.match(verify,/onClick=\{handleResend\}/);
  assert.match(verify,/verifyBeforeUpdateEmail\(/);
  assert.match(verify,/const appReturnIntentUrl/);
});
test('5차 안전: 복귀 경로·금교환 임시정보·MFA 코드 변경 금지',()=>{
  assert.match(authReturn,/sanitizeAppReturnPath/);
  assert.match(login,/beginMfaSignIn/);
  assert.match(login,/completeMfaSignIn/);
  assert.match(login,/resolvePostLoginPath = \(\) => returnTo/);
  assert.match(exchange,/readGoldExchangeDraft/);
  assert.match(exchange,/submitGoldExchangeGroup\(payload\)/);
});
