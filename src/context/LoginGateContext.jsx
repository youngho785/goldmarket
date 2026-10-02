// src/context/LoginGateContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useLocation } from "react-router-dom";
import ContinueAfterLoginModal from "@/components/auth/ContinueAfterLoginModal";
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
    actionLabel: "",
    cancelLabel: "",
    cancelAsText: false,
    unifiedContinue: false,
    purposeLabel: "",
    verificationMessage: "",
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
      actionLabel,
      cancelLabel,
      cancelAsText = false,
      unifiedContinue = false,
      purposeLabel = "",
      verificationMessage = "",
    }) => {
      const returnPath = sanitizeAppReturnPath(next || from || "/", "/");

      setModalProps({
        title,
        message,
        requireVerified,
        intent: intent || "",
        next: returnPath,
        actionLabel: actionLabel || "",
        cancelLabel: cancelLabel || "",
        cancelAsText: !!cancelAsText,
        unifiedContinue: !!unifiedContinue,
        purposeLabel: purposeLabel || "",
        verificationMessage: verificationMessage || "",
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

  const effectiveMessage =
    needsVerification && modalProps.verificationMessage
      ? modalProps.verificationMessage
      : modalProps.message;

  return (
    <ContinueAfterLoginModal
      open={isOpen}
      onClose={closeGate}
      actionPath={actionPath}
      returnTo={returnTo}
      intent={modalProps.intent || undefined}
      needsVerification={needsVerification}
      unifiedContinue={modalProps.unifiedContinue}
      purposeLabel={modalProps.purposeLabel}
      title={modalProps.title}
      message={effectiveMessage}
      actionLabel={modalProps.actionLabel}
      cancelLabel={modalProps.cancelLabel}
      cancelAsText={modalProps.cancelAsText}
    />
  );
}
