// src/pages/MyExchanges.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { addDays, format, isValid } from 'date-fns';
import { db } from '../firebase/firebase';
import { useAuthContext } from '../context/AuthContext';
import GoldExchangeReviewForm from '@/components/reviews/GoldExchangeReviewForm';
import useReservedSlots from '@/hooks/useReservedSlots';
import useBookingAvailability, { getBookingAvailabilityEntry } from '@/hooks/useBookingAvailability';
import {
  cancelGoldExchangeGroup,
  rescheduleGoldExchangeGroup,
} from '@/services/exchangeClient';

/* ── 상수/유틸 ─────────────────────────────────── */
const DON_TO_GRAMS = 3.75;

const STATUS_LABEL = {
  requested: '예약 확인 대기',
  in_progress: '매장 확인 중',
  교환중: '매장 확인 중',
  scheduled: '예약 확정',
  completed: '교환 완료',
  canceled: '취소',
  rejected: '거절',
  attention: '방문일 경과 · 확인 필요',
};

// 대표 상태 선택 우선순위 (인덱스가 작을수록 우선)
const STATUS_PRIORITY = ['rejected', 'canceled', 'completed', 'scheduled', 'in_progress', '교환중', 'requested'];
const TIME_SLOTS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const GROUP_PAGE_SIZE = 20;

// 필터용 그룹
const FILTER_LABEL = {
  all: '전체',
  active: '진행중',     // requested / in_progress(교환중)
  scheduled: '예약',
  attention: '확인 필요',
  completed: '완료',
  canceled: '취소',
  rejected: '거절',
};

const displayCustomerStatus = (status, scheduleActivity) => {
  const normalized = status === '교환중' ? 'in_progress' : String(status || 'requested');
  if (normalized === 'requested' && scheduleActivity?.type === 'rescheduled') {
    return '일정 변경 확인 대기';
  }
  if (normalized === 'scheduled' && scheduleActivity?.type === 'rescheduled') {
    return '변경 예약 확정';
  }
  return STATUS_LABEL[normalized] || normalized;
};

const normalizeStatus = (status) =>
  status === '교환중' ? 'in_progress' : String(status || 'requested');

const getCustomerStatusKey = (group, todayKey) => {
  const normalized = normalizeStatus(group?.repStatus);
  const visitDate = String(group?.visitDate || '');
  const hasComparableVisitDate = /^\d{4}-\d{2}-\d{2}$/.test(visitDate);
  const overdue =
    ['requested', 'scheduled'].includes(normalized) &&
    hasComparableVisitDate &&
    visitDate < todayKey;
  return overdue ? 'attention' : normalized;
};

const EXCHANGE_PROGRESS_STEPS = [
  '요청 접수',
  '확인 대기',
  '예약 확정',
  '방문 예정',
  '매장 확인',
  '교환 완료',
];

const toJSDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isValid(d) ? d : null;
  }
  if (typeof v === 'string') {
    const d = new Date(v);
    return isValid(d) ? d : null;
  }
  return null;
};

const fmt = (d, f = 'yyyy.MM.dd HH:mm') => (d && isValid(d) ? format(d, f) : '-');

/* ── GoldExchange와 동일한 라운딩 규칙 ─────────── */
/** 0.0007 이상이면 0.001 올림 (4번째 자리 7-올림) */
const roundTo3Custom = (n) => {
  if (!isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const t = Math.floor(abs * 10000 + 1e-8);
  let thousands = Math.floor(t / 10);
  const fourth = t % 10;
  if (fourth >= 7) thousands += 1;
  return sign * (thousands / 1000);
};
const toFixed3CustomStr = (n) => roundTo3Custom(n).toFixed(3);

const fmtG3 = (n) => toFixed3CustomStr(Number(n || 0));  // g: 소수점 셋째자리, 커스텀 반올림
const fmtD2 = (n) => (Number(n || 0)).toFixed(2);        // 돈: 둘째자리
const fmtG2Min = (n) => {                                // 안내용: 최소 0.01g
  const x = Number(n || 0);
  if (x > 0 && x < 0.01) return '0.01';
  return (Math.round(x * 100) / 100).toFixed(2);
};

/** 원래 입력 수량 표기 (GoldExchange와 동일한 감각의 반올림/환산) */
const displayOriginalQty = (doc) => {
  const origQ = doc.originalQuantity;
  const unit = doc.inputUnit; // 'g' | 'don'
  // 새 문서에 originalQuantity, inputUnit이 있으면 그걸 우선
  if (origQ != null && unit) {
    const n = Number(origQ) || 0;
    if (unit === 'g') {
      return `${toFixed3CustomStr(n)} g (${fmtD2(roundTo3Custom(n / DON_TO_GRAMS))} 돈)`;
    }
    // unit === 'don'
    return `${toFixed3CustomStr(roundTo3Custom(n * DON_TO_GRAMS))} g (${fmtD2(roundTo3Custom(n))} 돈)`;
  }
  // 레거시: grams만 있는 경우
  const grams = Number(doc.quantity) || 0;
  return `${toFixed3CustomStr(grams)} g (${fmtD2(roundTo3Custom(grams / DON_TO_GRAMS))} 돈)`;
};

/* ── 스타일 ───────────────────────────────────── */
const Page = styled.div`
  width: 100%;
  max-width: 980px;
  min-width: 0;
  margin: 0 auto;
  padding: 14px 12px 42px;
  box-sizing: border-box;
  overflow-x: hidden;

  @media (max-width: 720px) {
    padding: 7px 0 26px;
  }
`;

const PageHeader = styled.header`
  position: relative;
  width: 100%;
  min-width: 0;
  margin-bottom: 10px;
  padding: clamp(21px, 4vw, 31px);
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.primary} 78%, transparent);
  border-radius: 22px;
  background:
    radial-gradient(circle at 92% 6%, color-mix(in srgb, ${({ theme }) => theme.colors.gold} 15%, transparent) 0, transparent 31%),
    ${({ theme }) => theme.gradients.primary};
  box-shadow: 0 12px 30px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 12%, transparent);

  &::after {
    content: "MY";
    position: absolute;
    right: -5px;
    bottom: -24px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.goldLight} 6%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 6.2rem;
    font-weight: 950;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 520px) {
    padding: 17px 15px 15px;
    border-radius: 19px;
  }
`;

const Kicker = styled.p`
  position: relative;
  z-index: 1;
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .61rem;
  font-weight: 950;
  letter-spacing: .15em;
`;

const HeaderLead = styled.p`
  position: relative;
  z-index: 1;
  max-width: 680px;
  margin: 8px 0 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 70%, transparent);
  font-size: .78rem;
  line-height: 1.5;
`;

const LedgerSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin: 0 0 10px;

  @media (max-width: 720px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;
const LedgerMetric = styled.div`
  padding: 11px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  text-align: center;
  small { display:block; color: ${({ theme }) => theme.colors.textSecondary}; font-size:.62rem; font-weight:800; }
  strong { display:block; margin-top:4px; color: ${({ theme }) => theme.colors.primary}; font-family: ${({ theme }) => theme.fonts.numeric}; font-size:1rem; }
`;

const SectionTitle = styled.h1`
  position: relative;
  z-index: 1;
  margin: 0;
  color: ${({ theme }) => theme.on.primary};
  font-size: clamp(1.55rem, 4vw, 2.18rem);
  line-height: 1.14;
  letter-spacing: -.04em;
`;

const FilterBar = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 0 0 10px;
  padding: 2px 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
`;

const FilterChip = styled.button`
  flex: 0 0 auto;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.goldLight : theme.colors.textSecondary};
  font-size: .74rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
`;

const Count = styled.span`
  margin-left: .3rem;
  font-weight: 900;
  color: inherit;
  opacity: .78;
`;

const CardGrid = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
`;

const Card = styled.article`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 7px 20px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
`;

const CardHeader = styled.button`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  box-sizing: border-box;
  border: 0;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 45%, white),
      ${({ theme }) => theme.colors.surface}
    );
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    padding: 12px;
  }
`;

const HeaderLeft = styled.div`
  min-width: 0;
  display: grid;
  gap: 4px;
`;

const HLabel = styled.span`
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .68rem;
  font-weight: 900;
  letter-spacing: .02em;
`;

const HValue = styled.span`
  min-width: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: .96rem;
  font-weight: 900;
  line-height: 1.3;
`;

const HeaderRight = styled.div`
  min-width: 0;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    width: 100%;
    justify-content: flex-start;
  }
`;

const HeaderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.78rem;
`;

const FinalWeight = styled.div`
  min-width: 0;
  max-width: 100%;
  display: grid;
  gap: 1px;
  text-align: right;

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .66rem;
  }

  strong {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 1rem;
    font-weight: 950;
  }

  @media (max-width: 640px) {
    text-align: left;
  }
