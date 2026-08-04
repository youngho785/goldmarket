// src/pages/Login.jsx
import React, { useState } from "react";
import styled from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

/* Layout */
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: clamp(28px, 6vw, 64px) 18px;
  background:
    radial-gradient(circle at 50% 0%, rgba(178,138,59,.11), transparent 28rem),
    ${({ theme }) => theme.colors.background || "#F4F6F9"};
  min-height: calc(100svh - 180px);
`;
const Card = styled.div`
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: clamp(26px, 5vw, 42px);
  width: 100%;
  max-width: 460px;

  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 4px;
    background: ${({ theme }) => theme.gradients.gold};
  }
`;
const Title = styled.h1`
  text-align: center;
  margin: 0 auto 10px;
  font-size: clamp(25px, 5vw, 32px);
  color: ${({ theme }) => theme.colors.text};
  word-break: keep-all;
`;
const SubTitle = styled.p`
  text-align: center;
  margin: 0 0 18px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.95rem;
`;

/* 상단 블루 CTA */
const TopCtaWrap = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 22px;
`;
const LuxuryCta = styled(Link)`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 15px 20px;
  border-radius: 14px;
  font-weight: 800;
  text-decoration: none;

  color: ${({ theme }) => theme.on.primary};
  border: 1px solid rgba(200,168,90,.55);
  background: ${({ theme }) => theme.gradients.primary};
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: transform 0.06s ease, box-shadow 0.15s ease, background 0.2s ease, filter 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.on.primary};
    box-shadow: ${({ theme }) => theme.shadows.hover};
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }
  &:focus { outline: none; }
  &:focus-visible {
    box-shadow:
      ${({ theme }) => theme.focus.ring};
  }
`;
const CtaLineMain = styled.span`
  font-size: 1.05rem;
  letter-spacing: 0.2px;
`;
const CtaLineSub = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(255,255,255,.78);
  letter-spacing: 0.1px;
  opacity: 0.95;
`;

const Divider = styled.div`
  height: 1px; background: ${({ theme }) => theme.colors.dividerSubtle}; margin: 20px 0;
`;
const FormTitle = styled.h2`
  font-size: 1.18rem;
  margin: 0 0 16px;
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
`;
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;
const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;
const Label = styled.label`
  margin-bottom: 7px;
  font-weight: 750;
  color: ${({ theme }) => theme.colors.text};
`;
const Input = styled.input`
  min-height: 48px;
  padding: 11px 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  &:disabled { background: ${({ theme }) => theme.colors.surfaceAlt}; }
`;
const ErrorText = styled.p`
  color: ${({ theme }) => theme.semantic.alertErrorText};
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  border: 1px solid ${({ theme }) => theme.colors.error}33;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.9rem;
  margin: 0 0 12px;
`;
const Button = styled.button`
  min-height: 48px;
  padding: 12px 16px;
  font-size: 1rem;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.small};
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
  &:disabled { opacity: .55; cursor: not-allowed; }
  &:hover:enabled { filter: brightness(.96); }
`;
const SmallText = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: -8px;
`;
const LinkText = styled.p`
  font-size: 0.9rem;
  text-align: center;
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  & > a { color: ${({ theme }) => theme.colors.link}; text-decoration: none; font-weight: 750; }
`;

