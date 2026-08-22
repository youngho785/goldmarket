//src/pages/LandingPage.jsx
import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPin,
  Phone,
  ReceiptText,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import LiteCalcFromGX from "@/components/LiteCalcFromGX";
import GoldExchangeReviewList from "@/components/reviews/GoldExchangeReviewList";
import GoldPriceBoard from "@/components/gold/GoldPriceBoard";
import goldVerificationImage from "@/assets/goldVerificationImage";

const Page = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
`;

const Section = styled.section`
  padding: clamp(46px, 5.5vw, 68px) 0;

  @media (max-width: 540px) {
    padding: 36px 0;
  }
`;

const Kicker = styled.p`
  margin: 0 0 9px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .68rem;
  font-weight: 850;
  letter-spacing: .15em;
`;

const SectionTitle = styled.h2`
  max-width: 780px;
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.7rem, 3.1vw, 2.65rem);
  line-height: 1.24;
  letter-spacing: -.025em;
  word-break: keep-all;
`;

const SectionLead = styled.p`
  max-width: 720px;
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .95rem;
  line-height: 1.72;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 850;
  }
`;

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 13px 22px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 850;

  &:hover {
    color: ${({ theme }) => theme.colors.white};
    background: ${({ theme }) => theme.colors.primaryDark};
  }

  @media (max-width: 540px) {
    width: 100%;
  }
`;

const TextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .84rem;
  font-weight: 850;
  text-decoration: underline;
  text-underline-offset: 4px;
`;

const GoldToGoldText = styled.span`
  display: inline-block;
  background: ${({ theme }) => theme.gradients.goldShimmer};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  font-weight: 900;
`;

const GoldToGoldHero = styled(GoldToGoldText)`
  letter-spacing: .02em;
  background-size: 240% 100%;
  background-position: 100% 50%;
  text-shadow: 0 0 18px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent);
  animation: goldSweep 2.8s ease-out 1 forwards;

  @keyframes goldSweep {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-position: 50% 50%;
  }
`;


/* ───────────────────────── HERO ───────────────────────── */

const Hero = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(360px, .92fr);
  align-items: center;
  gap: clamp(28px, 4.5vw, 58px);
  min-height: 555px;
  padding: clamp(42px, 5.5vw, 68px) 0 clamp(38px, 5vw, 60px);

  &::before {
    content: "";
    position: absolute;
    top: 40px;
    bottom: 40px;
    left: 0;
    width: 1px;
    background: ${({ theme }) => theme.colors.secondary};
  }

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 40px 22px 46px;
  }

  @media (max-width: 540px) {
    gap: 24px;
    padding: 30px 14px 34px;
  }
`;

const HeroCopy = styled.div`
  max-width: 760px;
  padding-left: clamp(24px, 3.4vw, 46px);

  @media (max-width: 980px) {
    padding-left: 18px;
  }

  @media (max-width: 540px) {
    padding-left: 10px;
  }
`;

const HeroQuestion = styled.p`
  margin: 0 0 14px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .88rem;
  font-weight: 850;
  letter-spacing: -.01em;
  word-break: keep-all;
`;

const HeroTitle = styled.h1`
  max-width: 760px;
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(2.35rem, 4.9vw, 4.35rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -.045em;
  word-break: keep-all;

  span {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  @media (max-width: 540px) {
    font-size: clamp(2rem, 10.5vw, 2.75rem);
  }
`;

const HeroLead = styled.p`
  max-width: 640px;
  margin: 20px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: clamp(.96rem, 1.4vw, 1.06rem);
  line-height: 1.72;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 850;
  }
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  margin-top: 24px;

  @media (max-width: 540px) {
    display: grid;
    grid-template-columns: 1fr;
  }
`;

const HeroMicro = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 18px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .79rem;
  font-weight: 750;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  @media (max-width: 540px) {
    display: grid;
  }
`;

const HeroProof = styled.aside`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const HeroProofTop = styled.div`
  padding: 24px 26px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};

  small {
    display: block;
    margin-bottom: 8px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .64rem;
    font-weight: 850;
    letter-spacing: .13em;
  }

  strong {
    display: block;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.35rem, 2.6vw, 1.8rem);
    line-height: 1.3;
  }
`;

const HeroProofBody = styled.div`
  display: grid;
  gap: 0;
`;

