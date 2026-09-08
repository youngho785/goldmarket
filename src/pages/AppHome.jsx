// src/pages/AppHome.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import styled from "styled-components";
import {
  ArrowRight,
  BellRing,
  Calculator,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Gem,
  ReceiptText,
  Scale,
  Sparkles,
  UserPlus,
} from "lucide-react";

import AppGoldPriceSummary from "@/components/gold/AppGoldPriceSummary";
import AppMyGoldDashboard from "@/components/gold/AppMyGoldDashboard";
import { useAuthContext } from "@/context/AuthContext";
import { getMemberBonusStatus } from "@/services/quizClient";
import { db } from "@/firebase/firebase";

const Page = styled.div`
  display: grid;
  gap: 10px;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 0 0 10px;
`;

const ExchangeCard = styled.section`
  position: relative;
  overflow: hidden;
  padding: 17px 16px 15px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.primary});
  border-radius: 22px;
  background:
    radial-gradient(
      circle at 92% 8%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 17%, transparent) 0,
      transparent 33%
    ),
    linear-gradient(135deg, #080b0e 0%, ${({ theme }) => theme.colors.primaryDark} 62%, #2c291f 100%);
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 12px 30px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);
`;

const ExchangeKicker = styled.div`
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.58rem;
  font-weight: 950;
  letter-spacing: 0.13em;
`;

const ExchangeTitle = styled.h2`
  margin: 7px 0 0;
  color: ${({ theme }) => theme.on.primary};
  font-size: clamp(1.12rem, 5.2vw, 1.48rem);
  line-height: 1.2;
  letter-spacing: -0.04em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.goldLight};
    font-style: normal;
  }
`;

const ExchangeFlow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 5px;
  margin-top: 13px;
  padding: 10px 9px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.on.primary} 10%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, ${({ theme }) => theme.on.primary} 5%, transparent);
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 66%, transparent);
  font-size: 0.56rem;
  font-weight: 850;
  text-align: center;

  b {
    color: ${({ theme }) => theme.colors.goldLight};
    font-weight: 950;
  }

  svg {
    width: 11px;
    height: 11px;
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const ExchangeCopy = styled.p`
  margin: 10px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 64%, transparent);
  font-size: 0.64rem;
  line-height: 1.5;
  word-break: keep-all;
`;

const ExchangeAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  margin-top: 12px;
  padding: 9px 11px 9px 13px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 34%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 10%, transparent);
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.73rem;
  font-weight: 950;
  text-decoration: none;

  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ExchangeLearnLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  margin-top: 3px;
  padding: 7px 2px 1px;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 58%, transparent);
  font-size: 0.59rem;
  font-weight: 800;
  text-decoration: none;

  svg {
    width: 13px;
    height: 13px;
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const QuickSection = styled.section`
  padding: 2px 1px 0;
`;

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
`;

const QuickLink = styled(Link)`
  display: flex;
  min-width: 0;
  min-height: 74px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 2px 7px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 15px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
  text-decoration: none;
  box-shadow: 0 6px 16px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

  &:active {
    transform: translateY(1px);
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  > span {
    display: grid;
    place-items: center;
    width: 35px;
    height: 35px;
    border-radius: 12px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg {
    width: 17px;
    height: 17px;
    stroke-width: 1.9;
  }

  strong {
    display: block;
    max-width: 100%;
    font-size: 0.61rem;
    line-height: 1.2;
    word-break: keep-all;
  }
`;

const ReservationCard = styled(Link)`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 70px;
  padding: 11px 13px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 20%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 55%, white) 0%,
      ${({ theme }) => theme.colors.surface} 66%
    );
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  > span:first-child {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 13px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.goldLight};
  }

  svg {
    width: 19px;
    height: 19px;
  }

  > svg:last-child {
    width: 16px;
    height: 16px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const ReservationCopy = styled.div`
  min-width: 0;

  small {
    display: block;
    margin-bottom: 2px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.56rem;
    font-weight: 950;
    letter-spacing: 0.08em;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.82rem;
    line-height: 1.3;
    word-break: keep-all;
  }

  p {
    margin: 2px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.61rem;
    line-height: 1.3;
  }
`;

const BenefitCard = styled.section`
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 34%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);
`;

const BenefitHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 15px 12px;
  background: ${({ theme }) => theme.gradients.primary};

  small {
    display: block;
    margin-bottom: 2px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.56rem;
    font-weight: 950;
    letter-spacing: 0.11em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.on.primary};
    font-size: 0.92rem;
  }
