// src/pages/MyGoldAlerts.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeft, BellRing } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import MyGoldAlertGoals from "@/components/gold/MyGoldAlertGoals";
import {
  computeVaultMarketValueWon,
  computeVaultPureGoldG,
} from "@/lib/goldVaultCatalog";
import {
  GUEST_MY_GOLD_BONUS_G,
  readGuestMyGoldItems,
} from "@/lib/myGoldGuestDemo";

const Page = styled.div`
  display: grid;
  gap: 13px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 0 28px;
`;

const Back = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  font-size: 0.68rem;
  font-weight: 850;
`;

const Hero = styled.header`
  display: grid;
  gap: 5px;
  padding: 2px 2px 4px;

  h1 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: clamp(1.25rem, 4vw, 1.65rem);
    letter-spacing: -0.035em;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.72rem;
    line-height: 1.5;
    word-break: keep-all;
  }
`;

export default function MyGoldAlerts() {
  const { memberUser: user } = useAuthContext();
  const {
    itemsLoading,
    publicPriceEnabled,
    market,
    customerSellPricePerDon,
    rates,
    summary,
  } = useGoldVaultDashboard(user?.uid);
  const bonus = useBonusGoldBalance(user?.uid);
  const isGuest = !user?.uid;
  const guestItems = useMemo(() => readGuestMyGoldItems(), []);
  const guestSummary = useMemo(() => {
    const pureGoldG = guestItems.reduce(
      (total, item) => total + computeVaultPureGoldG(item, rates, customerSellPricePerDon),
      0
    );
    return {
      itemCount: guestItems.length,
      pureGoldG,
      estimatedValueWon: publicPriceEnabled
        ? guestItems.reduce(
            (total, item) => total + computeVaultMarketValueWon(item, rates, market),
            0
          )
        : 0,
    };
  }, [customerSellPricePerDon, guestItems, market, publicPriceEnabled, rates]);

  const bonusBalanceG = isGuest ? GUEST_MY_GOLD_BONUS_G : Number(bonus.balanceG || 0);
  const activeSummary = isGuest ? guestSummary : summary;
  // MY GOLD 가치 목표는 사용자가 직접 기록한 금만 반영합니다.
  // MEMBER GOLD(회원혜택)는 별도 자산으로 유지하고, 골드바 교환 가능 예상량에서만 합산합니다.
  const currentValueWon = Number(activeSummary.estimatedValueWon || 0);
  const exchangeReadyG = Number(activeSummary.pureGoldG || 0) + bonusBalanceG;
  const loading = isGuest ? false : itemsLoading || bonus.loading;

  return (
    <Page>
      <Back to="/my-gold"><ArrowLeft size={15} aria-hidden /> MY GOLD로 돌아가기</Back>
      <Hero>
        <h1><BellRing size={21} aria-hidden /> 내 금 알림{isGuest ? " 체험" : ""}</h1>
        <p>
          {isGuest
            ? "로그인 없이 가치·순금 가격·골드바 목표 알림을 직접 설정해볼 수 있습니다. 실제 푸시는 로그인 후 켜집니다."
            : "내 금 가치·순금 1돈 가격·골드바 목표를 정해 보세요. 저장 시와 정기 점검 시 목표 도달 여부를 확인합니다."}
        </p>
      </Hero>

      <MyGoldAlertGoals
        uid={user?.uid}
        currentValueWon={currentValueWon}
        currentPricePerDon={customerSellPricePerDon}
        exchangeReadyG={exchangeReadyG}
        registeredItemCount={activeSummary.itemCount}
        bonusGoldG={bonusBalanceG}
        publicPriceEnabled={publicPriceEnabled}
        loadingMetrics={loading}
        demoMode={isGuest}
      />
    </Page>
  );
}
