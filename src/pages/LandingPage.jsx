import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowRight,
  MapPin,
  ReceiptText,
  Scale,
  ShieldCheck,
} from "lucide-react";

import QuickGoldValueCalculator from "@/components/gold/QuickGoldValueCalculator";
import GoldPriceBoard from "@/components/gold/GoldPriceBoard";
import VerifiedReviewSection from "@/components/reviews/VerifiedReviewSection";
import goldVerificationImage from "@/assets/goldVerificationImage";
import { trackProductEventOncePerSession } from "@/analytics/productAnalytics";

const Page = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, .88fr) minmax(380px, 1.12fr);
  gap: clamp(28px, 4.5vw, 58px);
  align-items: center;
  min-height: min(500px, calc(100svh - 132px));
  padding: clamp(24px, 3.6vw, 42px) 0 26px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    min-height: auto;
    padding: 28px 0 30px;
  }
`;

const HeroCopy = styled.div`
  max-width: 560px;
`;

const Kicker = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .69rem;
  font-weight: 950;
  letter-spacing: .16em;
`;

const HeroTitle = styled.h1`
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(2.2rem, 5vw, 4.15rem);
  line-height: 1.02;
  letter-spacing: -.06em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-style: normal;
  }
`;

const HeroLead = styled.p`
  margin: 18px 0 0;
  max-width: 540px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: clamp(.86rem, 1.5vw, .98rem);
  line-height: 1.75;
  word-break: keep-all;

  strong { color: ${({ theme }) => theme.colors.primary}; }
`;

const FlowStrip = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin: 8px 0 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.border};

  @media (max-width: 700px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const FlowItem = styled.button`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 82px;
  padding: 13px 15px;
  border: 0;
  background: ${({ theme }) => theme.colors.surface};
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background 160ms ease, box-shadow 160ms ease;

  &:hover {
    background: color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 44%, ${({ theme }) => theme.colors.surface});
  }

  &:focus-visible {
    position: relative;
    z-index: 1;
    outline: 2px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: -2px;
  }

  > span {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .82rem;
    font-weight: 950;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .84rem;
    font-weight: 900;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const CalculatorAnchor = styled.div`
  scroll-margin-top: 118px;
`;

const JourneyNote = styled.p`
  margin: 12px 2px 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .78rem;
  line-height: 1.55;
  text-align: center;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 900;
  }
`;

const Section = styled.section`
  padding: clamp(34px, 4.5vw, 54px) 0;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const CompactSection = styled(Section)`
  padding: clamp(26px, 3.2vw, 38px) 0;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;

  @media (max-width: 700px) { align-items: start; flex-direction: column; gap: 10px; }
`;

const SectionHeadCopy = styled.div`
  max-width: 780px;
`;

const SectionTitle = styled.h2`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.55rem, 3vw, 2.2rem);
  line-height: 1.15;
  letter-spacing: -.045em;
  word-break: keep-all;
`;

const SectionLead = styled.p`
  margin: 7px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .84rem;
  line-height: 1.6;
  word-break: keep-all;
`;

const TextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: .8rem;
  font-weight: 950;
  text-decoration: none;
  white-space: nowrap;
`;

const GoldToGoldStory = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: clamp(18px, 3vw, 30px);
  align-items: center;
  margin: 0 0 clamp(34px, 5vw, 54px);
  padding: clamp(22px, 3.5vw, 32px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 42%, ${({ theme }) => theme.colors.surface}),
    ${({ theme }) => theme.colors.surface}
  );

  h2 {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.4rem, 2.8vw, 2rem);
    line-height: 1.18;
    letter-spacing: -.045em;
    word-break: keep-all;
  }

  p {
    max-width: 760px;
    margin: 9px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    line-height: 1.65;
    word-break: keep-all;
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 15px;
  }
`;

const GoldToGoldStoryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 43px;
  padding: 9px 14px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 42%, ${({ theme }) => theme.colors.border});
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: .8rem;
  font-weight: 950;
  text-decoration: none;
  white-space: nowrap;
