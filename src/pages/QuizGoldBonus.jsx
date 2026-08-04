// src/pages/QuizGoldBonus.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { claimGoldQuizBonus, getGoldQuizBonusStatus } from "@/services/quizClient";

/* ============================
   UI
   ============================ */
const Page = styled.main`
  --quiz-gold: #af8434;
  --quiz-gold-deep: #7d5a1e;
  --quiz-navy: #0d2034;

  position: relative;
  isolation: isolate;
  max-width: 960px;
  min-height: 70vh;
  margin: 0 auto;
  padding: 30px 0 64px;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts?.body || "inherit"};
  counter-reset: quiz-question;

  &::before {
    content: "";
    position: absolute;
    z-index: -1;
    top: 8px;
    right: 10%;
    width: min(320px, 54vw);
    height: min(320px, 54vw);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(198, 163, 75, 0.13), rgba(198, 163, 75, 0) 68%);
    pointer-events: none;
  }
`;
const Kicker = styled.p`
  margin: 0 0 9px;
  color: var(--quiz-gold-deep);
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .7rem;
  font-weight: 850;
  letter-spacing: .15em;
`;
const Title = styled.h1`
  margin: 0 0 12px;
  font-family: ${({ theme }) => theme.fonts?.heading || "inherit"};
  font-size: clamp(2rem, 5vw, 3.45rem);
  line-height: 1.22;
  letter-spacing: -0.035em;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
  text-wrap: balance;
  word-break: keep-all;

  @media (max-width: 560px) {
    font-size: 27px;
    letter-spacing: -0.045em;
  }

  &::after {
    content: "";
    display: block;
    width: 48px;
    height: 3px;
    margin-top: 16px;
    border-radius: 0;
    background: linear-gradient(90deg, var(--quiz-gold-deep), var(--quiz-gold));
  }
`;
const Lead = styled.p`
  max-width: 700px;
  margin: 0 0 18px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: clamp(15px, 2vw, 17px);
  line-height: 1.75;

  b { color: ${({ theme }) => theme.colors.text}; }
`;
const Card = styled.section`
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  padding: clamp(18px, 4vw, 28px);
  box-shadow: 0 18px 48px rgba(23, 32, 51, 0.09);

  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    background: linear-gradient(90deg, var(--quiz-gold-deep), var(--quiz-gold), ${({ theme }) => theme.colors.primary});
  }
`;
const QCard = styled.div`
  counter-increment: quiz-question;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  padding: clamp(16px, 3vw, 20px);
  margin: 14px 0;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 4px 16px rgba(23, 32, 51, 0.035);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(45, 106, 227, 0.11), 0 8px 22px rgba(23, 32, 51, 0.07);
  }
`;
const QuestionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 0 14px;
  font-size: clamp(16px, 2vw, 18px);
  line-height: 1.45;
  font-weight: 850;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text};

  &::before {
    content: counter(quiz-question);
    flex: 0 0 32px;
    width: 32px;
    height: 32px;
    display: inline-grid;
    place-items: center;
    border-radius: 0;
    background: linear-gradient(145deg, var(--quiz-navy), #2b3851);
    color: #f6e7b0;
    font-size: 14px;
    font-weight: 900;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
`;

/* ← 라디오 앞정렬(왼쪽 고정 22px) + 텍스트 상단 정렬 */
const Choice = styled.label`
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 10px;
  align-items: center;
  min-height: 48px;
  margin-top: 8px;
  padding: 11px 13px;
  border-radius: 0;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.45;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;

  &:hover {
    border-color: rgba(45, 106, 227, 0.38);
    background: rgba(45, 106, 227, 0.055);
    transform: translateY(-1px);
  }
  &.wrong {
    background: ${({ theme }) => theme.semantic?.alertErrorBg || "rgba(239,68,68,.08)"};
    border-color: rgba(239, 68, 68, 0.42);
    box-shadow: inset 3px 0 0 #ef4444;
  }
  &.correct {
    background: ${({ theme }) => theme.semantic?.alertSuccessBg || "rgba(16,185,129,.08)"};
    border-color: rgba(22, 163, 74, 0.42);
    box-shadow: inset 3px 0 0 #16a34a;
  }

  input[type="radio"]{
    margin: 0;
    inline-size: 19px;
    block-size: 19px;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
  /* 키보드 포커스 접근성 */
  input[type="radio"]:focus-visible + span{
    outline: 2px solid ${({ theme }) => theme.focus?.outline || theme.colors.primary};
    outline-offset: 4px;
    border-radius: 6px;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 560px) {
    & > * { flex: 1 1 100%; }
  }
`;
const Button = styled.button`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 18px;
  border: 1px solid transparent;
  border-radius: 0;
  font: inherit;
  font-weight: 850;
  letter-spacing: -0.01em;
  cursor: pointer;
  text-decoration: none;
  background: ${({ theme }) => theme.gradients?.primary || theme.colors.primary};
  color: ${({ theme }) => theme.on?.primary || "#fff"};
  box-shadow: 0 8px 18px rgba(45, 106, 227, 0.2);
  transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 11px 22px rgba(45, 106, 227, 0.25);
    filter: saturate(0.94);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focus?.outline || theme.colors.primary};
    outline-offset: 3px;
  }
  &:disabled {
    background: #aeb4bd;
    color: #fff;
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.72;
  }
`;
const Ghost = styled(Button)`
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.primary};
  border-color: ${({ theme }) => theme.colors.primary};
  box-shadow: none;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.semantic?.buttonAltBg || theme.colors.surface};
    box-shadow: 0 7px 16px rgba(23, 32, 51, 0.08);
  }
