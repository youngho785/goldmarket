// src/hooks/useInstallPrompt.js
// ==================================
import { useEffect, useRef, useState, useCallback } from "react";

/** 로컬스토리지 키 (쿨다운) */
const KEY_SNOOZE_UNTIL = "pwa_install_snooze_until"; // ms timestamp

/** UA 감지 */
function detectIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/i.test(ua);
}
function detectStandalone() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)");
  return (mq && mq.matches) || window.navigator.standalone === true;
}

export default function useInstallPrompt({ snoozeDays = 30 } = {}) {
  const deferredRef = useRef(null);

  const [isIOS] = useState(detectIOS());
  const [isStandaloneState, setStandalone] = useState(detectStandalone());

  // 배너를 보여도 되는가? (스누즈X, 설치되지 않음)
  const [canInstall, setCanInstall] = useState(false);

  // 네이티브 설치 프롬프트가 가능한가? (BIP 확보 여부)
  const [readyToPrompt, setReadyToPrompt] = useState(false);

  // 크롬류 지원 여부(참고용)
  const [supported, setSupported] = useState(false);

  const isSnoozed = () => {
    if (typeof window === "undefined") return false;
    let until = 0;
    try {
      until = Number(localStorage.getItem(KEY_SNOOZE_UNTIL) || 0);
    } catch {}
    return Date.now() < until;
  };

  const snooze = useCallback((days = snoozeDays) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(KEY_SNOOZE_UNTIL, String(until));
    } catch {}
    setCanInstall(false);
    setReadyToPrompt(false);
  }, [snoozeDays]);

  const recompute = useCallback(() => {
    const standalone = detectStandalone();
    setStandalone(standalone);

    // 배너 노출 조건
    if (standalone || isSnoozed()) {
      setCanInstall(false);
    } else {
      // ✅ 배너는 플랫폼 무관 “안내형”으로라도 노출
      setCanInstall(true);
    }

    // 네이티브 프롬프트 가능 여부
    // iOS는 항상 false (시스템 프롬프트 없음)
    setReadyToPrompt(!!deferredRef.current && !isIOS);

  }, [isIOS]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBIP = (e) => {
      // 우리가 직접 띄울 것이므로 기본 동작 방지
      e.preventDefault();
      deferredRef.current = e;
      setSupported(true);
      recompute();
      try {
        window.dispatchEvent(new CustomEvent("PWA_INSTALL_READY"));
      } catch {}
    };

    const onInstalled = () => {
      setStandalone(true);
      setCanInstall(false);
      setReadyToPrompt(false);
      snooze(365);
    };

    // 강제 배너 노출 (테스트/디버그용)
    const onShowAgain = () => {
      if (detectStandalone() || isSnoozed()) {
        setCanInstall(false);
        return;
      }
      // 배너는 언제나 노출 가능(안내형), BIP 오면 자동 전환
      setCanInstall(true);
      setReadyToPrompt(!!deferredRef.current && !isIOS);
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("PWA_INSTALL_SHOW_AGAIN", onShowAgain);

    // 초기 계산
    setTimeout(recompute, 0);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("PWA_INSTALL_SHOW_AGAIN", onShowAgain);
    };
  }, [recompute, snooze]);

  const promptInstall = useCallback(async () => {
    const ev = deferredRef.current;
    if (!ev) return null; // 아직 준비 안 됨
    try {
      ev.prompt();
      const choice = await ev.userChoice; // { outcome: 'accepted' | 'dismissed' }
      deferredRef.current = null;
      setSupported(false);
      setReadyToPrompt(false);
      return choice?.outcome;
    } finally {
      // 닫기/스누즈는 호출측에서
    }
  }, []);

  // (선택) 디버깅 편의
  try {
    window.PWA_DEBUG = {
      isIOS,
      isStandalone: isStandaloneState,
      supported,
      canInstall,
      readyToPrompt,
      snoozed: isSnoozed(),
      hasDeferred: !!deferredRef.current,
    };
  } catch {}

  return {
    isIOS,
    isStandalone: isStandaloneState,
    supported,
    canInstall,     // 배너 노출 여부
    readyToPrompt,  // 네이티브 설치 가능 여부(BIP 확보)
    promptInstall,  // 네이티브 설치 호출
    snooze,         // 배너 닫기(쿨다운)
  };
}
