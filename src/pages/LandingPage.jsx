import React, { useEffect, useState } from "react";
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

// KGM_EXPERIENCE_FIRST_FINAL · action-first landing, no extra signup gate
const Page = styled.div`
  width: 100%;
  color: ${({ theme }) => theme.colors.text};
`;

const Hero = styled.section`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, .88fr) minmax(380px, 1.12fr);
  gap: clamp(20px, 3vw, 44px);
  align-items: center;
  min-height: min(390px, calc(100svh - 144px));
  padding: clamp(26px, 3.6vw, 44px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 24px;
  background:
    radial-gradient(circle at 13% 7%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 17%, transparent), transparent 42%),
    radial-gradient(circle at 97% 94%, color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent), transparent 42%),
    ${({ theme }) => theme.colors.surface};
  box-shadow: 0 10px 30px color-mix(in srgb, ${({ theme }) => theme.colors.primaryDark} 5%, transparent);

  &::before {
    content: "";
    position: absolute;
    z-index: -1;
    width: 320px;
    height: 320px;
    left: -168px;
    top: -195px;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, transparent);
    box-shadow: 0 0 0 42px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 4%, transparent),
                0 0 0 83px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 3%, transparent);
    pointer-events: none;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: 11px;
    padding: 17px 13px 16px;
    border-radius: 20px;
  }
`;

const HeroCopy = styled.div`
  max-width: 560px;

  @media (max-width: 700px) {
    display: grid;
    gap: 7px;
  }
`;

const DesktopHeadline = styled.span`
  @media (max-width: 700px) { display: none; }
`;

const MobileHeadline = styled.span`
  display: none;
  @media (max-width: 700px) { display: inline; }
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
  font-size: clamp(2.15rem, 4.4vw, 3.8rem);
  line-height: 1.1;
  letter-spacing: -.06em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-style: normal;
  }

  @media (max-width: 700px) {
    margin: 0;
    font-size: clamp(1.73rem, 7vw, 2.05rem);
    line-height: 1.15;
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

  @media (max-width: 700px) {
    display: block;
    margin: 5px 0 0;
    font-size: .83rem;
    line-height: 1.5;
    strong { display: none; } /* Calculator contains the primary action. */
  }
`;

const HeroTrust = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 15px;
  margin-top: 18px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .75rem;
  line-height: 1.5;

  span { display: inline-flex; align-items: center; gap: 6px; }
  svg { width: 17px; height: 17px; color: ${({ theme }) => theme.colors.secondaryDark}; }
  @media (max-width: 700px) { display: none; } /* Detailed process is explained in the trust panel below. */
`;

const FlowStrip = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 25px;
  align-items: center;
  margin: 14px 3px 0;
  padding: 0 0 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};

  @media (max-width: 700px) { display: none; }
`;

const FlowItem = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 5px 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.secondary}; outline-offset: 3px; }
  > span { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%;
    color: ${({ theme }) => theme.colors.secondaryDark}; background: ${({ theme }) => theme.semantic.badgeGoldBg};
    font-size: .68rem; font-weight: 900; }
  strong { font-size: .83rem; font-weight: 850; }
  p { display: none; }
`;

const CalculatorAnchor = styled.div`
  scroll-margin-top: 88px;
`;

/* The calculator above already displays amount and purity. Do not create a second result card. */
const MyGoldPreview = styled.aside`
  margin-top: 10px;
  padding: 10px 13px;
  border-left: 3px solid ${({ theme }) => theme.colors.gold};
  border-radius: 0 9px 9px 0;
  background: color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 36%, ${({ theme }) => theme.colors.surface});
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .82rem;
  line-height: 1.55;
  word-break: keep-all;
  strong { color: ${({ theme }) => theme.colors.primary}; }
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

const ExchangeTrust = styled.section`
  display: grid;
  grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
  gap: 0;
  overflow: hidden;
  margin: clamp(26px, 4vw, 38px) 0;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
    margin-top: 24px;
  }
`;

const VerificationImage = styled.div`
  min-height: 285px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 285px;
    object-fit: cover;
  }

  @media (max-width: 820px) {
    min-height: 0;
    height: clamp(170px, 38vw, 240px);
    img { min-height: 0; height: 100%; object-position: center 55%; }
  }
`;

const ExchangeCopy = styled.div`
  display: grid;
  align-content: center;
  padding: clamp(22px, 2.8vw, 34px);

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

  @media (max-width: 820px) {
    padding: 21px 19px 23px;
    h2 { font-size: clamp(1.55rem, 5vw, 2rem); }
  }
`;

const TrustList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 13px;

  > div {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    gap: 8px;
    align-items: start;
  }

  svg { width: 18px; height: 18px; color: ${({ theme }) => theme.colors.secondaryDark}; }
  strong { display: block; color: ${({ theme }) => theme.colors.primary}; font-size: .8rem; }
  p { margin: 2px 0 0; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .82rem; line-height: 1.45; }
  @media (max-width: 700px) { display: none; } /* Shown in the home trust disclosure. */
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
  display: block;
  width: 100%;

  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

