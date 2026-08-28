// src/pages/Register.jsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { db, auth } from "../firebase/firebase";
import { signUp, tryResumeUnverifiedSignup } from "../services/authService";
import { AgreementsSection } from "../components/AgreementsSection";
import { checkNicknameAvailability, claimNickname } from "@/services/nicknameClient";
import { ensureUserProfileOnSignup } from "../services/userService";
import {
  getAuthReturnPath,
} from "@/lib/authReturn";
import {
  buildMemberOnboardingPath,
  markMemberOnboardingPending,
} from "@/lib/memberOnboarding";

// Register 폼 복구용 세션 키 (보조 용도)
const REGISTER_FORM_KEY = "registerFormData";
// 현재 약관 버전 (Terms.jsx와 동일하게 유지)
const CURRENT_TERMS_VERSION = "v1.1";

/* ───────────── Styled ───────────── */
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
  margin-bottom: 20px;
  font-size: clamp(26px, 5vw, 34px);
  color: ${({ theme }) => theme.colors.text};
`;
const NoticeBox = styled.div`
  background: ${({ theme }) => theme.semantic.alertWarningBg};
  border: 1px solid ${({ theme }) => theme.colors.secondary}55;
  color: ${({ theme }) => theme.semantic.alertWarningText};
  border-radius: 12px;
  padding: 13px 14px;
  font-size: 0.95rem;
  line-height: 1.55;
  margin-bottom: 16px;
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
  &::-ms-clear {
    display: none;
  }

  &::-webkit-credentials-auto-fill-button,
  &::-webkit-contacts-auto-fill-button {
    visibility: hidden;
    display: none !important;
    pointer-events: none;
  }

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
  margin: 0 0 8px;
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
/* 🔒 시각적으로 숨기는 인풋: 접근성/자동완성용 */
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

