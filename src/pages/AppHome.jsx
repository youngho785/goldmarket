// src/pages/AppHome.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import styled from "styled-components";
import {
  BellRing,
  Calculator,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  ReceiptText,
  Scale,
  Sparkles,
  UserPlus,
} from "lucide-react";

import AppGoldPriceSummary from "@/components/gold/AppGoldPriceSummary";
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
  padding: 19px 17px 15px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 26%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background:
    radial-gradient(
      circle at 92% 4%,
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent) 0,
      transparent 31%
    ),
    linear-gradient(
      145deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 72%, white) 0%,
      ${({ theme }) => theme.colors.surface} 72%
    );

  &::after {
    content: "G";
    position: absolute;
    right: -9px;
    bottom: -35px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 8%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 8.8rem;
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }
`;

const ExchangeKicker = styled.div`
  position: relative;
  z-index: 1;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: 0.62rem;
  font-weight: 950;
  letter-spacing: 0.14em;
`;

const ExchangeTitle = styled.h1`
  position: relative;
  z-index: 1;
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.55rem, 6.4vw, 2.05rem);
  line-height: 1.14;
  letter-spacing: -0.048em;
  word-break: keep-all;

  em {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-style: normal;
  }
`;

const ExchangeCopy = styled.p`
  position: relative;
  z-index: 1;
  max-width: 430px;
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.71rem;
  line-height: 1.5;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 850;
  }
