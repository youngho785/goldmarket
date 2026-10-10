import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ChevronRight, Sparkles } from "lucide-react";

import useBonusGoldBalance from "@/hooks/useBonusGoldBalance";

const Card = styled(Link)`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 11px;
  align-items: center;
  min-height: ${({ $compact }) => ($compact ? "64px" : "72px")};
  padding: ${({ $compact }) => ($compact ? "10px 13px" : "12px 15px")};
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background:
    radial-gradient(circle at 0% 0%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 17%, transparent), transparent 55%),
    ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  box-shadow: 0 10px 25px color-mix(in srgb, ${({ theme }) => theme.colors.primaryDark} 7%, transparent);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  &:hover { transform: translateY(-2px); border-color: ${({ theme }) => theme.colors.secondary}; box-shadow: ${({ theme }) => theme.shadows.card}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.secondary}; outline-offset: 3px; }

  > span:first-child {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.goldLight};
  }

  svg { width: 18px; height: 18px; }
  > svg:last-child { color: ${({ theme }) => theme.colors.secondaryDark}; }
`;

const Copy = styled.div`
  min-width: 0;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .67rem;
    font-weight: 950;
    letter-spacing: .04em;
  }

  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .9rem;
  }

  p {
    margin: 2px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .68rem;
    line-height: 1.4;
  }
`;

export default function MemberGoldSummaryCard({ uid, compact = false }) {
  const { balanceG, loading } = useBonusGoldBalance(uid);

  if (!uid) return null;

  return (
    <Card to="/member-gold" $compact={compact} aria-label="MEMBER GOLD 회원혜택 순금 보기">
      <span><Sparkles aria-hidden /></span>
      <Copy>
        <small>MEMBER GOLD</small>
        <strong>{loading ? "잔액 확인 중" : `${Number(balanceG || 0).toFixed(2)}g`}</strong>
        <p>MY GOLD와 별도 혜택 · GOLD TO GOLD에 사용</p>
      </Copy>
      <ChevronRight aria-hidden />
    </Card>
  );
}
