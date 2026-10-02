import React, { useMemo, useState } from "react";
import styled from "styled-components";
import { auth } from "../../firebase/firebase";
import {
  beginMfaEnrollment,
  completeMfaEnrollment,
  getMfaFactors,
} from "../../services/mfaService";

const Wrap = styled.section`
  max-width: 720px;
  padding: clamp(20px, 4vw, 30px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;
const Form = styled.form`
  display: grid;
  gap: 14px;
  margin-top: 20px;
`;
const Notice = styled.div`
  margin-top: 14px;
  padding: 13px 14px;
  border-radius: 12px;
  background: ${({ $error, theme }) =>
    $error ? theme.semantic.alertErrorBg : theme.semantic.alertInfoBg};
  color: ${({ $error, theme }) =>
    $error ? theme.semantic.alertErrorText : theme.semantic.alertInfoText};
`;
const Factor = styled.div`
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
`;

function formatKoreanPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  return String(value || "").trim();
}

export default function AdminSecurity() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [factors, setFactors] = useState(() => getMfaFactors(auth.currentUser));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const enrolled = factors.length > 0;
  const requirementEnabled = useMemo(
    () =>
      String(import.meta.env?.VITE_REQUIRE_ADMIN_MFA || "")
        .trim()
        .toLowerCase() === "true",
    []
  );

  const sendCode = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await beginMfaEnrollment(
        formatKoreanPhone(phone),
        "admin-mfa-recaptcha"
      );
      setChallenge(result);
      setMessage("인증번호를 발송했습니다.");
    } catch (err) {
      setError(err?.message || "인증번호 발송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (!challenge) return;
    setError("");
    setLoading(true);
    try {
      const next = await completeMfaEnrollment(challenge, code);
      setFactors(next);
      setChallenge(null);
      setCode("");
      setMessage("관리자 2단계 인증 등록이 완료되었습니다.");
    } catch (err) {
      setError(err?.message || "인증번호를 확인해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrap>
      <h1>관리자 보안</h1>
      <p>
        관리자 계정은 비밀번호가 노출되어도 운영 데이터에 접근할 수 없도록
        휴대전화 2단계 인증을 등록하는 것이 안전합니다.
      </p>
      <Notice>
        {requirementEnabled
          ? "현재 관리자 MFA 필수 정책이 활성화되어 있습니다."
          : "등록을 먼저 마친 뒤 VITE_REQUIRE_ADMIN_MFA=true로 전환하세요."}
      </Notice>

      {factors.map((factor) => (
        <Factor key={factor.uid}>
          <strong>{factor.displayName}</strong>
          <div>{factor.phoneNumber || "등록된 휴대전화"}</div>
        </Factor>
      ))}

      {!enrolled && (
        <Form onSubmit={challenge ? verifyCode : sendCode}>
          {!challenge ? (
            <>
              <label htmlFor="adminMfaPhone">관리자 휴대전화</label>
              <input
                id="adminMfaPhone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="010-1234-5678"
                autoComplete="tel"
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? "발송 중..." : "인증번호 받기"}
              </button>
            </>
          ) : (
            <>
              <label htmlFor="adminMfaCode">문자 인증번호</label>
              <input
                id="adminMfaCode"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="one-time-code"
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? "확인 중..." : "2단계 인증 등록"}
              </button>
            </>
          )}
        </Form>
      )}
      <div id="admin-mfa-recaptcha" />
      {message && <Notice role="status">{message}</Notice>}
      {error && <Notice $error role="alert">{error}</Notice>}
    </Wrap>
  );
}
