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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  margin: 8px 0 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.border};

  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;

const FlowItem = styled.div`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 82px;
  padding: 13px 15px;
  background: ${({ theme }) => theme.colors.surface};

  > span {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 12px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .65rem;
    font-weight: 950;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .76rem;
    font-weight: 900;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .64rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const MemberStartCard = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: clamp(16px, 3vw, 28px);
  align-items: center;
  margin: 16px 0 0;
  padding: clamp(20px, 3.2vw, 28px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 38%, ${({ theme }) => theme.colors.surface}),
    ${({ theme }) => theme.colors.surface}
  );

  h2 {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(1.35rem, 2.8vw, 1.9rem);
    line-height: 1.18;
    letter-spacing: -.045em;
    word-break: keep-all;
  }

  p {
    max-width: 760px;
    margin: 8px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .74rem;
    line-height: 1.65;
    word-break: keep-all;
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 14px;
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
  font-size: .76rem;
  line-height: 1.6;
  word-break: keep-all;
`;

const TextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: .72rem;
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
    font-size: .74rem;
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
  font-size: .72rem;
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
    font-size: .74rem;
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
  strong { display: block; color: ${({ theme }) => theme.colors.primary}; font-size: .73rem; }
  p { margin: 2px 0 0; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .65rem; line-height: 1.45; }
`;

const StoreMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 15px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .64rem;

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
  font-size: .72rem;
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

  return (
    <Page>
      <Hero aria-labelledby="landing-title">
        <HeroCopy>
          <Kicker>KOREA GOLD MARKET</Kicker>
          <HeroTitle id="landing-title">
            내가 가진 금을 기록하면,<br /><em>오늘의 가치가 보입니다.</em>
          </HeroTitle>
          <HeroLead>
            14K·18K·순금의 종류와 중량을 입력해 오늘 참고가치와 예상 순금량을 확인하세요.
            <strong> MY GOLD는 내가 가진 금을 기록하고 가치의 변화를 확인하는 개인 기록 공간입니다.</strong>
            실물 금을 보관·예치하는 서비스가 아닙니다.
          </HeroLead>
        </HeroCopy>

        <QuickGoldValueCalculator source="landing" />
      </Hero>

      <FlowStrip aria-label="한국골드마켓 이용 흐름">
        <FlowItem>
          <span>01</span>
          <div><strong>내 금 기록</strong><p>내가 실제로 가진 금의 종류와 중량을 기록합니다.</p></div>
        </FlowItem>
        <FlowItem>
          <span>02</span>
          <div><strong>오늘 가치 확인</strong><p>공개 금시세를 기준으로 참고가치와 변화를 확인합니다.</p></div>
        </FlowItem>
        <FlowItem>
          <span>03</span>
          <div><strong>필요할 때 교환</strong><p>MY GOLD 기록을 바탕으로 예상 교환량을 확인합니다.</p></div>
        </FlowItem>
      </FlowStrip>

      <MemberStartCard aria-labelledby="member-start-title">
        <div>
          <Kicker>MEMBER · MY GOLD</Kicker>
          <h2 id="member-start-title">가입은 간단하게, 내 금의 가치는 계속.</h2>
          <p>
            이메일 인증만으로 MY GOLD를 시작하세요. 내 금을 기록하고 알림을 켜면
            주요 금시세 변동과 MY GOLD의 주간 가치 변화를 받아볼 수 있습니다.
          </p>
        </div>
        <GoldButton to="/register">
          간편하게 시작하기 <ArrowRight size={15} aria-hidden />
        </GoldButton>
      </MemberStartCard>

      <CompactSection aria-labelledby="live-title">
        <SectionHead>
          <SectionHeadCopy>
            <Kicker>TODAY&apos;S GOLD</Kicker>
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
          <Kicker>GOLD TO GOLD · OFFLINE VERIFICATION</Kicker>
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
            <TextLink to="/stores">매장·교환절차 보기 <ArrowRight size={15} aria-hidden /></TextLink>
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
