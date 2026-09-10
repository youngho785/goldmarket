// src/pages/LandingPage.jsx
import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock3,
  Gem,
  MapPin,
  Phone,
  ReceiptText,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import LiteCalcFromGX from "@/components/LiteCalcFromGX";
import GoldPriceBoard from "@/components/gold/GoldPriceBoard";
import MyGoldIntroCard from "@/components/gold/MyGoldIntroCard";
import MyGoldTicker from "@/components/gold/MyGoldTicker";
import goldVerificationImage from "@/assets/goldVerificationImage";

const Page = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
`;

const Section = styled.section`
  padding: clamp(26px, 3.6vw, 44px) 0;

  @media (max-width: 560px) {
    padding: 22px 0;
  }
`;

const Kicker = styled.p`
  margin: 0 0 9px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.15em;
`;

const SectionTitle = styled.h2`
  max-width: 780px;
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.5rem, 2.5vw, 2.18rem);
  line-height: 1.2;
  letter-spacing: -0.032em;
  word-break: keep-all;
`;

const SectionLead = styled.p`
  max-width: 720px;
  margin: 9px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.88rem;
  line-height: 1.62;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 900;
  }
`;

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 52px;
  padding: 13px 21px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent);
  border-radius: 14px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 900;
  text-decoration: none;
  box-shadow: 0 10px 24px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 14%, transparent);
  transition: transform ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.white};
    background: ${({ theme }) => theme.colors.primaryHover || theme.colors.primaryDark};
    transform: translateY(-2px);
  }

  @media (max-width: 560px) {
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
  font-weight: 900;
  text-decoration: none;
  transition: transform ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.secondary};
    color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
  }

  @media (max-width: 560px) {
    width: 100%;
  }
`;

const TextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.84rem;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 4px;
`;

const Hero = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  align-items: center;
  gap: clamp(24px, 4vw, 48px);
  min-height: 430px;
  padding: clamp(32px, 4.3vw, 52px) 0 clamp(30px, 4vw, 48px);

  &::before {
    content: "";
    position: absolute;
    top: 34px;
    bottom: 34px;
    left: 0;
    width: 1px;
    background: ${({ theme }) => theme.colors.secondary};
  }

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  @media (max-width: 560px) {
    padding: 28px 0 26px;

    &::before {
      top: 26px;
      bottom: 26px;
    }
  }
`;

const HeroCopy = styled.div`
  padding-left: clamp(18px, 2.8vw, 34px);
`;

const HeroKicker = styled.p`
  margin: 0 0 11px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.13em;
`;

const HeroTitle = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(2.05rem, 4.2vw, 3.55rem);
  line-height: 1.06;
  letter-spacing: -0.05em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-style: normal;
  }
`;

const HeroLead = styled.p`
  max-width: 610px;
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: clamp(0.9rem, 1.25vw, 1rem);
  line-height: 1.64;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px;
  margin-top: 18px;

  @media (max-width: 560px) {
    display: grid;
    grid-template-columns: 1fr;
  }
`;

const HeroMicro = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 7px 14px;
  margin: 13px 0 0;
  padding: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.75rem;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  svg {
    color: ${({ theme }) => theme.colors.secondary};
  }
`;

const ValueLoop = styled.aside`
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.primary});
  border-radius: 20px;
  background:
    radial-gradient(circle at 88% 8%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent), transparent 34%),
    linear-gradient(145deg, #071625 0%, #0d2034 68%, #2d291f 100%);
  color: #fff;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const ValueLoopHead = styled.div`
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  small {
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.63rem;
    font-weight: 900;
    letter-spacing: 0.13em;
  }

  strong {
    display: block;
    margin-top: 7px;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.18rem, 2vw, 1.58rem);
    line-height: 1.25;
    letter-spacing: -0.035em;
  }
`;

const ValueLoopBody = styled.div`
  display: grid;
  padding: 5px 20px 15px;
