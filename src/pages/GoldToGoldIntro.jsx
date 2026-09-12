// src/pages/GoldToGoldIntro.jsx
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import LivingGoldCompanion from "@/components/common/LivingGoldCompanion";
import { livingGoldJourney } from "@/styles/livingGoldMotion";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Gem,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const Page = styled.main`
  display: grid;
  gap: 0;
  width: min(100%, 1080px);
  margin: 0 auto;
  padding: 0 18px 28px;

  @media (max-width: 640px) {
    padding: 0 10px 18px;
  }
`;

const Kicker = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.12em;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Hero = styled.section`
  position: relative;
  display: flex;
  min-height: clamp(225px, 31vh, 300px);
  flex-direction: column;
  justify-content: center;
  padding: clamp(28px, 4vw, 44px) clamp(8px, 4vw, 38px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &::before {
    content: "";
    width: 48px;
    height: 1px;
    margin-bottom: 14px;
    background: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 78%, transparent);
  }

  &::after {
    content: "G";
    position: absolute;
    right: clamp(-10px, 0vw, 8px);
    bottom: -24px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 4%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(5.8rem, 13vw, 8.8rem);
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 640px) {
    min-height: 205px;
    padding: 22px 4px 20px;

    &::before {
      margin-bottom: 10px;
    }

    &::after {
      display: none;
    }
  }
`;


const HeroGoldScene = styled.div`
  position: absolute;
  z-index: 2;
  top: 50%;
  right: clamp(14px, 4vw, 42px);
  display: grid;
  justify-items: center;
  gap: 4px;
  transform: translateY(-50%);
  pointer-events: auto;

  small {
    color: color-mix(in srgb, ${({ theme }) => theme.colors.secondaryDark} 74%, transparent);
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.54rem;
    font-weight: 900;
    letter-spacing: 0.12em;
  }

  @media (max-width: 640px) {
    top: 34px;
    right: 2px;
    transform: none;

    > span {
      transform: scale(.7);
      transform-origin: top right;
    }
    small { display: none; }
  }
`;

const HeroTitle = styled.h1`
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 10px 0 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.7rem, 3.35vw, 2.7rem);
  line-height: 1.04;
  letter-spacing: -0.045em;
  word-break: keep-all;

  span {
    display: block;
    margin-bottom: 3px;
    font-size: 0.76em;
    font-weight: 700;
    letter-spacing: -0.035em;
  }

  em {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 1.04em;
    font-style: normal;
    font-weight: 700;
    letter-spacing: -0.035em;
  }

  @media (max-width: 640px) {
    max-width: calc(100% - 64px);
    margin-top: 8px;
    font-size: 1.62rem;
    line-height: 1.06;
  }
`;

const HeroCopy = styled.p`
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: clamp(0.84rem, 1.35vw, 0.96rem);
  line-height: 1.72;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 900;
  }

  @media (max-width: 640px) {
    max-width: calc(100% - 52px);
    margin-top: 12px;
    font-size: 0.81rem;
    line-height: 1.58;
  }
`;


const StorySection = styled.section`
  padding: clamp(26px, 4.4vw, 44px) 0 0;

  @media (max-width: 640px) {
    padding-top: 22px;
  }
`;

const StoryHead = styled.div`
  padding: 0 4px clamp(14px, 2.4vw, 22px);

  small {
    display: block;
    margin-bottom: 8px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.61rem;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  h2 {
    max-width: 720px;
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.45rem, 3vw, 2.15rem);
    line-height: 1.18;
    letter-spacing: -0.045em;
    word-break: keep-all;
  }

  @media (max-width: 640px) {
    padding: 0 4px 12px;

    small {
      margin-bottom: 6px;
      font-size: 0.62rem;
    }

    h2 {
      font-size: 1.34rem;
      line-height: 1.22;
    }
  }
`;

const StoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 760px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StoryItem = styled.article`
  position: relative;
  min-height: 122px;
  padding: 18px 16px 17px;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  transition:
    transform ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast};

  &:last-child {
    border-right: 0;
  }

  &:hover {
    transform: translateY(-3px);
    background: color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 44%, transparent);
  }

  > span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 11px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg {
    width: 17px;
    height: 17px;
  }

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.9rem;
    line-height: 1.42;
    word-break: keep-all;
  }

  p {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.7rem;
    line-height: 1.55;
    word-break: keep-all;
  }

  @media (max-width: 760px) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};

    &:nth-child(2n) {
      border-right: 0;
    }

    &:nth-last-child(-n + 2) {
      border-bottom: 0;
    }
  }

  @media (max-width: 430px) {
    min-height: 104px;
    padding: 13px 10px 12px;

    > span {
      gap: 5px;
      margin-bottom: 8px;
    }

    svg {
      width: 15px;
      height: 15px;
    }

    small {
      font-size: 0.62rem;
      letter-spacing: 0.05em;
    }

    strong {
      font-size: 0.8rem;
      line-height: 1.35;
    }

    p {
      margin-top: 5px;
      font-size: 0.61rem;
      line-height: 1.42;
    }

    &:nth-last-child(2) {
      border-bottom: 0;
    }
  }
`;

