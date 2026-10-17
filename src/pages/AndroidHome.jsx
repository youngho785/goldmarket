import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import styled from "styled-components";
import {
  CalendarDays,
  BookOpen,
  ChevronRight,
  ClipboardList,
} from "lucide-react";

import AppMyGoldDashboard from "@/components/gold/AppMyGoldDashboard";
import AppGoldJourney from "@/components/gold/AppGoldJourney";
import MemberGoldSummaryCard from "@/components/gold/MemberGoldSummaryCard";
import HomePriorityActions from "@/components/home/HomePriorityActions";
import HomeOptionalDetails from "@/components/home/HomeOptionalDetails";
import MyGoldAlertSummary from "@/components/gold/MyGoldAlertSummary";
import QuickGoldValueCalculator from "@/components/gold/QuickGoldValueCalculator";

import HomeWelcome from "@/components/home/HomeWelcome";
import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/firebase";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import useKoreaTodayDate from "@/hooks/useKoreaTodayDate";
import { getGoldPriceDatePresentation } from "@/lib/goldPriceDatePresentation";
import useMyGoldValueTrend from "@/hooks/useMyGoldValueTrend";
import { formatGoldWeightPair } from "@/lib/goldDisplay";
import { trackProductEventOncePerSession } from "@/analytics/productAnalytics";

// KGM_EXPERIENCE_FIRST_FINAL · direct guest calculator and gold exchange
const Page = styled.div`
display:grid; gap:19px; width:min(760px,100%); margin:0 auto;
  padding:14px 0 calc(28px + env(safe-area-inset-bottom,0px));
  @media (max-width:600px) { gap:16px; }
`;

const ReservationCard = styled(Link)`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 62px;
  padding: 11px 14px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 18px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

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

const ReservationCopy = styled.div`
  min-width: 0;
  small { display: block; color: ${({ theme }) => theme.colors.secondaryDark}; font-size: .78rem; font-weight: 900; }
  strong { display: block; margin-top: 3px; color: ${({ theme }) => theme.colors.primary}; font-size: .88rem; }
  p { margin: 3px 0 0; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .78rem; }
`;

const PriceCard = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 13px 15px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 15px;
  background: linear-gradient(115deg, ${({ theme }) => theme.colors.surface}, ${({ theme }) => theme.semantic.badgeGoldBg});
  color: inherit;
  text-decoration: none;
  border-left: 4px solid ${({ theme }) => theme.colors.gold};

  small { display: block; color: ${({ theme }) => theme.colors.secondaryDark}; font-size: .76rem; font-weight: 900; }
  strong { display: block; margin-top: 3px; color: ${({ theme }) => theme.colors.primary}; font-size: .88rem; }
  b { color: ${({ theme }) => theme.colors.primary}; font-family: ${({ theme }) => theme.fonts.numeric}; font-size: 1rem; white-space: nowrap; }
`;

const GoldToGoldStory = styled(Link)`
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 62px;
  padding: 11px 14px;
  border: 1px solid #325548;
  border-radius: 18px;
  background: linear-gradient(120deg,#213E32,#315949);
  color: #F8F5E9;
  text-decoration: none;

  > span:first-child { display: grid; place-items: center; width: 36px; height: 36px;
    border-radius: 12px; background: rgba(239,217,161,.16); color:#EED9A3; }
  svg { width: 18px; height: 18px; }
  small { display: block; color: #EED9A3; font-size: .76rem; font-weight: 900; }
  strong { display: block; margin-top: 3px; font-size: .9rem; line-height: 1.45; color:#FAF8F1; }
  p { margin: 3px 0 0; font-size: .8rem; color:#D3E0D6; }
`;

const MemberUtilities = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;

  > * { min-width: 0; }

  @media (max-width: 340px) {
    grid-template-columns: 1fr;
  }
`;

const QuickAction = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 62px;
  padding: 11px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-size: .84rem;
  font-weight: 900;
  word-break: keep-all;

  span {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.primary};
  }
  svg { width: 16px; height: 16px; }
`;


const FirstGoldOptions = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 7px 14px;
  /* A supporting route list, not another full-sized card beneath the calculator. */
  margin-top: -6px;
  padding: 6px 5px 8px;
  color: ${({ theme }) => theme.colors.textSecondary};

  p { margin: 0; font-size: .8rem; line-height: 1.5; word-break: keep-all; }
  a { color: ${({ theme }) => theme.colors.primary}; font-size: .81rem; font-weight: 900;
    text-underline-offset: 3px; text-decoration: underline; }
