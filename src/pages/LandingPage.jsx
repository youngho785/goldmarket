import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, ArrowUpRight, Check, MapPin, Plus } from "lucide-react";
import QuickGoldValueCalculator from "@/components/gold/QuickGoldValueCalculator";
import GoldPriceBoard from "@/components/gold/GoldPriceBoard";
import VerifiedReviewSection from "@/components/reviews/VerifiedReviewSection";
import goldVerificationImage from "@/assets/goldVerificationImage";
import { trackProductEventOncePerSession } from "@/analytics/productAnalytics";

const Page = styled.div`
  width: 100%; color: var(--gm-text); --section-space: clamp(64px, 8vw, 112px);
  button, a { -webkit-tap-highlight-color: transparent; }
`;
const Eyebrow = styled.p`
  margin: 0 0 22px; color: var(--gm-text-secondary); font-size: 11px; font-weight: 650;
  letter-spacing: .16em; line-height: 1.5; text-transform: uppercase;
  display: flex; align-items: center; gap: 12px;
  &::before { content: ""; width: 26px; height: 1px; background: var(--gm-gold); }
`;
const Hero = styled.section`
  display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
  align-items: center; gap: clamp(24px, 5vw, 82px);
  position: relative;
  isolation: isolate;
  min-height: min(650px, calc(100svh - 145px));
  padding: clamp(28px, 3.5vw, 58px) 0;
  &::before {
    content: "";
    position: absolute;
    z-index: -1;
    inset: 0 calc(-1 * max(0px, (100vw - 1200px) / 2));
    background:
      radial-gradient(ellipse 46% 68% at 9% 22%, rgba(208,183,122,.18), transparent 78%),
      linear-gradient(112deg, var(--gm-background) 0%, var(--gm-background) 48%, color-mix(in srgb, var(--gm-gold-soft) 42%, var(--gm-background)) 100%);
    pointer-events: none;
  }
  @media (max-width: 850px) {
    min-height: 0; grid-template-columns: 1fr; gap: 0; padding: 12px 0 24px;
    &::before { inset: 0 -16px; background: linear-gradient(180deg, color-mix(in srgb, var(--gm-gold-soft) 50%, var(--gm-background)), var(--gm-background) 65%); }
  }
`;
const HeroCopy = styled.div`
  min-width: 0;
  padding: 20px 0 20px clamp(0px, 1.4vw, 16px);
  border-left: 3px solid color-mix(in srgb, var(--gm-gold) 70%, transparent);
  h1 { max-width: 620px; margin: 0; font-size: clamp(38px, 4.3vw, 60px); font-weight: 650;
    line-height: 1.22; letter-spacing: -.065em; color: var(--gm-primary); word-break: keep-all; }
  h1 em { font-style: normal; color: var(--gm-gold); }
  .mobile-headline { display: none; }
  > p:not(:first-child) { max-width: 450px; margin: 24px 0; color: var(--gm-text-secondary);
    font-size: 16px; line-height: 1.8; word-break: keep-all; }
  @media (max-width: 850px) {
    padding: 5px 0 14px; border-left: 0;
    h1 { font-size: clamp(25px, 6.5vw, 30px); line-height: 1.35; letter-spacing: -.045em; }
    .desktop-headline, .hero-eyebrow, .hero-description, .hero-actions, .hero-foot { display: none; }
    .mobile-headline { display: block; }
  }
`;
const Actions = styled.div`
  display: flex; gap: 12px 24px; align-items: center; flex-wrap: wrap;
`;
const MainAction = styled.button`
  display: inline-flex; gap: 26px; align-items: center; justify-content: space-between;
  min-height: 52px; padding: 14px 20px; border: 1px solid var(--gm-primary); border-radius: 3px;
  background: var(--gm-primary); color: white; cursor: pointer; font-size: 14px; font-weight: 650;
  transition: background .2s, transform .2s; box-shadow: none;
  &:hover { background: var(--gm-primary-dark); color: white; transform: translateY(-2px); }
  svg { width: 17px; height: 17px; }
`;
const TextLink = styled(Link)`
  display: inline-flex; align-items: center; gap: 14px; min-height: 44px;
  color: var(--gm-text); font-size: 13px; font-weight: 650; text-decoration: none;
  svg { width: 17px; height: 17px; transition: transform .2s; }
  &:hover svg { transform: translateX(3px); }
`;
const HeroFoot = styled.div`
  margin-top: 22px; display: flex; align-items: center; gap: 9px; color: var(--gm-text-secondary);
  font-size: 11px; svg { width: 14px; height: 14px; color: var(--gm-gold); }
  @media (max-width: 850px) { margin-top: 14px; }
`;
const ServiceLine = styled.div`
  display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; padding: 23px 0;
  border-top: 1px solid var(--gm-border); border-bottom: 1px solid var(--gm-border);
  background: color-mix(in srgb, var(--gm-gold-soft) 16%, transparent);
  span { display: inline-flex; align-items: center; gap: 9px; font-size: 12px; color: var(--gm-text-secondary); }
  svg { width: 14px; height: 14px; color: var(--gm-gold); }
  @media (max-width: 600px) { gap: 13px; span { font-size: 11px; } }
`;
const Section = styled.section`
  padding-top: var(--section-space);
`;
const SectionHead = styled.div`
  display: flex; justify-content: space-between; gap: 24px; align-items: end; margin-bottom: 28px;
  h2 { margin: 0; font-family: inherit; font-weight: 500; font-size: clamp(27px, 3.2vw, 42px); line-height: 1.3; letter-spacing: -.05em; }
  p { margin: 10px 0 0; font-size: 13px; color: var(--gm-text-secondary); }
  @media (max-width: 600px) { align-items: start; gap: 16px; h2 { font-size: 28px; } p { font-size: 12px; } }
`;
const Index = styled.span`
  display: block; margin-bottom: 16px; font-size: 10px; letter-spacing: .13em; color: var(--gm-text-secondary); font-weight: 650;
`;
const CalculatorSection = styled.div`
  min-width: 0; width: 100%; position: relative;
  padding: 9px; border: 1px solid color-mix(in srgb, var(--gm-gold) 27%, var(--gm-border)); border-radius: 26px;
  background: var(--gm-surface); box-shadow: 0 30px 78px rgba(31,50,39,.12), 0 3px 12px rgba(31,50,39,.04);
  transform: translateY(8px);
  @media (max-width: 850px) { padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; transform: none; }
`;
const CalculatorAnchor = styled.div`
  scroll-margin-top: 95px; min-width: 0;
`;
const MobileAfterCalculator = styled.div`
  display: none;
  @media (max-width: 850px) {
    display: flex; justify-content: flex-end; padding: 6px 2px 0;
    a { font-size: 13px; }
  }
`;
const SaveNote = styled.p`
  padding: 12px 4px; margin: 0; color: var(--gm-text-secondary); font-size: 12px; line-height: 1.7;
`;
const Exchange = styled(Section)`
  display: grid; grid-template-columns: 1fr 1fr; gap: clamp(30px, 7vw, 100px); align-items: center;
  figure { height: 400px; border-radius: 18px; position: relative; margin: 0; overflow: hidden; background: var(--gm-surface-alt); }
  figure img { width: 100%; height: 100%; object-fit: cover; }
  h2 { font-size: clamp(30px, 3.3vw, 44px); font-weight: 500; line-height: 1.4; letter-spacing: -.055em; margin: 0 0 22px; }
  p { font-size: 14px; line-height: 1.9; color: var(--gm-text-secondary); word-break: keep-all; }
  @media (max-width: 850px) { grid-template-columns: 1fr; gap: 30px; figure { height: 300px; } }
`;
const Principles = styled.div`
  margin: 28px 0; display: grid; gap: 16px;
  > div { display: flex; gap: 12px; align-items: start; font-size: 13px; }
  svg { width: 17px; height: 17px; color: var(--gm-gold); flex-shrink: 0; margin-top: 2px; }
`;
const Journal = styled.section`
  margin-top: var(--section-space); padding: clamp(30px, 5vw, 62px); border-radius: 24px; background: #29443C; color: #f3f0e7;
  display: grid; grid-template-columns: 1fr .85fr; gap: 45px; align-items: center;
  ${Index} { color: #b6b8a9; }
  h2 { color: inherit; font-size: clamp(29px, 3.4vw, 44px); line-height: 1.4; font-weight: 500; margin: 0 0 18px; }
  p { color: #c1c5b8; font-size: 13px; line-height: 1.9; max-width: 430px; margin-bottom: 25px; }
  ${TextLink} { color: #eee1bd; }
  @media (max-width: 700px) { grid-template-columns: 1fr; gap: 15px; }
`;
const JournalList = styled.div`
  > a { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 22px 0;
    border-bottom: 1px solid #505348; color: #f3f0e7; font-size: 16px; font-weight: 500; }
  small { display: block; margin-top: 6px; color: #b6b8a9; font-size: 12px; font-weight: 400; }
  svg { width: 18px; height: 18px; flex-shrink: 0; }
`;
const Questions = styled.div`
  max-width: 820px; margin: 0 auto;
  details { border-top: 1px solid var(--gm-border); }
  details:last-child { border-bottom: 1px solid var(--gm-border); }
  summary { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 23px 0; font-size: 15px; cursor: pointer; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  summary svg { width: 18px; height: 18px; flex-shrink: 0; transition: transform .2s; }
  details[open] summary svg { transform: rotate(45deg); }
  details p { color: var(--gm-text-secondary); font-size: 13px; line-height: 1.9; max-width: 690px; margin: 0 0 24px; }
`;
const Visit = styled.section`
  margin: clamp(44px, 6vw, 72px) 0 8px; padding: 24px 0 16px; border-top: 1px solid var(--gm-border);
  display: flex; justify-content: space-between; align-items: center; gap: 25px; flex-wrap: wrap;
  h2 { margin: 0 0 10px; font-size: 24px; font-weight: 500; }
  p { margin: 0; display: flex; align-items: center; gap: 7px; color: var(--gm-text-secondary); font-size: 12px; }
  p svg { width: 14px; height: 14px; }
`;