`;
const ExchangeTrust = styled.section`
  display: grid;
  grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
  gap: 0;
  overflow: hidden;
  margin: clamp(34px, 5vw, 54px) 0;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

const VerificationImage = styled.div`
  min-height: 340px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 340px;
    object-fit: cover;
  }
`;

const ExchangeCopy = styled.div`
  display: grid;
  align-content: center;
  padding: clamp(26px, 4vw, 42px);

  h2 {
    margin: 8px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.55rem, 3vw, 2.25rem);
    line-height: 1.15;
    letter-spacing: -.045em;
    word-break: keep-all;
  }

  > p {
    margin: 9px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .82rem;
    line-height: 1.6;
  }
`;

const TrustList = styled.div`
  display: grid;
  gap: 10px;
  margin-top: 18px;

  > div {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    gap: 8px;
    align-items: start;
  }

  svg { width: 18px; height: 18px; color: ${({ theme }) => theme.colors.secondaryDark}; }
  strong { display: block; color: ${({ theme }) => theme.colors.primary}; font-size: .8rem; }
  p { margin: 2px 0 0; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .82rem; line-height: 1.45; }
`;

const StoreMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 15px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .82rem;

  span { display: inline-flex; align-items: center; gap: 5px; }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 18px;
`;

const GoldButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 43px;
  padding: 9px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: .8rem;
  font-weight: 950;
  text-decoration: none;
`;

const ReviewWrap = styled.div`
  max-width: 980px;
`;