`;
const Help = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 9px 0 0;
  line-height: 1.7;
`;
const Banner = styled.div`
  display: grid;
  gap: 7px;
  padding: 17px 18px;
  border-radius: 0;
  margin: 18px 0 22px;
  background: linear-gradient(135deg, rgba(198, 163, 75, 0.16), rgba(45, 106, 227, 0.07));
  border: 1px solid rgba(198, 163, 75, 0.48);
  box-shadow: inset 4px 0 0 var(--quiz-gold);
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.6;

  &::before {
    content: "참여 혜택";
    color: var(--quiz-gold-deep);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.08em;
  }
`;
const ProgressWrap = styled.div`
  height: 9px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  overflow: hidden;
  margin: 2px 0 22px;
  box-shadow: inset 0 1px 2px rgba(23, 32, 51, 0.08);
`;
const ProgressBar = styled.div`
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--quiz-gold-deep), var(--quiz-gold), ${({ theme }) => theme.colors.primary});
  width: ${({ $w }) => $w}%;
  transition: width 300ms ease;
`;
const ErrorText = styled.p`
  margin: 16px 0 0;
  padding: 11px 13px;
  border-radius: 0;
  color: ${({ theme }) => theme.semantic?.alertErrorText || theme.colors.error};
  background: ${({ theme }) => theme.semantic?.alertErrorBg || "rgba(239,68,68,.08)"};
  font-weight: 750;
  line-height: 1.55;
`;
const Success = styled.p`
  display: inline-flex;
  align-items: center;
  margin: 0;
  padding: 6px 10px;
  border-radius: 999px;
  color: ${({ theme }) => theme.semantic?.alertSuccessText || theme.colors.success};
  background: ${({ theme }) => theme.semantic?.alertSuccessBg || "rgba(16,185,129,.08)"};
  font-weight: 850;
`;

