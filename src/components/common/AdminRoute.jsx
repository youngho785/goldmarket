import React from "react";
import { multiFactor } from "firebase/auth";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext";

export default function AdminRoute() {
  const { user, isAdmin, loading } = useAuthContext();
  const location = useLocation();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const requireMfa =
    String(import.meta.env?.VITE_REQUIRE_ADMIN_MFA || "")
      .trim()
      .toLowerCase() === "true";
  const hasMfa = user ? multiFactor(user).enrolledFactors.length > 0 : false;
  const isSecurityPage = location.pathname === "/admin/security";

  if (requireMfa && !hasMfa && !isSecurityPage) {
    return <Navigate to="/admin/security" replace />;
  }

  return <Outlet />;
}
