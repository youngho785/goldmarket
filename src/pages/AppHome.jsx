// src/pages/AppHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import styled from "styled-components";
import {
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  ReceiptText,
} from "lucide-react";

import AppGoldPriceSummary from "@/components/gold/AppGoldPriceSummary";
import AppMyGoldDashboard from "@/components/gold/AppMyGoldDashboard";
import { useAuthContext } from "@/context/AuthContext";
import { getMemberBonusStatus } from "@/services/quizClient";
import { db } from "@/firebase/firebase";

const Page = styled.div`
  display: grid;
  gap: 9px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 0 0 8px;
`;

const GoldToGoldCard = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 66px;
  padding: 11px 12px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 17px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 52%, white) 0%,
    ${({ theme }) => theme.colors.surface} 64%
  );
  box-shadow: 0 7px 18px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
  color: inherit;
  text-decoration: none;

  > svg {
    width: 17px;
    height: 17px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 60%, transparent);
    outline-offset: 2px;
  }
`;

const GoldToGoldCopy = styled.div`
  min-width: 0;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 950;
    letter-spacing: 0.1em;
  }

  h2 {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.78rem;
    line-height: 1.3;
    letter-spacing: -0.025em;
    word-break: keep-all;
  }
`;

const QuickSection = styled.section`
  padding: 1px 0 0;
`;

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
`;

const QuickLink = styled(Link)`
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 7px;
  align-items: center;
  min-width: 0;
  min-height: 58px;
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  > span {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg {
    width: 15px;
    height: 15px;
    stroke-width: 1.9;
  }

  strong {
    min-width: 0;
    font-size: 0.62rem;
    line-height: 1.25;
    word-break: keep-all;
  }

  &:active {
    transform: translateY(1px);
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const ReservationCard = styled(Link)`
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  min-height: 62px;
  padding: 9px 11px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 20%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  > span:first-child {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.goldLight};
  }

  svg {
    width: 17px;
    height: 17px;
  }

  > svg:last-child {
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const ReservationCopy = styled.div`
  min-width: 0;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 950;
    letter-spacing: 0.07em;
  }

  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.75rem;
    line-height: 1.3;
    word-break: keep-all;
  }

  p {
    margin: 1px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.62rem;
    line-height: 1.3;
  }
`;

const BenefitCard = styled.section`
  padding: 10px 11px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, ${({ theme }) => theme.colors.border});
  border-radius: 17px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 7px 18px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
`;

const BenefitHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 950;
    letter-spacing: 0.09em;
  }

  h2 {
    margin: 2px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.83rem;
  }
`;

const BenefitTotal = styled.div`
  flex: 0 0 auto;
  text-align: right;

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.62rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.88rem;
    line-height: 1.2;
  }
`;

const BenefitSteps = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
  margin-top: 7px;
`;

const BenefitStep = styled(Link)`
  min-width: 0;
  padding: 6px 4px 5px;
  border: 1px solid
    ${({ $done, theme }) =>
      $done
        ? `color-mix(in srgb, ${theme.colors.success} 26%, ${theme.colors.border})`
        : theme.colors.border};
  border-radius: 11px;
  background: ${({ $done, theme }) =>
    $done ? theme.semantic.alertSuccessBg : theme.semantic.subtleTint};
  color: inherit;
  text-align: center;
  text-decoration: none;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 55%, transparent);
    outline-offset: 2px;
  }

  > span {
    display: grid;
    place-items: center;
    width: 21px;
    height: 21px;
    margin: 0 auto 4px;
    border-radius: 50%;
    background: ${({ $done, theme }) =>
      $done ? theme.colors.success : theme.semantic.badgeGoldBg};
    color: ${({ $done, theme }) =>
      $done ? theme.on.success : theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 950;
  }

  svg {
    width: 11px;
    height: 11px;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.62rem;
    line-height: 1.2;
    word-break: keep-all;
  }

  small {
    display: block;
    margin-top: 2px;
    color: ${({ $done, theme }) =>
      $done ? theme.colors.success : theme.colors.secondaryDark};
    font-size: 0.62rem;
    font-weight: 900;
  }
`;

const formatReservationSchedule = (visitDate, visitTime) => {
  const dateParts = String(visitDate || "").split("-").map(Number);
  const timeParts = String(visitTime || "").split(":").map(Number);
  if (dateParts.length !== 3 || timeParts.length < 2) return "";

  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  if (![year, month, day, hour, minute].every(Number.isFinite)) return "";

  const date = new Date(year, month - 1, day);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 || 12;
  return `${month}월 ${day}일 (${weekday}) · ${period} ${hour12}:${String(minute).padStart(2, "0")}`;
};