const HintBox = styled.div`
  margin: 10px 0 0;
  padding: 11px 13px;
  border-radius: 0;
  font-size: 0.94rem;
  line-height: 1.55;

  &.wrong {
    background: ${({ theme }) => theme.semantic?.alertErrorBg || "rgba(239,68,68,.08)"};
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: ${({ theme }) => theme.semantic?.alertErrorText || "#b91c1c"};
  }
  &.correct {
    background: ${({ theme }) => theme.semantic?.alertSuccessBg || "rgba(16,185,129,.08)"};
    border: 1px solid rgba(22, 163, 74, 0.35);
    color: ${({ theme }) => theme.semantic?.alertSuccessText || "#047857"};
  }

  @media (prefers-reduced-motion: reduce) {
    &, * { transition: none !important; }
  }
`;

/* ============================
   Quiz Data
   ============================ */
const PASS_KEY = "quiz_gold_bonus_passed";
const PASS_SCORE_KEY = "quiz_gold_bonus_score";
const PASS_ANSWERS_KEY = "quiz_gold_bonus_answers";

const QUIZ = [
  { id: "q1", q: "1돈(g) 단위는 몇 g일까요?", choices: ["3.75g", "5g", "10g", "37.5g"], answer: 0 },
  { id: "q2", q: "999.9 골드바의 의미로 맞는 것은?", choices: ["순도 99.99%", "무게 99.99g", "가격 할인 9.999%", "세공 수수료 포함"], answer: 0 },
  { id: "q3", q: "14K 금의 대략적 순도(%)는?", choices: ["41.7%", "58.5%", "75.0%", "99.9%"], answer: 1 },
  {
    id: "q4",
    q: "한국골드마켓에서 금 교환을 신청하기 전에 확인할 수 있는 것은 무엇일까요?",
    choices: [
      "교환 가능한 금의 양과 제작 공임",
      "미래의 금 시세",
      "대출 가능 금액",
      "보석의 감정 등급"
    ],
    answer: 0
  },
  { id: "q5", q: "교환 수수료는 어떻게 되나요?", choices: ["수수료 없음, 제작 공임만", "수수료 5% 고정", "부가세만 부과", "수수료+공임 모두 부과"], answer: 0 },
];

const EXPLAINS = {
  q1: {
    hint: "힌트: 전통 단위에서 1냥=37.5g, 1돈은 1냥의 1/10이에요.",
    correct: "정답: 1돈은 3.75g입니다. (1냥 37.5g의 1/10)"
  },
  q2: {
    hint: "힌트: 999.9는 숫자 그대로 '순도'를 뜻해요.",
    correct: "정답: 999.9는 순도 99.99%를 의미합니다."
  },
  q3: {
    hint: "힌트: K 수치는 24분율 기준이에요. 14K는 14/24 ≈ ?",
    correct: "정답: 14K ≈ 58.5%입니다. (14/24×100)"
  },
  q4: {
    hint: "힌트: 한국골드마켓에서는 교환 신청 전에 받을 수 있는 금의 양과 부담할 비용을 미리 확인할 수 있어요.",
    correct: "정답: 한국골드마켓에서는 금 교환 전에 교환 가능한 금의 양과 골드바 제작 공임을 확인할 수 있습니다."
  },
  q5: {
    hint: "힌트: 우리 서비스는 ‘교환 수수료’ 대신 무엇만 받을까요?",
    correct: "정답: 교환 수수료 없음, 골드바 제작 공임만 부담합니다."
  }
};

const PASS_THRESHOLD = QUIZ.length; // 5문항 전부 정답
const formatBonusG = (value) => Number(value || 0).toFixed(2);

/* ============================
   Component
   ============================ */