const FutureSection = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(250px, 0.85fr);
  gap: clamp(22px, 4vw, 48px);
  align-items: center;
  margin-top: clamp(28px, 4vw, 46px);
  padding: clamp(26px, 4vw, 42px) clamp(16px, 2.6vw, 28px);
  border-top: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 36%, ${({ theme }) => theme.colors.border});
  border-bottom: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 36%, ${({ theme }) => theme.colors.border});
  background: linear-gradient(
    90deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 74%, transparent),
    color-mix(in srgb, ${({ theme }) => theme.colors.surface} 58%, transparent)
  );

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 640px) {
    gap: 12px;
    margin-top: 24px;
    padding: 20px 14px;
  }
`;

const FutureCopy = styled.div`
  h2 {
    margin: 8px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.5rem, 3.2vw, 2.25rem);
    line-height: 1.17;
    letter-spacing: -0.045em;
    word-break: keep-all;
  }

  p {
    max-width: 610px;
    margin: 8px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.76rem;
    line-height: 1.72;
    word-break: keep-all;
  }

  @media (max-width: 640px) {
    h2 {
      margin-top: 6px;
      font-size: 1.38rem;
      line-height: 1.2;
    }

    p {
      margin-top: 7px;
      font-size: 0.69rem;
      line-height: 1.56;
    }

    p:nth-of-type(2) {
      display: none;
    }
  }
`;

const FutureQuote = styled.aside`
  padding: 9px 0 9px clamp(18px, 2.5vw, 28px);
  border-left: 3px solid ${({ theme }) => theme.colors.secondary};

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.62rem;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  strong {
    display: block;
    margin-top: 10px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.3rem, 2.65vw, 1.8rem);
    line-height: 1.3;
    letter-spacing: -0.04em;
    word-break: keep-all;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 14px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.69rem;
    font-weight: 850;
    line-height: 1.4;
  }

  @media (max-width: 640px) {
    padding: 10px 0 0 14px;

    small {
      display: none;
    }

    strong {
      margin-top: 0;
      font-size: 1.12rem;
      line-height: 1.3;
    }

    span {
      display: none;
    }
  }
`;

const DarkStory = styled.section`
  overflow: hidden;
  margin-top: clamp(28px, 4vw, 46px);
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};

  @media (max-width: 640px) {
    margin-top: 24px;
    border-radius: 16px;
  }
`;

const DarkHead = styled.div`
  padding: clamp(22px, 3.2vw, 32px) clamp(20px, 3.4vw, 32px) 16px;

  small {
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.6rem;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  h2 {
    max-width: 720px;
    margin: 9px 0 0;
    color: ${({ theme }) => theme.colors.white};
    font-size: clamp(1.5rem, 3.05vw, 2.15rem);
    line-height: 1.18;
    letter-spacing: -0.04em;
    word-break: keep-all;
  }

  p {
    max-width: 780px;
    margin: 8px 0 0;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 76%, white);
    font-size: 0.74rem;
    line-height: 1.65;
    word-break: keep-all;
  }

  @media (max-width: 640px) {
    padding: 18px 16px 13px;

    small {
      font-size: 0.62rem;
    }

    h2 {
      margin-top: 7px;
      font-size: 1.34rem;
      line-height: 1.18;
    }

    p {
      margin-top: 7px;
      font-size: 0.68rem;
      line-height: 1.52;
    }
  }
`;

const Flow = styled.div`
  position: relative;
  display: grid;
  overflow: hidden;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 11px;
  padding: 16px clamp(20px, 3.4vw, 32px) 20px;
  border-top: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent);

  &::after {
    content: "";
    position: absolute;
    z-index: 2;
    top: 1px;
    left: 4%;
    width: 9px;
    height: 9px;
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 82%, white);
    border-radius: 50%;
    background: ${({ theme }) => theme.gradients.gold};
    box-shadow: 0 0 0 4px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 8%, transparent), 0 2px 8px rgba(0,0,0,.18);
    animation: ${livingGoldJourney} 4.6s cubic-bezier(.2,.8,.2,1) 900ms infinite;
    pointer-events: none;
  }

  > svg {
    color: ${({ theme }) => theme.colors.goldLight};
    opacity: 0.82;
    transition: transform ${({ theme }) => theme.transitions.fast};
  }

  &:hover > svg {
    transform: translateX(4px);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 4px;
    padding: 13px 14px 15px;

    > svg,
    &:hover > svg {
      width: 16px;
      height: 16px;
      transform: none;
      justify-self: center;
      margin-left: 0;
    }
  }
