//src/components/auth/LoginModal.jsx
import React, { useState } from "react";
import styled from "styled-components";
import { createPortal } from "react-dom";
import { useAuthContext } from "@/context/AuthContext";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "@/firebase/firebase";
import { startAnonymousIfNeeded, linkAnonymousWithEmail } from "@/services/authService";
import { Link, useLocation } from "react-router-dom";

/* ====== 스타일 (심플 모달) ====== */
const Backdrop = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,.38);
  display: ${({open}) => (open ? "flex" : "none")};
  align-items: center; justify-content: center; z-index: 9999;
`;
const Modal = styled.div`
  width: min(92vw, 440px); background: #fff; border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
  overflow: hidden;
`;
const Header = styled.div`
  padding: 16px 18px; border-bottom: 1px solid #eee; font-weight: 900;
`;
const Body = styled.div`
  padding: 16px 18px; display: grid; gap: 12px;
`;
const Row = styled.div` display: grid; gap: 6px; `;
const Label = styled.label` font-weight: 700; font-size: .95rem; `;
const Input = styled.input`
  border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; font-size: 1rem;
`;
const Error = styled.p` color: #dc2626; font-size: .9rem; margin: 2px 0 0; `;
const Actions = styled.div`
  display: flex; gap: 8px; padding: 14px 18px; border-top: 1px solid #eee; justify-content: flex-end;
`;
const Btn = styled.button`
  padding: 10px 14px; border-radius: 10px; border: none; cursor: pointer; font-weight: 800;
  background: ${({variant}) => (variant === "primary" ? "linear-gradient(180deg,#1e3a8a,#2563eb)" : "#f3f4f6")};
  color: ${({variant}) => (variant === "primary" ? "#eef2ff" : "#111827")};
  &:disabled { opacity: .6; cursor: not-allowed; }
`;
const Aux = styled.div` font-size: .86rem; color: #6b7280; `;
const InlineLink = styled(Link)` color: #2563eb; text-decoration: none; font-weight: 800; `;

export default function LoginModal({ open, onClose, onSuccess }) {
  const { login, sendEmailVerification } = useAuthContext();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  // 게스트 세션 보장 (이미 있으면 noop)
  React.useEffect(() => {
    if (open) startAnonymousIfNeeded().catch(() => {});
  }, [open]);

  const errorMap = {
    "auth/wrong-password": "비밀번호가 맞지 않습니다. 비밀번호 확인 후 다시 로그인 해주세요.",
    "auth/user-not-found": "가입되지 않은 이메일입니다. 회원가입을 해주세요.",
    "auth/too-many-requests": "로그인 시도가 너무 많아 잠시 후 다시 시도해 주세요.",
    "auth/network-request-failed": "네트워크 오류가 발생했습니다.",
    "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr(""); setResendMsg(""); setShowResend(false);
    setLoading(true);
    const emailTrim = email.trim().toLowerCase();

    try {
      // 게스트 → 이메일 계정으로 업그레이드 링크 (데이터 승계)
      await linkAnonymousWithEmail(emailTrim, pw).catch(() => {
        /* 이미 이메일 계정이 있었다면 그냥 로그인 시도 */
      });

      const user = await login(emailTrim, pw);
      if (!user.emailVerified) {
        setErr("이메일 인증이 필요합니다. 메일함에서 인증을 완료해 주세요.");
        setShowResend(true);
        return;
      }
      onSuccess?.();
    } catch (error) {
      let msg = errorMap[error.code] || error.message || "로그인 실패";
      if (error.code === "auth/invalid-credential") {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, emailTrim);
          msg = (!methods || methods.length === 0)
            ? "가입되지 않은 이메일입니다. 회원가입을 해주세요."
            : "비밀번호가 맞지 않습니다. 비밀번호 확인 후 다시 로그인 해주세요.";
        } catch {
          msg = "이메일 또는 비밀번호가 올바르지 않습니다.";
        }
      }
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMsg("");
    try {
      await sendEmailVerification();
      setResendMsg("인증 메일이 재발송되었습니다. 메일함을 확인해 주세요!");
    } catch (error) {
      setResendMsg(
        error.code === "auth/too-many-requests"
          ? "이메일 재전송이 너무 많아 잠시 후 시도해 주세요."
          : `메일 전송에 실패했습니다: ${error.message}`
      );
    }
  };

  return createPortal(
    <Backdrop open={open} onClick={onClose} role="dialog" aria-modal="true">
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>계속하려면 로그인이 필요해요</Header>
        <form onSubmit={handleLogin} autoComplete="on" noValidate={false}>
          <Body>
            {err && <Error role="alert" aria-live="polite">{err}</Error>}
            <Row>
              <Label htmlFor="modalEmail">이메일</Label>
              <Input
                id="modalEmail" name="email" type="email"
                value={email} onChange={e=>setEmail(e.target.value)}
                required autoFocus autoComplete="username email" inputMode="email"
              />
            </Row>
            <Row>
              <Label htmlFor="modalPw">비밀번호</Label>
              <Input
                id="modalPw" name="password" type="password"
                value={pw} onChange={e=>setPw(e.target.value)}
                required autoComplete="current-password"
              />
            </Row>

            {showResend && (
              <Row>
                <Btn type="button" onClick={handleResend} disabled={loading}>인증메일 다시 보내기</Btn>
                {resendMsg && <Aux>{resendMsg}</Aux>}
              </Row>
            )}

            <Aux>
              처음 오셨나요?{" "}
              <InlineLink
                to="/register"
                state={{ email: email.trim().toLowerCase(), from: location.pathname }}
                onClick={onClose}
              >
                회원가입
              </InlineLink>
            </Aux>
          </Body>
          <Actions>
            <Btn type="button" onClick={onClose}>닫기</Btn>
            <Btn type="submit" variant="primary" disabled={loading || !email || !pw}>
              {loading ? "확인 중..." : "로그인"}
            </Btn>
          </Actions>
        </form>
      </Modal>
    </Backdrop>,
    document.body
  );
}