const ProofRow = styled.div`
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  padding: 19px 22px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    border-top: 0;
  }

  span:first-child {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 1px solid ${({ theme }) => theme.colors.secondary};
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .68rem;
    font-weight: 850;
  }

  strong {
    display: block;
    margin-bottom: 4px;
    color: ${({ theme }) => theme.colors.primary};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    line-height: 1.5;
  }
`;

/* ───────────────────── CORE COMPARISON ───────────────────── */

const CompareSection = styled(Section)`
  padding-top: clamp(52px, 6.5vw, 80px);
`;

const CompareGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 86px minmax(0, 1fr);
  align-items: stretch;
  margin-top: 26px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const CompareCard = styled.article`
  padding: clamp(24px, 3.2vw, 36px);

  small {
    display: block;
    margin-bottom: 10px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .66rem;
    font-weight: 850;
    letter-spacing: .12em;
  }

  h3 {
    margin: 0 0 18px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.3rem, 2.4vw, 1.75rem);
    line-height: 1.34;
  }
`;

const Flow = styled.div`
  display: grid;
  gap: 9px;
`;

const FlowItem = styled.div`
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 11px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.primary};
  font-size: .88rem;
  font-weight: 800;
`;

const CompareNote = styled.p`
  margin: 18px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .88rem;
  line-height: 1.62;

  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const CompareArrow = styled.div`
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};

  span {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid ${({ theme }) => theme.colors.secondary};
    border-radius: 50%;
  }

  @media (max-width: 760px) {
    min-height: 58px;

    svg {
      transform: rotate(90deg);
    }
  }
`;

const FeeBar = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 18px;
  margin-top: 16px;
  padding: 18px 22px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .88rem;
    line-height: 1.6;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

/* ───────────────────── SELF-RELEVANCE ───────────────────── */

const DrawerSection = styled(Section)`
  text-align: center;

  ${SectionTitle},
  ${SectionLead} {
    margin-left: auto;
    margin-right: auto;
  }
`;

const GoldTypes = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 28px auto 0;
  max-width: 880px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const GoldType = styled.div`
  padding: 24px 20px;
  border-left: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    border-left: 0;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.05rem;
  }

  span {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
  }

  @media (max-width: 680px) {
    border-left: 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border};

    &:first-child {
      border-top: 0;
    }
  }
`;

const MergeLine = styled.div`
  display: grid;
  place-items: center;
  min-height: 82px;
  color: ${({ theme }) => theme.colors.secondaryDark};
`;

const MergeResult = styled.div`
  max-width: 880px;
  margin: 0 auto;
  padding: 26px 24px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};

  small {
    display: block;
    margin-bottom: 7px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .65rem;
    font-weight: 850;
    letter-spacing: .13em;
  }

  strong {
    display: block;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.4rem, 3vw, 2rem);
    line-height: 1.35;
  }
`;

/* ───────────────────── CALCULATOR ───────────────────── */

const CalculatorSection = styled(Section)`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CalculatorHead = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    align-items: start;
  }
`;

const CalculatorWrap = styled.div`
  position: relative;
  z-index: 1;
`;

/* ───────────────────── TRUST / PROCESS ───────────────────── */

const TrustGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const TrustCard = styled.article`
  padding: 24px;
  border-left: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    border-left: 0;
  }

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  h3 {
    margin: 13px 0 7px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.13rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .87rem;
    line-height: 1.58;
  }

  @media (max-width: 760px) {
    border-left: 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border};

    &:first-child {
      border-top: 0;
    }
  }
`;

const ProcessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const ProcessCard = styled.article`
  padding: 25px;
  border-left: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    border-left: 0;
  }

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .65rem;
    font-weight: 850;
    letter-spacing: .12em;
  }

  h3 {
    margin: 14px 0 7px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.34rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .86rem;
    line-height: 1.56;
  }

  @media (max-width: 760px) {
    border-left: 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border};

    &:first-child {
      border-top: 0;
    }
  }
`;

/* ───────────────────── REAL STORE ───────────────────── */

const Verification = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(340px, .95fr);
  margin: clamp(48px, 6vw, 72px) 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const VerificationImage = styled.div`
  min-height: 390px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 540px) {
    min-height: 235px;
  }
`;

const VerificationCopy = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(28px, 4vw, 44px);
`;

