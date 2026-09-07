// src/components/gold/MyGoldTicker.jsx
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, Gem } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import { computeVaultValueWon } from "@/lib/goldVaultCatalog";

const Bar = styled.aside`
  position: relative;
  width: 100%;
  min-height: 40px;
  overflow: hidden;
  border-top: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 32%, transparent);
  border-bottom: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 32%, transparent);
  background:
    radial-gradient(
      circle at 18% 50%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 9%, transparent),
      transparent 16rem
    ),
    linear-gradient(
      90deg,
      ${({ theme }) => theme.colors.primaryDark},
      ${({ theme }) => theme.colors.primary},
      ${({ theme }) => theme.colors.primaryDark}
    );
  color: ${({ theme }) => theme.on.primary};

  &:hover [data-track="true"] {
    animation-play-state: paused;
  }
`;

const Track = styled.div`
  display: flex;
  width: max-content;
  animation: myGoldTicker 24s linear infinite;
  will-change: transform;

  @keyframes myGoldTicker {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    width: 100%;
    min-width: 0;
    animation: none;
    transform: none;

    > a:nth-child(2) {
      display: none;
    }
  }
`;

const Segment = styled(Link)`
  display: inline-flex;
  flex: 0 0 auto;
  min-width: 50vw;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 40px;
  padding: 7px clamp(28px, 5vw, 70px);
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 82%, transparent);
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1.25;
  text-decoration: none;
  white-space: nowrap;

  svg {
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.goldLight};
  }

  strong {
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-weight: 950;
  }

  .action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-weight: 950;
  }

  &:hover {
    color: ${({ theme }) => theme.on.primary};
  }

  @media (max-width: 620px) {
    min-width: 92vw;
    justify-content: flex-start;
    gap: 7px;
    padding-inline: 18px;
    font-size: 0.66rem;
  }

  @media (prefers-reduced-motion: reduce) {
    flex: 1 1 auto;
    min-width: 100%;
    justify-content: center;
  }
`;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "-";
}

export default function MyGoldTicker() {
  const { user } = useAuthContext() || {};
  const dashboard = useGoldVaultDashboard(user?.uid);
  const bonus = useBonusGoldBalance(user?.uid);

  const bonusBalanceG = Number(bonus.balanceG || 0);
  const pureGoldG = Number(dashboard.summary.pureGoldG || 0) + bonusBalanceG;
  const bonusValueWon = dashboard.publicPriceEnabled
    ? computeVaultValueWon(bonusBalanceG, dashboard.customerSellPricePerDon)
    : 0;
  const currentValueWon =
    Number(dashboard.summary.estimatedValueWon || 0) + bonusValueWon;
  const loading = !!user?.uid && (dashboard.itemsLoading || bonus.loading);

  let content;
  if (!user?.uid) {
    content = (
      <>
        <Gem size={14} aria-hidden />
        <span>MY GOLD · 내 금을 한곳에서 관리하세요</span>
        <span className="action">
          내 금고 체험하기 <ArrowRight size={13} aria-hidden />
        </span>
      </>
    );
  } else if (loading) {
    content = (
      <>
        <Gem size={14} aria-hidden />
        <span>MY GOLD · 내 금고를 불러오는 중입니다</span>
      </>
    );
  } else if (pureGoldG > 0) {
    content = (
      <>
        <Gem size={14} aria-hidden />
        <span>내 금고</span>
        <strong>{pureGoldG.toFixed(2)}g</strong>
        <span>·</span>
        <span>
          오늘 참고가 {dashboard.publicPriceEnabled ? formatWon(currentValueWon) : "시세 공개 대기"}
        </span>
        <span>·</span>
        <span className="action">
          내 금고 보기 <ArrowRight size={13} aria-hidden />
        </span>
      </>
    );
  } else {
    content = (
      <>
        <Gem size={14} aria-hidden />
        <span>내 금고</span>
        <strong>0.00g</strong>
        <span>· 보유 금을 등록하면 오늘의 가치를 함께 볼 수 있어요 ·</span>
        <span className="action">
          첫 금 등록하기 <ArrowRight size={13} aria-hidden />
        </span>
      </>
    );
  }

  return (
    <Bar aria-label="내 금고 바로가기">
      <Track data-track="true">
        <Segment to="/my-gold">{content}</Segment>
        <Segment to="/my-gold" aria-hidden="true" tabIndex={-1}>
          {content}
        </Segment>
      </Track>
    </Bar>
  );
}
