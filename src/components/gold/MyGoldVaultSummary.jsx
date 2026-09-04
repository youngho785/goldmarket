// src/components/gold/MyGoldVaultSummary.jsx
import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ChevronRight, Gem, LockKeyhole, Sparkles } from "lucide-react";

import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import { getGoldLevelSummary } from "@/lib/goldLevel";

const Stack = styled.div`
  display: grid;
  gap: 10px;
`;

const VaultCard = styled.section`
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);
`;

const VaultHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 15px 11px;

  small {
    display: block;
    margin-bottom: 2px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.57rem;
    font-weight: 950;
    letter-spacing: 0.11em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.96rem;
  }
`;

const Icon = styled.span`
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 13px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.secondaryDark};

  svg { width: 19px; height: 19px; }
`;

const VaultBody = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 0 12px 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.dividerSubtle};
`;

const Metric = styled.div`
  min-width: 0;
  padding: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.59rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 4px;
    overflow: hidden;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.97rem;
    font-weight: 950;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Empty = styled.div`
  padding: 2px 15px 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.67rem;
  line-height: 1.48;
  word-break: keep-all;
`;

const Action = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 9px 13px;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.69rem;
  font-weight: 900;
  text-decoration: none;

  span { display: inline-flex; align-items: center; gap: 6px; }
  svg { width: 15px; height: 15px; color: ${({ theme }) => theme.colors.secondaryDark}; }
`;

const LevelCard = styled.section`
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 52%, white),
    ${({ theme }) => theme.colors.surface}
  );
`;

const LevelTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  small {
    display: block;
    margin-bottom: 2px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.55rem;
    font-weight: 950;
    letter-spacing: 0.08em;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.82rem;
  }

  b {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.72rem;
  }
`;

const Track = styled.div`
  height: 7px;
  margin-top: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.dividerSubtle};

  span {
    display: block;
    width: ${({ $progress }) => `${Math.max(0, Math.min(100, $progress))}%`};
    height: 100%;
    border-radius: inherit;
    background: ${({ theme }) => theme.gradients.primary};
  }
`;

const LevelFoot = styled.p`
  margin: 7px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.58rem;
  line-height: 1.4;
`;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "시세 공개 시 계산";
}

export default function MyGoldVaultSummary({ user, bonusStatus }) {
  const { summary, itemsLoading, publicPriceEnabled } = useGoldVaultDashboard(user?.uid);
  const level = getGoldLevelSummary({ itemCount: summary.itemCount, bonusStatus });

  if (!user?.uid) {
    return (
      <VaultCard aria-labelledby="my-gold-vault-title">
        <VaultHead>
          <div>
            <small>MY GOLD</small>
            <h2 id="my-gold-vault-title">내 금고</h2>
          </div>
          <Icon><LockKeyhole aria-hidden /></Icon>
        </VaultHead>
        <Empty>
          반지·목걸이·돌반지·금제품을 등록하면 예상 순금 중량과 오늘의 가치를 한곳에서 확인할 수 있습니다.
        </Empty>
        <Action to="/login">
          <span><Gem aria-hidden /> 로그인하고 내 금 등록하기</span>
          <ChevronRight aria-hidden />
        </Action>
      </VaultCard>
    );
  }

  return (
    <Stack>
      <VaultCard aria-labelledby="my-gold-vault-title">
        <VaultHead>
          <div>
            <small>MY GOLD</small>
            <h2 id="my-gold-vault-title">내 금고</h2>
          </div>
          <Icon><Gem aria-hidden /></Icon>
        </VaultHead>

        {itemsLoading ? (
          <Empty>내 금 정보를 불러오는 중입니다.</Empty>
        ) : summary.itemCount === 0 ? (
          <Empty>
            아직 등록한 금이 없습니다. 첫 금제품을 등록하면 매일 내 금의 예상 가치를 확인할 수 있습니다.
          </Empty>
        ) : (
          <VaultBody>
            <Metric>
              <span>등록한 금제품</span>
              <strong>{summary.itemCount}개</strong>
            </Metric>
            <Metric>
              <span>예상 순금 중량</span>
              <strong>{summary.pureGoldG.toFixed(3)}g</strong>
            </Metric>
            <Metric>
              <span>총 등록 무게</span>
              <strong>{summary.totalWeightG.toFixed(2)}g</strong>
            </Metric>
            <Metric>
              <span>오늘 예상 가치</span>
              <strong>{publicPriceEnabled ? formatWon(summary.estimatedValueWon) : "시세 비공개"}</strong>
            </Metric>
          </VaultBody>
        )}

        <Action to="/my-gold">
          <span><Gem aria-hidden /> {summary.itemCount ? "내 금고 자세히 보기" : "첫 금제품 등록하기"}</span>
          <ChevronRight aria-hidden />
        </Action>
      </VaultCard>

      <LevelCard aria-label="나의 Gold Level">
        <LevelTop>
          <div>
            <small>GOLD LEVEL · BETA</small>
            <strong>LV.{level.level} {level.name}</strong>
          </div>
          <b>{level.xp} XP</b>
        </LevelTop>
        <Track $progress={level.progress}><span /></Track>
        <LevelFoot>
          <Sparkles size={11} aria-hidden /> {level.next
            ? ` 다음 레벨까지 ${level.remainingXp} XP · 내 금 등록과 기존 회원 활동을 기준으로 계산합니다.`
            : " 현재 베타 최고 레벨입니다."}
          <br />Gold XP는 순금 혜택과 별도의 비금전성 성장 지표입니다.
        </LevelFoot>
      </LevelCard>
    </Stack>
  );
}
