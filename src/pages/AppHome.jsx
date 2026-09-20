import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import styled from "styled-components";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Info,
  Plus,
  ReceiptText,
} from "lucide-react";

import AppGoldPriceSummary from "@/components/gold/AppGoldPriceSummary";
import AppMyGoldDashboard from "@/components/gold/AppMyGoldDashboard";
import VerifiedReviewSection from "@/components/reviews/VerifiedReviewSection";
import { useAuthContext } from "@/context/AuthContext";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import { getGoldBarReadiness } from "@/utils/goldBarReadiness";
import { db } from "@/firebase/firebase";

const Page = styled.div`
  display: grid;
  gap: 14px;
  width: min(1160px, 100%);
  margin: 0 auto;
  padding: 8px 0 18px;
`;

const OverviewGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(290px, .75fr);
  gap: 14px;
  align-items: stretch;

  > * { min-width: 0; }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const PrincipleNote = styled.p`
  display: flex;
  align-items: center;
  gap: 7px;
  margin: -2px 2px 0;
  color: ${({ theme }) => theme.colors.textLight};
  font-size: .64rem;
  line-height: 1.5;
  word-break: keep-all;

  svg {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  strong { color: ${({ theme }) => theme.colors.textSecondary}; }
`;

const GoldToGoldCard = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  min-height: 86px;
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 20px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 58%, ${({ theme }) => theme.colors.surface}),
    ${({ theme }) => theme.colors.surface}
  );
  color: inherit;
  text-decoration: none;
  box-shadow: 0 9px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);

  > svg {
    width: 19px;
    height: 19px;
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const GoldToGoldCopy = styled.div`
  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .62rem;
    font-weight: 950;
    letter-spacing: .1em;
  }

  h2 {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: clamp(.92rem, 1.8vw, 1.12rem);
    font-weight: 850;
    line-height: 1.35;
    letter-spacing: -.025em;
    word-break: keep-all;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .65rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const ReservationCard = styled(Link)`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 66px;
  padding: 10px 13px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 20%, ${({ theme }) => theme.colors.border});
  border-radius: 16px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  > span:first-child {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.goldLight};
  }

  svg { width: 18px; height: 18px; }
`;

const ReservationCopy = styled.div`
  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .61rem;
    font-weight: 950;
  }
  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .77rem;
  }
  p {
    margin: 2px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .61rem;
  }
