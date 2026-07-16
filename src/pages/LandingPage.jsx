// src/pages/LandingPage.jsx
import React, { useId, memo, useState, useCallback } from "react";
import styled, { keyframes, css } from "styled-components";
import { Link } from "react-router-dom";
import LiteCalcFromGX from "@/components/LiteCalcFromGX";
import TapTeasers from "@/components/landing/TapTeasers";

/* ============================
   Assets base (Vite BASE_URL 대응)
   ============================ */
const BASE = import.meta.env.BASE_URL || "/";
const BUILD_VER = (import.meta.env?.VITE_BUILD_VERSION || "") + Date.now(); // 캐시버스터
const heroPngBase = `${BASE}images/gold-hero.png`;
const heroPngAbs  = `/images/gold-hero.png`; // 서브패스 문제 대비 절대경로 폴백

/* ============================
   Animations (respect reduced motion)
   ============================ */
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const motionSafe = (styles) => css`
  @media (prefers-reduced-motion: no-preference) {
    ${styles}
  }
`;

/* ============================
   Theme helpers
   ============================ */
const themeVal = (path, fallback) => (props) => {
  try {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), props.theme) ?? fallback;
  } catch {
    return fallback;
  }
};

/* ============================
   Layout
   ============================ */
const PageWrapper = styled.main`
  padding-top: 0;
  padding-bottom: calc(24px + 56px + env(safe-area-inset-bottom));
  min-height: calc(100vh - 144px);
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(60rem 40rem at 85% -10%, rgba(234,160,70,0.10), transparent 60%),
    radial-gradient(50rem 32rem at 5% 110%, rgba(0,168,232,0.08), transparent 60%),
    ${themeVal("colors.background", "#0b1220")};
`;

const Hero = styled.header`
  position: relative;
  display: grid;
  place-items: center;
  justify-items: center;
  align-items: start;
  padding: 32px 16px 34px;
  min-height: auto;
  border-bottom: 1px solid ${themeVal("colors.border", "#1f2937")};
  ${motionSafe(css`animation: ${fadeInUp} .5s ease both;`)}

  @media (max-width: 768px) {
    padding: 28px 14px 20px;
    border-bottom: none;
  }
`;

const HeroOverlayAccent = styled.div.attrs({ "aria-hidden": true })`
  position: absolute; inset: 0;
  background:
    radial-gradient(520px 260px at 22% 0%, rgba(0,168,232,0.08), transparent 60%),
    radial-gradient(460px 240px at 80% 100%, rgba(234,160,70,0.10), transparent 60%);
  pointer-events: none;
`;

const HeroInner = styled.div`
  position: relative;
  text-align: center;
  max-width: 980px;
  padding: 0 16px;
`;

/* ============================
   Typo
   ============================ */
const EyebrowText = styled.p`
  margin: 0 0 12px;
  font-weight: 900;
  font-size: clamp(22px, 5.4vw, 30px);
  line-height: 1.15;
  color: ${themeVal("colors.text", "#e5e7eb")};
`;

const HeroTitle = styled.h1`
  font-size: clamp(40px, 7.2vw, 64px);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: ${themeVal("colors.text", "#f3f4f6")};
  margin: 0 0 14px;
  line-height: 1.06;
`;
const TitleLine = styled.span`
  display: block;
  line-height: 1.06;
  &:not(:first-child) { margin-top: 10px; }
`;

const GoldText = styled.em`
  font-style: normal;
  background: linear-gradient(135deg, #F1D27A 0%, #E2BC67 45%, #C9932F 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  -webkit-text-stroke: 0.25px rgba(0,0,0,.18);
`;

/* ============================
   Mini Trust Bar (Hero 하단)
   ============================ */
const TrustBar = styled.ul`
  display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 10px;
  li { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; font-size: clamp(12px, 3.2vw, 13px); color: ${themeVal("colors.textSecondary", "#9ca3af")}; }
`;

