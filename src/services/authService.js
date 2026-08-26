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
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
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
 * 이전 회원가입 시 Firebase Auth 계정만 남아 있고 이메일 인증이 끝나지 않은 경우
 * 같은 이메일/비밀번호로 그 UID의 가입 절차를 이어가기 위한 헬퍼입니다.
 * - 현재 동일 미인증 세션이면 그대로 반환
 * - 세션이 사라졌다면 비밀번호 로그인을 시도
 * - 이미 인증 완료된 정상 계정은 회원가입 재개 대상으로 취급하지 않음
 */
export async function tryResumeUnverifiedSignup(email, password) {
  const emailTrim = normalizeEmail(email);
  const current = auth.currentUser;

  if (current) {
    if (
      !current.emailVerified &&
      normalizeEmail(current.email) === emailTrim
    ) {
      return current;
    }
    return null;
  }

  try {
    const { user } = await signInWithEmailAndPassword(auth, emailTrim, password);
    if (user.emailVerified) {
      // 회원가입 화면에서 기존 정상 계정의 세션을 바꾸지 않도록 되돌립니다.
      await signOut(auth);
      return null;
    }
    return user;
  } catch (error) {
    if (
      error?.code === "auth/invalid-credential" ||
      error?.code === "auth/user-not-found" ||
      error?.code === "auth/wrong-password" ||
      error?.code === "auth/invalid-email"
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * 회원가입
 * 1) 신규 Auth 계정 생성 또는 동일 미인증 계정 재개
 * 2) Auth.displayName 설정 + 인증메일 발송
 * 3) 신규 계정의 인증메일 단계 실패 시 Auth 자동 롤백
 * 4) 서버에서 닉네임 원자 선점/멱등 복구
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
  const safeName = (displayName || "").trim();
  let user = null;
  let createdNow = false;

  const current = auth.currentUser;
  if (
    current &&
    !current.emailVerified &&
    normalizeEmail(current.email) === emailTrim
  ) {
    user = current;
  } else {
    try {
      const created = await createUserWithEmailAndPassword(
        auth,
        emailTrim,
        password
      );
      user = created.user;
      createdNow = true;
    } catch (createError) {
      if (createError?.code !== "auth/email-already-in-use") {
        throw createError;
      }

      const resumed = await tryResumeUnverifiedSignup(emailTrim, password);
      if (!resumed) throw createError;
      user = resumed;
    }
  }

  // Auth 프로필 + 인증메일.
  // 신규 Auth를 방금 만든 경우에만 setup 실패 시 Auth를 롤백합니다.
  try {
    await _updateAuthProfile(user, { displayName: safeName });
    if (!user.emailVerified) {
      await sendEmailVerification(user, buildEmailActionSettings(continueUrl));
    }
  } catch (setupError) {
    if (createdNow) {
      try {
        await deleteUser(user);
      } catch (rollbackError) {
        console.error("신규 Auth 계정 롤백 실패:", rollbackError);
      }
    }
    throw setupError;
  }

  // 닉네임은 서버 트랜잭션으로 최초 1회 선점합니다.
  // 재개된 동일 UID + 동일 닉네임이면 멱등 성공합니다.
  try {
    const claim = httpsCallable(functions, "claimNickname");
    await claim({ nickname: (nickname || "").trim() });
  } catch (claimError) {
    // 신규 Auth를 이번 요청에서 만들었고 닉네임 선점이 실패했다면 계정만 롤백합니다.
    // claimNickname 자체는 트랜잭션이므로 실패 시 부분 nickname 쓰기가 남지 않습니다.
    if (createdNow) {
      try {
        await deleteUser(user);
      } catch (rollbackError) {
        console.error("닉네임 선점 실패 후 Auth 롤백 실패:", rollbackError);
      }
    }
    throw claimError;
  }

  // Firestore 문서 보장 — nickname 자체는 서버 claimNickname만 기록합니다.
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

/**
 * 이메일 변경 확인 메일 발송
 * - 현재 비밀번호로 재인증
 * - 새 이메일 소유 확인 링크 발송
 * - 링크 확인 전에는 Auth/Firestore 이메일을 바꾸지 않음
 * - 링크 확인 후 Firebase Auth가 이메일을 변경하며 AuthContext가 users.email을 동기화
 */
export async function requestEmailChange(
  newEmail,
  currentPassword,
  continueUrl = "/profile"
) {
  const u = requireAuthUser();
  const currentEmail = normalizeEmail(u.email);
  const nextEmail = normalizeEmail(newEmail);
  const password = String(currentPassword || "");

  if (!currentEmail) {
    throw new Error("현재 로그인 이메일을 확인할 수 없습니다.");
  }
  if (!nextEmail) {
    throw new Error("새 이메일을 입력해 주세요.");
  }
  if (nextEmail === currentEmail) {
    throw new Error("현재 이메일과 다른 이메일을 입력해 주세요.");
  }
  if (!password) {
    throw new Error("보안을 위해 현재 비밀번호를 입력해 주세요.");
  }

  const credential = EmailAuthProvider.credential(currentEmail, password);
  await reauthenticateWithCredential(u, credential);

  await verifyBeforeUpdateEmail(
    u,
    nextEmail,
    buildEmailActionSettings(continueUrl || "/profile")
  );

  return {
    currentEmail,
    pendingEmail: nextEmail,
  };
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
