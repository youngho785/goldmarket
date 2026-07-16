// src/pages/QuizGoldBonus.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { claimGoldQuizBonus } from "@/services/quizClient";

/* ============================
   UI
   ============================ */
const Page = styled.main`
  max-width: 820px; margin: 0 auto; padding: 24px 16px 40px;
`;
const Title = styled.h1`
  margin: 0 0 10px; font-size: clamp(22px, 5vw, 28px); font-weight: 900; color: ${({theme})=>theme.colors.text};
`;
const Lead = styled.p`
  margin: 0 0 12px; color: ${({theme})=>theme.colors.textSecondary};
`;
const Card = styled.section`
  background: ${({theme})=>theme.colors.surface}; border: 1px solid ${({theme})=>theme.colors.border};
  border-radius: 12px; padding: 16px; box-shadow: 0 8px 24px rgba(0,0,0,.06);
`;
const QCard = styled.div`
  border: 1px solid ${({theme})=>theme.colors.border}; border-radius: 12px; padding: 14px; margin: 10px 0;
`;
const QuestionTitle = styled.h3`
  margin: 0 0 8px; font-size: 1rem; font-weight: 900; color: ${({theme})=>theme.colors.text};
`;

/* ← 라디오 앞정렬(왼쪽 고정 22px) + 텍스트 상단 정렬 */
const Choice = styled.label`
  display: grid;
  grid-template-columns: 22px 1fr;
  gap: 8px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  line-height: 1.35;

  &:hover { background: rgba(59,130,246,.06); }
  &.wrong   { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.35); }
  &.correct { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.35); }

  input[type="radio"]{
    margin: 2px 0 0; /* 광학적 상단 정렬 */
    inline-size: 18px;
    block-size: 18px;
  }
  /* 키보드 포커스 접근성 */
  input[type="radio"]:focus-visible + span{
    outline: 2px solid rgba(59,130,246,.5);
    outline-offset: 2px;
    border-radius: 6px;
  }
`;

const Row = styled.div` display: flex; gap: 8px; align-items: center; flex-wrap: wrap; `;
const Button = styled.button`
  padding: 12px 14px; border: none; border-radius: 12px; font-weight: 900; cursor: pointer;
  background: ${({theme})=>theme.colors.primary}; color: ${({theme})=>theme.colors.buttonText};
  &:disabled { background: #aeb4bd; cursor: not-allowed; }
`;
const Ghost = styled(Button)` background: transparent; color: ${({theme})=>theme.colors.primary}; border: 1.5px solid ${({theme})=>theme.colors.primary}; `;
const Help = styled.p` color: ${({theme})=>theme.colors.textSecondary}; margin: 8px 0 0; `;
const Banner = styled.div`
  display: grid; gap: 8px; padding: 12px; border-radius: 12px; margin: 12px 0;
  background: linear-gradient(135deg, rgba(212,175,55,.14), rgba(37,99,235,.12));
  border: 1px solid rgba(212,175,55,.45);
`;
const ProgressWrap = styled.div` height: 10px; background: #e5e7eb; border-radius: 9999px; overflow: hidden; margin: 12px 0; `;
const ProgressBar = styled.div` height: 100%; background: ${({theme})=>theme.colors.primary}; width: ${({$w})=>$w}%; `;
const ErrorText = styled.p` color: ${({theme})=>theme.colors.error}; font-weight: 800; `;
const Success = styled.p` color: ${({theme})=>theme.colors.success || "#10b981"}; font-weight: 800; `;

const HintBox = styled.div`
  margin: 8px 0 0; padding: 10px 12px; border-radius: 10px; font-size: .95rem;
  &.wrong   { background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.35); color: #ef4444; }
  &.correct { background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.35); color: #059669; }
`;

/* ============================
   Quiz Data
   ============================ */
const PASS_KEY = "quiz_gold_bonus_passed";
const PASS_SCORE_KEY = "quiz_gold_bonus_score";

