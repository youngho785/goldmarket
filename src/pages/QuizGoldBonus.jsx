// src/pages/QuizGoldBonus.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Gift,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import {
  claimGoldQuizBonus,
  getGoldQuizBonusStatus,
} from "@/services/quizClient";
import { buildVerifyEmailPath, sanitizeAppReturnPath } from "@/lib/authReturn";
import {
  clearPendingQuizBonus,
  readPendingQuizBonus,
  savePendingQuizBonus,
} from "@/lib/quizPendingBonus";

/* ============================
   Quiz data
   - 일반 금 지식과 서비스 자체 기준을 화면에서 명확히 구분합니다.
   ============================ */
const QUIZ = [
  {
    id: "q1",
    category: "금 기본 지식",
    q: "1돈은 몇 g일까요?",
    choices: ["3.75g", "5g", "10g", "37.5g"],
    answer: 0,
    explanation:
      "1돈은 3.75g입니다. 국내 귀금속 거래에서 사용하는 전통적인 중량 단위이며, 한국골드마켓 계산에서도 1돈을 3.75g으로 계산합니다.",
    hint:
      "1냥이 37.5g이고, 1돈은 1냥의 10분의 1이라는 점을 떠올려 보세요.",
  },
  {
    id: "q2",
    category: "금 기본 지식",
    q: "999.9 골드바의 의미로 맞는 것은 무엇일까요?",
    choices: ["순도 99.99%", "무게 99.99g", "가격 할인 9.999%", "세공 수수료 포함"],
    answer: 0,
    explanation:
      "999.9는 천분율 순도 표기로, 순도 99.99%를 의미합니다. 골드바의 무게나 가격 할인율을 뜻하는 숫자가 아닙니다.",
    hint:
      "999.9라는 숫자가 골드바에서 '무게'가 아니라 무엇을 표시하는지 생각해 보세요.",
  },
  {
    id: "q3",
    category: "금 기본 지식",
    q: "18K 제품의 ‘750’ 표기는 약 몇 %의 금 함량을 의미할까요?",
    choices: ["58.5%", "75.0%", "91.6%", "99.9%"],
    answer: 1,
    explanation:
      "‘750’은 금 함량이 약 75.0%라는 뜻입니다. 18K는 24분율 기준으로 18/24 = 75%이며, 귀금속 제품에서는 750 표기가 널리 사용됩니다.",
    hint:
      "제품에 표시된 750이라는 숫자를 천분율로 바꾸면 몇 %인지 생각해 보세요.",
  },
  {
    id: "q4",
    category: "한국골드마켓 이용 안내",
    q: "금 교환 신청 전에 한국골드마켓에서 미리 확인할 수 있는 것은 무엇일까요?",
    choices: [
      "예상 순금 중량·골드바 조합·제작 공임",
      "미래의 금 시세",
      "대출 가능 금액",
      "보석의 감정 등급",
    ],
    answer: 0,
    explanation:
      "한국골드마켓에서는 신청 전에 예상 순금 중량과 골드바 조합, 제작 공임을 먼저 확인할 수 있습니다. 실제 교환은 매장에서 순도와 중량을 확인한 뒤 최종 결정합니다.",
    hint:
      "방문 전에 미리 계산하거나 확인할 수 있도록 제공하는 정보가 무엇인지 생각해 보세요.",
  },
  {
    id: "q5",
    category: "한국골드마켓 운영 기준",
    q: "현재 한국골드마켓의 금 교환 비용 안내로 맞는 것은 무엇일까요?",
    choices: [
      "별도의 교환 수수료 없이 골드바 제작 공임을 안내",
      "교환 금액의 5%를 수수료로 부과",
      "부가세만 별도로 부과",
      "교환 수수료와 제작 공임을 모두 부과",
    ],
    answer: 0,
    explanation:
      "현재 한국골드마켓은 별도의 교환 수수료 없이 골드바 제작 공임을 안내하는 방식입니다. 신청 전에 공임을 확인하고, 매장에서 실제 순도·중량을 확인한 뒤 결정할 수 있습니다.",
    hint:
      "한국골드마켓에서 교환 비용을 설명할 때 ‘교환 수수료’와 ‘골드바 제작 공임’을 어떻게 구분하는지 떠올려 보세요.",
  },
];

