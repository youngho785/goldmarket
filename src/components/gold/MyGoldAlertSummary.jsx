// src/components/gold/MyGoldAlertSummary.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Bell, BellRing, ChevronRight } from "lucide-react";

import {
  MY_GOLD_ALERT_BAR_OPTIONS,
  getMyGoldAlertGoals,
} from "@/services/myGoldAlertGoalsService";
import { readGuestMyGoldAlertGoals } from "@/lib/myGoldGuestDemo";

const Card = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px 15px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 17%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Main = styled.div`
  min-width: 0;
  display: grid;
  gap: 9px;
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`;

const Title = styled.div`
  min-width: 0;

  strong {
    display: flex;
    align-items: center;
    gap: 7px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.92rem;
    font-weight: 950;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.63rem;
    line-height: 1.4;
    word-break: keep-all;
  }
`;

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 999px;
  background: ${({ $ready, theme }) => $ready ? theme.semantic.alertSuccessBg : theme.colors.surfaceAlt};
  color: ${({ $ready, theme }) => $ready ? theme.semantic.alertSuccessText : theme.colors.textSecondary};
  font-size: 0.62rem;
  font-weight: 900;
`;

const Chips = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.62rem;
  font-weight: 850;
`;

const Action = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  padding: 9px 12px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  text-decoration: none;
  font-size: 0.68rem;
  font-weight: 950;
  white-space: nowrap;

  @media (max-width: 560px) {
    justify-content: space-between;
  }
`;


const CompactCard = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 70px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 15%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface};
  color: inherit;
  text-decoration: none;
  box-shadow: 0 7px 18px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);

  strong {
    display: flex;
    align-items: center;
    gap: 7px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.86rem;
    font-weight: 950;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.62rem;
    line-height: 1.4;
    word-break: keep-all;
  }

  > svg {
    width: 18px;
    height: 18px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

function formatGoalWon(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  if (amount >= 10000) {
    const man = amount / 10000;
    const label = Number.isInteger(man)
      ? man.toLocaleString("ko-KR")
      : man.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
    return `${label}만원`;
  }
  return `${Math.round(amount).toLocaleString("ko-KR")}원`;
}

export default function MyGoldAlertSummary({ uid, demoMode = false, compact = false }) {
  const [goals, setGoals] = useState(() => demoMode ? readGuestMyGoldAlertGoals() : null);
  const [pushReady, setPushReady] = useState(false);
  const [loading, setLoading] = useState(!!uid && !demoMode);

  useEffect(() => {
    if (demoMode) {
      setGoals(readGuestMyGoldAlertGoals());
      setPushReady(false);
      setLoading(false);
      return undefined;
    }
    if (!uid) return undefined;
    let active = true;
    setLoading(true);
    getMyGoldAlertGoals(uid)
      .then((result) => {
        if (!active) return;
        setGoals(result.goals || null);
        setPushReady(result.pushReady === true);
      })
      .catch(() => {
        if (!active) return;
        setGoals(null);
        setPushReady(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [demoMode, uid]);

  const activeGoals = useMemo(() => {
    if (!goals?.enabled) return [];
    const list = [];
    if (Number(goals.valueTargetWon) > 0) list.push(`가치 ${formatGoalWon(goals.valueTargetWon)}`);
    if (Number(goals.priceTargetPerDon) > 0) {
      const direction = goals.priceDirection === "down" ? "하락" : "상승";
      list.push(`순금 ${direction} ${formatGoalWon(goals.priceTargetPerDon)}`);
    }
    if (Number(goals.targetGoldBarG) > 0) {
      const option = MY_GOLD_ALERT_BAR_OPTIONS.find((item) => Number(item.grams) === Number(goals.targetGoldBarG));
      list.push(option?.label || `${goals.targetGoldBarG}g 골드바`);
    }
    return list;
  }, [goals]);

  if (compact) {
    const summaryText = loading
      ? "알림 설정을 불러오는 중입니다."
      : activeGoals.length > 0
        ? `${activeGoals.length}개 조건 ${demoMode ? "체험 중" : "설정 중"}`
        : demoMode
          ? "가치·순금 가격·골드바 목표 알림을 체험해 보세요."
          : "가치·순금 가격·골드바 목표를 설정할 수 있습니다.";

    return (
      <CompactCard id="my-gold-alert-summary" to="/my-gold/alerts" aria-label="내 금 알림 설정 보기">
        <div>
          <strong id="my-gold-alert-summary-title"><BellRing size={16} aria-hidden /> 내 금 알림</strong>
          <p>{summaryText}{pushReady && !demoMode ? " · 푸시 ON" : ""}</p>
        </div>
        <ChevronRight aria-hidden />
      </CompactCard>
    );
  }

  return (
    <Card id="my-gold-alert-summary" aria-labelledby="my-gold-alert-summary-title">
      <Main>
        <Head>
          <Title>
            <strong id="my-gold-alert-summary-title"><BellRing size={16} aria-hidden /> 내 금 알림</strong>
            <p>
              {loading
                ? "설정을 불러오는 중입니다."
                : activeGoals.length > 0
                  ? demoMode
                    ? `${activeGoals.length}개 알림 조건을 체험 중이에요.`
                    : `${activeGoals.length}개 조건을 지켜보고 있어요.`
                  : demoMode
                    ? "가치·순금 가격·골드바 목표 알림을 직접 설정해볼 수 있어요."
                    : "내 금 가치나 원하는 골드바 조건에 도달하면 알려드릴 수 있어요."}
            </p>
          </Title>
          <Status $ready={pushReady}>
            {pushReady ? <BellRing size={12} aria-hidden /> : <Bell size={12} aria-hidden />}
            {demoMode ? "체험" : pushReady ? "푸시 ON" : "푸시 확인"}
          </Status>
        </Head>

        {activeGoals.length > 0 && (
          <Chips aria-label="설정 중인 내 금 알림">
            {activeGoals.map((label) => <Chip key={label}>{label}</Chip>)}
          </Chips>
        )}
      </Main>

      <Action to="/my-gold/alerts">
        <span>{demoMode ? "알림 설정 체험" : activeGoals.length > 0 ? "알림 관리" : "알림 설정"}</span>
        <ChevronRight size={16} aria-hidden />
      </Action>
    </Card>
  );
}
