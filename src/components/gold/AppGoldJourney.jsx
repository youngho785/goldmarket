import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Check, ChevronRight, Sparkles } from "lucide-react";

import { GOLD_BAR_DENOMS, getGoldBarReadiness } from "@/utils/goldBarReadiness";

const Card = styled.section`
  display: grid;
  gap: 13px;
  padding: 15px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 30%, ${({ theme }) => theme.colors.border});
  border-radius: 19px;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 72%, ${({ theme }) => theme.colors.surface}),
    ${({ theme }) => theme.colors.surface}
  );
  box-shadow: none;
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  small {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .69rem;
    font-weight: 950;
    letter-spacing: .08em;
  }

  small svg { width: 13px; height: 13px; }

  h2 {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.02rem;
    letter-spacing: -.035em;
    line-height: 1.25;
    word-break: keep-all;
  }

  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .72rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const StatusPill = styled.span`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: .67rem;
  font-weight: 950;
  white-space: nowrap;

  svg { width: 12px; height: 12px; }
`;

const ExchangeNow = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 66px;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 15px;
  background: ${({ theme }) => theme.colors.surface};
  color: inherit;
  text-decoration: none;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .68rem;
    font-weight: 900;
  }

  strong {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .84rem;
    line-height: 1.3;
    word-break: keep-all;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .68rem;
    line-height: 1.35;
  }

  > svg {
    width: 17px;
    height: 17px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const MilestoneWrap = styled.div`
  display: grid;
  gap: 8px;
`;

const MilestoneHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: .64rem;
    letter-spacing: .08em;
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .63rem;
    font-weight: 850;
  }
`;

const Milestones = styled.ol`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Milestone = styled.li`
  display: grid;
  justify-items: center;
  gap: 4px;
  min-width: 0;
  color: ${({ $state, theme }) =>
    $state === "reached"
      ? theme.colors.primary
      : $state === "next"
        ? theme.colors.secondaryDark
        : theme.colors.textLight};

  i {
    display: grid;
    place-items: center;
    width: 19px;
    height: 19px;
    border: 2px solid
      ${({ $state, theme }) =>
        $state === "reached"
          ? theme.colors.gold
          : $state === "next"
            ? theme.colors.secondaryDark
            : theme.colors.border};
    border-radius: 50%;
    background: ${({ $state, theme }) =>
      $state === "reached"
        ? theme.colors.goldLight
        : $state === "next"
          ? theme.semantic.badgeGoldBg
          : theme.colors.surface};
  }

  i::after {
    content: "";
    display: ${({ $state }) => ($state === "reached" ? "block" : "none")};
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
  }

  strong {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    color: inherit;
    font-size: .66rem;
    font-weight: 900;
    white-space: nowrap;
  }
`;

const ProgressLabels = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .69rem;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
  }
`;

const ProgressTrack = styled.div`
  position: relative;
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  span {
    display: block;
    width: ${({ $progress }) => `${Math.max(0, Math.min(100, Number($progress) || 0))}%`};
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.colors.gold},
      ${({ theme }) => theme.colors.goldLight}
    );
    transition: width .55s cubic-bezier(.22, 1, .36, 1);
  }

  @media (prefers-reduced-motion: reduce) {
    span { transition: none; }
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: .61rem;
  line-height: 1.35;

  a {
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 900;
    text-decoration: none;
  }
`;

function formatGoldGrams(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  if (Number.isInteger(number)) return `${number}g`;
  return `${number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}g`;
}

function shortLabel(item) {
  const label = String(item?.label || "");
  const donMatch = label.match(/(\d+돈)/);
  return donMatch?.[1] || formatGoldGrams(item?.grams);
}