const QUIZ = [
  { id: "q1", q: "1돈(g) 단위는 몇 g일까요?", choices: ["3.75g", "5g", "10g", "37.5g"], answer: 0 },
  { id: "q2", q: "999.9 골드바의 의미로 맞는 것은?", choices: ["순도 99.99%", "무게 99.99g", "가격 할인 9.999%", "세공 수수료 포함"], answer: 0 },
  { id: "q3", q: "14K 금의 대략적 순도(%)는?", choices: ["41.7%", "58.5%", "75.0%", "99.9%"], answer: 1 },
  { id: "q4", q: "금 교환 시 잔여 무게가 생기면, 우리 서비스에서 제공하는 것은?", choices: ["자동 조합 추천", "신용대출", "환전 수수료 면제", "택배 무료"], answer: 0 },
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
    hint: "힌트: 남는 무게(잔여)를 최소화하는 기능을 떠올려 보세요.",
    correct: "정답: 자동 조합 추천을 제공합니다."
  },
  q5: {
    hint: "힌트: 우리 서비스는 ‘교환 수수료’ 대신 무엇만 받을까요?",
    correct: "정답: 교환 수수료 없음, 골드바 제작 공임만 부담합니다."
  }
};

const PASS_THRESHOLD = QUIZ.length; // 5문항 전부 정답

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
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { ok, alreadyClaimed?, creditedG?, needSignup?, failedDueToScore?, score? }

  // 로그인 후 복귀 시: 세션 플래그 & 전문항 정답이면 자동 적립
  useEffect(() => {
    const passedFlag = sessionStorage.getItem(PASS_KEY) === "1";
    const storedScore = Number(sessionStorage.getItem(PASS_SCORE_KEY) || "0");
    const passedByScore = Number.isFinite(storedScore) && storedScore === PASS_THRESHOLD;

    if (user && passedFlag && passedByScore) {
      (async () => {
        try {
          const res = await claimGoldQuizBonus({ score: storedScore });
          setResult(res);
        } catch (e) {
          setError((e && typeof e === "object" && "message" in e) ? e.message : "보너스 적립 중 오류가 발생했습니다.");
        } finally {
          sessionStorage.removeItem(PASS_KEY);
          sessionStorage.removeItem(PASS_SCORE_KEY);
        }
      })();
    } else if (passedFlag && !passedByScore) {
      sessionStorage.removeItem(PASS_KEY);
      sessionStorage.removeItem(PASS_SCORE_KEY);
    }
  }, [user]);

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
        const res = await claimGoldQuizBonus({ score });
        setResult(res);
      } else {
        sessionStorage.setItem(PASS_KEY, "1");
        sessionStorage.setItem(PASS_SCORE_KEY, String(score));
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
      <Title>금 퀵퀴즈 — 0.01g 보너스</Title>
      <Lead>
        퀵퀴즈 <b>{total}문항</b>을 <b>모두 정답</b>하면 <b>순금 0.01g</b>를 적립해 드립니다. (1인 1회, 운영 정책 위반 시 취소될 수 있습니다.)
      </Lead>
      <Banner>
        <div><b>혜택:</b> 순금 0.01g은 교환시 사용 가능합니다.</div>
        
      </Banner>

      <Card>
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
      </Card>

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
                  회원가입하고 0.01g 받기
                </Button>
                <Ghost as={Link} to="/">나중에 할게요</Ghost>
              </Row>
            </>
          ) : result.alreadyClaimed ? (
            <>
              <h3 style={{ margin: 0 }}>이미 참여하셨습니다</h3>
              <Help>이 이벤트는 계정당 1회만 참여할 수 있어요.</Help>
            </>
          ) : result.ok ? (
            <>
              <h3 style={{ margin: 0 }}>적립 완료!</h3>
              <Help>0.01g가 적립되었습니다. 마이페이지에서 확인하실 수 있어요.</Help>
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
