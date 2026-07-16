//src/components/common/ProtectedRoute.jsx
import React, { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { useLoginGate } from "@/context/LoginGateContext";

/** 전역 busy 플래그를 세션스토리지로 공유 (탈퇴 등 민감 플로우 동안 깜빡임 억제) */
const APP_BUSY_KEY = "__app_busy__";
const readAppBusy = () => {
  try {
    return sessionStorage.getItem(APP_BUSY_KEY) === "1";
  } catch {
    return false;
  }
};

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
  allowUnverified = false,
}) {
  const { user, loading, isEmailVerified, isAdmin, isSuperAdmin } = useAuthContext();
  const { openGate, isOpen } = useLoginGate();
  const openedRef = useRef(false);
  const location = useLocation();

  // 세션스토리지 기반 appBusy 감지 (storage/visibilitychange로 동기화)
  const [appBusy, setAppBusy] = useState(readAppBusy());
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === APP_BUSY_KEY) setAppBusy(readAppBusy());
    };
    const onVisibility = () => setAppBusy(readAppBusy());
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    // 전역 busy 중에는 게이트/리다이렉트 로직을 잠시 중단
    if (loading || appBusy) return;

    if (user && (allowUnverified || isEmailVerified)) {
      openedRef.current = false; // 조건 충족 → 리셋
      return;
    }

    if (!openedRef.current) {
      if (!user) {
        openGate({
          title: "로그인이 필요합니다",
          message: "계속하시려면 로그인 또는 회원가입을 완료해 주세요.",
          requireVerified: !allowUnverified,
          from: location.pathname,
        });
      } else if (!allowUnverified && !isEmailVerified) {
        openGate({
          title: "이메일 인증이 필요합니다",
          message: "이메일 인증을 완료하시면 바로 계속됩니다.",
          requireVerified: true,
          from: location.pathname,
        });
      }
      openedRef.current = true;
    }
  }, [loading, user, isEmailVerified, allowUnverified, openGate, location.pathname, appBusy]);

  // 로딩 중이거나 전역 busy면 깔끔한 로딩 UI만 표시(리다이렉트/게이트 X)
  if (loading || appBusy) {
    return (
      <div style={{ textAlign: "center", marginTop: 40 }}>
        진행 중입니다…
      </div>
    );
  }

  // 게이팅 상태: 모달이 떠야 하는데 혹시 못 뜨는 경우, 최소 폴백 UI 제공
  if (!user || (!allowUnverified && !isEmailVerified)) {
    return (
      <>
        {!isOpen && (
          <div style={{ maxWidth: 520, margin: "48px auto", padding: 20, textAlign: "center" }}>
            <h2 style={{ marginBottom: 8 }}>회원가입 웰컴 순금 0.01g 적립</h2>
            <p style={{ color: "#666" }}>
              로그인이 필요합니다. 아래 버튼으로 로그인/회원가입 페이지로 이동할 수 있어요.
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
              <Link
                to="/login"
                state={{ from: location.pathname }}
                style={{
                  padding: "10px 14px",
                  background: "#2563eb",
                  color: "#fff",
                  borderRadius: 8,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                로그인
              </Link>
              <Link
                to="/register"
                state={{ from: location.pathname }}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #2563eb",
                  color: "#2563eb",
                  borderRadius: 8,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                회원가입
              </Link>
            </div>
          </div>
        )}
      </>
    );
  }

  // 권한 부족 시엔 안전하게 홈으로
  if (requireSuperAdmin && !isSuperAdmin) return <Navigate to="/" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return children ?? <Outlet />;
}
