//src/components/gold/GoldPriceBoard.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firebase";

const Wrap = styled.section`
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 680px) {
    width: calc(100% - 20px);
    margin: 0 auto;
  }
`;

const Head = styled.div`
  padding: 17px 24px 15px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  text-align: center;

  @media (max-width: 680px) {
    padding: 14px 14px 12px;
  }
`;

const HeadTitle = styled.div`
  text-align: center;
`;

const Kicker = styled.p`
  margin: 0 0 5px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.66rem;
  font-weight: 850;
  letter-spacing: 0.13em;

  @media (max-width: 520px) {
    margin-bottom: 4px;
    font-size: 0.59rem;
    letter-spacing: 0.12em;
  }
`;

const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.28rem, 2.3vw, 1.72rem);
  font-weight: 700;
  line-height: 1.22;
  letter-spacing: -0.02em;

  @media (max-width: 520px) {
    font-size: 1.2rem;
  }
`;

const SourceDate = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.7rem;
  line-height: 1.4;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 800;
  }

  @media (max-width: 520px) {
    margin-top: 5px;
    font-size: 0.65rem;
  }
`;

const PriceTable = styled.div`
  width: 100%;
`;

const TableHead = styled.div`
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr) minmax(0, 1fr);
  min-height: 44px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};

  @media (max-width: 520px) {
    grid-template-columns: 52px minmax(0, 1fr) minmax(0, 1fr);
    min-height: 43px;
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr) minmax(0, 1fr);
  min-height: 62px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 520px) {
    grid-template-columns: 52px minmax(0, 1fr) minmax(0, 1fr);
    min-height: 56px;
  }
`;

const Cell = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 6px;
  border-left: ${({ $first, theme }) =>
    $first ? "0" : `1px solid ${theme.colors.border}`};
  text-align: center;

  @media (max-width: 520px) {
    padding: 6px 3px;
  }
`;

const HeadCell = styled(Cell)`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.76rem;
  font-weight: 900;

  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.6rem;
    font-weight: 700;
  }

  @media (max-width: 520px) {
    font-size: 0.7rem;

    small {
      font-size: 0.55rem;
    }
  }
`;

const Kind = styled.strong`
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.88rem;
  font-weight: 900;

  @media (max-width: 520px) {
    font-size: 0.8rem;
  }
`;

const Value = styled.strong`
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: ${({ $compact }) =>
    $compact ? "clamp(0.95rem, 1.8vw, 1.1rem)" : "clamp(1rem, 2vw, 1.2rem)"};
  font-weight: 900;
  line-height: 1.15;
  white-space: nowrap;

  @media (max-width: 520px) {
    font-size: ${({ $compact }) => ($compact ? "0.78rem" : "0.88rem")};
  }

  @media (max-width: 370px) {
    font-size: ${({ $compact }) => ($compact ? "0.72rem" : "0.84rem")};
  }
`;

const Change = styled.small`
  display: block;
  margin-top: 3px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? theme.semantic.alertErrorText
      : $direction === "down"
        ? theme.colors.info
        : theme.colors.textSecondary} !important;
  font-size: 0.62rem;
  font-weight: 800;
  line-height: 1.25;
  white-space: nowrap;

  @media (max-width: 520px) {
    margin-top: 2px;
    font-size: 0.54rem;
  }

  @media (max-width: 370px) {
    font-size: 0.51rem;
  }
`;

const HistoryToggle = styled.button`
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 18px;
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  text-align: center;

  span:last-child {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.68rem;
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
  }

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  @media (max-width: 520px) {
    padding: 9px 12px;
    font-size: 0.75rem;
  }
`;

const Search = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 18px 12px;

  strong {
    margin-right: 3px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.82rem;
  }

  input,
  button {
    min-height: 38px;
    padding: 7px 10px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 8px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
  }

  button {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
    cursor: pointer;
  }

  @media (max-width: 520px) {
    padding: 10px 12px 12px;

    input {
      flex: 1 1 180px;
      min-width: 0;
    }

    button {
      flex: 0 0 auto;
    }
  }
`;