export default function AppHome() {
  const { user } = useAuthContext() || {};
  const [bonusStatus, setBonusStatus] = useState(null);
  const [upcomingReservation, setUpcomingReservation] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setUpcomingReservation(null);
      return undefined;
    }

    const groupsQuery = query(
      collection(db, "goldExchangeGroups"),
      where("ownerUid", "==", user.uid)
    );

    return onSnapshot(
      groupsQuery,
      (snapshot) => {
        const now = Date.now();
        const candidates = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => {
            const status = String(item.repStatus || item.status || "requested");
            const scheduleType = String(item.scheduleChangeType || "");
            if (["completed", "canceled", "rejected"].includes(status)) return false;
            if (scheduleType === "canceled") return false;
            if (!item.visitDate || !item.visitTime) return false;

            const scheduledMs = new Date(`${item.visitDate}T${item.visitTime}:00`).getTime();
            return Number.isFinite(scheduledMs) && scheduledMs >= now;
          })
          .sort(
            (a, b) =>
              new Date(`${a.visitDate}T${a.visitTime}:00`).getTime() -
              new Date(`${b.visitDate}T${b.visitTime}:00`).getTime()
          );

        setUpcomingReservation(candidates[0] || null);
      },
      () => setUpcomingReservation(null)
    );
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;

    if (!user?.uid) {
      setBonusStatus(null);
      return () => {
        cancelled = true;
      };
    }

    getMemberBonusStatus()
      .then((next) => {
        if (!cancelled) setBonusStatus(next || null);
      })
      .catch(() => {
        if (!cancelled) setBonusStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const rewards = bonusStatus?.rewards || {};
  const balanceG = Number(bonusStatus?.balanceG || 0);

  const rewardState = (reward) => {
    const claimed = !!reward?.claimed;
    const creditedG = Number(reward?.creditedG || 0);
    return {
      claimed,
      creditedG,
      receivedThisAccount: claimed && creditedG > 0,
      previouslyReceived: claimed && creditedG <= 0,
      eligible: !claimed,
    };
  };

  const welcomeReward = rewardState(rewards.welcome);
  const quizReward = rewardState(rewards.quiz);
  const marketingReward = rewardState(rewards.marketingPush);

  const benefits = useMemo(
    () => [
      {
        key: "welcome",
        to: user ? "/welcome" : "/register",
        title: "회원가입",
        text: "+0.01g",
        done: !!user && welcomeReward.receivedThisAccount,
        previous: !!user && welcomeReward.previouslyReceived,
        eligible: !user || welcomeReward.eligible,
      },
      {
        key: "quiz",
        to: "/quiz/gold-bonus",
        title: "퀵퀴즈",
        text: "+0.01g",
        done: !!user && quizReward.receivedThisAccount,
        previous: !!user && quizReward.previouslyReceived,
        eligible: !user || quizReward.eligible,
      },
      {
        key: "push",
        to: user ? "/settings" : "/register",
        title: "금시세 알림",
        text: "+0.01g",
        done: !!user && marketingReward.receivedThisAccount,
        previous: !!user && marketingReward.previouslyReceived,
        eligible: !user || marketingReward.eligible,
      },
    ],
    [
      marketingReward.eligible,
      marketingReward.previouslyReceived,
      marketingReward.receivedThisAccount,
      quizReward.eligible,
      quizReward.previouslyReceived,
      quizReward.receivedThisAccount,
      user,
      welcomeReward.eligible,
      welcomeReward.previouslyReceived,
      welcomeReward.receivedThisAccount,
    ]
  );

  return (
    <Page>
      <AppMyGoldDashboard />
      <AppGoldPriceSummary />

      {upcomingReservation && (
        <ReservationCard to="/my-exchanges" aria-label="다가오는 방문 예약 확인">
          <span><CalendarDays aria-hidden /></span>
          <ReservationCopy>
            <small>다가오는 방문 예약</small>
            <strong>
              {formatReservationSchedule(
                upcomingReservation.visitDate,
                upcomingReservation.visitTime
              )}
            </strong>
            <p>예약 날짜와 시간을 확인하세요.</p>
          </ReservationCopy>
          <ChevronRight aria-hidden />
        </ReservationCard>
      )}

      <GoldToGoldCard
        to="/gold-to-gold"
        aria-labelledby="app-home-gold-to-gold-title"
        aria-label="GOLD TO GOLD 알아보기"
      >
        <GoldToGoldCopy>
          <small>GOLD TO GOLD</small>
          <h2 id="app-home-gold-to-gold-title">
            내 금의 가치를 999.9 GOLD로 이어가는 방법
          </h2>
        </GoldToGoldCopy>
        <ChevronRight aria-hidden />
      </GoldToGoldCard>

      <QuickSection aria-label="빠른 메뉴">
        <QuickGrid>
          <QuickLink to="/gold-exchange?reserve=1">
            <span><CalendarDays aria-hidden /></span>
            <strong>방문예약</strong>
          </QuickLink>
          <QuickLink to="/my-exchanges">
            <span><ClipboardList aria-hidden /></span>
            <strong>교환내역</strong>
          </QuickLink>
          <QuickLink to="/goldbar-fee">
            <span><ReceiptText aria-hidden /></span>
            <strong>골드바 공임</strong>
          </QuickLink>
        </QuickGrid>
      </QuickSection>

      <BenefitCard aria-labelledby="benefit-title">
        <BenefitHead>
          <div>
            <small>MEMBER GOLD</small>
            <h2 id="benefit-title">순금 혜택</h2>
          </div>
          <BenefitTotal>
            <span>{user ? "사용 가능 적립 순금" : "최대 혜택"}</span>
            <strong>{user ? `${balanceG.toFixed(2)}g` : "0.03g"}</strong>
          </BenefitTotal>
        </BenefitHead>

        <BenefitSteps>
          {benefits.map(({ key, to, title, text, done, previous }, index) => (
            <BenefitStep
              key={key}
              to={to}
              $done={done}
              aria-label={`${title} 순금 0.01g 혜택 ${done ? "적립 완료" : previous ? "이전 지급" : "확인"}`}
            >
              <span>{done ? <Check aria-hidden /> : previous ? "✓" : index + 1}</span>
              <strong>{title}</strong>
              <small>{done ? "적립 완료" : previous ? "이전 지급" : text}</small>
            </BenefitStep>
          ))}
        </BenefitSteps>
      </BenefitCard>

    </Page>
  );
}
