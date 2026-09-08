// src/pages/LandingPage.jsx
import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
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
import MyGoldIntroCard from "@/components/gold/MyGoldIntroCard";
import MyGoldTicker from "@/components/gold/MyGoldTicker";
import goldVerificationImage from "@/assets/goldVerificationImage";

const Page = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
`;

const Section = styled.section`
  padding: clamp(34px, 4.1vw, 50px) 0;

  @media (max-width: 540px) {
    padding: 25px 0;
  }
`;

const Kicker = styled.p`
  margin: 0 0 7px;
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
  font-size: clamp(1.6rem, 2.7vw, 2.35rem);
  line-height: 1.22;
  letter-spacing: -.025em;
  word-break: keep-all;
`;

const SectionLead = styled.p`
  max-width: 720px;
  margin: 10px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .95rem;
  line-height: 1.64;
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
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent);
  border-radius: 14px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 850;
  text-decoration: none;
  box-shadow: 0 9px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 14%, transparent);

  &:hover {
    color: ${({ theme }) => theme.colors.white};
    background: ${({ theme }) => theme.colors.primaryDark};
  }

  @media (max-width: 540px) {
    width: 100%;
  }
`;

const SecondaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 50px;
  padding: 12px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 850;
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => theme.colors.secondary};
    color: ${({ theme }) => theme.colors.primary};
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
    0% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-position: 50% 50%;
  }
`;

/* 01. GOLD TO GOLD HERO */
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

  @media (max-width: 980px) { padding-left: 18px; }
  @media (max-width: 540px) { padding-left: 10px; }
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

  span { color: ${({ theme }) => theme.colors.secondaryDark}; }

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
  gap: 12px 12px;
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
  padding: 0;
  list-style: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .79rem;
  font-weight: 750;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  svg { color: ${({ theme }) => theme.colors.secondaryDark}; }

  @media (max-width: 540px) { display: grid; }
`;

const HeroProof = styled.aside`
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 14px 34px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 10%, transparent);
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

const HeroProofBody = styled.div`display: grid;`;

const ProofRow = styled.div`
  display: grid;
  grid-template-columns: 42px 1fr;
  gap: 12px;
  padding: 19px 22px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child { border-top: 0; }

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

/* 02. PRICE + MY GOLD */
const PriceVaultSection = styled(Section)`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const MyGoldSection = styled.div`
  width: 100%;
  margin: 16px 0 0;
`;

const WelcomeGoldBanner = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
  margin-top: 16px;
  padding: clamp(20px, 2.8vw, 27px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, transparent);
  border-radius: 22px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 12px 30px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);

  small {
    display: block;
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .65rem;
    font-weight: 900;
    letter-spacing: .13em;
  }

  h2 {
    margin: 7px 0 6px;
    color: ${({ theme }) => theme.on.primary};
    font-size: clamp(1.35rem, 2.2vw, 1.95rem);
    line-height: 1.25;
  }

  p {
    margin: 0;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 76%, transparent);
    font-size: .86rem;
    line-height: 1.55;
    word-break: keep-all;
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const WelcomeGoldLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 11px 18px;
  border: 1px solid ${({ theme }) => theme.colors.goldLight};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.on.secondary};
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.on.secondary};
    filter: brightness(1.05);
  }
`;

/* 03. CALCULATOR */
const CalculatorSection = styled(Section)`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CalculatorHead = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 24px;
  margin-bottom: 18px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    align-items: start;
  }
`;

const CalculatorWrap = styled.div`
  position: relative;
  z-index: 1;
`;

/* 04. WHY GOLD TO GOLD */
const CompareSection = styled(Section)`
  padding-top: clamp(42px, 5vw, 60px);
`;

const CompareGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) 44px minmax(0, 3fr);
  align-items: stretch;
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 10px 26px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

const CompareCard = styled.article`
  padding: clamp(22px, 2.6vw, 30px);

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

const Flow = styled.div`display: grid; gap: 8px;`;

const FlowItem = styled.div`
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 10px 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.primary};
  font-size: .88rem;
  font-weight: 800;
`;

const CompareNote = styled.p`
  margin: 14px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .88rem;
  line-height: 1.62;

  strong { color: ${({ theme }) => theme.colors.primary}; }
`;

const CompareArrow = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.secondaryDark};

  &::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: ${({ theme }) => theme.colors.secondary};
    opacity: .6;
    transform: translateX(-50%);
  }

  span {
    position: relative;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 1px solid ${({ theme }) => theme.colors.secondary};
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.surface};
    box-shadow: 0 0 0 6px ${({ theme }) => theme.colors.surface};
  }

  @media (max-width: 760px) {
    min-height: 54px;

    &::before {
      top: 50%; right: 0; bottom: auto; left: 0;
      width: auto; height: 1px;
      transform: translateY(-50%);
    }

    svg { transform: rotate(90deg); }
  }
