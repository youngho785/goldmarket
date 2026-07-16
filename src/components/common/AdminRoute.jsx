// src/components/common/AdminRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

export default function AdminRoute() {
  const { isAdmin, loading } = useAuthContext();
  if (loading) return null;  // 혹은 스피너
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}