/* ============================
   Badges
   ============================ */
const Row = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`;

const badgeBase = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 800;
  font-size: clamp(13px, 3.2vw, 14px);
  letter-spacing: .1px;
  background: transparent;
  color: inherit;
  border: 2px solid;
`;

const outlineColor = ({ $variant, theme }) => {
  if ($variant === "primary") return theme?.colors?.primary || "#2563eb";
  if ($variant === "green") return theme?.colors?.success || "#10b981";
  return theme?.colors?.primary || "#2563eb";
};

const Badge = styled.span`
  ${badgeBase}
  border-color: ${outlineColor};
`;
const BadgeLink = styled(Link)`
  ${badgeBase}
  text-decoration: none;
  border-color: ${outlineColor};
  &:hover { opacity: .95; }
  &:focus-visible { box-shadow: 0 0 0 3px rgba(59,130,246,.4); }
`;

const Dot = styled.i`
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: currentColor;
  opacity: .5;
`;

/* ============================
   Banner
   ============================ */
const BannerCard = styled.figure`
  --img-scale: 0.90;
  margin: 10px auto 10px;
  width: 100%;
  max-width: 980px;
  background: transparent;
  border: none;
  box-shadow: none;
  overflow: visible;

  @media (max-width: 640px) {
    --img-scale: 0.92;
  }
`;

const BaseImg = React.forwardRef((props, ref) => (
  <img ref={ref} {...props} fetchPriority="high" loading="eager" />
));
BaseImg.displayName = "BaseImg";

const BannerMedia = styled(BaseImg)`
  display: block;
  width: calc(100% * var(--img-scale));
  height: auto;
  margin: 0 auto;
  object-fit: contain;
`;

// 이미지 로딩 실패 시 보이는 플레이스홀더
const ImgFallback = styled.div`
  width: calc(100% * var(--img-scale));
  height: 360px;
  margin: 0 auto;
  border-radius: 12px;
  border: 1px dashed ${themeVal("colors.border", "#1f2937")};
  background:
    linear-gradient(135deg, rgba(241,210,122,.12), rgba(201,147,47,.10));
  display: grid;
  place-items: center;
  color: ${themeVal("colors.textSecondary", "#9ca3af")};
  font-weight: 900;
`;

/* ============================
   CTAs
   ============================ */
const CTAColumn = styled.nav`
  display: grid;
  grid-auto-rows: minmax(64px, auto);
  gap: 14px;
  width: 100%;
  max-width: 820px;
  margin: 12px auto 0;
`;

const Icon = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; margin-right: 10px; flex-shrink: 0;
`;

const CTAText = styled.span`
  display: flex; flex-direction: column; align-items: center; text-align: center; line-height: 1.15;
  .label { font-weight: 900; font-size: clamp(17px, 3.6vw, 20px); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.25); }
  .sub { margin-top: 8px; font-size: clamp(14px, 3.2vw, 16px); color: rgba(255,255,255,.95); text-shadow: 0 1px 2px rgba(0,0,0,.2); }
