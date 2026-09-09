import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  ArrowRight,
  Calculator,
  Gem,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import { DON_TO_GRAMS } from "@/lib/goldRates";
import { computeVaultValueWon } from "@/lib/goldVaultCatalog";
import { getGoldBarReadiness } from "@/utils/goldBarReadiness";

const GOLD_EXCHANGE_MAX_PRODUCTS = 20;

const Card = styled.section`
  position: relative;
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 26%, ${({ theme }) => theme.colors.primary});
  border-radius: 24px;
  background:
    radial-gradient(
      circle at 88% 16%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, transparent) 0,
      transparent 18rem
    ),
    linear-gradient(
      138deg,
      ${({ theme }) => theme.colors.primaryDark} 0%,
      ${({ theme }) => theme.colors.primary} 58%,
      #080b0e 100%
    );
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 18px 42px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 16%, transparent);

  &::after {
    content: "G";
    position: absolute;
    right: -10px;
    bottom: -74px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 5%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 11rem;
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  padding: 17px 15px 15px;
`;

const Kicker = styled.div`
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
  font-size: 0.58rem;
  font-weight: 950;
  letter-spacing: 0.1em;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const Title = styled.h1`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.on.primary};
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.035em;
`;

const Value = styled.strong`
  display: block;
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: clamp(2.25rem, 11vw, 3.3rem);
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.06em;
  white-space: nowrap;
`;

const Change = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? "#FFD0D3"
      : $direction === "down"
        ? "#C7E5FF"
        : `color-mix(in srgb, ${theme.on.primary} 68%, transparent)`};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.68rem;
  font-weight: 900;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin-top: 12px;
`;

const Metric = styled.div`
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.on.primary} 11%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 6%, transparent);

  span {
    display: block;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 60%, transparent);
    font-size: 0.57rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.on.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.76rem;
    font-weight: 900;
    line-height: 1.25;
    word-break: keep-all;
  }
`;

const Readiness = styled.div`
  position: relative;
  overflow: hidden;
  margin-top: 8px;
  padding: 11px 12px 10px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 28%, transparent);
  border-radius: 16px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 13%, transparent),
      color-mix(in srgb, ${({ theme }) => theme.on.primary} 4%, transparent)
    );

  small {
    display: block;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.55rem;
    font-weight: 950;
    letter-spacing: 0.1em;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: ${({ theme }) => theme.on.primary};
    font-size: 0.92rem;
    line-height: 1.3;
    word-break: keep-all;
  }

  p {
    margin: 4px 0 0;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 67%, transparent);
    font-size: 0.61rem;
    line-height: 1.4;
    word-break: keep-all;
  }
`;

const Flow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 66%, transparent);
  font-size: 0.56rem;
  font-weight: 850;
  text-align: center;

  b {
    color: ${({ theme }) => theme.colors.goldLight};
    font-weight: 950;
  }

  svg {
    width: 11px;
    height: 11px;
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const PrimaryAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin-top: 10px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.goldLight};
  border-radius: 15px;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.goldLight},
    ${({ theme }) => theme.colors.gold}
  );
  color: ${({ theme }) => theme.colors.primaryDark};
  font-size: 0.78rem;
  font-weight: 950;
  text-decoration: none;
  box-shadow: 0 10px 22px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 16%, transparent);

  svg {
    width: 17px;
    height: 17px;
  }
`;

const SubAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 34px;
  margin-top: 4px;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 72%, transparent);
  font-size: 0.63rem;
  font-weight: 850;
  text-decoration: none;

  svg {
    width: 13px;
    height: 13px;
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const Bonus = styled.div`
  margin-top: 7px;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 58%, transparent);
  font-size: 0.58rem;
  line-height: 1.4;
  text-align: center;

  strong {
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const FinePrint = styled.p`
  margin: 7px 1px 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 43%, transparent);
  font-size: 0.52rem;
  line-height: 1.4;
  text-align: center;
  word-break: keep-all;
`;

const EmptyTitle = styled.h1`
  margin: 11px 0 0;
  color: ${({ theme }) => theme.on.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.45rem, 7vw, 2rem);
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -0.045em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.goldLight};
    font-style: normal;
  }
`;

const EmptyCopy = styled.p`
  margin: 8px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 70%, transparent);
  font-size: 0.68rem;
  line-height: 1.55;
  word-break: keep-all;
`;

const EmptyBenefits = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 11px;

  span {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 4px 8px;
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.on.primary} 12%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 5%, transparent);
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 76%, transparent);
    font-size: 0.57rem;
    font-weight: 800;
  }
