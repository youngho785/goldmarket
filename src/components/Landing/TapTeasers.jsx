// src/components/landing/TapTeasers.jsx
import React from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";

/* ============================
   Styled
   ============================ */
const Section = styled.section`
  width: 100%;
  max-width: 980px;
  margin: 16px auto 0;
  padding: 0 16px 12px;
`;

const Title = styled.h2`
  margin: 0 0 10px;
  font-size: clamp(20px, 4.6vw, 26px);
  font-weight: 900;
  color: ${({ theme }) => theme.colors.text};
  text-align: center;
`;

const Subtitle = styled.p`
  margin: 6px 0 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Card = styled.button`
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  align-items: start;
  gap: 10px;
  width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 14px;
  text-align: left;
  padding: 14px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
  transition: transform .12s ease, filter .15s ease;
  &:hover { transform: translateY(-2px); filter: brightness(1.02); }
`;

const Eyebrow = styled.span`
  font-size: .82rem;
  font-weight: 900;
  letter-spacing: .2px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Headline = styled.span`
  font-size: clamp(16px, 3.6vw, 18px);
  font-weight: 900;
  color: ${({ theme }) => theme.colors.text};
`;

const Preview = styled.div`
  position: relative;
  display: grid; gap: 8px;
  min-height: 120px;
  border-radius: 12px;
  background:
    radial-gradient(60% 80% at 20% 20%, rgba(234,160,70,.10), transparent),
    radial-gradient(60% 80% at 80% 80%, rgba(0,168,232,.10), transparent),
    ${({ theme }) => theme.colors.background};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

const CTA = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px;
`;

const CtaText = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 900;
`;

const Pill = styled.span`
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 9999px; padding: 6px 10px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: .9rem; font-weight: 800;
`;

/* Fake mini previews */
const MiniRow = styled.div`
  display: flex; gap: 8px; align-items: center; padding: 10px;
`;
const Bar = styled.div`
  height: 12px; border-radius: 6px; flex: 1; opacity: .9;
  background: linear-gradient(135deg, #F1D27A, #C9932F);
`;

/* ============================
   Component
   ============================ */
export default function TapTeasers() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // requireAuth: true면 미로그인 시 회원가입으로 유도, false면 바로 이동
  const go = (next, src, requireAuth = true) => {
    if (window?.gtag) window.gtag("event", "tap_teaser_click", { src });
    if (requireAuth && !user) {
      navigate(`/register?next=${encodeURIComponent(next)}&src=${encodeURIComponent(src)}`);
    } else {
      navigate(next);
    }
  };

  return (
    <Section aria-labelledby="teaser-title">
      {/* 방문자 중심 문구 */}
      <Title id="teaser-title">지금 바로 해보세요</Title>
      <Subtitle>내 금을 골드바로 바꾸기 전에 가볍게 체험해 보세요.</Subtitle>

      <Grid>
                {/* ✅ 2) 이벤트: 퀵퀴즈 0.01g 보너스 — 공개 참여 (경로 수정) */}
        <Card
          onClick={() => go("/quiz/gold-bonus", "teaser-quiz-bonus", false)}
          aria-label="금 퀵퀴즈 풀고 0.01g 받기(바로 시작)"
        >
          <Eyebrow>이벤트</Eyebrow>
          <Headline>퀵퀴즈 풀고 <b>0.01g</b> 받기</Headline>
          <Preview>
            <MiniRow>
              <Pill>5문항</Pill>
              <Pill>30초</Pill>
              <Pill>AI 해설</Pill>
            </MiniRow>
            <MiniRow>
              <div style={{ height: 36, background: "#e5e7eb", borderRadius: 8, flex: 1 }} />
            </MiniRow>
          </Preview>
          <CTA>
            <CtaText>퀵퀴즈 시작 →</CtaText>
            <Pill>보너스 0.01g</Pill>
          </CTA>
        </Card>

        {/* ✅ 1) 오늘 내가 받을 골드바 조합 — 로그인 없이 바로 /gold-exchange */}
        <Card
          onClick={() => go("/gold-exchange", "teaser-combo", false)}
          aria-label="오늘 내 골드바 조합 미리보기"
        >
          <Eyebrow>교환 미리보기</Eyebrow>
          <Headline>오늘 교환하면 받는 <b>골드바 조합</b></Headline>
          <Preview>
            <MiniRow>
              <Pill>예상 순금: 37.5g</Pill>
              <Pill>잔여: 0.8g</Pill>
            </MiniRow>
            <MiniRow>
              <Bar style={{ width: "40%" }} /><Bar style={{ width: "20%" }} /><Bar style={{ width: "10%" }} />
            </MiniRow>
          </Preview>
          <CTA>
            <CtaText>내 조합 보기 →</CtaText>
            <Pill>바로 체험</Pill>
          </CTA>
        </Card>

      </Grid>
    </Section>
  );
}