`;

const StatusBadge = styled.span`
  padding: .3rem .56rem;
  border-radius: 9999px;
  font-weight: 850;
  font-size: .72rem;
  background: ${({ $status, theme }) => {
    if ($status === 'attention') return theme.semantic.alertErrorBg;
    if ($status === 'requested') return theme.semantic.alertWarningBg;
    if ($status === 'scheduled') return theme.semantic.alertSuccessBg;
    if ($status === 'completed') return theme.semantic.badgeGoldBg;
    if ($status === 'rejected') return theme.semantic.alertErrorBg;
    if ($status === 'in_progress' || $status === '교환중') return theme.semantic.alertInfoBg;
    return theme.colors.surfaceAlt;
  }};
  color: ${({ $status, theme }) => {
    if ($status === 'attention') return theme.semantic.alertErrorText;
    if ($status === 'requested') return theme.semantic.alertWarningText;
    if ($status === 'scheduled') return theme.semantic.alertSuccessText;
    if ($status === 'completed') return theme.colors.primary;
    if ($status === 'rejected') return theme.semantic.alertErrorText;
    if ($status === 'in_progress' || $status === '교환중') return theme.colors.primary;
    return theme.colors.textSecondary;
  }};
`;

const Chev = styled.span`
  display: inline-block;
  transition: transform .2s ease;
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  font-size: 1rem;
  opacity: .7;
`;

const CardBody = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  padding: 12px 14px 15px;
  box-sizing: border-box;
  overflow: hidden;
  border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};

  > * {
    min-width: 0;
    max-width: 100%;
  }

  @media (max-width: 640px) {
    padding: 10px 10px 13px;
  }
`;

const MetaGrid = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 14px;
  padding: 11px 12px;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: grid;
  grid-template-columns: 5.7em minmax(0, 1fr);
  align-items: baseline;
  gap: 6px;
  font-size: 0.84rem;
`;
const Label = styled.span`
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.01em;
`;
const Value = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  word-break: break-word;
`;

const Divider = styled.hr`
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  border: none;
  margin: .25rem 0 .25rem;
`;

const TableWrap = styled.div`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-inline: contain;
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 12px;
`;

const ItemsTable = styled.table`
  width: 100%;
  min-width: 560px;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border-radius: 10px;
  thead th {
    text-align: left;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    padding: 7px 9px;
    font-size: 0.8rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  tbody td {
    padding: 7px 9px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: top;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.82rem;
  }
  tbody tr:nth-child(even) td {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
  tbody tr:last-child td { border-bottom: none; }
  @media (max-width: 640px) {
    th[data-col='exchangeType'], td[data-col='exchangeType'],
    th[data-col='status'], td[data-col='status'] { display: none; }
  }
`;

const Chips = styled.span`
  display: inline-flex;
  gap: .35rem;
  flex-wrap: wrap;
`;
const Chip = styled.span`
  display: inline-block;
  padding: .12rem .45rem;
  border-radius: 9999px;
  font-weight: 800;
  font-size: .82rem;
  color: ${({ theme }) => theme.on.primary};
  background: ${({ $tone, theme }) => {
    if ($tone === 'grams') return theme.colors.primary;
    if ($tone === 'don') return theme.colors.secondary;
    return theme.colors.info;
  }};
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  font-size: 0.84rem;
  font-weight: 800;

  @media (max-width: 520px) {
    justify-content: flex-start;
  }
`;

const Help = styled.p`
  margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.78rem;
  line-height: 1.45;
`;

const Empty = styled.p`
  margin-top: 1.25rem;
`;


const EmptyState = styled.section`
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: clamp(22px, 4vw, 30px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 7px 20px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
`;

const EmptyStateTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.22rem, 3vw, 1.55rem);
  line-height: 1.3;
`;

const EmptyStateLead = styled.p`
  max-width: 640px;
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .84rem;
  line-height: 1.6;
`;

const EmptyStateAction = styled(Link)`
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  margin-top: 8px;
  padding: 9px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: .78rem;
  font-weight: 900;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.on.primary};
  }
`;

const LoadMoreRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 12px;
`;

const LoadMoreError = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.error};
  font-size: .78rem;
  line-height: 1.5;
  text-align: center;
`;

const LoadMoreButton = styled.button`
  min-width: 140px;
  min-height: 42px;
  padding: 9px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: .78rem;
  font-weight: 900;
  cursor: pointer;

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.surfaceAlt}; }
  &:disabled { opacity: .55; cursor: wait; }
`;

const DetailState = styled.div`
  padding: 18px 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .8rem;
  line-height: 1.5;
`;

const PlanCard = styled.div`
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 20%, ${({ theme }) => theme.colors.border});
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 52%, white),
    ${({ theme }) => theme.colors.surface}
  );
`;
const PlanRow = styled.div`
  min-width: 0;
  display: grid;
  grid-template-columns: 6.2em minmax(0, 1fr);
  gap: 7px;

  @media (max-width: 420px) {
    grid-template-columns: 5.5em minmax(0, 1fr);
  }
`;
const PlanLabel = styled.span`font-weight: 800;`;
const PlanValue = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
`;

const StatusFlow = styled.ol`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 4px;
  }
`;

const StatusStep = styled.li`
  position: relative;
  min-width: 0;
  padding: 9px 8px;
  border: 1px solid ${({ $active, theme }) =>
    $active
      ? `color-mix(in srgb, ${theme.colors.gold} 48%, ${theme.colors.border})`
      : theme.colors.dividerSubtle};
  border-radius: 10px;
  background: ${({ $active, $current, theme }) =>
    $current
      ? theme.semantic.badgeGoldBg
      : $active
        ? `color-mix(in srgb, ${theme.semantic.badgeGoldBg} 48%, ${theme.colors.surface})`
        : theme.colors.surfaceAlt};
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.textSecondary};
  font-size: .72rem;
  font-weight: 850;
  text-align: center;

  &::before {
    content: "${({ $index }) => String($index + 1).padStart(2, '0')}";
    display: block;
    margin-bottom: 3px;
    color: ${({ $active, theme }) => $active ? theme.colors.secondaryDark : theme.colors.textSecondary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .62rem;
  }

  @media (max-width: 720px) {
    display: grid;
    grid-template-columns: 2.7em 1fr;
    align-items: center;
    text-align: left;
    &::before { margin: 0; }
  }
`;

const AttentionNotice = styled.div`
  padding: 12px 13px;
  border: 1px solid ${({ theme }) => theme.semantic.alertWarningBorder || theme.colors.warning};
  border-radius: 12px;
  background: ${({ theme }) => theme.semantic.alertWarningBg};
  color: ${({ theme }) => theme.semantic.alertWarningText};
  font-size: .8rem;
  line-height: 1.55;
  strong { display: block; margin-bottom: 3px; }
`;