`;

const FeeBar = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 18px;
  margin-top: 14px;
  padding: 14px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .88rem;
    line-height: 1.6;
  }

  strong { color: ${({ theme }) => theme.colors.primary}; }

  @media (max-width: 680px) { grid-template-columns: 1fr; }
`;

const GoldStoryNote = styled.div`
  margin-top: 14px;
  padding: 18px 20px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: linear-gradient(135deg, color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 48%, white), ${({ theme }) => theme.colors.surfaceAlt});

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
  }

  p {
    margin: 6px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
    line-height: 1.58;
  }
`;

/* 05. STORE + TRUST */
const TrustSection = styled(Section)`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Verification = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(340px, .95fr);
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 10px 28px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const VerificationImage = styled.div`
  min-height: 360px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (max-width: 540px) { min-height: 235px; }
`;

const VerificationCopy = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(24px, 3.2vw, 34px);
`;

const TrustList = styled.div`
  display: grid;
  gap: 0;
  margin-top: 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  div {
    display: grid;
    grid-template-columns: 30px 1fr;
    gap: 10px;
    padding: 11px 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  svg { color: ${({ theme }) => theme.colors.secondaryDark}; }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .88rem;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .78rem;
    line-height: 1.45;
  }
`;

const StoreMeta = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .82rem;

  span, a {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  svg { color: ${({ theme }) => theme.colors.secondaryDark}; }
`;

const ProcessStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

const ProcessStep = styled.div`
  padding: 16px 18px;
  border-left: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child { border-left: 0; }

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .62rem;
    font-weight: 850;
    letter-spacing: .1em;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: ${({ theme }) => theme.colors.primary};
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .78rem;
    line-height: 1.45;
  }

  @media (max-width: 760px) {
    border-left: 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    &:first-child { border-top: 0; }
  }
`;

/* 06. PROOF + FAQ */
const ProofSection = styled(Section)`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ProofGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, .75fr);
  gap: 28px;
  margin-top: 20px;
  align-items: start;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const FAQStack = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const FAQ = styled.details`
  padding: 15px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  summary {
    cursor: pointer;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
  }

  p {
    margin: 10px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .86rem;
    line-height: 1.65;
  }
`;

