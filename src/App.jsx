// src/App.jsx
import React, {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { PushNotifications } from "@capacitor/push-notifications";
import { App as CapacitorApp } from "@capacitor/app";
import { ThemeProvider } from "styled-components";
import GlobalStyle from "@/styles/GlobalStyle";
import { theme as lightTheme } from "@/theme";
import { darkTheme } from "@/theme.dark";

import MainLayout from "@/components/common/MainLayout.jsx";
import ProtectedRoute from "@/components/common/ProtectedRoute.jsx";
import AdminRoute from "@/components/common/AdminRoute.jsx";
import Loader from "@/components/common/Loader.jsx";
import NotFound from "@/pages/NotFound.jsx";
import SwBridge from "@/components/common/SwBridge.jsx";
import { auth } from "@/firebase/firebase";
import { isAndroid } from "@/platform/runtime";

function RouteError() {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 8 }}>문제가 발생했습니다.</h2>
      <p style={{ color: "#6b7280" }}>
        잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침하거나 이전 페이지로 돌아가세요.
      </p>
    </div>
  );
}

const safeLazy = (importer, namedKey) =>
  lazy(() =>
    importer().then((module) => {
      if (module?.default) return { default: module.default };
      if (namedKey && typeof module[namedKey] === "function") {
        return { default: module[namedKey] };
      }
      const candidate = Object.values(module).find(
        (value) => typeof value === "function"
      );
      return { default: candidate || (() => null) };
    })
  );

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const GoldPrice = lazy(() => import("@/pages/GoldPrice"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
const GoldExchange = lazy(() => import("@/pages/GoldExchange"));
const MyExchanges = lazy(() => import("@/pages/MyExchanges"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const StatisticsDashboard = lazy(() => import("@/pages/admin/StatisticsDashboard"));
const OverviewDashboard = lazy(() => import("@/pages/admin/OverviewDashboard"));
const AdminGoldExchange = lazy(() => import("@/pages/admin/AdminGoldExchange"));
const AdminGoldPrice = lazy(() => import("@/pages/admin/AdminGoldPrice"));
const AdminGoldRates = lazy(() => import("@/pages/admin/AdminGoldRates"));
const AdminMembers = lazy(() => import("@/pages/admin/AdminMembers"));
const AdminNotifications = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
const AdminSecurity = lazy(() => import("@/pages/admin/AdminSecurity"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const GoldbarFee = lazy(() => import("@/pages/GoldbarFee"));
const Stores = lazy(() => import("@/pages/Stores"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const QuizGoldBonus = lazy(() => import("@/pages/QuizGoldBonus"));

const Terms = safeLazy(() => import("@/pages/terms/Terms"), "Terms");
const Privacy = safeLazy(() => import("@/pages/terms/Privacy"), "Privacy");
const AccountDelete = lazy(() => import("@/pages/AccountDelete"));

const MyInquiries = lazy(() => import("@/pages/MyInquiries"));
const CreateInquiry = lazy(() => import("@/pages/CreateInquiry"));
const InquiryDetail = lazy(() => import("@/pages/InquiryDetail"));
const EditInquiry = lazy(() => import("@/pages/EditInquiry"));
const AdminInquiries = lazy(() => import("@/pages/admin/AdminInquiries"));

const STORAGE_KEY = "color-scheme";
const NATIVE_PUSH_PENDING_KEY = "__native_push_pending_navigation__";
const NATIVE_PUSH_PENDING_MAX_AGE_MS = 30 * 60 * 1000;

export const ColorSchemeContext = createContext({
  scheme: "system",
  isDark: false,
  setScheme: () => {},
  toggle: () => {},
});

export const useColorScheme = () => useContext(ColorSchemeContext);

function getInitialScheme() {
  if (typeof window === "undefined") {
    return { scheme: "system", isDark: false };
  }

  const saved = localStorage.getItem(STORAGE_KEY) || "system";
  const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  const isDark =
    saved === "dark" ||
    (saved === "system" && !!mediaQuery && mediaQuery.matches);

  return { scheme: saved, isDark };
}

function normalizeInternalPushLink(value) {
  const link = String(value || "").trim();

  if (
    !link ||
    !link.startsWith("/") ||
    link.startsWith("//") ||
    link.includes("\\") ||
    link.length > 300
  ) {
    return "/";
  }

  return link;
}

function requiresLoginForPushLink(link) {
  const path = String(link || "/").split(/[?#]/, 1)[0] || "/";

  return (
    path === "/profile" ||
    path === "/settings" ||
    path === "/notifications" ||
    path === "/my-exchanges" ||
    path.startsWith("/my-exchanges/") ||
    path === "/support" ||
    path.startsWith("/support/") ||
    path === "/admin" ||
    path.startsWith("/admin/")
  );
}

function savePendingNativePushLink(link) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      NATIVE_PUSH_PENDING_KEY,
      JSON.stringify({
        link,
        savedAt: Date.now(),
      })
    );
  } catch (error) {
    console.warn(
      "[Native Push] pending navigation 저장 실패:",
      error?.message || error
    );
  }
}

function readPendingNativePushLink() {
  if (typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem(NATIVE_PUSH_PENDING_KEY);
    if (!raw) return "";

    const parsed = JSON.parse(raw);
    const link = normalizeInternalPushLink(parsed?.link);
    const savedAt = Number(parsed?.savedAt || 0);

    if (!savedAt || Date.now() - savedAt > NATIVE_PUSH_PENDING_MAX_AGE_MS) {
      localStorage.removeItem(NATIVE_PUSH_PENDING_KEY);
      return "";
    }

    return link;
  } catch {
    try {
      localStorage.removeItem(NATIVE_PUSH_PENDING_KEY);
    } catch {}
    return "";
  }
}

function clearPendingNativePushLink() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(NATIVE_PUSH_PENDING_KEY);
  } catch {}
}

function AuthActionBridge() {
  const location = useLocation();
  return <Navigate to={`/verify-email${location.search}`} replace />;
}

/**
 * Android Native 알림을 눌렀을 때 앱 내부 경로로 이동시킵니다.
 *
 * - 로그인 상태: 알림의 link로 바로 이동
 * - 로그아웃 상태 + 보호된 경로: 로그인 화면으로 이동
 * - 사용자가 직접 로그인 완료: 원래 알림의 link로 자동 이동
 *
 * 주의:
 * 이 코드는 사용자를 자동 로그인시키지 않습니다.
 * 로그인 완료 여부는 Firebase Auth의 실제 인증 상태로 확인합니다.
 */
function NativePushNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAndroid) return undefined;

    let cancelled = false;
    let actionHandle = null;

    const registerActionListener = async () => {
      try {
        actionHandle = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            if (cancelled) return;

            const rawLink = action?.notification?.data?.link;
            const link = normalizeInternalPushLink(rawLink);

            console.log("[Native Push] notification navigation:", {
              link,
              signedIn: !!auth.currentUser,
            });

            if (requiresLoginForPushLink(link) && !auth.currentUser) {
              savePendingNativePushLink(link);
              navigate("/login");
              return;
            }

            clearPendingNativePushLink();
            navigate(link);
          }
        );
      } catch (error) {
        console.error(
          "[Native Push] action listener 등록 실패:",
          error
        );
      }
    };

    registerActionListener();

    return () => {
      cancelled = true;
      actionHandle?.remove?.();
    };
  }, [navigate]);

  useEffect(() => {
    if (!isAndroid) return undefined;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const pendingLink = readPendingNativePushLink();
      if (!pendingLink) return;

      clearPendingNativePushLink();

      window.setTimeout(() => {
        navigate(pendingLink, { replace: true });
      }, 0);
    });

    return unsubscribe;
  }, [navigate]);

  return null;
}

