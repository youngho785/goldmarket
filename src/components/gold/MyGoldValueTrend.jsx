// src/components/gold/MyGoldValueTrend.jsx
import React, { useMemo } from "react";
import styled from "styled-components";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import useMyGoldValueTrend, { MY_GOLD_TREND_PERIODS } from "@/hooks/useMyGoldValueTrend";

const Card = styled.section`
  display: grid;
  gap: 15px;
  padding: clamp(16px, 3vw, 20px);
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 14%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 10px 28px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.04rem;
    font-weight: 950;
    letter-spacing: -0.025em;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.64rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const Periods = styled.div`
  display: inline-grid;
  grid-template-columns: repeat(4, auto);
  gap: 3px;
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const PeriodButton = styled.button`
  min-height: 30px;
  padding: 5px 9px;
  border: 0;
  border-radius: 999px;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.on.primary : theme.colors.textSecondary)};
  font-size: 0.66rem;
  font-weight: 900;
  cursor: pointer;
`;

const ChangeLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;

  strong {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: ${({ $direction, theme }) =>
      $direction === "up"
        ? theme.semantic.alertErrorText
        : $direction === "down"
          ? theme.colors.info
          : theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(1.1rem, 3.6vw, 1.55rem);
    font-weight: 950;
    letter-spacing: -0.035em;
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.64rem;
    font-weight: 750;
  }
`;

const ChartWrap = styled.div`
  position: relative;
  min-height: 186px;
  padding: 8px 4px 2px;
  border-radius: 16px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 42%, transparent),
    transparent 78%
  );
`;

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: 166px;
  overflow: visible;
  color: ${({ theme }) => theme.colors.secondaryDark};
`;

const Empty = styled.div`
  display: grid;
  place-items: center;
  min-height: 166px;
  padding: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.72rem;
  line-height: 1.5;
  text-align: center;
`;

const AxisRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: -1px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.58rem;
`;

const RangeBox = styled.div`
  display: grid;
  gap: 8px;
  padding: 12px 13px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const RangeHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.6rem;
    font-weight: 850;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.7rem;
    font-weight: 950;
  }
`;

const RangeTrack = styled.div`
  position: relative;
  height: 7px;
  border-radius: 999px;
  background: linear-gradient(90deg,
    color-mix(in srgb, ${({ theme }) => theme.colors.info} 22%, ${({ theme }) => theme.colors.surface}),
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 34%, ${({ theme }) => theme.colors.surface}),
    color-mix(in srgb, ${({ theme }) => theme.semantic.alertErrorText} 22%, ${({ theme }) => theme.colors.surface})
  );

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: ${({ $position }) => `${$position}%`};
    width: 15px;
    height: 15px;
    border: 3px solid ${({ theme }) => theme.colors.surface};
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 2px 7px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 24%, transparent);
    transform: translate(-50%, -50%);
  }
`;

const RangeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.56rem;
`;

