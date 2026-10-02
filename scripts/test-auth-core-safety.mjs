import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [
  firebaseSource,
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
  readFile(new URL('../src/firebase/firebase.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/VerifyEmail.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/Register.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/services/userService.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/Login.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
  readFile(new URL('../storage.rules', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/QuizGoldBonus.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/common/Navbar.jsx', import.meta.url), 'utf8'),
]);

test('Firebase emulator mode is DEV-only and explicitly gated', () => {
  assert.match(firebaseSource, /import\.meta\.env\.DEV/);
  assert.match(firebaseSource, /VITE_USE_FIREBASE_EMULATORS/);
  assert.match(firebaseSource, /connectAuthEmulator/);
  assert.match(firebaseSource, /connectFirestoreEmulator/);
  assert.match(firebaseSource, /connectFunctionsEmulator/);
  assert.match(firebaseSource, /connectStorageEmulator/);
});

test('Registration keeps the initial account minimal', () => {
  assert.doesNotMatch(registerSource, /id="regName"|id="regPhone"|id="regNickname"/);
  assert.doesNotMatch(registerSource, /\b(displayName|phone|nickname)\s*:/);
  assert.match(userServiceSource, /회원가입은 이메일만으로 최소 계정을 만듭니다/);
  assert.match(registerSource, /navigate\(buildVerifyEmailPath\(onboardingPath\)/);
});

test('Unverified Auth sessions do not become members', () => {
  assert.match(authContextSource, /const isMember = Boolean\(user && isEmailVerified\)/);
  assert.match(authContextSource, /const memberUser = isMember \? user : null/);
  assert.match(authContextSource, /const verified = currentUser\.emailVerified === true/);
  assert.match(loginSource, /if \(!user\.emailVerified\)[\s\S]{0,260}buildVerifyEmailPath/);
  assert.match(appSource, /user && !isEmailVerified[\s\S]{0,220}buildVerifyEmailPath/);
  assert.match(appSource, /function MyGoldRoute/);
});

test('Firestore member data requires verified identity', () => {
  assert.match(firestoreRulesSource, /function verifiedSignedIn\(\)/);
  assert.match(firestoreRulesSource, /request\.auth\.token\.get\('email_verified', false\) == true/);
  assert.match(firestoreRulesSource, /match \/users\/\{uid\}[\s\S]{0,360}allow read: if isVerifiedOwner\(uid\) \|\| isAdmin\(\)/);
  assert.match(firestoreRulesSource, /match \/users\/\{uid\}\/goldVaultItems\/\{itemId\}[\s\S]{0,260}isVerifiedOwner/);
});

test('Storage ownership also requires verified identity', () => {
  assert.match(storageRulesSource, /function verifiedSignedIn\(\)/);
  assert.match(storageRulesSource, /request\.auth\.token\.get\('email_verified', false\) == true/);
  assert.match(storageRulesSource, /function isOwner\(uid\)[\s\S]{0,180}verifiedSignedIn/);
});

test('Verification resend remains available while status polling runs', () => {
  assert.match(verifyEmailSource, /onClick=\{handleResend\}[\s\S]{0,260}disabled=\{resending\}/);
  assert.doesNotMatch(verifyEmailSource, /onClick=\{handleResend\}[\s\S]{0,260}disabled=\{checking\s*\|\|\s*resending\}/);
});

test('Member account navigation exposes settings, support, and logout', () => {
  assert.match(navbarSource, /aria-label="MY 계정 메뉴"/);
  assert.match(navbarSource, /to="\/settings"[\s\S]{0,120}설정/);
  assert.match(navbarSource, /to="\/support"[\s\S]{0,140}1:1 문의/);
  assert.match(navbarSource, /onClick=\{handleLogout\}/);
});

test('Quiz bonus does not call member status while email is unverified', () => {
  assert.match(quizSource, /if \(!isEmailVerified\)[\s\S]{0,500}needVerification: true/);
  assert.match(quizSource, /if \(user && isEmailVerified\)[\s\S]{0,180}claimGoldQuizBonus/);
});
