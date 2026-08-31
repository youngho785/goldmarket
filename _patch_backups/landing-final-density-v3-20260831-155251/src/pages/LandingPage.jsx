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


/* ───────────────────── QUICK JOURNEY ───────────────────── */

const JourneySection = styled(Section)`
  padding-top: clamp(34px, 4.5vw, 54px);
  padding-bottom: clamp(28px, 4vw, 46px);
`;

const JourneyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const JourneyCard = styled(Link)`
  position: relative;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 22px;
  gap: 14px;
  align-items: start;
  min-height: 146px;
  padding: 22px 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  transition:
    transform ${({ theme }) => theme.transitions.base},
    box-shadow ${({ theme }) => theme.transitions.base},
    border-color ${({ theme }) => theme.transitions.base};

  &:hover {
    transform: translateY(-3px);
    border-color: ${({ theme }) => theme.colors.secondary};
    box-shadow: ${({ theme }) => theme.shadows.card};
  }

  > span:first-child {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  > span:first-child svg {
    width: 22px;
    height: 22px;
  }

  small {
    display: block;
    margin-bottom: 5px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .63rem;
    font-weight: 850;
    letter-spacing: .11em;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
    line-height: 1.4;
  }

  p {
    margin: 6px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .78rem;
    line-height: 1.52;
    word-break: keep-all;
  }

  > svg {
    align-self: center;
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

/* ───────────────────── CORE COMPARISON ───────────────────── */

const CompareSection = styled(Section)`
  padding-top: clamp(52px, 6.5vw, 80px);
`;

const CompareGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 2fr) 44px minmax(0, 3fr);
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
    color: ${({ theme }) => theme.colors.secondaryDark};
    box-shadow: 0 0 0 6px ${({ theme }) => theme.colors.surface};
  }

  @media (max-width: 760px) {
    min-height: 54px;

    &::before {
      top: 50%;
      right: 0;
      bottom: auto;
      left: 0;
      width: auto;
      height: 1px;
      transform: translateY(-50%);
    }

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

/* ───────────────────── BRAND STORY / SELF-RELEVANCE ───────────────────── */

const DrawerSection = styled(Section)`
  position: relative;
  margin: clamp(34px, 4.5vw, 54px) 0;
  padding: clamp(46px, 5.5vw, 68px) clamp(22px, 3.5vw, 42px);
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: clamp(22px, 3.5vw, 42px);
    width: 96px;
    height: 3px;
    background: ${({ theme }) => theme.colors.secondary};
  }

  ${SectionLead} {
    max-width: 760px;
  }

  @media (max-width: 540px) {
    margin: 28px 0;
    padding: 40px 18px;
  }
`;

const BrandStoryGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(300px, .92fr);
  gap: 16px;
  margin-top: 28px;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const StoryItems = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

const StoryItem = styled.div`
  min-height: 108px;
  padding: 20px 18px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:nth-child(2n) {
    border-right: 0;
  }

  &:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  small {
    display: block;
    margin-bottom: 8px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .62rem;
    font-weight: 850;
    letter-spacing: .1em;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
    line-height: 1.45;
  }

  @media (max-width: 540px) {
    border-right: 0;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};

    &:nth-last-child(-n + 2) {
      border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    }

    &:last-child {
      border-bottom: 0;
    }
  }
`;

const ValueStory = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(24px, 3vw, 34px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .66rem;
    font-weight: 850;
    letter-spacing: .13em;
  }

  h3 {
    margin: 12px 0 13px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.35rem, 2.5vw, 1.9rem);
    line-height: 1.38;
    word-break: keep-all;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .88rem;
    line-height: 1.68;
    word-break: keep-all;
  }
`;

const ValuePath = styled.div`
  display: grid;
  grid-template-columns: 1fr 32px 1fr 32px 1fr;
  align-items: stretch;
  margin-top: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  > svg {
    align-self: center;
    justify-self: center;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;

    > svg {
      margin: 5px 0;
      transform: rotate(90deg);
    }
  }
`;