const StoreMeta = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .86rem;

  span,
  a {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

/* ───────────────────── REVIEWS / QUIZ / FAQ ───────────────────── */

const SimpleHead = styled.div`
  margin-bottom: 22px;
`;

const QuizBanner = styled.section`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 26px;
  margin: 22px 0 clamp(52px, 6vw, 76px);
  padding: clamp(26px, 4vw, 40px);
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};

  small {
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .67rem;
    font-weight: 850;
    letter-spacing: .13em;
  }

  h2 {
    margin: 7px 0 8px;
    color: ${({ theme }) => theme.colors.white};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.goldLight};
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const QuizLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 50px;
  padding: 12px 19px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 850;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.white};
    filter: brightness(1.08);
  }
`;

const FAQGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 28px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const FAQ = styled.details`
  padding: 18px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  summary {
    cursor: pointer;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
  }

  p {
    margin: 12px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.7;
  }
`;

/* ───────────────────── FINAL CTA ───────────────────── */

const FinalCTA = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 28px;
  margin: 0 0 68px;
  padding: clamp(30px, 5vw, 50px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 118px;
    height: 3px;
    background: ${({ theme }) => theme.colors.secondary};
  }

  h2 {
    margin: 0 0 8px;
    color: ${({ theme }) => theme.colors.primary};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "한국골드마켓 GOLD TO GOLD 999.9 골드바 교환",
  description:
    "GOLD TO GOLD는 14K, 18K, 순금 등 보유한 금을 먼저 현금으로 팔지 않고 순도와 중량 기준의 순금 가치로 계산해 999.9 골드바로 교환하는 한국골드마켓의 방식",
  provider: {
    "@type": "JewelryStore",
    name: "원일귀금속",
    telephone: "051-646-9700",
    address: {
      "@type": "PostalAddress",
      streetAddress: "골드테마길 21",
      addressLocality: "부산진구",
      addressRegion: "부산광역시",
      addressCountry: "KR",
    },
    openingHours: "Mo-Sa 10:00-18:00",
  },
  areaServed: "대한민국",
};

export default function LandingPage() {
  const scrollToCompare = (event) => {
    event.preventDefault();
    const target = document.getElementById("why-gold-to-gold");
    if (!target) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <Page>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* 01. 문제 인식 */}
      <Hero aria-labelledby="landing-title">
        <HeroCopy>
          <HeroQuestion>
            한국골드마켓이 제안하는 <GoldToGoldHero>GOLD TO GOLD</GoldToGoldHero>
          </HeroQuestion>

          <HeroTitle id="landing-title">
            금, 팔았다
            <br />
            <span>다시 사지 마세요.</span>
            <br />
            999.9 골드바로 바꾸세요
          </HeroTitle>

          <HeroLead>
            <GoldToGoldText>GOLD TO GOLD</GoldToGoldText>는 14K·18K·순금 등 가지고 있는 금을
            먼저 현금으로 팔지 않고, 순도와 중량 기준의 순금 가치로 계산해
            <strong> 999.9 골드바로 교환하는 한국골드마켓의 방식</strong>입니다.
          </HeroLead>

          <HeroActions>
            <PrimaryLink to="/gold-exchange">
              내 금으로 받을 골드바 계산
              <ArrowRight size={18} aria-hidden />
            </PrimaryLink>

            <TextLink as="a" href="#why-gold-to-gold" onClick={scrollToCompare}>
              왜 교환해야 하는지 보기
            </TextLink>
          </HeroActions>

          <HeroMicro>
            <li><CheckCircle2 size={15} aria-hidden /> 로그인 없이 예상 계산</li>
            <li><CheckCircle2 size={15} aria-hidden /> 교환 수수료 없음</li>
            <li><CheckCircle2 size={15} aria-hidden /> 제작 공임 사전 확인</li>
          </HeroMicro>
        </HeroCopy>

        <HeroProof aria-label="한국골드마켓 금교환 핵심">
          <HeroProofTop>
            <small>
              KOREA GOLD MARKET · <GoldToGoldText>GOLD TO GOLD</GoldToGoldText>
            </small>
            <strong>금에서 금으로,<br />가치를 이어가는 방식</strong>
          </HeroProofTop>
          <HeroProofBody>
            <ProofRow>
              <span>01</span>
              <div>
                <strong>14K · 18K · 순금</strong>
                <p>종류가 달라도 각각의 순금 함량으로 계산합니다.</p>
              </div>
            </ProofRow>
            <ProofRow>
              <span>02</span>
              <div>
                <strong>순금 가치로 통합</strong>
                <p>순도와 중량을 기준으로 교환 가능 중량을 확인합니다.</p>
              </div>
            </ProofRow>
            <ProofRow>
              <span>03</span>
              <div>
                <strong>999.9 골드바</strong>
                <p>원하는 골드바 조합과 잔여 중량을 확인합니다.</p>
              </div>
            </ProofRow>
          </HeroProofBody>
        </HeroProof>
      </Hero>

      {/* 02. 금시세 */}
      <GoldPriceBoard />

      {/* 03. 핵심 비교 */}
      <CompareSection id="why-gold-to-gold" aria-labelledby="compare-title">
        <Kicker>
          SELL & BUY vs <GoldToGoldText>GOLD TO GOLD</GoldToGoldText>
        </Kicker>
        <SectionTitle id="compare-title">
          같은 금인데,<br />
          왜 굳이 팔았다 다시 사야 할까요?
        </SectionTitle>
        <SectionLead>
          <GoldToGoldText>GOLD TO GOLD</GoldToGoldText>는 금을 현금으로 바꿨다가 다시 골드바를 사는
          두 번의 거래 대신, 보유한 금의 순금 가치를
          999.9 골드바로 바로 이어가는 한국골드마켓의 교환 방식입니다.
        </SectionLead>

        <CompareGrid>
          <CompareCard>
            <small>일반적인 방식 · SELL & BUY</small>
            <h3>금을 팔고 골드바를 다시 구매</h3>
            <Flow>
              <FlowItem>01 · 14K·18K·순금 제품</FlowItem>
              <FlowItem>02 · 매입가격으로 현금 판매</FlowItem>
              <FlowItem>03 · 골드바 판매가격으로 재구매</FlowItem>
              <FlowItem>04 · 999.9 골드바</FlowItem>
            </Flow>
            <CompareNote>
              매도와 재구매 사이에 <strong>매입가격과 판매가격의 차이</strong>가
              생길 수 있습니다.
            </CompareNote>
          </CompareCard>

          <CompareArrow aria-hidden>
            <span><ArrowRight size={20} /></span>
          </CompareArrow>

          <CompareCard>
            <small>
              한국골드마켓의 방식 · <GoldToGoldText>GOLD TO GOLD</GoldToGoldText>
            </small>
            <h3>금을 팔지 않고 999.9 골드바로</h3>
            <Flow>
              <FlowItem>01 · 14K·18K·순금 제품</FlowItem>
              <FlowItem>02 · 순도와 중량 확인</FlowItem>
              <FlowItem>03 · 순금 가치로 계산</FlowItem>
              <FlowItem>04 · 999.9 골드바 교환</FlowItem>
            </Flow>
            <CompareNote>
              불필요한 현금화 단계를 줄이고 <strong>금에서 금으로 가치를 이어갑니다.</strong>
            </CompareNote>
          </CompareCard>
        </CompareGrid>

        <FeeBar>
          <p>
            <strong><GoldToGoldText>GOLD TO GOLD</GoldToGoldText> 교환 수수료는 없습니다.</strong>{" "}
            999.9 골드바 제작에 필요한 규격별 제작 공임만 별도로 청구됩니다.
          </p>
          <TextLink to="/goldbar-fee">
            골드바 공임 확인하기
            <ArrowRight size={14} aria-hidden />
          </TextLink>
        </FeeBar>
      </CompareSection>

      {/* 04. 자기 상황 대입 */}
      <DrawerSection>
        <Kicker>YOUR GOLD, ONE VALUE</Kicker>
        <SectionTitle>서랍 속에 이런 금이 있지 않으세요?</SectionTitle>
        <SectionLead>
          오래된 주얼리든, 끊어진 제품이든, 보관만 하던 순금이든
          각각 팔 필요 없이 순금 가치로 모아볼 수 있습니다.
        </SectionLead>

        <GoldTypes>
          <GoldType>
            <strong>14K 목걸이</strong>
            <span>착용하지 않거나 끊어진 제품</span>
          </GoldType>
          <GoldType>
            <strong>18K 반지·팔찌</strong>
            <span>오래되어 보관만 하던 주얼리</span>
          </GoldType>
          <GoldType>
            <strong>순금 제품</strong>
            <span>돌반지·메달·기타 순금 제품</span>
          </GoldType>
        </GoldTypes>

        <MergeLine>
          <ArrowRight size={24} aria-hidden style={{ transform: "rotate(90deg)" }} />
        </MergeLine>

        <MergeResult>
          <small>ONE PURE GOLD VALUE</small>
          <strong>여러 종류의 금 → 하나의 순금 가치 → 999.9 골드바</strong>
        </MergeResult>
      </DrawerSection>

      {/* 05. 즉시 체험 */}
      <CalculatorSection aria-labelledby="calculator-title">
        <CalculatorHead>
          <div>
            <Kicker>TRY IT NOW</Kicker>
            <SectionTitle id="calculator-title">내 금은 어떤 골드바가 될까요?</SectionTitle>
            <SectionLead>
              금의 종류와 중량을 입력하면 내 금이 어떤 999.9 골드바 조합으로
              바뀌는지 로그인 없이 먼저 확인할 수 있습니다.
            </SectionLead>
          </div>
          <TextLink to="/goldbar-fee">
            제작 공임 먼저 보기
            <ArrowRight size={14} aria-hidden />
          </TextLink>
        </CalculatorHead>

        <CalculatorWrap>
          <LiteCalcFromGX showCombo />
        </CalculatorWrap>
      </CalculatorSection>

      {/* 06. 위험 제거 */}
      <Section aria-labelledby="trust-title">
        <Kicker>TRANSPARENT PROCESS</Kicker>
        <SectionTitle id="trust-title">확인하고, 그다음 결정하세요.</SectionTitle>

        <TrustGrid>
          <TrustCard>
            <Scale size={29} aria-hidden />
            <h3>고객 앞에서 현장 실측</h3>
            <p>순도와 중량을 고객이 보는 앞에서 다시 확인해 최종 인정 중량을 안내합니다.</p>
          </TrustCard>
          <TrustCard>
            <ReceiptText size={29} aria-hidden />
            <h3>비용 사전 공개</h3>
            <p>교환 수수료는 없으며, 적용되는 골드바 제작 공임을 확정 전에 확인합니다.</p>
          </TrustCard>
          <TrustCard>
            <ShieldCheck size={29} aria-hidden />
            <h3>동의 후 교환 확정</h3>
            <p>측정 결과와 비용을 확인한 뒤 원하는 경우에만 교환을 확정합니다.</p>
          </TrustCard>
        </TrustGrid>
      </Section>

      {/* 07. 실제 매장 */}
      <Verification aria-labelledby="verification-title">
        <VerificationImage>
          <img
            src={import.meta.env.DEV ? goldVerificationImage : "/gold-verification.jpg"}
            alt="정밀 저울에서 보유 금의 중량을 확인하는 모습"
          />
        </VerificationImage>

        <VerificationCopy>
          <Kicker>OPERATED BY WONIL JEWELRY</Kicker>
          <SectionTitle id="verification-title">
            온라인에서 계산하고,<br />
            실제 매장에서 직접 확인합니다.
          </SectionTitle>
          <SectionLead>
            한국골드마켓의 999.9 골드바 교환은 부산 범천동 원일귀금속이 직접 제공합니다.
            온라인 계산값을 그대로 확정하지 않고 고객과 함께 다시 확인합니다.
          </SectionLead>

          <StoreMeta>
            <span><MapPin size={16} aria-hidden /> 부산광역시 부산진구 골드테마길 21</span>
            <span><Clock3 size={16} aria-hidden /> 월–토 10:00–18:00</span>
            <a href="tel:0516469700"><Phone size={16} aria-hidden /> 교환 상담 051-646-9700</a>
          </StoreMeta>

          <TextLink to="/stores" style={{ marginTop: "16px", alignSelf: "flex-start" }}>
            교환 절차·매장 자세히 보기
            <ArrowRight size={14} aria-hidden />
          </TextLink>
        </VerificationCopy>
      </Verification>

      {/* 08. 절차 */}
      <Section aria-labelledby="process-title">
        <Kicker>3 SIMPLE STEPS</Kicker>
        <SectionTitle id="process-title">금교환은 세 단계입니다.</SectionTitle>

        <ProcessGrid>
          <ProcessCard>
            <small>STEP 01 · ONLINE</small>
            <h3>예상 계산</h3>
            <p>금의 종류와 중량을 입력해 예상 순금 중량과 골드바 조합을 확인합니다.</p>
          </ProcessCard>
          <ProcessCard>
            <small>STEP 02 · IN STORE</small>
            <h3>매장 실측</h3>
            <p>고객 앞에서 순도와 중량을 확인하고 최종 인정 중량과 공임을 안내합니다.</p>
          </ProcessCard>
          <ProcessCard>
            <small>STEP 03 · COMPLETE</small>
            <h3>999.9 골드바 수령</h3>
            <p>결과에 동의하면 확정된 골드바 조합과 잔여 중량을 수령합니다.</p>
          </ProcessCard>
        </ProcessGrid>
      </Section>

      {/* 09. 사회적 증거 */}
      <Section aria-labelledby="reviews-title">
        <SimpleHead>
          <Kicker>VERIFIED EXCHANGE REVIEWS</Kicker>
          <SectionTitle id="reviews-title">먼저 교환한 고객의 이야기</SectionTitle>
        </SimpleHead>
        <GoldExchangeReviewList limitCount={6} />
      </Section>

      {/* 부가 참여 요소 */}
      <QuizBanner aria-labelledby="quiz-title">
        <div>
          <small>TODAY&apos;S QUICK QUIZ · 1 ACCOUNT, 1 TIME</small>
          <h2 id="quiz-title">금 상식 퀴즈 풀고 순금 0.01g 받기</h2>
          <p>5문항을 모두 맞히면 골드바 교환 시 사용할 수 있는 순금 0.01g을 적립합니다.</p>
        </div>
        <QuizLink to="/quiz/gold-bonus">
          퀵퀴즈 시작
          <Sparkles size={17} aria-hidden />
        </QuizLink>
      </QuizBanner>

      {/* 10. FAQ */}
      <Section aria-labelledby="faq-title">
        <SimpleHead>
          <Kicker>FREQUENTLY ASKED QUESTIONS</Kicker>
          <SectionTitle id="faq-title">교환 전에 이것만 확인하세요.</SectionTitle>
        </SimpleHead>

        <FAQGrid>
          <div>
            <FAQ>
              <summary>교환 수수료가 있나요?</summary>
              <p>999.9 골드바 교환 자체에 별도의 교환 수수료는 없습니다. 골드바 제작에 필요한 규격별 제작 공임만 별도로 청구됩니다.</p>
            </FAQ>
            <FAQ>
              <summary>온라인 계산 결과가 최종 결과인가요?</summary>
              <p>아닙니다. 온라인 결과는 입력값에 따른 예상치이며 최종 순도와 중량은 매장 실측 후 확정합니다.</p>
            </FAQ>
            <FAQ>
              <summary>어떤 금을 교환할 수 있나요?</summary>
              <p>14K·18K·순금 등 보유한 금제품을 기준에 따라 확인하고 순금 가치로 계산합니다. 실제 인정 여부와 중량은 현장 확인 후 안내합니다.</p>
            </FAQ>
          </div>

          <div>
            <FAQ>
              <summary>측정 후 교환하지 않아도 되나요?</summary>
              <p>네. 최종 인정 중량과 제작 공임을 확인한 뒤 동의하지 않으면 교환을 확정하지 않습니다.</p>
            </FAQ>
            <FAQ>
              <summary>골드바 제작 공임은 어디서 확인하나요?</summary>
              <p>골드바 공임 안내 페이지에서 대표 규격별 예상 공임을 확인할 수 있으며 실제 적용 금액은 교환 확정 전에 다시 안내합니다.</p>
            </FAQ>
            <FAQ>
              <summary>택배로 먼저 보내야 하나요?</summary>
              <p>현재 기본 절차는 부산 범천동 원일귀금속 매장 방문 확인입니다. 방문 전 전화 상담이 가능합니다.</p>
            </FAQ>
          </div>
        </FAQGrid>
      </Section>

      {/* 11. 마지막 행동 */}
      <FinalCTA>
        <div>
          <Kicker>
            BEFORE YOU SELL · <GoldToGoldText>GOLD TO GOLD</GoldToGoldText>
          </Kicker>
          <h2>금을 팔기 전에, 다른 방법도 확인해보세요.</h2>
          <p>
            내가 가진 14K·18K·순금이 어떤 999.9 골드바가 되는지
            로그인 없이 확인하고, 교환 여부는 그다음 결정하세요.
          </p>
        </div>

        <PrimaryLink to="/gold-exchange">
          내 금으로 받을 골드바 계산
          <ArrowRight size={18} aria-hidden />
        </PrimaryLink>
      </FinalCTA>
    </Page>
  );
}