`;

const FlowItem = styled.div`
  min-height: 56px;
  padding: 6px 0;

  span {
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 66%, white);
    font-size: 0.61rem;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: ${({ theme }) => theme.colors.white};
    font-size: clamp(0.92rem, 1.8vw, 1.08rem);
    line-height: 1.35;
    word-break: keep-all;
  }

  @media (max-width: 640px) {
    min-height: 0;
    padding: 2px 0;

    span {
      display: none;
    }

    strong {
      margin-top: 0;
      font-size: 0.7rem;
      line-height: 1.3;
    }
  }
`;

const DarkFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 11px clamp(20px, 3.4vw, 32px);
  border-top: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent);
  background: color-mix(in srgb, ${({ theme }) => theme.colors.primaryDark} 38%, transparent);

  p {
    margin: 0;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 74%, white);
    font-size: 0.7rem;
    line-height: 1.5;
    word-break: keep-all;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.72rem;
    font-weight: 900;
    text-decoration: none;
  }

  @media (max-width: 640px) {
    display: none;
  }
`;

const CTA = styled.section`
  margin-top: clamp(28px, 4vw, 46px);
  padding: clamp(24px, 3.7vw, 36px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 35%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};

  h2 {
    max-width: 760px;
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.5rem, 3.2vw, 2.25rem);
    line-height: 1.2;
    letter-spacing: -0.04em;
    word-break: keep-all;
  }

  > p {
    max-width: 730px;
    margin: 11px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.76rem;
    line-height: 1.65;
    word-break: keep-all;
  }

  @media (max-width: 640px) {
    margin-top: 24px;
    padding: 20px 16px;
    border-radius: 18px;

    h2 {
      font-size: 1.38rem;
      line-height: 1.2;
    }

    > p {
      margin-top: 8px;
      font-size: 0.68rem;
      line-height: 1.52;
    }
  }
`;

const FactRail = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;

  @media (max-width: 640px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-top: 12px;
  }
`;

const Fact = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 999px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 84%, transparent);
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.68rem;
  font-weight: 800;

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  @media (max-width: 640px) {
    justify-content: center;
    min-height: 0;
    padding: 7px 5px;
    border-radius: 12px;
    font-size: 0.62rem;
    line-height: 1.25;
    text-align: center;

    svg {
      width: 12px;
      height: 12px;
      flex: 0 0 auto;
    }
  }
`;

const CTAButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 15px;

  @media (max-width: 640px) {
    margin-top: 14px;
  }
`;

const PrimaryAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 48px;
  padding: 12px 17px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.83rem;
  font-weight: 900;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.goldLight};
  }

  @media (max-width: 640px) {
    width: 100%;
    min-height: 48px;
    padding: 11px 13px;
    font-size: 0.77rem;
  }
`;

const SecondaryAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 48px;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.77rem;
  font-weight: 850;
  text-decoration: none;

  @media (max-width: 640px) {
    display: none;
  }
`;

const TinyLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 11px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.67rem;
  font-weight: 850;
  text-decoration: none;

  @media (max-width: 640px) {
    margin-top: 10px;
    font-size: 0.62rem;
  }
`;