const RequestDetails = styled.details`
  border: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;

  summary {
    padding: 10px 12px;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .78rem;
    font-weight: 850;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker { display: none; }
  summary::after { content: "＋"; float: right; }
  &[open] summary::after { content: "－"; }
  ${MetaGrid} {
    margin: 0 10px 10px;
  }
`;

const ScheduleActivity = styled.div`
  padding: .8rem .9rem;
  border-left: 3px solid ${({ $type, theme }) =>
    $type === 'canceled' ? theme.colors.error : theme.colors.warning};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  strong { color: ${({ theme }) => theme.colors.text}; }
  p { margin: .3rem 0 0; }
`;

const ScheduleActionsPanel = styled.div`
  display: grid;
  gap: 10px;
  padding: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const ScheduleActionTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

const ScheduleActionLead = styled.p`
  margin: .35rem 0 .8rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .9rem;
`;

const ScheduleButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
`;

const ScheduleButton = styled.button`
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid ${({ $variant, theme }) =>
    $variant === 'danger' ? theme.colors.error : theme.colors.primary};
  border-radius: 10px;
  background: ${({ $variant, theme }) =>
    $variant === 'danger' ? 'transparent' : theme.colors.primary};
  color: ${({ $variant, theme }) =>
    $variant === 'danger' ? theme.colors.error : theme.on.primary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ $variant, theme }) =>
      $variant === 'danger' ? theme.semantic.alertErrorBg : theme.colors.primaryDark};
  }

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
`;

const ScheduleForm = styled.div`
  display: grid;
  gap: .75rem;
  margin-top: .9rem;
  padding-top: .9rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const ScheduleFormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .75rem;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const ScheduleFormField = styled.label`
  display: grid;
  gap: .35rem;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  font-size: .9rem;
  .react-datepicker-wrapper { width: 100%; }
  input, select, textarea {
    width: 100%;
    min-height: 42px;
    padding: .6rem .7rem;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font: inherit;
    font-weight: 500;
    box-sizing: border-box;
  }
  textarea { min-height: 84px; resize: vertical; }
`;

const ScheduleMessage = styled.p`
  margin: 0;
  color: ${({ $error, theme }) =>
    $error ? theme.colors.error : theme.colors.success};
  font-weight: 700;
  font-size: .9rem;
`;

const Pill = styled.span`
  display: inline-block;
  padding: .2rem .55rem;
  border-radius: 9999px;
  background: ${({ theme }) => theme.semantic.badgeInfoBg};
  color: ${({ theme }) => theme.semantic.badgeInfoText};
  font-weight: 800;
  font-size: .82rem;
  margin-right: .35rem;
  margin-top: .25rem;