const TOTAL = QUIZ.length;
const formatBonusG = (value) => Number(value || 0).toFixed(2);

/* ============================
   UI
   - 모바일 우선 "골드 리워드 게임" 톤
   - 기능/채점/지급 로직은 그대로 두고 시각 구조만 재설계합니다.
   ============================ */
const Page = styled.main`
  max-width: 760px;
  margin: 0 auto;
  padding: 14px 0 34px;
  color: ${({ theme }) => theme.colors.text};

  @media (max-width: 640px) {
    padding-top: 8px;
    padding-bottom: 18px;
  }
`;

const Intro = styled.header`
  position: relative;
  overflow: hidden;
  padding: 17px 28px 14px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 38%, transparent);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at 88% 15%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, transparent) 0,
      transparent 31%
    ),
    linear-gradient(
      145deg,
      ${({ theme }) => theme.colors.primary} 0%,
      #111827 58%,
      #17130c 100%
    );
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.16);
  isolation: isolate;

  &::after {
    content: "0.01";
    position: absolute;
    right: -10px;
    bottom: -26px;
    z-index: -1;
    color: rgba(255, 255, 255, 0.035);
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(5.5rem, 15vw, 8rem);
    font-weight: 950;
    letter-spacing: -0.08em;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    padding: 15px 15px 13px;
    border-radius: 17px;
  }
`;

const Eyebrow = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 6px;
  color: #e6c56e;
  font-size: 0.64rem;
  font-weight: 950;
  letter-spacing: 0.16em;

  &::before {
    content: "";
    width: 20px;
    height: 1px;
    background: currentColor;
    opacity: 0.8;
  }
`;

const Title = styled.h1`
  max-width: 680px;
  margin: 0;
  color: #fff;
  font-size: clamp(1.55rem, 3.6vw, 2.05rem);
  line-height: 1.12;
  letter-spacing: -0.055em;
  word-break: keep-all;

  @media (max-width: 640px) {
    max-width: 330px;
    font-size: clamp(1.55rem, 7.2vw, 1.9rem);
  }
`;

const MetaRow = styled.div`
  display: none;
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 29px;
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.74);
  font-size: 0.73rem;
  font-weight: 820;
  backdrop-filter: blur(10px);

  &[data-gold="true"] {
    border-color: rgba(230, 197, 110, 0.7);
    background: rgba(230, 197, 110, 0.13);
    color: #f4d477;
  }
`;

const ProgressArea = styled.div`
  margin-top: 9px;
`;

const ProgressSteps = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 7px;
`;

const ProgressDot = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  min-height: 27px;
  border: 1px solid
    ${({ $done, $active }) =>
      $done || $active
        ? "rgba(230, 197, 110, 0.72)"
        : "rgba(255, 255, 255, 0.13)"};
  border-radius: 999px;
  background: ${({ $done, $active }) => {
    if ($done) return "rgba(230, 197, 110, 0.19)";
    if ($active) return "rgba(255, 255, 255, 0.08)";
    return "rgba(255, 255, 255, 0.035)";
  }};
  color: ${({ $done, $active }) =>
    $done || $active ? "#f4d477" : "rgba(255, 255, 255, 0.36)"};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.69rem;
  font-weight: 950;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    color 180ms ease,
    transform 180ms ease;

  ${({ $active }) => ($active ? "transform: translateY(-1px);" : "")}

  &::after {
    content: "";
    position: absolute;
    bottom: 5px;
    width: ${({ $done }) => ($done ? "16px" : "0")};
    height: 2px;
    border-radius: 999px;
    background: #e6c56e;
    transition: width 180ms ease;
  }

  @media (max-width: 390px) {
    min-height: 25px;
    font-size: 0.61rem;
  }
`;

const QuestionCard = styled.section`
  position: relative;
  overflow: hidden;
  margin-top: 10px;
  padding: clamp(21px, 4vw, 30px);
  scroll-margin-top: 74px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 24px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, ${({ theme }) => theme.colors.surface} 98%, #fff) 0%,
      ${({ theme }) => theme.colors.surface} 100%
    );
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);

  &::after {
    content: attr(data-step);
    position: absolute;
    top: -14px;
    right: 12px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 8%, transparent);
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(6.5rem, 22vw, 10rem);
    font-weight: 950;
    letter-spacing: -0.08em;
    line-height: 1;
    pointer-events: none;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 640px) {
    margin-top: 8px;
    padding: 19px 16px 17px;
    border-radius: 20px;
  }