`;

const BigCTAContainer = styled.div`
  width: 100%;
  border-radius: 12px;
  background: linear-gradient(135deg, #2A6AF6 0%, #2D73FF 45%, #2F7BFF 100%);
  box-shadow: 0 16px 34px rgba(0,0,0,.16);
  overflow: hidden;
`;
const BigCTAPrimary = styled(Link)`
  display: flex; align-items: center; justify-content: center;
  gap: 10px; text-decoration: none; color: #fff;
  font-weight: 900; font-size: clamp(16px, 3.6vw, 20px);
  padding: 20px 24px; min-height: 68px;
  transition: transform .12s ease, filter .18s ease;
  ${motionSafe(css`&:hover { transform: translateY(-2px); filter: brightness(1.03); }`) }
  &:active { transform: translateY(-1px); }
  ${Icon} { color: #fff; }
`;
const CTASubRow = styled.div`
  padding: 0 18px 16px; text-align: center; font-size: clamp(14px, 3.2vw, 16px);
  color: rgba(255,255,255,.95); text-shadow: 0 1px 2px rgba(0,0,0,.2);
  a { color: #fff; text-decoration: underline; font-weight: 900; }
`;
const SoftCTA = styled(Link)`
  display: inline-flex; align-items: center; justify-content: center;
  gap: 10px; text-decoration: none;
  border: none; border-radius: 12px; padding: 18px 22px; min-height: 64px;
  background: ${themeVal("colors.primary", "#2563eb")};
  color: #fff; font-weight: 800; font-size: clamp(15px, 3.4vw, 18px);
  box-shadow: 0 14px 28px rgba(0,0,0,.12);
  ${motionSafe(css`&:hover { transform: translateY(-2px); filter: brightness(1.02); }`) }
  &:active { transform: translateY(-1px); }
  ${Icon} { color: #fff; }
`;

/* ============================
   Sections
   ============================ */
const Section = styled.section`
  width: 100%; max-width: 980px; padding: 28px 16px 0; margin: 0 auto;
`;
const SectionTitle = styled.h2`
  margin: 8px 0 10px;
  font-size: clamp(22px, 4.8vw, 28px);
  font-weight: 900;
  color: ${themeVal("colors.text", "#e5e7eb")};
  text-align: center;
`;
const SectionLead = styled.p`
  margin: 0 auto 16px; max-width: 820px; text-align: center;
  color: ${themeVal("colors.textSecondary", "#9ca3af")};
`;

/* How it works */
const StepsGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const StepCard = styled.div`
  background: ${themeVal("colors.surface", "#0f172a")};
  border: 1px solid ${themeVal("colors.border", "#1f2937")};
  border-radius: 12px; padding: 16px; text-align: left;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
`;
const StepBadge = styled.span`
  display: inline-block; min-width: 28px; height: 28px; line-height: 28px;
  border-radius: 9999px; text-align: center; font-weight: 900;
  background: ${themeVal("colors.primary", "#2563eb")};
  color: ${themeVal("colors.buttonText", "#fff")}; margin-bottom: 10px;
`;
const StepTitle = styled.h3`
  margin: 6px 0 8px; font-weight: 900; font-size: 1.05rem; color: ${themeVal("colors.text", "#e5e7eb")};
`;
const StepText = styled.p`
  margin: 0; color: ${themeVal("colors.textSecondary", "#9ca3af")};
`;

/* Proof Section */
const ProofGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px;
  margin-top: 8px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;
const ProofCard = styled.div`
  background: ${themeVal("colors.surface", "#0f172a")};
  border: 1px solid ${themeVal("colors.border", "#1f2937")};
  border-radius: 12px; padding: 16px; text-align: left;
`;
const ProofTitle = styled.h3`
  margin: 0 0 6px; font-size: 1rem; font-weight: 900; color: ${themeVal("colors.text", "#e5e7eb")};
`;
const ProofText = styled.p`
  margin: 0; color: ${themeVal("colors.textSecondary", "#9ca3af")};
`;

/* Notices */
const Notice = styled.div`
  margin: 22px auto 0; max-width: 980px; padding: 12px 14px; border-radius: 12px;
  background: #fff7ed; border: 1px solid #fed7aa; color: #7c2d12;
`;
const InlineLink = styled(Link)`
  color: ${themeVal("colors.primary", "#2563eb")};
  font-weight: 800; text-decoration: none;
  &:hover { text-decoration: underline; }
`;

/* ============================
   Component
   ============================ */
function LandingPageImpl() {
  const heroCtaDescId = useId();

  // 이미지 폴백 로직: BASE_URL 경로 → 절대경로 → 실패 시 플레이스홀더
  const [imgIdx, setImgIdx] = useState(0);
  const imgSrcs = [`${heroPngBase}?v=${BUILD_VER}`, `${heroPngAbs}?v=${BUILD_VER}`];
  const onImgError = useCallback(() => {
    setImgIdx((i) => (i < imgSrcs.length - 1 ? i + 1 : i));
  }, [imgSrcs.length]);

  const finalImgSrc = imgSrcs[imgIdx];
  const showFallbackBox = imgIdx >= imgSrcs.length - 1; // 두 경로 모두 실패 시

  return (
    <PageWrapper>
      {/* 접근성: 스킵 링크 */}
      <a
        href="#calculator-section"
        className="skip-link"
        style={{position:'absolute', left:'-9999px'}}
        onFocus={(e)=>{e.currentTarget.style.left='12px'; e.currentTarget.style.top='12px'; e.currentTarget.style.zIndex=1000;}}
      >
        본문(계산기)으로 건너뛰기
      </a>

      <Hero aria-labelledby="landing-hero-title">
        <HeroOverlayAccent />
        <HeroInner>
          {/* 상단 아이브로우 */}
          <EyebrowText>서랍 속 금, 이제 999.9 투자 자산으로 정리하세요.</EyebrowText>

          {/* 헤드라인 */}
          <HeroTitle id="landing-hero-title">
            <TitleLine>
              <GoldText>사용하지 않는 금</GoldText>을 999.9 골드바
            </TitleLine>
            <TitleLine>투자 자산으로 가치 저장</TitleLine>
          </HeroTitle>

          {/* 혜택/핵심 포인트 */}
          <Row aria-label="핵심 포인트">
            <BadgeLink to="/register" $variant="primary" aria-label="1분 간편 회원가입 바로가기" title="1분 간편 회원가입">
              <Dot aria-hidden="true" /> 이메일 인증 1분 간편 회원가입
            </BadgeLink>
          </Row>

          {/* 미니 신뢰바 */}
          <TrustBar aria-label="신뢰 포인트">
            <li><Dot aria-hidden="true"/> 정품·정량 보증</li>
            <li><Dot aria-hidden="true"/> 실측 후 확정</li>
            <li><Dot aria-hidden="true"/> 교환 수수료 0원(공임 별도)</li>
          </TrustBar>

          {/* 배너 */}
          <BannerCard aria-label="프로모션 배너">
            {showFallbackBox ? (
              <ImgFallback>배너 이미지를 불러오지 못했어요</ImgFallback>
            ) : (
              <BannerMedia
                src={finalImgSrc}
                alt="Korea GoldMarket 999.9 골드바 프로모션"
                decoding="async"
                width={980}
                height={360}
                onError={onImgError}
              />
            )}
          </BannerCard>

          {/* Primary CTA + Secondary CTA(프리마켓만) */}
          <CTAColumn aria-label="주요 작업 선택">
            <BigCTAContainer role="group" aria-label="내 금 계산하고 골드바 추천 받기 카드">
              <BigCTAPrimary
                to="/gold-exchange"
                aria-label="내 금 합산하고 999.9 골드바 추천 받기"
                aria-describedby={heroCtaDescId}
              >
                <Icon aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 14l3.2-5.2h7.6L19 14l-1.6 3H6.6L5 14z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                    <path d="M8 9.2h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".8"/>
                  </svg>
                </Icon>
                <CTAText>
                  <span className="label">서랍 속 금 <b>표준화 시작하기</b></span>
                  <span id={heroCtaDescId} className="sub">미사용 금 순도 999.9 골드바로 알뜰 자동추천</span>
                </CTAText>
              </BigCTAPrimary>
              <CTASubRow>
                현재 <b>부산 지역부터</b> 제공됩니다. <Link to="/stores">오프라인 매장 자세히 보기</Link>
              </CTASubRow>
            </BigCTAContainer>

            {/* Secondary: 귀금속 프리마켓 */}
            <SoftCTA to="/trade" aria-label="귀금속 프리마켓 보기">
              <Icon aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 12h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 17h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Icon>
              <CTAText>
                <span className="label">귀금속 프리마켓</span>
                <span className="sub">전국 어디서나 채팅으로 안전 거래</span>
              </CTAText>
            </SoftCTA>
          </CTAColumn>
        </HeroInner>
      </Hero>

      {/* ===== Calculator Section (위로 이동됨) ===== */}
      <Section id="calculator-section" aria-labelledby="calc-title">
        <SectionTitle id="calc-title">교환 맛보기 계산</SectionTitle>
        <SectionLead>
          금의 <b>종류와 무게</b>만 입력하면 <b>예상 순금 중량</b>과 <b>실속 골드바 조합</b>을 한 번에 확인합니다.
        </SectionLead>
        <LiteCalcFromGX />
      </Section>

      {/* WHY NOW */}
      <Section aria-labelledby="why-now-title">
        <SectionTitle id="why-now-title">왜 지금 ‘서랍 속 금’을 999.9로 바꿔놓나요?</SectionTitle>
        <SectionLead>착용하는 14K·18K는 그대로 두세요. <b>사용하지 않는 금</b>만 국제 시세 기준의 <b>999.9 골드바</b>로 전환하면 자산 보존에 유리합니다.</SectionLead>
        <ProofGrid>
          <ProofCard>
            <ProofTitle>평가가 단순</ProofTitle>
            <ProofText>순도 × 중량 × 시세로 계산이 명확합니다. 보관·설명이 쉽습니다.</ProofText>
          </ProofCard>
          <ProofCard>
            <ProofTitle>비용 변수 최소화</ProofTitle>
            <ProofText>장식·공임 변수를 줄이고, 재료 가치 중심으로 표준화합니다.</ProofText>
          </ProofCard>
          <ProofCard>
            <ProofTitle>유동성·재매입 용이</ProofTitle>
            <ProofText>표준 규격 골드바는 국내외 재매입이 용이합니다.</ProofText>
          </ProofCard>
        </ProofGrid>
      </Section>

      {/* Clickable Teasers (login-gated) */}
      <TapTeasers />

      {/* VALUE / 기능 섹션 */}
      <Section aria-labelledby="value-compare-title">
        <SectionTitle id="value-compare-title">숫자로 보는 가치 비교</SectionTitle>
        <SectionLead>
          장신구는 장식·공임 가치가 포함되고, 골드바는 재료 가치 중심입니다. <b>자산 보존</b> 목적이라면 <b>순도 999.9</b>가 구조적으로 유리합니다.
        </SectionLead>
        <ProofGrid>
          <ProofCard>
            <ProofTitle>예상 순금 중량(자동)</ProofTitle>
            <ProofText>18K·14K 무게 입력만으로 예상 순금 중량을 즉시 계산합니다. 매장에서 실측 후 최종 확정됩니다.</ProofText>
          </ProofCard>
          <ProofCard>
            <ProofTitle>잔량 최소 골드바 조합</ProofTitle>
            <ProofText>남는 무게를 최소화하는 <b>실속 조합</b>을 제안해 교환 효율을 높입니다.</ProofText>
          </ProofCard>
          <ProofCard>
            <ProofTitle>교환 수수료 0원</ProofTitle>
            <ProofText>교환 수수료는 받지 않습니다. <b>골드바 제작 공임</b>만 부담하시면 됩니다.</ProofText>
          </ProofCard>
        </ProofGrid>
      </Section>

      {/* Why Trust / Proof Section */}
      <Section aria-labelledby="trust-proof-title">
        <SectionTitle id="trust-proof-title">신뢰 근거와 절차 공개</SectionTitle>
        <SectionLead>고객이 안심할 수 있도록 절차와 데이터를 투명하게 공개합니다.</SectionLead>
        <ProofGrid>
          <ProofCard>
            <ProofTitle>정품·정량 보증서</ProofTitle>
            <ProofText>교환 완료 시 <b>999.9 순도 확인서</b>와 중량을 기재한 보증서를 함께 드립니다.</ProofText>
          </ProofCard>
          <ProofCard>
            <ProofTitle>현장 계측</ProofTitle>
            <ProofText>매장에서 함께 <b>계측·정제 예상</b>을 확인하고 동의 후 진행합니다.</ProofText>
          </ProofCard>
          <ProofCard>
            <ProofTitle>35년+ 지역 신뢰</ProofTitle>
            <ProofText><b>원일귀금속</b> 오프라인 매장이 직접 운영합니다. 절차·내역을 문서로 남겨 드립니다.</ProofText>
          </ProofCard>
        </ProofGrid>
      </Section>

      {/* How it works */}
      <Section aria-labelledby="how-it-works-title">
        <SectionTitle id="how-it-works-title">골드바 교환 절차</SectionTitle>
        <SectionLead>3단계로 간단하게 999.9 골드바로 교환하세요.</SectionLead>
        <StepsGrid>
          <StepCard>
            <StepBadge aria-hidden="true">1</StepBadge>
            <StepTitle>무게 입력 또는 방문 예약</StepTitle>
            <StepText>계산기로 대략 확인하거나 바로 매장 방문을 예약합니다.</StepText>
          </StepCard>
          <StepCard>
            <StepBadge aria-hidden="true">2</StepBadge>
            <StepTitle>조합 미리보기</StepTitle>
            <StepText>남는 무게를 줄이는 <b>실속 골드바 조합</b>을 확인합니다.</StepText>
          </StepCard>
          <StepCard>
            <StepBadge aria-hidden="true">3</StepBadge>
            <StepTitle>현장 확인 후 교환</StepTitle>
            <StepText>계측·확인 후 교환 확정. 진행 상황은 알림과 내역에서 확인합니다.</StepText>
          </StepCard>
        </StepsGrid>

        <Notice role="note" aria-live="polite" style={{ marginTop: 18 }}>
          <strong>교환 요금이 있나요?</strong><br />
          교환 수수료는 없습니다. <b>골드바 제작 공임</b>만 부담하시면 됩니다. <InlineLink to="/goldbar-fee">골드바 공임 안내</InlineLink>
        </Notice>
        <Notice role="note" aria-live="polite" style={{ marginTop: 12 }}>
          <strong>교환 가능 지역</strong><br />
          현재 <b>부산 지역부터</b> 제공됩니다. <InlineLink to="/stores">오프라인 매장 자세히 보기</InlineLink>
        </Notice>
      </Section>

      {/* ============================
          SEO: 구조화 데이터 (Service + LocalBusiness + FAQ)
         ============================ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "골드바 교환 서비스",
            "areaServed": "Busan, KR",
            "provider": { "@type": "LocalBusiness", "name": "원일귀금속" },
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "KRW", "description": "교환 수수료 없음, 골드바 제작 공임 별도" }
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "원일귀금속",
            "image": `${heroPngBase}?v=${BUILD_VER}`,
            "address": { "@type": "PostalAddress", "addressLocality": "Busan", "addressCountry": "KR" },
            "areaServed": ["Busan"],
            "description": "부산 지역 35년 이상 운영한 귀금속 전문 매장",
            "sameAs": []
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "교환 요금이 별도로 있나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "교환 수수료는 없습니다. 골드바 제작 공임만 별도로 부담하시면 됩니다."
                }
              },
              {
                "@type": "Question",
                "name": "잔여 무게가 생기면 어떻게 되나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "계산기에서 남는 무게를 최소화하는 골드바 조합을 추천해 드립니다. 최종 교환은 매장에서 확인 후 확정됩니다."
                }
              },
              {
                "@type": "Question",
                "name": "어디에서 교환할 수 있나요?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "현재 부산 지역부터 제공되며, 오프라인 매장에서 방문 확인 후 교환이 진행됩니다."
                }
              }
            ]
          })
        }}
      />
    </PageWrapper>
  );
}

export default memo(LandingPageImpl);
