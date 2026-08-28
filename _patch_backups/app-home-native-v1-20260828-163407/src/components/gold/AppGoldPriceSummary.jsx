import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/firebase/firebase";

const Card = styled.section`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
`;

const TitleWrap = styled.div`
  min-width: 0;

  small {
    display: block;
    margin-bottom: 4px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.64rem;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.15rem;
    line-height: 1.35;
    letter-spacing: -0.025em;
  }

  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.7rem;
  }
`;

const More = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: 0 0 auto;
  min-height: 36px;
  padding: 7px 9px;
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.7rem;
  font-weight: 900;
  text-decoration: none;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const PriceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
`;

const PriceCell = styled.div`
  min-width: 0;
  padding: 17px 18px 18px;
  border-left: ${({ $second, theme }) =>
    $second ? `1px solid ${theme.colors.dividerSubtle}` : "0"};

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.68rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(1rem, 4.7vw, 1.35rem);
    font-weight: 900;
    line-height: 1.2;
    white-space: nowrap;
  }
`;

const Change = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 5px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? theme.semantic.alertErrorText
      : $direction === "down"
        ? theme.colors.info
        : theme.colors.textLight};
  font-size: 0.62rem;
  font-weight: 850;
  white-space: nowrap;

  svg {
    width: 13px;
    height: 13px;
  }
`;

const Empty = styled.div`
  padding: 20px 18px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.78rem;
  text-align: center;
`;

const Foot = styled.p`
  margin: 0;
  padding: 9px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.62rem;
  line-height: 1.45;
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
          {data?.sourceDate && <p>기준일 {formatDate(data.sourceDate)}</p>}
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
          <Foot>순금 24K · 1돈(3.75g) 기준 · 시세는 시장 상황에 따라 변동될 수 있습니다.</Foot>
        </>
      )}
    </Card>
  );
}
