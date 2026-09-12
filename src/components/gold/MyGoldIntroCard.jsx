// src/components/gold/MyGoldIntroCard.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowRight,
  Gem,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import { DON_TO_GRAMS } from "@/lib/goldRates";
import {
  computeVaultPureGoldG,
  computeVaultValueWon,
} from "@/lib/goldVaultCatalog";

const GUEST_SAMPLE_ITEMS = Object.freeze([
  {
    label: "18K 팔찌",
    goldType: "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)",
    weightG: 10,
  },
  {
    label: "순금 돌반지",
    goldType: "순금 999제품(팔찌,목걸이, 반지,귀걸이)",
    weightG: DON_TO_GRAMS * 2,
  },
]);

const Card = styled.section`
  position: relative;
  width: 100%;
  margin: 0;
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.primary});
  border-radius: 22px;
  background:
    radial-gradient(
      circle at 88% 22%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 20%, transparent) 0,
      transparent 18rem
    ),
    linear-gradient(
      135deg,
      ${({ theme }) => theme.colors.primaryDark} 0%,
      ${({ theme }) => theme.colors.primary} 58%,
      #070a0d 100%
    );
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 16px 38px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 14%, transparent);

  &::after {
    content: "G";
    position: absolute;
    right: -8px;
    bottom: -70px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 5%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 11rem;
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 680px) {
    width: 100%;
    border-radius: 20px;
  }
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(22px, 3.5vw, 48px);
  padding: clamp(20px, 2.6vw, 30px) clamp(20px, 3.2vw, 38px);

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    gap: 14px;
  }
`;

const Copy = styled.div`
  min-width: 0;
  max-width: 880px;
`;

const Kicker = styled.small`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 4px 8px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 22%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 7%, transparent);
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.62rem;
  font-weight: 950;
  letter-spacing: 0.11em;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const Title = styled.h2`
  margin: 7px 0 0;
  color: ${({ theme }) => theme.on.primary} !important;
  font-size: clamp(1.12rem, 1.8vw, 1.48rem);
  font-weight: 900;
  line-height: 1.24;
  letter-spacing: -0.03em;
  word-break: keep-all;
`;

const ValueRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 13px;
  margin-top: 8px;
`;

const Value = styled.strong`
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: clamp(2.1rem, 4.8vw, 3.25rem);
  font-weight: 950;
  line-height: 0.98;
  letter-spacing: -0.055em;
  white-space: nowrap;

  @media (max-width: 420px) {
    font-size: clamp(1.95rem, 9.5vw, 2.7rem);
  }
`;

const Change = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? "#FFD0D3"
      : $direction === "down"
        ? "#C7E5FF"
        : `color-mix(in srgb, ${theme.on.primary} 62%, transparent)`};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.78rem;
  font-weight: 900;
  white-space: nowrap;
`;


const EmptyCopy = styled.p`
  max-width: 620px;
  margin: 9px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 72%, transparent);
  font-size: .82rem;
  line-height: 1.55;
  word-break: keep-all;
  strong { color: ${({ theme }) => theme.colors.goldLight}; }
`;

const Aside = styled.div`
  display: grid;
  justify-items: end;
  align-content: center;
  gap: 8px;
  min-width: 210px;

  @media (max-width: 760px) {
    justify-items: stretch;
    min-width: 0;
  }
`;

const BonusLine = styled.div`
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 5px;
  margin-top: 9px;
  padding: 5px 8px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 15%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 5%, transparent);
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 72%, transparent);
  font-size: 0.61rem;
  font-weight: 800;
  line-height: 1.3;

  strong {
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-weight: 950;
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-weight: 900;
    text-decoration: none;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const Action = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 45px;
  padding: 9px 16px;
  border: 1px solid ${({ theme }) => theme.colors.goldLight};
  border-radius: 12px;
  background:
    linear-gradient(
      135deg,
      ${({ theme }) => theme.colors.goldLight},
      ${({ theme }) => theme.colors.gold}
    );
  color: ${({ theme }) => theme.colors.primaryDark};
  box-shadow: 0 8px 18px
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 14%, transparent);
  font-size: 0.75rem;
  font-weight: 950;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryDark};
    filter: brightness(1.04);
  }

  @media (max-width: 760px) {
    width: 100%;
  }
