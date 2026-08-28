import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/firebase/firebase";

const Card = styled.section`
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.primary} 68%, transparent);
  border-radius: 22px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 12px 30px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 14%, transparent);
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 16px 11px;
`;

const TitleWrap = styled.div`
  min-width: 0;

  small {
    display: block;
    margin-bottom: 2px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.59rem;
    font-weight: 900;
    letter-spacing: 0.09em;
  }

  h2 {
    margin: 0;
    color: inherit;
    font-size: 0.98rem;
    line-height: 1.3;
    letter-spacing: -0.025em;
  }

  p {
    margin: 3px 0 0;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 66%, transparent);
    font-size: 0.6rem;
  }
`;

const More = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  min-height: 32px;
  padding: 6px 8px;
  border-radius: 10px;
  background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 9%, transparent);
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.64rem;
  font-weight: 900;
  text-decoration: none;

  svg {
    width: 13px;
    height: 13px;
  }
`;

const PriceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 10px 10px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.on.primary} 11%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 6%, transparent);
`;

const PriceCell = styled.div`
  min-width: 0;
  padding: 13px 12px 12px;
  border-left: ${({ $second, theme }) =>
    $second
      ? `1px solid color-mix(in srgb, ${theme.on.primary} 12%, transparent)`
      : "0"};

  span {
    display: block;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 69%, transparent);
    font-size: 0.61rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(0.93rem, 4.5vw, 1.18rem);
    font-weight: 900;
    line-height: 1.2;
    white-space: nowrap;
  }
`;

const Change = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 5px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? "#FFD0D3"
      : $direction === "down"
        ? "#C7E5FF"
        : `color-mix(in srgb, ${theme.on.primary} 62%, transparent)`};
  font-size: 0.59rem;
  font-weight: 850;
  white-space: nowrap;

  svg {
    width: 12px;
    height: 12px;
  }
`;

const Empty = styled.div`
  min-height: 86px;
  display: grid;
  place-items: center;
  padding: 18px 16px;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 74%, transparent);
  font-size: 0.72rem;
  text-align: center;
`;

const Foot = styled.p`
  margin: -2px 12px 12px;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 55%, transparent);
  font-size: 0.56rem;
  line-height: 1.4;
  text-align: center;
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
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
  };
}

function ChangeView({ change }) {
  if (!change) return <Change $direction="same">전일 비교 없음</Change>;

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
        : `${Math.abs(change.diff).toLocaleString("ko-KR")}원`}
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
      <Head>
        <TitleWrap>
          <small>TODAY'S GOLD</small>
          <h2 id="app-gold-price-title">오늘의 순금 시세</h2>
          {data && <p>기준일 {formatDate(getKoreaTodayDateKey())} · 1돈(3.75g)</p>}
        </TitleWrap>
        <More to="/gold-price">
          전체 시세
          <ChevronRight aria-hidden />
        </More>
      </Head>

      {priceLoading ? (
        <Empty>시세를 불러오는 중입니다.</Empty>
      ) : !data ? (
        <Empty>관리자 확인 후 금시세가 공개됩니다.</Empty>
      ) : (
        <>
          <PriceGrid>
            <PriceCell>
              <span>내가 살 때 · VAT 포함</span>
              <strong>{formatWon(pureGold.buy)}</strong>
              <ChangeView change={pureGold.buyChange} />
            </PriceCell>
            <PriceCell $second>
              <span>내가 팔 때</span>
              <strong>{formatWon(pureGold.sell)}</strong>
              <ChangeView change={pureGold.sellChange} />
            </PriceCell>
          </PriceGrid>
          <Foot>순금 24K 기준 · 시세는 시장 상황에 따라 변동될 수 있습니다.</Foot>
        </>
      )}
    </Card>
  );
}