export default function GoldToGoldIntro() {
  return (
    <Page>
      <Hero>
        <HeroGoldScene>
          <LivingGoldCompanion
            size={84}
            delay={120}
            hint
            ariaLabel="Living Gold로 GOLD TO GOLD 알아보기"
            title="금의 가치는 이어지고 있어요."
            description="모양은 달라져도 금의 가치는 999.9 GOLD로 이어갈 수 있어요. 지금 가진 금으로 얼마나 이어지는지 확인해 보세요."
            actionLabel="내 금으로 확인하기"
            actionTo="/gold-exchange"
          />
          <small>VALUE → GOLD</small>
        </HeroGoldScene>
        <Kicker>
          <Sparkles aria-hidden />
          KOREA GOLD MARKET · GOLD TO GOLD
        </Kicker>
        <HeroTitle>
          <span>한국골드마켓의</span>
          <em>GOLD TO GOLD란?</em>
        </HeroTitle>
        <HeroCopy>
          가지고 있는 금의 가치를 <strong>현금으로 끝내지 않고, 금으로 이어가는 방법</strong>입니다.
        </HeroCopy>
      </Hero>

      <StorySection>
        <StoryHead>
          <h2>지금 사용하지 않는 금도<br />가치는 그대로 남아 있습니다.</h2>
        </StoryHead>
        <StoryGrid>
          <StoryItem>
            <span><Gem aria-hidden /></span>
            <strong>끊어진 목걸이·팔찌</strong>
            <p>다시 착용하지 않아도 금의 가치는 남습니다.</p>
          </StoryItem>
          <StoryItem>
            <span><Sparkles aria-hidden /></span>
            <strong>한쪽만 남은 귀걸이</strong>
            <p>한 쌍이 아니어도 금으로서의 가치는 그대로입니다.</p>
          </StoryItem>
          <StoryItem>
            <span><CheckCircle2 aria-hidden /></span>
            <strong>오래된 14K·18K</strong>
            <p>취향과 디자인은 달라져도 금의 가치는 남습니다.</p>
          </StoryItem>
          <StoryItem>
            <span><CircleDollarSign aria-hidden /></span>
            <strong>아이의 돌반지</strong>
            <p>아이의 미래를 위해 그 가치를 이어둘 수 있습니다.</p>
          </StoryItem>
        </StoryGrid>
      </StorySection>

      <FutureSection>
        <FutureCopy>
          <h2>돌반지의 가치,<br />아이의 미래로 이어갑니다.</h2>
          <p>
            돌잔치 날 아이를 위해 받은 작은 금반지. 아이가 자라 더 이상 착용하지 않게 되어도
            그 안에 담긴 마음과 금의 가치는 그대로 남아 있습니다.
          </p>
          <p>
            <strong>999.9 실물 골드바라는 새로운 형태로</strong> 아이의 금 가치를 오래 이어두는 것도 하나의 방법입니다.
          </p>
        </FutureCopy>
        <FutureQuote>
          <strong>추억은 마음에,<br />금의 가치는 미래에.</strong>
          <span><ShieldCheck aria-hidden /> 실물 999.9 골드바 형태로 가치 이어가기</span>
        </FutureQuote>
      </FutureSection>

      <DarkStory>
        <DarkHead>
          <h2>모양은 달라져도,<br />금의 가치는 이어집니다.</h2>
          <p>
            보유 금의 순금 가치를 확인해 999.9 골드바라는 새로운 형태로 이어가는 한국골드마켓의 금교환 서비스입니다.
          </p>
        </DarkHead>
        <Flow>
          <FlowItem>
            <span>지금 가지고 있는 금</span>
            <strong>14K · 18K · 순금</strong>
          </FlowItem>
          <ArrowRight aria-hidden />
          <FlowItem>
            <span>가치 확인</span>
            <strong>순도 · 중량 → 예상 순금량</strong>
          </FlowItem>
          <ArrowRight aria-hidden />
          <FlowItem>
            <span>가치 이어가기</span>
            <strong>999.9 GOLD</strong>
          </FlowItem>
        </Flow>
        <DarkFooter>
          <p>아직 교환할지 결정하지 않아도 됩니다. 먼저 내 금의 오늘 가치를 기록해둘 수 있습니다.</p>
          <Link to="/my-gold?add=1">MY GOLD에 먼저 기록하기 <ArrowRight size={14} aria-hidden /></Link>
        </DarkFooter>
      </DarkStory>

      <CTA>
        <h2>그 금, 지금 얼마나 많은<br />999.9 GOLD가 될까요?</h2>
        <p>
          금 종류와 중량만 입력하면 예상 순금량과 가능한 골드바 조합을 먼저 확인할 수 있습니다.
        </p>
        <FactRail aria-label="교환 확인 절차">
          <Fact><CheckCircle2 aria-hidden /> 온라인 예상 계산</Fact>
          <Fact><ShieldCheck aria-hidden /> 매장 순도·중량 실측</Fact>
          <Fact><CheckCircle2 aria-hidden /> 공임 확인 후 최종 결정</Fact>
        </FactRail>
        <CTAButtons>
          <PrimaryAction to="/gold-exchange">
            <CircleDollarSign aria-hidden />
            내 금으로 받을 골드바 계산하기
            <ArrowRight aria-hidden />
          </PrimaryAction>
          <SecondaryAction to="/my-gold?add=1">
            MY GOLD에 먼저 기록하기
            <ArrowRight size={15} aria-hidden />
          </SecondaryAction>
        </CTAButtons>
        <TinyLink to="/goldbar-fee">
          골드바 제작 공임 확인 <ArrowRight size={13} aria-hidden />
        </TinyLink>
      </CTA>
    </Page>
  );
}
