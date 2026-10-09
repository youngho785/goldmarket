import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import styled from "styled-components";
import {
  AppPriceLinks,
  AppPricePrimary,
  AppPriceSecondary,
  AppPriceDisclaimer,
} from "./GoldPrice.styles";

// The previous native price experience showed all three purities side by side.
// Keep that glanceable comparison without the three tall stacked cards.
const CompactMarket = styled.div`
  margin-top: 6px;
  overflow: hidden;
  border: 1px solid rgba(15, 24, 32, .13);
  border-radius: 14px;
  background: #fff;

  .context { padding: 9px 11px; color: #5d626c; font-size: .76rem; font-weight: 750; }
  table { width: 100%; border-spacing: 0; table-layout: fixed; border-collapse: collapse; }
  col.label { width: 20%; }
  col.price { width: 26.666%; }
  th, td { padding: 11px 3px; text-align: center; border: 1px solid rgba(10, 22, 30, .08); }
  thead th { color: #14202b; font-size: .91rem; background: #f5f1e9; }
  thead th:first-child { background: #fff; font-size: .72rem; }
  thead th:nth-child(2) { background: #17212d; color: #ffe9ad; }
  tbody th { color: #59616b; background: #faf9f6; font-size: .72rem; font-weight: 800; }
  tbody th small { display: block; margin-top: 2px; font-size: .62rem; font-weight: 600; }
  tbody td { color: #18222d; font-size: clamp(.77rem, 3.45vw, 1rem); font-family: ${({ theme }) => theme.fonts.numeric};
    font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: -.045em; overflow-wrap: anywhere; }
  tbody tr.price-row td { font-size: clamp(.83rem, 3.65vw, 1.05rem); }
  tbody tr.trend-row td { color: #4d637c; font-size: clamp(.7rem, 2.85vw, .8rem); font-weight: 750; }
  .sell-note { font-size: .73rem; font-family: inherit; letter-spacing: -.02em; }
  @media (max-width: 355px) { th,td { padding: 9px 1px; } col.label { width: 19%; } }
`;

const DiscoveryCard = styled.section`
  display: grid;
  gap: 5px;
  margin-top: 12px;
  padding: 13px 14px;
  border: 1px solid rgba(204, 162, 76, 0.34);
  border-radius: 14px;
  background: linear-gradient(135deg, #fff7e8, #fff);
  color: #1b2129;
  small { color: #926716; font-size: .69rem; font-weight: 900; }
  strong { font-size: .98rem; line-height: 1.4; font-weight: 900; }
  p { margin: 0; color: #62656d; font-size: .74rem; line-height: 1.45; }
  .benefit-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 3px; }
  a { display: inline-flex; align-items: center; gap: 5px; justify-content: center;
    width: fit-content; min-height: 43px; padding: 9px 12px; border-radius: 9px;
    background: #17202a; color: #fff; text-decoration: none; font-size: .8rem; font-weight: 850; }
  a.secondary { background: transparent; border: 1px solid #ab873f; color: #533d16; }
`;

const StoryLink = styled(Link)`
  display: grid;
  gap: 4px;
  margin-top: 9px;
  padding: 12px 14px;
  border: 1px solid rgba(204, 162, 76, 0.23);
  border-radius: 13px;
  background: #fff;
  text-decoration: none;
  color: #1e2732;
  small { color: #997027; font-size: .68rem; font-weight: 900; }
  strong { font-size: .85rem; line-height: 1.4; font-weight: 850; }
  span { font-size: .76rem; font-weight: 850; color: #976a20; }
`;

export default function NativeGoldPriceOverview({
  marketRows,
  pagePriceAvailable,
  isLoading,
  display14kSellPrice,
  isMember,
  registerPath,
  formatWon,
  changeInfo,
  changeText,
}) {
  return (
    <>
      <CompactMarket aria-label="금 종류별 1돈 시세 비교표">
        <div className="context">24K · 18K · 14K 한눈에 · 1돈(3.75g) 기준 · 단위 원</div>
        <table>
          <colgroup><col className="label" /><col className="price" /><col className="price" /><col className="price" /></colgroup>
          <thead>
            <tr><th scope="col">구분</th>{marketRows.map((row) => <th key={row.short} scope="col">{row.short}</th>)}</tr>
          </thead>
          <tbody>
            <tr className="price-row"><th scope="row">팔 때</th>
              {marketRows.map((row) => (
                <td key={`buy-${row.short}`}>{pagePriceAvailable ? formatWon(row.buy) : "-"}</td>
              ))}
            </tr>
            <tr><th scope="row">살 때<small>VAT 포함</small></th>
              {marketRows.map((row) => (
                <td className={row.short === "14K" && !display14kSellPrice ? "sell-note" : undefined} key={`sell-${row.short}`}>
                  {!pagePriceAvailable ? "-" : row.short === "14K" && !display14kSellPrice ? "제품 시세" : formatWon(row.sell)}
                </td>
              ))}
            </tr>
            <tr className="trend-row"><th scope="row">전일 대비<small>팔 때</small></th>
              {marketRows.map((row) => {
                const trend = changeInfo(row.buy, row.previousBuy);
                const sign = trend?.diff > 0 ? "▲" : trend?.diff < 0 ? "▼" : "—";
                return (
                  <td key={`trend-${row.short}`} aria-label={pagePriceAvailable ? changeText(trend) : "시세 미공개"}>
                    {pagePriceAvailable ? trend ? `${sign} ${Math.abs(trend.percent).toFixed(2)}%` : "—" : isLoading ? "확인 중" : "-"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </CompactMarket>

      <AppPriceLinks aria-label="금시세 다음 행동">
        <AppPricePrimary to="/">내 금 가치 확인 <ArrowRight size={17} aria-hidden="true" /></AppPricePrimary>
        <AppPriceSecondary to="/gold-exchange">골드바 교환 계산</AppPriceSecondary>
      </AppPriceLinks>
      <AppPriceDisclaimer>
        실제 거래 금액은 매장 확인과 거래 시점에 따라 달라질 수 있습니다.
        <Link to={isMember ? "/settings" : registerPath}>
          {isMember ? "금시세 알림 설정" : "회원 혜택 알아보기"}
        </Link>
      </AppPriceDisclaimer>
      <DiscoveryCard aria-label="MEMBER GOLD 회원 혜택">
        <small>MEMBER GOLD · 회원 참여 혜택</small>
        <strong>금 퀵퀴즈도 풀고, 최대 순금 0.03g 혜택</strong>
        <p>가입 0.01g · 퀵퀴즈 0.01g · 금시세 알림 0.01g. 각각 지급 조건을 충족해야 합니다.</p>
        <div className="benefit-actions">
          <Link to={isMember ? "/member-gold" : "/quiz/gold-bonus"}>
            {isMember ? "내 혜택 확인" : "퀵퀴즈 참여"}<ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link className="secondary" to={isMember ? "/settings" : registerPath}>
            {isMember ? "금시세 알림 참여" : "가입 후 알림 혜택"}
          </Link>
        </div>
      </DiscoveryCard>
      <StoryLink to="/gold-to-gold" aria-label="GOLD TO GOLD 이야기 보기">
        <small>GOLD TO GOLD · 가치의 이야기</small>
        <strong>쓰임은 달라져도 금의 가치는 이어집니다.</strong>
        <span>골드바 교환에 담긴 이야기 보기 →</span>
      </StoryLink>
    </>
  );
}
