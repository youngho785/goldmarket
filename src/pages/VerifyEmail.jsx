// src/pages/VerifyEmail.jsx
import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import {
  applyActionCode,
  checkActionCode,
  sendEmailVerification,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase/firebase";

/* ───────── Styled ───────── */
const Container = styled.div`
  max-width: 480px;
  margin: auto;
  padding: 40px 20px;
  text-align: center;
  color: #333;
`;
const Title = styled.h2`
  margin-bottom: 24px;
  color: ${({ theme }) => theme.colors?.primary || "#007bff"};
`;
const Message = styled.p`
  margin-top: 16px;
  font-size: 1rem;
  color: ${({ $color }) => $color || "#555"};
`;
const Button = styled.button`
  margin-top: 20px;
  padding: 10px 16px;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors?.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  &:disabled { background: #aaa; cursor: not-allowed; }
  &:hover:enabled { background: ${({ theme }) => theme.colors?.primaryDark || "#0056b3"}; }
`;

/* 세션 키 (Register와 동일) */
const PENDING_EMAIL_KEY = "pending_login_email";
const PENDING_PW_KEY    = "pending_login_password";

/* 자동 이동 지연 */
const REDIRECT_DELAY = 1200;

export default function VerifyEmail() {
  try { auth.languageCode = "ko"; } catch {}

  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [processingLink, setProcessingLink] = useState(true);
  const [resending, setResending] = useState(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const oobCode = params.get("oobCode");
  const mode = params.get("mode");
  const continueUrl = params.get("continueUrl");

  /** 같은 브라우저에서 열렸고 세션에 임시 자격이 있으면 자동 로그인 */
  const tryAutoLogin = async () => {
    let email = "";
    let pw = "";
    try {
      email = sessionStorage.getItem(PENDING_EMAIL_KEY) || "";
      pw    = sessionStorage.getItem(PENDING_PW_KEY) || "";
    } catch {}

    if (!email || !pw) return false;
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      await auth.currentUser?.reload();
      return true;
    } catch (err) {
      setMessage(`자동 로그인에 실패했습니다: ${err?.message || "알 수 없는 오류"}`);
      return false;
    } finally {
      // 보안상 즉시 폐기
      try { sessionStorage.removeItem(PENDING_EMAIL_KEY); } catch {}
      try { sessionStorage.removeItem(PENDING_PW_KEY); } catch {}
    }
  };

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

    (async () => {
      try {
        await checkActionCode(auth, oobCode);
        if (cancelled) return;

        await applyActionCode(auth, oobCode);
        if (cancelled) return;

        if (auth.currentUser) {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            setMessage("✅ 이메일 인증이 완료되었습니다! 잠시 후 이동합니다.");
            setTimeout(() => {
              if (continueUrl) {
                try {
                  const u = new URL(continueUrl, window.location.origin);
                  if (u.origin === window.location.origin) {
                    navigate(u.pathname + u.search + u.hash, { replace: true });
                    return;
                  }
                } catch {}
              }
              navigate("/", { replace: true });
            }, REDIRECT_DELAY);
            return;
          }
          setMessage("인증은 완료되었지만 세션이 갱신되는 중입니다…");
          return;
        }

        // 비로그인 상태: 자동 로그인 시도
        const loggedIn = await tryAutoLogin();
        if (cancelled) return;

        if (loggedIn && auth.currentUser) {
          if (!auth.currentUser.emailVerified) {
            await auth.currentUser.reload();
          }
          if (auth.currentUser.emailVerified) {
            setMessage("✅ 이메일 인증 및 자동 로그인이 완료되었습니다! 이동합니다.");
            setTimeout(() => navigate("/", { replace: true }), REDIRECT_DELAY);
            return;
          }
        }

        // 다른 기기에서 열렸거나 자동로그인이 불가한 경우
        setMessage("✅ 이메일 인증이 완료되었습니다. 로그인 후 계속 이용해 주세요.");
      } catch (err) {
        const code = err?.code || "";
        const msg = (err?.message || "").toLowerCase();

        if (code === "auth/invalid-action-code") {
          setMessage("❌ 유효하지 않은 인증 링크입니다. 이미 사용되었거나 잘못된 프로젝트일 수 있어요.");
        } else if (code === "auth/expired-action-code") {
          setMessage("❌ 인증 링크가 만료되었습니다. 아래 ‘인증메일 재전송’으로 다시 받아주세요.");
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
  }, [mode, oobCode, continueUrl, navigate]);

  /* 2) 로그인 상태에서 폴링 */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || user.emailVerified || processingLink) return;

    setChecking(true);
    const itv = setInterval(async () => {
      try {
        await user.reload();
        if (user.emailVerified) {
          clearInterval(itv);
          setMessage("✅ 이메일 인증이 완료되었습니다! 잠시 후 이동합니다.");
          setTimeout(() => {
            if (continueUrl) {
              try {
                const u = new URL(continueUrl, window.location.origin);
                if (u.origin === window.location.origin) {
                  navigate(u.pathname + u.search + u.hash, { replace: true });
                  return;
                }
              } catch {}
            }
            navigate("/", { replace: true });
          }, REDIRECT_DELAY);
        }
      } catch (e) {
        setMessage(`인증 확인 중 오류: ${e?.message || "알 수 없는 오류"}`);
        clearInterval(itv);
        setChecking(false);
      }
    }, 4000);

    return () => { clearInterval(itv); setChecking(false); };
  }, [processingLink, continueUrl, navigate]);

  /* 3) 재전송 */
  const handleResend = async () => {
    setResending(true);
    setMessage("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("로그인이 필요합니다.");
      await sendEmailVerification(user, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      });
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

  let pendingEmail = "";
  try { pendingEmail = sessionStorage.getItem(PENDING_EMAIL_KEY) || ""; } catch {}

  return (
    <Container>
      <Title>이메일 인증</Title>

      {processingLink ? (
        <Message>처리 중…</Message>
      ) : (
        <>
          {!auth.currentUser ? (
            <>
              <Message>{message || "이 페이지는 로그인 후에만 접근할 수 있습니다."}</Message>
              {pendingEmail && <Message $color="#007">최근 가입 시도: <strong>{pendingEmail}</strong></Message>}
              <Button onClick={() => navigate("/login")}>로그인 하러 가기</Button>
              <Message $color="#777" style={{ fontSize: "0.9rem" }}>
                모바일 메일앱에서 링크가 잘 안 열리면 브라우저(크롬/사파리)로 다시 열어주세요.
              </Message>
            </>
          ) : (
            <>
              {auth.currentUser.emailVerified ? (
                <>
                  <Message $color="green">이미 이메일 인증을 완료하셨습니다.</Message>
                  <Button onClick={() => navigate("/", { replace: true })}>홈으로 이동</Button>
                </>
              ) : (
                <>
                  <Message>
                    가입하신 이메일로 인증 링크가 발송되었습니다.
                    <br />
                    링크 클릭 또는 아래 버튼으로 재전송 후 인증해 주세요.
                  </Message>
                  <Message $color="#007"><strong>{auth.currentUser.email}</strong></Message>
                  <Button onClick={handleResend} disabled={checking || resending}>
                    {resending ? "재전송 중…" : "인증메일 재전송"}
                  </Button>
                  {checking && <Message $color="green">인증 상태 확인 중...</Message>}
                  {message && (
                    <Message $color={message.startsWith("✅") ? "green" : message.startsWith("❌") ? "red" : "#555"}>
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