export default function LandingPage() {
  const [goldPreview, setGoldPreview] = useState(null);
  useEffect(() => { trackProductEventOncePerSession("landing_view", {}, "landing-view"); }, []);
  return <Page>
    <Hero aria-labelledby="landing-title">
      <HeroCopy>
        <Eyebrow className="hero-eyebrow">KOREA GOLD MARKET · GOLD, IN YOUR HANDS</Eyebrow>
        <h1 id="landing-title"><span className="desktop-headline">간직한 금의 가치,<br /><em>지금 확인하세요.</em></span><span className="mobile-headline">내 금, 지금 얼마일까요?</span></h1>
        <p className="hero-description">오래된 반지부터 소중한 목걸이까지.<br />종류와 무게를 입력하면 예상 순금량과 가치를 바로 확인할 수 있어요.</p>
        <Actions className="hero-actions"><TextLink to="/gold-to-gold">GOLD TO GOLD 알아보기 <ArrowUpRight aria-hidden /></TextLink></Actions>
        <HeroFoot className="hero-foot"><Check aria-hidden /> 회원가입 없이 계산 · 기록은 내 선택</HeroFoot>
      </HeroCopy>
      <CalculatorSection aria-label="내 금 가치 바로 계산하기">
        <CalculatorAnchor id="landing-calculator"><QuickGoldValueCalculator source="landing" eyebrow="YOUR GOLD, IN NUMBERS" title="내 금 가치 계산하기" description="종류와 무게를 입력해 보세요." onPreviewChange={setGoldPreview} />{goldPreview && <SaveNote aria-live="polite">마음에 드는 금은 ‘내 금 기록하기’로 남겨두세요. 가입 전에는 이 기기에만 저장돼요.</SaveNote>}</CalculatorAnchor><MobileAfterCalculator><TextLink to="/gold-to-gold">GOLD TO GOLD 알아보기 <ArrowUpRight aria-hidden /></TextLink></MobileAfterCalculator>
      </CalculatorSection>
    </Hero>
    <ServiceLine aria-label="이용 원칙"><span><Check aria-hidden /> 공개 시세 기준 예상 가치</span><span><Check aria-hidden /> 고객 앞에서 순도·중량 확인</span><span><Check aria-hidden /> 비용 안내와 고객 동의 후 교환</span></ServiceLine>
    <Section aria-labelledby="live-title">
      <SectionHead><div><Index>01 / TODAY’S GOLD PRICE</Index><h2 id="live-title">오늘, 금의 기준.</h2><p>1돈 = 3.75g · 내가 살 때 가격은 VAT 포함</p></div><TextLink to="/gold-price">전체 시세 <ArrowUpRight aria-hidden /></TextLink></SectionHead>
      <GoldPriceBoard compact />
    </Section>
    <Exchange aria-labelledby="exchange-trust-title">
      <figure><img src={goldVerificationImage} alt="정밀 저울에서 금의 중량을 확인하는 모습" loading="lazy" decoding="async" /></figure>
      <div><Index>03 / GOLD TO GOLD</Index><h2 id="exchange-trust-title">간직했던 금에서,<br />새로운 골드바로.</h2><p>반지·목걸이·돌반지 등 가지고 있는 금으로 만들 수 있는 골드바를 먼저 확인해 보세요. 실제 순도·중량과 공임은 매장에서 확인하고 동의 후 확정합니다.</p><Principles><div><Check aria-hidden /><span>고객 앞에서 현장 실측</span></div><div><Check aria-hidden /><span>부족분 비용과 골드바 제작 공임 사전 안내</span></div><div><Check aria-hidden /><span>측정 결과와 비용에 동의한 뒤 실제 교환</span></div></Principles><Actions><MainAction as={Link} to="/gold-exchange">예상 교환 확인 <ArrowRight aria-hidden /></MainAction><TextLink to="/goldbar-fee">제작 공임 보기 <ArrowUpRight aria-hidden /></TextLink></Actions></div>
    </Exchange>
    <Journal aria-labelledby="journal-title"><div><Index>04 / YOUR PERSONAL GOLD JOURNAL</Index><h2 id="journal-title">소중한 금을,<br />나만의 기록으로.</h2><p>가지고 있는 금을 기록해 두세요. 시세에 따라 가치가 어떻게 달라지는지 다시 살펴볼 수 있어요.</p><TextLink to="/my-gold">MY GOLD 시작하기 <ArrowRight aria-hidden /></TextLink></div><JournalList><Link to="/my-gold/items?add=1"><span>금 하나부터 기록하기<small>종류와 중량으로 간편하게 시작</small></span><ArrowUpRight aria-hidden /></Link><Link to="/my-gold"><span>가치의 흐름 확인하기<small>기록한 금의 예상 가치와 변화</small></span><ArrowUpRight aria-hidden /></Link><Link to="/my-gold#goldbar-goal"><span>다음 골드바 목표 세우기<small>예상 순금량으로 확인하는 교환 목표</small></span><ArrowUpRight aria-hidden /></Link></JournalList></Journal>
    <Section aria-label="교환 완료 고객 후기"><VerifiedReviewSection compact showInquiryAction={false} /></Section>
    <Section aria-labelledby="questions-title"><SectionHead><div><Index>GOOD TO KNOW</Index><h2 id="questions-title">시작하기 전에.</h2></div></SectionHead><Questions>
      <details><summary>계산한 금액으로 바로 교환할 수 있나요?<Plus aria-hidden /></summary><p>온라인 계산은 공개 시세와 입력 정보에 따른 예상 참고가치입니다. 실제 순도·중량·제작 공임과 부족분 비용은 매장에서 확인하고 고객이 동의한 뒤 확정합니다.</p></details>
      <details><summary>금의 중량을 몰라도 이용할 수 있나요?<Plus aria-hidden /></summary><p>매장 방문을 예약하고 실물 금의 순도와 중량을 확인할 수 있습니다. 무게를 아는 경우에는 계산기로 예상 가치를 먼저 확인하세요.</p><TextLink to="/gold-exchange?mode=visit">현장 실측 예약 <ArrowRight aria-hidden /></TextLink></details>
      <details><summary>MY GOLD에 기록하면 금을 맡기는 건가요?<Plus aria-hidden /></summary><p>아닙니다. MY GOLD는 본인이 실제로 가지고 있는 금을 기록하는 개인 기록 기능입니다. 실물 금의 보관·예치·수탁 서비스가 아닙니다.</p></details>
    </Questions></Section>
    <Visit><div><h2>금의 다음 이야기는, 매장에서.</h2><p><MapPin aria-hidden />부산광역시 부산진구 골드테마길 21 · 원일귀금속</p></div><TextLink to="/stores">매장·절차 안내 <ArrowUpRight aria-hidden /></TextLink></Visit>
  </Page>;
}