const FinalCTA = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 28px;
  margin: 34px 0 28px;
  padding: clamp(24px, 3.5vw, 34px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: linear-gradient(135deg, color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 42%, white), ${({ theme }) => theme.colors.surface} 60%);
  box-shadow: 0 10px 26px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

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
    line-height: 1.6;
  }

  @media (max-width: 720px) { grid-template-columns: 1fr; }
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

      <MyGoldTicker />

      <Hero aria-labelledby="landing-title">
        <HeroCopy>
          <HeroQuestion>
            금을 현금화하기 전에 확인하는 새로운 방법 · <GoldToGoldHero>GOLD TO GOLD</GoldToGoldHero>
          </HeroQuestion>

          <HeroTitle id="landing-title">
            가지고 있는 금,
            <br />
            <span>팔지 말고</span>
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
              내 금 계산하기 <ArrowRight size={18} aria-hidden />
            </PrimaryLink>
            <SecondaryLink to="/my-gold">
              내금고 체험하기 <ArrowRight size={17} aria-hidden />
            </SecondaryLink>
            <TextLink as="a" href="#why-gold-to-gold" onClick={scrollToCompare}>
              교환방법 알아보기
            </TextLink>
          </HeroActions>

          <HeroMicro>
            <li><CheckCircle2 size={15} aria-hidden /> 로그인 없이 예상 계산</li>
            <li><CheckCircle2 size={15} aria-hidden /> 교환 수수료 없음</li>
            <li><CheckCircle2 size={15} aria-hidden /> 매장 실측 후 최종 결정</li>
          </HeroMicro>
        </HeroCopy>

        <HeroProof aria-label="한국골드마켓 핵심 흐름">
          <HeroProofTop>
            <small>KOREA GOLD MARKET · <GoldToGoldText>GOLD TO GOLD</GoldToGoldText></small>
            <strong>내 금을 알고,<br />필요할 때 골드바로 이어가세요.</strong>
          </HeroProofTop>
          <HeroProofBody>
            <ProofRow>
              <span>01</span>
              <div><strong>오늘 금시세 확인</strong><p>순금·18K·14K의 공개 시세와 변동을 확인합니다.</p></div>
            </ProofRow>
            <ProofRow>
              <span>02</span>
              <div><strong>내금고로 내 금 관리</strong><p>오늘 가치, 예상 순금량, 가능한 골드바를 확인합니다.</p></div>
            </ProofRow>
            <ProofRow>
              <span>03</span>
              <div><strong>방문 실측 후 교환</strong><p>순도·중량·제작 공임을 고객 앞에서 확인한 뒤 결정합니다.</p></div>
            </ProofRow>
          </HeroProofBody>
        </HeroProof>
      </Hero>

      <PriceVaultSection aria-labelledby="price-vault-title">
        <Kicker>DAILY GOLD PRICE · MY GOLD</Kicker>
        <SectionTitle id="price-vault-title">오늘 금시세를 보고, 내 금의 오늘 가치까지 확인하세요.</SectionTitle>
        <SectionLead>
          시세 확인에서 끝나지 않고 <strong>MY GOLD · 내금고</strong>에서 내가 가진 실물 금의 가치와 예상 순금량을 이어서 볼 수 있습니다.
        </SectionLead>
        <GoldPriceBoard />
        <MyGoldSection>
          <MyGoldIntroCard />
        </MyGoldSection>

        <WelcomeGoldBanner aria-labelledby="welcome-gold-title">
          <div>
            <small>WELCOME GOLD · NEW MEMBER BENEFIT</small>
            <h2 id="welcome-gold-title">퀵퀴즈 풀고 순금 0.01g 받기</h2>
            <p>회원가입 +0.01g · 퀵퀴즈 +0.01g · 금시세 알림 +0.01g → 최대 순금 0.03g</p>
          </div>
          <WelcomeGoldLink to="/quiz/gold-bonus">
            퀵퀴즈 풀고 순금 0.01g 받기
            <Sparkles size={17} aria-hidden />
          </WelcomeGoldLink>
        </WelcomeGoldBanner>
      </PriceVaultSection>

      <CalculatorSection aria-labelledby="calculator-title">
        <CalculatorHead>
          <div>
            <Kicker>TRY IT NOW</Kicker>
            <SectionTitle id="calculator-title">내 금은 어떤 골드바가 될까요?</SectionTitle>
            <SectionLead>
              금의 종류와 중량을 입력하면 예상 순금량과 가능한 999.9 골드바 조합을 로그인 없이 먼저 확인할 수 있습니다.
            </SectionLead>
          </div>
        </CalculatorHead>
        <CalculatorWrap><LiteCalcFromGX showCombo /></CalculatorWrap>
      </CalculatorSection>

      <CompareSection id="why-gold-to-gold" aria-labelledby="compare-title">
        <Kicker>SELL & BUY vs <GoldToGoldText>GOLD TO GOLD</GoldToGoldText></Kicker>
        <SectionTitle id="compare-title">같은 금인데, 왜 굳이 팔았다 다시 사야 할까요?</SectionTitle>
        <SectionLead>
          보유한 금의 순금 가치를 현금화했다가 다시 구매하는 대신, <strong>금에서 금으로 바로 이어가는 방식</strong>을 비교해보세요.
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
            <CompareNote>매도와 재구매 사이에 <strong>매입가격과 판매가격의 차이</strong>가 생길 수 있습니다.</CompareNote>
          </CompareCard>

          <CompareArrow aria-hidden><span><ArrowRight size={20} /></span></CompareArrow>

          <CompareCard>
            <small>한국골드마켓의 방식 · GOLD TO GOLD</small>
            <h3>금을 팔지 않고 999.9 골드바로</h3>
            <Flow>
              <FlowItem>01 · 14K·18K·순금 제품</FlowItem>
              <FlowItem>02 · 순도와 중량 확인</FlowItem>
              <FlowItem>03 · 순금 가치로 계산</FlowItem>
              <FlowItem>04 · 999.9 골드바 교환</FlowItem>
            </Flow>
            <CompareNote>불필요한 현금화 단계를 줄이고 <strong>금에서 금으로 가치를 이어갑니다.</strong></CompareNote>
          </CompareCard>
        </CompareGrid>

        <FeeBar>
          <p><strong>GOLD TO GOLD 교환 수수료는 없습니다.</strong> 999.9 골드바 제작에 필요한 규격별 제작 공임만 별도로 청구됩니다.</p>
          <TextLink to="/goldbar-fee">골드바 공임 확인하기 <ArrowRight size={14} aria-hidden /></TextLink>
        </FeeBar>

        <GoldStoryNote>
          <strong>결혼 반지, 한쪽만 남은 귀걸이, 오래된 목걸이, 돌반지까지.</strong>
          <p>지금 착용하지 않아도 그 안의 금은 여전히 가치가 있습니다. 내금고에서 먼저 확인하고, 필요할 때 하나의 순금 가치로 모아 골드바로 이어갈 수 있습니다.</p>
        </GoldStoryNote>
      </CompareSection>

      <TrustSection aria-labelledby="trust-store-title">
        <Kicker>ONLINE CALCULATION · IN-STORE VERIFICATION</Kicker>
        <SectionTitle id="trust-store-title">온라인에서 계산하고, 실제 매장에서 직접 확인합니다.</SectionTitle>
        <SectionLead>
          온라인 결과는 예상값입니다. 최종 순도·중량·공임은 부산 범천동 원일귀금속에서 고객과 함께 확인하고 동의 후 확정합니다.
        </SectionLead>

        <Verification>
          <VerificationImage>
            <img
              src={import.meta.env.DEV ? goldVerificationImage : "/gold-verification.jpg"}
              alt="정밀 저울에서 보유 금의 중량을 확인하는 모습"
            />
          </VerificationImage>
          <VerificationCopy>
            <Kicker>OPERATED BY WONIL JEWELRY</Kicker>
            <SectionTitle as="h3">확인하고, 그다음 결정하세요.</SectionTitle>
            <TrustList>
              <div><Scale size={20} aria-hidden /><span><strong>고객 앞에서 현장 실측</strong><p>순도와 중량을 고객이 보는 앞에서 다시 확인합니다.</p></span></div>
              <div><ReceiptText size={20} aria-hidden /><span><strong>비용 사전 공개</strong><p>골드바 제작 공임을 교환 확정 전에 확인합니다.</p></span></div>
              <div><ShieldCheck size={20} aria-hidden /><span><strong>동의 후 교환 확정</strong><p>측정 결과와 비용을 확인한 뒤 원하는 경우에만 교환합니다.</p></span></div>
            </TrustList>
            <StoreMeta>
              <span><MapPin size={16} aria-hidden /> 부산광역시 부산진구 골드테마길 21</span>
              <span><Clock3 size={16} aria-hidden /> 월–토 10:00–18:00</span>
              <a href="tel:0516469700"><Phone size={16} aria-hidden /> 교환 상담 051-646-9700</a>
            </StoreMeta>
            <TextLink to="/stores" style={{ marginTop: "16px", alignSelf: "flex-start" }}>교환 절차·매장 자세히 보기 <ArrowRight size={14} aria-hidden /></TextLink>
          </VerificationCopy>
        </Verification>

        <ProcessStrip aria-label="금교환 세 단계">
          <ProcessStep><small>STEP 01 · ONLINE</small><strong>예상 계산</strong><p>금 종류와 중량을 입력해 예상 결과를 확인합니다.</p></ProcessStep>
          <ProcessStep><small>STEP 02 · IN STORE</small><strong>매장 실측</strong><p>순도·중량·공임을 고객 앞에서 확인합니다.</p></ProcessStep>
          <ProcessStep><small>STEP 03 · COMPLETE</small><strong>999.9 골드바</strong><p>결과에 동의하면 교환을 확정합니다.</p></ProcessStep>
        </ProcessStrip>
      </TrustSection>

      <ProofSection aria-labelledby="proof-title">
        <Kicker>VERIFIED REVIEWS · FAQ</Kicker>
        <SectionTitle id="proof-title">먼저 교환한 고객의 이야기와, 교환 전에 필요한 답만 모았습니다.</SectionTitle>
        <ProofGrid>
          <div><GoldExchangeReviewList limitCount={3} /></div>
          <FAQStack>
            <FAQ><summary>교환 수수료가 있나요?</summary><p>999.9 골드바 교환 자체에 별도의 교환 수수료는 없습니다. 규격별 제작 공임만 별도로 안내합니다.</p></FAQ>
            <FAQ><summary>온라인 계산 결과가 최종 결과인가요?</summary><p>아닙니다. 입력값에 따른 예상치이며 최종 순도와 중량은 매장 실측 후 확정합니다.</p></FAQ>
            <FAQ><summary>측정 후 교환하지 않아도 되나요?</summary><p>네. 최종 인정 중량과 제작 공임을 확인한 뒤 동의하지 않으면 교환을 확정하지 않습니다.</p></FAQ>
            <FAQ><summary>비회원도 내금고를 볼 수 있나요?</summary><p>네. 로그인 없이 체험 화면을 볼 수 있습니다. 자신의 금을 저장하고 계속 관리하려면 회원가입이 필요합니다.</p></FAQ>
          </FAQStack>
        </ProofGrid>

        <FinalCTA>
          <div>
            <Kicker>BEFORE YOU SELL · GOLD TO GOLD</Kicker>
            <h2>금을 팔기 전에, 내 금부터 확인해보세요.</h2>
            <p>내금고에서 내 금을 알아보고, 999.9 골드바 교환이 필요할 때 GOLD TO GOLD로 이어가세요.</p>
          </div>
          <HeroActions style={{ marginTop: 0 }}>
            <PrimaryLink to="/gold-exchange">내 금으로 받을 골드바 계산 <ArrowRight size={18} aria-hidden /></PrimaryLink>
            <SecondaryLink to="/my-gold">내금고 체험하기 <ArrowRight size={16} aria-hidden /></SecondaryLink>
          </HeroActions>
        </FinalCTA>
      </ProofSection>
    </Page>
  );
}
