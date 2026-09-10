import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/firebase/firebase";

const Card = styled(Link)`
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 17px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 52%, white) 0%,
      ${({ theme }) => theme.colors.surface} 58%
    );
  box-shadow: 0 7px 18px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.gold};
    outline-offset: 2px;
  }
`;

const Inner = styled.div`
  padding: 10px 12px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

const TitleWrap = styled.div`
  min-width: 0;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 950;
    letter-spacing: 0.1em;
  }

  h2 {
    margin: 2px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.8rem;
    line-height: 1.2;
    letter-spacing: -0.025em;
  }
`;

const More = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.62rem;
  font-weight: 900;

  svg {
    width: 13px;
    height: 13px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const PriceRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
  margin-top: 7px;
`;

const PrimaryPrice = styled.div`
  min-width: 0;

  > span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.62rem;
    font-weight: 850;
  }

  > strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(1.28rem, 6.2vw, 1.7rem);
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.045em;
    white-space: nowrap;
  }
`;

const BuyPrice = styled.div`
  text-align: right;

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.62rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.64rem;
    font-weight: 900;
    white-space: nowrap;
  }

  b {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 900;
  }
`;

const Change = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? theme.colors.accentCoral
      : $direction === "down"
        ? theme.colors.info
        : theme.colors.textLight};
  font-size: 0.62rem;
  font-weight: 900;
  white-space: nowrap;

  svg {
    width: 11px;
    height: 11px;
  }
`;

const Empty = styled.div`
  min-height: 58px;
  display: grid;
  place-items: center;
  padding: 12px 8px 5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.65rem;
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
  if (!Number.isFinite(now) || !Number.isFinite(before) || before <= 0) {
    return null;
  }

  const diff = now - before;
  return {
    diff,
    percent: (diff / before) * 100,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
  };
}

function ChangeView({ change }) {
  if (!change) return <Change $direction="same">전일 비교 준비 중</Change>;

  const Icon =
    change.direction === "up"
      ? ArrowUpRight
      : change.direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <Change $direction={change.direction}>
      <Icon aria-hidden />
      {change.diff === 0
        ? "보합"
        : `${change.diff > 0 ? "+" : "-"}${Math.abs(change.diff).toLocaleString("ko-KR")}원 · ${Math.abs(change.percent).toFixed(2)}%`}
    </Change>
  );
}

export default function AppGoldPriceSummary() {
  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [priceLoading, setPriceLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPrices", "current"),
        (snapshot) => {
          setData(snapshot.exists() ? snapshot.data() : null);
          setPriceLoading(false);
        },
        (error) => {
          console.warn(
            "[AppGoldPriceSummary] 시세 조회 실패:",
            error?.message || error
          );
          setPriceLoading(false);
        }
      ),
    []
  );

  useEffect(
    () =>
      onSnapshot(
        doc(db, "goldPricePublic", "config"),
        (snapshot) => {
          const config = snapshot.exists() ? snapshot.data() : {};
          setEnabled(config.enabled === true);
          setConfigLoading(false);
        },
        (error) => {
          console.warn(
            "[AppGoldPriceSummary] 공개 설정 조회 실패:",
            error?.message || error
          );
          setEnabled(false);
          setConfigLoading(false);
        }
      ),
    []
  );

  const pureGold = useMemo(() => {
    const market = data?.market || {};
    const previous = data?.previousMarket || {};

    return {
      buy: market.pureGoldSellPerDon,
      sell: market.pureGoldBuyPerDon,
      buyChange: getChange(
        market.pureGoldSellPerDon,
        previous.pureGoldSellPerDon
      ),
      sellChange: getChange(
        market.pureGoldBuyPerDon,
        previous.pureGoldBuyPerDon
      ),
    };
  }, [data]);

  if (configLoading || !enabled) return null;

  return (
    <Card to="/gold-price" aria-labelledby="app-gold-price-title" aria-label="오늘 금시세 전체 보기">
      <Inner>
        <Head>
          <TitleWrap>
            <small>TODAY&apos;S GOLD</small>
            <h2 id="app-gold-price-title">오늘 금시세</h2>
          </TitleWrap>
          <More>
            시세 전체 <ChevronRight aria-hidden />
          </More>
        </Head>

        {priceLoading ? (
          <Empty>시세를 불러오는 중입니다.</Empty>
        ) : !data ? (
          <Empty>관리자 확인 후 금시세가 공개됩니다.</Empty>
        ) : (
          <PriceRow>
            <PrimaryPrice>
              <span>순금(24K) 내가 팔 때</span>
              <strong>{formatWon(pureGold.sell)}</strong>
              <ChangeView change={pureGold.sellChange} />
            </PrimaryPrice>
            <BuyPrice>
              <span>내가 살 때 <b>VAT 포함</b></span>
              <strong>{formatWon(pureGold.buy)}</strong>
            </BuyPrice>
          </PriceRow>
        )}
      </Inner>
    </Card>
  );
}
