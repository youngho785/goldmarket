// src/pages/VerifyEmail.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import {
  applyActionCode,
  checkActionCode,
} from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase/firebase";
import { sendVerificationEmailIfNeeded } from "../services/authService";
import { readMemberOnboardingPath } from "@/lib/memberOnboarding";
import { isNative } from "@/platform/runtime";
import { KGM_APP_RETURN_PARAM, KGM_PUBLIC_WEB_ORIGIN } from "@/lib/emailActionUrl";
import { useAuthContext } from "@/context/AuthContext";

/* ───────── Styled ───────── */
const Container = styled.div`
  max-width: 480px;
  margin: 8px auto 32px;
  padding: clamp(24px, 5vw, 38px);
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;
const Title = styled.h2`
  margin-bottom: 24px;
  color: ${({ theme }) => theme.colors.text};
`;
const Message = styled.p`
  margin-top: 16px;
  font-size: 1rem;
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};
`;
const Button = styled.button`
  margin-top: 20px;
  padding: 10px 16px;
  font-size: 1rem;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.small};
  font-weight: 750;
  cursor: pointer;
  transition: background 0.2s;
  &:disabled { opacity: .55; cursor: not-allowed; }
  &:hover:enabled { filter: brightness(.96); }
`;
const SecondaryButton = styled(Button)`
  margin-left: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  border-color: ${({ theme }) => theme.colors.border};
