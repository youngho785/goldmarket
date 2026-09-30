import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Haptics } from "@capacitor/haptics";
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
  ChevronRight,
  ClipboardList,
  Plus,
  Sparkles,
} from "lucide-react";

import AppMyGoldDashboard from "@/components/gold/AppMyGoldDashboard";
import MyGoldAlertSummary from "@/components/gold/MyGoldAlertSummary";
import { useAuthContext } from "@/context/AuthContext";
import { db } from "@/firebase/firebase";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import useMyGoldValueTrend from "@/hooks/useMyGoldValueTrend";
import {
  GOLD_BAR_DENOMS,
  getGoldBarReadiness,
} from "@/utils/goldBarReadiness";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(760px, 100%);
  margin: 0 auto;
  padding: 8px 0 18px;

  > * {
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
    margin: 0;
  }
`;

const RevealBlock = styled.div`
  display: block;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;

  > * {
    width: 100%;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
`;

const ReservationCard = styled(Link)`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 68px;
  padding: 11px 13px;
  border: 1px solid
    color-mix(
      in srgb,
      ${({ theme }) => theme.colors.gold} 24%,
      ${({ theme }) => theme.colors.border}
    );
  border-radius: 17px;
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  transition:
    transform 120ms ease,
    box-shadow 160ms ease;

  &:active {
    transform: scale(0.985);
  }

  > span:first-child {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.goldLight};
  }

  svg {
    width: 18px;
    height: 18px;
  }

  > svg:last-child {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }
`;

const ReservationCopy = styled.div`
  min-width: 0;

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.7rem;
    font-weight: 950;
  }

  strong {
    display: block;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.8rem;
    line-height: 1.35;
  }

  p {
    margin: 2px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.72rem;
    line-height: 1.4;
  }
`;

const SectionCard = styled.section`
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 22px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);
`;

const SectionHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  div {
    min-width: 0;
  }

  small {
    display: block;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.7rem;
    font-weight: 950;
    letter-spacing: 0.09em;
  }

  h2 {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.94rem;
    font-weight: 950;
    letter-spacing: -0.025em;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.72rem;
    line-height: 1.45;
    word-break: keep-all;
  }

  a {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 2px;
    min-height: 30px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.72rem;
    font-weight: 900;
    text-decoration: none;
  }

  a svg {
    width: 14px;
    height: 14px;
  }
`;

const ChangeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
`;

const ChangeMetric = styled.div`
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.7rem;
    font-weight: 800;
  }

  strong {
    display: block;
    margin-top: 4px;
    color: ${({ $direction, theme }) =>
      $direction === "up"
        ? theme.semantic.alertErrorText
        : $direction === "down"
          ? theme.colors.info
          : theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.9rem;
    font-weight: 950;
    letter-spacing: -0.025em;
  }

  small {
    display: block;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.textLight};
    font-size: 0.74rem;
    line-height: 1.35;
  }