`;

const BenefitTotal = styled.div`
  flex: 0 0 auto;
  text-align: right;

  span {
    display: block;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 58%, transparent);
    font-size: 0.54rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.98rem;
    line-height: 1.2;
  }
`;

const BenefitBody = styled.div`
  padding: 12px 12px 11px;
`;

const BenefitIntro = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.62rem;
  line-height: 1.45;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const BenefitSteps = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-top: 10px;
`;

const BenefitComplete = styled.div`
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  margin-top: 10px;
  padding: 10px 11px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.success} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 13px;
  background: ${({ theme }) => theme.semantic.alertSuccessBg};

  > span {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.success};
    color: ${({ theme }) => theme.on.success};
  }

  svg {
    width: 17px;
    height: 17px;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.68rem;
    line-height: 1.25;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.57rem;
    line-height: 1.35;
    word-break: keep-all;
  }
`;

const BenefitHistory = styled(BenefitComplete)`
  border-color: ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.semantic.badgeGoldBg};

  > span {
    background: ${({ theme }) => theme.colors.secondary};
    color: ${({ theme }) => theme.on.secondary};
  }
`;

const BenefitStep = styled.div`
  min-width: 0;
  padding: 9px 6px 8px;
  border: 1px solid
    ${({ $done, theme }) =>
      $done
        ? `color-mix(in srgb, ${theme.colors.success} 28%, ${theme.colors.border})`
        : theme.colors.border};
  border-radius: 13px;
  background: ${({ $done, theme }) =>
    $done ? theme.semantic.alertSuccessBg : theme.semantic.subtleTint};
  text-align: center;

  > span {
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    margin: 0 auto 5px;
    border-radius: 50%;
    background: ${({ $done, theme }) =>
      $done ? theme.colors.success : theme.semantic.badgeGoldBg};
    color: ${({ $done, theme }) =>
      $done ? theme.on.success : theme.colors.secondaryDark};
    font-size: 0.58rem;
    font-weight: 950;
  }

  svg {
    width: 13px;
    height: 13px;
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.61rem;
    line-height: 1.25;
    word-break: keep-all;
  }

  small {
    display: block;
    margin-top: 3px;
    color: ${({ $done, theme }) =>
      $done ? theme.colors.success : theme.colors.secondaryDark};
    font-size: 0.53rem;
    font-weight: 900;
  }
`;

const BenefitAction = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 45px;
  margin-top: 10px;
  padding: 9px 11px 9px 13px;
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.68rem;
  font-weight: 950;
  text-decoration: none;

  span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  svg {
    width: 15px;
    height: 15px;
  }