export default function LandingPage() {
  useEffect(() => {
    trackProductEventOncePerSession("landing_view", {}, "landing-view");
  }, []);

  const startValueCheck = () => {
    const calculator = document.getElementById("landing-calculator");
    if (!calculator) return;

    calculator.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      calculator.querySelector('[aria-label="내 금 중량"]')?.focus();
    }, 350);
  };

  return (
    <Page>
      <Hero aria-labelledby="landing-title">
        <HeroCopy>
          <Kicker>KOREA GOLD MARKET</Kicker>
          <HeroTitle id="landing-title">
            내 금, <em>오늘 얼마일까요?</em>
          </HeroTitle>
          <HeroLead>
            14K·18K·순금의 종류와 무게를 알고 있다면 바로 참고가치를 확인해 보세요.
            잘 모르셔도 확인 방법부터 안내해 드립니다.
            <strong> 먼저 계산하고, 계속 보고 싶은 금만 MY GOLD에 이어두세요.</strong>
          </HeroLead>
        </HeroCopy>

        <CalculatorAnchor id="landing-calculator">
          <QuickGoldValueCalculator source="landing" />
        </CalculatorAnchor>
      </Hero>

      <FlowStrip aria-label="한국골드마켓 이용 흐름">
        <FlowItem type="button" onClick={startValueCheck} aria-label="오늘 가치 확인 계산기로 이동">
          <span>01</span>
          <div><strong>오늘 가치 확인</strong><p>금 종류와 중량으로 지금 내 금의 참고가치를 바로 확인합니다.</p></div>
        </FlowItem>
        <FlowItem as={Link} to="/my-gold" aria-label="MY GOLD 기록으로 이동">
          <span>02</span>
          <div><strong>MY GOLD 기록</strong><p>계속 보고 싶은 금만 기록해 오늘 이후의 가치를 이어둡니다.</p></div>
        </FlowItem>
        <FlowItem as={Link} to="/my-gold" aria-label="골드바 목표 확인으로 이동">
          <span>03</span>
          <div><strong>골드바 목표</strong><p>예상 순금량으로 다음 골드바까지 얼마나 남았는지 확인합니다.</p></div>
        </FlowItem>
        <FlowItem as={Link} to="/gold-to-gold" aria-label="GOLD TO GOLD 안내로 이동">
          <span>04</span>
          <div><strong>GOLD TO GOLD</strong><p>원할 때 예상 교환량을 확인하고 부산 매장 방문으로 이어갑니다.</p></div>
        </FlowItem>
      </FlowStrip>

      <JourneyNote>
        <strong>회원가입 없이 먼저 계산</strong> · 실제 교환은 매장 실측·고객 동의 후 확정됩니다.
      </JourneyNote>

      <CompactSection aria-labelledby="live-title">
        <SectionHead>
          <SectionHeadCopy>
            <Kicker>오늘 시세</Kicker>
            <SectionTitle id="live-title">오늘 금시세</SectionTitle>
            <SectionLead>시세는 빠르게 확인하고, 내 금의 가치는 위 계산기와 MY GOLD에서 이어서 봅니다.</SectionLead>
          </SectionHeadCopy>
          <TextLink to="/gold-price">전체 시세 보기 <ArrowRight size={15} aria-hidden /></TextLink>
        </SectionHead>
        <GoldPriceBoard compact />
      </CompactSection>

      <GoldToGoldStory aria-labelledby="gold-to-gold-story-title">
        <div>
          <Kicker>GOLD TO GOLD</Kicker>
          <h2 id="gold-to-gold-story-title">쓰지 않는 금의 가치를, 다시 금으로 이어갑니다.</h2>
          <p>
            끊어진 목걸이, 한쪽만 남은 귀걸이, 오래된 14K·18K, 아이의 돌반지처럼
            지금은 사용하지 않는 금도 있습니다. GOLD TO GOLD는 그 금의 예상 순금량을 확인해
            999.9 골드바로 가치를 이어가는 한국골드마켓의 금교환 방식입니다.
          </p>
        </div>

        <GoldToGoldStoryLink to="/gold-to-gold">
          GOLD TO GOLD 이야기 보기
          <ArrowRight size={15} aria-hidden />
        </GoldToGoldStoryLink>
      </GoldToGoldStory>
      <ExchangeTrust aria-labelledby="exchange-trust-title">
        <VerificationImage>
          <img
            src={import.meta.env.DEV ? goldVerificationImage : "/gold-verification.jpg"}
            alt="정밀 저울에서 보유 금의 중량을 확인하는 모습"
          />
        </VerificationImage>
        <ExchangeCopy>
          <Kicker>GOLD TO GOLD · 매장 실측·확정</Kicker>
          <h2 id="exchange-trust-title">기록은 MY GOLD에서, 실제 교환은 매장에서 확인합니다.</h2>
          <p>온라인 계산은 예상값입니다. GOLD TO GOLD는 부산 범천동 원일귀금속에서 실물의 순도·중량과 비용을 고객과 함께 확인하고, 최종 조건에 동의한 뒤 확정합니다.</p>
          <TrustList>
            <div><Scale aria-hidden /><span><strong>고객 앞에서 현장 실측</strong><p>실물 금의 순도와 중량을 다시 확인합니다.</p></span></div>
            <div><ReceiptText aria-hidden /><span><strong>비용 사전 확인</strong><p>골드바 제작 공임과 예상 결과를 확정 전에 확인합니다.</p></span></div>
            <div><ShieldCheck aria-hidden /><span><strong>동의 후 최종 확정</strong><p>측정 결과와 비용에 동의한 경우에만 실제 교환이 진행됩니다.</p></span></div>
          </TrustList>
          <StoreMeta><span><MapPin size={14} aria-hidden /> 부산광역시 부산진구 골드테마길 21</span></StoreMeta>
          <Actions>
            <GoldButton to="/gold-exchange">예상 교환 확인 <ArrowRight size={15} aria-hidden /></GoldButton>
            <TextLink to="/stores">부산 방문·교환절차 보기 <ArrowRight size={15} aria-hidden /></TextLink>
          </Actions>
        </ExchangeCopy>
      </ExchangeTrust>

      <CompactSection aria-label="교환 완료 고객 후기">
        <ReviewWrap>
          <VerifiedReviewSection compact showInquiryAction={false} />
        </ReviewWrap>
      </CompactSection>
    </Page>
  );
}
