// src/context/AuthContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";

import {
  onIdTokenChanged,
  getIdTokenResult,
} from "firebase/auth";

import {
  logout as authLogout,
  login as authLogin,
  resetPassword as authResetPassword,
  changePassword as authChangePassword,
  // ⬇️ 서비스 레이어 함수들
  updateAuthProfileFields as authUpdateProfile,
  signUp as authSignUp,
  sendVerificationEmailIfNeeded as authSendVerificationEmailIfNeeded,
} from "../services/authService";

import { auth } from "../firebase/firebase";
import { claimNickname } from "../services/nicknameClient";

// ⬇️ Firestore 접근용
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

// ✅ Android Native Push
import { isAndroid } from "../platform/runtime";
import { initializeNativePush } from "../push/nativePush";

const AuthContext = createContext({
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isEmailVerified: false,
  login: async () => {},
  signUp: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  changePassword: async () => {},
  updateProfile: async () => {},
  sendEmailVerification: async () => {},
  refreshClaims: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔸 null 순간 보호용 타이머 id 저장
  const nullTimerRef = useRef(null);

  /*
   * Firebase Auth 토큰/유저 변화 감지
   */
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(
      auth,
      async (currentUser) => {
        // 이전 대기 타이머 클리어
        if (nullTimerRef.current) {
          clearTimeout(nullTimerRef.current);
          nullTimerRef.current = null;
        }

        if (currentUser) {
          setUser(currentUser);
          setIsEmailVerified(currentUser.emailVerified);

          try {
            const tokenResult =
              await getIdTokenResult(currentUser);

            const superAdmin =
              tokenResult.claims.superAdmin === true;

            setIsSuperAdmin(superAdmin);

            setIsAdmin(
              tokenResult.claims.admin === true ||
                superAdmin
            );
          } catch {
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }

          /*
           * 이메일 인증 완료된 사용자의
           * 프로필 문서를 자동 생성(없을 때만)
           */
          if (currentUser.emailVerified) {
            try {
              const userDocRef = doc(
                db,
                "users",
                currentUser.uid
              );

              const snap = await getDoc(userDocRef);

              if (!snap.exists()) {
                const pendingNickname =
                  localStorage.getItem(
                    `pending_nickname_${currentUser.uid}`
                  ) || "";

                const phone =
                  localStorage.getItem(
                    `pending_phone_${currentUser.uid}`
                  ) || "";

                let nicknameClaimed = !pendingNickname;
                if (pendingNickname) {
                  try {
                    await claimNickname(pendingNickname);
                    nicknameClaimed = true;
                  } catch (nicknameError) {
                    console.warn(
                      "보류 닉네임 서버 선점 실패:",
                      nicknameError?.message || nicknameError
                    );
                  }
                }

                await setDoc(userDocRef, {
                  phone,
                  email: currentUser.email,
                  createdAt: serverTimestamp(),
                }, { merge: true });

                if (nicknameClaimed) {
                  localStorage.removeItem(
                    `pending_nickname_${currentUser.uid}`
                  );
                }
                localStorage.removeItem(
                  `pending_phone_${currentUser.uid}`
                );
              } else {
                const storedEmail = String(
                  snap.data()?.email || ""
                ).trim().toLowerCase();
                const authEmail = String(
                  currentUser.email || ""
                ).trim();

                // 이메일 변경 확인 링크 처리 뒤 Firebase Auth가 새 이메일로 바뀌면
                // Firestore users.email도 인증된 Auth 이메일에 맞춰 자동 동기화합니다.
                if (authEmail && storedEmail !== authEmail.toLowerCase()) {
                  await setDoc(
                    userDocRef,
                    {
                      email: authEmail,
                      updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                  );
                }
              }
            } catch (e) {
              console.warn(
                "프로필 자동 생성 실패:",
                e
              );
            }
          }

          setLoading(false);
        } else {
          /*
           * 비번 변경 직후 등 토큰 재발급 과정에서
           * 잠깐 null일 수 있으므로 아주 짧게(100ms)
           * 대기 후 최종 상태 확정
           */
          nullTimerRef.current = setTimeout(() => {
            const u = auth.currentUser;

            if (u) {
              setUser(u);
              setIsEmailVerified(u.emailVerified);
            } else {
              setUser(null);
              setIsAdmin(false);
              setIsSuperAdmin(false);
              setIsEmailVerified(false);
            }

            setLoading(false);
            nullTimerRef.current = null;
          }, 100);
        }
      }
    );

    return () => {
      if (nullTimerRef.current) {
        clearTimeout(nullTimerRef.current);
      }

      unsubscribe();
    };
  }, []);

  /*
   * ─────────────────────────────────────────────
   * Android Native Push 연결
   * ─────────────────────────────────────────────
   *
   * 로그인 상태:
   *   현재 회원 UID와 Android FCM 토큰을 연결합니다.
   *
   * 로그아웃 상태:
   *   Native Push 자체는 계속 초기화된 상태로 유지합니다.
   *
   * 중요:
   *   로그아웃한다고 FCM 토큰을 삭제하지 않습니다.
   *   따라서 이미 신청한 금교환의 진행 알림이나
   *   동의한 금시세·혜택 알림은 계속 받을 수 있습니다.
   *
   * 알림 권한이 아직 prompt 상태라면
   * 여기서는 권한창을 자동으로 띄우지 않습니다.
   */
  useEffect(() => {
    if (!isAndroid || loading) {
      return;
    }

    let cancelled = false;

    const initialize = async () => {
      try {
        const result = await initializeNativePush(
          user?.uid || ""
        );

        if (cancelled) {
          return;
        }

        if (
          import.meta.env.DEV &&
          result?.supported
        ) {
          console.log(
            "[AuthContext] Native Push initialized:",
            {
              uid: user?.uid || null,
              permission:
                result.permission || "unknown",
              hasToken: !!result.token,
            }
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "[AuthContext] Native Push initialization failed:",
            error
          );
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loading, user?.uid]);

  /*
   * 컨텍스트 value 메모이즈
   * 불필요한 전역 리렌더 방지
   */
  const ctxValue = useMemo(() => {
    const login = (email, password) =>
      authLogin(email, password);

    /*
     * 회원가입은 서비스 레이어로 단일화
     * 프로필 생성 + 인증메일 포함
     */
    const signUp = async ({
      email,
      password,
      displayName,
      nickname,
      phone,
      continueUrl = "",
    }) => {
      const user = await authSignUp({
        email,
        password,
        displayName,
        nickname,
        phone,
        continueUrl,
      });

      // 기존 화면과의 호환 위해 유사한 형태로 반환
      return { user };
    };

    /*
     * 중요:
     *
     * 로그아웃은 Firebase Auth 세션만 종료합니다.
     *
     * Android FCM 토큰,
     * users/{uid}.fcmTokens[],
     * users/{uid}.nativeFcmTokens[]
     * 는 여기서 삭제하지 않습니다.
     */
    const logout = () => authLogout();

    const resetPassword = (email) =>
      authResetPassword(email);

    const changePassword = (newPassword) =>
      authChangePassword(newPassword);

    const updateProfile = (profile) =>
      authUpdateProfile(profile);

    /*
     * 이메일 인증 재전송
     * 기존 API 유지
     */
    const sendEmailVerificationLink = (continueUrl = "") =>
      authSendVerificationEmailIfNeeded(continueUrl || "/");

    /*
     * 커스텀 클레임 최신화 헬퍼
     * 운영 편의
     */
    const refreshClaims = async () => {
      if (!auth.currentUser) {
        return false;
      }

      await auth.currentUser.getIdToken(true);

      const res = await getIdTokenResult(
        auth.currentUser
      );

      const superAdmin =
        res.claims.superAdmin === true;

      setIsSuperAdmin(superAdmin);

      setIsAdmin(
        res.claims.admin === true ||
          superAdmin
      );

      return true;
    };

    return {
      user,
      loading,
      isAdmin,
      isSuperAdmin,
      isEmailVerified,
      login,
      signUp,
      logout,
      resetPassword,
      changePassword,
      updateProfile,
      sendEmailVerification:
        sendEmailVerificationLink,
      refreshClaims,
    };
  }, [
    user,
    loading,
    isAdmin,
    isSuperAdmin,
    isEmailVerified,
  ]);

  return (
    <AuthContext.Provider value={ctxValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () =>
  useContext(AuthContext);
