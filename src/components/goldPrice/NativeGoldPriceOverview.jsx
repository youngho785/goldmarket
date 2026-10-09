import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import styled from "styled-components";
import {
  AppPriceList,
  AppPriceCard,
  AppPriceCardHeader,
  AppPriceMetrics,
  AppPriceLinks,
  AppPricePrimary,
  AppPriceSecondary,
  AppPriceDisclaimer,
} from "./GoldPrice.styles";


const DiscoveryCard = styled.section`
  display: grid;
  gap: 8px;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid rgba(204, 162, 76, 0.35);
  border-radius: 16px;
  background: linear-gradient(135deg, #fff7e8, #fff);
  color: #1b2129;

  small { font-size: .72rem; color: #926716; font-weight: 850; }
  strong { font-size: 1.12rem; line-height: 1.35; font-weight: 900; }
  p { margin: 0; color: #5d626c; font-size: .78rem; line-height: 1.5; }
  a { display: inline-flex; align-items: center; gap: 5px; width: fit-content;
      padding: 9px 12px; margin-top: 3px; border-radius: 9px; background: #17202a;
      color: white; text-decoration: none; font-size: .83rem; font-weight: 850; }
`;
const StoryLink = styled(Link)`
  display: grid;
  gap: 6px;
  margin-top: 12px;
  padding: 16px;
  border: 1px solid rgba(204, 162, 76, 0.26);
  border-radius: 16px;
  background: #fff;
  text-decoration: none;
  color: #1e2732;
  small { color: #a87b2b; font-weight: 900; letter-spacing: .05em; }
  strong { font-size: 1rem; line-height: 1.35; font-weight: 850; }
  span { font-size: .78rem; font-weight: 800; color: #976a20; }
`;

/** Native app: 핵심 시세 아래에 신규 가입 혜택과 브랜드 스토리로 연결합니다. */
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
      <AppPriceList aria-label="금 종류별 1돈 시세">
        {marketRows.map((row) => {
          const buyChange = changeInfo(row.buy, row.previousBuy);
          const showProductText =
            row.sellKey === "gold14kSellPerDon" && !display14kSellPrice;
          return (
            <AppPriceCard key={row.short}>
              <AppPriceCardHeader>
                <strong>{row.short === "24K" ? "24K · 순금" : row.short}</strong>
                <span>
                  {pagePriceAvailable
                    ? changeText(buyChange)
                    : isLoading
                      ? "시세 확인 중"
                      : "시세 미공개"}
                </span>
              </AppPriceCardHeader>
              <AppPriceMetrics>
                <div>
                  <span>내가 팔 때</span>
                  <strong>{pagePriceAvailable ? formatWon(row.buy) : "-"}</strong>
                </div>
                <div>
                  <span>내가 살 때 · VAT 포함</span>
                  <strong>
                    {!pagePriceAvailable
                      ? "-"
                      : showProductText
                        ? "제품 시세"
                        : formatWon(row.sell)}
                  </strong>
                </div>
              </AppPriceMetrics>
            </AppPriceCard>
          );
        })}
      </AppPriceList>

      <AppPriceLinks aria-label="금시세 다음 행동">
        <AppPricePrimary to="/">
          내 금 가치 확인하기
          <ArrowRight size={17} aria-hidden="true" />
        </AppPricePrimary>
        <AppPriceSecondary to="/gold-exchange">
          골드바 교환 계산
        </AppPriceSecondary>
      </AppPriceLinks>
      <AppPriceDisclaimer>
        실제 거래 시 적용되는 금액은 매장 확인 및 거래 시점에 따라 달라질 수 있습니다.
        <Link to={isMember ? "/settings" : registerPath}>
          {isMember ? "금시세 알림 설정" : "회원 혜택 알아보기"}
        </Link>
      </AppPriceDisclaimer>

      <DiscoveryCard aria-label="MEMBER GOLD 회원 혜택">
        <small>MEMBER GOLD · 회원 참여 혜택</small>
        <strong>퀵퀴즈도 풀고, 최대 순금 0.03g 혜택</strong>
        <p>회원가입 0.01g · 퀵퀴즈 0.01g · 금시세 알림 참여 0.01g. 각 혜택은 지급 조건 충족 시 제공되며, 이용 조건과 지급 상태를 확인해 주세요.</p>
        <Link to={isMember ? "/member-gold" : "/quiz/gold-bonus"}>
          {isMember ? "내 회원 혜택 확인" : "퀵퀴즈 참여하기"}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </DiscoveryCard>
      <StoryLink to="/gold-to-gold" aria-label="GOLD TO GOLD 이야기 알아보기">
        <small>GOLD TO GOLD · 가치의 이야기</small>
        <strong>쓰임은 달라져도, 금의 가치는 이어집니다.</strong>
        <span>골드바 교환을 시작하는 이유 알아보기 →</span>
      </StoryLink>
    </>
  );
}
