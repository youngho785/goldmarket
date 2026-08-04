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
import goldVerificationImage from "@/assets/goldVerificationImage";

const Page = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
`;

const Hero = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(390px, .95fr);
  align-items: center;
  gap: clamp(34px, 5vw, 68px);
  min-height: 590px;
  padding: clamp(44px, 6vw, 78px) 0 clamp(40px, 5vw, 64px);

  &::before {
    content: "";
    position: absolute;
    top: 42px;
    bottom: 42px;
    left: 0;
    width: 1px;
    background: ${({ theme }) => theme.colors.secondary};
  }

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    min-height: auto;
    padding-left: 24px;
  }

  @media (max-width: 540px) {
    padding-top: 42px;
    padding-left: 16px;
  }
`;

const HeroCopy = styled.div`
  max-width: 730px;
  padding-left: clamp(28px, 4vw, 52px);

  @media (max-width: 540px) { padding-left: 12px; }
`;

const Eyebrow = styled.p`
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 26px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .75rem;
  font-weight: 850;
  letter-spacing: .16em;

  &::before {
    content: "";
    width: 30px;
    height: 1px;
    background: currentColor;
  }
`;

const HeroTitle = styled.h1`
  margin: 0;
  max-width: 760px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(2.4rem, 5vw, 4.5rem);
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.035em;

  span { color: ${({ theme }) => theme.colors.secondaryDark}; }
`;

const HeroLead = styled.p`
  max-width: 630px;
  margin: 22px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: clamp(1rem, 1.6vw, 1.1rem);
  line-height: 1.75;
  word-break: keep-all;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
`;

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 54px;
  padding: 13px 24px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 850;

  &:hover {
    color: ${({ theme }) => theme.colors.white};
    background: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const SecondaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
  padding: 13px 22px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 800;

  &:hover { border-color: ${({ theme }) => theme.colors.secondary}; }
`;

const HeroChecks = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .86rem;
  font-weight: 750;

  li {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  svg { color: ${({ theme }) => theme.colors.secondary}; }
`;

const CalculatorWrap = styled.div`
  position: relative;
  z-index: 1;

  &::before,
  &::after {
    content: "";
    position: absolute;
    z-index: -1;
    border: 1px solid ${({ theme }) => theme.colors.secondary}55;
  }
  &::before {
    width: 84px;
    height: 84px;
    right: -22px;
    top: -24px;
  }
  &::after {
    width: 52px;
    height: 52px;
    left: -18px;
    bottom: -18px;
  }
`;

const PrincipleStrip = styled.section`
  display: grid;
  grid-template-columns: 1.08fr repeat(3, 1fr);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 900px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const PrincipleIntro = styled.div`
  padding: 26px 30px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};

  span {
    display: block;
    margin-bottom: 6px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .66rem;
    letter-spacing: .13em;
  }
  strong {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.25rem;
    font-weight: 600;
  }
`;

const Principle = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 13px;
  padding: 24px;
  border-left: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 560px) { border-left: 0; border-top: 1px solid ${({ theme }) => theme.colors.border}; }
`;

const PrincipleNo = styled.span`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .7rem;
  font-weight: 850;
`;

const PrincipleText = styled.div`
  strong {
    display: block;
    margin-bottom: 4px;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.05rem;
  }
  p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .82rem; line-height: 1.55; }
`;

const Section = styled.section`
  padding: clamp(64px, 8vw, 100px) 0;
`;

const SectionHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 30px;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 26px;
  }
`;

const SectionKicker = styled.p`
  margin-bottom: 10px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .7rem;
  font-weight: 850;
  letter-spacing: .15em;
`;

const SectionTitle = styled.h2`
  max-width: 720px;
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
`;

const SectionLead = styled.p`
  max-width: 510px;
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.8;
`;

const WhySection = styled(Section)`
  padding-bottom: clamp(58px, 7vw, 86px);
