// src/context/AppProviders.jsx
import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import { ChatProvider } from "@/context/ChatContext";
import { LoginGateProvider } from "@/context/LoginGateContext"; // ⬅️ 추가

/**
 * 항상 모든 Provider를 마운트합니다.
 * 내부에서 user?.uid를 보고 Firestore 구독을 붙일지 말지 결정하므로
 * 게스트/로딩 단계에서도 부담이 크지 않습니다.
 *
 * ⚠️ 순서 중요:
 * - LoginGateProvider는 AuthContext를 사용하므로 AuthProvider "안쪽"에 둡니다.
 * - 나머지 컨텍스트는 기존 순서 유지.
 */
export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <LoginGateProvider>
        <NotificationProvider>
          <FavoritesProvider>
            <ChatProvider>{children}</ChatProvider>
          </FavoritesProvider>
        </NotificationProvider>
      </LoginGateProvider>
    </AuthProvider>
  );
}
