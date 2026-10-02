import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import LivingGoldMark from "@/components/common/LivingGoldMark";
import LivingGoldCompanion from "@/components/common/LivingGoldCompanion";
import { livingGoldSweep } from "@/styles/livingGoldMotion";
import {
  ChevronRight,
  Gem,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";


const Card = styled.section`
  position: relative;
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.primary});
  border-radius: 20px;
  background: linear-gradient(
    138deg,
    ${({ theme }) => theme.colors.primaryDark} 0%,
    ${({ theme }) => theme.colors.primary} 62%,
    #0b0d10 100%
  );
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 10px 24px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);

  &::after {
    content: "";
    position: absolute;
    z-index: 0;
    top: -30%;
    bottom: -30%;
    left: -26%;
    width: 22%;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 34%, transparent), transparent);
    pointer-events: none;
    animation: ${livingGoldSweep} 1500ms cubic-bezier(.2,.8,.2,1) 260ms both;
  }
`;

const SummaryShell = styled.div`
  position: relative;
  height: 100%;

  /* Desktop 2-column layout uses full height. On stacked/mobile layouts,
     auto height must include the weekly trend row in normal document flow. */
  @media (max-width: 900px) {
    height: auto;
  }
`;

const SummaryCard = styled(Card)`
  display: block;
  height: 100%;
  color: ${({ theme }) => theme.on.primary};
  text-decoration: none;
  cursor: pointer;
  border-radius: ${({ $withWeekly }) => ($withWeekly ? "20px 20px 0 0" : "20px")};
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.goldLight};
    outline-offset: 2px;
  }

  @media (max-width: 900px) {
    height: auto;
  }
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  padding: 12px 13px;
`;

const SummaryInner = styled(Inner)`
  display: flex;
  min-height: 242px;
  height: 100%;
  flex-direction: column;
  padding: 18px;

  @media (max-width: 560px) {
    min-height: 190px;
    padding: 16px 18px 15px;
  }
`;

const Topline = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  > svg {
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const Kicker = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.7rem;
  font-weight: 950;
  letter-spacing: 0.09em;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const SummaryKicker = styled(Kicker)`
  min-height: 28px;
  padding-left: 34px;
`;

const SummaryGoldCompanion = styled(LivingGoldCompanion)`
  position: absolute;
  z-index: 4;
  top: 9px;
  left: 10px;
`;

const Value = styled.strong`
  display: block;
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: "Segoe UI", "Malgun Gothic", Arial, sans-serif;
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  font-size: clamp(2rem, 6vw, 2.7rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.055em;
  white-space: nowrap;
`;

const Change = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 7px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? "#FFD0D3"
      : $direction === "down"
        ? "#C7E5FF"
        : `color-mix(in srgb, ${theme.on.primary} 68%, transparent)`};
  font-family: "Segoe UI", "Malgun Gothic", Arial, sans-serif;
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  font-size: 0.72rem;
  font-weight: 900;

  svg {
    width: 13px;
    height: 13px;
  }

  animation: ${({ $animate }) =>
    $animate
      ? "kgm-my-gold-change-in 380ms cubic-bezier(.22,1,.36,1) 900ms both"
      : "none"};

  @keyframes kgm-my-gold-change-in {
    from {
      opacity: 0;
      transform: translateY(7px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const SummaryMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, ${({ theme }) => theme.on.primary} 11%, transparent);
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 70%, transparent);
  font-size: 0.7rem;
  font-weight: 800;

  strong {
    margin-left: 4px;
    color: ${({ theme }) => theme.on.primary};
    font-family: "Segoe UI", "Malgun Gothic", Arial, sans-serif;
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: "tnum" 1, "lnum" 1;
    font-size: 0.72rem;
    font-weight: 900;
  }

  span:last-child {
    color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 62%, white);
    font-weight: 950;
    white-space: nowrap;
  }
`;

const WeeklyTrendLink = styled(Link)`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 40px;
  margin-top: -1px;
  padding: 8px 13px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.primary});
  border-top-color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 11%, transparent);
  border-radius: 0 0 16px 16px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.primary} 94%, ${({ theme }) => theme.colors.gold} 6%);
  color: ${({ theme }) => theme.on.primary};
  text-decoration: none;

  > span {
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 68%, transparent);
    font-size: 0.7rem;
    font-weight: 850;
  }

  > strong {
    justify-self: end;
    color: ${({ $direction, theme }) =>
      $direction === "up"
        ? "#FFD0D3"
        : $direction === "down"
          ? "#C7E5FF"
          : theme.colors.goldLight};
    font-family: "Segoe UI", "Malgun Gothic", Arial, sans-serif;
    font-variant-numeric: tabular-nums lining-nums;
    font-feature-settings: "tnum" 1, "lnum" 1;
    font-size: 0.72rem;
    font-weight: 900;
    white-space: nowrap;
  }

  > svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.goldLight};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.goldLight};
    outline-offset: 2px;
  }