`;

const Category = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 27px;
  padding: 4px 9px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 45%, ${({ theme }) => theme.colors.border});
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  font-size: 0.7rem;
  font-weight: 900;
`;

const QuestionNumber = styled.p`
  margin: 18px 0 6px;
  color: ${({ theme }) => theme.colors.textLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.72rem;
  font-weight: 950;
  letter-spacing: 0.13em;
`;

const QuestionTitle = styled.h2`
  max-width: 630px;
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.35rem, 4.5vw, 1.82rem);
  line-height: 1.38;
  letter-spacing: -0.035em;
  word-break: keep-all;

  @media (max-width: 640px) {
    max-width: 320px;
    font-size: clamp(1.28rem, 6.2vw, 1.58rem);
    line-height: 1.4;
  }
`;

const Choices = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 22px;

  @media (max-width: 640px) {
    margin-top: 18px;
    gap: 8px;
  }
`;

const Choice = styled.button`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 11px;
  align-items: center;
  min-height: 60px;
  padding: 10px 14px 10px 11px;
  border: 1px solid
    ${({ $selected, $correct, $wrong, theme }) => {
      if ($correct) return theme.colors.gold;
      if ($wrong) return "color-mix(in srgb, #b96c6c 65%, transparent)";
      if ($selected) return theme.colors.primary;
      return theme.colors.border;
    }};
  border-radius: 15px;
  background: ${({ $correct, $wrong, $selected, theme }) => {
    if ($correct) return theme.semantic.badgeGoldBg;
    if ($wrong) return "color-mix(in srgb, #b96c6c 8%, " + theme.colors.surface + ")";
    if ($selected) return theme.colors.surfaceAlt;
    return theme.colors.surface;
  }};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 0.92rem;
  font-weight: 760;
  line-height: 1.42;
  text-align: left;
  cursor: pointer;
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    background 150ms ease,
    box-shadow 150ms ease;

  &:not(:disabled):active {
    transform: scale(0.99);
  }

  @media (hover: hover) {
    &:not(:disabled):hover {
      transform: translateY(-1px);
      border-color: ${({ theme }) =>
        `color-mix(in srgb, ${theme.colors.gold} 58%, ${theme.colors.border})`};
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
    }
  }

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.gold};
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    grid-template-columns: 36px minmax(0, 1fr);
    min-height: 57px;
    padding: 9px 12px 9px 10px;
    border-radius: 14px;
    font-size: 0.86rem;
  }
`;

const ChoiceMark = styled.span`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid
    ${({ $selected, $correct, $wrong, theme }) => {
      if ($correct) return theme.colors.gold;
      if ($wrong) return "#b96c6c";
      if ($selected) return theme.colors.primary;
      return theme.colors.borderStrong;
    }};
  border-radius: 11px;
  background: ${({ $selected, $correct, $wrong, theme }) => {
    if ($correct) return theme.colors.gold;
    if ($wrong) return "rgba(185, 108, 108, 0.1)";
    if ($selected) return theme.colors.primary;
    return theme.colors.background;
  }};
  color: ${({ $selected, $correct, $wrong, theme }) => {
    if ($correct) return theme.colors.primary;
    if ($wrong) return "#9b4e4e";
    if ($selected) return theme.on.primary;
    return theme.colors.textSecondary;
  }};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.76rem;
  font-weight: 950;
`;

const Feedback = styled.div`
  margin-top: 16px;
  padding: 14px 15px;
  border: 1px solid
    ${({ $wrong, theme }) =>
      $wrong
        ? "rgba(185, 108, 108, 0.36)"
        : `color-mix(in srgb, ${theme.colors.gold} 52%, ${theme.colors.border})`};
  border-radius: 14px;
  background: ${({ $wrong, theme }) =>
    $wrong
      ? `color-mix(in srgb, #b96c6c 7%, ${theme.colors.surface})`
      : theme.semantic.badgeGoldBg};
  color: ${({ $wrong, theme }) =>
    $wrong ? theme.colors.textSecondary : theme.colors.textSecondary};
  font-size: 0.86rem;
  line-height: 1.62;

  strong {
    display: block;
    margin-bottom: 5px;
    color: ${({ $wrong, theme }) =>
      $wrong ? "#9b4e4e" : theme.colors.secondaryDark};
    font-size: 0.76rem;
    font-weight: 950;
    letter-spacing: 0.04em;
  }
