// src/components/common/PushPermissionPrompt.jsx
import React, { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";

const KEY = "push_prompt_snooze_until";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PROMO_LOCK = "__GM_PROMO_BUSY__";

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent || "");
}

function detectStandalone() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)");
  return (mq && mq.matches) || window.navigator.standalone === true;
}

function isSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

function permissionState() {
  if (!isSupported()) return "unsupported";
  try {
    return window.Notification.permission;
  } catch {
    return "unsupported";
  }
}

export default function PushPermissionPrompt({
  context = "general",
  snoozeDays = 1,
  variant = "inline",
}) {
  const { user } = useAuthContext();
  const [dismissed, setDismissed] = useState(false);
  const [installOpen, setInstallOpen] = useState(
    typeof window !== "undefined" ? window[PROMO_LOCK] === "install" : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onOpen = () => setInstallOpen(true);
    const onClose = () => setInstallOpen(false);

    window.addEventListener("GM_PROMO_INSTALL_OPEN", onOpen);
    window.addEventListener("GM_PROMO_INSTALL_CLOSE", onClose);

    return () => {
      window.removeEventListener("GM_PROMO_INSTALL_OPEN", onOpen);
      window.removeEventListener("GM_PROMO_INSTALL_CLOSE", onClose);
    };
  }, []);

  if (!user?.uid || dismissed) return null;

  const isIOS = detectIOS();
  const isStandalone = detectStandalone();

  // iPhone Safari는 홈 화면 설치 후 웹 푸시를 신청합니다.
  if (isIOS && !isStandalone) return null;

  // 권한이 이미 허용되었거나 거부된 경우 반복해서 표시하지 않습니다.
  if (permissionState() !== "default") return null;

  // 앱 설치 배너와 동시에 표시하지 않습니다.
  if (installOpen) return null;

  let snoozedUntil = 0;
  try {
    snoozedUntil = Number(localStorage.getItem(KEY) || 0);
  } catch {}
  if (Date.now() < snoozedUntil) return null;

  const snooze = () => {
    try {
      localStorage.setItem(
        KEY,
        String(Date.now() + snoozeDays * MS_PER_DAY)
      );
    } catch {}
    setDismissed(true);
  };

  const request = async () => {
    if (!isSupported() || permissionState() !== "default") {
      setDismissed(true);
      return;
    }

    try {
      const permission = await window.Notification.requestPermission();
      if (permission === "granted") {
        window.dispatchEvent(new Event("PUSH_PERMISSION_GRANTED"));
      }
    } finally {
      setDismissed(true);
    }
  };

  const description =
    context === "exchange-complete"
      ? "예약 접수·승인과 교환 완료 소식을 알려드려요."
      : "중요한 소식과 진행 상황을 알려드려요.";

  return (
    <div
      role="group"
      aria-label="한국골드마켓 알림 받기"
      style={{
        margin: variant === "inline" ? "18px 0 4px" : 0,
        padding: "16px",
        border: "1px solid var(--gm-border)",
        background: "var(--gm-surface-alt)",
        color: "var(--gm-text)",
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gap: 5 }}>
        <strong style={{ fontSize: 16, color: "var(--gm-primary)" }}>
          한국골드마켓 알림 받기
        </strong>
        <span
          style={{
            color: "var(--gm-text-secondary)",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          {description}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={snooze}
          style={{
            minHeight: 40,
            padding: "8px 12px",
            background: "transparent",
            color: "var(--gm-text-secondary)",
            border: "1px solid var(--gm-border-strong)",
            fontWeight: 700,
          }}
        >
          나중에
        </button>

        <button
          type="button"
          onClick={request}
          style={{
            minHeight: 40,
            padding: "8px 14px",
            background: "var(--gm-gold)",
            color: "var(--gm-text)",
            border: "none",
            fontWeight: 800,
          }}
        >
          알림 받기
        </button>
      </div>
    </div>
  );
}
