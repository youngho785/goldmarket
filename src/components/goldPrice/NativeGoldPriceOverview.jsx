import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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

/** Native app: 가격 확인에 집중하는 화면. 공개 여부와 시세 계산은 상위 페이지가 결정합니다. */
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
    </>
  );
}
