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

  // ✅ SW → 페이지 메시지 폴백 처리 (알림 클릭 등)
  //    SW가 OPEN_URL 메시지를 보낼 때 내부 경로는 SPA로, 외부는 전체 이동
  navigator.serviceWorker.addEventListener("message", (e) => {
    const msg = e?.data || {};
    if (msg.type === "OPEN_URL") {
      const url = msg?.data?.url;
      if (typeof url === "string" && url) {
        try {
          if (url.startsWith("http")) {
            window.location.href = url; // 외부 링크
          } else {
            // 내부 라우팅: 히스토리 푸시 + popstate (라우터가 감지)
            window.history.pushState({}, "", url);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        } catch {
          window.location.href = url;
        }
      }
    }
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
  } catch {}
});

const idleId2 = requestIdle(async () => {
  try {
    const preloadPages = import.meta.glob(
      [
        "./pages/GoldExchange.jsx",
        "./pages/admin/StatisticsDashboard.jsx",
        "./pages/admin/AdminGoldExchange.jsx",
        "./pages/ChatRoom.jsx",
      ],
      { eager: false }
    );
    await Promise.all(Object.values(preloadPages).map((loader) => loader()));
  } catch {}
});

export function cancelWarmups() {
  cancelIdle(idleId1);
  cancelIdle(idleId2);
}