export default function QuizGoldBonus() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const loc = useLocation();

  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { ok, alreadyClaimed?, creditedG?, needSignup?, failedDueToScore?, score? }

  // 로그인 사용자는 먼저 수령 상태를 확인하고, 로그인/가입 복귀 건만 자동 적립합니다.
  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setStatusLoading(false);
      return () => { cancelled = true; };
    }

    const passedFlag = sessionStorage.getItem(PASS_KEY) === "1";
    let storedAnswers = null;
    try {
      storedAnswers = JSON.parse(sessionStorage.getItem(PASS_ANSWERS_KEY) || "null");
    } catch {
      storedAnswers = null;
    }
    const hasAllAnswers = QUIZ.every((question) =>
      Number.isInteger(Number(storedAnswers?.[question.id]))
    );

    (async () => {
      setStatusLoading(true);
      try {
        if (passedFlag && hasAllAnswers) {
          const res = await claimGoldQuizBonus({ answers: storedAnswers });
          if (!cancelled) setResult(res);
          sessionStorage.removeItem(PASS_KEY);
          sessionStorage.removeItem(PASS_SCORE_KEY);
          sessionStorage.removeItem(PASS_ANSWERS_KEY);
        } else {
          if (passedFlag) {
            sessionStorage.removeItem(PASS_KEY);
            sessionStorage.removeItem(PASS_SCORE_KEY);
            sessionStorage.removeItem(PASS_ANSWERS_KEY);
          }
          const status = await getGoldQuizBonusStatus(user.uid);
          if (!cancelled && status?.claimed) {
            setResult({ ...status, ok: true, alreadyClaimed: true });
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError((e && typeof e === "object" && "message" in e) ? e.message : "보너스 상태 확인 중 오류가 발생했습니다.");
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.uid]);

  const total = QUIZ.length;
  const doneCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = Math.round((doneCount / total) * 100);

  const onChoice = (qid, idx) => {
    setAnswers((p) => ({ ...p, [qid]: idx }));
    const q = QUIZ.find((x) => x.id === qid);
    if (!q) return;
    setFeedback((f) => ({ ...f, [qid]: idx === q.answer ? "correct" : "wrong" }));
  };

  const resetQuiz = () => {
    setAnswers({});
    setFeedback({});
    setError("");
    setResult(null);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError("");

    if (doneCount < total) {
      setError("모든 문항을 선택해 주세요. (오답이면 힌트를 참고해 정답으로 바꿀 수 있어요!)");
      return;
    }

    setSubmitting(true);
    try {
      const score = QUIZ.reduce((s, q) => s + (answers[q.id] === q.answer ? 1 : 0), 0);
      const passed = score === PASS_THRESHOLD;

      if (window?.gtag) window.gtag("event", "quiz_gold_bonus_submit", { score, passed });

      if (!passed) {
        setResult({ ok: false, failedDueToScore: true, score });
        return;
      }

      if (user) {
        const res = await claimGoldQuizBonus({ answers });
        setResult(res);
      } else {
        sessionStorage.setItem(PASS_KEY, "1");
        sessionStorage.setItem(PASS_SCORE_KEY, String(score));
        sessionStorage.setItem(PASS_ANSWERS_KEY, JSON.stringify(answers));
        setResult({ ok: true, needSignup: true, score });
      }
    } catch (e) {
      const msg = (e && typeof e === "object" && "message" in e) ? e.message : "제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      setError(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <Kicker>GOLD KNOWLEDGE QUICK QUIZ</Kicker>
      <Title>금 퀵퀴즈 — 0.01g 보너스</Title>
      <Lead>
        퀵퀴즈 <b>{total}문항</b>을 <b>모두 정답</b>하면 <b>순금 0.01g</b>를 적립해 드립니다. (1인 1회, 운영 정책 위반 시 취소될 수 있습니다.)
      </Lead>
      <Banner>
          <div><b>혜택:</b> 적립된 순금 0.01g은 골드바 교환 시 사용할 수 있습니다.</div>
        
      </Banner>

      {statusLoading && (
        <Card>
          <Help aria-live="polite">퀵퀴즈 보너스 수령 여부를 확인하고 있습니다…</Help>
        </Card>
      )}

      {!statusLoading && !result?.alreadyClaimed && <Card>
        <ProgressWrap aria-label={`진행률 ${progress}%`}><ProgressBar $w={progress} /></ProgressWrap>

        {QUIZ.map((q) => {
          const selected = answers[q.id];
          const state = selected == null ? "idle" : (selected === q.answer ? "correct" : "wrong");

          return (
            <QCard key={q.id}>
              <QuestionTitle>{q.q}</QuestionTitle>
              {q.choices.map((c, idx) => (
                <Choice
                  key={`${q.id}-${idx}`}
                  className={selected === idx ? state : "idle"}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={selected === idx}
                    onChange={() => onChoice(q.id, idx)}
                    aria-invalid={state === "wrong" && selected === idx}
                  />
                  <span>{c}</span>
                </Choice>
              ))}

              {/* 즉시 피드백 */}
              {feedback[q.id] === "wrong" && (
                <HintBox className="wrong">아쉽어요. {EXPLAINS[q.id].hint} <b>정답을 다시 선택해 보세요!</b></HintBox>
              )}
              {feedback[q.id] === "correct" && (
                <HintBox className="correct">정답! {EXPLAINS[q.id].correct}</HintBox>
              )}
            </QCard>
          );
        })}

        {error && <ErrorText role="alert">{error}</ErrorText>}

        <Row style={{ marginTop: 10 }}>
          <Button onClick={handleSubmit} disabled={submitting}>퀴즈 제출하고 0.01g 받기</Button>
          <Ghost onClick={() => navigate("/gold-exchange")}>교환 계산기로 가기</Ghost>
          {(result?.failedDueToScore || doneCount === total) && <Ghost onClick={resetQuiz}>다시 풀기</Ghost>}
        </Row>
      </Card>}

      {result && (
        <Card style={{ marginTop: 12 }}>
          {result.failedDueToScore ? (
            <>
              <h3 style={{ margin: 0 }}>아직이에요! 😥</h3>
              <Help>점수: <b>{result.score}/{total}</b>. 모든 문항이 <b>정답</b>이어야 통과해요. 힌트를 참고해 수정한 뒤 다시 제출해 보세요!</Help>
              <Row style={{ marginTop: 10 }}>
                <Button onClick={() => setResult(null)}>문항 수정하기</Button>
                <Ghost as={Link} to="/">홈으로</Ghost>
              </Row>
            </>
          ) : ("needSignup" in result && result.needSignup) ? (
            <>
              <Success>축하해요! 전 문항 정답입니다 🎉</Success>
              <Help>지금 <b>회원가입</b>하면 0.01g를 즉시 적립해 드립니다.</Help>
              <Row style={{ marginTop: 10 }}>
                <Button as={Link} to={`/register?next=${encodeURIComponent(loc.pathname + loc.search)}`}>
                  회원가입하고 순금 0.01g 받기
                </Button>
                <Ghost as={Link} to="/">나중에 할게요</Ghost>
              </Row>
            </>
          ) : result.alreadyClaimed ? (
            <>
              <h3 style={{ margin: 0 }}>이미 보너스를 받으셨습니다</h3>
              <Help>
                이 이벤트는 계정당 1회만 참여할 수 있어요.
                지급된 보너스는 <b>{formatBonusG(result.creditedG)}g</b>, 현재 보너스 잔액은 <b>{formatBonusG(result.balanceG ?? result.creditedG)}g</b>입니다.
              </Help>
            </>
          ) : result.ok ? (
            <>
              <h3 style={{ margin: 0 }}>적립 완료!</h3>
              <Help>
                <b>{formatBonusG(result.creditedG || 0.01)}g</b>가 적립되었습니다.
                현재 보너스 잔액은 <b>{formatBonusG(result.balanceG ?? result.creditedG ?? 0.01)}g</b>입니다.
              </Help>
            </>
          ) : (
            <>
              <h3 style={{ margin: 0 }}>처리 실패</h3>
              <Help>잠시 후 다시 시도해 주세요.</Help>
            </>
          )}
        </Card>
      )}
    </Page>
  );
}