`;

const LoopStep = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 10px;
  padding: 10px 0;

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    left: 15px;
    bottom: -3px;
    width: 1px;
    height: 14px;
    background: linear-gradient(${({ theme }) => theme.colors.goldLight}, transparent);
    animation: valueFlow 2.4s ease-in-out infinite;
  }

  span {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 1px solid rgba(247, 236, 210, 0.28);
    border-radius: 50%;
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.65rem;
    font-weight: 900;
  }

  strong {
    display: block;
    margin-top: 1px;
    font-size: 0.9rem;
  }

  p {
    margin: 4px 0 0;
    color: rgba(255, 255, 255, 0.65);
    font-size: 0.72rem;
    line-height: 1.5;
  }

  @keyframes valueFlow {
    0%, 100% { opacity: 0.28; transform: translateY(-2px); }
    50% { opacity: 1; transform: translateY(3px); }
  }

  @media (prefers-reduced-motion: reduce) {
    &:not(:last-child)::after { animation: none; }
  }
`;

const LoopFooter = styled.div`
  padding: 10px 20px 11px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.12em;
`;

const ActionSection = styled(Section)`
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const ActionCard = styled(Link)`
  position: relative;
  display: flex;
  min-height: 168px;
  flex-direction: column;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  box-shadow: ${({ theme }) => theme.shadows.xs};
  transition: transform ${({ theme }) => theme.transitions.base},
    border-color ${({ theme }) => theme.transitions.base},
    box-shadow ${({ theme }) => theme.transitions.base};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.secondary};
    box-shadow: ${({ theme }) => theme.shadows.card};
    transform: translateY(-4px);
  }

  > span:first-child {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  small {
    margin-top: 14px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.6rem;
    font-weight: 900;
    letter-spacing: 0.12em;
  }

  h3 {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.05rem;
    line-height: 1.25;
    letter-spacing: -0.025em;
  }

  p {
    margin: 7px 0 12px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.72rem;
    line-height: 1.58;
    word-break: keep-all;
  }

  .go {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: auto;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.75rem;
    font-weight: 900;
  }

  &:hover .go svg {
    transform: translateX(4px);
  }

  .go svg {
    transition: transform ${({ theme }) => theme.transitions.fast};
  }
`;

const LiveSection = styled(Section)`
  margin-inline: calc(50% - 50vw);
  padding-inline: max(calc((100vw - 1180px) / 2), 20px);
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const LiveGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 14px;
  align-items: start;
  margin-top: 18px;

  > * {
    min-width: 0;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const ContinuitySection = styled(Section)`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(22px, 4vw, 46px);
  align-items: center;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const ContinuityVisual = styled.div`
  overflow: hidden;
  padding: 18px;
  border-radius: 18px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.colors.white};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const ContinuityRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  gap: 7px;
  align-items: center;
  margin: 12px 0;
  text-align: center;

  div {
    padding: 10px 7px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
  }

  span {
    display: block;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.63rem;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.8rem;
  }

  svg {
    color: ${({ theme }) => theme.colors.goldLight};
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;

    > svg {
      margin: 0 auto;
      transform: rotate(90deg);
    }
  }
`;

const ContinuityCopy = styled.div`
  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.5rem, 2.6vw, 2.18rem);
    line-height: 1.18;
    letter-spacing: -0.04em;
    word-break: keep-all;
  }

  p {
    margin: 10px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.88rem;
    line-height: 1.62;
    word-break: keep-all;
  }
`;

const CalculatorSection = styled(Section)`
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const CalculatorPanel = styled.details`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.xs};

  &[open] {
    box-shadow: ${({ theme }) => theme.shadows.card};
  }
`;

const CalculatorSummary = styled.summary`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  padding: 18px 20px;
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.35rem, 2.2vw, 1.9rem);
    line-height: 1.2;
    letter-spacing: -0.03em;
    word-break: keep-all;
  }

  p {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.82rem;
    line-height: 1.55;
    word-break: keep-all;
  }

  .open-calc {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 44px;
    padding: 10px 14px;
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.primary};
    color: #fff;
    font-size: 0.78rem;
    font-weight: 900;
    white-space: nowrap;
  }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;

    .open-calc {
      justify-content: center;
      width: 100%;
      min-height: 48px;
    }
  }
`;

const CalculatorWrap = styled.div`
  padding: 14px 14px 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const BenefitBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  padding: 13px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: ${({ theme }) => theme.colors.surface};

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.85rem;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.72rem;
    line-height: 1.5;
  }

  @media (max-width: 680px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const EmpathySection = styled(Section)`
  padding-top: clamp(20px, 2.8vw, 30px);
  padding-bottom: clamp(18px, 2.5vw, 28px);
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const EmpathyFrame = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 0.72fr) minmax(0, 1.28fr);
  gap: clamp(20px, 3vw, 36px);
  align-items: center;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const EmpathyCopy = styled.div`
  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.35rem, 2.25vw, 1.88rem);
    line-height: 1.22;
    letter-spacing: -0.04em;
    word-break: keep-all;
  }

  p {
    margin: 8px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.8rem;
    line-height: 1.68;
    word-break: keep-all;
  }
`;

