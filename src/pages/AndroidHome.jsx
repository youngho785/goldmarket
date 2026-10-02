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
  BellRing,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Plus,
  Scale,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import AppMyGoldDashboard from "@/components/gold/AppMyGoldDashboard";
import AppGoldJourney from "@/components/gold/AppGoldJourney";
import MyGoldAlertSummary from "@/components/gold/MyGoldAlertSummary";
import QuickGoldValueCalculator from "@/components/gold/QuickGoldValueCalculator";
import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/firebase";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import useMyGoldValueTrend from "@/hooks/useMyGoldValueTrend";
import { trackProductEventOncePerSession } from "@/analytics/productAnalytics";

const Page = styled.div`
  display: grid;
  gap: 12px;
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 8px 0 24px;
`;

const ReservationCard = styled(Link)`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 68px;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, ${({ theme }) => theme.colors.border});
  border-radius: 17px;
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
  small { display: block; color: ${({ theme }) => theme.colors.secondaryDark}; font-size: .68rem; font-weight: 950; }
  strong { display: block; margin-top: 3px; color: ${({ theme }) => theme.colors.primary}; font-size: .86rem; }
  p { margin: 3px 0 0; color: ${({ theme }) => theme.colors.textSecondary}; font-size: .68rem; }
`;

const SectionCard = styled.section`
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 22px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);
`;

const SectionHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: .64rem;
    font-weight: 950;
    letter-spacing: .07em;
  }

  h2 {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1rem;
    letter-spacing: -.03em;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .68rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const TrendValue = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  span { color: ${({ theme }) => theme.colors.textSecondary}; font-size: .68rem; font-weight: 850; }
  strong {
    display: flex;
    align-items: center;
    gap: 5px;
    color: ${({ $direction, theme }) =>
      $direction === "up" ? theme.semantic.alertErrorText :
      $direction === "down" ? theme.colors.info : theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .88rem;
    font-weight: 950;
  }
  svg { width: 15px; height: 15px; }
`;

const PriceCard = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 13px 15px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface};
  color: inherit;
  text-decoration: none;

  small { display: block; color: ${({ theme }) => theme.colors.secondaryDark}; font-size: .62rem; font-weight: 950; }
  strong { display: block; margin-top: 3px; color: ${({ theme }) => theme.colors.primary}; font-size: .82rem; }
  b { color: ${({ theme }) => theme.colors.primary}; font-family: ${({ theme }) => theme.fonts.numeric}; font-size: .92rem; }
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
`;

const QuickAction = styled(Link)`
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 54px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-size: .72rem;
  font-weight: 900;

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

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "시세 공개 대기";
}

function formatSignedWon(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "0원";
  return `${number > 0 ? "+" : "-"}${Math.abs(Math.round(number)).toLocaleString("ko-KR")}원`;
}

function formatSignedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return `${number > 0 ? "+" : number < 0 ? "-" : ""}${Math.abs(number).toFixed(2)}%`;
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
  const TrendIcon = trend.weeklyChange.direction === "up" ? TrendingUp : TrendingDown;

  return (
    <Page>
      <AppMyGoldDashboard user={user} dashboard={dashboard} animateValue />

      {upcomingReservation && (
        <ReservationCard to="/my-exchanges" aria-label="다가오는 방문 예약 확인">
          <span><CalendarDays aria-hidden /></span>
          <ReservationCopy>
            <small>다가오는 부산 방문 일정</small>
            <strong>{formatReservationSchedule(upcomingReservation.visitDate, upcomingReservation.visitTime)}</strong>
            <p>GOLD TO GOLD 예약 내용을 확인하세요.</p>
          </ReservationCopy>
          <ChevronRight aria-hidden />
        </ReservationCard>
      )}

      {!user?.uid && (
        <QuickGoldValueCalculator
          source="app-home"
          compact
          eyebrow="MY GOLD · 첫 기록"
          title="내 금부터 계산해 보세요"
          description="금 종류와 중량을 입력하면 오늘 참고가치를 확인하고 바로 MY GOLD에 기록할 수 있습니다."
        />
      )}

      {hasMyGold && (
        <AppGoldJourney
          pureGoldG={Number(dashboard.summary.pureGoldG || 0)}
          onExchangeClick={() => trackProductEventOncePerSession(
            "gold_to_gold_cta_clicked",
            { source: "app_home_journey" },
            "app-home-gold-journey"
          )}
        />
      )}

      {myGoldReady && (
        <SectionCard aria-labelledby="app-weekly-title">
          <SectionHead>
            <div>
              <small>MY GOLD · 7 DAYS</small>
              <h2 id="app-weekly-title">최근 7일 가치 변화</h2>
              <p>앱을 열 때 가장 필요한 변화만 빠르게 확인합니다.</p>
            </div>
            <Link to="/my-gold/trend" aria-label="가치 변화 자세히 보기"><ChevronRight size={18} /></Link>
          </SectionHead>
          <TrendValue $direction={trend.weeklyChange.direction}>
            <span>{trend.weeklyReference ? "7일 전 대비" : "비교 기준 준비 중"}</span>
            <strong>
              {trend.weeklyReference && <TrendIcon aria-hidden />}
              {trend.weeklyReference
                ? `${formatSignedWon(trend.weeklyChange.amount)} · ${formatSignedPercent(trend.weeklyChange.percent)}`
                : trend.loading ? "불러오는 중" : "데이터 준비 중"}
            </strong>
          </TrendValue>
        </SectionCard>
      )}

      <MyGoldAlertSummary uid={user?.uid} demoMode={!user?.uid} compact />

      {!dashboard.publicPriceLoading && dashboard.publicPriceEnabled && purePrice > 0 && (
        <PriceCard to="/gold-price" aria-label="오늘 순금 시세 보기">
          <div>
            <small>TODAY&apos;S GOLD</small>
            <strong>오늘 순금 · 내가 팔 때 · 1돈(3.75g)</strong>
          </div>
          <b>{formatWon(purePrice)}</b>
        </PriceCard>
      )}

      {user?.uid && (
        <QuickActions aria-label="빠른 행동">
          <QuickAction to="/my-gold/items?add=1">
            <span><Plus aria-hidden /></span> 금 추가
          </QuickAction>
          <QuickAction to="/my-exchanges">
            <span><ClipboardList aria-hidden /></span> 예약·교환 내역
          </QuickAction>
          <QuickAction to="/my-gold/alerts">
            <span><BellRing aria-hidden /></span> 내 금 알림
          </QuickAction>
          <QuickAction to="/gold-price">
            <span><Scale aria-hidden /></span> 금시세
          </QuickAction>
        </QuickActions>
      )}
    </Page>
  );
}
