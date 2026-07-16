// src/components/common/MainLayout.jsx
// =====================================
import React, { useEffect, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Navbar from "./Navbar";
import ScrollRestoration from "./ScrollRestoration";
import FCMNotifications from "./FCMNotifications";
import BottomNav from "./BottomNav";
import Footer from "./Footer";
import { Container } from "./Container";

// 로그인 게이트 모달을 Router 안쪽에서 마운트
import { LoginGateMount } from "@/context/LoginGateContext";

// ✅ 푸시 권한 안내 바
import PushPermissionPrompt from "@/components/common/PushPermissionPrompt";

// ✅ 앱 설치 배너
import InstallBanner from "../InstallBanner";

/* ──────────────────────────────────────────────
 * 국소 에러바운더리: 특정 UI가 터져도 앱 전체가 죽지 않도록
 * (문제가 난 컴포넌트만 숨기고 콘솔 경고만 남김)
 * ────────────────────────────────────────────── */
class MiniBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err, info) {
    try {
      console.warn(`[MiniBoundary:${this.props.name || "unknown"}]`, err, info);
    } catch {}
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/** 라우트 로딩 스켈레톤
 * - fallback이 null일 때 발생하던 "푸터 먼저 보임" 방지
 * - 초기/전환 시 메인 영역을 즉시 채워 레이아웃 점프(CLS) 감소
 */
function RouteSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        // 모바일 주소창 변동 안정화: svh 사용
        minHeight: "calc(100svh - 144px)",
        padding: "16px 0",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 16px" }}>
        <div
          style={{
            height: 18,
            width: "38%",
            borderRadius: 8,
            background:
              "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)",
            backgroundSize: "400% 100%",
            animation: "sk 1.2s ease-in-out infinite",
            marginBottom: 14,
          }}
        />
        <div
          style={{
            height: 48,
            width: "100%",
            borderRadius: 12,
            background:
              "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)",
            backgroundSize: "400% 100%",
            animation: "sk 1.2s ease-in-out infinite",
            marginBottom: 10,
          }}
        />
        <div
          style={{
            height: 160,
            width: "100%",
            borderRadius: 12,
            background:
              "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)",
            backgroundSize: "400% 100%",
            animation: "sk 1.2s ease-in-out infinite",
            marginBottom: 10,
          }}
        />
        <div
          style={{
            height: 160,
            width: "100%",
            borderRadius: 12,
            background:
              "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)",
            backgroundSize: "400% 100%",
            animation: "sk 1.2s ease-in-out infinite",
            marginBottom: 10,
          }}
        />
      </div>
      {/* 스켈레톤 keyframes (인라인) */}
      <style>
        {`@keyframes sk { 0%{background-position: 100% 0} 100%{background-position: 0 0} }`}
      </style>
    </div>
  );
}

export default function MainLayout() {
  const { pathname } = useLocation();

  // 랜딩은 하단 패딩 제거
  const noBottomPadding = pathname === "/";

  // 하단 네비 숨길 경로
  const hideBottomNav =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/reset-password");

  // 채팅 화면 여부 (body.chat-mode 토글)
  const isChat = pathname === "/chat" || pathname.startsWith("/chat/");

  // ── GlobalStyle의 헬퍼들과 연동 ───────────────────────────
  useEffect(() => {
    if (typeof document === "undefined") return; // 클라이언트에서만
    // 채팅 페이지일 때 바디 패딩 제거
    document.body.classList.toggle("chat-mode", isChat);
    // 하단 네비 숨김 플래그 (GlobalStyle의 선택자와 일치)
    document.body.dataset.hideBottomNav = hideBottomNav ? "1" : "0";
  }, [isChat, hideBottomNav]);

  // 하단 버튼 네비 높이 (요청값 56px)
  const BOTTOM_NAV_HEIGHT = 56;

  return (
    <>
      {/* 접근성: 키보드 사용자를 위한 '본문 바로가기' (GlobalStyle의 .skip-link 사용) */}
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>

      {/* 상단 내비게이션(헤더) */}
      <Navbar />

      {/* 라우트 전환 시 스크롤 복원/초기화 */}
      <ScrollRestoration />

      {/* FCM 초기화/포그라운드 알림/토스트 (브라우저에서만) */}
      {typeof window !== "undefined" && (
        <MiniBoundary name="FCMNotifications">
          <FCMNotifications />
        </MiniBoundary>
      )}

      {/* ✅ 푸시 권한 안내 바 (브라우저에서만) */}
      {typeof window !== "undefined" && (
        <MiniBoundary name="PushPermissionPrompt">
          <PushPermissionPrompt />
        </MiniBoundary>
      )}

      <main
        id="main-content"
        role="main"
        aria-label="메인 콘텐츠"
        // Footer가 먼저 보이지 않도록 초기 하단 여유를 예약
        style={{ paddingBottom: !hideBottomNav ? "120px" : "80px" }}
      >
        <Container noBottomPadding={noBottomPadding}>
          {/* Lazy route 대비: 깜빡임 없이 폴백 처리 */}
          <Suspense fallback={<RouteSkeleton />}>
            <Outlet />
          </Suspense>
        </Container>

        {/* 전역 로그인 모달 마운트 지점 */}
        <LoginGateMount />
      </main>

      {/* 하단 네비 (앵커 id 유지) */}
      {!hideBottomNav && (
        <div id="bottomNav">
          <BottomNav />
        </div>
      )}

      {/* ✅ 앱 설치 배너: 하단 버튼바(56px)만큼 오프셋을 추가해 겹침 방지 */}
      {typeof window !== "undefined" && !hideBottomNav && (
        <MiniBoundary name="InstallBanner">
          <InstallBanner
            anchorSelector="#bottomNav"
            bottomOffset={BOTTOM_NAV_HEIGHT}
          />
        </MiniBoundary>
      )}

      <Footer />
    </>
  );
}