`;

const EmptyActions = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 5px;
  margin-top: 12px;
`;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "시세 공개 대기";
}

function formatSignedWon(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "0원";
  return `${number > 0 ? "+" : "-"}${Math.abs(Math.round(number)).toLocaleString("ko-KR")}원`;
}

function formatSignedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "비교 준비 중";
  if (number === 0) return "0.00%";
  return `${number > 0 ? "+" : "-"}${Math.abs(number).toFixed(2)}%`;
}

function formatWeight(value) {
  const grams = Number(value) || 0;
  return `${grams.toFixed(2)}g · ${(grams / DON_TO_GRAMS).toFixed(2)}돈`;
}

export default function AppMyGoldDashboard() {
  const { user } = useAuthContext() || {};
  const dashboard = useGoldVaultDashboard(user?.uid);
  const bonus = useBonusGoldBalance(user?.uid);
  const bonusBalanceG = Number(bonus.balanceG || 0);
  const hasRealGold = !!user?.uid && dashboard.summary.itemCount > 0;
  const loading = !!user?.uid && (dashboard.itemsLoading || bonus.loading);

  const totals = useMemo(() => {
    const bonusCurrentValue = dashboard.publicPriceEnabled
      ? computeVaultValueWon(bonusBalanceG, dashboard.customerSellPricePerDon)
      : 0;
    const bonusPreviousValue = dashboard.publicPriceEnabled
      ? computeVaultValueWon(bonusBalanceG, dashboard.previousCustomerSellPricePerDon)
      : 0;
    const current = Number(dashboard.summary.estimatedValueWon || 0) + bonusCurrentValue;
    const previous = Number(dashboard.summary.previousEstimatedValueWon || 0) + bonusPreviousValue;
    const amount = current > 0 && previous > 0 ? current - previous : 0;

    return {
      current,
      previous,
      amount,
      percent: previous > 0 ? (amount / previous) * 100 : null,
      direction: amount > 0 ? "up" : amount < 0 ? "down" : previous > 0 ? "same" : "unknown",
    };
  }, [
    bonusBalanceG,
    dashboard.customerSellPricePerDon,
    dashboard.previousCustomerSellPricePerDon,
    dashboard.publicPriceEnabled,
    dashboard.summary.estimatedValueWon,
    dashboard.summary.previousEstimatedValueWon,
  ]);

  const readiness = useMemo(
    () => getGoldBarReadiness(dashboard.summary.pureGoldG),
    [dashboard.summary.pureGoldG]
  );

  const exchangeProducts = useMemo(
    () =>
      dashboard.items.slice(0, GOLD_EXCHANGE_MAX_PRODUCTS).map((item) => ({
        goldType: item.goldType,
        quantity: Number(item.weightG || 0),
        inputUnit: "g",
        exchangeType: "999.9골드바",
        sourceItemId: item.id,
        sourceLabel: item.label || "금제품",
      })),
    [dashboard.items]
  );

  if (!user?.uid) {
    return (
      <Card aria-labelledby="app-my-gold-title">
        <Inner>
          <Kicker><Gem aria-hidden /> MY GOLD</Kicker>
          <EmptyTitle id="app-my-gold-title">
            내 금의 가치,<br /><em>오늘도 이어집니다.</em>
          </EmptyTitle>
          <EmptyCopy>
            14K·18K·순금의 종류와 무게만 입력해보세요. 오늘 가치와 예상 순금량,
            가능한 999.9 골드바까지 한 번에 확인할 수 있습니다.
          </EmptyCopy>
          <EmptyBenefits>
            <span>현재 가치</span>
            <span>예상 순금량</span>
            <span>골드바 조합</span>
          </EmptyBenefits>
          <EmptyActions>
            <PrimaryAction to="/my-gold?add=1">
              <Gem aria-hidden /> 내 금 가치 확인하기 <ArrowRight aria-hidden />
            </PrimaryAction>
            <SubAction to="/gold-exchange">
              <Calculator aria-hidden /> 금교환 바로 계산 <ArrowRight aria-hidden />
            </SubAction>
          </EmptyActions>
          <Bonus>
            비회원도 내금고를 먼저 볼 수 있고, <strong>내 금 저장은 회원가입 후</strong> 시작합니다.
          </Bonus>
        </Inner>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card aria-labelledby="app-my-gold-title">
        <Inner>
          <Kicker><Gem aria-hidden /> MY GOLD</Kicker>
          <Title id="app-my-gold-title">내금고를 불러오고 있어요</Title>
          <Value>불러오는 중</Value>
        </Inner>
      </Card>
    );
  }

  if (!hasRealGold) {
    return (
      <Card aria-labelledby="app-my-gold-title">
        <Inner>
          <Kicker><Gem aria-hidden /> MY GOLD</Kicker>
          <EmptyTitle id="app-my-gold-title">
            내 금 1개부터<br /><em>기록해보세요.</em>
          </EmptyTitle>
          <EmptyCopy>
            반지 하나, 돌반지 하나부터 시작하면 오늘 가치와 변화, 예상 순금량과
            교환 가능한 골드바가 계속 연결됩니다.
          </EmptyCopy>
          {bonusBalanceG > 0 && (
            <Bonus>현재 회원혜택 적립 <strong>순금 {bonusBalanceG.toFixed(2)}g</strong> 보유 중</Bonus>
          )}
          <PrimaryAction to="/my-gold?add=1">
            <Plus aria-hidden /> 첫 금 등록하기 <ArrowRight aria-hidden />
          </PrimaryAction>
          <SubAction to="/gold-exchange">
            등록 없이 먼저 교환 계산 <ArrowRight aria-hidden />
          </SubAction>
        </Inner>
      </Card>
    );
  }

  const ChangeIcon =
    totals.direction === "up"
      ? TrendingUp
      : totals.direction === "down"
        ? TrendingDown
        : Minus;

  return (
    <Card aria-labelledby="app-my-gold-title">
      <Inner>
        <Kicker><Gem aria-hidden /> MY GOLD · 내금고</Kicker>
        <Title id="app-my-gold-title">내 금의 오늘 가치</Title>
        <Value>
          {dashboard.publicPriceEnabled ? formatWon(totals.current) : "시세 공개 대기"}
        </Value>

        {dashboard.publicPriceEnabled && Number.isFinite(totals.percent) && (
          <Change $direction={totals.direction}>
            <ChangeIcon aria-hidden />
            오늘 {formatSignedWon(totals.amount)} · {formatSignedPercent(totals.percent)}
          </Change>
        )}

        <MetricGrid>
          <Metric>
            <span>등록 실물 금</span>
            <strong>{formatWeight(dashboard.summary.totalWeightG)}</strong>
          </Metric>
          <Metric>
            <span>예상 순금량</span>
            <strong>{formatWeight(dashboard.summary.pureGoldG)}</strong>
          </Metric>
        </MetricGrid>

        {readiness && (
          <Readiness>
            <small>MY GOLD → 999.9 GOLD BAR</small>
            <strong>
              {readiness.available
                ? `${readiness.label} 교환 가능`
                : `1g 골드바까지 ${readiness.neededG.toFixed(2)}g 더 필요`}
            </strong>
            <p>
              {readiness.available
                ? `현재 실물 금 기준 예상 잔여 순금 ${readiness.remainingG.toFixed(2)}g · 실제 순금량은 매장 실측 후 확정됩니다.`
                : "실물 금을 더 등록하거나 다른 금과 함께 계산해 볼 수 있습니다."}
            </p>
            <Flow aria-hidden>
              <span>보유 금</span><ArrowRight /><span>예상 순금량</span><ArrowRight /><b>999.9 GOLD</b>
            </Flow>
          </Readiness>
        )}

        <PrimaryAction
          to="/gold-exchange"
          state={{ source: "my-gold", vaultProducts: exchangeProducts }}
          aria-label="내금고에 등록한 실물 금으로 999.9 골드바 교환 계산하기"
        >
          <Calculator aria-hidden /> 내 금으로 교환 계산하기 <ArrowRight aria-hidden />
        </PrimaryAction>
        <SubAction to="/my-gold">
          내금고 자세히 <ArrowRight aria-hidden />
        </SubAction>

        {bonusBalanceG > 0 && (
          <Bonus>
            회원혜택 적립 <strong>순금 {bonusBalanceG.toFixed(2)}g</strong>도 금교환 가치에 함께 더해집니다.
          </Bonus>
        )}
        <FinePrint>
          현재 공개 시세와 교환 기준 환산율을 적용한 참고값이며 최종 순도·중량·공임은 매장에서 확인합니다.
        </FinePrint>
      </Inner>
    </Card>
  );
}
