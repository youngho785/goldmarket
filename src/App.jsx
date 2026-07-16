// src/App.jsx
import React, {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
} from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
} from "react-router-dom";
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
import { onPushMessage } from "@/firebase/firebase";

/* ───────────────────── 작은 에러 바운더리 ───────────────────── */
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

/* ───────────────────── 방어적 lazy 래퍼 ───────────────────── */
const safeLazy = (importer, namedKey) =>
  lazy(() =>
    importer().then((m) => {
      if (m?.default) return { default: m.default };
      if (namedKey && typeof m[namedKey] === "function") {
        return { default: m[namedKey] };
      }
      const candidate = Object.values(m).find((v) => typeof v === "function");
      if (candidate) return { default: candidate };
      return { default: () => null };
    })
  );

/* Lazy Pages */
const LandingPage                      = lazy(() => import("@/pages/LandingPage"));
const TradeHome                        = lazy(() => import("@/pages/TradeHome"));
const ProductDetail                    = lazy(() => import("@/pages/ProductDetail"));
const Sell                             = lazy(() => import("@/pages/Sell"));
const MyProducts                       = lazy(() => import("@/pages/MyProducts"));
const Favorites                        = lazy(() => import("@/pages/Favorites"));
const Profile                          = lazy(() => import("@/pages/Profile"));
const ChatListPage                     = lazy(() => import("@/pages/ChatList"));
const ChatRoomPage                     = lazy(() => import("@/pages/ChatRoom"));
const NotificationsPage                = lazy(() => import("@/pages/NotificationsPage"));
const GoldExchange                     = lazy(() => import("@/pages/GoldExchange"));
const MyOrders                         = lazy(() => import("@/pages/MyOrders"));
const MyExchanges                      = lazy(() => import("@/pages/MyExchanges"));
const Login                            = lazy(() => import("@/pages/Login"));
const Register                         = lazy(() => import("@/pages/Register"));
const VerifyEmail                      = lazy(() => import("@/pages/VerifyEmail"));
const ResetPassword                    = lazy(() => import("@/pages/ResetPassword"));
const TransactionReview                = lazy(() => import("@/pages/TransactionReview"));
const TransactionReviewsSummaryWrapper = lazy(() => import("@/pages/TransactionReviewsSummaryWrapper"));
const BoardTabs                        = lazy(() => import("@/components/BoardTabs"));
const CreateBoardPost                  = lazy(() => import("@/pages/CreateBoardPost"));
const BoardDetail                      = lazy(() => import("@/pages/BoardDetail"));
const EditBoardPost                    = lazy(() => import("@/pages/EditBoardPost"));
const AdminDashboard                   = lazy(() => import("@/pages/AdminDashboard"));
const StatisticsDashboard              = lazy(() => import("@/pages/admin/StatisticsDashboard"));
const OverviewDashboard                = lazy(() => import("@/pages/admin/OverviewDashboard"));
const AdminGoldExchange                = lazy(() => import("@/pages/admin/AdminGoldExchange"));
const GoldbarFee                       = lazy(() => import("@/pages/GoldbarFee"));
const Stores                           = lazy(() => import("@/pages/Stores"));
/* ▶ 이벤트 퀴즈 페이지 */
const QuizGoldBonus                    = lazy(() => import("@/pages/QuizGoldBonus"));

/* ▶ 정책/약관 페이지 */
const Terms         = safeLazy(() => import("@/pages/terms/Terms"), "Terms");
const Privacy       = safeLazy(() => import("@/pages/terms/Privacy"), "Privacy");
const Lspa          = safeLazy(() => import("@/pages/terms/Lspa"), "Lspa");
const MarketPolicy  = safeLazy(() => import("@/pages/terms/MarketPolicy"), "MarketPolicy");

/* ▶ 내 문의 페이지 */
const MyInquiries   = lazy(() => import("@/pages/MyInquiries"));

/* ▶ 관리자 문의 관리 페이지 */
const AdminInquiries = lazy(() => import("@/pages/admin/AdminInquiries"));

/* ───────────────────── Color Scheme 컨텍스트 ───────────────────── */
const STORAGE_KEY = "color-scheme"; // "light" | "dark" | "system"
export const ColorSchemeContext = createContext({
  scheme: "system",
  isDark: false,
  setScheme: () => {},
  toggle: () => {},
});
export const useColorScheme = () => useContext(ColorSchemeContext);

function getInitialScheme() {
  if (typeof window === "undefined") return { scheme: "system", isDark: false };
  const saved = localStorage.getItem(STORAGE_KEY) || "system";
  const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
  const isDark = saved === "dark" || (saved === "system" && !!mql && mql.matches);
  return { scheme: saved, isDark };
}

/* ───────────────────── Utility Routes ───────────────────── */
function AuthActionBridge() {
  const location = useLocation();
  return <Navigate to={`/verify-email${location.search}`} replace />;
}

function RootShell() {
  return (
    <>
      <SwBridge />
      <MainLayout />
    </>
  );
}