export default function Login() {
  // useAuthContext는 내부에서 authService.login을 호출하며,
  // authService는 에러를 표준 타입으로 정규화하여 throw합니다.
  const { login, sendEmailVerification } = useAuthContext();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  // 서비스 표준 타입 + SDK 코드 대응
  const errorMap = {
    USER_NOT_FOUND: "가입되지 않은 이메일입니다. 회원가입을 해주세요.",
    WRONG_PASSWORD: "비밀번호가 맞지 않습니다. 비밀번호 확인 후 다시 로그인 해주세요.",
    TOO_MANY_REQUESTS: "로그인 시도가 너무 많아 잠시 후 다시 시도해 주세요.",
    NETWORK: "네트워크 오류가 발생했습니다.",
    "auth/invalid-email": "이메일 형식이 올바르지 않습니다.",
    "auth/user-not-found": "가입되지 않은 이메일입니다. 회원가입을 해주세요.",
    "auth/wrong-password": "비밀번호가 맞지 않습니다. 비밀번호 확인 후 다시 로그인 해주세요.",
    "auth/too-many-requests": "로그인 시도가 너무 많아 잠시 후 다시 시도해 주세요.",
    "auth/network-request-failed": "네트워크 오류가 발생했습니다.",
    "auth/user-disabled": "해당 계정은 비활성화되어 있습니다. 관리자에게 문의해 주세요.",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResendMsg("");
    setShowResend(false);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");

    try {
      const user = await login(email, password);

      if (!user.emailVerified) {
        setError("이메일 인증이 필요합니다. 메일함에서 인증을 완료해 주세요.");
        setShowResend(true);
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const key = err?.type || err?.code;
      let msg = errorMap[key] || "이메일 또는 비밀번호가 올바르지 않습니다.";

      // ⚠️ 일부 환경에서 이메일/비번 오류가 모두 invalid-credential로 내려옵니다.
      // 이 경우 추가 조회 없이 일반 문구로만 안내하여 오판을 방지합니다.
      if (err?.code === "auth/invalid-credential") {
        msg = "이메일 또는 비밀번호가 올바르지 않습니다.";
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendMsg("");
    try {
      await sendEmailVerification();
      setResendMsg("인증 메일이 재발송되었습니다. 메일함을 확인해 주세요!");
    } catch (err) {
      setResendMsg(
        err?.code === "auth/too-many-requests"
          ? "이메일 재전송이 너무 많아 잠시 후 시도해 주세요."
          : `메일 전송에 실패했습니다: ${err?.message || "알 수 없는 오류"}`
      );
    }
  };

  return (
    <Container>
      <Card>
        <Title>한국골드마켓에 오신것을 환영합니다.</Title>
        <SubTitle>이메일 인증만으로 간편하게 가입</SubTitle>

        <TopCtaWrap>
          <LuxuryCta
            to="/register"
            state={{ intent: "exchange" }}
            aria-label="회원가입하러 가기 - 회원가입 즉시 웰컴 순금 0.01g 적립"
          >
            <CtaLineMain>회원가입하러가기</CtaLineMain>
            <CtaLineSub>회원가입 즉시 웰컴 순금 0.01g 적립 · 골드바 교환 시 사용 가능</CtaLineSub>
          </LuxuryCta>
        </TopCtaWrap>

        <Divider />

        <FormTitle>로그인</FormTitle>

        {error && <ErrorText role="alert" aria-live="polite">{error}</ErrorText>}
        {showResend && (
          <FormGroup>
            <Button type="button" onClick={handleResend} disabled={loading}>
              인증메일 다시 보내기
            </Button>
            {resendMsg && <SmallText>{resendMsg}</SmallText>}
          </FormGroup>
        )}

        {/* HTML5 검증 + FormData */}
        <Form onSubmit={handleSubmit} autoComplete="on" noValidate={false}>
          <FormGroup>
            <Label htmlFor="loginEmail">이메일</Label>
            <Input
              id="loginEmail"
              name="email"
              type="email"
              required
              disabled={loading}
              autoFocus
              autoComplete="username email"
              inputMode="email"
            />
          </FormGroup>
          <FormGroup>
            <Label htmlFor="loginPassword">비밀번호</Label>
            <Input
              id="loginPassword"
              name="password"
              type="password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </FormGroup>
          <Button type="submit" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </Form>

        <LinkText>
          <Link to="/reset-password">비밀번호를 잊으셨나요?</Link>
        </LinkText>
        <LinkText>
          처음이세요?{" "}
          <Link to="/register" state={{ intent: "exchange" }}>
            회원가입
          </Link>
        </LinkText>
      </Card>
    </Container>
  );
}