`;

const Disclaimer = styled.small`
  max-width: 220px;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 50%, transparent);
  text-align: right;
  font-size: 0.62rem;
  line-height: 1.4;
  word-break: keep-all;

  @media (max-width: 760px) {
    max-width: none;
    text-align: left;
  }
`;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "시세 공개 대기";
}

function changePercentView(changePercent, direction) {
  if (!Number.isFinite(changePercent)) {
    return {
      icon: Minus,
      direction: "unknown",
      text: "전일 비교 준비 중",
    };
  }

  if (direction === "same") {
    return {
      icon: Minus,
      direction: "same",
      text: "전일 대비 0.00%",
    };
  }

  const up = direction === "up";
  return {
    icon: up ? TrendingUp : TrendingDown,
    direction,
    text: `전일 대비 ${up ? "+" : "-"}${Math.abs(changePercent).toFixed(2)}%`,
  };
}

export default function MyGoldIntroCard() {
  const { user } = useAuthContext() || {};
  const dashboard = useGoldVaultDashboard(user?.uid);
  const bonus = useBonusGoldBalance(user?.uid);
  const bonusBalanceG = Number(bonus.balanceG || 0);
  const hasRealGold = !!user?.uid && dashboard.summary.itemCount > 0;
  const hasBonusGold = !!user?.uid && bonusBalanceG > 0;
  const hasVaultContent = hasRealGold || hasBonusGold;
  const waitingForVault =
    !!user?.uid && (dashboard.itemsLoading || bonus.loading);

  const guestSample = useMemo(() => {
    const values = GUEST_SAMPLE_ITEMS.map((item) => {
      const pureGoldG = computeVaultPureGoldG(item, dashboard.rates);
      return {
        currentValue: dashboard.publicPriceEnabled
          ? computeVaultValueWon(pureGoldG, dashboard.customerSellPricePerDon)
          : 0,
        previousValue: dashboard.publicPriceEnabled
          ? computeVaultValueWon(pureGoldG, dashboard.previousCustomerSellPricePerDon)
          : 0,
      };
    });

    const totals = values.reduce(
      (acc, item) => ({
        estimatedValueWon: acc.estimatedValueWon + item.currentValue,
        previousEstimatedValueWon:
          acc.previousEstimatedValueWon + item.previousValue,
      }),
      { estimatedValueWon: 0, previousEstimatedValueWon: 0 }
    );
    const changeWon =
      totals.estimatedValueWon > 0 && totals.previousEstimatedValueWon > 0
        ? totals.estimatedValueWon - totals.previousEstimatedValueWon
        : 0;
    const changePercent =
      totals.previousEstimatedValueWon > 0
        ? (changeWon / totals.previousEstimatedValueWon) * 100
        : null;

    return {
      ...totals,
      changePercent,
      changeDirection:
        changeWon > 0
          ? "up"
          : changeWon < 0
            ? "down"
            : changePercent === 0
              ? "same"
              : "unknown",
    };
  }, [
    dashboard.rates,
    dashboard.publicPriceEnabled,
    dashboard.customerSellPricePerDon,
    dashboard.previousCustomerSellPricePerDon,
  ]);

  const actual = useMemo(() => {
    const bonusCurrentValue = dashboard.publicPriceEnabled
      ? computeVaultValueWon(bonusBalanceG, dashboard.customerSellPricePerDon)
      : 0;
    const bonusPreviousValue = dashboard.publicPriceEnabled
      ? computeVaultValueWon(bonusBalanceG, dashboard.previousCustomerSellPricePerDon)
      : 0;
    const estimatedValueWon =
      Number(dashboard.summary.estimatedValueWon || 0) + bonusCurrentValue;
    const previousEstimatedValueWon =
      Number(dashboard.summary.previousEstimatedValueWon || 0) + bonusPreviousValue;
    const changeWon =
      estimatedValueWon > 0 && previousEstimatedValueWon > 0
        ? estimatedValueWon - previousEstimatedValueWon
        : 0;
    const changePercent =
      previousEstimatedValueWon > 0
        ? (changeWon / previousEstimatedValueWon) * 100
        : null;

    return {
      estimatedValueWon,
      previousEstimatedValueWon,
      changePercent,
      changeDirection:
        changeWon > 0
          ? "up"
          : changeWon < 0
            ? "down"
            : changePercent === 0
              ? "same"
              : "unknown",
    };
  }, [
    bonusBalanceG,
    dashboard.publicPriceEnabled,
    dashboard.customerSellPricePerDon,
    dashboard.previousCustomerSellPricePerDon,
    dashboard.summary.estimatedValueWon,
    dashboard.summary.previousEstimatedValueWon,
  ]);

  const showGuestSample = !user?.uid;
  const display = showGuestSample ? guestSample : actual;
  const change = changePercentView(display.changePercent, display.changeDirection);
  const ChangeIcon = change.icon;

  return (
    <Card aria-labelledby="my-gold-intro-title">
      <Inner>
        <Copy>
          <Kicker>
            <Gem size={13} aria-hidden />
            {waitingForVault
              ? "MY GOLD"
              : hasVaultContent
                ? "MY GOLD"
                : showGuestSample
                  ? "MY GOLD · 체험 예시"
                  : "MY GOLD"}
          </Kicker>

          <Title id="my-gold-intro-title">
            {waitingForVault
              ? "MY GOLD를 불러오고 있어요"
              : hasVaultContent || showGuestSample
                ? "내 금의 오늘 가치"
                : "내 금, 오늘 얼마일까요?"}
          </Title>

          {(waitingForVault || hasVaultContent || showGuestSample) ? (
            <ValueRow>
              <Value>
                {waitingForVault
                  ? "불러오는 중"
                  : dashboard.publicPriceEnabled
                    ? formatWon(display.estimatedValueWon)
                    : "시세 공개 대기"}
              </Value>
              {dashboard.publicPriceEnabled && !waitingForVault && (hasVaultContent || showGuestSample) && (
                <Change $direction={change.direction}>
                  <ChangeIcon size={14} aria-hidden />
                  {change.text}
                </Change>
              )}
            </ValueRow>
          ) : (
            <EmptyCopy>
              반지·목걸이·돌반지 등 <strong>금 1개만 기록하면</strong> 오늘 가치, 가격 변화, 예상 순금량, 교환 가능한 골드바를 계속 확인할 수 있습니다.
            </EmptyCopy>
          )}

          {!waitingForVault && hasVaultContent && user?.uid && (
            <BonusLine>
              MEMBER GOLD <strong>{bonusBalanceG.toFixed(2)}g</strong>도 금교환 가치에 함께 더해집니다.
            </BonusLine>
          )}

          {showGuestSample && (
            <BonusLine>
              체험 예시 · 18K 팔찌 10g + 순금 돌반지 2돈
            </BonusLine>
          )}
        </Copy>

        <Aside>
          <Action to="/my-gold">
            {hasVaultContent ? "MY GOLD 보기" : user?.uid ? "첫 금 기록하기" : "MY GOLD 체험하기"}
            <ArrowRight size={15} aria-hidden />
          </Action>
          <Disclaimer>
            {hasVaultContent
              ? "기록한 금과 MEMBER GOLD에 현재 환산율과 공개 시세를 적용한 참고값이며 실제 교환 결과는 매장 확인 후 확정됩니다."
              : user?.uid
                ? "가상의 자산 금액을 표시하지 않습니다. 금을 기록한 뒤 실제 입력값으로 오늘 가치와 예상 순금량을 계산합니다."
                : "예시 금제품과 현재 공개 시세를 적용한 체험값입니다. 실제 내 금은 회원가입 후 저장할 수 있습니다."}
          </Disclaimer>
        </Aside>
      </Inner>
    </Card>
  );
}
