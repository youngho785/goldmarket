import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export default function ContinueAfterLoginModal({
  open,
  onClose,
  actionPath,
  returnTo,
  intent,
  needsVerification = false,
  unifiedContinue = false,
  purposeLabel = "",
  title = "",
  message = "",
  actionLabel = "",
  cancelLabel = "",
  cancelAsText = false,
}) {
  const dialogRef = useRef(null);
  const actionRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      (actionRef.current || dialogRef.current)?.focus?.();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const resolvedTitle =
    title ||
    (unifiedContinue
      ? needsVerification
        ? "이메일 인증 후 계속해 주세요"
        : "계속하려면 로그인이 필요해요"
      : needsVerification
        ? "이메일 인증이 필요합니다"
        : "로그인이 필요합니다");

  const resolvedMessage =
    message ||
    (needsVerification
      ? "인증을 완료한 뒤 원래 화면으로 돌아옵니다."
      : "계속하려면 로그인 또는 회원가입을 완료해 주세요.");

  const resolvedActionLabel =
    actionLabel ||
    (unifiedContinue
      ? needsVerification
        ? "이메일 인증하고 계속"
        : "로그인 / 회원가입하고 계속"
      : needsVerification
        ? "이메일 인증 계속하기"
        : "로그인/회원가입");

  const resolvedCancelLabel = cancelLabel || (unifiedContinue ? "나중에" : "닫기");
  const useTextCancel = unifiedContinue || cancelAsText;

  const node = (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        tabIndex={-1}
        style={{
          width: "min(92vw, 420px)",
          background: "var(--gm-surface)",
          color: "var(--gm-text)",
          border: "1px solid var(--gm-border)",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,.18)",
        }}
      >
        {purposeLabel ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 26,
              marginBottom: 9,
              padding: "4px 9px",
              borderRadius: 999,
              background: "var(--gm-surface-alt)",
              color: "var(--gm-primary)",
              fontSize: ".78rem",
              fontWeight: 850,
            }}
          >
            {purposeLabel}
          </div>
        ) : null}

        <h2
          id={titleId}
          style={{ margin: 0, fontSize: "1.2rem", lineHeight: 1.35, wordBreak: "keep-all" }}
        >
          {resolvedTitle}
        </h2>

        <p
          id={messageId}
          style={{
            margin: "10px 0 16px",
            color: "var(--gm-text-secondary)",
            lineHeight: 1.65,
            wordBreak: "keep-all",
          }}
        >
          {resolvedMessage}
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          <Link
            ref={actionRef}
            to={actionPath}
            state={{
              from: returnTo,
              intent,
            }}
            onClick={onClose}
            style={{
              display: "inline-block",
              textAlign: "center",
              padding: "12px 14px",
              background: "var(--gm-primary)",
              color: "var(--gm-surface)",
              fontWeight: 800,
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            {resolvedActionLabel}
          </Link>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: useTextCancel ? "8px 12px" : "10px 12px",
              borderRadius: 10,
              background: useTextCancel ? "transparent" : "var(--gm-surface-alt)",
              border: useTextCancel ? "none" : "1px solid var(--gm-border)",
              color: useTextCancel ? "var(--gm-text-secondary)" : "var(--gm-text)",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {resolvedCancelLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
