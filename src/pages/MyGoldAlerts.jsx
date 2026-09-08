// src/pages/MyGoldAlerts.jsx
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowLeft, BellRing } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import MyGoldAlertGoals from "@/components/gold/MyGoldAlertGoals";
import { computeVaultValueWon } from "@/lib/goldVaultCatalog";

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
  const { user } = useAuthContext();
  const {
    itemsLoading,
    publicPriceEnabled,
    customerSellPricePerDon,
    summary,
  } = useGoldVaultDashboard(user?.uid);
  const bonus = useBonusGoldBalance(user?.uid);
  const bonusBalanceG = Number(bonus.balanceG || 0);
  const bonusValueWon =
    publicPriceEnabled && bonusBalanceG > 0
      ? computeVaultValueWon(bonusBalanceG, customerSellPricePerDon)
      : 0;
  const currentValueWon = Number(summary.estimatedValueWon || 0) + bonusValueWon;
  const exchangeReadyG = Number(summary.pureGoldG || 0) + bonusBalanceG;
  const loading = itemsLoading || bonus.loading;

  return (
    <Page>
      <Back to="/my-gold"><ArrowLeft size={15} aria-hidden /> 내금고로 돌아가기</Back>
      <Hero>
        <h1><BellRing size={21} aria-hidden /> 내금고 알림</h1>
        <p>원하는 가격이나 교환 시점이 오면 자동으로 알려드립니다.</p>
      </Hero>

      <MyGoldAlertGoals
        uid={user?.uid}
        currentValueWon={currentValueWon}
        currentPricePerDon={customerSellPricePerDon}
        exchangeReadyG={exchangeReadyG}
        registeredItemCount={summary.itemCount}
        bonusGoldG={bonusBalanceG}
        publicPriceEnabled={publicPriceEnabled}
        loadingMetrics={loading}
      />
    </Page>
  );
}
