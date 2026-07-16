// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import {
  onIdTokenChanged,
  getIdTokenResult,
  sendEmailVerification,
} from "firebase/auth";

import {
  logout as authLogout,
  login as authLogin,
  resetPassword as authResetPassword,
  changePassword as authChangePassword,
  // ⬇️ 서비스 레이어 함수들
  updateAuthProfileFields as authUpdateProfile,
  signUp as authSignUp,
} from "../services/authService";
import { auth } from "../firebase/firebase";

// ⬇️ Firestore 접근용
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

// ✅ 스플래시(Loader) 임포트
import Loader from "../components/common/Loader";

const AuthContext = createContext({
  user: null,
  loading: true,
  isAdmin: false,
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
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔸 null 순간 보호용 타이머 id 저장
  const nullTimerRef = useRef(null);

  // Firebase Auth 토큰/유저 변화 감지
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      // 토큰 갱신 타이밍에서의 깜빡임 방지
      setLoading((prev) => (prev ? prev : true));

      // 이전 대기 타이머 클리어
      if (nullTimerRef.current) {
        clearTimeout(nullTimerRef.current);
        nullTimerRef.current = null;
      }

      if (currentUser) {
        setUser(currentUser);
        setIsEmailVerified(currentUser.emailVerified);

        try {
          const tokenResult = await getIdTokenResult(currentUser);
          setIsAdmin(!!tokenResult.claims.admin);
        } catch {
          setIsAdmin(false);
        }

        // ⬇️ 이메일 인증 완료된 사용자의 프로필 문서를 자동 생성(없을 때만)
        if (currentUser.emailVerified) {
          try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const snap = await getDoc(userDocRef);
            if (!snap.exists()) {
              const nickname =
                localStorage.getItem(`pending_nickname_${currentUser.uid}`) ||
                currentUser.displayName ||
                "";
              const phone =
                localStorage.getItem(`pending_phone_${currentUser.uid}`) || "";
              await setDoc(userDocRef, {
                nickname,
                phone,
                email: currentUser.email,
                createdAt: serverTimestamp(),
              });
              localStorage.removeItem(`pending_nickname_${currentUser.uid}`);
              localStorage.removeItem(`pending_phone_${currentUser.uid}`);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn("프로필 자동 생성 실패:", e);
          }
        }

        setLoading(false);
      } else {
        // 🔐 비번 변경 직후 등 토큰 재발급 과정에서 잠깐 null일 수 있으므로
        // 아주 짧게(100ms) 대기 후 최종 상태 확정
        nullTimerRef.current = setTimeout(() => {
          const u = auth.currentUser;
          if (u) {
            setUser(u);
            setIsEmailVerified(u.emailVerified);
          } else {
            setUser(null);
            setIsAdmin(false);
            setIsEmailVerified(false);
          }
          setLoading(false);
          nullTimerRef.current = null;
        }, 100);
      }
    });

    return () => {
      if (nullTimerRef.current) {
        clearTimeout(nullTimerRef.current);
      }
      unsubscribe();
    };
  }, []);

  // ✅ 컨텍스트 value 메모이즈 (불필요한 전역 리렌더 방지)
  const ctxValue = useMemo(() => {
    const login = (email, password) => authLogin(email, password);

    // 회원가입은 서비스 레이어로 단일화 (프로필 생성 + 인증메일 포함)
    const signUp = async ({ email, password, displayName, nickname, phone }) => {
      const user = await authSignUp({ email, password, displayName, nickname, phone });
      return { user }; // 기존 화면과의 호환 위해 유사한 형태로 반환
    };

    const logout = () => authLogout();
    const resetPassword = (email) => authResetPassword(email);
    const changePassword = (newPassword) => authChangePassword(newPassword);
    const updateProfile = (profile) => authUpdateProfile(profile);

    // 이메일 인증 재전송(기존 API 유지)
    const sendEmailVerificationLink = () => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("로그인된 사용자가 없습니다."));
      }
      return sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      });
    };

    // 커스텀 클레임 최신화 헬퍼(운영 편의)
    const refreshClaims = async () => {
      if (!auth.currentUser) return false;
      await auth.currentUser.getIdToken(true);
      const res = await getIdTokenResult(auth.currentUser);
      setIsAdmin(!!res.claims.admin);
      return true;
    };

    return {
      user,
      loading,
      isAdmin,
      isEmailVerified,
      login,
      signUp,
      logout,
      resetPassword,
      changePassword,
      updateProfile,
      sendEmailVerification: sendEmailVerificationLink,
      refreshClaims,
    };
  }, [user, loading, isAdmin, isEmailVerified]);

  // ✅ 로딩 구간: 스플래시 표시
  if (loading) {
    return <Loader />;
  }

  return (
    <AuthContext.Provider value={ctxValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
