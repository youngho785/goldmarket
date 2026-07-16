// src/pages/Register.jsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useNavigate, useLocation } from "react-router-dom";
import {
  collection, query, where, getDocs,
  doc, setDoc, serverTimestamp
} from "firebase/firestore";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { db, auth } from "../firebase/firebase";
import { signUp } from "../services/authService";
import { AgreementsSection } from "../components/AgreementsSection";
import { claimGoldQuizBonus } from "@/services/quizClient"; // ✅ 추가

// Register 폼 복구용 세션 키 (보조 용도)
const REGISTER_FORM_KEY = "registerFormData";
// 현재 약관 버전 (Terms.jsx와 동일하게 유지)
const CURRENT_TERMS_VERSION = "v1.1";

// ✅ 퀴즈 세션 키 (Quiz 페이지와 동일하게 유지)
const PASS_KEY = "quiz_gold_bonus_passed";
const PASS_SCORE_KEY = "quiz_gold_bonus_score";

/* ───────────── Styled ───────────── */
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
  max-width: 480px;
`;
const Title = styled.h1`
  text-align: center;
  margin-bottom: 16px;
  color: ${({ theme }) => theme.colors.primary || "#333"};
`;
const NoticeBox = styled.div`
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 0.95rem;
  line-height: 1.55;
  margin-bottom: 16px;
`;
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
`;
const Label = styled.label`
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
`;
const Input = styled.input`
  padding: 10px 40px 10px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  &:disabled { background: #f5f5f5; }
`;
const ToggleButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: #888;
  font-size: 1.2rem;
`;
const ErrorText = styled.p`
  color: red;
  font-size: 0.9rem;
  margin: -8px 0 8px;
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
async function isNicknameDuplicated(nick, nickLower) {
  if (!nick) return false;
  try {
    try {
      const qLower = query(collection(db, "profiles"), where("nicknameLower", "==", nickLower));
      const snapLower = await getDocs(qLower);
      if (!snapLower.empty) return true;
    } catch {}
    const qy = query(collection(db, "profiles"), where("nickname", "==", nick));
    const snap = await getDocs(qy);
    return !snap.empty;
  } catch (err) {
    console.warn("[register] nickname check skipped:", err?.message || err);
    return false;
  }
}

/* ───────────── Component ───────────── */
export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

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
      } catch {}
    }
  }, []);
  useEffect(() => {
    const payload = { displayName, email, nickname, phone };
    sessionStorage.setItem(REGISTER_FORM_KEY, JSON.stringify(payload));
  }, [displayName, email, nickname, phone]);

  const handleNicknameBlur = async () => {
    const { value, lower, valid } = normalizeNickname(nickname);
    if (!value) return;
    if (!valid) {
      setIsNickDuplicate(false);
      setError("닉네임은 2~16자, 한글/영문/숫자/공백/밑줄만 가능합니다.");
      return;
    }
    setCheckingNick(true);
    const dup = await isNicknameDuplicated(value, lower);
    setIsNickDuplicate(dup);
    if (dup) setError("이미 사용 중인 닉네임입니다.");
    setCheckingNick(false);
  };

  const handlePhoneChange = e => {
    setPhone(formatPhone(e.target.value));
    setError(null);
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
    const dup = await isNicknameDuplicated(trimmedNick, nickLower);
    setCheckingNick(false);
    if (dup) { setIsNickDuplicate(true); setError("이미 사용 중인 닉네임입니다."); return; }

    setLoading(true);
    try {
      const user = await signUp({
        email: normalizedEmail,
        password,
        nickname: trimmedNick,
        nicknameLower: nickLower,
        phone,
        displayName: displayName.trim(),
      });

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

      // ✅ 퀴즈 통과 플래그가 있으면 즉시 보너스 적립 호출
      try {
        const passed = sessionStorage.getItem(PASS_KEY) === "1";
        const score = Number(sessionStorage.getItem(PASS_SCORE_KEY) || "0");
        if (passed) {
          await claimGoldQuizBonus({ score: Number.isFinite(score) ? score : 0 });
          sessionStorage.removeItem(PASS_KEY);
          sessionStorage.removeItem(PASS_SCORE_KEY);
        }
      } catch (e) {
        // 적립 실패해도 가입 플로우는 계속
        // console.warn("quiz bonus claim after signup failed:", e);
      }

      // 이메일 인증 안내로 진행
      navigate("/verify-email");
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
          <ul style={{ margin: "0 0 0 16px", padding: 0 }}>
            <li><strong>인증메일이 스팸함/프로모션함으로 분류될 수 있습니다. 메일함 전체를 확인해 주세요.</strong></li>
            <li style={{ marginTop: 6 }}>
              모바일 메일앱에서 링크가 잘 열리지 않으면, 링크를 복사해 브라우저(크롬/사파리)로 열어주세요.
            </li>
          </ul>
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
              aria-describedby="pw-help"
            />
            <SmallText id="pw-help">보안을 위해 다른 사이트와 다른 비밀번호를 사용하세요.</SmallText>
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
            {loading ? "가입 중..." : "회원가입"}
          </Button>
        </Form>
      </Card>
    </Container>
  );
}