`;

const WhyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const WhyCard = styled.article`
  min-height: 195px;
  padding: clamp(21px, 2.6vw, 30px);
  border-left: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    border-left: 0;
  }

  svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  h3 {
    margin: 18px 0 8px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.15rem, 2vw, 1.4rem);
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.62;
    word-break: keep-all;
  }

  @media (max-width: 760px) {
    min-height: auto;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    border-left: 0;

    &:first-child {
      border-top: 0;
    }
  }
`;

const ExchangeMeaning = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: stretch;
  margin-top: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const MeaningSide = styled.div`
  padding: clamp(25px, 3.5vw, 40px);

  small {
    display: block;
    margin-bottom: 13px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .68rem;
    font-weight: 850;
    letter-spacing: .13em;
  }

  strong {
    display: block;
    margin-bottom: 10px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.25rem, 2.4vw, 1.7rem);
  }

  p {
    max-width: 420px;
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.62;
    word-break: keep-all;
  }
`;

const MeaningArrow = styled.div`
  display: grid;
  place-items: center;
  min-width: 86px;
  color: ${({ theme }) => theme.colors.white};
  background: ${({ theme }) => theme.colors.primary};

  span {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border: 1px solid ${({ theme }) => theme.colors.secondary};
    border-radius: 50%;
  }

  @media (max-width: 720px) {
    min-height: 70px;

    svg {
      transform: rotate(90deg);
    }
  }
`;

const WhyCTA = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-top: 18px;
  padding: 24px 28px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
    line-height: 1.6;
    word-break: keep-all;
  }

  @media (max-width: 680px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const ProcessGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 760px) { grid-template-columns: 1fr; }
`;

const ProcessCard = styled.article`
  position: relative;
  min-height: 215px;
  padding: clamp(23px, 3vw, 33px);
  border-left: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child { border-left: 0; }

  @media (max-width: 760px) {
    min-height: auto;
    border-left: 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    &:first-child { border-top: 0; }
  }
`;

const StepMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .68rem;
  font-weight: 850;
  letter-spacing: .12em;

  svg { color: ${({ theme }) => theme.colors.primary}; }
`;

const StepTitle = styled.h3`
  margin-bottom: 10px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.4rem, 2.6vw, 1.85rem);
`;

const StepText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Verification = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr);
  min-height: 520px;
  margin: clamp(58px, 7vw, 90px) 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const VerificationImage = styled.div`
  position: relative;
  min-height: 460px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    box-shadow: inset -80px 0 100px rgba(13, 32, 52, .12);
    pointer-events: none;
  }

  @media (max-width: 900px) { min-height: 360px; }
  @media (max-width: 540px) { min-height: 280px; }
`;

const VerificationCopy = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(32px, 5vw, 58px);
`;

const VerificationList = styled.ul`
  display: grid;
  gap: 18px;
  margin: 26px 0 30px;

  li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  svg { margin-top: 4px; color: ${({ theme }) => theme.colors.success}; }
  strong { display: block; color: ${({ theme }) => theme.colors.primary}; }
`;

const StoreMeta = styled.div`
  display: grid;
  gap: 9px;
  padding-top: 22px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .88rem;

  span, a { display: flex; align-items: center; gap: 9px; }
  svg { color: ${({ theme }) => theme.colors.secondaryDark}; }
`;

const EvidenceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  @media (max-width: 780px) { grid-template-columns: 1fr; }
`;

const EvidenceCard = styled.article`
  min-height: 185px;
  padding: 23px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  svg { color: ${({ theme }) => theme.colors.secondaryDark}; }
  h3 { margin: 19px 0 8px; }
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.6;
  }
`;

const QuizBanner = styled.section`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 28px;
  margin: 24px 0 clamp(64px, 7vw, 90px);
  padding: clamp(28px, 4vw, 44px);
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  overflow: hidden;

  h2 {
    margin: 6px 0 9px;
    color: ${({ theme }) => theme.colors.white};
  }
  p { margin: 0; color: ${({ theme }) => theme.colors.goldLight}; }

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

