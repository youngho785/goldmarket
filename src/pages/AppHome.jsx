import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import styled from "styled-components";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  ReceiptText,
} from "lucide-react";

import AppGoldPriceSummary from "@/components/gold/AppGoldPriceSummary";
import AppMyGoldDashboard from "@/components/gold/AppMyGoldDashboard";
import { useAuthContext } from "@/context/AuthContext";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import AppGoldJourney from "@/components/gold/AppGoldJourney";
import MemberGoldSummaryCard from "@/components/gold/MemberGoldSummaryCard";
import HomePriorityActions from "@/components/home/HomePriorityActions";
import HomeOptionalDetails from "@/components/home/HomeOptionalDetails";
import HomeWelcome from "@/components/home/HomeWelcome";
import { db } from "@/firebase/firebase";

// KGM_EXPERIENCE_FIRST_FINAL · member-first MY GOLD summary
const Page = styled.div`
display:grid; gap:25px; width:min(1200px,100%); margin:0 auto; padding:26px 0 48px;
`;

const OverviewGrid = styled.section`
display:grid; grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr); gap:20px; align-items:stretch;
      > * { min-width:0; } @media(max-width:900px) { grid-template-columns:1fr; gap:18px; }
`;

const ReservationCard = styled(Link)`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 66px;
  padding: 10px 13px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 20%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
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
    font-size: .78rem;
    font-weight: 950;
  }
  strong {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .92rem;
  }
  p {
    margin: 2px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .78rem;
  }
`;



const QuickGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const QuickLink = styled(Link)`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  min-height: 74px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 15px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 5px 18px rgba(28,46,35,.04);
  transition: transform .18s ease, border-color .18s ease;
  &:hover { transform: translateY(-2px); border-color: ${({ theme }) => theme.colors.secondary}; }
  &:focus-visible {outline:3px solid ${({ theme }) => theme.colors.secondary};outline-offset:3px; }
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
  strong { font-size: .86rem; line-height: 1.25; word-break: keep-all; }
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
  const vaultProducts = useMemo(
    () =>
      (myGoldDashboard.items || []).slice(0, 20).map((item) => ({
        productId: item.productId || "",
        goldType: item.goldType,
        quantity: Number(item.weightG || 0),
        inputUnit: "g",
        exchangeType: "999.9골드바",
        sourceItemId: item.id,
        sourceLabel: item.label || "금제품",
      })),
    [myGoldDashboard.items]
  );

  return (
    <Page>
      <HomeWelcome name={user?.displayName} />
      {upcomingReservation && (
        <ReservationCard to="/my-exchanges" aria-label="다가오는 방문 예약 확인">
          <span><CalendarDays aria-hidden /></span>
          <ReservationCopy>
            <small>다가오는 방문 일정</small>
            <strong>{formatReservationSchedule(upcomingReservation.visitDate, upcomingReservation.visitTime)}</strong>
            <p>방문 예약 내용을 확인하세요.</p>
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


      {hasMyGold && <HomePriorityActions />}

      <MemberGoldSummaryCard uid={user?.uid} />

      {hasMyGold && !myGoldDashboard.itemsLoading && myGoldDashboard.ratesReady && (
        <HomeOptionalDetails>
          <AppGoldJourney
            pureGoldG={pureGoldG}
            vaultProducts={vaultProducts}
          />
        </HomeOptionalDetails>
      )}

      <QuickGrid aria-label="예약과 부가 메뉴">
        <QuickLink to="/gold-exchange?reserve=1">
          <span><CalendarDays aria-hidden /></span>
          <strong>방문 예약</strong>
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

    </Page>
  );
}