function buildMilestones(currentGrams) {
  const current = Math.max(0, Number(currentGrams) || 0);
  const ascending = [...GOLD_BAR_DENOMS].sort((a, b) => a.grams - b.grams);
  const nextIndex = ascending.findIndex((item) => item.grams > current + 1e-9);
  const focusIndex = nextIndex >= 0 ? nextIndex : ascending.length - 1;
  const windowSize = 5;
  let start = Math.max(0, focusIndex - 2);
  let end = Math.min(ascending.length, start + windowSize);
  start = Math.max(0, end - windowSize);

  return {
    items: ascending.slice(start, end).map((item, index) => {
      const absoluteIndex = start + index;
      const reached = current + 1e-9 >= item.grams;
      return {
        ...item,
        short: shortLabel(item),
        state: reached ? "reached" : absoluteIndex === nextIndex ? "next" : "future",
      };
    }),
    next: nextIndex >= 0 ? ascending[nextIndex] : null,
  };
}

export default function AppGoldJourney({ pureGoldG = 0, vaultProducts = [], onExchangeClick }) {
  const current = Math.max(0, Number(pureGoldG) || 0);
  const readiness = useMemo(() => getGoldBarReadiness(current), [current]);
  const milestoneData = useMemo(() => buildMilestones(current), [current]);
  const next = milestoneData.next;
  const progress = next ? Math.min(100, (current / next.grams) * 100) : 100;
  const needed = next ? Math.max(0, next.grams - current) : 0;

  if (current <= 0) return null;

  const exchangeTarget = readiness?.available ? Number(readiness.grams) : 0;
  const exchangeTo = exchangeTarget > 0
    ? `/gold-exchange?mode=vault&auto=1&bar=${encodeURIComponent(exchangeTarget)}`
    : "/gold-exchange?mode=vault&auto=1";

  return (
    <Card aria-labelledby="app-gold-journey-title">
      <Head>
        <div>
          <small><Sparkles aria-hidden /> GOLD JOURNEY · GOLD TO GOLD</small>
          <h2 id="app-gold-journey-title">
            {readiness?.available
              ? `${readiness.label}까지 이미 도달했습니다.`
              : "첫 골드바 MILESTONE을 향하고 있습니다."}
          </h2>
          <p>
            {next
              ? `다음 ${next.label}까지 ${needed.toFixed(2)}g 남았습니다.`
              : "현재 표시 가능한 가장 높은 MILESTONE에 도달했습니다."}
          </p>
        </div>
        {readiness?.available && (
          <StatusPill><Check aria-hidden /> 달성</StatusPill>
        )}
      </Head>

      {readiness?.available && (
        <ExchangeNow
          to={exchangeTo}
          state={{ source: "my-gold", vaultProducts }}
          onClick={onExchangeClick}
          aria-label={`${readiness.label} 골드바 교환 예상 보기`}
        >
          <div>
            <small>지금 교환 가능한 최대 규격 · 기록 기준 예상</small>
            <strong>{readiness.label} 지금 교환 예상 보기</strong>
            <p>선택한 규격을 금교환 화면에서 미리 선택해 보여드립니다.</p>
          </div>
          <ChevronRight aria-hidden />
        </ExchangeNow>
      )}

      <MilestoneWrap>
        <MilestoneHead>
          <strong>MILESTONE LADDER</strong>
          <span>{next ? `${needed.toFixed(2)}g 남음` : "현재 최고 단계"}</span>
        </MilestoneHead>
        <Milestones aria-label="GOLD TO GOLD 마일스톤">
          {milestoneData.items.map((item) => (
            <Milestone
              key={`${item.grams}-${item.short}`}
              $state={item.state}
              aria-current={item.state === "next" ? "step" : undefined}
            >
              <i aria-hidden />
              <strong>{item.short}</strong>
            </Milestone>
          ))}
        </Milestones>
      </MilestoneWrap>

      <div>
        <ProgressLabels>
          <span>현재 <strong>{current.toFixed(2)}g</strong></span>
          <span>
            {next ? <>다음 <strong>{formatGoldGrams(next.grams)}</strong></> : <strong>달성</strong>}
          </span>
        </ProgressLabels>
        <ProgressTrack $progress={progress} aria-label={`다음 마일스톤 진행률 ${progress.toFixed(0)}%`}>
          <span />
        </ProgressTrack>
      </div>

      <Footer>
        <span>실제 순도·중량과 교환량은 부산 매장 실측 후 확정됩니다.</span>
        <Link to="/gold-exchange?mode=vault&auto=1">다른 규격 보기</Link>
      </Footer>
    </Card>
  );
}
