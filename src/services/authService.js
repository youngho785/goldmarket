// src/services/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile as _updateAuthProfile,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  deleteUser,
  // 필요시 setPersistence, browserLocalPersistence, browserSessionPersistence 추가 가능
} from "firebase/auth";
import { auth, functions } from "../firebase/firebase";
import { httpsCallable } from "firebase/functions";
import { ensureUserProfileOnSignup } from "./userService";
import { buildEmailActionSettings } from "../lib/emailActionUrl";

/* ────────────────────────────────────────────────────────────────────────── *
 * Utils
 * ────────────────────────────────────────────────────────────────────────── */
export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function requireAuthUser() {
  if (!auth.currentUser) {
    const err = new Error("로그인된 사용자가 없습니다.");
    throw err;
  }
  return auth.currentUser;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Auth: Core
 * ────────────────────────────────────────────────────────────────────────── */

/** 로그인 (전역 지속성은 firebase/firebase.js에서 설정됨) */
export async function login(email, password) {
  const emailTrim = normalizeEmail(email);
  const { user } = await signInWithEmailAndPassword(auth, emailTrim, password);
  return user;
}

/**
 * 회원가입
 * 1) Auth 계정 생성
 * 2) Auth.displayName 설정 + 인증메일 발송
 * 3) 인증메일 단계 실패 시 신규 Auth 계정 자동 롤백
 * 4) 서버에서 닉네임 원자 선점
 * 5) Firestore profiles/users 생성
 */
export async function signUp({
  email,
  password,
  displayName = "",
  nickname = "",
  phone = "",
  continueUrl = "",
  // nicknameLower 등 추가 파라미터가 와도 무시(하위호환)
}) {
  const emailTrim = normalizeEmail(email);

  // 1) 계정 생성
  const { user } = await createUserWithEmailAndPassword(
    auth,
    emailTrim,
    password
  );

  const safeName = (displayName || "").trim();

  // 2) Auth 프로필 + 3) 인증메일 발송
  // 중요: Firestore/닉네임 문서를 만들기 전에 인증메일부터 발송합니다.
  // 이 단계에서 실패하면 방금 만든 Auth 계정을 즉시 지워
  // 다음 재시도에서 auth/email-already-in-use가 남지 않도록 합니다.
  try {
    await _updateAuthProfile(user, { displayName: safeName });
    await sendEmailVerification(user, buildEmailActionSettings(continueUrl));
  } catch (setupError) {
    try {
      await deleteUser(user);
    } catch (rollbackError) {
      console.error("신규 Auth 계정 롤백 실패:", rollbackError);
    }
    throw setupError;
  }

  // 4) 닉네임을 서버 트랜잭션으로 최종 선점합니다.
  // 사전 중복 확인과 가입 클릭 사이에 다른 회원이 같은 닉네임을 가져가는 경쟁 조건을 막습니다.
  try {
    const claim = httpsCallable(functions, "claimNickname");
    await claim({ nickname: (nickname || "").trim() });
  } catch (claimError) {
    // claimNickname 트랜잭션이 실패하면 Firestore 쓰기는 롤백됩니다.
    // 이미 발송된 인증메일은 이 Auth 계정이 삭제되므로 사용 불가가 됩니다.
    try {
      await deleteUser(user);
    } catch (rollbackError) {
      console.error("닉네임 선점 실패 후 Auth 롤백 실패:", rollbackError);
    }
    throw claimError;
  }

  // 5) Firestore 문서 보장(이름/닉네임 분리 저장) — 실패해도 가입/인증은 계속
  try {
    await ensureUserProfileOnSignup(user, {
      displayName: safeName,
      nickname: (nickname || "").trim(),
      phone,
      email: emailTrim,
    });
  } catch (e) {
    console.warn("ensureUserProfileOnSignup 실패(가입은 계속):", e);
  }

  return user;
}

/** 로그아웃 */
export async function logout() {
  return signOut(auth);
}

/** 비밀번호 재설정 이메일 전송 */
export async function resetPassword(email) {
  const emailTrim = normalizeEmail(email);
  return sendPasswordResetEmail(auth, emailTrim, buildEmailActionSettings("/reset-password"));
}

/**
 * 비밀번호 변경(로그인 상태 필요)
 * - signOut() 호출 없음
 * - 변경 직후 세션/토큰 강제 최신화로 onIdTokenChanged 순간 null을 최소화
 */
export async function changePassword(newPassword) {
  const u = requireAuthUser();
  await updatePassword(u, newPassword);
  // 🔐 변경 직후 세션 최신화
  await u.reload();
  await u.getIdToken(true);
  return true;
}

/** (선택) Auth 프로필 필드만 수정 (displayName, photoURL 등) */
export async function updateAuthProfileFields(profile) {
  const u = requireAuthUser();
  return _updateAuthProfile(u, profile);
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

/** 이메일 인증이 안 되어 있으면 재발송하고 true, 이미 인증이면 false 반환 */
export async function sendVerificationEmailIfNeeded(continueUrl = "") {
  const u = requireAuthUser();
  if (u.emailVerified) return false;
  await sendEmailVerification(u, buildEmailActionSettings(continueUrl));
  return true;
}

/** 해당 이메일이 등록되어 있는지(로그인 수단 존재) 확인 */
export async function isEmailRegistered(email) {
  const emailTrim = normalizeEmail(email);
  const methods = await fetchSignInMethodsForEmail(auth, emailTrim);
  return Array.isArray(methods) && methods.length > 0;
}

/** (게스트) 로그인 보장 — 이미 세션이 있으면 그대로 반환 */
export async function startAnonymousIfNeeded() {
  if (!auth.currentUser) {
    const { user } = await signInAnonymously(auth);
    return user;
  }
  return auth.currentUser;
}

/**
 * (게스트 → 이메일/비밀번호) 업그레이드 링크
 * - 게스트 세션의 데이터 유지
 * - 이미 동일 이메일 계정이 존재하면 `null` 반환
 */
export async function linkAnonymousWithEmail(email, password) {
  await startAnonymousIfNeeded();
  if (!auth.currentUser?.isAnonymous) return null; // 이미 일반 계정이면 스킵

  const cred = EmailAuthProvider.credential(normalizeEmail(email), password);
  try {
    const res = await linkWithCredential(auth.currentUser, cred);
    return res.user;
  } catch (e) {
    if (
      e?.code === "auth/credential-already-in-use" ||
      e?.code === "auth/email-already-in-use"
    ) {
      return null;
    }
    throw e;
  }
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Backward-compat alias (하위호환)
 * ────────────────────────────────────────────────────────────────────────── */
export const updateUserProfile = updateAuthProfileFields;

/* ────────────────────────────────────────────────────────────────────────── *
 * (옵션) 로그인 유지 토글을 만들고 싶다면 아래 헬퍼를 써도 됩니다.
 *   setPersistence(auth, browserLocalPersistence)    // 브라우저 종료 후에도 유지
 *   setPersistence(auth, browserSessionPersistence)  // 탭/세션 한정
 * ────────────────────────────────────────────────────────────────────────── */