/**
 * Android 시스템 뒤로가기 버튼을 React Router의 이동 기록과 연결합니다.
 *
 * 1) 이전 화면이 있으면 이전 화면으로 이동
 * 2) 앱이 딥링크 등으로 서브페이지에서 시작해 이전 기록이 없으면 홈으로 이동
 * 3) 홈에서 더 이상 돌아갈 곳이 없으면 앱을 종료하지 않고 백그라운드로 보냄
 */
function AndroidBackButtonBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!isAndroid) return undefined;

    let cancelled = false;
    let backHandle = null;

    const registerBackListener = async () => {
      try {
        backHandle = await CapacitorApp.addListener(
          "backButton",
          ({ canGoBack }) => {
            if (cancelled) return;

            const current = locationRef.current;

            if (canGoBack) {
              window.history.back();
              return;
            }

            if (current?.pathname && current.pathname !== "/") {
              navigate("/", { replace: true });
              return;
            }

            CapacitorApp.minimizeApp().catch((error) => {
              console.warn(
                "[Android Back] 앱 백그라운드 전환 실패:",
                error?.message || error
              );
            });
          }
        );
      } catch (error) {
        console.error(
          "[Android Back] 뒤로가기 리스너 등록 실패:",
          error
        );
      }
    };

    registerBackListener();

    return () => {
      cancelled = true;
      backHandle?.remove?.();
    };
  }, [navigate]);

  return null;
}

