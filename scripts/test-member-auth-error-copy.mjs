import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const verify = read('src/pages/VerifyEmail.jsx');
const login = read('src/pages/Login.jsx');
const register = read('src/pages/Register.jsx');
const release = read('scripts/test-release-simple.mjs');

test('유효하지 않은 인증 링크는 고객용 안내를 표시하며 기술 용어를 노출하지 않는다', () => {
  assert.match(verify, /인증 링크를 확인할 수 없습니다\. 이미 사용했거나 만료되었을 수 있습니다/);
  assert.doesNotMatch(verify, /잘못된 프로젝트일 수 있어요/);
});
test('인증 URL 오류 및 도메인 오류를 고객용 안내로 표시한다', () => {
  assert.match(verify, /인증 링크를 처리하지 못했습니다\. 로그인 후 인증 메일을 다시 받아주세요/);
  assert.match(verify, /이메일 인증을 진행하지 못했습니다\. 잠시 후 다시 시도해 주세요/);
  assert.doesNotMatch(verify, /인증 링크의 continueUrl 설정/);
  assert.doesNotMatch(verify, /Firebase 콘솔의 Authorized domains/);
});
test('인증 오류의 원문은 사용자 메시지로 넘기지 않는다', () => {
  assert.doesNotMatch(verify, /setMessage\(`[^`]*\$\{(?:err|e)\?\.message/);
  assert.match(verify, /이메일 인증 상태를 확인하지 못했습니다/);
});
test('재전송과 이메일 변경 오류도 내부 오류를 노출하지 않는다', () => {
  assert.match(verify, /메일을 보내지 못했습니다\. 잠시 후 다시 시도해 주세요/);
  assert.match(verify, /이메일 변경 요청을 처리하지 못했습니다/);
  assert.doesNotMatch(verify, /메일 전송 실패: \$\{/);
});
test('로그인 재전송 및 관리자 MFA는 고객용 오류 메시지를 표시한다', () => {
  assert.match(login, /인증 메일을 보내지 못했습니다\. 잠시 후 다시 시도해 주세요/);
  assert.match(login, /2단계 인증을 시작하지 못했습니다\. 잠시 후 다시 시도해 주세요/);
  assert.doesNotMatch(login, /setError\(mfaError\?\.message/);
});
test('회원가입은 이미 매핑된 오류를 유지하면서 기술적 실패 메시지를 가린다', () => {
  for(const known of ['email-already-in-use', 'invalid-email', 'weak-password', 'too-many-requests']){
    assert.ok(register.includes(known));
  }
  assert.match(register, /\[가-힣\]\/\.test\(m\)/);
  assert.match(register, /회원가입을 완료하지 못했습니다\. 잠시 후 다시 시도해 주세요/);
});
test('기존 인증과 예약 재개 흐름은 수정하지 않는다', () => {
  assert.match(register, /navigate\(buildVerifyEmailPath\(onboardingPath\)/);
  assert.match(login, /navigate\(resolvePostLoginPath\(\)/);
  assert.match(verify, /await checkActionCode\(auth, oobCode\)/);
  assert.match(verify, /await applyActionCode\(auth, oobCode\)/);
  assert.match(verify, /setAppReturnReady\(true\)/);
  assert.match(verify, /auth\.currentUser\.emailVerified/);
});
test('전체 출시 검사에 회원 인증 UX 회귀검사가 연결된다', () => {
  assert.match(release, /MEMBER AUTH ERROR COPY/);
  assert.match(release, /scripts\/test-member-auth-error-copy\.mjs/);
});