`;

const Note = styled.p`
  margin: -1px 5px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.58rem;
  line-height: 1.45;
  text-align: center;
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
  const earnedG = Number(bonusStatus?.earnedG || 0);
  const balanceG = Number(bonusStatus?.balanceG || 0);
  const restoredBalanceG = Number(bonusStatus?.restoredBalanceG || 0);

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
        text: "순금 +0.01g",
        done: !!user && welcomeReward.receivedThisAccount,
        previous: !!user && welcomeReward.previouslyReceived,
        eligible: !user || welcomeReward.eligible,
        icon: UserPlus,
      },
      {
        key: "quiz",
        to: "/quiz/gold-bonus",
        title: "금 상식 퀵퀴즈",
        text: "순금 +0.01g",
        done: !!user && quizReward.receivedThisAccount,
        previous: !!user && quizReward.previouslyReceived,
        eligible: !user || quizReward.eligible,
        icon: Sparkles,
      },
      {
        key: "push",
        to: user ? "/settings" : "/register",
        title: "금시세 알림",
        text: "순금 +0.01g",
        done: !!user && marketingReward.receivedThisAccount,
        previous: !!user && marketingReward.previouslyReceived,
        eligible: !user || marketingReward.eligible,
        icon: BellRing,
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

  const nextBenefit = benefits.find((item) => item.eligible && !item.done && !item.previous) || null;
  const completedCount = benefits.filter((item) => item.done).length;
  const previousCount = benefits.filter((item) => item.previous).length;

  return (
    <Page>
      <AppMyGoldDashboard />
      <AppGoldPriceSummary />

      <ExchangeCard aria-labelledby="app-home-exchange-title">
        <ExchangeKicker>GOLD TO GOLD</ExchangeKicker>
        <ExchangeTitle id="app-home-exchange-title">
          팔았다 다시 사지 않고,<br />
          <em>순금 가치로 바로 이어갑니다.</em>
        </ExchangeTitle>
        <ExchangeFlow aria-hidden>
          <span>보유 금</span><ArrowRight /><span>예상 순금량</span><ArrowRight /><b>999.9 GOLD</b>
        </ExchangeFlow>
        <ExchangeCopy>
          금을 현금으로 팔고 골드바를 다시 사는 대신, 순도와 중량을 확인해 예상 순금량을 계산하고
          999.9 골드바로 이어가는 방식입니다.
        </ExchangeCopy>
        <ExchangeAction to="/gold-exchange">
          <span><Calculator aria-hidden /> 내 금 교환 결과 계산하기</span>
          <ChevronRight aria-hidden />
        </ExchangeAction>
        <ExchangeLearnLink to="/gold-to-gold">
          왜 이 방식인지 알아보기 <ChevronRight aria-hidden />
        </ExchangeLearnLink>
      </ExchangeCard>

      <QuickSection aria-label="빠른 메뉴">
        <QuickGrid>
          <QuickLink to="/gold-price">
            <span><Scale aria-hidden /></span>
            <strong>금시세</strong>
          </QuickLink>
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

      <BenefitCard aria-labelledby="benefit-title">
        <BenefitHead>
          <div>
            <small>MY GOLD BENEFIT</small>
            <h2 id="benefit-title">순금 혜택</h2>
          </div>
          <BenefitTotal>
            <span>
              {user
                ? "사용 가능 적립 순금"
                : "최대 혜택"}
            </span>
            <strong>{user ? `순금 ${balanceG.toFixed(2)}g` : "순금 0.03g"}</strong>
          </BenefitTotal>
        </BenefitHead>

        <BenefitBody>
          {completedCount === benefits.length ? (
            <BenefitComplete>
              <span><Check aria-hidden /></span>
              <div>
                <strong>현재 계정에서 3가지 순금 혜택을 모두 받았습니다.</strong>
                <small>적립 순금은 실물 금과 함께 금교환 가치에 더해집니다.</small>
              </div>
            </BenefitComplete>
          ) : previousCount === benefits.length && earnedG <= 0 ? (
            <BenefitHistory>
              <span><Gem aria-hidden /></span>
              <div>
                <strong>이 인증 이메일은 이전 가입에서 순금 혜택을 지급받았습니다.</strong>
                <small>
                  {restoredBalanceG > 0
                    ? `이전 계정의 미사용 적립 순금 ${restoredBalanceG.toFixed(2)}g은 현재 계정으로 복원되었습니다. 혜택 자체는 중복 지급되지 않습니다.`
                    : "각 혜택은 인증 이메일 기준 1회만 제공되어 재가입 시 중복 적립되지 않습니다."}
                </small>
              </div>
            </BenefitHistory>
          ) : (
            <>
              <BenefitIntro>
                회원가입·퀵퀴즈·금시세 알림으로 최대 <strong>순금 0.03g</strong>을 적립할 수 있습니다.
                이전 가입에서 받은 혜택은 같은 인증 이메일로 다시 지급되지 않습니다.
              </BenefitIntro>
              <BenefitSteps>
                {benefits.map(({ key, title, text, done, previous }, index) => (
                  <BenefitStep key={key} $done={done}>
                    <span>{done ? <Check aria-hidden /> : previous ? "✓" : index + 1}</span>
                    <strong>{title}</strong>
                    <small>{done ? "현재 적립" : previous ? "이전 지급" : text}</small>
                  </BenefitStep>
                ))}
              </BenefitSteps>
            </>
          )}

          {nextBenefit ? (
            <BenefitAction to={nextBenefit.to}>
              <span>
                {React.createElement(nextBenefit.icon, { "aria-hidden": true })}
                {nextBenefit.title}로 순금 0.01g 받기
              </span>
              <ChevronRight aria-hidden />
            </BenefitAction>
          ) : (
            <BenefitAction to="/profile">
              <span><Gem aria-hidden /> 순금 적립 내역 보기</span>
              <ChevronRight aria-hidden />
            </BenefitAction>
          )}
        </BenefitBody>
      </BenefitCard>

      <Note>예상 순금량과 교환 가능 규격은 참고값이며 최종 순도·중량·공임은 매장에서 확인합니다.</Note>
    </Page>
  );
}
