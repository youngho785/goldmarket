// src/pages/Register.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { db } from "../firebase/firebase";
import { signUp } from "../services/authService";
import { AgreementsSection } from "../components/AgreementsSection";
import { trackProductEventOncePerSession } from "@/analytics/productAnalytics";
import { buildVerifyEmailPath, getAuthReturnPath } from "@/lib/authReturn";
import {
  buildMemberOnboardingPath,
  markMemberOnboardingPending,
} from "@/lib/memberOnboarding";

const REGISTER_FORM_KEY = "registerFormData";
const CURRENT_CONSENT_VERSION = "terms-v2.0_privacy-v2.6";

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: clamp(28px, 6vw, 64px) 18px;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent), transparent 28rem),
    ${({ theme }) => theme.colors.background};
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
  max-width: 520px;

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
  margin: 0 0 9px;
  font-size: clamp(26px, 5vw, 34px);
  color: ${({ theme }) => theme.colors.text};
  word-break: keep-all;
`;
const Lead = styled.p`
  margin: 0 0 18px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  line-height: 1.65;
  word-break: keep-all;
`;
const NoticeBox = styled.div`
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  color: ${({ theme }) => theme.colors.text};
  border-radius: 14px;
  padding: 13px 14px;
  font-size: 0.91rem;
  line-height: 1.6;
  margin-bottom: 18px;

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: 3px;
  }
`;
const BenefitJourney = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin: 18px 0 0;
`;
const BenefitStep = styled.div`
  padding: 9px 7px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, ${({ theme }) => theme.colors.border});
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  text-align: center;
  small { display:block; color: ${({ theme }) => theme.colors.textSecondary}; font-size:0.62rem; font-weight:800; }
  strong { display:block; margin-top:3px; color: ${({ theme }) => theme.colors.secondaryDark}; font-family: ${({ theme }) => theme.fonts.numeric}; font-size:.75rem; }
`;
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;
const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
`;
const Label = styled.label`
  margin-bottom: 7px;
  font-weight: 750;
  color: ${({ theme }) => theme.colors.text};
`;
const Input = styled.input`
  min-height: 48px;
  padding: 11px 40px 11px 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;

  &::-ms-reveal,
  &::-ms-clear { display: none; }
  &:disabled { background: ${({ theme }) => theme.colors.surfaceAlt}; }
`;
const ToggleButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  min-height: 36px;
  background: transparent;
  border: none;
  padding: 0;
  border-radius: 9px;
  box-shadow: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 1.2rem;
  &:hover { background: ${({ theme }) => theme.colors.surfaceAlt}; transform: translateY(-50%); box-shadow: none; }
`;
const ErrorText = styled.p`
  color: ${({ theme }) => theme.semantic.alertErrorText};
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.9rem;
  margin: 0;
`;
const Button = styled.button`
  min-height: 50px;
  padding: 12px 16px;
  font-size: 1rem;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.small};
  font-weight: 850;
  cursor: pointer;
  &:disabled { opacity: .55; cursor: not-allowed; }
  &:hover:enabled { filter: brightness(.96); }
`;
const Helper = styled.p`
  margin: -7px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .79rem;
  line-height: 1.5;
`;
const VisuallyHidden = styled.input`
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: -1px;
`;