const EmpathyRail = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const EmpathyItem = styled.div`
  min-height: 72px;
  padding: 11px 12px;
  border-top: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 64%, transparent);
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 72%, transparent);
  transition:
    transform ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: translateY(-4px);
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
  }

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.07em;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.76rem;
    line-height: 1.4;
    word-break: keep-all;
  }
`;

const TrustSection = styled(Section)`
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const Verification = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  overflow: hidden;
  margin-top: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const VerificationImage = styled.div`
  min-height: 250px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  img {
    width: 100%;
    height: 100%;
    min-height: 250px;
    object-fit: cover;
  }
`;

const VerificationCopy = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(20px, 3vw, 30px);
`;

const TrustList = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 16px;

  > div {
    display: grid;
    grid-template-columns: 36px 1fr;
    gap: 11px;
  }

  svg {
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.secondary};
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.84rem;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.73rem;
    line-height: 1.5;
  }
`;

const StoreMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px 14px;
  margin-top: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.72rem;

  span,
  a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: inherit;
    text-decoration: none;
  }
`;

const FinalCTA = styled(Section)`
  margin-inline: calc(50% - 50vw);
  padding-inline: max(calc((100vw - 1180px) / 2), 20px);
  background:
    radial-gradient(circle at 80% 20%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, transparent), transparent 30%),
    ${({ theme }) => theme.colors.primaryDark};
  color: #fff;
`;

const FinalInner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;

  h2 {
    margin: 0;
    color: #fff;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.55rem, 2.6vw, 2.2rem);
    line-height: 1.15;
    letter-spacing: -0.04em;
  }

  p {
    max-width: 720px;
    margin: 9px 0 0;
    color: rgba(255, 255, 255, 0.66);
    font-size: 0.86rem;
    line-height: 1.6;
    word-break: keep-all;
  }

  @media (max-width: 760px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const GoldLink = styled(Link)`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 52px;
  padding: 13px 20px;
  border: 1px solid rgba(247, 236, 210, 0.35);
  border-radius: 14px;
  background: rgba(247, 236, 210, 0.1);
  color: ${({ theme }) => theme.colors.goldLight};
  font-weight: 900;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.goldLight};
    background: rgba(247, 236, 210, 0.16);
  }
`;

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "한국골드마켓",
  alternateName: "Korea Gold Market",
  url: "https://koreagoldmarket.com/",
  description:
    "오늘 금시세부터 MY GOLD 기록·관리, 999.9 골드바 교환까지 내 금의 가치를 확인하고 이어가는 금 생활 플랫폼",
};

const ACTIONS = [
  {
    to: "/gold-price",
    title: "오늘의 금값 확인하기",
    description: "순금·18K·14K의 오늘 가격과 전일 대비 변화를 직관적으로 확인합니다.",
    action: "오늘 금시세",
    icon: Scale,
  },
  {
    to: "/my-gold?add=1",
    title: "내 금 가치 계산하기",
    description: "금 종류와 무게를 입력해 현재 가치와 예상 순금량을 바로 확인합니다.",
    action: "내 금 넣어보기",
    icon: Calculator,
  },
  {
    to: "/my-gold",
    title: "내 금고 관리하기",
    description: "내가 가진 금을 기록하고 오늘 가치와 변화, 골드바 가능 상태를 계속 관리합니다.",
    action: "MY GOLD",
    icon: Gem,
  },
  {
    to: "/gold-exchange",
    title: "999.9 골드바로 이어가기",
    description: "보유 금의 예상 순금 가치를 계산하고 999.9 골드바 교환으로 이어갑니다.",
    action: "GOLD TO GOLD",
    icon: Sparkles,
  },
];