`;

const ActionRow = styled.div`
  display: grid;
  margin-top: 10px;
`;

const PrimaryAction = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.goldLight};
  border-radius: 13px;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.goldLight},
    ${({ theme }) => theme.colors.gold}
  );
  color: ${({ theme }) => theme.colors.primaryDark};
  font-size: 0.76rem;
  font-weight: 950;
  text-align: center;
  text-decoration: none;

  svg {
    width: 15px;
    height: 15px;
  }
`;

const EmptyTitle = styled.h1`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.on.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.18rem, 5.7vw, 1.5rem);
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.04em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.goldLight};
    font-style: normal;
  }
`;

const EmptyCopy = styled.p`
  margin: 6px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 68%, transparent);
  font-size: 0.7rem;
  line-height: 1.45;
  word-break: keep-all;
`;

function useAnimatedMyGoldValue(targetValue, previousValue, enabled) {
  const target = Number(targetValue) || 0;
  const previous = Number(previousValue) || 0;
  const [displayValue, setDisplayValue] = useState(
    enabled && previous > 0 && target > 0 ? previous : target
  );

  useEffect(() => {
    if (!enabled || target <= 0 || previous <= 0 || previous === target) {
      setDisplayValue(target);
      return undefined;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ) {
      setDisplayValue(target);
      return undefined;
    }

    setDisplayValue(previous);

    let frameId = 0;
    const duration = 880;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(previous + (target - previous) * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [enabled, previous, target]);

  return displayValue;
}

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

export default function AppMyGoldDashboard({ user, dashboard, animateValue = false, weeklyTrend = null }) {
  const hasRealGold = !!user?.uid && dashboard.summary.itemCount > 0;
  const loading = !!user?.uid && dashboard.itemsLoading;

  const totals = useMemo(() => {
    const current = Number(dashboard.summary.estimatedValueWon || 0);
    const previous = Number(dashboard.summary.previousEstimatedValueWon || 0);
    const amount = current > 0 && previous > 0 ? current - previous : 0;

    return {
      current,
      amount,
      percent: previous > 0 ? (amount / previous) * 100 : null,
      direction: amount > 0 ? "up" : amount < 0 ? "down" : previous > 0 ? "same" : "unknown",
    };
  }, [
    dashboard.summary.estimatedValueWon,
    dashboard.summary.previousEstimatedValueWon,
  ]);

  const previousValue = Number(
    dashboard.summary.previousEstimatedValueWon || 0
  );
  const shouldAnimateValue =
    animateValue &&
    dashboard.publicPriceEnabled &&
    previousValue > 0 &&
    totals.current > 0 &&
    previousValue !== totals.current;

  const animatedCurrent = useAnimatedMyGoldValue(
    totals.current,
    previousValue,
    shouldAnimateValue
  );

  if (!user?.uid) {
    return (
      <Card aria-labelledby="app-my-gold-title">
        <Inner>
          <Kicker>
            <LivingGoldCompanion
              size={28}
              delay={90}
              ariaLabel="Living Gold로 MY GOLD 체험 열기"
              title="오늘도 금의 가치는 움직여요."
              description="금의 종류와 중량만 기록하면 지금 내 금의 가치가 작은 금빛으로 이어집니다."
              actionLabel="MY GOLD 체험하기"
              actionTo="/my-gold?add=1"
            />
            <span>MY GOLD</span>
          </Kicker>
          <EmptyTitle id="app-my-gold-title">내 금은 오늘 얼마일까요?</EmptyTitle>
          <EmptyCopy>
            내가 실제로 가진 금의 종류와 중량을 기록해 오늘 참고가치를 확인합니다. 실물을 맡기는 서비스가 아닙니다.
          </EmptyCopy>
          <ActionRow>
            <PrimaryAction to="/my-gold?add=1">
              <Gem aria-hidden /> 내 금 가치 확인
            </PrimaryAction>
          </ActionRow>
        </Inner>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card aria-labelledby="app-my-gold-title">
        <Inner>
          <Kicker id="app-my-gold-title"><LivingGoldMark size={28} delay={90} /><span>MY GOLD</span></Kicker>
          <Value>불러오는 중</Value>
        </Inner>
      </Card>
    );
  }

  if (!hasRealGold) {
    return (
      <Card aria-labelledby="app-my-gold-title">
        <Inner>
          <Kicker id="app-my-gold-title">
            <LivingGoldCompanion
              size={28}
              delay={90}
              ariaLabel="Living Gold로 첫 금 기록 안내 열기"
              title="첫 금빛을 이어보세요."
              description="금 하나를 기록하면 오늘 가치와 변화가 MY GOLD에 이어집니다."
              actionLabel="첫 금 기록하기"
              actionTo="/my-gold?add=1"
            />
            <span>MY GOLD</span>
          </Kicker>
          <EmptyTitle>아직 기록한 금이 없습니다.</EmptyTitle>
          <EmptyCopy>
            금 하나만 기록하면 오늘 가치와 변화를 바로 확인할 수 있습니다. MY GOLD는 개인 금 기록 공간입니다.
          </EmptyCopy>
          <ActionRow>
            <PrimaryAction to="/my-gold?add=1">
              <Plus aria-hidden /> 첫 금 기록
            </PrimaryAction>
          </ActionRow>
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

  const showWeeklyTrend = !!weeklyTrend;
  const weeklyDirection = String(weeklyTrend?.direction || "same");
  const weeklyText = weeklyTrend?.hasReference
    ? `${formatSignedWon(weeklyTrend.amount)} · ${formatSignedPercent(weeklyTrend.percent)}`
    : weeklyTrend?.loading
      ? "불러오는 중"
      : "변화 보기";

  return (
    <SummaryShell>
      <SummaryCard
        as={Link}
        to="/my-gold"
        aria-label="MY GOLD 상세 보기"
        $withWeekly={showWeeklyTrend}
      >
        <SummaryInner>
          <Topline>
            <SummaryKicker><span>MY GOLD</span></SummaryKicker>
            <ChevronRight aria-hidden />
          </Topline>

          <Value>
            {dashboard.publicPriceEnabled ? formatWon(animatedCurrent) : "시세 공개 대기"}
          </Value>

          {dashboard.publicPriceEnabled && Number.isFinite(totals.percent) && (
            <Change $direction={totals.direction} $animate={shouldAnimateValue}>
              <ChangeIcon aria-hidden />
              오늘 {formatSignedWon(totals.amount)} · {formatSignedPercent(totals.percent)}
            </Change>
          )}

          <SummaryMeta>
            <span>
              예상 순금
              <strong>{Number(dashboard.summary.pureGoldG || 0).toFixed(2)}g</strong>
            </span>
            <span>
              기록한 금
              <strong>{Number(dashboard.summary.itemCount || 0)}개</strong>
            </span>
            <span>MY GOLD 보기</span>
          </SummaryMeta>
        </SummaryInner>
      </SummaryCard>
      {showWeeklyTrend && (
        <WeeklyTrendLink
          to="/my-gold/trend"
          $direction={weeklyDirection}
          aria-label={`최근 7일 MY GOLD 가치 변화 ${weeklyText} · 자세히 보기`}
        >
          <span>최근 7일</span>
          <strong>{weeklyText}</strong>
          <ChevronRight aria-hidden />
        </WeeklyTrendLink>
      )}
      <SummaryGoldCompanion
        size={28}
        delay={90}
        ariaLabel="Living Gold로 오늘 MY GOLD 보기"
        title="오늘의 MY GOLD"
        value={dashboard.publicPriceEnabled ? formatWon(totals.current) : undefined}
        description={
          dashboard.publicPriceEnabled
            ? `오늘 ${formatSignedWon(totals.amount)} · 예상 순금 ${Number(dashboard.summary.pureGoldG || 0).toFixed(2)}g`
            : "오늘의 MY GOLD 가치를 확인하고 있어요."
        }
        actionLabel="MY GOLD 자세히 보기"
        actionTo="/my-gold"
      />
    </SummaryShell>
  );
}
