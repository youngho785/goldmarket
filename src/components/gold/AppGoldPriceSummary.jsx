import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";

const Card = styled(Link)`
  display: block;
  height: 100%;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface};
  color: inherit;
  text-decoration: none;
  box-shadow: 0 10px 24px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
  transition: transform .15s ease, border-color .15s ease;

  &:hover {
    border-color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 32%, ${({ theme }) => theme.colors.border});
  }

  &:active { transform: translateY(1px); }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.gold};
    outline-offset: 2px;
  }
`;

const Inner = styled.div`
  display: grid;
  align-content: start;
  height: 100%;
  padding: 18px 18px 16px;
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const TitleWrap = styled.div`
  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .62rem;
    font-weight: 950;
    letter-spacing: .11em;
  }

  h2 {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: 1rem;
    font-weight: 850;
    letter-spacing: -.025em;
  }
`;

const More = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .63rem;
  font-weight: 850;
  white-space: nowrap;

  svg { width: 14px; height: 14px; color: ${({ theme }) => theme.colors.secondaryDark}; }
`;

const PriceList = styled.div`
  display: grid;
  margin-top: 3px;
`;

const PriceRow = styled.div`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 55px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};

  &:last-child { border-bottom: 0; }
`;

const Kind = styled.strong`
  color: ${({ theme }) => theme.colors.primary};
  font-size: .74rem;
  font-weight: 900;
`;

const Price = styled.strong`
  color: ${({ theme }) => theme.colors.primary};
  font-family: "Segoe UI", "Malgun Gothic", Arial, sans-serif;
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: "tnum" 1, "lnum" 1;
  font-size: .95rem;
  font-weight: 800;
  letter-spacing: -.025em;
  white-space: nowrap;
`;

const Change = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? theme.colors.accentCoral
      : $direction === "down"
        ? theme.colors.info
        : theme.colors.textLight};
  font-size: .61rem;
  font-weight: 850;
  white-space: nowrap;

  svg { width: 11px; height: 11px; }
`;

const Empty = styled.div`
  display: grid;
  min-height: 170px;
  place-items: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .7rem;
  text-align: center;
`;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "-";
}

function getChange(current, previous) {
  const now = Number(current);
  const before = Number(previous);
  if (!Number.isFinite(now) || !Number.isFinite(before) || before <= 0) return null;
  const diff = now - before;
  return {
    diff,
    percent: (diff / before) * 100,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
  };
}

function ChangeView({ change }) {
  if (!change) return <Change $direction="same">비교 준비</Change>;
  const Icon = change.direction === "up" ? ArrowUpRight : change.direction === "down" ? ArrowDownRight : Minus;
  return (
    <Change $direction={change.direction}>
      <Icon aria-hidden />
      {change.diff === 0 ? "보합" : `${Math.abs(change.percent).toFixed(2)}%`}
    </Change>
  );
}

export default function AppGoldPriceSummary({
  market = {},
  previousMarket = {},
  enabled = false,
  priceLoading = false,
  configLoading = false,
}) {
  const rows = useMemo(
    () => [
      {
        label: "순금",
        value: market.pureGoldBuyPerDon,
        change: getChange(market.pureGoldBuyPerDon, previousMarket.pureGoldBuyPerDon),
      },
      {
        label: "18K",
        value: market.gold18kBuyPerDon,
        change: getChange(market.gold18kBuyPerDon, previousMarket.gold18kBuyPerDon),
      },
      {
        label: "14K",
        value: market.gold14kBuyPerDon,
        change: getChange(market.gold14kBuyPerDon, previousMarket.gold14kBuyPerDon),
      },
    ],
    [market, previousMarket]
  );

  if (configLoading || !enabled) return null;
  const hasPriceData = rows.some((row) => Number(row.value) > 0);

  return (
    <Card to="/gold-price" aria-labelledby="app-gold-price-title" aria-label="오늘 금시세 전체 보기">
      <Inner>
        <Head>
          <TitleWrap>
            <small>TODAY&apos;S GOLD</small>
            <h2 id="app-gold-price-title">오늘 금시세 · 내가 팔 때</h2>
          </TitleWrap>
          <More>전체 <ChevronRight aria-hidden /></More>
        </Head>

        {priceLoading ? (
          <Empty>시세를 불러오는 중입니다.</Empty>
        ) : !hasPriceData ? (
          <Empty>관리자 확인 후 금시세가 공개됩니다.</Empty>
        ) : (
          <PriceList>
            {rows.map((row) => (
              <PriceRow key={row.label}>
                <Kind>{row.label}</Kind>
                <Price>{formatWon(row.value)}</Price>
                <ChangeView change={row.change} />
              </PriceRow>
            ))}
          </PriceList>
        )}
      </Inner>
    </Card>
  );
}