/* ───────────────────── Router ───────────────────── */
const router = createBrowserRouter([
  {
    element: <RootShell />,
    errorElement: <RouteError />,
    children: [
      // Public
      { path: "/",               element: <LandingPage /> },
      { path: "/trade",          element: <TradeHome /> },
      { path: "/product/:id",    element: <ProductDetail /> },
      { path: "/goldbar-fee",    element: <GoldbarFee /> },
      { path: "/stores",         element: <Stores /> },
      { path: "/gold-exchange",  element: <GoldExchange /> },
      /* ▶ 이벤트 퀴즈(페이지 자체에서 로그인 가드/참여 처리) */
      { path: "/quiz/gold-bonus", element: <QuizGoldBonus /> },

      // ▶ 정책/약관 화면
      { path: "/terms",          element: <Terms /> },
      { path: "/privacy",        element: <Privacy /> },
      { path: "/lspa",           element: <Lspa /> },
      { path: "/policy",         element: <MarketPolicy /> },

      // Protected
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/sell",                    element: <Sell /> },
          { path: "/my-products",             element: <MyProducts /> },
          { path: "/favorites",               element: <Favorites /> },
          { path: "/profile",                 element: <Profile /> },
          { path: "/chat",                    element: <ChatListPage /> },
          { path: "/chat/:chatId",            element: <ChatRoomPage /> },
          { path: "/notifications",           element: <NotificationsPage /> },
          { path: "/my-orders",               element: <MyOrders /> },
          { path: "/my-exchanges",            element: <MyExchanges /> },

          /* ▶ 내 문의 (로그인 필요) */
          { path: "/board/mine/inquiries",    element: <MyInquiries /> },
        ],
      },

      // Auth
      { path: "/login",           element: <Login /> },
      { path: "/register",        element: <Register /> },
      { path: "/verify-email",    element: <VerifyEmail /> },
      { path: "/reset-password",  element: <ResetPassword /> },

      // Firebase email action
      { path: "/__/auth/action",  element: <AuthActionBridge /> },

      // Reviews
      { path: "/transactionReview",            element: <TransactionReview targetUserId="defaultUser" /> },
      { path: "/transactionReviews/:sellerId", element: <TransactionReviewsSummaryWrapper /> },

      // Board (공개)
      { path: "/board",              element: <BoardTabs /> },
      { path: "/board/new",          element: <CreateBoardPost /> },
      { path: "/board/:postId",      element: <BoardDetail /> },
      { path: "/board/:postId/edit", element: <EditBoardPost /> },

      // Admin
      {
        path: "/admin",
        element: <AdminRoute />,
        children: [
          {
            element: <AdminDashboard />,
            children: [
              { index: true,            element: <OverviewDashboard /> },
              { path: "gold-exchange",  element: <AdminGoldExchange /> },
              { path: "statistics",     element: <StatisticsDashboard /> },
              { path: "board/inquiries", element: <AdminInquiries /> },
            ],
          },
        ],
      },

      // 404
      { path: "*", element: <NotFound /> },
    ],
  },
]);

/* ───────────────────── App ───────────────────── */
export default function App() {
  const [{ scheme, isDark }, setState] = useState(getInitialScheme);

  useEffect(() => {
    if (scheme !== "system") return;
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return;
    const onChange = () => setState({ scheme, isDark: mql.matches });
    mql.addEventListener ? mql.addEventListener("change", onChange) : mql.addListener(onChange);
    return () => {
      mql.removeEventListener ? mql.removeEventListener("change", onChange) : mql.removeListener(onChange);
    };
  }, [scheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const ctxValue = useMemo(
    () => ({
      scheme,
      isDark,
      setScheme: (next) => {
        localStorage.setItem("color-scheme", next);
        if (next === "light") setState({ scheme: next, isDark: false });
        else if (next === "dark") setState({ scheme: next, isDark: true });
        else {
          const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
          setState({ scheme: "system", isDark: !!mql && mql.matches });
        }
      },
      toggle: () => {
        const next = isDark ? "light" : "dark";
        localStorage.setItem("color-scheme", next);
        setState({ scheme: next, isDark: next === "dark" });
      },
    }),
    [scheme, isDark]
  );

  const activeTheme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    const handler = (e) => {
      const msg = e?.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "PUSH_MESSAGE") {
        window.dispatchEvent(new CustomEvent("APP_PUSH_MESSAGE", { detail: msg.data || {} }));
      }
      if (msg.type === "OPEN_URL" && msg.data?.url) {
        // 필요 시 라우팅 처리 가능
      }
    };
    if (navigator?.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", handler);
    }
    return () => {
      if (navigator?.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", handler);
      }
    };
  }, []);

  useEffect(() => {
    const off = onPushMessage?.(() => {
      window.dispatchEvent(new CustomEvent("APP_PUSH_MESSAGE", { detail: { source: "foreground" } }));
    });
    return () => off && off();
  }, []);

  return (
    <ColorSchemeContext.Provider value={ctxValue}>
      <ThemeProvider theme={activeTheme}>
        <GlobalStyle />
        <Suspense fallback={<Loader />}>
          <RouterProvider router={router} />
        </Suspense>
      </ThemeProvider>
    </ColorSchemeContext.Provider>
  );
}
