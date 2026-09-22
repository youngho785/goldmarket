// src/pages/GuideIndex.jsx
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, BookOpen, Calculator, Scale } from "lucide-react";

import { GOLD_GUIDES } from "@/data/goldGuides";

const Page = styled.main`
  display: grid;
  gap: 20px;
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 18px 0 46px;
`;

const Hero = styled.header`
  display: grid;
  gap: 12px;
  padding: clamp(24px, 4.5vw, 44px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 24px;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.semantic.subtleTint},
    ${({ theme }) => theme.colors.surface}
  );

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .65rem;
    font-weight: 950;
    letter-spacing: .13em;
  }

  h1 {
    max-width: 780px;
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(2rem, 5vw, 3.4rem);
    line-height: 1.12;
    letter-spacing: -.05em;
    word-break: keep-all;
  }

  p {
    max-width: 780px;
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
    line-height: 1.7;
    word-break: keep-all;
  }
`;

const QuickLinks = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    padding: 8px 12px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.primary};
    font-size: .69rem;
    font-weight: 900;
    text-decoration: none;
  }
`;

const Intro = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const IntroCard = styled.div`
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface};

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  strong {
    display: block;
    margin-top: 8px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .86rem;
  }

  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .69rem;
    line-height: 1.55;
  }
`;

const SectionHead = styled.div`
  display: grid;
  gap: 5px;
  margin-top: 6px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.25rem, 3vw, 1.75rem);
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .74rem;
    line-height: 1.6;
  }
`;

const Grid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: clamp(18px, 3vw, 24px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  transition: transform ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors.secondary};
  }

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .61rem;
    font-weight: 950;
    letter-spacing: .09em;
  }

  h3 {
    margin: 6px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .95rem;
    line-height: 1.4;
    word-break: keep-all;
  }

  p {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .7rem;
    line-height: 1.6;
    word-break: keep-all;
  }

  > svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const Boundary = styled.aside`
  padding: 16px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background: ${({ theme }) => theme.semantic.badgeInfoBg};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .72rem;
  line-height: 1.65;

  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export default function GuideIndex() {
  return (
    <Page>
      <Hero>
        <small>KOREA GOLD MARKET · GOLD GUIDE</small>
        <h1>내가 가진 금을 이해하는 데 필요한 정보부터 정리했습니다.</h1>
        <p>
          금 1돈의 무게, 14K·18K 각인과 차이, 돌반지와 오래된 주얼리의
          가치 확인, 부산 금교환 방문 전 체크까지 실제로 자주 묻는 질문을
          기준으로 설명합니다.
        </p>
        <QuickLinks aria-label="금 정보와 계산 바로가기">
          <Link to="/gold-price">오늘 금시세 <ArrowRight size={13} aria-hidden /></Link>
          <Link to="/gold-value">금 가치 계산기 <ArrowRight size={13} aria-hidden /></Link>
          <Link to="/my-gold">MY GOLD <ArrowRight size={13} aria-hidden /></Link>
        </QuickLinks>
      </Hero>

      <Intro aria-label="가이드 이용 방법">
        <IntroCard>
          <Scale size={20} aria-hidden />
          <strong>무게와 순도부터</strong>
          <p>돈·g 단위와 14K·18K·순도 차이를 먼저 이해합니다.</p>
        </IntroCard>
        <IntroCard>
          <Calculator size={20} aria-hidden />
          <strong>오늘 가치로 연결</strong>
          <p>알고 있는 중량을 계산기에 넣어 현재 참고가치를 확인합니다.</p>
        </IntroCard>
        <IntroCard>
          <BookOpen size={20} aria-hidden />
          <strong>현재 계산 기준으로 확인</strong>
          <p>각인 정보와 실제 GOLD TO GOLD 계산 기준을 구분하고, 예상값은 현재 계산기에서 확인합니다.</p>
        </IntroCard>
      </Intro>

      <SectionHead>
        <h2>금 정보 가이드</h2>
        <p>궁금한 질문부터 읽고 관련 계산기와 MY GOLD로 이어서 확인해 보세요.</p>
      </SectionHead>

      <Grid>
        {GOLD_GUIDES.map((guide) => (
          <Card key={guide.slug} to={`/guide/${guide.slug}`}>
            <div>
              <small>{guide.category}</small>
              <h3>{guide.title}</h3>
              <p>{guide.summary}</p>
            </div>
            <ArrowRight size={18} aria-hidden />
          </Card>
        ))}
      </Grid>

      <Boundary>
        <strong>가이드와 실제 교환 계산은 역할을 나눕니다.</strong>{" "}
        가이드는 무게·각인·제품 상태처럼 오래 유지되는 정보를 설명합니다.
        한국골드마켓의 고정 환산율은 가이드에 표시하지 않으며, 현재 예상값은
        계산기에서 확인하고 최종값은 매장 실측 후 확정합니다.
      </Boundary>
    </Page>
  );
}