`;

const QuickGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const QuickLink = styled(Link)`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 62px;
  padding: 9px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 15px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  > span {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg { width: 16px; height: 16px; }
  strong { font-size: .66rem; line-height: 1.25; word-break: keep-all; }
`;

const toLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
  const { memberUser: user } = useAuthContext() || {};
  const myGoldDashboard = useGoldVaultDashboard(user?.uid);
  const [upcomingReservation, setUpcomingReservation] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setUpcomingReservation(null);
      return undefined;
    }

    const pickUpcoming = (snapshot) => {
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
    };

    const groupsQuery = query(
      collection(db, "goldExchangeGroups"),
      where("ownerUid", "==", user.uid),
      where("repStatus", "in", ["requested", "scheduled", "in_progress", "교환중"]),
      where("visitDate", ">=", toLocalDateKey()),
      orderBy("visitDate", "asc"),
      limit(10)
    );

    let fallbackUnsubscribe = null;
    let primaryUnsubscribe = null;
    primaryUnsubscribe = onSnapshot(
      groupsQuery,
      pickUpcoming,
      (error) => {
        console.warn("[AppHome] optimized reservation query failed:", error?.message || error);
        primaryUnsubscribe?.();
        primaryUnsubscribe = null;
        const fallbackQuery = query(
          collection(db, "goldExchangeGroups"),
          where("ownerUid", "==", user.uid)
        );
        fallbackUnsubscribe = onSnapshot(
          fallbackQuery,
          pickUpcoming,
          () => setUpcomingReservation(null)
        );
      }
    );

    return () => {
      primaryUnsubscribe?.();
      fallbackUnsubscribe?.();
    };
  }, [user?.uid]);

  const pureGoldG = Number(myGoldDashboard.summary.pureGoldG || 0);
  const hasMyGold = !!user?.uid && myGoldDashboard.summary.itemCount > 0;
  const myGoldLoading = !!user?.uid && myGoldDashboard.itemsLoading;
  const readiness = useMemo(() => getGoldBarReadiness(pureGoldG), [pureGoldG]);

  const goldToGoldHome = useMemo(() => {
    if (!user?.uid) {
      return {
        to: "/gold-to-gold",
        kicker: "GOLD TO GOLD",
        title: "기록으로 확인한 내 금을 실제 999.9 GOLD 교환으로 이어가기",
        description: "MY GOLD의 숫자는 참고값이고, 실제 교환은 매장에서 실물을 실측한 뒤 확정합니다.",
      };
    }
    if (myGoldLoading) {
      return {
        to: "/gold-to-gold",
        kicker: "GOLD TO GOLD · MY GOLD",
        title: "MY GOLD 기록을 확인하고 있습니다.",
        description: "기록한 금을 불러와 예상 교환량을 계산할 수 있습니다.",
      };
    }
    if (!hasMyGold) {
      return {
        to: "/my-gold/items?add=1",
        kicker: "GOLD TO GOLD · MY GOLD",
        title: "먼저 내가 가진 금을 기록해 보세요.",
        description: "종류와 중량을 기록하면 예상 순금량과 교환 가능한 골드바를 확인합니다.",
      };
    }
    if (readiness?.available) {
      return {
        to: "/gold-exchange?mode=vault&auto=1",
        kicker: "GOLD TO GOLD · 기록 기준 예상",
        title: `기록한 금 기준 · ${readiness.label} 교환 가능 예상`,
        description: "사용자가 기록한 종류·중량으로 계산한 예상치입니다. 실제 교환량은 매장 실측 후 확정합니다.",
      };
    }
    return {
      to: "/gold-exchange?mode=vault&auto=1",
      kicker: "GOLD TO GOLD · 기록 기준 예상",
      title: `기록한 금 기준 · ${readiness?.label || "1g 골드바"}까지 약 ${Number(readiness?.neededG || 0).toFixed(2)}g 더 필요`,
      description: "사용자가 기록한 종류·중량으로 계산한 예상치입니다. 실제 교환 순금량은 매장 실측 후 확정합니다.",
    };
  }, [hasMyGold, myGoldLoading, readiness, user?.uid]);

  return (
    <Page>
      {upcomingReservation && (
        <ReservationCard to="/my-exchanges" aria-label="다가오는 방문 예약 확인">
          <span><CalendarDays aria-hidden /></span>
          <ReservationCopy>
            <small>지금 가장 먼저 확인할 일정</small>
            <strong>{formatReservationSchedule(upcomingReservation.visitDate, upcomingReservation.visitTime)}</strong>
            <p>GOLD TO GOLD 방문 일정을 확인하세요.</p>
          </ReservationCopy>
          <ChevronRight aria-hidden />
        </ReservationCard>
      )}

      <OverviewGrid aria-label="내 금과 오늘 금시세">
        <AppMyGoldDashboard user={user} dashboard={myGoldDashboard} />
        <AppGoldPriceSummary
          market={myGoldDashboard.market}
          previousMarket={myGoldDashboard.previousMarket}
          enabled={myGoldDashboard.publicPriceEnabled}
          priceLoading={myGoldDashboard.marketLoading}
          configLoading={myGoldDashboard.publicPriceLoading}
        />
      </OverviewGrid>

      <PrincipleNote>
        <Info aria-hidden />
        <span><strong>MY GOLD는 개인 기록 공간입니다.</strong> 사용자가 가진 금의 정보를 기록해 보는 기능이며, 실물 금을 보관·예치하지 않습니다.</span>
      </PrincipleNote>

      <GoldToGoldCard to={goldToGoldHome.to} aria-label="GOLD TO GOLD로 이어가기">
        <GoldToGoldCopy>
          <small>{goldToGoldHome.kicker}</small>
          <h2>{goldToGoldHome.title}</h2>
          <p>{goldToGoldHome.description}</p>
        </GoldToGoldCopy>
        <ChevronRight aria-hidden />
      </GoldToGoldCard>

      <QuickGrid aria-label="빠른 메뉴">
        <QuickLink to="/my-gold/items?add=1">
          <span><Plus aria-hidden /></span>
          <strong>내 금 기록</strong>
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

      <VerifiedReviewSection compact showInquiryAction={false} />
    </Page>
  );
}
