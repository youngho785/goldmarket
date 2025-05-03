// src/components/common/AdminRoute.js

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuthContext();

  // 로딩 중엔 아무 것도 렌더링하지 않음
  if (loading) return null;
  // 로그인 전이라면 로그인 페이지로
  if (!user) return <Navigate to="/login" replace />;
  // 관리자가 아니라면 홈으로
  if (!isAdmin) return <Navigate to="/" replace />;
  // 자식으로 감싼 컴포넌트가 있다면 렌더, 아니면 Outlet
  return children ?? <Outlet />;
}
