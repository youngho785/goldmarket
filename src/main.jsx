// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import AppProviders from "./context/AppProviders.jsx";
import { requestIdle, cancelIdle } from "./utils/idle";

// --- Service Worker 등록 ---
if ("serviceWorker" in navigator) {
  const swUrl = "/sw.js";
  window.__swReadyPromise = navigator.serviceWorker
    .register(swUrl, { scope: "/" })
    .then(() => navigator.serviceWorker.ready)
    .catch((e) => {
      console.error("SW register failed:", e);
      return null;
    });

}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* ✅ 전역 Provider는 여기서 한 번만 */}
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>
);

// --- 유휴시간 프리로드 ---
const idleId1 = requestIdle(async () => {
  try {
    await import("./firebase/firebase");
    await Promise.all([
      import("firebase/auth"),
      import("firebase/firestore"),
      import("firebase/storage"),
    ]);
  } catch {
    // 실제 화면 진입 시 다시 로드되므로 유휴 프리로드 실패는 무시합니다.
  }
});

const idleId2 = requestIdle(async () => {
  try {
    const preloadPages = import.meta.glob(
      [
        "./pages/GoldExchange.jsx",
        "./pages/admin/StatisticsDashboard.jsx",
        "./pages/admin/AdminGoldExchange.jsx",
      ],
      { eager: false }
    );
    await Promise.all(Object.values(preloadPages).map((loader) => loader()));
  } catch {
    // 실제 라우트 진입 시 다시 로드됩니다.
  }
});

export function cancelWarmups() {
  cancelIdle(idleId1);
  cancelIdle(idleId2);
}