`;

function ScheduleActions({ group }) {
  const [mode, setMode] = useState('');
  const [visitDate, setVisitDate] = useState(null);
  const [visitTime, setVisitTime] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dateKey = visitDate ? format(visitDate, 'yyyy-MM-dd') : '';
  const taken = useReservedSlots(dateKey);
  const { dates: bookingAvailabilityDates } = useBookingAvailability();
  const availability = useMemo(
    () => getBookingAvailabilityEntry({ dates: bookingAvailabilityDates }, dateKey),
    [bookingAvailabilityDates, dateKey]
  );

  useEffect(() => {
    if (visitTime && taken.has(visitTime)) setVisitTime('');
  }, [taken, visitTime]);

  useEffect(() => {
    if (!dateKey) return;
    if (availability.closed) {
      setVisitTime('');
      setError(availability.reason || '해당 날짜는 예약을 받지 않습니다.');
      return;
    }
    if (visitTime && availability.blockedSlots.has(visitTime)) {
      setVisitTime('');
      setError(availability.reason || '해당 시간은 예약을 받지 않습니다.');
    }
  }, [availability.closed, availability.blockedSlots, availability.reason, dateKey, visitTime]);

  const openMode = (nextMode) => {
    setMode(nextMode);
    setVisitDate(null);
    setVisitTime('');
    setReason('');
    setError('');
    setNotice('');
  };

  const closeMode = () => {
    if (busy) return;
    setMode('');
    setError('');
  };

  const submitReschedule = async () => {
    if (!dateKey || !visitTime) {
      setError('변경할 방문 날짜와 시간을 선택해 주세요.');
      return;
    }
    if (!reason.trim()) {
      setError('일정 변경 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await rescheduleGoldExchangeGroup({
        groupId: group.groupId,
        visitDate: dateKey,
        visitTime,
        reason: reason.trim(),
      });
      setMode('');
      setNotice('일정 변경 요청이 접수되었습니다. 관리자 확인 후 변경된 예약 확정 알림이 발송됩니다.');
    } catch (submitError) {
      setError(
        submitError?.code === 'aborted'
          ? '이미 예약된 시간입니다. 다른 시간을 선택해 주세요.'
          : submitError?.message || '일정 변경 요청을 처리하지 못했습니다.'
      );
    } finally {
      setBusy(false);
    }
  };

  const submitCancellation = async () => {
    if (!reason.trim()) {
      setError('예약 취소 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await cancelGoldExchangeGroup({ groupId: group.groupId, reason: reason.trim() });
      setMode('');
      setNotice('예약이 취소되었습니다.');
    } catch (submitError) {
      setError(submitError?.message || '예약을 취소하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScheduleActionsPanel aria-label="예약 일정 변경 및 취소">
      <ScheduleActionTitle>예약 일정 관리</ScheduleActionTitle>
      <ScheduleActionLead>
        일정 변경은 새 시간을 먼저 확보한 뒤 관리자 확인 대기로 전환되며, 확인 후 예약 확정 알림이 발송됩니다.
      </ScheduleActionLead>
      <ScheduleButtonRow>
        <ScheduleButton type="button" onClick={() => openMode('reschedule')} disabled={busy}>
          일정 변경
        </ScheduleButton>
        <ScheduleButton type="button" $variant="danger" onClick={() => openMode('cancel')} disabled={busy}>
          예약 취소
        </ScheduleButton>
      </ScheduleButtonRow>

      {notice && <ScheduleMessage role="status">{notice}</ScheduleMessage>}

      {mode === 'reschedule' && (
        <ScheduleForm>
          <ScheduleFormGrid>
            <ScheduleFormField>
              변경할 날짜
              <DatePicker
                selected={visitDate}
                onChange={(date) => { setVisitDate(date); setVisitTime(''); setError(''); }}
                dateFormat="yyyy-MM-dd"
                minDate={addDays(new Date(), 1)}
                maxDate={addDays(new Date(), 60)}
                filterDate={(date) => date.getDay() !== 0 && !getBookingAvailabilityEntry({ dates: bookingAvailabilityDates }, format(date, 'yyyy-MM-dd')).closed}
                placeholderText="날짜 선택"
                disabled={busy}
              />
            </ScheduleFormField>
            <ScheduleFormField>
              변경할 시간
              <select
                value={visitTime}
                onChange={(event) => { setVisitTime(event.target.value); setError(''); }}
                disabled={!visitDate || busy}
              >
                <option value="">시간 선택</option>
                {TIME_SLOTS.map((time) => {
                  const reserved = taken.has(time);
                  const blocked = availability.blockedSlots.has(time);
                  return (
                    <option key={time} value={time} disabled={reserved || blocked}>
                      {reserved || blocked ? `${time} (${blocked ? '예약 마감' : '이미 예약됨'})` : time}
                    </option>
                  );
                })}
              </select>
            </ScheduleFormField>
          </ScheduleFormGrid>
          <ScheduleFormField>
            변경 사유
            <textarea
              value={reason}
              onChange={(event) => { setReason(event.target.value.slice(0, 200)); setError(''); }}
              maxLength={200}
              placeholder="예: 개인 일정으로 방문 날짜를 변경합니다."
              disabled={busy}
            />
          </ScheduleFormField>
          {error && <ScheduleMessage $error role="alert">{error}</ScheduleMessage>}
          <ScheduleButtonRow>
            <ScheduleButton type="button" onClick={submitReschedule} disabled={busy}>
              {busy ? '변경 요청 중…' : '변경 요청 보내기'}
            </ScheduleButton>
            <ScheduleButton type="button" onClick={closeMode} disabled={busy}>닫기</ScheduleButton>
          </ScheduleButtonRow>
        </ScheduleForm>
      )}

      {mode === 'cancel' && (
        <ScheduleForm>
          <ScheduleFormField>
            취소 사유
            <textarea
              value={reason}
              onChange={(event) => { setReason(event.target.value.slice(0, 200)); setError(''); }}
              maxLength={200}
              placeholder="예약을 취소하는 이유를 입력해 주세요."
              disabled={busy}
            />
          </ScheduleFormField>
          <ScheduleMessage $error>
            취소하면 현재 예약 시간은 즉시 다른 고객이 예약할 수 있습니다.
          </ScheduleMessage>
          {error && <ScheduleMessage $error role="alert">{error}</ScheduleMessage>}
          <ScheduleButtonRow>
            <ScheduleButton type="button" $variant="danger" onClick={submitCancellation} disabled={busy}>
              {busy ? '취소 처리 중…' : '예약 취소 확정'}
            </ScheduleButton>
            <ScheduleButton type="button" onClick={closeMode} disabled={busy}>돌아가기</ScheduleButton>
          </ScheduleButtonRow>
        </ScheduleForm>
      )}
    </ScheduleActionsPanel>
  );
}


const buildExchangeGroup = ({ groupId, items = [], summary = {}, user, detailLoaded = items.length > 0 }) => {
  const statuses = items.map((item) => item.status).filter(Boolean);
  const itemRepStatus =
    statuses
      .slice()
      .sort(
        (a, b) => STATUS_PRIORITY.indexOf(a ?? 'requested') - STATUS_PRIORITY.indexOf(b ?? 'requested')
      )[0] || 'requested';
  const repStatus = String(summary.repStatus || itemRepStatus || 'requested');

  const createdNs = items
    .map((item) => toJSDate(item.createdAt)?.getTime?.())
    .filter((value) => Number.isFinite(value));
  const updatedNs = items
    .map((item) => toJSDate(item.updatedAt)?.getTime?.())
    .filter((value) => Number.isFinite(value));

  const summaryCreatedAt = toJSDate(summary.createdAt);
  const summaryUpdatedAt = toJSDate(summary.updatedAt);
  const createdAt = summaryCreatedAt || (createdNs.length ? new Date(Math.min(...createdNs)) : null);
  const updatedAt = summaryUpdatedAt || (updatedNs.length ? new Date(Math.max(...updatedNs)) : null);

  const latestByUpdate =
    items
      .slice()
      .sort(
        (a, b) => (toJSDate(b.updatedAt)?.getTime?.() ?? 0) - (toJSDate(a.updatedAt)?.getTime?.() ?? 0)
      )[0] || {};
  const any = items[0] || {};
  const visitDate = String(summary.visitDate || any.visitDate || '');
  const visitTime = String(summary.visitTime || any.visitTime || '');
  const scheduledAt = toJSDate(summary.scheduledAt || any.scheduledAt) ?? null;

  const requester = {
    name: latestByUpdate.name || latestByUpdate.requesterName || user?.displayName || '-',
    phone: latestByUpdate.phone || '-',
  };

  const enrichedItems = items.map((item) => {
    const finalWeight = Number.isFinite(Number(item.finalWeight)) ? Number(item.finalWeight) : 0;
    const finalWeightDon = Number.isFinite(Number(item.finalWeightDon))
      ? Number(item.finalWeightDon)
      : finalWeight / DON_TO_GRAMS;
    const confirmedPureGoldG = Number(item.confirmedPureGoldG);
    return {
      ...item,
      _displayOriginal: displayOriginalQty(item),
      _finalWeight: finalWeight,
      _finalWeightDon: finalWeightDon,
      _confirmedPureGoldG: Number.isFinite(confirmedPureGoldG) ? confirmedPureGoldG : null,
    };
  });

  const itemTotalG = enrichedItems.reduce((sum, item) => sum + (Number(item._finalWeight) || 0), 0);
  const summaryTotalG = Number(summary.totalG);
  const totalG = enrichedItems.length > 0
    ? itemTotalG
    : Number.isFinite(summaryTotalG) ? summaryTotalG : 0;

  const bonus = latestByUpdate.bonusGoldUsageStatus
    ? {
        status: String(latestByUpdate.bonusGoldUsageStatus),
        amountG: Number(latestByUpdate.bonusGoldUsedG || 0),
        finalRecognizedG: Number(latestByUpdate.finalRecognizedG || 0),
        finalAppliedG: Number(latestByUpdate.finalAppliedG || 0),
      }
    : null;

  const scheduleType = String(summary.scheduleChangeType || latestByUpdate.scheduleChangeType || '');
  const scheduleActivity = scheduleType
    ? {
        type: scheduleType,
        previousVisitDate: String(summary.previousVisitDate || latestByUpdate.previousVisitDate || ''),
        previousVisitTime: String(summary.previousVisitTime || latestByUpdate.previousVisitTime || ''),
        visitDate: String(summary.visitDate || latestByUpdate.visitDate || visitDate || ''),
        visitTime: String(summary.visitTime || latestByUpdate.visitTime || visitTime || ''),
        reason: String(
          scheduleType === 'canceled'
            ? summary.cancellationReason || latestByUpdate.cancellationReason || ''
            : summary.scheduleChangeReason || latestByUpdate.scheduleChangeReason || ''
        ),
        requestedAt: toJSDate(
          summary.scheduleChangeRequestedAt ||
          summary.cancellationRequestedAt ||
          latestByUpdate.scheduleChangeRequestedAt ||
          latestByUpdate.cancellationRequestedAt
        ),
      }
    : null;

  const planDoc =
    items
      .filter((item) => item.barsPlan)
      .sort(
        (a, b) => (toJSDate(b.updatedAt)?.getTime?.() ?? 0) - (toJSDate(a.updatedAt)?.getTime?.() ?? 0)
      )[0] || null;

  const measurementStatus = String(
    summary.measurementStatus || latestByUpdate.measurementStatus || ''
  );
  const measurement = measurementStatus
    ? {
        status: measurementStatus,
        finalRecognizedG: Number(
          summary.finalRecognizedG ?? latestByUpdate.finalRecognizedG ?? 0
        ),
        finalAppliedG: Number(
          summary.finalAppliedG ?? latestByUpdate.finalAppliedG ?? 0
        ),
        finalFeeWon: Number(
          summary.finalFeeWon ?? latestByUpdate.finalFeeWon ?? 0
        ),
        customerConsentConfirmed:
          summary.customerConsentConfirmed === true ||
          latestByUpdate.customerConsentConfirmed === true,
      }
    : null;

  return {
    groupId,
    items: enrichedItems,
    detailsLoaded: detailLoaded || items.length > 0,
    repStatus,
    createdAt,
    updatedAt,
    visitDate,
    visitTime,
    scheduledAt,
    requester,
    totalG,
    bonus,
    measurement,
    scheduleActivity,
    plan:
      summary.finalBarsPlan ||
      latestByUpdate.finalBarsPlan ||
      planDoc?.barsPlan ||
      summary.barsPlan ||
      null,
  };
};

const mergeSummaryRows = (liveRows, olderRows) => {
  const byId = new Map();
  [...liveRows, ...olderRows].forEach((row) => {
    if (row?.id && !byId.has(row.id)) byId.set(row.id, row);
  });
  return [...byId.values()].sort((a, b) => {
    const aTime = toJSDate(a.updatedAt)?.getTime?.() || toJSDate(a.createdAt)?.getTime?.() || 0;
    const bTime = toJSDate(b.updatedAt)?.getTime?.() || toJSDate(b.createdAt)?.getTime?.() || 0;
    return bTime - aTime;
  });
};

/* 스켈레톤 */
const Skeleton = styled.div`
  width: 100%;
  height: 64px;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--gm-surface-alt), var(--gm-border), var(--gm-surface-alt));
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite linear;
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

