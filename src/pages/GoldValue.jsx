import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import QuickGoldValueCalculator from "@/components/gold/QuickGoldValueCalculator";
import GuideLinks from "@/components/guide/GuideLinks";

const Page = styled.div`
  display: grid;
  gap: 18px;
  max-width: 840px;
  margin: 0 auto;
  padding: 18px 0 42px;
`;

const Hero = styled.header`
  padding: clamp(22px, 4vw, 34px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .64rem;
    font-weight: 950;
    letter-spacing: .12em;
  }

  h1 {
    margin: 8px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.8rem, 4.5vw, 3rem);
    line-height: 1.08;
    letter-spacing: -.05em;
  }

  p {
    margin: 11px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .78rem;
    line-height: 1.65;
  }
`;

const Guide = styled.section`
  display: grid;
  gap: 10px;
  padding: clamp(18px, 3vw, 24px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .72rem;
    line-height: 1.6;
  }
`;

const Links = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 38px;
    padding: 8px 11px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 999px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .68rem;
    font-weight: 900;
    text-decoration: none;
  }
`;

export default function GoldValue() {
  return (
    <Page>
      <Hero>
        <small>GOLD VALUE CALCULATOR</small>
        <h1>내 금, 지금 얼마일까요?</h1>
        <p>
          종류와 무게를 알려주시면 공개 시세로 예상 가치를 계산해 드려요.
        </p>
      </Hero>

      <QuickGoldValueCalculator
        source="gold-value"
        eyebrow="금 중량별 가치 계산"
        title="금 종류와 무게를 알려주세요"
        description="14K·18K·순금의 종류와 중량을 입력해 오늘 참고가치와 예상 순금량을 바로 확인하세요."
      />

      <Guide>
        <h2>다시 보고 싶다면 기록해 두세요</h2>
        <p>
          MY GOLD에 남겨두면 다음에는 다시 입력하지 않고 내 금의 가치를 확인할 수 있어요. 실물 금은 직접 보관하는 개인 기록이에요.
        </p>
        <Links>
          <Link to="/gold-price">오늘 금시세 <ArrowRight size={13} aria-hidden /></Link>
          <Link to="/my-gold">MY GOLD <ArrowRight size={13} aria-hidden /></Link>
          <Link to="/gold-exchange">GOLD TO GOLD <ArrowRight size={13} aria-hidden /></Link>
        </Links>
      </Guide>

      <GuideLinks
        title="계산 전에 함께 보기"
        slugs={["gold-don-gram", "18k-one-don", "14k-one-don"]}
      />
    </Page>
  );
}