const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
`;

const Metric = styled.div`
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.56rem;
    font-weight: 800;
  }

  strong {
    overflow: hidden;
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(0.68rem, 2.6vw, 0.8rem);
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Note = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.58rem;
  line-height: 1.5;
  word-break: keep-all;
`;

function formatWon(value) {
  const number = Number(value) || 0;
  return `${Math.round(number).toLocaleString("ko-KR")}원`;
}

function formatSignedWon(value) {
  const number = Math.round(Number(value) || 0);
  if (number === 0) return "0원";
  return `${number > 0 ? "+" : "-"}${Math.abs(number).toLocaleString("ko-KR")}원`;
}

function formatSignedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "비교 준비 중";
  if (number === 0) return "0.00%";
  return `${number > 0 ? "+" : "-"}${Math.abs(number).toFixed(2)}%`;
}

function formatCompactDate(value) {
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return text || "-";
  return `${Number(text.slice(4, 6))}/${Number(text.slice(6, 8))}`;
}

function buildChartGeometry(points) {
  const width = 640;
  const height = 166;
  const paddingX = 12;
  const paddingY = 14;
  if (!points.length) return { width, height, polyline: "", area: "", min: 0, max: 0 };

  const values = points.map((point) => Number(point.valueWon) || 0);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const pad = Math.max(1, min * 0.01);
    min -= pad;
    max += pad;
  }
  const range = Math.max(1, max - min);
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const coords = points.map((point, index) => {
    const x = paddingX + (points.length <= 1 ? usableWidth / 2 : (index / (points.length - 1)) * usableWidth);
    const ratio = ((Number(point.valueWon) || 0) - min) / range;
    const y = paddingY + (1 - ratio) * usableHeight;
    return [x, y];
  });

  const polyline = coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const firstX = coords[0]?.[0] || paddingX;
  const lastX = coords[coords.length - 1]?.[0] || width - paddingX;
  const baseline = height - paddingY;
  const area = `${firstX.toFixed(2)},${baseline} ${polyline} ${lastX.toFixed(2)},${baseline}`;

  return { width, height, polyline, area, min, max };
}

function getRangeInsight(current, low, high) {
  const currentValue = Number(current) || 0;
  const lowValue = Number(low) || 0;
  const highValue = Number(high) || 0;
  const spread = highValue - lowValue;
  if (spread <= 0) return { position: 50, label: "비교 구간 형성 중" };
  const raw = ((currentValue - lowValue) / spread) * 100;
  const position = Math.max(0, Math.min(100, raw));
  if (position <= 33) return { position, label: "최근 범위에서 낮은 구간" };
  if (position >= 67) return { position, label: "최근 범위에서 높은 구간" };
  return { position, label: "최근 범위에서 중간 구간" };
}

export default function MyGoldValueTrend({
  pureGoldG,
  currentPricePerDon,
  enabled,
  onWeeklyChange,
  bonusOnly = false,
  bonusGoldG = 0,
}) {
  const trend = useMyGoldValueTrend({ pureGoldG, currentPricePerDon, enabled });
  const geometry = useMemo(() => buildChartGeometry(trend.points), [trend.points]);
  const rangeInsight = useMemo(
    () => getRangeInsight(trend.currentValueWon, trend.extrema.low, trend.extrema.high),
    [trend.currentValueWon, trend.extrema.low, trend.extrema.high]
  );
  const DirectionIcon =
    trend.rangeChange.direction === "up"
      ? TrendingUp
      : trend.rangeChange.direction === "down"
        ? TrendingDown
        : Minus;

  React.useEffect(() => {
    onWeeklyChange?.({
      ...trend.weeklyChange,
      reference: trend.weeklyReference,
      referenceValueWon: trend.weeklyValueWon,
    });
  }, [onWeeklyChange, trend.weeklyChange, trend.weeklyReference, trend.weeklyValueWon]);

  const startLabel = formatCompactDate(trend.points[0]?.date);
  const endLabel = formatCompactDate(trend.points[trend.points.length - 1]?.date);

  return (
    <Card id="my-gold-value-trend" aria-labelledby="my-gold-value-trend-title">
      <Head>
        <div>
          <h2 id="my-gold-value-trend-title">{bonusOnly ? "적립 순금 가치 흐름" : "내금고 가치 흐름"}</h2>
          <p>{bonusOnly ? `현재 적립 순금 ${Number(bonusGoldG || 0).toFixed(2)}g을 과거 공개 시세로 비교합니다.` : "현재 보유량은 그대로 두고 시세 변화가 내 금 가치에 미친 영향만 비교합니다."}</p>
        </div>
        <Periods aria-label="내금고 가치 그래프 기간 선택">
          {MY_GOLD_TREND_PERIODS.map((option) => (
            <PeriodButton
              key={option.key}
              type="button"
              $active={trend.period === option.key}
              aria-pressed={trend.period === option.key}
              onClick={() => trend.setPeriod(option.key)}
            >
              {option.label}
            </PeriodButton>
          ))}
        </Periods>
      </Head>

      <ChangeLine $direction={trend.rangeChange.direction}>
        <strong><DirectionIcon size={16} aria-hidden /> {formatSignedWon(trend.rangeChange.amount)} · {formatSignedPercent(trend.rangeChange.percent)}</strong>
        <span>{trend.selectedPeriod.label} 첫 공개 시세 대비</span>
      </ChangeLine>

      <ChartWrap>
        {trend.loading ? (
          <Empty>과거 공개 시세를 불러오는 중입니다.</Empty>
        ) : trend.error ? (
          <Empty role="alert">{trend.error}</Empty>
        ) : trend.points.length < 2 ? (
          <Empty>비교할 과거 공개 시세가 아직 충분하지 않습니다.</Empty>
        ) : (
          <>
            <Svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-label={`${trend.selectedPeriod.label} 내금고 참고가치 변화 그래프`} preserveAspectRatio="none">
              <line x1="12" y1="14" x2="628" y2="14" stroke="currentColor" opacity="0.10" />
              <line x1="12" y1="83" x2="628" y2="83" stroke="currentColor" opacity="0.08" />
              <line x1="12" y1="152" x2="628" y2="152" stroke="currentColor" opacity="0.10" />
              <polygon points={geometry.area} fill="currentColor" opacity="0.08" />
              <polyline points={geometry.polyline} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </Svg>
            <AxisRow aria-hidden><span>{startLabel}</span><span>{endLabel}</span></AxisRow>
          </>
        )}
      </ChartWrap>

      {trend.points.length > 0 && (
        <>
          <RangeBox>
            <RangeHead><span>현재 위치</span><strong>{rangeInsight.label}</strong></RangeHead>
            <RangeTrack $position={rangeInsight.position} aria-hidden />
            <RangeLabels><span>기간 중 낮은 가치</span><span>기간 중 높은 가치</span></RangeLabels>
          </RangeBox>
          <Metrics>
            <Metric><span>현재</span><strong>{formatWon(trend.currentValueWon)}</strong></Metric>
            <Metric><span>기간 낮음</span><strong>{formatWon(trend.extrema.low)}</strong></Metric>
            <Metric><span>기간 높음</span><strong>{formatWon(trend.extrema.high)}</strong></Metric>
          </Metrics>
        </>
      )}

      <Note>
        이 그래프는 현재 내금고에 기록된 금의 양을 고정하고 과거 한국골드마켓 공개 매입 참고시세를 적용한 비교입니다. 실제 교환 순금량은 매장 실측 후 확정됩니다.
      </Note>
    </Card>
  );
}
