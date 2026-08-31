// src/pages/GoldToGoldIntro.jsx
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Gem,
  ReceiptText,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const Page = styled.main`
  display: grid;
  gap: 14px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 0 0 18px;
`;

const Hero = styled.section`
  position: relative;
  overflow: hidden;
  padding: 25px 20px 22px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 34%, ${({ theme }) => theme.colors.border});
  border-radius: 24px;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 96%, white) 0%,
      ${({ theme }) => theme.colors.surface} 100%
    );

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 20px;
    width: 76px;
    height: 3px;
    border-radius: 0 0 999px 999px;
    background: ${({ theme }) => theme.colors.secondary};
  }

  &::after {
    content: "G";
    position: absolute;
    right: -12px;
    bottom: -43px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 8%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 10rem;
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }
`;

const Kicker = styled.div`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 5px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.09em;

  svg {
    width: 13px;
    height: 13px;
  }
`;

const HeroTitle = styled.h1`
  position: relative;
  z-index: 1;
  margin: 14px 0 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.75rem, 8vw, 2.35rem);
  line-height: 1.16;
  letter-spacing: -0.05em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-style: normal;
  }
`;

const HeroCopy = styled.p`
  position: relative;
  z-index: 1;
  max-width: 440px;
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.79rem;
  line-height: 1.65;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 850;
  }
`;

const BrandLine = styled.p`
  position: relative;
  z-index: 1;
  margin: 14px 0 0;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.63rem;
  font-weight: 900;
  letter-spacing: 0.08em;
`;

const Card = styled.section`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
`;

const CardHead = styled.div`
  padding: 17px 17px 13px;

  small {
    display: block;
    margin-bottom: 5px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.61rem;
    font-weight: 900;
    letter-spacing: 0.08em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.08rem;
    line-height: 1.35;
    letter-spacing: -0.025em;
    word-break: keep-all;
  }

  p {
    margin: 7px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.72rem;
    line-height: 1.55;
    word-break: keep-all;
  }
`;

const CompareStack = styled.div`
  display: grid;
  gap: 9px;
  padding: 0 14px 15px;
`;

const CompareBlock = styled.div`
  padding: 14px;
  border: 1px solid
    ${({ $brand, theme }) =>
      $brand
        ? `color-mix(in srgb, ${theme.colors.gold} 34%, ${theme.colors.border})`
        : theme.colors.border};
  border-radius: 16px;
  background: ${({ $brand, theme }) =>
    $brand ? theme.semantic.badgeGoldBg : theme.colors.surfaceAlt};

  small {
    display: block;
    margin-bottom: 8px;
    color: ${({ $brand, theme }) =>
      $brand ? theme.colors.secondaryDark : theme.colors.textLight};
    font-size: 0.58rem;
    font-weight: 900;
    letter-spacing: 0.07em;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.8rem;
    line-height: 1.4;
  }
`;

const Flow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 5px;
  margin-top: 10px;
`;

const FlowItem = styled.span`
  display: grid;
  place-items: center;
  min-height: 48px;
  padding: 7px 4px;
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.61rem;
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
  word-break: keep-all;
`;

const Story = styled.section`
  overflow: hidden;
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
`;

const StoryTop = styled.div`
  padding: 21px 18px 17px;

  small {
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.61rem;
    font-weight: 900;
    letter-spacing: 0.09em;

    svg {
      width: 13px;
      height: 13px;
    }
  }

  h2 {
    margin: 9px 0 0;
    color: ${({ theme }) => theme.colors.white};
    font-size: 1.35rem;
    line-height: 1.3;
    letter-spacing: -0.035em;
    word-break: keep-all;
  }

  p {
    margin: 8px 0 0;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 88%, white);
    font-size: 0.72rem;
    line-height: 1.58;
    word-break: keep-all;
  }
`;

const StoryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, transparent);
`;

const StoryItem = styled.div`
  min-height: 74px;
  padding: 13px 14px;
  border-right: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent);
  border-bottom: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent);

  &:nth-child(2n) {
    border-right: 0;
  }

  &:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  small {
    display: block;
    margin-bottom: 4px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.55rem;
    font-weight: 900;
    letter-spacing: 0.06em;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.white};
    font-size: 0.72rem;
    line-height: 1.38;
    word-break: keep-all;
  }
`;

const ValueFlow = styled.div`
  padding: 14px 16px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.primaryDark} 72%, black);
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-align: center;
`;