`;

/* 자동 이동 지연 */
const REDIRECT_DELAY = 1200;
const APP_RETURN_ATTEMPT_DELAY = 650;
const APP_RETURN_FALLBACK_DELAY = 2200;

/* 모바일 앱 전환 직후 Firebase 네트워크가 잠깐 불안정할 수 있어 reload를 재시도 */
const RELOAD_RETRY_DELAYS = [0, 800, 1600, 3000];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkRequestFailed = (err) =>
  err?.code === "auth/network-request-failed" ||
  String(err?.message || "").toLowerCase().includes("network-request-failed");

async function reloadUserWithRetry(user) {
  let lastError = null;

  for (const delay of RELOAD_RETRY_DELAYS) {
    if (delay) await wait(delay);

    try {
      await user.reload();
      return { ok: true, verified: Boolean(user.emailVerified), error: null };
    } catch (err) {
      lastError = err;
      if (!isNetworkRequestFailed(err)) throw err;
    }
  }

  return {
    ok: false,
    verified: Boolean(user.emailVerified),
    error: lastError,
  };
}

export default function VerifyEmail() {
  try { auth.languageCode = "ko"; } catch {}

  const navigate = useNavigate();
  const location = useLocation();
  const { user: contextUser } = useAuthContext();

  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [processingLink, setProcessingLink] = useState(true);
  const [resending, setResending] = useState(false);
  const [appReturnReady, setAppReturnReady] = useState(false);
  const [appReturnHint, setAppReturnHint] = useState("");
  const appReturnAttemptedRef = useRef(false);
  const quizBonusResult = location.state?.quizBonusResult || null;
  const quizBonusError = location.state?.quizBonusError || "";

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const oobCode = params.get("oobCode");
  const mode = params.get("mode");
  const continueUrl = params.get("continueUrl");

  const appReturnRequested = useMemo(() => {
    if (!continueUrl) return false;
    try {
      const url = new URL(continueUrl, KGM_PUBLIC_WEB_ORIGIN);
      return url.searchParams.get(KGM_APP_RETURN_PARAM) === "1";
    } catch {
      return false;
    }
  }, [continueUrl]);

  const isAndroidBrowser = useMemo(() => {
    if (isNative || typeof navigator === "undefined") return false;
    return /Android/i.test(String(navigator.userAgent || ""));
  }, []);

  const continuePath = useMemo(() => {
    if (!continueUrl) return "";

    try {
      const runtimeOrigin =
        typeof window !== "undefined" && window.location?.origin
          ? String(window.location.origin).replace(/\/+$/, "")
          : "";
      const baseOrigin = isNative ? KGM_PUBLIC_WEB_ORIGIN : (runtimeOrigin || KGM_PUBLIC_WEB_ORIGIN);
      const url = new URL(continueUrl, baseOrigin);
      const allowedOrigins = new Set([KGM_PUBLIC_WEB_ORIGIN, runtimeOrigin].filter(Boolean));

      if (!allowedOrigins.has(url.origin)) return "";

      // 앱 복귀용 내부 표식은 실제 이동 경로에서는 제거합니다.
      url.searchParams.delete(KGM_APP_RETURN_PARAM);
      return `${url.pathname}${url.search}${url.hash}` || "/";
    } catch {
      return "";
    }
  }, [continueUrl]);

  const destination = continuePath || readMemberOnboardingPath("") || "/";

  const appReturnUrl = useMemo(() => {
    const query = new URLSearchParams();
    query.set("path", destination);
    return `koreagoldmarket://verify-email?${query.toString()}`;
  }, [destination]);

  const appReturnIntentUrl = useMemo(() => {
    const query = new URLSearchParams();
    query.set("path", destination);
    return `intent://verify-email?${query.toString()}#Intent;scheme=koreagoldmarket;package=com.koreagoldmarket.app;end`;
  }, [destination]);

  /* 1) 인증 링크 처리 */
  useEffect(() => {
    let cancelled = false;

    if (mode === "resetPassword" && oobCode) {
      navigate(`/reset-password?oobCode=${encodeURIComponent(oobCode)}`, { replace: true });
      return;
    }
    if (!oobCode || mode !== "verifyEmail") {
      setProcessingLink(false);
      return;
    }

    const moveAfterVerified = (successMessage) => {
      if (cancelled) return;
      setMessage(successMessage);

      // 앱에서 시작한 인증이 웹 fallback으로 열린 경우:
      // 웹에서 Firebase 인증을 완료한 뒤 앱 복귀를 시도하고,
      // 브라우저에는 수동 복귀 버튼을 안전장치로 남깁니다.
      if (!isNative && appReturnRequested && isAndroidBrowser) {
        setAppReturnReady(true);
        return;
      }

      setTimeout(() => {
        if (cancelled) return;
        navigate(destination, { replace: true });
      }, REDIRECT_DELAY);
    };

    (async () => {
      let actionApplied = false;

      try {
        await checkActionCode(auth, oobCode);
        if (cancelled) return;

        await applyActionCode(auth, oobCode);
        actionApplied = true;
        if (cancelled) return;

        if (auth.currentUser) {
          const refreshed = await reloadUserWithRetry(auth.currentUser);
          if (cancelled) return;

          if (auth.currentUser.emailVerified) {
            moveAfterVerified("✅ 이메일 인증이 완료되었습니다! 잠시 후 이동합니다.");
            return;
          }

          // applyActionCode는 성공했지만 앱 전환 직후 reload 네트워크가 잠깐 실패할 수 있음.
          // 오류로 끝내지 않고 아래 폴링이 계속 최신 상태를 확인하도록 둔다.
          setMessage(
            refreshed.ok
              ? "✅ 이메일 인증이 완료되었습니다. 회원 상태를 갱신하는 중입니다…"
              : "✅ 이메일 인증이 완료되었습니다. 네트워크 연결을 확인하며 회원 상태를 다시 불러오는 중입니다…"
          );
          return;
        }

        // 브라우저 fallback에서는 로그인 비밀번호를 저장하거나 재사용하지 않습니다.
        // actionCode 적용 성공 자체로 이메일 소유 확인은 완료되며,
        // 앱에서 시작한 흐름이면 인증된 상태만 가지고 앱으로 돌아갑니다.
        if (!isNative && appReturnRequested && isAndroidBrowser) {
          moveAfterVerified("✅ 이메일 인증이 완료되었습니다. 한국골드마켓 앱으로 돌아갑니다.");
          return;
        }

        // 다른 기기/브라우저에서 연 일반 웹 흐름은 안전하게 로그인만 안내합니다.
        setMessage("✅ 이메일 인증이 완료되었습니다. 로그인 후 계속 이용해 주세요.");
      } catch (err) {
        const code = err?.code || "";
        const msg = (err?.message || "").toLowerCase();

        // 인증 적용 뒤의 일시적 네트워크 오류는 인증 실패로 표시하지 않는다.
        if (actionApplied && isNetworkRequestFailed(err)) {
          setMessage("✅ 이메일 인증이 완료되었습니다. 네트워크 연결을 확인하며 회원 상태를 다시 불러오는 중입니다…");
          if (!isNative && appReturnRequested && isAndroidBrowser) setAppReturnReady(true);
          return;
        }

        if (code === "auth/invalid-action-code" && auth.currentUser) {
          try {
            await reloadUserWithRetry(auth.currentUser);
            if (cancelled) return;
            if (auth.currentUser.emailVerified) {
              moveAfterVerified("✅ 이미 이메일 인증이 완료되어 있습니다. 잠시 후 이동합니다.");
              return;
            }
          } catch {}
        }

        if (code === "auth/invalid-action-code") {
          setMessage("❌ 유효하지 않은 인증 링크입니다. 이미 사용되었거나 잘못된 프로젝트일 수 있어요.");
        } else if (code === "auth/expired-action-code") {
          setMessage("❌ 인증 링크가 만료되었습니다. 아래 ‘인증메일 재전송’으로 다시 받아주세요.");
        } else if (code === "auth/network-request-failed") {
          setMessage("네트워크 연결이 잠시 불안정합니다. 연결이 복구되면 인증 상태를 자동으로 다시 확인합니다.");
        } else if (msg.includes("continue url") || code === "auth/invalid-continue-uri" || code === "auth/argument-error") {
          setMessage("❌ 인증은 처리되지 않았습니다. 인증 링크의 continueUrl 설정(허용 도메인 포함)을 확인해 주세요.");
        } else if (msg.includes("domain") || msg.includes("authorized")) {
          setMessage("❌ 인증 처리 실패: Firebase 콘솔의 Authorized domains에 현재 접속 도메인이 등록되어 있는지 확인해 주세요.");
        } else {
          setMessage(`❌ 인증 중 오류 발생: ${err?.message || "알 수 없는 오류"}`);
        }
      } finally {
        if (!cancelled) setProcessingLink(false);
      }
    })();

    return () => { cancelled = true; };
  }, [mode, oobCode, appReturnRequested, isAndroidBrowser, destination, navigate]);

  /* 2) 웹 커스텀 인증페이지 -> Android 앱 자동 복귀 */
  useEffect(() => {
    if (isNative || !isAndroidBrowser || !appReturnRequested || !appReturnReady) return undefined;
    if (appReturnAttemptedRef.current) return undefined;

    appReturnAttemptedRef.current = true;
    setAppReturnHint("한국골드마켓 앱으로 돌아가는 중입니다…");

    const attemptTimer = window.setTimeout(() => {
      try {
        window.location.href = appReturnIntentUrl;
      } catch {
        try { window.location.href = appReturnUrl; } catch {}
      }
    }, APP_RETURN_ATTEMPT_DELAY);

    const fallbackTimer = window.setTimeout(() => {
      setAppReturnHint("앱이 자동으로 열리지 않으면 아래 버튼을 눌러주세요.");
    }, APP_RETURN_FALLBACK_DELAY);

    return () => {
      window.clearTimeout(attemptTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [isAndroidBrowser, appReturnRequested, appReturnReady, appReturnIntentUrl, appReturnUrl]);

  const openKgmApp = () => {
    setAppReturnHint("한국골드마켓 앱을 여는 중입니다…");

    // Android 브라우저는 package가 명시된 intent URI를 우선 사용합니다.
    // 앱이 열리지 않는 브라우저에서는 잠시 뒤 커스텀 스킴으로 한 번 더 시도합니다.
    try {
      window.location.href = appReturnIntentUrl;
    } catch {}

    window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        try { window.location.href = appReturnUrl; } catch {}
      }
    }, 900);
  };

  /* 3) 로그인 상태에서 폴링 */
  useEffect(() => {
    const user = auth.currentUser || contextUser;
    if (!user || user.emailVerified || processingLink) return;

    let stopped = false;
    let checkingNow = false;
    let redirectScheduled = false;

    const moveAfterVerified = () => {
      if (stopped || redirectScheduled) return;
      redirectScheduled = true;
      setChecking(false);
      setMessage("✅ 이메일 인증이 완료되었습니다! 잠시 후 이동합니다.");
      setTimeout(() => {
        if (stopped) return;
        navigate(destination, { replace: true });
      }, REDIRECT_DELAY);
    };

    const checkVerification = async () => {
      if (stopped || checkingNow || redirectScheduled) return;
      checkingNow = true;

      try {
        await user.reload();
        if (stopped) return;

        if (user.emailVerified) {
          moveAfterVerified();
        }
      } catch (e) {
        if (stopped) return;

        if (isNetworkRequestFailed(e)) {
          // 앱↔메일/브라우저 전환 직후의 일시적 네트워크 오류는 치명 오류가 아니다.
          // 인터벌을 끊지 않고 다음 주기에 자동 재시도한다.
          setMessage("네트워크 연결을 다시 확인하고 있습니다. 인증 완료 여부를 자동으로 다시 확인합니다…");
        } else {
          setMessage(`인증 확인 중 오류: ${e?.message || "알 수 없는 오류"}`);
          setChecking(false);
          stopped = true;
        }
      } finally {
        checkingNow = false;
      }
    };

    setChecking(true);
    void checkVerification();
    const itv = setInterval(checkVerification, 4000);

    const handleFocus = () => { void checkVerification(); };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void checkVerification();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopped = true;
      clearInterval(itv);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      setChecking(false);
    };
  }, [processingLink, destination, navigate, contextUser]);

  /* 4) 재전송 */
  const handleResend = async () => {
    setResending(true);
    setMessage("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("로그인이 필요합니다.");
      await sendVerificationEmailIfNeeded(
        continuePath || destination || "/"
      );
      setMessage("📧 인증 메일이 재전송되었습니다. 스팸/프로모션함도 확인해 주세요!");
    } catch (err) {
      if (err?.code === "auth/too-many-requests") {
        setMessage("잠시 후 다시 시도해 주세요. 요청이 너무 많습니다.");
      } else if (String(err?.message || "").toLowerCase().includes("domain")) {
        setMessage("메일 전송 실패: Firebase 콘솔의 Authorized domains에 현재 도메인이 등록되어 있는지 확인해 주세요.");
      } else {
        setMessage(`메일 전송 실패: ${err?.message || "알 수 없는 오류"}`);
      }
    } finally {
      setResending(false);
    }
  };

  const displayUser = contextUser || auth.currentUser;

  return (
    <Container>
      <Title>이메일 인증</Title>

      {quizBonusResult && (
        <Message $color="var(--gm-success)">
          {quizBonusResult.alreadyClaimed
            ? "퀵퀴즈 보너스는 이미 지급된 계정입니다."
            : `퀵퀴즈 보너스 ${Number(quizBonusResult.creditedG || 0.01).toFixed(2)}g 적립이 완료되었습니다.`}
        </Message>
      )}
      {quizBonusError && (
        <Message $color="var(--gm-warning)">
          회원가입은 완료됐지만 퀵퀴즈 보너스 확인이 필요합니다. 이메일 인증 후 퀵퀴즈 페이지에서 다시 확인해 주세요.
        </Message>
      )}

      {processingLink ? (
        <Message>처리 중…</Message>
      ) : appReturnReady && appReturnRequested && isAndroidBrowser && !isNative ? (
        <>
          <Message $color="var(--gm-success)">
            {message || "✅ 이메일 인증이 완료되었습니다."}
          </Message>
          <Message $color="var(--gm-text-secondary)">
            {appReturnHint || "한국골드마켓 앱으로 돌아갑니다."}
          </Message>
          <Button onClick={openKgmApp}>한국골드마켓 앱으로 돌아가기</Button>
          <SecondaryButton onClick={() => navigate(destination, { replace: true })}>
            웹에서 계속하기
          </SecondaryButton>
        </>
      ) : (
        <>
          {!displayUser ? (
            <>
              <Message>{message || "이 페이지는 로그인 후에만 접근할 수 있습니다."}</Message>
              <Button onClick={() => navigate("/login", { state: { from: destination } })}>로그인 하러 가기</Button>
              <Message $color="var(--gm-text-secondary)" style={{ fontSize: "0.9rem" }}>
                앱이 설치된 휴대폰에서는 인증 링크가 한국골드마켓 앱으로 연결됩니다.
              </Message>
            </>
          ) : (
            <>
              {displayUser.emailVerified ? (
                <>
                  <Message $color="var(--gm-success)">이미 이메일 인증을 완료하셨습니다.</Message>
                  <Button onClick={() => navigate(destination, { replace: true })}>{destination === "/" ? "홈으로 이동" : "계속하기"}</Button>
                </>
              ) : (
                <>
                  <Message>
                    가입하신 이메일로 인증 링크가 발송되었습니다.
                    <br />
                    링크 클릭 또는 아래 버튼으로 재전송 후 인증해 주세요.
                  </Message>
                  <Message $color="var(--gm-info)"><strong>{displayUser.email}</strong></Message>
                  <Button onClick={handleResend} disabled={checking || resending}>
                    {resending ? "재전송 중…" : "인증메일 재전송"}
                  </Button>
                  {checking && <Message $color="var(--gm-success)">인증 상태 확인 중...</Message>}
                  {message && (
                    <Message $color={message.startsWith("✅") ? "var(--gm-success)" : message.startsWith("❌") ? "var(--gm-error)" : "var(--gm-text-secondary)"}>
                      {message}
                    </Message>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
}