/* ── 메인 컴포넌트 ─────────────────────────────── */
export default function MyExchanges() {
  const { user } = useAuthContext();
  const [liveSummaries, setLiveSummaries] = useState([]);
  const [olderSummaries, setOlderSummaries] = useState([]);
  const [summaryCursor, setSummaryCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const [legacyMode, setLegacyMode] = useState(false);
  const [legacyDocsA, setLegacyDocsA] = useState([]);
  const [legacyDocsB, setLegacyDocsB] = useState([]);
  const [detailsByGroup, setDetailsByGroup] = useState({});
  const detailUnsubscribersRef = useRef(new Map());
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    detailUnsubscribersRef.current.forEach((unsubscribe) => unsubscribe?.());
    detailUnsubscribersRef.current.clear();
    setDetailsByGroup({});
    setExpanded({});
    setLiveSummaries([]);
    setOlderSummaries([]);
    setSummaryCursor(null);
    setHasMore(false);
    setLoadMoreError('');
    setLegacyMode(false);
    setLegacyDocsA([]);
    setLegacyDocsB([]);
    setErr('');

    if (!user?.uid) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    let fallbackUnsubscribe = null;
    let optimizedUnsubscribe = null;
    let disposed = false;

    const applySummarySnapshot = (snapshot, optimized) => {
      if (disposed) return;
      const rows = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      setLiveSummaries(rows);
      setOlderSummaries([]);
      setLegacyMode(snapshot.empty);
      setLoading(!snapshot.empty ? false : true);

      if (optimized) {
        setSummaryCursor(snapshot.docs.at(-1) || null);
        setHasMore(snapshot.size === GROUP_PAGE_SIZE);
      } else {
        setSummaryCursor(null);
        setHasMore(false);
      }
    };

    const startFallback = () => {
      if (disposed || fallbackUnsubscribe) return;
      console.warn('[MyExchanges] optimized group query unavailable; using compatibility query.');
      const fallbackQuery = query(
        collection(db, 'goldExchangeGroups'),
        where('ownerUid', '==', user.uid)
      );
      fallbackUnsubscribe = onSnapshot(
        fallbackQuery,
        (snapshot) => applySummarySnapshot(snapshot, false),
        (error) => {
          console.error(error);
          if (!disposed) {
            setErr('내 교환 내역을 불러오는 중 오류가 발생했습니다.');
            setLoading(false);
          }
        }
      );
    };

    const optimizedQuery = query(
      collection(db, 'goldExchangeGroups'),
      where('ownerUid', '==', user.uid),
      orderBy('updatedAt', 'desc'),
      limit(GROUP_PAGE_SIZE)
    );

    optimizedUnsubscribe = onSnapshot(
      optimizedQuery,
      (snapshot) => applySummarySnapshot(snapshot, true),
      (error) => {
        console.warn('[MyExchanges] optimized group query failed:', error?.message || error);
        optimizedUnsubscribe?.();
        optimizedUnsubscribe = null;
        startFallback();
      }
    );

    return () => {
      disposed = true;
      optimizedUnsubscribe?.();
      fallbackUnsubscribe?.();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!legacyMode || !user?.uid) return undefined;

    let readyA = false;
    let readyB = false;
    const finish = () => {
      if (readyA && readyB) setLoading(false);
    };

    const qUser = query(collection(db, 'goldExchanges'), where('userId', '==', user.uid));
    const qPart = query(collection(db, 'goldExchanges'), where('participants', 'array-contains', user.uid));
    const unsubA = onSnapshot(
      qUser,
      (snapshot) => {
        setLegacyDocsA(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        readyA = true;
        finish();
      },
      (error) => {
        console.warn('[MyExchanges] legacy owner query failed:', error?.message || error);
        readyA = true;
        finish();
      }
    );
    const unsubB = onSnapshot(
      qPart,
      (snapshot) => {
        setLegacyDocsB(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
        readyB = true;
        finish();
      },
      () => {
        readyB = true;
        finish();
      }
    );

    return () => {
      unsubA?.();
      unsubB?.();
    };
  }, [legacyMode, user?.uid]);

  useEffect(() => {
    const detailUnsubscribers = detailUnsubscribersRef.current;
    return () => {
      detailUnsubscribers.forEach((unsubscribe) => unsubscribe?.());
      detailUnsubscribers.clear();
    };
  }, []);

  const summaryRows = useMemo(
    () => mergeSummaryRows(liveSummaries, olderSummaries),
    [liveSummaries, olderSummaries]
  );

  const groups = useMemo(() => {
    if (summaryRows.length > 0) {
      return summaryRows.map((summary) => {
        const detail = detailsByGroup[summary.id];
        return buildExchangeGroup({
          groupId: summary.id,
          items: detail?.items || [],
          summary,
          user,
          detailLoaded: detail?.loaded === true,
        });
      });
    }

    if (!legacyMode) return [];

    const byId = new Map();
    [...legacyDocsA, ...legacyDocsB].forEach((document) => {
      if (!byId.has(document.id)) byId.set(document.id, document);
    });
    const byGroup = new Map();
    [...byId.values()].forEach((document) => {
      const groupId = document.groupId || document.id;
      if (!byGroup.has(groupId)) byGroup.set(groupId, []);
      byGroup.get(groupId).push(document);
    });

    return [...byGroup.entries()]
      .map(([groupId, items]) => buildExchangeGroup({ groupId, items, summary: {}, user }))
      .sort((a, b) => (b.updatedAt?.getTime?.() || 0) - (a.updatedAt?.getTime?.() || 0));
  }, [detailsByGroup, legacyDocsA, legacyDocsB, legacyMode, summaryRows, user]);

  const subscribeGroupDetails = useCallback((groupId) => {
    if (!user?.uid || detailUnsubscribersRef.current.has(groupId) || legacyMode) return;

    setDetailsByGroup((previous) => ({
      ...previous,
      [groupId]: { ...(previous[groupId] || {}), loading: true, error: '' },
    }));

    const detailQuery = query(
      collection(db, 'goldExchanges'),
      where('groupId', '==', groupId)
    );
    const unsubscribe = onSnapshot(
      detailQuery,
      (snapshot) => {
        setDetailsByGroup((previous) => ({
          ...previous,
          [groupId]: {
            loading: false,
            loaded: true,
            error: '',
            items: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
          },
        }));
      },
      (error) => {
        console.error('[MyExchanges] detail query failed:', error);
        setDetailsByGroup((previous) => ({
          ...previous,
          [groupId]: {
            ...(previous[groupId] || {}),
            loading: false,
            error: '상세 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
          },
        }));
      }
    );
    detailUnsubscribersRef.current.set(groupId, unsubscribe);
  }, [legacyMode, user?.uid]);

  const toggle = useCallback((groupId) => {
    const nextOpen = !expanded[groupId];
    if (nextOpen) {
      subscribeGroupDetails(groupId);
    } else {
      detailUnsubscribersRef.current.get(groupId)?.();
      detailUnsubscribersRef.current.delete(groupId);
    }
    setExpanded((previous) => ({ ...previous, [groupId]: nextOpen }));
  }, [expanded, subscribeGroupDetails]);

  const loadMore = useCallback(async () => {
    if (!user?.uid || !summaryCursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const nextQuery = query(
        collection(db, 'goldExchangeGroups'),
        where('ownerUid', '==', user.uid),
        orderBy('updatedAt', 'desc'),
        startAfter(summaryCursor),
        limit(GROUP_PAGE_SIZE)
      );
      const snapshot = await getDocs(nextQuery);
      const nextRows = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      setOlderSummaries((previous) => mergeSummaryRows(previous, nextRows));
      setSummaryCursor(snapshot.docs.at(-1) || null);
      setHasMore(snapshot.size === GROUP_PAGE_SIZE);
    } catch (error) {
      console.error('[MyExchanges] load more failed:', error);
      setLoadMoreError('이전 교환내역을 더 불러오지 못했습니다. 기존 내역은 그대로 유지됩니다. 다시 시도해 주세요.');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, summaryCursor, user?.uid]);

  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const groupsFiltered = useMemo(() => {
    if (statusFilter === 'all') return groups;
    if (statusFilter === 'active') {
      return groups.filter((group) => {
        const status = getCustomerStatusKey(group, todayKey);
        return ['requested', 'in_progress'].includes(status);
      });
    }
    return groups.filter((group) => getCustomerStatusKey(group, todayKey) === statusFilter);
  }, [groups, statusFilter, todayKey]);

  const counts = useMemo(() => {
    const base = { all: groups.length, active: 0, scheduled: 0, attention: 0, completed: 0, canceled: 0, rejected: 0 };
    for (const group of groups) {
      const status = getCustomerStatusKey(group, todayKey);
      if (['requested', 'in_progress'].includes(status)) base.active += 1;
      if (status === 'scheduled') base.scheduled += 1;
      if (status === 'attention') base.attention += 1;
      if (status === 'completed') base.completed += 1;
      if (status === 'canceled') base.canceled += 1;
      if (status === 'rejected') base.rejected += 1;
    }
    return base;
  }, [groups, todayKey]);

  /* ── 렌더 ───────────────────────────────────── */
  if (!user) return <Page><Empty>로그인이 필요합니다.</Empty></Page>;
  if (loading) return (
    <Page>
      <PageHeader>
        <SectionTitle>금교환 기록</SectionTitle>
        <HeaderLead>신청부터 방문·완료까지 금교환의 진행 상태와 결과를 한곳에서 기록합니다.</HeaderLead>
      </PageHeader>
      <FilterBar>
        {Object.entries(FILTER_LABEL).map(([key, label]) => (
          <FilterChip key={key} disabled>{label}</FilterChip>
        ))}
      </FilterBar>
      <CardGrid>
        <Skeleton />
        <Skeleton />
      </CardGrid>
    </Page>
  );
  if (err) return <Page><Empty style={{ color: 'var(--gm-error)' }}>{err}</Empty></Page>;
  if (groups.length === 0) return (
    <Page>
      <PageHeader>
        <SectionTitle>금교환 기록</SectionTitle>
        <HeaderLead>신청부터 방문·완료까지 금교환의 진행 상태와 결과를 한곳에서 기록합니다.</HeaderLead>
      </PageHeader>
      <EmptyState>
        <EmptyStateTitle>등록된 교환내역이 없습니다.</EmptyStateTitle>
        <EmptyStateLead>
          아직 신청한 금교환이 없습니다. 금교환을 신청하면 예약 상태와 교환 결과가 이곳에 기록됩니다.
        </EmptyStateLead>
        <EmptyStateAction to="/gold-exchange">금교환 계산하기</EmptyStateAction>
      </EmptyState>
    </Page>
  );

  return (
    <Page>
      <PageHeader>
        <SectionTitle>금교환 기록</SectionTitle>
        <HeaderLead>신청부터 방문·완료까지 금교환의 진행 상태와 결과를 한곳에서 기록합니다.</HeaderLead>
      </PageHeader>

      <LedgerSummary aria-label="금교환 진행 요약">
        <LedgerMetric><small>진행 중</small><strong>{!legacyMode && hasMore ? `${counts.active}+` : counts.active}</strong></LedgerMetric>
        <LedgerMetric><small>예약 확정</small><strong>{!legacyMode && hasMore ? `${counts.scheduled}+` : counts.scheduled}</strong></LedgerMetric>
        <LedgerMetric><small>확인 필요</small><strong>{!legacyMode && hasMore ? `${counts.attention}+` : counts.attention}</strong></LedgerMetric>
        <LedgerMetric><small>교환 완료</small><strong>{!legacyMode && hasMore ? `${counts.completed}+` : counts.completed}</strong></LedgerMetric>
      </LedgerSummary>

      <FilterBar role="tablist" aria-label="상태 필터">
        {Object.entries(FILTER_LABEL).map(([key, label]) => (
          <FilterChip
            key={key}
            $active={statusFilter === key}
            onClick={() => setStatusFilter(key)}
            role="tab"
            aria-selected={statusFilter === key}
          >
            {label}
            <Count>{!legacyMode && hasMore ? `${counts[key] ?? 0}+` : (counts[key] ?? 0)}</Count>
          </FilterChip>
        ))}
      </FilterBar>

      {groupsFiltered.length === 0 && statusFilter !== 'all' && (
        <EmptyState role="status">
          <EmptyStateTitle>{FILTER_LABEL[statusFilter]} 교환내역이 없습니다.</EmptyStateTitle>
          <EmptyStateLead>
            {!legacyMode && hasMore
              ? `현재 불러온 교환내역에는 ${FILTER_LABEL[statusFilter]} 상태가 없습니다. 이전 교환내역을 더 확인해 주세요.`
              : `현재 ${FILTER_LABEL[statusFilter]} 상태로 기록된 교환내역이 없습니다.`}
          </EmptyStateLead>
        </EmptyState>
      )}

      <CardGrid>
        {groupsFiltered.map((g) => {
          const rawStatusKey = normalizeStatus(g.repStatus);
          const statusKey = getCustomerStatusKey(g, todayKey);
          const isOverdue = statusKey === 'attention';
          const isFinalized =
            rawStatusKey === 'completed' ||
            g.measurement?.status === 'confirmed' ||
            g.bonus?.status === 'used';
          const visitLine =
            [g.visitDate, g.visitTime]
              .filter(Boolean)
              .join(' ') || '-';
          const isBonusUsed = g.bonus?.status === 'used';
          const finalDisplayG = Number(
            g.measurement?.status === 'confirmed'
              ? g.measurement.finalAppliedG || g.measurement.finalRecognizedG || g.totalG
              : isBonusUsed
                ? g.bonus.finalAppliedG || g.totalG
                : g.totalG
          );
          const planBasisG = Number(
            g.measurement?.status === 'confirmed'
              ? g.measurement.finalAppliedG || g.plan?.totalGrams || g.totalG
              : isBonusUsed
                ? g.bonus.finalAppliedG || g.plan?.totalGrams || g.totalG
                : g.plan?.totalGrams || g.totalG
          );

          return (
            <Card key={g.groupId}>
              <CardHeader
                onClick={() => toggle(g.groupId)}
                aria-expanded={!!expanded[g.groupId]}
                aria-controls={`panel-${g.groupId}`}
                title={`요청일 ${fmt(g.createdAt)} · 업데이트 ${fmt(g.updatedAt)} · 예약 ${visitLine}`}
              >
                <HeaderLeft>
                  <HLabel>방문 일정</HLabel>
                  <HValue>{visitLine}</HValue>
                  <HeaderMeta>
                    <span>요청 {fmt(g.createdAt, 'yyyy.MM.dd')}</span>
                    <span>·</span>
                    <span>{g.detailsLoaded ? `제품 ${g.items.length}건` : '상세보기'}</span>
                    {g.bonus?.status === 'used' && (
                      <>
                        <span>·</span>
                        <span>
                          적립 순금 {Number(g.bonus.amountG || 0).toFixed(2)}g 적용
                        </span>
                      </>
                    )}
                  </HeaderMeta>
                </HeaderLeft>

                <HeaderRight>
                  <FinalWeight>
                    <small>
                      {isFinalized ? '확정 순금량' : '예상 순금량'}
                    </small>
                    <strong>
                      {fmtG3(finalDisplayG)}g ·{' '}
                      {fmtD2(finalDisplayG / DON_TO_GRAMS)}돈
                    </strong>
                  </FinalWeight>

                  <StatusBadge $status={statusKey}>
                    {displayCustomerStatus(statusKey, g.scheduleActivity)}
                  </StatusBadge>
                  <Chev $open={!!expanded[g.groupId]}>▾</Chev>
                </HeaderRight>
              </CardHeader>

              {expanded[g.groupId] && !legacyMode && detailsByGroup[g.groupId]?.loading && !g.detailsLoaded && (
                <DetailState id={`panel-${g.groupId}`} role="status">상세 내역을 불러오는 중입니다…</DetailState>
              )}

              {expanded[g.groupId] && !legacyMode && detailsByGroup[g.groupId]?.error && (
                <DetailState id={`panel-${g.groupId}`} role="alert">{detailsByGroup[g.groupId].error}</DetailState>
              )}

              {expanded[g.groupId] && (legacyMode || g.detailsLoaded) && (
                <CardBody id={`panel-${g.groupId}`}>
                  {!['canceled', 'rejected'].includes(rawStatusKey) && (
                    <StatusFlow aria-label="교환 진행 단계">
                      {EXCHANGE_PROGRESS_STEPS.map((label, index) => {
                        const progressIndex =
                          rawStatusKey === 'completed' ? 5
                            : rawStatusKey === 'in_progress' ? 4
                              : rawStatusKey === 'scheduled' ? 3
                                : 1;
                        return (
                          <StatusStep
                            key={label}
                            $index={index}
                            $active={index <= progressIndex}
                            $current={index === progressIndex}
                          >
                            {label}
                          </StatusStep>
                        );
                      })}
                    </StatusFlow>
                  )}

                  {isOverdue && (
                    <AttentionNotice role="status">
                      <strong>방문 예정일이 지났지만 완료·취소 처리가 확인되지 않았습니다.</strong>
                      실제 방문 여부나 예약 상태 확인이 필요한 기록입니다. 지난 일정은 온라인에서 변경·취소하지 않고, 아래 문의 기능으로 확인해 주세요.
                    </AttentionNotice>
                  )}

                  {/* 요청 식별 정보는 필요할 때만 확인 */}
                  <RequestDetails>
                    <summary>요청 상세정보</summary>
                    <MetaGrid>
                      <Field>
                        <Label>요청 번호</Label>
                        <Value>{g.groupId}</Value>
                      </Field>
                      <Field>
                        <Label>최근 변경</Label>
                        <Value>{fmt(g.updatedAt)}</Value>
                      </Field>
                      <Field>
                        <Label>요청자</Label>
                        <Value>{g.requester.name}</Value>
                      </Field>
                      <Field>
                        <Label>연락처</Label>
                        <Value>{g.requester.phone}</Value>
                      </Field>
                    </MetaGrid>
                  </RequestDetails>

                  {g.scheduleActivity && (
                    <ScheduleActivity $type={g.scheduleActivity.type}>
                      <strong>
                        {g.scheduleActivity.type === 'canceled'
                          ? '예약 취소'
                          : rawStatusKey === 'requested'
                            ? '일정 변경 확인 대기'
                            : rawStatusKey === 'scheduled'
                              ? '변경된 예약 확정'
                              : '최근 일정 변경'}
                      </strong>
                      <p>
                        {g.scheduleActivity.type === 'canceled'
                          ? `${g.scheduleActivity.previousVisitDate} ${g.scheduleActivity.previousVisitTime}`
                          : `${g.scheduleActivity.previousVisitDate} ${g.scheduleActivity.previousVisitTime} → ${g.scheduleActivity.visitDate} ${g.scheduleActivity.visitTime}`}
                      </p>
                      {g.scheduleActivity.reason && <p>사유: {g.scheduleActivity.reason}</p>}
                      {g.scheduleActivity.requestedAt && (
                        <p>요청 시각: {fmt(g.scheduleActivity.requestedAt)}</p>
                      )}
                    </ScheduleActivity>
                  )}

                  <Divider />

                  {/* 제품 리스트 */}
                  <div>
                    <TableWrap>
                      <ItemsTable>
                      <thead>
                        <tr>
                          <th style={{width: '24%'}}>제품 종류</th>
                          <th style={{width: '30%'}}>요청 수량</th>
                          <th data-col="exchangeType" style={{width: '20%'}}>교환 유형</th>
                          <th data-col="status" style={{width: '16%'}}>상태</th>
                          <th style={{width: '10%'}}>{isFinalized ? '확정 순금량' : '예상 순금량'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.items
                          .slice()
                          .sort(
                            (a, b) => (toJSDate(a.createdAt)?.getTime?.() ?? 0) - (toJSDate(b.createdAt)?.getTime?.() ?? 0)
                          )
                          .map((it) => (
                            <tr key={it.id}>
                              <td>{it.productName || it.goldType || '-'}</td>
                              <td>{it._displayOriginal}</td>
                              <td data-col="exchangeType">
                                {it.unknown ? '현장 확인' : (it.exchangeType || '999.9골드바')}
                              </td>
                              <td data-col="status">{STATUS_LABEL[it.status] || it.status || '-'}</td>
                              <td>
                                <Chips>
                                  <Chip $tone="grams">
                                    {fmtG3(
                                      isFinalized && it._confirmedPureGoldG != null
                                        ? it._confirmedPureGoldG
                                        : it._finalWeight
                                    )} g
                                  </Chip>
                                  <Chip $tone="don">
                                    {fmtD2(
                                      (isFinalized && it._confirmedPureGoldG != null
                                        ? it._confirmedPureGoldG
                                        : it._finalWeight) / DON_TO_GRAMS
                                    )} 돈
                                  </Chip>
                                </Chips>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      </ItemsTable>
                    </TableWrap>

                    <TotalRow>
                      {isFinalized ? '확정 순금량 합계:' : '예상 순금량 합계:'}
                      <Chips>
                        <Chip $tone="grams">
                          {fmtG3(
                            isFinalized && g.measurement?.finalRecognizedG
                              ? g.measurement.finalRecognizedG
                              : g.totalG
                          )} g
                        </Chip>
                        <Chip $tone="don">
                          {fmtD2(
                            Number(
                              isFinalized && g.measurement?.finalRecognizedG
                                ? g.measurement.finalRecognizedG
                                : g.totalG || 0
                            ) / DON_TO_GRAMS
                          )} 돈
                        </Chip>
                      </Chips>
                    </TotalRow>
                  </div>

                  {g.measurement?.status === 'confirmed' && rawStatusKey === 'completed' && (
                    <>
                      <Divider />
                      <PlanCard aria-label="매장 실측 확정 내역">
                        <strong>매장 실측 확정</strong>
                        <PlanRow>
                          <PlanLabel>실측 확정 순금량</PlanLabel>
                          <PlanValue>
                            {fmtG3(g.measurement.finalRecognizedG)} g /{' '}
                            {fmtD2(Number(g.measurement.finalRecognizedG || 0) / DON_TO_GRAMS)} 돈
                          </PlanValue>
                        </PlanRow>
                        <PlanRow>
                          <PlanLabel>최종 적용량</PlanLabel>
                          <PlanValue>
                            <strong>{fmtG3(g.measurement.finalAppliedG)} g</strong>
                          </PlanValue>
                        </PlanRow>
                        <PlanRow>
                          <PlanLabel>최종 제작공임</PlanLabel>
                          <PlanValue>
                            {Number(g.measurement.finalFeeWon || 0).toLocaleString('ko-KR')}원
                          </PlanValue>
                        </PlanRow>
                        <Help>
                          매장에서 실물 확인과 고객 동의를 거쳐 관리자가 완료 처리한 최종 기록입니다. 고객이 온라인에서 별도로 완료 확인할 필요는 없습니다.
                        </Help>
                      </PlanCard>
                    </>
                  )}

                  {g.bonus?.status === "used" && (
                    <>
                      <Divider />
                      <PlanCard aria-label="적립 순금 적용 명세">
                        <strong>적립 순금 적용</strong>
                        <PlanValue>
                          {fmtG3(g.bonus.finalRecognizedG)}g
                          {' + '}
                          적립 {Number(g.bonus.amountG || 0).toFixed(2)}g
                          {' = '}
                          <strong>최종 {fmtG3(g.bonus.finalAppliedG)}g</strong>
                        </PlanValue>
                        <Help>
                          매장에서 본인 확인 후 확정된 사용 내역입니다.
                        </Help>
                      </PlanCard>
                    </>
                  )}

                  {/* 교환 계획 (barsPlan) */}
                  {g.plan && (
                    <>
                      <Divider />
                      <PlanCard>
                        <strong>
                          {isFinalized
                            ? '최종 교환 계획'
                            : '예상 교환 계획'}
                        </strong>

                        {isBonusUsed ? (
                          <>
                            <PlanRow>
                              <PlanLabel>현장 인정</PlanLabel>
                              <PlanValue>
                                {fmtG3(
                                  g.bonus.finalRecognizedG
                                )} g
                              </PlanValue>
                            </PlanRow>
                            <PlanRow>
                              <PlanLabel>적립 순금</PlanLabel>
                              <PlanValue>
                                +{fmtG3(g.bonus.amountG)} g
                              </PlanValue>
                            </PlanRow>
                            <PlanRow>
                              <PlanLabel>최종 합계</PlanLabel>
                              <PlanValue>
                                <strong>
                                  {fmtG3(
                                    g.bonus.finalAppliedG
                                  )} g
                                </strong>{' '}
                                /{' '}
                                {fmtD2(
                                  Number(
                                    g.bonus.finalAppliedG || 0
                                  ) / DON_TO_GRAMS
                                )}{' '}
                                돈
                              </PlanValue>
                            </PlanRow>
                          </>
                        ) : (
                          <PlanRow>
                            <PlanLabel>{isFinalized ? '최종 적용 기준' : '계산 기준'}</PlanLabel>
                            <PlanValue>
                              {fmtG3(planBasisG)} g /{' '}
                              {fmtD2(
                                planBasisG / DON_TO_GRAMS
                              )}{' '}
                              돈
                            </PlanValue>
                          </PlanRow>
                        )}

                        <PlanRow>
                          <PlanLabel>선택 규격</PlanLabel>
                          <PlanValue>
                            {g.plan.selected?.label} ×{' '}
                            {g.plan.selected?.qty}
                          </PlanValue>
                        </PlanRow>
                        <PlanRow>
                          <PlanLabel>골드바 총중량</PlanLabel>
                          <PlanValue>
                            {fmtG3(
                              g.plan.selected?.usedGrams
                            )} g /{' '}
                            {fmtD2(
                              g.plan.selected?.usedDon
                            )} 돈
                          </PlanValue>
                        </PlanRow>
                        {g.plan.requiresTopUp || Number(g.plan.topUpGrams) > 0 ? (
                          <PlanRow>
                            <PlanLabel>{isBonusUsed ? '부족분' : '부족 예상'}</PlanLabel>
                            <PlanValue>
                              <strong>{fmtG3(g.plan.topUpGrams)} g / {fmtD2(g.plan.topUpDon)} 돈</strong>
                              {' · '}골드바 총중량이 현재 계산 기준보다 많은 양입니다. {isBonusUsed
                                ? '확정된 부족분은 안내된 정산 기준을 따릅니다.'
                                : '매장 실측 후 부족분을 당일 적용 기준으로 정산합니다.'}
                            </PlanValue>
                          </PlanRow>
                        ) : (
                          <PlanRow>
                            <PlanLabel>
                              {isBonusUsed ? '최종 잔여' : '잔여 예상'}
                            </PlanLabel>
                            <PlanValue>
                              {fmtG2Min(
                                g.plan.leftoverGrams
                              )} g /{' '}
                              {fmtD2(
                                g.plan.leftoverDon
                              )} 돈
                              {Number(g.plan.leftoverGrams) > 0
                                ? ' · 잔여 금 처리방법은 교환 확정 시 안내합니다.'
                                : ''}
                            </PlanValue>
                          </PlanRow>
                        )}
                        {Array.isArray(g.plan.autoBreakdown) && g.plan.autoBreakdown.length > 0 && (
                          <PlanRow>
                            <PlanLabel>추가 조합</PlanLabel>
                            <PlanValue>
                              {g.plan.autoBreakdown.map((x, i) => (
                                <Pill key={`${x.label}-${i}`}>{x.label} × {x.qty}</Pill>
                              ))}
                            </PlanValue>
                          </PlanRow>
                        )}
                      </PlanCard>
                    </>
                  )}

                  {['requested', 'scheduled'].includes(rawStatusKey) && !isOverdue && (
                    <ScheduleActions group={g} />
                  )}

                  {rawStatusKey === 'canceled' && (
                    <ScheduleActionsPanel aria-label="취소된 예약 다시 신청">
                      <ScheduleActionTitle>다시 예약하시겠어요?</ScheduleActionTitle>
                      <ScheduleActionLead>
                        취소된 예약 기록은 그대로 유지되며, 새로운 날짜와 시간으로 다시 신청할 수 있습니다.
                      </ScheduleActionLead>
                      <ScheduleButtonRow>
                        <ScheduleButton
                          as={Link}
                          to="/gold-exchange"
                          state={{
                            rebook: {
                              sourceGroupId: g.groupId,
                              requester: {
                                name: g.requester?.name && g.requester.name !== '-' ? g.requester.name : '',
                                phone: g.requester?.phone && g.requester.phone !== '-' ? g.requester.phone : '',
                              },
                              products: g.items
                                .filter((item) => !item.unknown && item.goldType && item.goldType !== '미확인')
                                .map((item) => ({
                                  productId: item.productId || '',
                                  productName: item.productName || '',
                                  calculationMethod: item.calculationMethod || '',
                                  goldType: item.goldType,
                                  quantity: String(
                                    item.originalQuantity != null
                                      ? item.originalQuantity
                                      : item.quantity ?? ''
                                  ),
                                  inputUnit: item.inputUnit === 'don' ? 'don' : 'g',
                                  exchangeType: item.exchangeType || '999.9골드바',
                                })),
                              directReservation: g.items.every(
                                (item) => item.unknown || !item.goldType || item.goldType === '미확인'
                              ),
                            },
                          }}
                        >
                          다시 예약 신청하기
                        </ScheduleButton>
                      </ScheduleButtonRow>
                    </ScheduleActionsPanel>
                  )}

                  <ScheduleButtonRow style={{ marginTop: '.75rem' }}>
                    <ScheduleButton
                      as={Link}
                      to={`/support/new?groupId=${encodeURIComponent(g.groupId)}`}
                    >
                      이 교환건 문의하기
                    </ScheduleButton>
                  </ScheduleButtonRow>

                  <GoldExchangeReviewForm
                    exchangeId={g.groupId}
                    status={rawStatusKey}
                  />
                </CardBody>
              )}
            </Card>
          );
        })}
      </CardGrid>

      {!legacyMode && (hasMore || loadMoreError) && (
        <LoadMoreRow>
          {loadMoreError && <LoadMoreError role="alert">{loadMoreError}</LoadMoreError>}
          {hasMore && (
            <LoadMoreButton type="button" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? '불러오는 중…' : '이전 교환내역 더보기'}
            </LoadMoreButton>
          )}
        </LoadMoreRow>
      )}
    </Page>
  );
}