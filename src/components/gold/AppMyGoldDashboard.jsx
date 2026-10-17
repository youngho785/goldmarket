import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

import LivingGoldMark from "@/components/common/LivingGoldMark";
import LivingGoldCompanion from "@/components/common/LivingGoldCompanion";
import {
  ChevronRight,
  Gem,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";


const Card = styled.section`
position:relative; overflow:hidden; border:1px solid #355849; border-radius:24px;
  background: radial-gradient(circle at 95% -10%, rgba(216,183,108,.23) 0, transparent 40%),
    radial-gradient(circle at 5% 115%, rgba(110,165,133,.21) 0, transparent 48%),
    linear-gradient(144deg,#2C5041 0%,#162D26 100%);
  color:#f4f3eb; box-shadow:0 18px 42px rgba(21,47,36,.15);
  &::after {content:"";position:absolute;width:240px;height:240px;right:-105px;top:-105px;border:1px solid rgba(227,199,141,.29);border-radius:50%;box-shadow:0 0 0 28px rgba(227,199,141,.05),0 0 0 57px rgba(227,199,141,.03);pointer-events:none;}
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
display:block; height:100%; color:#f4f3eb; text-decoration:none; cursor:pointer; border-radius:24px; transition:border-color .2s,transform .2s;
      &:hover { color:#f4f3eb; border-color:#c8a868; transform:translateY(-2px); } &:focus-visible { outline:2px solid var(--gm-gold); outline-offset:4px; }
      @media(max-width:900px) { height:auto; }
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  padding: 12px 13px;
`;

const SummaryInner = styled(Inner)`
position:relative; display:flex; min-height:286px; height:100%; flex-direction:column; padding:32px;
      @media(max-width:560px) { min-height:250px; padding:24px 22px; }
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
min-height:28px; padding-left:34px; color:#d9d8c8; font-size:12px; font-weight:600; letter-spacing:.15em;
`;

const SummaryGoldCompanion = styled(LivingGoldCompanion)`
position:absolute; z-index:4; top:29px; left:25px; @media(max-width:560px) { top:23px; left:18px; }
`;

const Value = styled.strong`
display:block; margin-top:24px; color:#f2eedf; font-family:inherit; font-variant-numeric:tabular-nums; font-size:clamp(31px,5.5vw,48px);
      font-weight:600; line-height:1.15; letter-spacing:-.055em; overflow-wrap:anywhere;
`;

const ReferenceLabel = styled.span`
display:block; margin-top:10px; color:#d4d8cc; font-size:13px; font-weight:400; line-height:1.7;
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
display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:auto; padding-top:20px;
      border-top:1px solid rgba(228,225,201,.3); color:#d4d8cc; font-size:13px; font-weight:400;
      strong { margin-left:5px; color:#edeedf; font-size:13px; font-weight:600; font-variant-numeric:tabular-nums; }
      span:last-child { color:#d7c49a; white-space:nowrap; }
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
  font-size: 0.86rem;
  line-height: 1.45;
  word-break: keep-all;
`;

const SecondaryEmptyAction = styled(Link)`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 44px;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  color: #ece7d9;
  font-size: 0.86rem;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:focus-visible { outline: 2px solid #e9c77b; outline-offset: 3px; }
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
  const ratesReady = dashboard.ratesReady !== false;

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
    ratesReady &&
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
              ariaLabel="MY GOLD 체험 안내 열기"
              title="오늘도 금의 가치는 움직여요."
              description="금의 종류와 중량만 기록하면 지금 내 금의 가치가 작은 금빛으로 이어집니다."
              actionLabel="MY GOLD 체험하기"
              actionTo="/my-gold?add=1"
            />
            <span>MY GOLD</span>
          </Kicker>
          <EmptyTitle id="app-my-gold-title">내 금, 지금 얼마일까요?</EmptyTitle>
          <EmptyCopy>
            가지고 있는 금 하나부터 기록해 보세요. 지금의 가치와 변화를 살펴볼 수 있어요.
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
              ariaLabel="첫 금 기록 안내 열기"
              title="첫 금빛을 이어보세요."
              description="금 하나를 기록하면 현재 적용 시세 기준 가치와 변화가 MY GOLD에 이어집니다."
              actionLabel="첫 금 기록하기"
              actionTo="/my-gold?add=1"
            />
            <span>MY GOLD</span>
          </Kicker>
          <EmptyTitle>첫 금을 기록해 볼까요?</EmptyTitle>
          <EmptyCopy>
            반지 하나, 목걸이 하나부터 가볍게 시작해 보세요.
          </EmptyCopy>
          <ActionRow>
            <PrimaryAction to="/my-gold?add=1">
              <Plus aria-hidden /> 첫 금 기록
            </PrimaryAction>
            <SecondaryEmptyAction to="/gold-value">
              먼저 금 가치 계산하기
            </SecondaryEmptyAction>
          </ActionRow>
        </Inner>
      </Card>
    );
  }

  // Show one comparison on the home screen. The full time-series remains
  // available in MY GOLD > Value trend; last-price and 7-day figures can match.
  const hasWeeklyComparison = ratesReady && weeklyTrend?.hasReference;
  const displayedComparison = hasWeeklyComparison
    ? { label: "최근 7일", direction: weeklyTrend.direction, amount: weeklyTrend.amount, percent: weeklyTrend.percent }
    : ratesReady && Number.isFinite(totals.percent)
      ? { label: "이전 시세 대비", direction: totals.direction, amount: totals.amount, percent: totals.percent }
      : null;
  const ChangeIcon = displayedComparison?.direction === "up"
    ? TrendingUp
    : displayedComparison?.direction === "down"
      ? TrendingDown
      : Minus;

  return (
    <SummaryShell>
      <SummaryCard
        as={Link}
        to="/my-gold"
        aria-label="MY GOLD 상세 보기"
      >
        <SummaryInner>
          <Topline>
            <SummaryKicker><span>MY GOLD</span></SummaryKicker>
            <ChevronRight aria-hidden />
          </Topline>

          <Value>
            {!ratesReady
              ? "환산 기준 확인 중"
              : dashboard.publicPriceEnabled
                ? formatWon(animatedCurrent)
                : "시세 공개 대기"}
          </Value>

          {ratesReady && dashboard.publicPriceEnabled && (
            <ReferenceLabel>기록한 금의 예상 참고가치 · 실제 금액은 실측 후 확정</ReferenceLabel>
          )}

          {dashboard.publicPriceEnabled && displayedComparison && (
            <Change $direction={displayedComparison.direction} $animate={shouldAnimateValue}>
              <ChangeIcon aria-hidden />
              {displayedComparison.label} {formatSignedWon(displayedComparison.amount)} · {formatSignedPercent(displayedComparison.percent)}
            </Change>
          )}

          <SummaryMeta>
            <span>
              예상 순금
              <strong>{ratesReady ? `${Number(dashboard.summary.pureGoldG || 0).toFixed(2)}g` : "확인 중"}</strong>
            </span>
            <span>
              기록한 금
              <strong>{Number(dashboard.summary.itemCount || 0)}개</strong>
            </span>
            <span>MY GOLD 보기</span>
          </SummaryMeta>
        </SummaryInner>
      </SummaryCard>
      <SummaryGoldCompanion
        size={28}
        delay={90}
        ariaLabel="MY GOLD 안내 열기"
        title="현재 적용 시세 기준 MY GOLD"
        value={ratesReady && dashboard.publicPriceEnabled ? formatWon(totals.current) : undefined}
        description={
          !ratesReady
            ? "계산에 필요한 정보를 확인하고 있어요."
            : dashboard.publicPriceEnabled
              ? `${Number.isFinite(totals.percent) ? `이전 시세 대비 ${formatSignedWon(totals.amount)} · ` : ""}예상 순금 ${Number(dashboard.summary.pureGoldG || 0).toFixed(2)}g`
              : "현재 적용 시세 기준 MY GOLD 가치를 확인하고 있어요."
        }
        actionLabel="MY GOLD 자세히 보기"
        actionTo="/my-gold"
      />
    </SummaryShell>
  );
}