const TrustList = styled.div`
  display: grid;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const TrustRow = styled.div`
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 13px 15px;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  }

  > span {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 11px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg {
    width: 17px;
    height: 17px;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.75rem;
    line-height: 1.35;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.65rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const CTA = styled.section`
  padding: 18px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 30%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.12rem;
    line-height: 1.35;
    letter-spacing: -0.025em;
  }

  p {
    margin: 6px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.7rem;
    line-height: 1.5;
  }
`;

const PrimaryAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  margin-top: 13px;
  padding: 11px 14px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.84rem;
  font-weight: 900;
  text-decoration: none;

  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SecondaryAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  margin-top: 5px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.66rem;
  font-weight: 850;
  text-decoration: none;

  svg {
    width: 14px;
    height: 14px;
  }
`;

export default function GoldToGoldIntro() {
  return (
    <Page>
      <Hero>
        <Kicker>
          <Sparkles aria-hidden />
          GOLD TO GOLD
        </Kicker>
        <HeroTitle>
          금을 팔지 않고,
          <br />
          <em>가치로 이어가는 방법.</em>
        </HeroTitle>
        <HeroCopy>
          가지고 있는 14K·18K·순금 등을 먼저 현금으로 팔지 않고,
          순도와 중량을 확인해 <strong>순금 가치로 계산하고 999.9 골드바로 이어가는</strong>{" "}
          한국골드마켓의 금교환 방식입니다.
        </HeroCopy>
        <BrandLine>KOREA GOLD MARKET · GOLD TO GOLD</BrandLine>
      </Hero>

      <Card>
        <CardHead>
          <small>WHY GOLD TO GOLD</small>
          <h2>왜 굳이 금을 팔았다 다시 사야 할까요?</h2>
          <p>두 방식의 흐름을 먼저 비교해보세요.</p>
        </CardHead>

        <CompareStack>
          <CompareBlock>
            <small>일반적인 방식 · SELL & BUY</small>
            <strong>금을 현금으로 판매한 뒤 골드바를 다시 구매</strong>
            <Flow>
              <FlowItem>내 금</FlowItem>
              <FlowItem>현금 판매</FlowItem>
              <FlowItem>골드바 재구매</FlowItem>
            </Flow>
          </CompareBlock>

          <CompareBlock $brand>
            <small>한국골드마켓 · GOLD TO GOLD</small>
            <strong>금의 순금 가치를 999.9 골드바로 바로 이어갑니다.</strong>
            <Flow>
              <FlowItem>내 금</FlowItem>
              <FlowItem>순도·중량 확인</FlowItem>
              <FlowItem>999.9 골드바</FlowItem>
            </Flow>
          </CompareBlock>
        </CompareStack>
      </Card>

      <Story>
        <StoryTop>
          <small>
            <Gem aria-hidden />
            YOUR GOLD · YOUR STORY
          </small>
          <h2>금은 오래되어도,<br />가치까지 오래되지는 않습니다.</h2>
          <p>
            사용하지 않는 금도 저마다의 기억은 남아 있습니다.
            그 의미는 간직하고, 금의 가치는 새로운 골드로 이어갈 수 있습니다.
          </p>
        </StoryTop>

        <StoryGrid>
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
            <strong>오래 보관한 돌반지·순금 제품</strong>
          </StoryItem>
        </StoryGrid>

        <ValueFlow>YOUR GOLD → PURE GOLD VALUE → 999.9 GOLD</ValueFlow>
      </Story>

      <Card>
        <CardHead>
          <small>CHECK BEFORE YOU DECIDE</small>
          <h2>확인하고, 그다음 결정하세요.</h2>
        </CardHead>
        <TrustList>
          <TrustRow>
            <span><Scale aria-hidden /></span>
            <div>
              <strong>온라인에서 예상 결과 확인</strong>
              <p>종류와 중량을 입력해 예상 순금 중량과 골드바 조합을 먼저 확인합니다.</p>
            </div>
          </TrustRow>
          <TrustRow>
            <span><ShieldCheck aria-hidden /></span>
            <div>
              <strong>매장에서 순도·중량 실측</strong>
              <p>실제 교환 중량은 고객 앞에서 확인하고 최종 인정 중량을 안내합니다.</p>
            </div>
          </TrustRow>
          <TrustRow>
            <span><ReceiptText aria-hidden /></span>
            <div>
              <strong>결과와 제작 공임 확인 후 결정</strong>
              <p>측정 결과와 적용되는 골드바 제작 공임을 확인한 뒤 교환 여부를 결정합니다.</p>
            </div>
          </TrustRow>
        </TrustList>
      </Card>

      <CTA>
        <h2>내 금은 어떤 999.9 골드바가 될까요?</h2>
        <p>로그인 없이 예상 교환 결과부터 확인할 수 있습니다.</p>
        <PrimaryAction to="/gold-exchange">
          <span>
            <CircleDollarSign aria-hidden />
            골드 투 골드 하러가기
          </span>
          <ArrowRight aria-hidden />
        </PrimaryAction>
        <SecondaryAction to="/goldbar-fee">
          골드바 제작 공임 확인
          <ArrowRight aria-hidden />
        </SecondaryAction>
      </CTA>
    </Page>
  );
}