export default function LandingPage() {
  return (
    <Page>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      <MyGoldTicker />

      <Hero aria-labelledby="landing-title">
        <HeroCopy>
          <HeroKicker>KOREA GOLD MARKET</HeroKicker>
          <HeroTitle id="landing-title">
            내 금의 가치,
            <br />
            오늘도 <em>이어집니다.</em>
          </HeroTitle>
          <HeroLead>
            14K·18K·순금까지. 내가 가진 금의 오늘 가치를 먼저 확인하고 기록해두세요.
            <strong> 가치의 변화를 관리하고, 필요할 때 999.9 골드바로 이어갈 수 있습니다.</strong>
          </HeroLead>
          <HeroActions>
            <PrimaryLink to="/my-gold?add=1">
              내 금 가치 확인하기 <ArrowRight size={18} aria-hidden />
            </PrimaryLink>
            <SecondaryLink to="/gold-exchange">
              999.9 골드바로 이어가기 <ArrowRight size={17} aria-hidden />
            </SecondaryLink>
            <TextLink to="/gold-price">
              오늘 금값 보기 <ArrowRight size={14} aria-hidden />
            </TextLink>
          </HeroActions>
          <HeroMicro>
            <li><CheckCircle2 size={15} aria-hidden /> 비회원도 MY GOLD 체험 가능</li>
            <li><CheckCircle2 size={15} aria-hidden /> 오늘 가치와 예상 순금량 확인</li>
            <li><CheckCircle2 size={15} aria-hidden /> 매장 실측 후 교환 결정</li>
          </HeroMicro>
        </HeroCopy>

        <ValueLoop aria-label="한국골드마켓 가치 흐름">
          <ValueLoopHead>
            <strong>금의 가치는<br />하나의 흐름으로 이어집니다.</strong>
          </ValueLoopHead>
          <ValueLoopBody>
            <LoopStep><span>01</span><div><strong>확인</strong><p>오늘 금시세와 내 금의 현재 가치를 확인합니다.</p></div></LoopStep>
            <LoopStep><span>02</span><div><strong>기록</strong><p>MY GOLD에 내가 가진 금을 남겨둡니다.</p></div></LoopStep>
            <LoopStep><span>03</span><div><strong>관리</strong><p>가치 변화와 예상 순금량을 계속 확인합니다.</p></div></LoopStep>
            <LoopStep><span>04</span><div><strong>교환</strong><p>필요할 때 999.9 GOLD로 가치를 이어갑니다.</p></div></LoopStep>
          </ValueLoopBody>
          <LoopFooter>확인 → 기록 → 관리 → 교환 ↺</LoopFooter>
        </ValueLoop>
      </Hero>

      <ActionSection aria-labelledby="action-title">
        <SectionTitle id="action-title">내 금으로 무엇을 할 수 있을까요?</SectionTitle>
        <SectionLead>긴 설명보다 필요한 행동부터 시작하세요. 확인한 값은 MY GOLD와 GOLD TO GOLD로 자연스럽게 이어집니다.</SectionLead>
        <ActionGrid>
          {ACTIONS.map(({ to, title, description, action, icon }) => (
            <ActionCard key={to} to={to}>
              <span>{React.createElement(icon, { size: 20, "aria-hidden": true })}</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="go">{action} <ArrowRight size={14} aria-hidden /></span>
            </ActionCard>
          ))}
        </ActionGrid>
      </ActionSection>

      <LiveSection aria-labelledby="live-value-title">
        <SectionTitle id="live-value-title">오늘 금값이 바뀌면, 내 금의 가치도 함께 바뀝니다.</SectionTitle>
        <SectionLead>
          시세는 숫자로 끝나지 않습니다. <strong>MY GOLD에 기록한 내 금의 오늘 가치와 변화</strong>로 바로 연결됩니다.
        </SectionLead>
        <LiveGrid>
          <MyGoldIntroCard />
          <GoldPriceBoard />
        </LiveGrid>
        <BenefitBanner>
          <div>
            <small>MEMBER GOLD</small>
            <strong>한국골드마켓을 시작하면 최대 순금 0.03g</strong>
            <p>회원가입 +0.01g · 퀵퀴즈 +0.01g · 금시세 알림 +0.01g</p>
          </div>
          <TextLink to="/quiz/gold-bonus">순금 혜택 보기 <Sparkles size={15} aria-hidden /></TextLink>
        </BenefitBanner>
      </LiveSection>

      <EmpathySection aria-labelledby="empathy-title">
        <EmpathyFrame>
          <EmpathyCopy>
            <h2 id="empathy-title">서랍 속에 오래 머문 금도,<br />가치는 그대로 남아 있습니다.</h2>
            <p>지금 자주 사용하지 않는 금을 떠올려보세요. GOLD TO GOLD는 그 안에 남아 있는 금의 가치를 새로운 형태로 이어가는 방법입니다.</p>
          </EmpathyCopy>
          <EmpathyRail aria-label="GOLD TO GOLD 공감 사례">
            <EmpathyItem><strong>끊어진 목걸이·팔찌</strong></EmpathyItem>
            <EmpathyItem><strong>한쪽만 남은 귀걸이</strong></EmpathyItem>
            <EmpathyItem><strong>오래된 14K·18K</strong></EmpathyItem>
            <EmpathyItem><strong>아이의 돌반지</strong></EmpathyItem>
          </EmpathyRail>
        </EmpathyFrame>
      </EmpathySection>

      <ContinuitySection aria-labelledby="gold-to-gold-title">
        <ContinuityVisual aria-hidden>
          <Kicker style={{ color: "#F7ECD2" }}>GOLD TO GOLD</Kicker>
          <ContinuityRow>
            <div><span>가지고 있는 금</span><strong>14K · 18K · 순금</strong></div>
            <ArrowRight size={18} />
            <div><span>가치 확인</span><strong>예상 순금량</strong></div>
            <ArrowRight size={18} />
            <div><span>가치 이어가기</span><strong>999.9 GOLD</strong></div>
          </ContinuityRow>
          <p style={{ margin: 0, color: "rgba(255,255,255,.64)", fontSize: ".73rem", lineHeight: 1.55 }}>
            온라인 계산은 예상값이며 최종 순도와 중량은 매장 실측 후 확정됩니다.
          </p>
        </ContinuityVisual>
        <ContinuityCopy>
          <h2 id="gold-to-gold-title">쓰임이 달라진 금,<br />999.9 GOLD로 이어보세요.</h2>
          <p>
            순도와 중량을 기준으로 예상 순금량을 확인하고, 실물 999.9 골드바라는 새로운 형태로 금의 가치를 이어갈 수 있습니다.
          </p>
          <HeroActions>
            <PrimaryLink to="/gold-to-gold">GOLD TO GOLD 시작하기 <ArrowRight size={17} aria-hidden /></PrimaryLink>
          </HeroActions>
        </ContinuityCopy>
      </ContinuitySection>

      <CalculatorSection aria-labelledby="calculator-title">
        <CalculatorPanel>
          <CalculatorSummary>
            <div>
              <h2 id="calculator-title">내 금은 어떤 999.9 골드바가 될까요?</h2>
              <p>필요할 때 펼쳐서 종류와 중량만 입력하면 예상 순금량과 가능한 골드바 조합을 확인할 수 있습니다.</p>
            </div>
            <span className="open-calc">바로 계산하기 <Calculator size={16} aria-hidden /></span>
          </CalculatorSummary>
          <CalculatorWrap><LiteCalcFromGX showCombo /></CalculatorWrap>
        </CalculatorPanel>
      </CalculatorSection>

      <TrustSection aria-labelledby="trust-title">
        <SectionTitle id="trust-title">온라인에서 확인하고, 실제 매장에서 다시 확인합니다.</SectionTitle>
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
            <Kicker>원일귀금속 직접 운영</Kicker>
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
            <TextLink to="/stores" style={{ marginTop: "18px", alignSelf: "flex-start" }}>
              교환 절차·매장 자세히 보기 <ArrowRight size={14} aria-hidden />
            </TextLink>
          </VerificationCopy>
        </Verification>
      </TrustSection>

      <FinalCTA aria-labelledby="final-cta-title">
        <FinalInner>
          <div>
            <Kicker style={{ color: "#F7ECD2" }}>KOREA GOLD MARKET</Kicker>
            <h2 id="final-cta-title">내 금의 가치를<br />오늘부터 이어가세요.</h2>
            <p>먼저 확인하고 기록해두세요. 오늘의 변화는 MY GOLD에서 관리하고, 필요할 때 999.9 골드바로 이어갈 수 있습니다.</p>
          </div>
          <div>
            <GoldLink to="/my-gold?add=1">MY GOLD 시작하기 <ArrowRight size={17} aria-hidden /></GoldLink>
          </div>
        </FinalInner>
      </FinalCTA>
    </Page>
  );
}
