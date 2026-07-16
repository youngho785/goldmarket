// src/components/InstallBanner.jsx
// ================================
import React, { useEffect, useMemo, useState, useRef } from "react";
import useInstallPrompt from "@/hooks/useInstallPrompt";

// 세션 단위 노출 가드 키
const SESSION_KEY = "install_banner_shown_session";

// 🔒 전역 싱글톤 가드 키(중복 렌더 방지)
const MOUNT_KEY = "__GM_INSTALL_BANNER_MOUNTED__";
// 전역 프로모션 락 키 (푸시 프롬프트와 겹침 방지)
const PROMO_LOCK = "__GM_PROMO_BUSY__"; // e.g. 'install' | null

export default function InstallBanner({
  delayMs = 12000,
  /**
   * 스누즈 일수
   * - 1(기본): 24시간 동안 다시 안 뜸
   * - 0     : 현재 세션만 숨김(세션 끝나면 다시 가능)
   */
  snoozeDays = 1,
  /** 같은 탭/세션에선 1회만 노출 (기본 켜짐) */
  oncePerSession = true,
  bottomOffset = 12,
  anchorSelector = null,
  raisePx = 120, // 배너를 추가로 위로 올릴 픽셀
  /** 설치 준비 대기 최대 시간(ms): 준비되면 즉시 시스템 프롬프트 호출 */
  waitReadyTimeoutMs = 4000,
}) {
  const {
    isIOS,
    canInstall,        // 배너 노출 (스누즈 X + 미설치) — 훅이 단일 소스로 관리
    readyToPrompt,     // 네이티브 설치 가능(BIP 확보)
    supported,         // 참고용
    promptInstall,
    snooze: hookSnooze // 🔑 훅이 관리하는 스누즈(로컬 키 pwa_install_snooze_until)
  } = useInstallPrompt();

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
  const [showHelp, setShowHelp] = useState(false); // 안내 모달
  const [measuredOffset, setMeasuredOffset] = useState(bottomOffset);

  // “설치” 클릭 후, 준비 이벤트 대기 상태
  const [waiting, setWaiting] = useState(false);
  const waitingRef = useRef(false);
  waitingRef.current = waiting;
  const timeoutRef = useRef(null);

  // 앵커 높이 자동 측정
  useEffect(() => {
    if (!anchorSelector || typeof document === "undefined") return;
    const el = document.querySelector(anchorSelector);
    if (!el) return;

    const compute = () => {
      const rect = el.getBoundingClientRect?.() || { height: 0 };
      const h = Math.max(rect.height || 0, el.offsetHeight || 0);
      setMeasuredOffset(h + 12);
    };

    compute();

    let ro = null;
    try {
      if ("ResizeObserver" in window) {
        ro = new ResizeObserver(() => window.requestAnimationFrame(compute));
        ro.observe(el);
      }
      window.addEventListener("resize", compute);
    } catch {}

    return () => {
      try { ro && ro.disconnect(); } catch {}
      try { window.removeEventListener("resize", compute); } catch {}
    };
  }, [anchorSelector]);

  // 노출(세션 1회) + 딜레이
  // 스누즈/설치 여부 등은 훅의 canInstall이 이미 반영
  useEffect(() => {
    if (!singletonOk) return;
    if (!canInstall) return;

    // 세션 1회 제한
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
  }, [singletonOk, canInstall, delayMs, oncePerSession]);

  // 열리고/닫힐 때 전역 락/이벤트로 브로드캐스트 (푸시 프롬프트와 겹치지 않게)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!show) return;

    try {
      window[PROMO_LOCK] = "install";
      window.dispatchEvent(new Event("GM_PROMO_INSTALL_OPEN"));
    } catch {}

    return () => {
      try {
        if (window[PROMO_LOCK] === "install") window[PROMO_LOCK] = null;
        window.dispatchEvent(new Event("GM_PROMO_INSTALL_CLOSE"));
      } catch {}
    };
  }, [show]);

  // 위치 계산
  const bottom = useMemo(() => {
    const px = anchorSelector ? measuredOffset : bottomOffset;
    return `calc(${px}px + env(safe-area-inset-bottom) + 16px + ${Math.max(0, raisePx)}px)`;
  }, [anchorSelector, measuredOffset, bottomOffset, raisePx]);

  // 스누즈(나중에) — 단일 소스: 훅 snooze 사용
  const snooze = () => {
    setShow(false);
    setShowHelp(false);
    setWaiting(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try { hookSnooze(snoozeDays); } catch {}
  };

  // “설치” 버튼 → 즉시 설치 시도 + 준비 이벤트 대기(자동 프롬프트)
  const handleInstallClick = async () => {
    // iOS는 네이티브 프롬프트가 없어 안내 모달로 바로 전환
    if (isIOS) {
      setShowHelp(true);
      return;
    }

    // 이미 준비된 경우 즉시 설치 프롬프트
    if (readyToPrompt) {
      try { await promptInstall(); } finally { snooze(); }
      return;
    }

    // 아직 준비 전이면: 준비 이벤트를 잠시 대기 → 오자마자 즉시 실행
    setWaiting(true);

    // 1) 준비 신호(PWA_INSTALL_READY) 대기
    const onReady = async () => {
      window.removeEventListener("PWA_INSTALL_READY", onReady);
      if (!waitingRef.current) return;
      try { await promptInstall(); } finally { snooze(); }
    };
    window.addEventListener("PWA_INSTALL_READY", onReady, { once: true });

    // 2) 훅 재계산 트리거(브라우저가 BIP를 늦게 쏘는 케이스 가속)
    try {
      window.dispatchEvent(new Event("PWA_INSTALL_SHOW_AGAIN"));
    } catch {}

    // 3) 타임아웃: 준비가 안 되면 안내 모달로 폴백
    timeoutRef.current = setTimeout(() => {
      if (!waitingRef.current) return;
      window.removeEventListener("PWA_INSTALL_READY", onReady);
      setWaiting(false);
      setShowHelp(true);
    }, Math.max(1500, Number(waitReadyTimeoutMs) || 4000));
  };

  if (!singletonOk) return null;
  if (!show || !canInstall) return null;

  return (
    <>
      {/* 배너 */}
      <div
        id="gm-install-banner"
        role="dialog"
        aria-live="polite"
        style={{
          position: "fixed",
          left: 12,
          right: 12,
          bottom,
          zIndex: 10000, // 푸시 안내보다 위
          background: "#111827",
          color: "#fff",
          borderRadius: 12,
          padding: "12px 14px",
          boxShadow: "0 10px 30px rgba(0,0,0,.25)",
          display: "flex",
          gap: 10,
          alignItems: "center",
          touchAction: "manipulation",
          pointerEvents: "auto",
        }}
      >
        <span style={{ fontWeight: 700, lineHeight: 1.2 }}>
          Goldmarket을 앱으로 설치해 보세요
        </span>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {/* 나중에 = 스누즈 */}
          <button
            type="button"
            onClick={snooze}
            style={{
              background: "transparent",
              color: "#cbd5e1",
              border: "none",
              padding: "8px 10px",
              fontWeight: 600,
            }}
          >
            나중에
          </button>

          {/* 설치 = 네이티브 프롬프트 시도(불가면 안내 모달) */}
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={waiting}
            style={{
              background: waiting ? "#16a34a" : "#10b981",
              opacity: waiting ? 0.9 : 1,
              cursor: waiting ? "wait" : "pointer",
              color: "#0b141a",
              border: "none",
              borderRadius: 8,
              padding: "8px 12px",
              fontWeight: 800,
            }}
          >
            {waiting ? "설치 준비 중…" : "설치"}
          </button>
        </div>
      </div>

      {/* 안내 모달 */}
      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={snooze}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10001,
            background: "rgba(0,0,0,.35)",
            display: "grid",
            placeItems: "end center",
            padding: "24px 12px calc(28px + env(safe-area-inset-bottom))",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              background: "#111827",
              color: "#fff",
              borderRadius: 12,
              boxShadow: "0 20px 40px rgba(0,0,0,.35)",
              padding: 16,
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>
              앱 설치 안내
            </h3>

            {isIOS ? (
              <ol style={{ margin: 0, padding: "0 0 0 18px", lineHeight: 1.5 }}>
                <li>Safari로 접속 중인지 확인하세요.</li>
                <li>하단의 <b>공유(□↑)</b> 버튼을 누르세요.</li>
                <li><b>홈 화면에 추가</b>를 선택하면 설치됩니다.</li>
              </ol>
            ) : (
              <ol style={{ margin: 0, padding: "0 0 0 18px", lineHeight: 1.5 }}>
                <li>브라우저 메뉴(<b>⋮</b>)를 여세요.</li>
                <li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 선택하세요.</li>
                <li>
                  {supported
                    ? "설치 준비 중(잠시 후 설치 버튼이 활성화됩니다)."
                    : "일부 브라우저/인앱에선 메뉴 항목만 제공될 수 있습니다."}
                </li>
              </ol>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={snooze}
                style={{
                  background: "transparent",
                  color: "#cbd5e1",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontWeight: 700,
                  flex: "0 0 auto",
                }}
              >
                닫기
              </button>

              {readyToPrompt && (
                <button
                  type="button"
                  onClick={async () => { try { await promptInstall(); } finally { snooze(); } }}
                  style={{
                    background: "#10b981",
                    color: "#0b141a",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontWeight: 800,
                    flex: "0 0 auto",
                    marginLeft: "auto",
                  }}
                >
                  지금 설치
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