export default function LandingPage() {
  const [goldPreview, setGoldPreview] = useState(null);

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
            <DesktopHeadline>잠들어 있던 <em>금의 가치를 발견하세요.</em></DesktopHeadline>
            <MobileHeadline>내 금, <em>지금 얼마일까요?</em></MobileHeadline>
          </HeroTitle>
          <HeroLead>
            14K·18K·순금과 중량을 입력하면 공개 시세 기준 예상 가치를 확인할 수 있습니다.
            <strong> 회원가입 없이 먼저 계산하고, 원하는 금만 MY GOLD에 기록하세요.</strong>
          </HeroLead>
          <HeroTrust aria-label="안심 이용 안내">
            <span><ShieldCheck aria-hidden="true" /> 회원가입 없이 시작</span>
            <span><Scale aria-hidden="true" /> 실측·동의 후 최종 확정</span>
          </HeroTrust>
        </HeroCopy>

        <CalculatorAnchor id="landing-calculator">
          <QuickGoldValueCalculator
            source="landing"
            eyebrow="회원가입 없이 바로 계산"
            title="내 금 가치 계산하기"
            description="금 종류와 중량을 입력해 예상 가치와 순금량을 확인하세요."
            onPreviewChange={setGoldPreview}
          />
          {goldPreview && (
            <MyGoldPreview aria-live="polite" aria-label="계산 결과 저장 안내">
              <strong>아직 저장되지 않았습니다.</strong>{' '}
              위 계산기의 ‘내 금 기록하기’를 누르면 MY GOLD 체험으로 이어집니다.
              가입 전 기록은 현재 기기에만 임시 보관됩니다.
            </MyGoldPreview>
          )}
        </CalculatorAnchor>
      </Hero>

      <FlowStrip aria-label="한국골드마켓 이용 흐름">
        <FlowItem type="button" onClick={startValueCheck} aria-label="내 금 예상 가치 확인 계산기로 이동">
          <span>01</span>
          <div><strong>예상 가치 확인</strong><p>공개 시세 기준 내 금의 예상 참고가치를 확인합니다.</p></div>
        </FlowItem>
        <FlowItem as={Link} to="/my-gold" aria-label="MY GOLD 기록으로 이동">
          <span>02</span>
          <div><strong>MY GOLD 기록</strong><p>계속 보고 싶은 금만 기록해 오늘 이후의 가치를 이어둡니다.</p></div>
        </FlowItem>
        <FlowItem as={Link} to="/my-gold#goldbar-goal" aria-label="MY GOLD의 골드바 목표 영역으로 이동">
          <span>03</span>
          <div><strong>골드바 목표</strong><p>예상 순금량으로 다음 골드바까지 얼마나 남았는지 확인합니다.</p></div>
        </FlowItem>
        <FlowItem as={Link} to="/gold-to-gold" aria-label="GOLD TO GOLD 안내로 이동">
          <span>04</span>
          <div><strong>GOLD TO GOLD</strong><p>원할 때 예상 교환량을 확인하고 부산 매장 방문으로 이어갑니다.</p></div>
        </FlowItem>
      </FlowStrip>


      <CompactSection aria-labelledby="live-title">
        <SectionHead>
          <SectionHeadCopy>
            <Kicker>공개 시세</Kicker>
            <SectionTitle id="live-title">금시세</SectionTitle>
            <SectionLead>현재 공개 중인 금시세를 확인하세요.</SectionLead>
          </SectionHeadCopy>
          <TextLink to="/gold-price">전체 시세 보기 <ArrowRight size={15} aria-hidden /></TextLink>
        </SectionHead>
        <GoldPriceBoard compact />
      </CompactSection>

      <ExchangeTrust aria-labelledby="exchange-trust-title">
        <VerificationImage>
          <img
            src={goldVerificationImage}
            alt="정밀 저울에서 보유 금의 중량을 확인하는 모습"
            loading="lazy"
            decoding="async"
          />
        </VerificationImage>
        <ExchangeCopy>
          <Kicker>GOLD TO GOLD · 금의 가치를 이어가다</Kicker>
          <h2 id="exchange-trust-title">쓰지 않는 금의 가치를, 다시 금으로 이어갑니다.</h2>
          <p>
            반지·목걸이·돌반지 등 가지고 있는 금으로 만들 수 있는 골드바를 먼저 확인해 보세요.
            실제 순도·중량과 공임은 매장에서 확인하고 동의 후 확정합니다.
          </p>
          <TrustList>
            <div><Scale aria-hidden /><span><strong>고객 앞에서 현장 실측</strong><p>실물 금의 순도와 중량을 다시 확인합니다.</p></span></div>
            <div><ReceiptText aria-hidden /><span><strong>비용 사전 확인</strong><p>골드바 제작 공임과 예상 결과를 확정 전에 확인합니다.</p></span></div>
            <div><ShieldCheck aria-hidden /><span><strong>동의 후 최종 확정</strong><p>측정 결과와 비용에 동의한 경우에만 실제 교환이 진행됩니다.</p></span></div>
          </TrustList>
          <StoreMeta><span><MapPin size={14} aria-hidden /> 부산광역시 부산진구 골드테마길 21</span></StoreMeta>
          <Actions>
            <GoldButton to="/gold-exchange">예상 교환 확인 <ArrowRight size={15} aria-hidden /></GoldButton>
            <TextLink to="/gold-to-gold">GOLD TO GOLD 이야기 <ArrowRight size={15} aria-hidden /></TextLink>
            <TextLink to="/stores">매장·절차 안내 <ArrowRight size={15} aria-hidden /></TextLink>
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