const ValueStep = styled.div`
  padding: 18px 16px;
  background: ${({ theme }) => theme.colors.surface};

  small {
    display: block;
    margin-bottom: 6px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .6rem;
    font-weight: 850;
    letter-spacing: .1em;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .95rem;
    line-height: 1.42;
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
              내 금 계산하기
              <ArrowRight size={18} aria-hidden />
            </PrimaryLink>

            <TextLink as="a" href="#why-gold-to-gold" onClick={scrollToCompare}>
              교환방법 알아보기
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
            <strong>오늘 바로 확인하고,<br />매장에서 최종 결정하세요.</strong>
          </HeroProofTop>
          <HeroProofBody>
            <ProofRow>
              <span>01</span>
              <div>
                <strong>오늘 금시세 확인</strong>
                <p>순금·18K·14K의 공개 시세와 변동을 확인합니다.</p>
              </div>
            </ProofRow>
            <ProofRow>
              <span>02</span>
              <div>
                <strong>내 금 예상 계산</strong>
                <p>종류와 중량을 입력해 예상 순금 중량과 골드바 조합을 봅니다.</p>
              </div>
            </ProofRow>
            <ProofRow>
              <span>03</span>
              <div>
                <strong>방문 실측 후 확정</strong>
                <p>순도·중량·제작 공임을 고객 앞에서 확인한 뒤 결정합니다.</p>
              </div>
            </ProofRow>
          </HeroProofBody>
        </HeroProof>
      </Hero>

      {/* 02. 금시세 */}
      <GoldPriceBoard />

      {/* 신규회원 혜택 · 퀵퀴즈를 첫 화면 가까이 노출 */}
      <QuizBanner aria-labelledby="quiz-title">
        <div>
          <small>WELCOME GOLD · NEW MEMBER BENEFIT</small>
          <h2 id="quiz-title">퀵퀴즈 풀고 순금 0.01g 받기</h2>
          <p>
            회원가입 전에도 먼저 풀 수 있어요. 퀵퀴즈 · 회원가입 · 금시세 알림 설정으로
            각각 순금 0.01g
          </p>
        </div>
        <QuizLink to="/quiz/gold-bonus">
          퀵퀴즈 풀고 순금 0.01g 받기
          <Sparkles size={17} aria-hidden />
        </QuizLink>
      </QuizBanner>

      {/* 03. 핵심 동선 */}
      <JourneySection aria-labelledby="journey-title">
        <Kicker>CHECK · CALCULATE · RESERVE</Kicker>
        <SectionTitle id="journey-title">복잡하지 않게, 세 단계만 확인하세요.</SectionTitle>
        <SectionLead>
          오늘 시세를 확인하고 내 금의 예상 교환 결과를 계산한 뒤,
          실제 매장에서 실측 결과와 비용을 보고 최종 결정합니다.
        </SectionLead>

        <JourneyGrid>
          <JourneyCard to="/gold-price">
            <span><Scale aria-hidden /></span>
            <div>
              <small>01 · GOLD PRICE</small>
              <strong>오늘 금시세</strong>
              <p>순금·18K·14K 공개 시세와 전일 변동을 먼저 확인합니다.</p>
            </div>
            <ArrowRight aria-hidden />
          </JourneyCard>

          <JourneyCard to="/gold-exchange">
            <span><FileCheck2 aria-hidden /></span>
            <div>
              <small>02 · CALCULATE</small>
              <strong>내 금 계산</strong>
              <p>14K·18K·순금의 예상 순금 중량과 골드바 조합을 확인합니다.</p>
            </div>
            <ArrowRight aria-hidden />
          </JourneyCard>

          <JourneyCard to="/gold-exchange?reserve=1">
            <span><MapPin aria-hidden /></span>
            <div>
              <small>03 · RESERVE</small>
              <strong>방문 예약</strong>
              <p>방문할 날짜와 시간을 선택해 예약합니다.</p>
            </div>
            <ArrowRight aria-hidden />
          </JourneyCard>
        </JourneyGrid>
      </JourneySection>

      {/* 04. 즉시 체험 */}
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

      {/* 05. 핵심 비교 */}
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

      {/* 06. 브랜드 본질 · 자기 상황 대입 */}
      <DrawerSection aria-labelledby="brand-story-title">
        <Kicker>YOUR GOLD · YOUR STORY</Kicker>
        <SectionTitle id="brand-story-title">
          금은 오래되어도,<br />
          가치까지 오래되지는 않습니다.
        </SectionTitle>
        <SectionLead>
          결혼 때 받았던 반지, 한쪽만 남은 귀걸이, 유행이 지나 손이 가지 않는 목걸이,
          오래 보관한 돌반지. 지금 착용하지 않아도 그 안의 금은 여전히 금입니다.
        </SectionLead>

        <BrandStoryGrid>
          <StoryItems aria-label="가지고 있던 금의 예">
            <StoryItem>
              <small>01 · RING</small>
              <strong>결혼 때 받았던 반지</strong>
            </StoryItem>
            <StoryItem>
              <small>02 · EARRING</small>
              <strong>한쪽만 남은 귀걸이</strong>
            </StoryItem>
            <StoryItem>
              <small>03 · NECKLACE</small>
              <strong>유행이 지나 착용하지 않는 목걸이</strong>
            </StoryItem>
            <StoryItem>
              <small>04 · PURE GOLD</small>
              <strong>오래 보관해 온 돌반지·순금 제품</strong>
            </StoryItem>
          </StoryItems>

          <ValueStory>
            <small>GOLD TO GOLD</small>
            <h3>그 금의 의미는 간직하고,<br />가치는 새로운 골드로 이어갑니다.</h3>
            <p>
              여러 금제품을 각각 처분하는 대신 순도와 중량을 확인해 하나의 순금 가치로 계산하고,
              999.9 골드바로 이어가는 것이 한국골드마켓의 GOLD TO GOLD입니다.
            </p>
          </ValueStory>
        </BrandStoryGrid>

        <ValuePath aria-label="GOLD TO GOLD 가치 전환 과정">
          <ValueStep>
            <small>YOUR GOLD</small>
            <strong>가지고 있던 금</strong>
          </ValueStep>
          <ArrowRight size={20} aria-hidden />
          <ValueStep>
            <small>PURE GOLD VALUE</small>
            <strong>확인된 하나의 순금 가치</strong>
          </ValueStep>
          <ArrowRight size={20} aria-hidden />
          <ValueStep>
            <small>999.9 GOLD</small>
            <strong>새롭게 이어지는 골드</strong>
          </ValueStep>
        </ValuePath>
      </DrawerSection>

      {/* 07. 위험 제거 */}
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

      {/* 08. 실제 매장 */}
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

      {/* 09. 절차 */}
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

      {/* 10. 사회적 증거 */}
      <Section aria-labelledby="reviews-title">
        <SimpleHead>
          <Kicker>VERIFIED EXCHANGE REVIEWS</Kicker>
          <SectionTitle id="reviews-title">먼저 교환한 고객의 이야기</SectionTitle>
        </SimpleHead>
        <GoldExchangeReviewList limitCount={6} />
      </Section>

      {/* 11. FAQ */}
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

      {/* 12. 마지막 행동 */}
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