const QuizMeta = styled.span`
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .7rem;
  font-weight: 850;
  letter-spacing: .14em;
`;

const QuizLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 52px;
  padding: 13px 20px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.colors.secondary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 850;
  white-space: nowrap;

  &:hover { color: ${({ theme }) => theme.colors.white}; filter: brightness(1.08); }
`;

const FAQGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 24px;

  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const FAQ = styled.details`
  padding: 19px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child { border-bottom: 1px solid ${({ theme }) => theme.colors.border}; }
  summary {
    cursor: pointer;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
  }
  p {
    margin: 13px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.75;
  }
`;

const FinalCTA = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 30px;
  margin: 0 0 68px;
  padding: clamp(32px, 5vw, 54px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 112px;
    height: 3px;
    background: ${({ theme }) => theme.colors.secondary};
  }

  h2 { margin-bottom: 9px; }
  p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; }

  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "한국골드마켓 골드바 교환",
  description:
    "보유한 금의 예상 순금 중량과 골드바 조합을 확인하고 부산 범천동 원일귀금속 매장에서 실측 후 교환하는 서비스",
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
  const scrollToWhyExchange = (event) => {
    event.preventDefault();
    const section = document.getElementById("why-exchange");
    if (!section) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({
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

      <Hero aria-labelledby="landing-title">
        <HeroCopy>
          <Eyebrow>GOLD EXCHANGE STANDARD</Eyebrow>
          <HeroTitle id="landing-title">
            보관만 하던 금,
            <br />
            <span>999.9 골드바</span>로
            <br />
            다시 정리하세요
          </HeroTitle>
          <HeroLead>
            끊어진 목걸이, 한 짝만 남은 귀걸이, 유행이 지난 반지에도 금의 가치는
            남아 있습니다. 사용하지 않는 귀금속을 순도와 중량이 분명한 골드바로
            바꾸고, 금의 형태로 계속 보유하세요.
          </HeroLead>
          <Actions>
            <PrimaryLink to="/gold-exchange">
              내 금으로 받을 골드바 계산
              <ArrowRight size={18} aria-hidden />
            </PrimaryLink>
            <SecondaryLink
              as="a"
              href="#why-exchange"
              onClick={scrollToWhyExchange}
            >
              왜 교환하는지 보기
            </SecondaryLink>
          </Actions>
          <HeroChecks aria-label="교환 원칙">
            <li><CheckCircle2 size={15} aria-hidden /> 고객 앞에서 현장 실측</li>
            <li><CheckCircle2 size={15} aria-hidden /> 공임 사전 공개</li>
            <li><CheckCircle2 size={15} aria-hidden /> 동의 후 교환 확정</li>
          </HeroChecks>
        </HeroCopy>
        <CalculatorWrap>
          <LiteCalcFromGX showCombo />
        </CalculatorWrap>
      </Hero>

      <WhySection id="why-exchange" aria-labelledby="why-exchange-title">
        <SectionHead>
          <div>
            <SectionKicker>WHY GOLD EXCHANGE</SectionKicker>
            <SectionTitle id="why-exchange-title">
              금을 파는 대신,
              <br />
              다시 쓰기 좋은 금으로 바꿉니다
            </SectionTitle>
          </div>
          <SectionLead>
            교환의 핵심은 금을 처분하는 것이 아닙니다. 사용하기 어려워진 귀금속을
            규격과 중량을 확인하기 쉬운 999.9 골드바로 정리해 금으로 계속
            보유하는 것입니다.
          </SectionLead>
        </SectionHead>

        <WhyGrid>
          <WhyCard>
            <Sparkles size={30} aria-hidden />
            <h3>잠든 금을 다시 활용</h3>
            <p>
              끊어졌거나 유행이 지난 귀금속도 금 자체의 가치는 남아 있습니다.
              착용하지 않고 보관만 하던 금을 새로운 형태로 활용할 수 있습니다.
            </p>
          </WhyCard>
          <WhyCard>
            <Scale size={30} aria-hidden />
            <h3>순도와 중량을 한눈에</h3>
            <p>
              종류가 다른 여러 귀금속을 실측한 뒤, 999.9 골드바의 규격과
              개수로 정리해 보유 중량을 더 쉽게 확인할 수 있습니다.
            </p>
          </WhyCard>
          <WhyCard>
            <ShieldCheck size={30} aria-hidden />
            <h3>현금화 없이 금으로 보유</h3>
            <p>
              금을 현금으로 처분하는 대신 골드바로 바꿉니다. 교환 결과와
              공임을 먼저 확인하고 원하는 경우에만 진행할 수 있습니다.
            </p>
          </WhyCard>
        </WhyGrid>

        <ExchangeMeaning aria-label="금교환 전과 후">
          <MeaningSide>
            <small>BEFORE · 교환 전</small>
            <strong>서랍 속 여러 귀금속</strong>
            <p>
              깨진 반지, 한 짝 귀걸이, 오래된 목걸이처럼 사용하지 않으면서
              실제 순금 중량은 알기 어려운 상태
            </p>
          </MeaningSide>
          <MeaningArrow aria-hidden>
            <span><ArrowRight size={20} /></span>
          </MeaningArrow>
          <MeaningSide>
            <small>AFTER · 교환 후</small>
            <strong>중량이 표시된 999.9 골드바</strong>
            <p>
              현장에서 확인한 순금 중량을 기준으로 선택한 골드바 조합과
              남은 중량을 함께 확인할 수 있는 상태
            </p>
          </MeaningSide>
        </ExchangeMeaning>

        <WhyCTA>
          <p>
            내 금이 어떤 골드바로 바뀌는지 먼저 계산해 보세요.
            <br />
            로그인 없이 예상 결과를 확인할 수 있습니다.
          </p>
          <PrimaryLink to="/gold-exchange">
            내 골드바 조합 확인
            <ArrowRight size={18} aria-hidden />
          </PrimaryLink>
        </WhyCTA>
      </WhySection>

      <PrincipleStrip aria-label="확인 가능한 교환 원칙">
        <PrincipleIntro>
          <span>TRANSPARENT EXCHANGE POLICY</span>
          <strong>확인 가능한 교환 원칙</strong>
        </PrincipleIntro>
        <Principle>
          <PrincipleNo>01</PrincipleNo>
          <PrincipleText>
            <strong>현장 실측</strong>
            <p>고객이 보는 앞에서 순도와 중량을 확인합니다.</p>
          </PrincipleText>
        </Principle>
        <Principle>
          <PrincipleNo>02</PrincipleNo>
          <PrincipleText>
            <strong>비용 사전 안내</strong>
            <p>교환 적용 중량과 제작 공임을 먼저 안내합니다.</p>
          </PrincipleText>
        </Principle>
        <Principle>
          <PrincipleNo>03</PrincipleNo>
          <PrincipleText>
            <strong>동의 후 확정</strong>
            <p>측정 결과와 조건을 확인한 경우에만 진행합니다.</p>
          </PrincipleText>
        </Principle>
      </PrincipleStrip>

      <Section id="process" aria-labelledby="process-title">
        <SectionHead>
          <div>
            <SectionKicker>EXCHANGE PROCESS · 3 STEPS</SectionKicker>
            <SectionTitle id="process-title">금교환은 세 단계로 진행됩니다</SectionTitle>
          </div>
          <SectionLead>
            복잡한 매입 가격 대신, 가지고 있는 금이 어느 정도의 순금으로 인정되고
            어떤 골드바 조합으로 교환되는지에 집중합니다.
          </SectionLead>
        </SectionHead>
        <ProcessGrid>
          <ProcessCard>
            <StepMeta><span>STEP 01 · ONLINE</span><ReceiptText size={21} aria-hidden /></StepMeta>
            <StepTitle>예상계산</StepTitle>
            <StepText>
              금의 종류와 중량을 입력해 예상 순금 중량, 골드바 조합과 잔여 중량을
              확인합니다.
            </StepText>
          </ProcessCard>
          <ProcessCard>
            <StepMeta><span>STEP 02 · IN STORE</span><Scale size={21} aria-hidden /></StepMeta>
            <StepTitle>매장확인</StepTitle>
            <StepText>
              전문가가 고객 앞에서 순도와 중량을 확인하고 최종 인정 중량과 공임을
              설명합니다.
            </StepText>
          </ProcessCard>
          <ProcessCard>
            <StepMeta><span>STEP 03 · COMPLETE</span><FileCheck2 size={21} aria-hidden /></StepMeta>
            <StepTitle>골드바수령</StepTitle>
            <StepText>
              결과와 조건에 동의하면 확정된 내용에 따라 999.9 골드바와 잔여 금을
              수령합니다.
            </StepText>
          </ProcessCard>
        </ProcessGrid>
      </Section>

      <Verification aria-labelledby="verification-title">
        <VerificationImage>
          <img
            src={import.meta.env.DEV ? goldVerificationImage : "/gold-verification.jpg"}
            alt="정밀 저울에서 보유 금의 중량을 확인하고 교환 기록을 작성하는 모습"
          />
        </VerificationImage>
        <VerificationCopy>
          <SectionKicker>OPERATED BY WONIL JEWELRY</SectionKicker>
          <SectionTitle id="verification-title">온라인 계산 뒤에는 실제 매장이 있습니다</SectionTitle>
          <SectionLead>
            한국골드마켓의 골드바 교환은 부산 범천동 원일귀금속이 직접 제공합니다.
            화면의 예상값을 그대로 확정하지 않고, 매장에서 고객과 함께 다시 확인합니다.
          </SectionLead>
          <VerificationList>
            <li>
              <ShieldCheck size={19} aria-hidden />
              <span><strong>운영 주체 공개</strong>사업자 정보와 상담 연락처를 모든 화면에서 확인할 수 있습니다.</span>
            </li>
            <li>
              <Scale size={19} aria-hidden />
              <span><strong>측정 과정 공개</strong>순도·중량·부속물 반영 기준을 설명하고 결과를 확인받습니다.</span>
            </li>
            <li>
              <FileCheck2 size={19} aria-hidden />
              <span><strong>교환 내역 보관</strong>확정된 골드바 조합과 잔여 중량을 교환내역에서 확인합니다.</span>
            </li>
          </VerificationList>
          <StoreMeta>
            <span><MapPin size={16} aria-hidden /> 부산광역시 부산진구 골드테마길 21</span>
            <span><Clock3 size={16} aria-hidden /> 월–토 10:00–18:00</span>
            <a href="tel:0516469700"><Phone size={16} aria-hidden /> 교환 상담 051-646-9700</a>
          </StoreMeta>
        </VerificationCopy>
      </Verification>

      <Section aria-labelledby="evidence-title">
        <SectionHead>
          <div>
            <SectionKicker>BEFORE YOU DECIDE</SectionKicker>
            <SectionTitle id="evidence-title">결정하기 전에 세 가지를 확인하세요</SectionTitle>
          </div>
        </SectionHead>
        <EvidenceGrid>
          <EvidenceCard>
            <Scale size={28} aria-hidden />
            <h3>인정 중량</h3>
            <p>제품 전체 무게가 아닌 순도, 장식과 부속물 등을 반영한 최종 인정 중량을 확인합니다.</p>
          </EvidenceCard>
          <EvidenceCard>
            <ReceiptText size={28} aria-hidden />
            <h3>제작 공임</h3>
            <p>규격별 골드바 제작 공임을 별도 안내해 무엇에 얼마가 적용되는지 확인할 수 있습니다.</p>
          </EvidenceCard>
          <EvidenceCard>
            <FileCheck2 size={28} aria-hidden />
            <h3>골드바 조합과 잔여</h3>
            <p>교환되는 골드바 규격과 개수, 골드바로 만들고 남는 중량을 함께 기록합니다.</p>
          </EvidenceCard>
        </EvidenceGrid>
      </Section>

      <Section aria-labelledby="exchange-reviews-title">
        <SectionHead>
          <div>
            <SectionKicker>VERIFIED EXCHANGE REVIEWS</SectionKicker>
            <SectionTitle id="exchange-reviews-title">교환을 마친 고객의 후기</SectionTitle>
          </div>
        </SectionHead>
        <GoldExchangeReviewList limitCount={6} />
      </Section>

      <QuizBanner aria-labelledby="quiz-banner-title">
        <div>
          <QuizMeta>TODAY&apos;S QUICK QUIZ · 1 ACCOUNT, 1 TIME</QuizMeta>
          <h2 id="quiz-banner-title">금 상식 퀴즈 풀고 순금 0.01g 받기</h2>
          <p>5문항을 모두 맞히면 골드바 교환 시 사용할 수 있는 순금 0.01g을 적립합니다.</p>
        </div>
        <QuizLink to="/quiz/gold-bonus">
          퀵퀴즈 시작
          <Sparkles size={17} aria-hidden />
        </QuizLink>
      </QuizBanner>

      <Section aria-labelledby="faq-title">
        <SectionHead>
          <div>
            <SectionKicker>FREQUENTLY ASKED QUESTIONS</SectionKicker>
            <SectionTitle id="faq-title">교환 전에 자주 묻는 질문</SectionTitle>
          </div>
        </SectionHead>
        <FAQGrid>
          <div>
            <FAQ>
              <summary>온라인 계산 결과가 최종 결과인가요?</summary>
              <p>아닙니다. 온라인 결과는 입력값에 따른 예상치이며, 최종 순도와 중량은 매장 실측 후 확정합니다.</p>
            </FAQ>
            <FAQ>
              <summary>왜 현금 매입 대신 골드바로 교환하나요?</summary>
              <p>사용하지 않는 귀금속을 현금으로 처분하지 않고, 순도와 중량을 확인하기 쉬운 금의 형태로 계속 보유하고 싶은 분에게 적합합니다.</p>
            </FAQ>
            <FAQ>
              <summary>제품을 택배로 먼저 보내야 하나요?</summary>
              <p>현재 안내되는 기본 절차는 부산 범천동 매장 방문 확인입니다. 방문 전에 전화로 상담할 수 있습니다.</p>
            </FAQ>
          </div>
          <div>
            <FAQ>
              <summary>교환하지 않아도 되나요?</summary>
              <p>네. 측정 결과와 비용을 확인한 뒤 동의하지 않으면 교환을 확정하지 않습니다.</p>
            </FAQ>
            <FAQ>
              <summary>골드바 공임은 어디서 확인하나요?</summary>
              <p>공임 안내 화면에서 규격별 기준을 확인할 수 있으며, 실제 적용 금액은 확정 전에 다시 안내합니다.</p>
            </FAQ>
          </div>
        </FAQGrid>
      </Section>

      <FinalCTA>
        <div>
          <SectionKicker>TURN UNUSED GOLD INTO CLEAR VALUE</SectionKicker>
          <h2>서랍 속 금이 받을 수 있는 골드바를 확인하세요</h2>
          <p>로그인 없이 먼저 계산하고, 교환을 결정했을 때만 방문을 예약하세요.</p>
        </div>
        <PrimaryLink to="/gold-exchange">
          내 골드바 조합 계산
          <ArrowRight size={18} aria-hidden />
        </PrimaryLink>
      </FinalCTA>
    </Page>
  );
}