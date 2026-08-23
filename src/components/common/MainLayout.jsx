// src/components/common/MainLayout.jsx
// =====================================
import React, { useEffect, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import styled from "styled-components";

import Navbar from "./Navbar";
import AndroidAppHeader from "./AndroidAppHeader";
import ScrollRestoration from "./ScrollRestoration";
import FCMNotifications from "./FCMNotifications";
import OfficialAppBanner from "@/components/OfficialAppBanner";
import BottomNav from "./BottomNav";
import AdminBottomNav from "./AdminBottomNav";
import Footer from "./Footer";
import { Container } from "./Container";

import { LoginGateMount } from "@/context/LoginGateContext";
import { useAuthContext } from "@/context/AuthContext";
import { isAndroid } from "@/platform/runtime";

const MainContent = styled.main`
  width: 100%;
  flex: 1 0 auto;
  padding-bottom: ${({ $hideBottomNav, $android }) =>
    $android
      ? $hideBottomNav
        ? "30px"
        : "calc(92px + env(safe-area-inset-bottom, 0px))"
      : $hideBottomNav
        ? "72px"
        : "132px"};

  @media (max-width: 768px) {
    padding-bottom: ${({ $hideBottomNav, $android }) =>
      $android
        ? $hideBottomNav
          ? "24px"
          : "calc(88px + env(safe-area-inset-bottom, 0px))"
        : $hideBottomNav
          ? "56px"
          : "116px"};
  }
`;

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
      console.warn(
        `[MiniBoundary:${this.props.name || "unknown"}]`,
        err,
        info
      );
    } catch {}
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function RouteSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
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
              "linear-gradient(90deg, var(--gm-surface-alt) 25%, var(--gm-border) 37%, var(--gm-surface-alt) 63%)",
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
              "linear-gradient(90deg, var(--gm-surface-alt) 25%, var(--gm-border) 37%, var(--gm-surface-alt) 63%)",
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
              "linear-gradient(90deg, var(--gm-surface-alt) 25%, var(--gm-border) 37%, var(--gm-surface-alt) 63%)",
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
              "linear-gradient(90deg, var(--gm-surface-alt) 25%, var(--gm-border) 37%, var(--gm-surface-alt) 63%)",
            backgroundSize: "400% 100%",
            animation: "sk 1.2s ease-in-out infinite",
            marginBottom: 10,
          }}
        />
      </div>
      <style>
        {`@keyframes sk { 0%{background-position: 100% 0} 100%{background-position: 0 0} }`}
      </style>
    </div>
  );
}

export default function MainLayout() {
  const { pathname } = useLocation();
  const { isAdmin = false } = useAuthContext() || {};

  const noBottomPadding = pathname === "/" || isAndroid;
  const isAdminPath = pathname.startsWith("/admin");
  const showAdminBottomNav = isAdminPath && isAdmin;

  const hideBottomNav =
    (isAdminPath && !showAdminBottomNav) ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/reset-password");

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.hideBottomNav = hideBottomNav ? "1" : "0";
  }, [hideBottomNav]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>

      {isAndroid && !isAdminPath ? <AndroidAppHeader /> : <Navbar />}
      <ScrollRestoration />

      {typeof window !== "undefined" && (
        <>
          <MiniBoundary name="FCMNotifications">
            <FCMNotifications />
          </MiniBoundary>

          {!isAndroid && !isAdminPath && !hideBottomNav && (
            <MiniBoundary name="OfficialAppBanner">
              <OfficialAppBanner />
            </MiniBoundary>
          )}
        </>
      )}

      <MainContent
        id="main-content"
        role="main"
        aria-label="메인 콘텐츠"
        $hideBottomNav={hideBottomNav}
        $android={isAndroid}
      >
        <Container noBottomPadding={noBottomPadding}>
          <Suspense fallback={<RouteSkeleton />}>
            <Outlet />
          </Suspense>
        </Container>

        <LoginGateMount />
      </MainContent>

      {showAdminBottomNav ? (
        <div id="adminBottomNav">
          <AdminBottomNav />
        </div>
      ) : !hideBottomNav ? (
        <div id="bottomNav">
          <BottomNav />
        </div>
      ) : null}

      {!isAndroid && <Footer />}
    </>
  );
}