`;

const ActionRow = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 17px;

  @media (min-width: 560px) {
    grid-template-columns: 1fr auto;
    align-items: center;
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 50px;
  padding: 11px 18px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font: inherit;
  font-size: 0.86rem;
  font-weight: 900;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease;

  &:not(:disabled):active {
    transform: scale(0.99);
  }

  @media (hover: hover) {
    &:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
    }
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  svg {
    width: 17px;
    height: 17px;
  }
`;

const SecondaryButton = styled(PrimaryButton)`
  border-color: ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  box-shadow: none;
`;

const ErrorText = styled.p`
  margin: 14px 0 0;
  padding: 11px 13px;
  border: 1px solid rgba(185, 108, 108, 0.24);
  border-radius: 12px;
  color: ${({ theme }) => theme.semantic.alertErrorText};
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  font-size: 0.82rem;
  line-height: 1.55;
`;

const ResultCard = styled.section`
  position: relative;
  overflow: hidden;
  margin-top: 13px;
  padding: clamp(27px, 5vw, 40px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 42%, transparent);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at 50% 0%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent),
      transparent 42%
    ),
    linear-gradient(145deg, ${({ theme }) => theme.colors.primary}, #111827 72%);
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.15);
  text-align: center;

  &::after {
    content: "GOLD";
    position: absolute;
    right: -10px;
    bottom: -17px;
    color: rgba(255, 255, 255, 0.025);
    font-size: clamp(4.5rem, 17vw, 8rem);
    font-weight: 950;
    letter-spacing: -0.07em;
    pointer-events: none;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 640px) {
    padding: 27px 18px 24px;
    border-radius: 20px;
  }
`;

const ResultIcon = styled.div`
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border: 1px solid rgba(230, 197, 110, 0.65);
  border-radius: 19px;
  background: rgba(230, 197, 110, 0.13);
  color: #f4d477;
  transform: rotate(-4deg);

  svg {
    width: 29px;
    height: 29px;
    transform: rotate(4deg);
  }
`;

const ResultTitle = styled.h2`
  margin: 0;
  color: #fff;
  font-size: clamp(1.55rem, 5vw, 2rem);
  line-height: 1.3;
  letter-spacing: -0.035em;
  word-break: keep-all;
`;

const ResultText = styled.p`
  margin: 12px auto 0;
  max-width: 560px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.91rem;
  line-height: 1.7;
  word-break: keep-all;

  b {
    color: #f4d477;
    font-weight: 950;
  }
`;