function toKoreanError(msg) {
  if (!msg) return "오류가 발생했습니다.";
  const m = String(msg);
  if (m.includes("email-already-in-use")) return "이미 등록된 이메일입니다.";
  if (m.includes("invalid-email")) return "유효하지 않은 이메일 형식입니다.";
  if (m.includes("weak-password")) return "비밀번호가 너무 약합니다.";
  if (m.includes("network-request-failed")) return "네트워크 연결에 실패했습니다.";
  if (m.includes("too-many-requests")) return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  if (m.includes("invalid-credential")) return "자격 정보가 올바르지 않습니다.";
  if (m.includes("operation-not-allowed")) return "현재 비밀번호 가입이 허용되지 않습니다.";
  if (m.includes("internal-error")) return "내부 오류가 발생했습니다. 다시 시도해 주세요.";
  return m;
}
function validatePassword(pw) {
  return (
    typeof pw === "string" &&
    pw.length >= 8 &&
    /[A-Za-z]/.test(pw) &&
    /\d/.test(pw) &&
    /[!@#$%^&*()_+{};':",.<>/?\\|`~-]/.test(pw)
  );
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = getAuthReturnPath(location, "/");
  const returningToGuestMyGoldImport = returnTo.startsWith("/my-gold?import=guest");
  const returningToMyGold = returnTo === "/my-gold" || returnTo.startsWith("/my-gold?") || returnTo.startsWith("/my-gold/");
  const returningToExchange = returnTo.startsWith("/gold-exchange");
  const onboardingPath = buildMemberOnboardingPath(returnTo);

  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [agreements, setAgreements] = useState({
    age14: false,
    tos: false,
    privacy: false,
    marketing: false,
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(REGISTER_FORM_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      setEmail((current) => current || saved.email || "");
    } catch {
      sessionStorage.removeItem(REGISTER_FORM_KEY);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(REGISTER_FORM_KEY, JSON.stringify({ email }));
  }, [email]);

  const copy = useMemo(() => {
    if (returningToGuestMyGoldImport) {
      return {
        title: "지금 만든 MY GOLD를 이어두세요",
        lead: "체험에서 기록한 금은 그대로 두고, 계정만 간단히 만들어 다음에도 이어서 확인할 수 있습니다.",
        noticeTitle: "입력한 금 정보는 다시 묻지 않습니다",
        noticeBody: "이메일 인증 후 지금 만든 금 이름·종류·중량·메모를 MY GOLD에 그대로 이어 저장합니다.",
        button: "내 금 저장하고 시작하기",
      };
    }
    if (returningToMyGold) {
      return {
        title: "내 금의 가치를 계속 이어보세요",
        lead: "이메일과 비밀번호로 계정을 만들고 이메일 인증까지 마치면 MY GOLD 기록을 계속 관리할 수 있습니다.",
        noticeTitle: "MY GOLD 흐름을 그대로 이어갑니다",
        noticeBody: "이메일 인증이 끝나면 가입 전에 하던 MY GOLD 화면으로 돌아가 그대로 이어집니다.",
        button: "내 금 저장하고 시작하기",
      };
    }
    if (returningToExchange) {
      return {
        title: "계산한 내용 그대로 예약을 이어가세요",
        lead: "계정을 만든 뒤 이메일 인증까지 완료하면 계산 결과와 선택한 일정으로 돌아가 예약을 계속할 수 있습니다.",
        noticeTitle: "계산과 일정은 다시 입력하지 않습니다",
        noticeBody: "예약 확정 전 이메일 인증이 필요하지만, 지금까지 선택한 내용은 그대로 이어집니다.",
        button: "계산 결과 이어서 예약하기",
      };
    }
    return {
      title: "한국골드마켓 시작하기",
      lead: "내 금을 기록하고 오늘 가치와 예상 순금량을 계속 확인할 계정을 간단히 만듭니다.",
      noticeTitle: "가입은 간단하게, 완료는 이메일 인증까지",
      noticeBody: "이메일·비밀번호와 필수동의 후 인증메일을 확인하면 가입이 완료됩니다. 이름·휴대전화·닉네임은 필요한 순간에만 추가합니다.",
      button: "한국골드마켓 시작하기",
    };
  }, [returningToExchange, returningToGuestMyGoldImport, returningToMyGold]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError(null);

    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      setError("이메일을 입력해 주세요.");
      return;
    }
    if (!validatePassword(password)) {
      setError("비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다.");
      return;
    }
    if (!agreements.age14 || !agreements.tos || !agreements.privacy) {
      setError("만 14세 이상 확인과 필수 약관(이용약관/개인정보)에 동의해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const { user, createdNow } = await signUp({
        email: normalizedEmail,
        password,
        continueUrl: onboardingPath,
      });

      markMemberOnboardingPending(returnTo);

      // 신규 가입은 Auth/OOB 직후 Firestore 읽기를 추가하지 않고 최소 회원 문서와
      // 동의를 바로 한 번만 기록합니다. 미인증 가입 재개 역시 자기 회원 문서를
      // 읽지 않고 마케팅 동의만 갱신해, 인증 전에는 읽기 권한 자체를 열지 않습니다.
      const userRef = doc(db, "users", user.uid);
      const ts = serverTimestamp();
      const initialConsents = {
        version: CURRENT_CONSENT_VERSION,
        age14: { accepted: true, at: ts },
        tos: { accepted: true, at: ts },
        privacy: { accepted: true, at: ts },
        marketing: { accepted: !!agreements.marketing, at: ts },
      };

      if (createdNow) {
        await setDoc(userRef, {
          email: normalizedEmail,
          createdAt: ts,
          updatedAt: ts,
          consents: initialConsents,
        }, { merge: true });
      } else {
        try {
          await updateDoc(userRef, {
            email: normalizedEmail,
            updatedAt: ts,
            "consents.marketing": {
              accepted: !!agreements.marketing,
              at: ts,
            },
          });
        } catch (resumeWriteError) {
          const code = String(resumeWriteError?.code || "");
          const canInitializeMissingSignupDoc =
            code === "not-found" ||
            code === "permission-denied" ||
            code === "failed-precondition";

          if (!canInitializeMissingSignupDoc) throw resumeWriteError;

          await setDoc(userRef, {
            email: normalizedEmail,
            createdAt: ts,
            updatedAt: ts,
            consents: initialConsents,
          }, { merge: true });
        }
      }

      sessionStorage.removeItem(REGISTER_FORM_KEY);
      trackProductEventOncePerSession(
        "sign_up",
        { method: "email", signup_mode: "progressive_profile" },
        "signup-completed"
      );

      // Firebase Auth 세션은 생성 직후 존재하지만, 한국골드마켓 회원가입 완료는
      // 이메일 인증까지입니다. 어떤 진입 경로에서도 인증 전 회원 화면으로 보내지 않습니다.
      navigate(buildVerifyEmailPath(onboardingPath), { replace: true });
    } catch (err) {
      console.error("회원가입 에러:", err);
      setError(toKoreanError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <Title>{copy.title}</Title>
        <Lead>{copy.lead}</Lead>

        <NoticeBox role="note">
          <strong>{copy.noticeTitle}</strong>
          <span>{copy.noticeBody}</span>
        </NoticeBox>

        <Form onSubmit={handleSubmit} autoComplete="on" aria-busy={loading ? "true" : undefined}>
          {error && <ErrorText role="alert" aria-live="assertive">{error}</ErrorText>}

          <FormGroup>
            <Label htmlFor="regEmail">이메일</Label>
            <Input
              id="regEmail"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              inputMode="email"
            />
          </FormGroup>

          <VisuallyHidden
            type="text"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            aria-hidden="true"
            tabIndex={-1}
          />

          <FormGroup>
            <Label htmlFor="regPassword">비밀번호</Label>
            <Input
              id="regPassword"
              name="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8자 이상, 영문/숫자/특수문자 포함"
              required
              disabled={loading}
              autoComplete="new-password"
            />
            <ToggleButton
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </ToggleButton>
          </FormGroup>
          <Helper>이름·전화번호·닉네임은 이메일 인증 후 필요한 순간에 설정할 수 있습니다.</Helper>

          <AgreementsSection value={agreements} onChange={setAgreements} />

          <Button
            type="submit"
            disabled={loading || !agreements.age14 || !agreements.tos || !agreements.privacy}
          >
            {loading ? "계정 만드는 중..." : copy.button}
          </Button>
        </Form>

        <BenefitJourney aria-label="가입 후 이어지는 혜택">
          <BenefitStep><small>이메일 인증</small><strong>+0.01g</strong></BenefitStep>
          <BenefitStep><small>금시세 알림</small><strong>+0.01g</strong></BenefitStep>
          <BenefitStep><small>퀵퀴즈</small><strong>+0.01g</strong></BenefitStep>
        </BenefitJourney>
      </Card>
    </Container>
  );
}