`;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "시세 공개 대기";
}

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

export default function AndroidHome() {
  const { memberUser: user } = useAuthContext() || {};
  const todayKey = useKoreaTodayDate();
  const dashboard = useGoldVaultDashboard(user?.uid);
  const [upcomingReservation, setUpcomingReservation] = useState(null);

  useEffect(() => {
    trackProductEventOncePerSession("app_home_view", {}, "app-home-view");
  }, []);

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
      () => {
        primaryUnsubscribe?.();
        primaryUnsubscribe = null;
        fallbackUnsubscribe = onSnapshot(
          query(collection(db, "goldExchangeGroups"), where("ownerUid", "==", user.uid)),
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

  const hasMyGold = !!user?.uid && Number(dashboard.summary.itemCount || 0) > 0;
  const myGoldReady =
    hasMyGold &&
    !dashboard.itemsLoading &&
    dashboard.ratesReady &&
    dashboard.publicPriceEnabled &&
    !dashboard.publicPriceLoading;

  const trend = useMyGoldValueTrend({
    pureGoldG: Number(dashboard.summary.pureGoldG || 0),
    currentPricePerDon: dashboard.customerSellPricePerDon,
    currentMarket: dashboard.market,
    enabled: myGoldReady,
    items: dashboard.items,
    rates: dashboard.rates,
    defaultPeriod: "7d",
  });

  const purePrice = Number(dashboard.market.pureGoldBuyPerDon || 0);
  return (
    <Page>
      <HomeWelcome name={user?.displayName} guest={!user?.uid} compact />
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

      {user?.uid && (dashboard.itemsLoading || hasMyGold) && (
        <AppMyGoldDashboard
          user={user}
          dashboard={dashboard}
          animateValue
          weeklyTrend={myGoldReady ? {
            loading: trend.loading,
            hasReference: !!trend.weeklyReference,
            direction: trend.weeklyChange.direction,
            amount: trend.weeklyChange.amount,
            percent: trend.weeklyChange.percent,
          } : null}
        />
      )}


      {hasMyGold && <HomePriorityActions />}

      {user?.uid && !dashboard.itemsLoading && !hasMyGold && (
        <QuickGoldValueCalculator
          source="app-first-gold"
          compact
          eyebrow="첫 금 기록"
          title="내 금의 가치부터 확인해 보세요"
          description="종류와 무게만 알려주세요."
        />
      )}

      {user?.uid && !dashboard.itemsLoading && !hasMyGold && (
        <FirstGoldOptions aria-label="첫 금 기록 다른 방법">
          <p>무게를 모르거나 바로 기록하고 싶으신가요?</p>
          <div>
            <Link to="/my-gold/items?add=1">직접 기록하기</Link>
            {' · '}
            <Link to="/gold-exchange?mode=visit">매장 실측 예약</Link>
          </div>
        </FirstGoldOptions>
      )}

      {!user?.uid && (
        <QuickGoldValueCalculator
          source="app-home"
          compact
          eyebrow=""
          title="내 금, 지금 얼마일까요?"
          description="14K·18K·순금을 선택하고 무게를 입력하세요."
        />
      )}

      <MemberGoldSummaryCard uid={user?.uid} compact />

      {user?.uid && (
        <MemberUtilities aria-label="예약과 내 금 알림">
          <QuickAction to="/my-exchanges">
            <span><ClipboardList aria-hidden /></span> 예약·교환 내역
          </QuickAction>
          <MyGoldAlertSummary uid={user?.uid} demoMode={!user?.uid} compact />
        </MemberUtilities>
      )}

      {!dashboard.publicPriceLoading && dashboard.publicPriceEnabled && purePrice > 0 && (
        <PriceCard to="/gold-price" aria-label="순금 시세 자세히 보기">
          <div>
            <small>{getGoldPriceDatePresentation(todayKey, dashboard.marketSourceDate, true).label}</small>
            <strong>순금 · 내가 팔 때 · 1돈(3.75g)</strong>
          </div>
          <b>{formatWon(purePrice)}</b>
        </PriceCard>
      )}

      {!hasMyGold && <GoldToGoldStory
        to="/gold-to-gold"
        aria-label="GOLD TO GOLD 소개 페이지 보기"
      >
        <span><BookOpen aria-hidden /></span>
        <div>
          <small>GOLD TO GOLD</small>
          <strong>내 금의 다음 가치를 알아보세요</strong>
          <p>내 금으로 어떤 골드바를 만들 수 있을까요?</p>
        </div>
        <ChevronRight aria-hidden />
      </GoldToGoldStory>}

      {hasMyGold && dashboard.ratesReady && (
        <HomeOptionalDetails summary={`기록한 금의 예상 순금 ${formatGoldWeightPair(Number(dashboard.summary.pureGoldG || 0))} · 골드바 목표 보기`}>
          <AppGoldJourney
            pureGoldG={Number(dashboard.summary.pureGoldG || 0)}
          vaultProducts={(dashboard.items || []).slice(0, 20).map((item) => ({
            productId: item.productId || "",
            goldType: item.goldType,
            quantity: Number(item.weightG || 0),
            inputUnit: "g",
            exchangeType: "999.9골드바",
            sourceItemId: item.id,
            sourceLabel: item.label || "금제품",
          }))}
          onExchangeClick={() => trackProductEventOncePerSession(
            "gold_to_gold_cta_clicked",
            { source: "app_home" },
            "app-home-gold-journey"
          )}
          />
        </HomeOptionalDetails>
      )}


    </Page>
  );
}
