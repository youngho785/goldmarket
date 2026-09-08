import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/firebase/firebase";

const Card = styled.section`
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 20px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 52%, white) 0%,
      ${({ theme }) => theme.colors.surface} 58%
    );
  box-shadow: 0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);
`;

const Inner = styled.div`
  padding: 14px 14px 13px;
`;

const Head = styled.div`
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
`;

const TitleWrap = styled.div`
  min-width: 0;

  small {
    display: block;
    margin-bottom: 2px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.56rem;
    font-weight: 950;
    letter-spacing: 0.1em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.9rem;
    line-height: 1.25;
    letter-spacing: -0.025em;
  }

  p {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.57rem;
  }
`;

const More = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  min-height: 32px;
  padding: 6px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.62rem;
  font-weight: 900;
  text-decoration: none;

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
  margin-top: 11px;
`;

const PrimaryPrice = styled.div`
  min-width: 0;

  > span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.6rem;
    font-weight: 850;
  }

  > strong {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(1.45rem, 7.2vw, 2rem);
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.045em;
    white-space: nowrap;
  }
`;

const BuyPrice = styled.div`
  min-width: 118px;
  padding: 8px 9px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  text-align: right;

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.54rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.68rem;
    font-weight: 900;
    white-space: nowrap;
  }

  b {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.52rem;
    font-weight: 900;
  }
`;

const Change = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 5px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? theme.colors.accentCoral
      : $direction === "down"
        ? theme.colors.info
        : theme.colors.textLight};
  font-size: 0.58rem;
  font-weight: 900;
  white-space: nowrap;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const Empty = styled.div`
  min-height: 70px;
  display: grid;
  place-items: center;
  padding: 16px 10px 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.68rem;
  text-align: center;
`;

const Foot = styled.p`
  margin: 9px 0 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.53rem;
  line-height: 1.4;
`;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "-";
}

function formatDate(value) {
  const text = String(value || "");
  if (!/^\d{8}$/.test(text)) return text || "-";
  return `${text.slice(0, 4)}.${text.slice(4, 6)}.${text.slice(6, 8)}`;
}

function getKoreaTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}${values.month}${values.day}`;
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
    <Card aria-labelledby="app-gold-price-title">
      <Inner>
        <Head>
          <TitleWrap>
            <small>TODAY&apos;S GOLD</small>
            <h2 id="app-gold-price-title">오늘의 순금 시세</h2>
            {data && <p>기준일 {formatDate(getKoreaTodayDateKey())} · 1돈(3.75g)</p>}
          </TitleWrap>
          <More to="/gold-price">
            전체 시세 <ChevronRight aria-hidden />
          </More>
        </Head>

        {priceLoading ? (
          <Empty>시세를 불러오는 중입니다.</Empty>
        ) : !data ? (
          <Empty>관리자 확인 후 금시세가 공개됩니다.</Empty>
        ) : (
          <>
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
            <Foot>시세는 시장 상황에 따라 변동될 수 있으며 실제 교환은 매장 실측 후 확정됩니다.</Foot>
          </>
        )}
      </Inner>
    </Card>
  );
}