function RootShell() {
  return (
    <>
      <SwBridge />
      <NativePushNavigationBridge />
      <AndroidBackButtonBridge />
      <MainLayout />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/gold-price", element: <GoldPrice /> },
      { path: "/goldbar-fee", element: <GoldbarFee /> },
      { path: "/stores", element: <Stores /> },
      { path: "/gold-exchange", element: <GoldExchange /> },
      { path: "/reviews", element: <Reviews /> },
      { path: "/quiz/gold-bonus", element: <QuizGoldBonus /> },
      { path: "/terms", element: <Terms /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/account-delete", element: <AccountDelete /> },

      {
        element: <ProtectedRoute />,
        children: [
          { path: "/profile", element: <Profile /> },
          { path: "/settings", element: <Settings /> },
          { path: "/notifications", element: <NotificationsPage /> },
          { path: "/my-exchanges", element: <MyExchanges /> },
          { path: "/support", element: <MyInquiries /> },
          { path: "/support/new", element: <CreateInquiry /> },
          { path: "/support/:postId", element: <InquiryDetail /> },
          { path: "/support/:postId/edit", element: <EditInquiry /> },
        ],
      },

      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/verify-email", element: <VerifyEmail /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/__/auth/action", element: <AuthActionBridge /> },

      {
        path: "/admin",
        element: <AdminRoute />,
        children: [
          {
            element: <AdminDashboard />,
            children: [
              { index: true, element: <OverviewDashboard /> },
              { path: "gold-exchange", element: <AdminGoldExchange /> },
              { path: "gold-price", element: <AdminGoldPrice /> },
              { path: "gold-rates", element: <AdminGoldRates /> },
              { path: "members", element: <AdminMembers /> },

              // 관리자 본인의 알림함
              { path: "notifications", element: <NotificationsPage /> },

              // 관리자 수동 알림 발송
              { path: "notification-send", element: <AdminNotifications /> },

              { path: "statistics", element: <StatisticsDashboard /> },
              { path: "support", element: <AdminInquiries /> },
              { path: "audit-logs", element: <AdminAuditLogs /> },
              { path: "security", element: <AdminSecurity /> },
            ],
          },
        ],
      },

      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  const [{ scheme, isDark }, setState] = useState(getInitialScheme);

  useEffect(() => {
    if (scheme !== "system") return undefined;

    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mediaQuery) return undefined;

    const onChange = () =>
      setState({ scheme, isDark: mediaQuery.matches });

    mediaQuery.addEventListener?.("change", onChange);
    return () => mediaQuery.removeEventListener?.("change", onChange);
  }, [scheme]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );
  }, [isDark]);

  const contextValue = useMemo(
    () => ({
      scheme,
      isDark,
      setScheme: (next) => {
        localStorage.setItem(STORAGE_KEY, next);

        if (next === "light") {
          setState({ scheme: next, isDark: false });
        } else if (next === "dark") {
          setState({ scheme: next, isDark: true });
        } else {
          const mediaQuery = window.matchMedia?.(
            "(prefers-color-scheme: dark)"
          );
          setState({
            scheme: "system",
            isDark: !!mediaQuery && mediaQuery.matches,
          });
        }
      },
      toggle: () => {
        const next = isDark ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, next);
        setState({ scheme: next, isDark: next === "dark" });
      },
    }),
    [scheme, isDark]
  );

  return (
    <ColorSchemeContext.Provider value={contextValue}>
      <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
        <GlobalStyle />
        <Suspense fallback={<Loader />}>
          <RouterProvider router={router} />
        </Suspense>
      </ThemeProvider>
    </ColorSchemeContext.Provider>
  );
}