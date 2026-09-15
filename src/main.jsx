// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import AppProviders from "./context/AppProviders.jsx";
import { requestIdle, cancelIdle } from "./utils/idle";
import { isWeb } from "./platform/runtime";

// Service Worker는 웹/PWA 환경에서만 등록
// Capacitor Android 앱에서는 Native Push를 사용하므로 등록하지 않음
if (isWeb && "serviceWorker" in navigator) {
  window.__swReadyPromise = navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then(() => navigator.serviceWorker.ready)
    .catch((error) => {
      console.error("SW register failed:", error);
      return null;
    });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>
);

// Firebase 모듈은 앱에서 이미 정적으로 사용하므로 별도 동적 import를 하지 않습니다.
// 자주 사용하는 지연 로딩 페이지들만 유휴 시간에 미리 불러옵니다.
const pageWarmupId = requestIdle(async () => {
  try {
    const preloadPages = import.meta.glob(
      [
        "./pages/GoldExchange.jsx",
        "./pages/admin/StatisticsDashboard.jsx",
        "./pages/admin/AdminGoldExchange.jsx",
      ],
      { eager: false }
    );

    await Promise.all(
      Object.values(preloadPages).map((loader) => loader())
    );
  } catch {
    // 실제 라우트 진입 시 다시 로드됩니다.
  }
});

export function cancelWarmups() {
  cancelIdle(pageWarmupId);
}