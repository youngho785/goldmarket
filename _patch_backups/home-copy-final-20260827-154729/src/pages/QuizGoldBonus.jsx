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
   ============================ */
const Page = styled.main`
  max-width: 760px;
  margin: 0 auto;
  padding: 18px 0 58px;
  color: ${({ theme }) => theme.colors.text};
`;

const Intro = styled.header`
  padding: clamp(24px, 5vw, 36px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const Eyebrow = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.09em;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.85rem, 5vw, 2.65rem);
  line-height: 1.2;
  letter-spacing: -0.035em;
  word-break: keep-all;
`;

const IntroText = styled.p`
  margin: 14px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.98rem;
  line-height: 1.75;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.82rem;
  font-weight: 750;

  &[data-gold="true"] {
    border-color: ${({ theme }) => theme.colors.gold};
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ProgressArea = styled.div`
  margin-top: 22px;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.86rem;

  b {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ProgressTrack = styled.div`
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.border};
`;

const ProgressBar = styled.div`
  width: ${({ $value }) => `${$value}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.gradients.gold};
  transition: width 220ms ease;
`;

const QuestionCard = styled.section`
  margin-top: 16px;
  padding: clamp(22px, 5vw, 34px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const Category = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 9px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  font-size: 0.78rem;
  font-weight: 850;
`;

const QuestionNumber = styled.p`
  margin: 16px 0 6px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.83rem;
  font-weight: 800;
`;

const QuestionTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: clamp(1.25rem, 4vw, 1.65rem);
  line-height: 1.45;
  letter-spacing: -0.025em;
  word-break: keep-all;
`;

const Choices = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 22px;
`;

const Choice = styled.button`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 54px;
  padding: 11px 14px;
  border: 1px solid
    ${({ $selected, $correct, $wrong, theme }) => {
      if ($correct) return theme.colors.success;
      if ($wrong) return theme.colors.error;
      if ($selected) return theme.colors.primary;
      return theme.colors.border;
    }};
  border-radius: 11px;
  background: ${({ $correct, $wrong, $selected, theme }) => {
    if ($correct) return theme.semantic.alertSuccessBg;
    if ($wrong) return theme.semantic.alertErrorBg;
    if ($selected) return theme.colors.surfaceAlt;
    return theme.colors.background;
  }};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:disabled {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ChoiceMark = styled.span`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid
    ${({ $selected, $correct, $wrong, theme }) => {
      if ($correct) return theme.colors.success;
      if ($wrong) return theme.colors.error;
      if ($selected) return theme.colors.primary;
      return theme.colors.borderStrong;
    }};
  border-radius: 50%;
  color: ${({ $selected, $correct, $wrong, theme }) =>
    $selected || $correct || $wrong
      ? theme.colors.primary
      : theme.colors.textSecondary};
  font-size: 0.8rem;
  font-weight: 900;
`;

const Feedback = styled.div`
  margin-top: 18px;
  padding: 15px 16px;
  border: 1px solid
    ${({ $wrong, theme }) =>
      $wrong ? theme.colors.error : theme.colors.success};
  border-radius: 11px;
  background: ${({ $wrong, theme }) =>
    $wrong
      ? theme.semantic.alertErrorBg
      : theme.semantic.alertSuccessBg};
  color: ${({ $wrong, theme }) =>
    $wrong
      ? theme.semantic.alertErrorText
      : theme.semantic.alertSuccessText};
  line-height: 1.65;

  strong {
    display: block;
    margin-bottom: 5px;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ActionRow = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 18px;

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
  min-height: 48px;
  padding: 11px 17px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  font: inherit;
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 17px;
    height: 17px;
  }
`;

const SecondaryButton = styled(PrimaryButton)`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
`;

const ErrorText = styled.p`
  margin: 16px 0 0;
  padding: 11px 13px;
  border-radius: 10px;
  color: ${({ theme }) => theme.semantic.alertErrorText};
  background: ${({ theme }) => theme.semantic.alertErrorBg};
  line-height: 1.55;
`;

const ResultCard = styled.section`
  margin-top: 16px;
  padding: clamp(24px, 5vw, 36px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.large};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
  text-align: center;
`;

const ResultIcon = styled.div`
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: ${({ theme }) => theme.semantic.alertSuccessBg};
  color: ${({ theme }) => theme.colors.primary};

  svg {
    width: 28px;
    height: 28px;
  }
`;

const ResultTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.45rem, 4vw, 1.9rem);
  letter-spacing: -0.025em;
`;

const ResultText = styled.p`
  margin: 12px auto 0;
  max-width: 560px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.7;

  b {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ResultActions = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 22px;

  @media (min-width: 560px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const TrustNote = styled.aside`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 11px;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.84rem;
  line-height: 1.65;

  svg {
    width: 22px;
    height: 22px;
    color: ${({ theme }) => theme.colors.primary};
  }

  strong {
    display: block;
    margin-bottom: 3px;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const LoadingCard = styled(QuestionCard)`
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
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
  const progress = Math.round((completedCount / TOTAL) * 100);

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
    window.scrollTo?.({ top: 0, behavior: "smooth" });
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
        <Eyebrow>GOLD EXCHANGE BASIC GUIDE</Eyebrow>
        <Title>금 교환 전에 꼭 알아둘 5가지</Title>
        <IntroText>
          1돈의 무게부터 14K 순도, 999.9 골드바까지
          <strong> 실제 금 교환에 필요한 기본 내용</strong>을
          약 1분 동안 확인해 보세요. 모든 내용을 확인하면 참여
          혜택으로 순금 0.01g을 적립해 드립니다.
        </IntroText>

        <MetaRow>
          <MetaBadge>약 1분</MetaBadge>
          <MetaBadge>5가지 기본 내용</MetaBadge>
          <MetaBadge data-gold="true">완료 혜택 순금 0.01g</MetaBadge>
        </MetaRow>

        <ProgressArea>
          <ProgressText>
            <span>기초 가이드 진행</span>
            <b>
              {Math.min(completedCount, TOTAL)} / {TOTAL}
            </b>
          </ProgressText>
          <ProgressTrack>
            <ProgressBar $value={progress} />
          </ProgressTrack>
        </ProgressArea>
      </Intro>

      {statusLoading && (
        <LoadingCard>
          순금 혜택 수령 여부를 확인하고 있습니다…
        </LoadingCard>
      )}

      {showQuiz && currentQuestion && (
        <QuestionCard>
          <Category>{currentQuestion.category}</Category>
          <QuestionNumber>
            {String(currentIndex + 1).padStart(2, "0")} /{" "}
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
              <strong>다시 확인해 보세요</strong>
              {currentQuestion.hint}
            </Feedback>
          )}

          {currentFeedback === "correct" && (
            <Feedback>
              <strong>✓ 확인했습니다</strong>
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
                정답 확인
              </PrimaryButton>
            ) : currentIndex < TOTAL - 1 ? (
              <PrimaryButton type="button" onClick={handleNext}>
                다음 내용
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
                  : "5가지 확인 완료하고 0.01g 받기"}
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
              <ResultTitle>금 교환 기초 확인 완료</ResultTitle>
              <ResultText>
                5가지 기본 내용을 모두 확인했습니다.
                지금 회원가입하면 퀵퀴즈 참여 혜택
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
              <ResultTitle>이메일 인증 후 혜택을 받을 수 있습니다</ResultTitle>
              <ResultText>
                퀴즈 결과는 24시간 동안 보관됩니다. 회원가입 때 받은 인증메일을
                한 번 확인하면, 인증 완료 후 서버가 답안을 다시 검증해 순금 0.01g을
                적립합니다.
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
                  이메일 인증 계속하기
                  <ChevronRight />
                </PrimaryButton>
                <SecondaryButton as={Link} to="/">
                  나중에 하기
                </SecondaryButton>
              </ResultActions>
            </>
          ) : result.alreadyClaimed ? (
            <>
              <ResultTitle>이미 완료한 기초 가이드입니다</ResultTitle>
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
              <ResultTitle>금 교환 기초 확인 완료</ResultTitle>
              <ResultText>
                5가지 기본 내용을 모두 확인했습니다.
                참여 혜택
                <b>
                  {" "}
                  순금 {formatBonusG(result.creditedG || 0.01)}g
                </b>
                이 적립되었습니다.
                현재 적립 순금 잔액은
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
