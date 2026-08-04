// src/context/AppProviders.jsx
import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { LoginGateProvider } from "@/context/LoginGateContext";

/**
 * 금교환 전용 서비스에서 필요한 인증과 로그인 게이트만 마운트합니다.
 * 순서 중요:
 * - LoginGateProvider는 AuthContext를 사용하므로 AuthProvider "안쪽"에 둡니다.
 */
export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <LoginGateProvider>{children}</LoginGateProvider>
    </AuthProvider>
  );
}
