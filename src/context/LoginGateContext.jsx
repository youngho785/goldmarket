// src/context/LoginGateContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import {
  buildAuthPath,
  buildVerifyEmailPath,
  sanitizeAppReturnPath,
} from "@/lib/authReturn";

const LoginGateCtx = createContext(null);

export function LoginGateProvider({ children }) {
  const { user, isEmailVerified } = useAuthContext();

  const [isOpen, setIsOpen] = useState(false);
  const [modalProps, setModalProps] = useState({
    title: "",
    message: "",
    requireVerified: true,
    intent: "",
    next: "/",
  });

  const pendingRef = useRef(null);
  const requireVerifiedRef = useRef(true);

  const openGate = useCallback(
    ({
      title,
      message,
      requireVerified = true,
      intent,
      next,
      from,
      afterAuth,
    }) => {
      const returnPath = sanitizeAppReturnPath(next || from || "/", "/");

      setModalProps({
        title,
        message,
        requireVerified,
        intent: intent || "",
        next: returnPath,
      });
      requireVerifiedRef.current = !!requireVerified;
      pendingRef.current =
        typeof afterAuth === "function" ? afterAuth : null;
      setIsOpen(true);
    },
    []
  );

  const closeGate = useCallback(() => {
    setIsOpen(false);
    pendingRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const ok =
      user &&
      (!requireVerifiedRef.current ||
        (requireVerifiedRef.current && isEmailVerified));

    if (ok) {
      const fn = pendingRef.current;
      pendingRef.current = null;
      setIsOpen(false);

      if (typeof fn === "function") {
        setTimeout(() => {
          try {
            fn();
          } catch (e) {
            console.error("afterAuth failed:", e);
          }
        }, 0);
      }
    }
  }, [user, isEmailVerified, isOpen]);

  const value = {
    isOpen,
    modalProps,
    openGate,
    closeGate,
  };

  return (
    <LoginGateCtx.Provider value={value}>
      {children}
    </LoginGateCtx.Provider>
  );
}

export function useLoginGate() {
  const ctx = useContext(LoginGateCtx);
  if (!ctx) {
    throw new Error("useLoginGate must be used within LoginGateProvider");
  }
  return ctx;
}

export function LoginGateMount() {
  const { isOpen, modalProps, closeGate } = useLoginGate();
  const { user, isEmailVerified } = useAuthContext();
  const location = useLocation();

  if (!isOpen) return null;

  const currentPath =
    `${location.pathname}${location.search}${location.hash}` || "/";
  const returnTo = sanitizeAppReturnPath(
    modalProps.next || currentPath,
    "/"
  );

  const needsVerification =
    !!user && modalProps.requireVerified && !isEmailVerified;

  const actionPath = needsVerification
    ? buildVerifyEmailPath(returnTo)
    : buildAuthPath("/login", returnTo);

  const actionLabel = needsVerification
    ? "이메일 인증 계속하기"
    : "로그인/회원가입";

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
      onClick={closeGate}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(92vw, 420px)",
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,.18)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
          {modalProps.title ||
            (needsVerification
              ? "이메일 인증이 필요합니다"
              : "로그인이 필요합니다")}
        </h2>

        <p style={{ margin: "10px 0 16px", color: "#555" }}>
          {modalProps.message ||
            (needsVerification
              ? "인증을 완료한 뒤 원래 화면으로 돌아옵니다."
              : "계속하려면 로그인 또는 회원가입을 완료해 주세요.")}
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          <Link
            to={actionPath}
            state={{
              from: returnTo,
              intent: modalProps.intent || undefined,
            }}
            onClick={closeGate}
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "12px 14px",
              background: "#1F3A5F",
              color: "#fff",
              fontWeight: 800,
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            {actionLabel}
          </Link>

          <button
            type="button"
            onClick={closeGate}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              fontWeight: 700,
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