/* ───────────── Helpers ───────────── */
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
function validatePhone(phone) {
  return /^01[016789]-\d{3,4}-\d{4}$/.test(phone);
}
function formatPhone(input) {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
function normalizeNickname(n) {
  const value = (n || "").trim();
  const valid = /^[\p{Script=Hangul}A-Za-z0-9 _]{2,16}$/u.test(value);
  return { value, valid, lower: value.toLowerCase() };
}
async function isNicknameDuplicated(nick) {
  if (!nick) return false;
  try {
    return !(await checkNicknameAvailability(nick));
  } catch (err) {
    console.warn("[register] nickname availability check failed:", err?.message || err);
    // 서버 확인 실패를 "사용 가능"으로 처리하지 않습니다.
    throw new Error("닉네임 사용 가능 여부를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

/* ───────────── Component ───────────── */
export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인과 동일한 공용 복귀 규칙을 사용합니다.
  const returnTo = getAuthReturnPath(location, "/");
  const onboardingPath = buildMemberOnboardingPath(returnTo);

  const [displayName, setDisplayName]         = useState("");
  const [email, setEmail]                     = useState(location.state?.email || "");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname]               = useState("");
  const [phone, setPhone]                     = useState("");

  const [agreements, setAgreements] = useState({
    age14: false,
    tos: false,
    privacy: false,
    marketing: false,
  });

  const [error, setError]                     = useState(null);
  const [checkingNick, setCheckingNick]       = useState(false);
  const [isNickDuplicate, setIsNickDuplicate] = useState(false);
  const [loading, setLoading]                 = useState(false);

  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 폼 자동 저장/복구 (옵션)
  useEffect(() => {
    const raw = sessionStorage.getItem(REGISTER_FORM_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        setDisplayName(saved.displayName || "");
        setEmail(saved.email || "");
        setNickname(saved.nickname || "");
        setPhone(saved.phone || "");
      } catch {
        sessionStorage.removeItem(REGISTER_FORM_KEY);
      }
    }
  }, []);
  useEffect(() => {
    const payload = { displayName, email, nickname, phone };
    sessionStorage.setItem(REGISTER_FORM_KEY, JSON.stringify(payload));
  }, [displayName, email, nickname, phone]);

  const handleNicknameBlur = async () => {
    const { value, valid } = normalizeNickname(nickname);
    if (!value) return;
    if (!valid) {
      setIsNickDuplicate(false);
      setError("닉네임은 2~16자, 한글/영문/숫자/공백/밑줄만 가능합니다.");
      return;
    }
    setCheckingNick(true);
    try {
      const dup = await isNicknameDuplicated(value);
      setIsNickDuplicate(dup);
      if (dup) setError("이미 사용 중인 닉네임입니다.");
    } catch (checkError) {
      setIsNickDuplicate(false);
      setError(checkError?.message || "닉네임 확인에 실패했습니다.");
    } finally {
      setCheckingNick(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!displayName.trim()) { setError("이름을 입력해주세요."); return; }
    if (!normalizedEmail)   { setError("이메일을 입력해주세요."); return; }
    if (password !== confirmPassword) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (!validatePassword(password))  { setError("비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다."); return; }
    if (!validatePhone(phone))        { setError("휴대전화 번호를 010-1234-5678 형식으로 입력해주세요."); return; }

    if (!agreements.age14 || !agreements.tos || !agreements.privacy) {
      setError("만 14세 이상 확인과 필수 약관(이용약관/개인정보)에 동의해 주세요.");
      return;
    }

    const { value: trimmedNick, lower: nickLower, valid: nickValid } = normalizeNickname(nickname);
    if (!trimmedNick) { setError("닉네임을 입력해주세요."); return; }
    if (!nickValid)   { setError("닉네임은 2~16자, 한글/영문/숫자/공백/밑줄만 가능합니다."); return; }

    setCheckingNick(true);
    try {
      let dup = await isNicknameDuplicated(trimmedNick);

      if (dup) {
        // 이전 가입 시도의 Auth 계정이 살아 있지만 로컬 세션이 사라진 경우,
        // 사용자가 입력한 동일 이메일/비밀번호로 미인증 계정을 재개한 뒤
        // 같은 UID 소유 닉네임인지 다시 확인합니다.
        const resumed = await tryResumeUnverifiedSignup(
          normalizedEmail,
          password
        );
        if (resumed) {
          dup = await isNicknameDuplicated(trimmedNick);
        }
      }

      if (dup) {
        setIsNickDuplicate(true);
        setError("이미 사용 중인 닉네임입니다.");
        return;
      }
      setIsNickDuplicate(false);
    } catch (checkError) {
      setError(checkError?.message || "닉네임 확인에 실패했습니다.");
      return;
    } finally {
      setCheckingNick(false);
    }

    setLoading(true);
    try {
      let user;
      const currentUser = auth.currentUser;
      const canResumePendingSignup =
        !!currentUser &&
        !currentUser.emailVerified &&
        String(currentUser.email || "").trim().toLowerCase() === normalizedEmail;

      if (canResumePendingSignup) {
        // 앞선 가입 시도에서 Auth/닉네임 선점까지 완료된 경우
        // 새 Auth 계정을 만들지 않고 동일 UID의 가입 절차를 이어갑니다.
        await claimNickname(trimmedNick);
        await ensureUserProfileOnSignup(currentUser, {
          displayName: displayName.trim(),
          nickname: trimmedNick,
          phone,
          email: normalizedEmail,
        });
        user = currentUser;
      } else {
        user = await signUp({
          email: normalizedEmail,
          password,
          nickname: trimmedNick,
          nicknameLower: nickLower,
          phone,
          displayName: displayName.trim(),
          // Firebase 메일의 action handler는 /verify-email이며, continueUrl은 인증 후 복귀 경로입니다.
          continueUrl: onboardingPath,
        });
      }

      markMemberOnboardingPending(returnTo);

      const uid = user?.uid || auth.currentUser?.uid;
      if (uid) {
        const ts = serverTimestamp();
        await setDoc(
          doc(db, "users", uid),
          {
            consents: {
              version: CURRENT_TERMS_VERSION,
              age14:     { accepted: true,                   at: ts },
              tos:       { accepted: true,                   at: ts },
              privacy:   { accepted: true,                   at: ts },
              marketing: { accepted: !!agreements.marketing, at: ts },
            },
          },
          { merge: true }
        );
      }

      // 보너스 지급은 이메일 인증 완료 후 WelcomeOnboarding에서 처리합니다.
      // 퀴즈를 먼저 풀었다면 결과는 localStorage(24시간)에 보존되어 인증 후 서버가 다시 검증합니다.

      // 가입 직후에는 혜택 안내 화면으로 이동하되, 실제 적립은 이메일 인증 완료 후 진행합니다.
      // 인증 메일 링크는 onboardingPath로 다시 돌아오도록 이미 발송되었습니다.
      navigate(onboardingPath, {
        state: {
          from: returnTo || undefined,
        },
      });
    } catch (err) {
      console.error("회원가입 에러:", err);
      setError(toKoreanError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || checkingNick;

  return (
    <Container>
      <Card>
        <Title>회원가입</Title>

        <NoticeBox role="note" aria-live="polite">
          <strong>회원가입하고 순금 0.01g 받기</strong>
          <div>
            이메일 인증을 완료하면 계정당 1회 적립됩니다.
            퀵퀴즈와 금시세 알림으로 최대 순금 0.03g까지 받을 수 있습니다.
          </div>
        </NoticeBox>

        {error && <ErrorText role="alert" aria-live="assertive">{error}</ErrorText>}

        <Form onSubmit={handleSubmit} autoComplete="on" aria-busy={loading ? "true" : undefined}>
          {/* 이름 */}
          <FormGroup>
            <Label htmlFor="regName">이름</Label>
            <Input
              id="regName"
              name="name"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              disabled={isDisabled}
              autoComplete="name"
              placeholder="예: 홍길동"
            />
          </FormGroup>

          {/* 이메일 */}
          <FormGroup>
            <Label htmlFor="regEmail">이메일</Label>
            <Input
              id="regEmail"
              name="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={isDisabled}
              autoComplete="email"
              inputMode="email"
            />
          </FormGroup>

          {/* ✅ 비밀번호 매니저/접근성용 숨김 username (email 복제) */}
          <VisuallyHidden
            type="text"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            aria-hidden="true"
            tabIndex={-1}
          />

          {/* 비밀번호 */}
          <FormGroup>
            <Label htmlFor="regPassword">비밀번호</Label>
            <Input
              id="regPassword"
              name="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8자 이상, 영문/숫자/특수문자 포함"
              required
              disabled={isDisabled}
              autoComplete="new-password"
            />
            <ToggleButton
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </ToggleButton>
          </FormGroup>

          {/* 비밀번호 확인 */}
          <FormGroup>
            <Label htmlFor="regPasswordConfirm">비밀번호 확인</Label>
            <Input
              id="regPasswordConfirm"
              name="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
              required
              disabled={isDisabled}
              autoComplete="new-password"
            />
            <ToggleButton
              type="button"
              onClick={() => setShowConfirmPassword(v => !v)}
              aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
            </ToggleButton>
          </FormGroup>

          {/* 닉네임 */}
          <FormGroup>
            <Label htmlFor="regNickname">닉네임</Label>
            <Input
              id="regNickname"
              name="nickname"
              type="text"
              value={nickname}
              onChange={e => {
                setNickname(e.target.value);
                setIsNickDuplicate(false);
                setError(null);
              }}
              onBlur={handleNicknameBlur}
              maxLength={16}
              required
              disabled={isDisabled}
              style={isNickDuplicate ? { borderColor: "red" } : {}}
              aria-invalid={isNickDuplicate ? "true" : undefined}
              aria-describedby={isNickDuplicate ? "nickname-error" : undefined}
            />
            {checkingNick && <SmallText>중복 확인 중...</SmallText>}
            {isNickDuplicate && (
              <ErrorText id="nickname-error" role="alert">이미 사용 중인 닉네임입니다.</ErrorText>
            )}
          </FormGroup>

          {/* 휴대전화 */}
          <FormGroup>
            <Label htmlFor="regPhone">휴대전화</Label>
            <Input
              id="regPhone"
              name="tel"
              type="tel"
              value={phone}
              onChange={e => {
                setPhone(formatPhone(e.target.value));
                setError(null);
              }}
              placeholder="010-1234-5678"
              required
              disabled={isDisabled}
              inputMode="numeric"
              autoComplete="tel"
            />
          </FormGroup>

          {/* 약관 동의 섹션 */}
          <AgreementsSection value={agreements} onChange={setAgreements} />

          <Button
            type="submit"
            disabled={
              isDisabled ||
              !agreements.age14 ||
              !agreements.tos ||
              !agreements.privacy
            }
          >
            {loading ? "가입 중..." : "회원가입하고 순금 0.01g 받기"}
          </Button>
        </Form>
      </Card>
    </Container>
  );
}
