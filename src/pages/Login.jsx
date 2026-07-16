// src/pages/Login.jsx
import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

/* Animations */
const floaty = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-2px); }
  100% { transform: translateY(0px); }
`;
const shineSweep = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
`;

/* Layout */
const Container = styled.div`
  display: flex;
  justify-content: center;
  padding: 40px 20px;
  background: ${({ theme }) => theme.colors.background || "#f0f2f5"};
  min-height: 100vh;
`;
const Card = styled.div`
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  padding: 32px;
  width: 100%;
  max-width: 420px;
`;
const Title = styled.h1`
  text-align: center;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.primary || "#333"};
`;
const SubTitle = styled.p`
  text-align: center;
  margin: 0 0 12px;
  color: #666;
  font-size: 0.95rem;
`;

/* 상단 블루 CTA */
const TopCtaWrap = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
`;
const LuxuryCta = styled(Link)`
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 22px;
  border-radius: 9999px;
  font-weight: 800;
  text-decoration: none;

  color: #eef2ff;
  border: 2px solid #93c5fd; /* blue-300 */
  background: linear-gradient(180deg, #1e3a8a 0%, #2563eb 100%); /* indigo→blue */
  box-shadow:
    0 6px 18px rgba(59,130,246,0.18),
    inset 0 0 0 1px rgba(255,255,255,0.06);
  transition: transform 0.06s ease, box-shadow 0.15s ease, background 0.2s ease, filter 0.2s ease;

  animation: ${floaty} 6s ease-in-out infinite;

  &:hover {
    background: linear-gradient(180deg, #1d4ed8 0%, #3b82f6 100%);
    box-shadow:
      0 10px 24px rgba(59,130,246,0.26),
      inset 0 0 0 1px rgba(255,255,255,0.08);
    filter: saturate(1.05);
  }
  &:active { transform: translateY(1px); }
  &:focus { outline: none; }
  &:focus-visible {
    box-shadow:
      0 0 0 4px rgba(59,130,246,0.30),
      0 6px 18px rgba(59,130,246,0.20);
  }

  &::after {
    content: "";
    position: absolute;
    inset: -2px;
    background: linear-gradient(120deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%);
    mix-blend-mode: overlay;
    transform: translateX(-120%);
    animation: ${shineSweep} 2.4s ease-in-out infinite;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &::after { animation: none; }
  }
`;
const CtaLineMain = styled.span`
  font-size: 1.05rem;
  letter-spacing: 0.2px;
`;
const CtaLineSub = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: #dbeafe; /* blue-100 */
  letter-spacing: 0.1px;
  opacity: 0.95;
`;

const Divider = styled.div`
  height: 1px; background: #eee; margin: 16px 0;
`;
const FormTitle = styled.h2`
  font-size: 1.1rem;
  margin: 0 0 12px;
  color: #111827;
  text-align: left;
`;
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;
const Label = styled.label`
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
`;
const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  &:disabled { background: #f5f5f5; }
`;
const ErrorText = styled.p`
  color: red;
  font-size: 0.9rem;
  margin: -4px 0 8px;
`;
const Button = styled.button`
  padding: 12px;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.primary || "#007bff"};
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  &:disabled { background: #aaa; cursor: not-allowed; }
  &:hover:enabled { background: ${({ theme }) => theme.colors.primaryDark || "#0056b3"}; }
`;
const SmallText = styled.span`
  font-size: 0.85rem;
  color: #888;
  margin-top: -8px;
`;
const LinkText = styled.p`
  font-size: 0.9rem;
  text-align: center;
  margin-top: 12px;
  & > a { color: ${({ theme }) => theme.colors.primary || "#007bff"}; text-decoration: none; }
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
            <CtaLineSub>회원가입 즉시 웰컴 순금 0.01g 적립</CtaLineSub>
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
