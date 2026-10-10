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
import TrustProofBar from "@/components/common/TrustProofBar";
import goldVerificationImage from "@/assets/goldVerificationImage";
import { trackProductEventOncePerSession } from "@/analytics/productAnalytics";

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
  gap: clamp(28px, 4.5vw, 58px);
  align-items: center;
  min-height: min(445px, calc(100svh - 132px));
  padding: clamp(28px, 4vw, 52px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 28px;
  background:
    radial-gradient(circle at 13% 7%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 17%, transparent), transparent 42%),
    radial-gradient(circle at 97% 94%, color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent), transparent 42%),
    ${({ theme }) => theme.colors.surface};
  box-shadow: 0 24px 64px color-mix(in srgb, ${({ theme }) => theme.colors.primaryDark} 9%, transparent);

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
    gap: 16px;
    padding: 23px 18px 20px;
    border-radius: 22px;
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
    margin: 6px 0 0;
    font-size: .82rem;
    line-height: 1.6;
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
  @media (max-width: 700px) { margin-top: 9px; gap: 5px 14px; font-size: .72rem; }
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
    margin-top: 0;
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

  @media (max-width: 700px) {
    min-height: 59px;
    padding: 9px 10px;
    gap: 7px;
    grid-template-columns: 28px minmax(0, 1fr);
    > span { width: 28px; height: 30px; border-radius: 9px; font-size: .7rem; }
    strong { font-size: .77rem; }
    p { display: none; }
  }
`;

const CalculatorAnchor = styled.div`
  scroll-margin-top: 88px;
`;

const MyGoldPreview = styled.aside`
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 14px 17px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 15px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.text};

  > small { color: ${({ theme }) => theme.colors.secondaryDark}; font-size: .71rem; font-weight: 950; }
  > strong { color: ${({ theme }) => theme.colors.primary}; font-size: .98rem; font-weight: 950; word-break: keep-all; }
  p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .73rem; line-height: 1.55; word-break: keep-all; }
`;
const PreviewMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  > div { padding: 9px 10px; border-radius: 10px; background: ${({ theme }) => theme.colors.surface}; min-width: 0; }
  span { display: block; font-size: .69rem; color: ${({ theme }) => theme.colors.textSecondary}; }
  b { display: block; margin-top: 3px; font-size: clamp(.85rem, 2.5vw, 1.05rem); font-weight: 950;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere; color: ${({ theme }) => theme.colors.primary}; }
  @media (max-width: 370px) { grid-template-columns: 1fr; }
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

  @media (max-width: 700px) { margin: 7px 0 0; font-size: .7rem; }
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
  min-height: 340px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 340px;
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

  @media (max-width: 820px) {
    padding: 21px 19px 23px;
    h2 { font-size: clamp(1.55rem, 5vw, 2rem); }
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
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(270px, .65fr);
  gap: 18px;
  align-items: stretch;
  width: 100%;

  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

const ReviewStore = styled.aside`
  display: grid;
  align-content: center;
  gap: 9px;
  padding: 20px 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 15px;
  background: ${({ theme }) => theme.colors.surface};

  strong { color: ${({ theme }) => theme.colors.primary}; font-size: .97rem; }
  p { color: ${({ theme }) => theme.colors.textSecondary}; font-size: .8rem; line-height: 1.55; }
  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .8rem;
    font-weight: 900;
    text-decoration: none;
  }

  /* On small screens the full store process is already explained above. */
  @media (max-width: 820px) { display: none; }
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
            <MobileHeadline>내 금, <em>오늘 얼마일까요?</em></MobileHeadline>
          </HeroTitle>
          <HeroLead>
            14K·18K·순금과 중량만 입력하면 오늘의 예상 가치를 확인할 수 있습니다.
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
            description="금 종류와 중량을 입력해 오늘 예상 가치와 순금량을 확인하세요."
            onPreviewChange={setGoldPreview}
          />
          {goldPreview && (
            <MyGoldPreview aria-label="MY GOLD 저장 전 미리보기">
              <small>MY GOLD · 저장 전 미리보기</small>
              <strong>
                방금 입력한 {goldPreview.label} · {Number(goldPreview.weightG || 0).toLocaleString("ko-KR", { maximumFractionDigits: 3 })}g
              </strong>
              <PreviewMetrics>
                <div>
                  <span>오늘 예상 참고가치</span>
                  <b>{Number(goldPreview.estimatedValueWon || 0) > 0
                    ? `${Math.round(goldPreview.estimatedValueWon).toLocaleString("ko-KR")}원`
                    : "시세 확인 후 표시"}</b>
                </div>
                <div>
                  <span>예상 순금량</span>
                  <b>{Number(goldPreview.pureGoldG || 0) > 0
                    ? `${Number(goldPreview.pureGoldG).toFixed(2)}g`
                    : "환산 기준 확인 중"}</b>
                </div>
              </PreviewMetrics>
              <p>아직 저장되지 않았습니다. 위 계산기의 ‘내 금 기록하기’를 누르면 MY GOLD 체험으로 이어집니다. 가입 전 기록은 현재 기기에만 임시 보관됩니다.</p>
            </MyGoldPreview>
          )}
        </CalculatorAnchor>
      </Hero>

      <TrustProofBar />

      <FlowStrip aria-label="한국골드마켓 이용 흐름">
        <FlowItem type="button" onClick={startValueCheck} aria-label="오늘 가치 확인 계산기로 이동">
          <span>01</span>
          <div><strong>오늘 가치 확인</strong><p>금 종류와 중량으로 지금 내 금의 참고가치를 바로 확인합니다.</p></div>
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
            끊어진 목걸이, 한쪽만 남은 귀걸이, 오래된 14K·18K와 돌반지도 예상 순금량을 확인해
            999.9 골드바로 이어갈 수 있습니다. 온라인 계산은 참고용이며,
            부산 원일귀금속에서 순도·중량과 비용을 직접 확인하고 동의 후 확정합니다.
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
          <ReviewStore>
            <Kicker>부산 매장 직접 운영</Kicker>
            <strong>실물은 매장에서 직접 확인합니다.</strong>
            <p>부산 골드테마길 원일귀금속에서 고객과 함께 순도·중량·비용을 확인하고 동의 후 교환을 진행합니다.</p>
            <Link to="/stores">매장 위치와 이용 안내 <ArrowRight size={15} aria-hidden /></Link>
          </ReviewStore>
        </ReviewWrap>
      </CompactSection>
    </Page>
  );
}
