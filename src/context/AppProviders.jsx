//src/context/AppProviders.jsx
import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { LoginGateProvider } from "@/context/LoginGateContext";
import { NotificationProvider } from "@/context/NotificationContext";

/**
 * Provider 순서
 * - NotificationProvider와 LoginGateProvider는 AuthContext를 사용하므로
 *   반드시 AuthProvider 안쪽에 둡니다.
 */
export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <LoginGateProvider>{children}</LoginGateProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