const History = styled.div`
  padding: 0 18px 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.78rem;
  line-height: 1.65;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const HistoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 18px;
  margin-top: 7px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const Notice = styled.p`
  margin: 0;
  padding: 8px 16px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
  font-size: 0.67rem;
  line-height: 1.45;

  @media (max-width: 520px) {
    padding: 8px 10px;
    font-size: 0.6rem;
  }
`;

const Empty = styled.div`
  padding: 30px 22px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

const FIELD_ROWS = [
  ["pureGoldSellPerDon", "순금", "sell"],
  ["gold18kSellPerDon", "18K", "sell"],
  ["gold14kSellPerDon", "14K", "sell"],
  ["pureGoldBuyPerDon", "순금", "buy"],
  ["gold18kBuyPerDon", "18K", "buy"],
  ["gold14kBuyPerDon", "14K", "buy"],
];

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "-";
}

function formatDateKey(value) {
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

function compactDate(value) {
  return String(value || "").replace(/-/g, "");
}

function validPrice(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function changeInfo(current, previous) {
  if (!validPrice(current) || !validPrice(previous)) return null;

  const diff = Number(current) - Number(previous);
  const percent = (diff / Number(previous)) * 100;

  return {
    diff,
    percent,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "same",
  };
}

function changeText(change, prefix = false) {
  if (!change) return "전일 비교 없음";
  if (change.diff === 0) return prefix ? "전일 대비 보합" : "－ 보합";

  const arrow = change.diff > 0 ? "▲" : "▼";
  const text = `${arrow} ${Math.abs(change.diff).toLocaleString(
    "ko-KR"
  )}원 · ${Math.abs(change.percent).toFixed(2)}%`;

  return prefix ? `전일 대비 ${text}` : text;
}

export default function GoldPriceBoard() {
  const [data, setData] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [display14kSellPrice, setDisplay14kSellPrice] = useState(false);
  const [priceLoading, setPriceLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState("");
  const [history, setHistory] = useState(null);
  const [historyMessage, setHistoryMessage] = useState("");

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
            "[GoldPriceBoard] 시세 조회 실패:",
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
          setDisplay14kSellPrice(config.display14kSellPrice === true);
          setConfigLoading(false);
        },
        (error) => {
          console.warn(
            "[GoldPriceBoard] 공개 설정 조회 실패:",
            error?.message || error
          );
          setEnabled(false);
          setConfigLoading(false);
        }
      ),
    []
  );

  const rows = useMemo(() => {
    const market = data?.market || {};
    const previous = data?.previousMarket || {};

    return [
      {
        label: "순금",
        sellKey: "pureGoldSellPerDon",
        buyKey: "pureGoldBuyPerDon",
        sell: market.pureGoldSellPerDon,
        buy: market.pureGoldBuyPerDon,
        previousSell: previous.pureGoldSellPerDon,
        previousBuy: previous.pureGoldBuyPerDon,
      },
      {
        label: "18K",
        sellKey: "gold18kSellPerDon",
        buyKey: "gold18kBuyPerDon",
        sell: market.gold18kSellPerDon,
        buy: market.gold18kBuyPerDon,
        previousSell: previous.gold18kSellPerDon,
        previousBuy: previous.gold18kBuyPerDon,
      },
      {
        label: "14K",
        sellKey: "gold14kSellPerDon",
        buyKey: "gold14kBuyPerDon",
        sell: market.gold14kSellPerDon,
        buy: market.gold14kBuyPerDon,
        previousSell: previous.gold14kSellPerDon,
        previousBuy: previous.gold14kBuyPerDon,
      },
    ];
  }, [data]);

  const searchHistory = async () => {
    setHistory(null);
    setHistoryMessage("");

    const key = compactDate(historyDate);

    if (!/^\d{8}$/.test(key)) {
      setHistoryMessage("조회할 날짜를 선택해 주세요.");
      return;
    }

    try {
      const snap = await getDoc(doc(db, "goldPriceHistory", key));

      if (!snap.exists()) {
        setHistoryMessage("선택한 날짜에 저장된 시세가 없습니다.");
        return;
      }

      setHistory(snap.data());
    } catch (error) {
      console.warn(
        "[GoldPriceBoard] 과거 시세 조회 실패:",
        error?.message || error
      );
      setHistoryMessage("과거 시세를 불러오지 못했습니다.");
    }
  };

  if (configLoading || !enabled) return null;

  return (
    <Wrap>
      <Head>
        <HeadTitle>
          <Kicker>DAILY GOLD PRICE</Kicker>
          <Title>한국골드마켓 금시세</Title>
          {data && (
            <SourceDate>
              기준일 <strong>{formatDateKey(getKoreaTodayDateKey())}</strong>
            </SourceDate>
          )}
        </HeadTitle>
      </Head>

      {priceLoading ? (
        <Empty>시세를 불러오는 중입니다.</Empty>
      ) : !data ? (
        <Empty>관리자 확인 후 금시세가 공개됩니다.</Empty>
      ) : (
        <>
          <PriceTable>
            <TableHead>
              <HeadCell $first>종류</HeadCell>
              <HeadCell>
                내가 살 때
                <small>VAT 포함</small>
              </HeadCell>
              <HeadCell>내가 팔 때</HeadCell>
            </TableHead>

            {rows.map((row) => {
              const sellChange = changeInfo(row.sell, row.previousSell);
              const buyChange = changeInfo(row.buy, row.previousBuy);
              const showProductText =
                row.sellKey === "gold14kSellPerDon" &&
                !display14kSellPrice;

              return (
                <TableRow key={row.label}>
                  <Cell $first>
                    <Kind>{row.label}</Kind>
                  </Cell>

                  <Cell>
                    <Value $compact={showProductText}>
                      {showProductText
                        ? "제품 시세 적용"
                        : formatWon(row.sell)}
                    </Value>

                    {!showProductText && (
                      <Change $direction={sellChange?.direction}>
                        {changeText(sellChange)}
                      </Change>
                    )}
                  </Cell>

                  <Cell>
                    <Value>{formatWon(row.buy)}</Value>
                    <Change $direction={buyChange?.direction}>
                      {changeText(buyChange)}
                    </Change>
                  </Cell>
                </TableRow>
              );
            })}
          </PriceTable>

          <HistoryToggle
            type="button"
            $open={historyOpen}
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((prev) => !prev)}
          >
            <span>과거 시세 조회</span>
            <span>▼</span>
          </HistoryToggle>

          {historyOpen && (
            <>
              <Search>
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                />
                <button type="button" onClick={searchHistory}>
                  조회
                </button>
              </Search>

              {(history || historyMessage) && (
                <History>
                  {historyMessage || (
                    <>
                      <strong>
                        {formatDateKey(history.sourceDate)} 최종 시세
                      </strong>

                      <HistoryGrid>
                        {FIELD_ROWS.map(([key, label, type]) => {
                          if (
                            key === "gold14kSellPerDon" &&
                            !display14kSellPrice
                          ) {
                            return null;
                          }

                          const currentValue = data.market?.[key];
                          const oldValue = history.market?.[key];
                          const comparison = changeInfo(
                            currentValue,
                            oldValue
                          );

                          return (
                            <span key={key}>
                              {label} {type === "sell" ? "살 때" : "팔 때"}:{" "}
                              <strong>{formatWon(oldValue)}</strong>
                              {" · "}
                              현재 대비{" "}
                              {changeText(comparison).replace(
                                "전일 대비 ",
                                ""
                              )}
                            </span>
                          );
                        })}
                      </HistoryGrid>
                    </>
                  )}
                </History>
              )}
            </>
          )}

          <Notice>
            1돈(3.75g) 기준 · 내가 살 때 가격은 VAT 포함 · 시세는 시장
            상황에 따라 변경될 수 있습니다.
          </Notice>
        </>
      )}
    </Wrap>
  );
}
