import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const profile = readFileSync(new URL('../src/pages/Profile.jsx', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8');

test('MY 메인에서 예약·문의·후기·매장 메뉴는 바로 접근 가능하다', () => {
  for (const path of ['/my-exchanges', '/support', '/reviews', '/stores']) {
    assert.ok(profile.includes(`to="${path}"`), path);
  }
  assert.ok(profile.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
});

test('개인정보·이메일 변경은 기본 접힘이고 필요할 때만 펼쳐진다', () => {
  assert.match(profile, /<AccountDetails>\s*<summary>/);
  assert.ok(profile.includes('내 프로필 · 로그인 이메일'));
  assert.ok(profile.includes('<AccountDetailsBody>'));
  assert.ok(profile.includes('<Form onSubmit={handleEmailChangeRequest}'));
});

test('계정 수정 및 인증 기능과 MEMBER GOLD 혜택은 유지한다', () => {
  assert.ok(profile.includes('handleProfileSubmit'));
  assert.ok(profile.includes('handleEmailChangeRequest'));
  assert.ok(profile.includes('memberGoldBalanceG'));
  assert.ok(profile.includes('to="/member-gold"'));
  assert.ok(profile.includes('to="/settings"'));
});

test('프로필 조회 오류와 변경 완료 알림은 접힌 프로필 밖에 표시한다', () => {
  const index = profile.indexOf('<AccountDetails>');
  assert.ok(index > 0);
  assert.ok(profile.indexOf('role="alert"') < index);
  assert.ok(profile.indexOf('role="status"') < index);
});

test('설정에서 프로필·이메일 변경 위치가 안내되고 위험한 탈퇴 동작은 원래대로 보호한다', () => {
  assert.ok(settings.includes('<SettingLink to="/profile">'));
  assert.ok(settings.includes('<DangerDetails>'));
  assert.ok(settings.includes('handleDeleteAccount'));
  assert.ok(settings.includes('<SettingsNotificationsSection user={user} />'));
});