`;

const GoldGoalCard = styled(Link)`
  display: grid;
  gap: 12px;
  padding: 15px;
  border: 1px solid
    color-mix(
      in srgb,
      ${({ theme }) => theme.colors.gold} 27%,
      ${({ theme }) => theme.colors.border}
    );
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    color-mix(
      in srgb,
      ${({ theme }) => theme.semantic.badgeGoldBg} 64%,
      ${({ theme }) => theme.colors.surface}
    ),
    ${({ theme }) => theme.colors.surface}
  );
  color: inherit;
  text-decoration: none;
  box-shadow: 0 8px 22px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent);
  transition:
    transform 120ms ease,
    box-shadow 160ms ease;

  &:active {
    transform: scale(0.985);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const GoalTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  small {
    display: flex;
    align-items: center;
    gap: 5px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.7rem;
    font-weight: 950;
    letter-spacing: 0.07em;
  }

  small svg,
  > svg {
    width: 16px;
    height: 16px;
  }

  > svg {
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  h2 {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.98rem;
    font-weight: 950;
    letter-spacing: -0.025em;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.72rem;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const JourneySteps = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const JourneyStep = styled.li`
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 6px;
  align-items: center;
  min-width: 0;
  padding: 7px 8px;
  border: 1px solid
    ${({ $state, theme }) =>
      $state === "active"
        ? `color-mix(in srgb, ${theme.colors.gold} 52%, ${theme.colors.border})`
        : theme.colors.dividerSubtle};
  border-radius: 11px;
  background: ${({ $state, theme }) =>
    $state === "active"
      ? `color-mix(in srgb, ${theme.semantic.badgeGoldBg} 74%, ${theme.colors.surface})`
      : theme.colors.surface};
  color: ${({ $state, theme }) =>
    $state === "done" || $state === "active"
      ? theme.colors.primary
      : theme.colors.textSecondary};

  > span:first-child {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    background: ${({ $state, theme }) =>
      $state === "done"
        ? theme.colors.primary
        : $state === "active"
          ? theme.colors.gold
          : theme.colors.surfaceAlt};
    color: ${({ $state, theme }) =>
      $state === "done" ? theme.colors.goldLight : theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.66rem;
    font-weight: 950;
  }

  strong {
    min-width: 0;
    overflow: hidden;
    font-size: 0.68rem;
    font-weight: 900;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 390px) {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 4px;
    padding: 7px 4px;
    text-align: center;

    strong {
      font-size: 0.64rem;
    }
  }
`;

const MilestoneBlock = styled.div`
  display: grid;
  gap: 8px;
  padding: 11px 10px 10px;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 14px;
  background: color-mix(
    in srgb,
    ${({ theme }) => theme.colors.surface} 78%,
    ${({ theme }) => theme.semantic.badgeGoldBg}
  );
`;

const MilestoneHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.74rem;
    font-weight: 950;
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.68rem;
    font-weight: 800;
  }
`;

const MilestoneLadder = styled.ol`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
`;

const MilestoneItem = styled.li`
  position: relative;
  display: grid;
  justify-items: center;
  gap: 5px;
  min-width: 0;
  text-align: center;

  &::before {
    content: "";
    position: absolute;
    z-index: 0;
    top: 8px;
    right: 50%;
    width: 100%;
    height: 2px;
    background: ${({ $state, theme }) =>
      $state === "reached"
        ? `color-mix(in srgb, ${theme.colors.gold} 72%, ${theme.colors.border})`
        : theme.colors.dividerSubtle};
  }

  &:first-child::before {
    display: none;
  }

  > i {
    position: relative;
    z-index: 1;
    display: block;
    width: 18px;
    height: 18px;
    border: 3px solid
      ${({ $state, theme }) =>
        $state === "target"
          ? theme.colors.gold
          : $state === "reached"
            ? theme.colors.primary
            : theme.colors.borderStrong};
    border-radius: 999px;
    background: ${({ $state, theme }) =>
      $state === "reached"
        ? theme.colors.primary
        : $state === "target"
          ? theme.colors.goldLight
          : theme.colors.surface};
    box-shadow: ${({ $state, theme }) =>
      $state === "target"
        ? `0 0 0 4px color-mix(in srgb, ${theme.colors.gold} 16%, transparent)`
        : "none"};
  }

  strong {
    max-width: 100%;
    overflow: hidden;
    color: ${({ $state, theme }) =>
      $state === "target" || $state === "reached"
        ? theme.colors.primary
        : theme.colors.textSecondary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.66rem;
    font-weight: ${({ $state }) => ($state === "target" ? 950 : 850)};
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ProgressLabels = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.7rem;
  font-weight: 800;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 0.72rem;
    font-weight: 950;
  }
`;

const ProgressTrack = styled.div`
  position: relative;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  span {
    position: absolute;
    inset: 0 auto 0 0;
    width: ${({ $progress }) => `${Math.max(0, Math.min(100, $progress))}%`};
    overflow: hidden;
    border-radius: inherit;
    background: color-mix(
      in srgb,
      ${({ theme }) => theme.colors.gold} 34%,
      ${({ theme }) => theme.colors.surfaceAlt}
    );

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(
        90deg,
        ${({ theme }) => theme.colors.secondaryDark},
        ${({ theme }) => theme.colors.gold}
      );
      transform-origin: left center;
      transform: scaleX(${({ $active }) => ($active ? 1 : 0)});
      box-shadow: 0 0 10px
        color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, transparent);
      transition: transform 1050ms cubic-bezier(0.16, 1, 0.3, 1) 90ms;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    span::after {
      transform: scaleX(1);
      transition: none;
    }
  }
`;

const GoalBadge = styled.div`
  width: fit-content;
  padding: 5px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: 0.7rem;
  font-weight: 900;
`;

const PriceCard = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 74px;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 17px;
  background: ${({ theme }) => theme.colors.surface};
  color: inherit;
  text-decoration: none;
  transition:
    transform 120ms ease,
    box-shadow 160ms ease;

  &:active {
    transform: scale(0.985);
  }

  small {
    display: flex;
    align-items: center;
    gap: 6px;
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-size: 0.74rem;
    font-weight: 950;
    letter-spacing: 0.08em;

    &::before {
      content: "";
      width: 6px;
      height: 6px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: ${({ theme }) => theme.colors.gold};
      box-shadow: 0 0 0 3px
        color-mix(in srgb, ${({ theme }) => theme.colors.gold} 14%, transparent);
      opacity: ${({ $live }) => ($live ? 1 : 0.25)};
      transform: scale(${({ $live }) => ($live ? 1 : 0.65)});
      transition:
        opacity 360ms ease,
        transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    small::before {
      opacity: 1;
      transform: scale(1);
      transition: none;
    }
  }

  h2 {
    margin: 3px 0 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.82rem;
    font-weight: 900;
  }

  p {
    margin: 4px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.7rem;
    line-height: 1.4;
  }

  > div:last-child {
    text-align: right;
  }
`;

const PriceValue = styled.strong`
  display: block;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: 0.92rem;
  font-weight: 950;
  white-space: nowrap;
`;

const PriceChange = styled.span`
  display: block;
  margin-top: 3px;
  color: ${({ $direction, theme }) =>
    $direction === "up"
      ? theme.semantic.alertErrorText
      : $direction === "down"
        ? theme.colors.info
        : theme.colors.textSecondary};
  font-size: 0.7rem;
  font-weight: 900;
  white-space: nowrap;
`;

const QuickGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const QuickLink = styled(Link)`
  display: grid;
  justify-items: center;
  gap: 6px;
  min-width: 0;
  min-height: 76px;
  padding: 10px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 15px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  text-align: center;
  text-decoration: none;
  transition:
    transform 120ms ease,
    border-color 160ms ease;

  &:active {
    transform: scale(0.975);
  }

  span {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 11px;
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.secondaryDark};
  }

  svg {
    width: 17px;
    height: 17px;
  }

  strong {
    font-size: 0.72rem;
    font-weight: 900;
    line-height: 1.3;
    word-break: keep-all;
  }
`;


const GuestCard = styled.section`
  display: grid;
  gap: 11px;
  padding: 15px;
  border: 1px solid
    color-mix(
      in srgb,
      ${({ theme }) => theme.colors.gold} 20%,
      ${({ theme }) => theme.colors.border}
    );
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.92rem;
    font-weight: 950;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.72rem;
    line-height: 1.55;
    word-break: keep-all;
  }
`;

const GuestBenefits = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;

  span {
    padding: 8px 9px;
    border-radius: 11px;
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.72rem;
    font-weight: 850;
  }
`;

const GuestActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 42px;
    padding: 8px 10px;
    border: 1px solid ${({ theme }) => theme.colors.primary};
    border-radius: 11px;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.74rem;
    font-weight: 900;
    text-decoration: none;
  }

  a:last-child {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.on.primary};
  }

  svg {
    width: 15px;
    height: 15px;
  }
`;

function useInViewOnce(threshold = 0.28) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ) {
      setVisible(true);
      return undefined;
    }

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      {
        threshold,
        rootMargin: "0px 0px 24px 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}

function playHomeTapHaptic(event) {
  const target =
    event?.target instanceof Element
      ? event.target.closest('a, button, [role="button"]')
      : null;

  if (!target || target.matches(':disabled, [aria-disabled="true"]')) return;

  Haptics.selectionChanged().catch(() => {});
}

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "-";
}

function formatSignedWon(value) {
  const number = Math.round(Number(value) || 0);
  if (number === 0) return "0원";
  return `${number > 0 ? "+" : "-"}${Math.abs(number).toLocaleString("ko-KR")}원`;
}

function formatSignedPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "비교 준비";
  if (number === 0) return "0.00%";
  return `${number > 0 ? "+" : "-"}${Math.abs(number).toFixed(2)}%`;
}

