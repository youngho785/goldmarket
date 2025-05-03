// src/index.js

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom"; // Router 추가
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { FavoritesProvider } from "./context/FavoritesContext"; // FavoritesProvider 추가
import "./styles/index.css";

// 서비스 워커 등록 (FCM 백그라운드 메시지 처리)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then(reg => {
      console.log("✅ SW 등록 성공:", reg.scope);
    })
    .catch(err => {
      console.error("❌ SW 등록 실패:", err);
    });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <FavoritesProvider>
            <App />
          </FavoritesProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
