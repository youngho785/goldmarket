// src/components/common/PushPermissionPrompt.jsx
import React, { useEffect, useMemo, useState } from "react";

const KEY = "push_prompt_snooze_until";      // ms timestamp
const SESSION_KEY = "push_prompt_shown_session";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// 🔒 전역 싱글톤 가드 키(중복 렌더 방지)
const MOUNT_KEY = "__GM_PUSH_PROMPT_MOUNTED__";
// 전역 프로모션 락 키 (설치 배너 열림과 충돌 방지)
const PROMO_LOCK = "__GM_PROMO_BUSY__"; // e.g. 'install' | null

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
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}
function isPermissionDefault() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try { return window.Notification.permission === "default"; }
  catch { return false; }
}

export default function PushPermissionPrompt({
  delayMs = 8000,
  snoozeDays = 1,         // 다음 날까진 다시 안 뜨게(기본 1일)
  oncePerSession = true,  // 같은 세션에서는 1회만 노출
}) {
  // 🔒 싱글톤 가드
  const [singletonOk, setSingletonOk] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") { setSingletonOk(true); return; }
    if (window[MOUNT_KEY]) { setSingletonOk(false); return; }
    window[MOUNT_KEY] = true;
    setSingletonOk(true);
    return () => { try { delete window[MOUNT_KEY]; } catch {} };
  }, []);

  const [show, setShow] = useState(false);
  const [installOpen, setInstallOpen] = useState(
    typeof window !== "undefined" ? window[PROMO_LOCK] === "install" : false
  );

  // InstallBanner 열림/닫힘 이벤트 수신 → 겹치지 않게
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOpen = () => setInstallOpen(true);
    const onClose = () => setInstallOpen(false);
    window.addEventListener("GM_PROMO_INSTALL_OPEN", onOpen);
    window.addEventListener("GM_PROMO_INSTALL_CLOSE", onClose);
    return () => {
      window.removeEventListener("GM_PROMO_INSTALL_OPEN", onOpen);
      window.removeEventListener("GM_PROMO_INSTALL_CLOSE", onClose);
    };
  }, []);

  const isIOS = detectIOS();
  const isStandalone = detectStandalone();

  // snooze 검사
  const snoozedUntil = useMemo(() => {
    try {
      return Number(localStorage.getItem(KEY) || 0);
    } catch {
      return 0;
    }
  }, []);

  useEffect(() => {
    if (!singletonOk) return;

    // iOS는 홈화면 추가(standalone) 상태에서만 웹푸시 가능 → 설치 전에는 숨김
    if (isIOS && !isStandalone) return;

    if (!isSupported()) return;
    if (!isPermissionDefault()) return;     // 이미 허용/거부면 X
    if (Date.now() < snoozedUntil) return;  // 스누즈 기간
    if (installOpen) return;                // 설치 배너 열렸으면 대기

    if (oncePerSession) {
      try {
        if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      } catch {}
    }

    const t = setTimeout(() => {
      setShow(true);
      if (oncePerSession) {
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      }
    }, delayMs);
    return () => clearTimeout(t);
  }, [singletonOk, delayMs, snoozedUntil, installOpen, oncePerSession, isIOS, isStandalone]);

  if (!singletonOk || !show) return null;

  const snooze = () => {
    try {
      const until = Date.now() + snoozeDays * MS_PER_DAY;
      localStorage.setItem(KEY, String(until));
    } catch {}
    setShow(false);
  };

  const request = async () => {
    try {
      await window.Notification.requestPermission();
    } finally {
      // 허용/거부와 무관하게 당장은 닫고, FCM 초기화는 별도 컴포넌트가 처리
      snooze();
    }
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: `calc(12px + env(safe-area-inset-bottom))`,
        zIndex: 9000, // 설치 배너보다 낮게
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        background: "#0b141a",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,.2)",
      }}
    >
      <span style={{ fontWeight: 800 }}>알림을 허용하시겠어요?</span>
      <span style={{ opacity: 0.9, fontSize: 13 }}>
        교환 진행·메시지·예약 상태를 바로 받아볼 수 있어요.
      </span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button
          onClick={snooze}
          style={{ background: "transparent", color: "#cbd5e1", border: "none" }}
        >
          나중에
        </button>
        <button
          onClick={request}
          style={{
            background: "#60a5fa",
            color: "#0b141a",
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            fontWeight: 800,
          }}
        >
          허용
        </button>
      </div>
    </div>
  );
}
