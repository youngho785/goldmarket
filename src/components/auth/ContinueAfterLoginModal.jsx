import React from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

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
  if (!open) return null;

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="continue-after-login-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(92vw, 420px)",
          background: "#fff",
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
              background: "#eef3f8",
              color: "#1F3A5F",
              fontSize: ".78rem",
              fontWeight: 850,
            }}
          >
            {purposeLabel}
          </div>
        ) : null}

        <h2
          id="continue-after-login-title"
          style={{ margin: 0, fontSize: "1.2rem", lineHeight: 1.35, wordBreak: "keep-all" }}
        >
          {resolvedTitle}
        </h2>

        <p
          style={{
            margin: "10px 0 16px",
            color: "#555",
            lineHeight: 1.65,
            wordBreak: "keep-all",
          }}
        >
          {resolvedMessage}
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          <Link
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
              background: "#1F3A5F",
              color: "#fff",
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
              background: useTextCancel ? "transparent" : "#f3f4f6",
              border: useTextCancel ? "none" : "1px solid #e5e7eb",
              color: useTextCancel ? "#6b7280" : "inherit",
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