function formatGoldGrams(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  if (Number.isInteger(number)) return `${number}g`;
  return `${number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}g`;
}

function formatMilestoneLabel(item) {
  const label = String(item?.label || "");
  const donMatch = label.match(/(\d+돈)/);
  return donMatch?.[1] || formatGoldGrams(item?.grams);
}

function buildGoldMilestones(currentGrams) {
  const current = Math.max(0, Number(currentGrams) || 0);
  const ascending = [...GOLD_BAR_DENOMS].sort((a, b) => a.grams - b.grams);
  const nextIndex = ascending.findIndex((item) => item.grams > current + 1e-9);
  const focusIndex = nextIndex >= 0 ? nextIndex : ascending.length - 1;
  const windowSize = 5;
  let start = Math.max(0, focusIndex - 2);
  let end = Math.min(ascending.length, start + windowSize);
  start = Math.max(0, end - windowSize);

  return ascending.slice(start, end).map((item, index) => {
    const reached = current + 1e-9 >= item.grams;
    const absoluteIndex = start + index;
    const target = !reached && absoluteIndex === nextIndex;
    return {
      ...item,
      labelShort: formatMilestoneLabel(item),
      state: reached ? "reached" : target ? "target" : "future",
    };
  });
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
        console.warn(
          "[AndroidHome] optimized reservation query failed:",
          error?.message || error
        );
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

  const pureGoldG = Number(dashboard.summary.pureGoldG || 0);
  const hasMyGold = !!user?.uid && dashboard.summary.itemCount > 0;
  const myGoldReady =
    hasMyGold &&
    !dashboard.itemsLoading &&
    dashboard.publicPriceEnabled &&
    !dashboard.publicPriceLoading;

  
  const trend = useMyGoldValueTrend({
    pureGoldG,
    currentPricePerDon: dashboard.customerSellPricePerDon,
    currentMarket: dashboard.market,
    enabled: myGoldReady,
    items: dashboard.items,
    rates: dashboard.rates,
    defaultPeriod: "7d",
  });

  const readiness = useMemo(
    () => getGoldBarReadiness(pureGoldG),
    [pureGoldG]
  );

  const milestones = useMemo(
    () => buildGoldMilestones(pureGoldG),
    [pureGoldG]
  );

  const nextBarTarget = useMemo(() => {
    if (pureGoldG <= 0) return GOLD_BAR_DENOMS[GOLD_BAR_DENOMS.length - 1];

    const larger = GOLD_BAR_DENOMS.filter(
      (item) => item.grams > pureGoldG + 1e-9
    );

    return larger.length > 0 ? larger[larger.length - 1] : null;
  }, [pureGoldG]);

  const goldGoal = useMemo(() => {
    if (!hasMyGold) return null;

    if (!nextBarTarget) {
      return {
        title: `${readiness?.label || "골드바"} 교환 가능 예상`,
        description:
          "현재 기록 기준 예상입니다. 실제 교환 순금량은 매장 실측 후 확정합니다.",
        progress: 100,
        currentLabel: `${pureGoldG.toFixed(2)}g`,
        targetLabel: readiness?.label || "GOLD",
        remainingLabel: "현재 기록 기준",
        availableLabel: readiness?.available ? `${readiness.label} 교환 가능 예상` : "",
        milestones,
      };
    }

    const neededG = Math.max(0, Number(nextBarTarget.grams) - pureGoldG);
    const progress = Math.max(
      0,
      Math.min(100, (pureGoldG / Number(nextBarTarget.grams)) * 100)
    );

    return {
      title: `다음 ${nextBarTarget.label}까지`,
      description: `${neededG.toFixed(2)}g 더 필요 · 실제 교환 순금량은 매장 실측 후 확정`,
      progress,
      currentLabel: `${pureGoldG.toFixed(2)}g`,
      targetLabel: formatGoldGrams(nextBarTarget.grams),
      remainingLabel: `${neededG.toFixed(2)}g 남음`,
      availableLabel: readiness?.available ? `${readiness.label} 교환 가능 예상` : "",
      milestones,
    };
  }, [hasMyGold, milestones, nextBarTarget, pureGoldG, readiness]);

  const purePrice = Number(dashboard.market.pureGoldBuyPerDon || 0);
  
  const quickActions = [
    { to: "/my-gold/items?add=1", icon: Plus, label: "금 기록" },
    { to: "/my-exchanges", icon: ClipboardList, label: "예약·교환 내역" },
  ];

  const [trendRevealRef, trendVisible] = useInViewOnce(0.01);
  const [goldGoalRevealRef, goldGoalVisible] = useInViewOnce(0.01);
  const [alertRevealRef, alertVisible] = useInViewOnce(0.01);
  const [priceRevealRef, priceVisible] = useInViewOnce(0.01);

  return (
    <Page onClick={playHomeTapHaptic}>
      {upcomingReservation && (
        <ReservationCard
          to="/my-exchanges"
          aria-label="다가오는 방문 예약 확인"
        >
          <span>
            <CalendarDays aria-hidden />
          </span>
          <ReservationCopy>
            <small>다가오는 방문 일정</small>
            <strong>
              {formatReservationSchedule(
                upcomingReservation.visitDate,
                upcomingReservation.visitTime
              )}
            </strong>
            <p>GOLD TO GOLD 예약을 확인하세요.</p>
          </ReservationCopy>
          <ChevronRight aria-hidden />
        </ReservationCard>
      )}

      <AppMyGoldDashboard user={user} dashboard={dashboard} animateValue />

      {myGoldReady && (
        <RevealBlock ref={trendRevealRef} $visible={trendVisible}>
          <SectionCard aria-labelledby="android-home-change-title">
            <SectionHead>
              <div>
                <small>MY GOLD · 7 DAYS</small>
                <h2 id="android-home-change-title">최근 7일 내 금</h2>
                <p>오늘 변화는 MY GOLD 카드에서, 최근 흐름은 여기서 빠르게 확인합니다.</p>
              </div>
              <Link to="/my-gold/trend">
                자세히 <ChevronRight aria-hidden />
              </Link>
            </SectionHead>

            <ChangeGrid>
              <ChangeMetric $direction={trend.weeklyChange.direction}>
                <span>7일 전보다</span>
                <strong>
                  {trend.loading
                    ? "확인 중"
                    : `${formatSignedWon(trend.weeklyChange.amount)} · ${formatSignedPercent(
                        trend.weeklyChange.percent
                      )}`}
                </strong>
                <small>7일 전 공개 시세 기준</small>
              </ChangeMetric>
            </ChangeGrid>
          </SectionCard>
        </RevealBlock>
      )}

      {goldGoal && (
        <RevealBlock ref={goldGoalRevealRef} $visible={goldGoalVisible}>
          <GoldGoalCard
            to="/gold-exchange?mode=vault&auto=1"
            aria-label="MY GOLD 기록 기준 GOLD TO GOLD 예상 확인"
          >
          <GoalTop>
            <div>
              <small>
                <Sparkles aria-hidden /> GOLD JOURNEY · GOLD TO GOLD
              </small>
              <h2>{goldGoal.title}</h2>
              <p>{goldGoal.description}</p>
            </div>
            <ChevronRight aria-hidden />
          </GoalTop>

          <JourneySteps aria-label="내 금의 GOLD JOURNEY">
            <JourneyStep $state="done">
              <span>✓</span>
              <strong>금 기록</strong>
            </JourneyStep>
            <JourneyStep $state="done">
              <span>✓</span>
              <strong>가치 확인</strong>
            </JourneyStep>
            <JourneyStep $state={nextBarTarget ? "active" : "done"}>
              <span>{nextBarTarget ? "3" : "✓"}</span>
              <strong>다음 목표</strong>
            </JourneyStep>
            <JourneyStep $state={nextBarTarget ? "future" : "active"}>
              <span>4</span>
              <strong>목표 알림</strong>
            </JourneyStep>
          </JourneySteps>

          {goldGoal.availableLabel && (
            <GoalBadge>{goldGoal.availableLabel}</GoalBadge>
          )}

          <MilestoneBlock>
            <MilestoneHead>
              <strong>MILESTONE LADDER</strong>
              <span>{goldGoal.remainingLabel}</span>
            </MilestoneHead>
            <MilestoneLadder aria-label="GOLD TO GOLD 목표 단계">
              {goldGoal.milestones.map((item) => (
                <MilestoneItem
                  key={`${item.grams}-${item.labelShort}`}
                  $state={item.state}
                  aria-current={item.state === "target" ? "step" : undefined}
                >
                  <i aria-hidden />
                  <strong>{item.labelShort}</strong>
                </MilestoneItem>
              ))}
            </MilestoneLadder>
          </MilestoneBlock>

          <ProgressLabels>
            <span>
              현재 <strong>{goldGoal.currentLabel}</strong>
            </span>
            <span>
              목표 <strong>{goldGoal.targetLabel}</strong>
            </span>
          </ProgressLabels>

          <ProgressTrack
            $progress={goldGoal.progress}
            $active={goldGoalVisible}
            aria-hidden
          >
            <span />
          </ProgressTrack>
          </GoldGoalCard>
        </RevealBlock>
      )}

      <RevealBlock ref={alertRevealRef} $visible={alertVisible}>
        <MyGoldAlertSummary
          uid={user?.uid}
          demoMode={!user?.uid}
          compact
        />
      </RevealBlock>

      {!dashboard.publicPriceLoading &&
        dashboard.publicPriceEnabled &&
        purePrice > 0 && (
          <RevealBlock ref={priceRevealRef} $visible={priceVisible}>
            <PriceCard
              to="/gold-price"
              aria-label="오늘 순금 시세 보기"
              $live={priceVisible}
            >
              <div>
                <small>TODAY&apos;S GOLD</small>
                <h2>오늘 순금 · 내가 팔 때</h2>
                <p>1돈(3.75g) 기준 · 자세한 등락은 금시세에서 확인</p>
              </div>
              <div>
                <PriceValue>{formatWon(purePrice)}</PriceValue>
              </div>
            </PriceCard>
          </RevealBlock>
        )}

      

      {user?.uid && (
        <QuickGrid aria-label="빠른 행동">
          {quickActions.map(({ to, icon, label }) => (
            <QuickLink key={`${to}-${label}`} to={to}>
              <span>{React.createElement(icon, { "aria-hidden": true })}</span>
              <strong>{label}</strong>
            </QuickLink>
          ))}
        </QuickGrid>
      )}
    </Page>
  );
}
