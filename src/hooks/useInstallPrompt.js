// src/hooks/useInstallPrompt.js
// ==================================
// 정식 앱 출시 전 정책:
// - PWA 설치 권장/설치 프롬프트를 사용하지 않습니다.
// - 기존 호출부가 남아 있어도 아무 UI가 뜨지 않도록 호환 API만 유지합니다.
// - 웹 푸시용 Service Worker(/sw.js)는 이 파일과 별개로 계속 사용할 수 있습니다.

import { useCallback, useState } from "react";

const KEY_SNOOZE_UNTIL = "pwa_install_snooze_until";

export const APP_INSTALL_REQUEST_EVENT = "GM_PWA_INSTALL_REQUEST";
export const APP_INSTALL_NUDGE_EVENT = "GM_PWA_INSTALL_NUDGE";

export function detectSamsungInternet() {
  if (typeof navigator === "undefined") return false;
  return /SamsungBrowser/i.test(navigator.userAgent || "");
}

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent || "");
}

function detectStandalone() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)");
  return Boolean((mq && mq.matches) || window.navigator.standalone === true);
}

// 정식 Google Play 앱 출시 전에는 PWA 설치 요청을 발생시키지 않습니다.
export function requestAppInstall() {
  return false;
}

// 문맥형/재방문 설치 유도도 비활성화합니다.
export function nudgeAppInstall() {
  return false;
}

export function clearInstallSnooze() {
  try {
    localStorage.removeItem(KEY_SNOOZE_UNTIL);
  } catch {}
}

export default function useInstallPrompt({ snoozeDays = 30 } = {}) {
  const [isIOS] = useState(detectIOS());
  const [isSamsungInternet] = useState(detectSamsungInternet());
  const [isStandalone] = useState(detectStandalone());

  const snooze = useCallback(
    (days = snoozeDays) => {
      const until = Date.now() + Number(days || 0) * 24 * 60 * 60 * 1000;
      try {
        localStorage.setItem(KEY_SNOOZE_UNTIL, String(until));
      } catch {}
    },
    [snoozeDays]
  );

  const promptInstall = useCallback(async () => null, []);

  return {
    isIOS,
    isSamsungInternet,
    isStandalone,
    supported: false,
    canInstall: false,
    readyToPrompt: false,
    promptInstall,
    snooze,
  };
}