const ResultActions = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 22px;

  ${PrimaryButton} {
    border-color: #f1cf70;
    background: #f1cf70;
    color: #151515;
  }

  ${SecondaryButton} {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.07);
    color: #fff;
  }

  @media (min-width: 560px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const TrustNote = styled.aside`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 11px;
  margin-top: 12px;
  padding: 14px 15px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.76rem;
  line-height: 1.58;

  svg {
    width: 21px;
    height: 21px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  strong {
    display: block;
    margin-bottom: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.79rem;
  }

  @media (max-width: 640px) {
    margin-top: 9px;
    padding: 12px 13px;
    font-size: 0.71rem;
  }
`;

const LoadingCard = styled(QuestionCard)`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};

  &::after {
    content: "";
  }
`;

/* ============================
   Component
   ============================ */
export default function QuizGoldBonus() {
  const { user, isEmailVerified } = useAuthContext();
  const navigate = useNavigate();
  const loc = useLocation();

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(loc.search);
    return sanitizeAppReturnPath(params.get("next"), "");
  }, [loc.search]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const currentQuestion = QUIZ[currentIndex];
  const selected = answers[currentQuestion?.id];
  const currentFeedback = feedback[currentQuestion?.id] || "";
  const completedCount =
    currentIndex + (currentFeedback === "correct" ? 1 : 0);

  useEffect(() => {
    let cancelled = false;

    if (!user?.uid) {
      setStatusLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const pending = readPendingQuizBonus();

    (async () => {
      setStatusLoading(true);
      setError("");

      try {
        // 이메일 인증이 끝난 뒤에만 서버 지급 함수를 호출합니다.
        // 답안은 서버가 다시 채점하므로 localStorage 값 자체를 신뢰하지 않습니다.
        if (isEmailVerified && pending?.answers) {
          const res = await claimGoldQuizBonus({
            answers: pending.answers,
          });

          if (!cancelled) {
            setResult(res);
          }
          clearPendingQuizBonus();
          return;
        }

        const status = await getGoldQuizBonusStatus(user.uid);

        if (cancelled) return;

        if (status?.claimed) {
          clearPendingQuizBonus();
          setResult({
            ...status,
            ok: true,
            alreadyClaimed: true,
          });
          return;
        }

        if (!isEmailVerified && pending?.answers) {
          setResult({
            ok: false,
            needVerification: true,
            score: pending.score || TOTAL,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              "퀵퀴즈 혜택 상태를 확인하지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, isEmailVerified]);

  const onChoice = (qid, index) => {
    if (feedback[qid] === "correct") return;

    setAnswers((current) => ({
      ...current,
      [qid]: index,
    }));
    setFeedback((current) => ({
      ...current,
      [qid]: "",
    }));
    setError("");
  };

  const handleCheck = () => {
    if (!currentQuestion) return;

    if (!Number.isInteger(selected)) {
      setError("답을 하나 선택해 주세요.");
      return;
    }

    const correct = selected === currentQuestion.answer;

    setFeedback((current) => ({
      ...current,
      [currentQuestion.id]: correct ? "correct" : "wrong",
    }));

    if (!correct) {
      setError("");
    }
  };

  const handleNext = () => {
    if (currentFeedback !== "correct") return;
    if (currentIndex >= TOTAL - 1) return;

    setCurrentIndex((index) => index + 1);
    setError("");

    window.requestAnimationFrame?.(() => {
      document
        .getElementById("gold-quiz-question")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setAnswers({});
    setFeedback({});
    setError("");
    setResult(null);
  };

  const finishQuiz = async () => {
    if (submitting) return;

    const allCorrect = QUIZ.every(
      (question) =>
        Number(answers[question.id]) === question.answer
    );

    if (!allCorrect) {
      setError(
        "5가지 내용을 모두 정확히 확인한 뒤 완료할 수 있습니다."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (window?.gtag) {
        window.gtag("event", "quiz_gold_bonus_submit", {
          score: TOTAL,
          passed: true,
        });
      }

      if (user && isEmailVerified) {
        const res = await claimGoldQuizBonus({ answers });
        clearPendingQuizBonus();
        setResult(res);
      } else {
        const saved = savePendingQuizBonus(answers, TOTAL);
        if (!saved) {
          throw new Error(
            "퀴즈 결과를 임시 저장하지 못했습니다. 브라우저 저장소 설정을 확인한 뒤 다시 시도해 주세요."
          );
        }

        if (user) {
          // 로그인은 되어 있지만 이메일이 미인증이면 답안을 보존한 뒤 인증 화면으로 이동합니다.
          const returnAfterVerification =
            nextPath || `${loc.pathname}${loc.search}`;
          navigate(buildVerifyEmailPath(returnAfterVerification), {
            state: { from: returnAfterVerification },
          });
          return;
        }

        setResult({
          ok: true,
          needSignup: true,
          score: TOTAL,
        });
      }
    } catch (submitError) {
      setError(
        submitError?.message ||
          "혜택 적립 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showQuiz =
    !statusLoading &&
    !result?.alreadyClaimed &&
    !result?.ok &&
    !result?.needSignup &&
    !result?.needVerification;

  return (
    <Page>
      <Intro>
        <Eyebrow>GOLD QUICK QUIZ</Eyebrow>
        <Title>
          5문제 풀고
          <br />
          순금 0.01g 받기
        </Title>
        <MetaRow>
          <MetaBadge>약 1분</MetaBadge>
          <MetaBadge>5문제</MetaBadge>
          <MetaBadge data-gold="true">순금 0.01g 받기</MetaBadge>
        </MetaRow>

        <ProgressArea>
          <ProgressSteps aria-label={`퀵퀴즈 진행 ${Math.min(completedCount, TOTAL)} / ${TOTAL}`}>
            {QUIZ.map((question, index) => {
              const isDone = index < completedCount;
              const isActive =
                index === currentIndex && completedCount < TOTAL;

              return (
                <ProgressDot
                  key={`progress-${question.id}`}
                  $done={isDone}
                  $active={isActive}
                  aria-current={isActive ? "step" : undefined}
                >
                  {String(index + 1).padStart(2, "0")}
                </ProgressDot>
              );
            })}
          </ProgressSteps>
        </ProgressArea>
      </Intro>

      {statusLoading && (
        <LoadingCard>
          순금 혜택 수령 여부를 확인하고 있습니다…
        </LoadingCard>
      )}

      {showQuiz && currentQuestion && (
        <QuestionCard
          id="gold-quiz-question"
          data-step={String(currentIndex + 1).padStart(2, "0")}
        >
          <Category>{currentQuestion.category}</Category>
          <QuestionNumber>
            QUESTION {String(currentIndex + 1).padStart(2, "0")} /{" "}
            {String(TOTAL).padStart(2, "0")}
          </QuestionNumber>
          <QuestionTitle>{currentQuestion.q}</QuestionTitle>

          <Choices>
            {currentQuestion.choices.map((choice, index) => {
              const isSelected = selected === index;
              const isCorrectChoice =
                currentFeedback === "correct" &&
                index === currentQuestion.answer;
              const isWrongChoice =
                currentFeedback === "wrong" && isSelected;

              return (
                <Choice
                  key={`${currentQuestion.id}-${index}`}
                  type="button"
                  onClick={() =>
                    onChoice(currentQuestion.id, index)
                  }
                  disabled={currentFeedback === "correct"}
                  $selected={isSelected}
                  $correct={isCorrectChoice}
                  $wrong={isWrongChoice}
                  aria-pressed={isSelected}
                >
                  <ChoiceMark
                    $selected={isSelected}
                    $correct={isCorrectChoice}
                    $wrong={isWrongChoice}
                  >
                    {isCorrectChoice ? (
                      <Check size={15} />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </ChoiceMark>
                  <span>{choice}</span>
                </Choice>
              );
            })}
          </Choices>

          {currentFeedback === "wrong" && (
            <Feedback $wrong>
              <strong>ONE MORE TRY</strong>
              {currentQuestion.hint}
            </Feedback>
          )}

          {currentFeedback === "correct" && (
            <Feedback>
              <strong>✓ NICE. 정답입니다</strong>
              {currentQuestion.explanation}
            </Feedback>
          )}

          {error && <ErrorText role="alert">{error}</ErrorText>}

          <ActionRow>
            {currentFeedback !== "correct" ? (
              <PrimaryButton
                type="button"
                onClick={handleCheck}
                disabled={!Number.isInteger(selected)}
              >
                정답 확인하기
              </PrimaryButton>
            ) : currentIndex < TOTAL - 1 ? (
              <PrimaryButton type="button" onClick={handleNext}>
                다음 문제
                <ChevronRight />
              </PrimaryButton>
            ) : (
              <PrimaryButton
                type="button"
                onClick={finishQuiz}
                disabled={submitting}
              >
                <Gift />
                {submitting
                  ? "혜택 확인 중…"
                  : "퀵퀴즈 완료하고 순금 0.01g 받기"}
              </PrimaryButton>
            )}

            {currentIndex > 0 && currentFeedback !== "correct" && (
              <SecondaryButton
                type="button"
                onClick={() =>
                  setCurrentIndex((index) =>
                    Math.max(0, index - 1)
                  )
                }
              >
                이전
              </SecondaryButton>
            )}
          </ActionRow>
        </QuestionCard>
      )}

      {result && (
        <ResultCard>
          <ResultIcon>
            {result.needSignup ? (
              <Gift />
            ) : (
              <CheckCircle2 />
            )}
          </ResultIcon>

          {result.needSignup ? (
            <>
              <ResultTitle>퀵퀴즈 완료</ResultTitle>
              <ResultText>
                회원가입하면 퀵퀴즈 혜택
                <b> 순금 0.01g</b>을 받을 수 있습니다.
              </ResultText>

              <ResultActions>
                <PrimaryButton
                  as={Link}
                  to={`/register?next=${encodeURIComponent(
                    loc.pathname + loc.search
                  )}`}
                >
                  회원가입하고 순금 0.01g 받기
                  <ChevronRight />
                </PrimaryButton>
                <SecondaryButton as={Link} to="/">
                  나중에 하기
                </SecondaryButton>
              </ResultActions>
            </>
          ) : result.needVerification ? (
            <>
              <ResultTitle>이메일 인증하고 순금 0.01g 받기</ResultTitle>
              <ResultText>
                가입하신 이메일의 인증 링크를 누르면
                퀵퀴즈 혜택 순금 0.01g을 받을 수 있습니다.
              </ResultText>

              <ResultActions>
                <PrimaryButton
                  type="button"
                  onClick={() => {
                    const returnAfterVerification =
                      nextPath || `${loc.pathname}${loc.search}`;
                    navigate(buildVerifyEmailPath(returnAfterVerification), {
                      state: { from: returnAfterVerification },
                    });
                  }}
                >
                  이메일 인증하기
                  <ChevronRight />
                </PrimaryButton>
                <SecondaryButton as={Link} to="/">
                  나중에 하기
                </SecondaryButton>
              </ResultActions>
            </>
          ) : result.alreadyClaimed ? (
            <>
              <ResultTitle>이미 완료한 퀵퀴즈입니다</ResultTitle>
              <ResultText>
                이 혜택은 계정당 1회 제공됩니다.
                지급된 퀵퀴즈 혜택은
                <b> {formatBonusG(result.creditedG)}g</b>입니다.
              </ResultText>

              <ResultActions>
                {nextPath ? (
                  <PrimaryButton
                    type="button"
                    onClick={() =>
                      navigate(nextPath, { replace: true })
                    }
                  >
                    혜택 계속하기
                    <ChevronRight />
                  </PrimaryButton>
                ) : (
                  <PrimaryButton as={Link} to="/profile">
                    내 적립 순금 확인
                    <ChevronRight />
                  </PrimaryButton>
                )}

                <SecondaryButton as={Link} to="/gold-exchange">
                  금교환 계산해보기
                </SecondaryButton>
              </ResultActions>
            </>
          ) : result.ok ? (
            <>
              <ResultTitle>순금 0.01g을 받았습니다 🎉</ResultTitle>
              <ResultText>
                현재 적립 순금은
                <b>
                  {" "}
                  {formatBonusG(
                    result.balanceG ??
                      result.creditedG ??
                      0.01
                  )}
                  g
                </b>
                입니다.
              </ResultText>

              <ResultActions>
                {nextPath ? (
                  <PrimaryButton
                    type="button"
                    onClick={() =>
                      navigate(nextPath, { replace: true })
                    }
                  >
                    혜택 계속하기
                    <ChevronRight />
                  </PrimaryButton>
                ) : (
                  <PrimaryButton as={Link} to="/profile">
                    내 적립 순금 확인
                    <ChevronRight />
                  </PrimaryButton>
                )}

                <SecondaryButton as={Link} to="/gold-exchange">
                  금교환 계산해보기
                </SecondaryButton>
              </ResultActions>
            </>
          ) : (
            <>
              <ResultTitle>혜택 확인이 필요합니다</ResultTitle>
              <ResultText>
                잠시 후 다시 시도해 주세요.
              </ResultText>
              <ResultActions>
                <PrimaryButton type="button" onClick={resetQuiz}>
                  <RotateCcw />
                  다시 확인하기
                </PrimaryButton>
              </ResultActions>
            </>
          )}
        </ResultCard>
      )}

      {!statusLoading && error && !showQuiz && (
        <ErrorText role="alert">{error}</ErrorText>
      )}

      <TrustNote>
        <ShieldCheck />
        <div>
          <strong>확인하고 결정하는 금 교환</strong>
          일반 금 지식과 한국골드마켓 자체 이용·운영 기준을 구분해
          안내합니다. 온라인 계산 결과는 예상값이며, 실제 교환은
          매장에서 순도와 중량, 제작 공임을 확인한 뒤 고객이 최종
          결정합니다.
        </div>
      </TrustNote>
    </Page>
  );
}
