// src/components/PrivateRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export default function PrivateRoute({ children, requiredRole }) {
  const { user, userData } = useAuthContext();  // userData에 사용자의 역할 정보가 포함된다고 가정
  
  if (!user) {
    // 로그인 안 되어 있으면 로그인 페이지로 리다이렉션
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && userData.role !== requiredRole) {
    // 필요한 역할이 지정되어 있고, 사용자의 역할이 일치하지 않는 경우
    return <Navigate to="/not-authorized" />;
  }
  
  return children;
}