`;

const ExchangeAction = styled(Link)`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 51px;
  margin-top: 13px;
  padding: 10px 12px 10px 14px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 13%, transparent);
  border-radius: 14px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.86rem;
  font-weight: 900;
  text-decoration: none;
  box-shadow: 0 10px 24px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 16%, transparent);

  span {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ExchangeLearnLink = styled(Link)`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 36px;
  margin-top: 3px;
  padding: 7px 3px 2px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.67rem;
  font-weight: 800;
  text-decoration: none;

  svg {
    flex: 0 0 auto;
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const Section = styled.section`
  padding: 6px 2px 2px;
`;

const SectionHead = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding: 0 3px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.91rem;
    line-height: 1.3;
    letter-spacing: -0.025em;
  }

  small {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.56rem;
    font-weight: 950;
    letter-spacing: 0.08em;
  }
`;

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
`;

const QuickLink = styled(Link)`
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 79px;
  padding: 8px 2px 7px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
  text-decoration: none;
  box-shadow: 0 6px 16px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

  &:active {
    transform: translateY(1px);
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  > span {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 13px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg {
    width: 18px;
    height: 18px;
    stroke-width: 1.9;
  }

  strong {
    display: block;
    max-width: 100%;
    font-size: 0.65rem;
    line-height: 1.2;
    word-break: keep-all;
  }

  @media (max-width: 350px) {
    gap: 6px;
    min-height: 75px;

    > span {
      width: 35px;
      height: 35px;
      border-radius: 12px;
    }

    strong {
      font-size: 0.61rem;
    }
  }
`;

const BenefitCard = styled.section`
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 36%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);
`;

const BenefitHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 15px 13px;
  background: ${({ theme }) => theme.gradients.primary};

  small {
    display: block;
    margin-bottom: 2px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: 0.57rem;
    font-weight: 950;
    letter-spacing: 0.11em;
  }

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.on.primary};
    font-size: 0.94rem;
  }
`;

const BenefitTotal = styled.div`
  flex: 0 0 auto;
  text-align: right;

  span {
    display: block;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 60%, transparent);
    font-size: 0.56rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.goldLight};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 1.02rem;
    line-height: 1.2;
  }
`;

const BenefitList = styled.div`
  background: ${({ theme }) => theme.colors.surface};
`;

const BenefitLink = styled(Link)`
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  min-height: 60px;
  padding: 9px 12px;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  }
`;

const BenefitIcon = styled.span`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.secondaryDark};

  svg {
    width: 17px;
    height: 17px;
  }
`;

const BenefitCopy = styled.div`
  min-width: 0;

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.75rem;
    line-height: 1.25;
  }

  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.6rem;
    line-height: 1.3;
    word-break: keep-all;
  }
`;

const BenefitStatus = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 27px;
  padding: 5px 7px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, ${({ theme }) => theme.colors.border});
  border-radius: 999px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.58rem;
  font-weight: 900;
  white-space: nowrap;
`;

const BenefitHistoryLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 10px 13px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.69rem;
  font-weight: 850;
  text-decoration: none;

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 750;
  }

  strong {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  svg {
    width: 15px;
    height: 15px;
    color: ${({ theme }) => theme.colors.secondaryDark};
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

const Note = styled.p`
  margin: -1px 5px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: 0.6rem;
  line-height: 1.45;
  text-align: center;
`;

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
          .sort((a, b) =>
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
  const welcomeClaimed = !!rewards.welcome?.claimed;
  const quizClaimed = !!rewards.quiz?.claimed;
  const marketingClaimed = !!rewards.marketingPush?.claimed;

  const benefits = [
    {
      key: "welcome",
      to: user ? "/welcome" : "/register",
      title: "회원가입",
      text: "회원가입하고 순금 0.01g 받기",
      done: welcomeClaimed,
      icon: UserPlus,
    },
    {
      key: "quiz",
      to: "/quiz/gold-bonus",
      title: "금 상식 퀵퀴즈",
      text: "퀵퀴즈 풀고 순금 0.01g 더 받기",
      done: quizClaimed,
      icon: Sparkles,
    },
    {
      key: "push",
      to: user ? "/settings" : "/register",
      title: "금시세 알림",
      text: "금시세 알림 받고 순금 0.01g 더 받기",
      done: marketingClaimed,
      icon: BellRing,
    },
  ];

  const visibleBenefits = user ? benefits.filter((item) => !item.done) : benefits;
  const allBenefitsCompleted = !!user && visibleBenefits.length === 0;

  return (
    <Page>
      <AppGoldPriceSummary />

      <ExchangeCard aria-labelledby="app-home-title">
        <ExchangeKicker>GOLD TO GOLD</ExchangeKicker>
        <ExchangeTitle id="app-home-title">
          가지고 있는 금을
          <br />
          <em>999.9 골드바로</em>
        </ExchangeTitle>
        <ExchangeCopy>
          14K·18K·순금 등을 현금으로 팔았다 다시 사지 않고,
          <strong> 순금 가치로 이어가는 한국골드마켓의 금교환 방식</strong>입니다.
        </ExchangeCopy>

        <ExchangeAction to="/gold-exchange">
          <span>
            <Calculator aria-hidden />
            골드 투 골드 하러가기
          </span>
          <ChevronRight aria-hidden />
        </ExchangeAction>

        <ExchangeLearnLink to="/gold-to-gold">
          GOLD TO GOLD가 무엇인가요?
          <ChevronRight aria-hidden />
        </ExchangeLearnLink>
      </ExchangeCard>

      <Section aria-labelledby="quick-title">
        <SectionHead>
          <h2 id="quick-title">바로가기</h2>
          <small>QUICK ACTIONS</small>
        </SectionHead>
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
            <strong>예약확인</strong>
          </QuickLink>
          <QuickLink to="/goldbar-fee">
            <span><ReceiptText aria-hidden /></span>
            <strong>골드바 공임</strong>
          </QuickLink>
        </QuickGrid>
      </Section>

      {upcomingReservation && (
        <ReservationCard to="/my-exchanges" aria-label="다가오는 방문 예약 확인">
          <span>
            <CalendarDays aria-hidden />
          </span>
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
            <span>{user ? "현재 적립" : "받을 수 있는 혜택"}</span>
            <strong>{user ? `순금 ${earnedG.toFixed(2)}g` : "최대 순금 0.03g"}</strong>
          </BenefitTotal>
        </BenefitHead>

        {visibleBenefits.length > 0 && (
          <BenefitList>
            {visibleBenefits.map(({ key, to, title, text, icon: Icon }) => (
              <BenefitLink key={key} to={to}>
                <BenefitIcon>
                  <Icon aria-hidden />
                </BenefitIcon>
                <BenefitCopy>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </BenefitCopy>
                <BenefitStatus>순금 0.01g</BenefitStatus>
              </BenefitLink>
            ))}
          </BenefitList>
        )}

        {allBenefitsCompleted && (
          <BenefitHistoryLink to="/profile">
            <span>순금 적립 내역</span>
            <strong>
              보기 <ChevronRight aria-hidden />
            </strong>
          </BenefitHistoryLink>
        )}
      </BenefitCard>

      <Note>실제 교환 중량과 비용은 매장 실측 후 최종 확인합니다.</Note>
    </Page>
  );
}
