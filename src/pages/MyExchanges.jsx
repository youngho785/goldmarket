// src/pages/MyExchanges.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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
  in_progress: '교환중',
  교환중: '교환중',
  scheduled: '예약 확정',
  completed: '교환완료',
  canceled: '취소',
  rejected: '거절',
};

// 대표 상태 선택 우선순위 (인덱스가 작을수록 우선)
const STATUS_PRIORITY = ['rejected', 'canceled', 'completed', 'scheduled', 'in_progress', '교환중', 'requested'];
const TIME_SLOTS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

// 필터용 그룹
const FILTER_LABEL = {
  all: '전체',
  active: '진행중',     // requested / in_progress(교환중)
  scheduled: '예약',
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

const toJSDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
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
  padding: 20px 16px 3rem;
  box-sizing: border-box;
  overflow-x: hidden;

  @media (max-width: 720px) {
    padding: 12px 10px 2.5rem;
  }
`;

const PageHeader = styled.header`
  width: 100%;
  min-width: 0;
  margin-bottom: 14px;
  padding: clamp(20px, 4vw, 32px);
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 520px) {
    padding: 18px 15px;
  }
`;

const Kicker = styled.p`
  margin: 0 0 8px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .69rem;
  font-weight: 850;
  letter-spacing: .15em;
`;

const HeaderLead = styled.p`
  max-width: 680px;
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  line-height: 1.55;
`;

const SectionTitle = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(1.65rem, 4vw, 2.45rem);
`;

const FilterBar = styled.div`
  width: 100%;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 12px;
`;

const FilterChip = styled.button`
  min-height: 36px;
  padding: 7px 11px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) =>
    $active
      ? theme.colors.goldLight
      : theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
`;

const Count = styled.span`
  margin-left: .35rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`;

const CardGrid = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
`;

const Card = styled.article`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const CardHeader = styled.button`
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 13px 15px;
  box-sizing: border-box;
  border: 0;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 9px;
    padding: 12px;
  }
`;

const HeaderLeft = styled.div`
  min-width: 0;
  display: grid;
  gap: 4px;
`;

const HLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.76rem;
  font-weight: 750;
`;

const HValue = styled.span`
  min-width: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  font-weight: 850;
  line-height: 1.35;
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
  gap: 2px;
  text-align: right;

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.72rem;
  }

  strong {
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: 1rem;
    font-weight: 900;
  }

  @media (max-width: 640px) {
    min-width: 0;
    text-align: left;
  }
`;

const StatusBadge = styled.span`
  padding: .32rem .6rem;
  border-radius: 9999px;
  font-weight: 800;
  font-size: .83rem;
  background: ${({ $status, theme }) => {
    if ($status === 'requested') return theme.colors.warning;
    if ($status === 'scheduled') return theme.colors.success;
    if ($status === 'completed') return theme.colors.secondary;
    if ($status === 'rejected') return theme.colors.error;
    if ($status === 'in_progress' || $status === '교환중') return theme.colors.info;
    return theme.colors.gray;
  }};
  color: ${({ $status, theme }) => ($status === 'requested' ? theme.on.warning : theme.on.primary)};
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
  gap: 12px;
  padding: 13px 15px 16px;
  box-sizing: border-box;
  overflow: hidden;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  > * {
    min-width: 0;
    max-width: 100%;
  }

  @media (max-width: 640px) {
    padding: 11px 10px 14px;
  }
`;

const MetaGrid = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 14px;
  padding: 10px 12px;
  box-sizing: border-box;
  border-radius: 10px;
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

const PlanCard = styled.div`
  width: 100%;
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  box-sizing: border-box;
  overflow-wrap: anywhere;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  font-size: 0.84rem;
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

const ScheduleActivity = styled.div`
  padding: .8rem .9rem;
  border-left: 3px solid ${({ $type, theme }) =>
    $type === 'canceled' ? theme.colors.error : theme.colors.warning};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  strong { color: ${({ theme }) => theme.colors.text}; }
  p { margin: .3rem 0 0; }
`;

const ScheduleActionsPanel = styled.section`
  width: 100%;
  min-width: 0;
  margin-top: .25rem;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};

  @media (max-width: 640px) {
    padding: 12px;
  }
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
  min-height: 42px;
  padding: .55rem .85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border: 1px solid ${({ $danger, theme }) =>
    $danger ? theme.colors.error : theme.colors.primary};
  background: ${({ $danger, theme }) =>
    $danger ? theme.colors.surface : theme.colors.primary};
  color: ${({ $danger, theme }) =>
    $danger ? theme.colors.error : theme.on.primary};
  font-weight: 800;
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: .55; }
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
        <ScheduleButton type="button" $danger onClick={() => openMode('cancel')} disabled={busy}>
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
            <ScheduleButton type="button" $danger onClick={closeMode} disabled={busy}>닫기</ScheduleButton>
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
            <ScheduleButton type="button" $danger onClick={submitCancellation} disabled={busy}>
              {busy ? '취소 처리 중…' : '예약 취소 확정'}
            </ScheduleButton>
            <ScheduleButton type="button" onClick={closeMode} disabled={busy}>돌아가기</ScheduleButton>
          </ScheduleButtonRow>
        </ScheduleForm>
      )}
    </ScheduleActionsPanel>
  );
}

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
  const [docsA, setDocsA] = useState([]); // userId == uid
  const [docsB, setDocsB] = useState([]); // participants array-contains uid
  const [groupSummaries, setGroupSummaries] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | scheduled | completed | canceled | rejected

  // 구독
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    const qUser = query(collection(db, 'goldExchanges'), where('userId', '==', user.uid));
    const qPart = query(collection(db, 'goldExchanges'), where('participants', 'array-contains', user.uid));
    const qGroups = query(collection(db, 'goldExchangeGroups'), where('ownerUid', '==', user.uid));

    const unsub1 = onSnapshot(
      qUser,
      (snap) => {
        setDocsA(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr('내 교환 내역을 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    );
    const unsub2 = onSnapshot(
      qPart,
      (snap) => setDocsB(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsub3 = onSnapshot(
      qGroups,
      (snap) => {
        const next = {};
        snap.docs.forEach((d) => {
          next[d.id] = { id: d.id, ...d.data() };
        });
        setGroupSummaries(next);
      },
      (e) => {
        // 레거시 그룹처럼 ownerUid가 없는 문서는 기존 goldExchanges 구독으로 계속 표시됩니다.
        console.warn('[MyExchanges] group summary subscribe failed:', e);
      }
    );

    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
    };
  }, [user?.uid]);

  // 병합 + 중복 제거 + 그룹핑
  const groups = useMemo(() => {
    // 1) id 기준 중복 제거
    const byId = new Map();
    for (const d of [...docsA, ...docsB]) {
      if (!byId.has(d.id)) byId.set(d.id, d);
    }
    const merged = [...byId.values()];

    // 2) groupId로 묶기
    const map = new Map();
    merged.forEach((doc) => {
      const gid = doc.groupId || doc.id;
      if (!map.has(gid)) map.set(gid, []);
      map.get(gid).push(doc);
    });

    const out = [];
    for (const [gid, items] of map) {
      const summary = groupSummaries[gid] || {};
      const statuses = items.map((i) => i.status).filter(Boolean);
      const itemRepStatus =
        statuses.sort(
          (a, b) => STATUS_PRIORITY.indexOf(a ?? 'requested') - STATUS_PRIORITY.indexOf(b ?? 'requested')
        )[0] || 'requested';
      const repStatus = String(summary.repStatus || itemRepStatus || 'requested');

      const createdNs = items
        .map((i) => toJSDate(i.createdAt)?.getTime?.())
        .filter((n) => Number.isFinite(n));
      const updatedNs = items
        .map((i) => toJSDate(i.updatedAt)?.getTime?.())
        .filter((n) => Number.isFinite(n));

      const summaryCreatedAt = toJSDate(summary.createdAt);
      const summaryUpdatedAt = toJSDate(summary.updatedAt);
      const createdAt = summaryCreatedAt || (createdNs.length ? new Date(Math.min(...createdNs)) : null);
      const updatedAt = summaryUpdatedAt || (updatedNs.length ? new Date(Math.max(...updatedNs)) : null);

      const any = items[0] || {};
      const visitDate = String(summary.visitDate || any.visitDate || '');
      const visitTime = String(summary.visitTime || any.visitTime || '');
      const scheduledAt = toJSDate(summary.scheduledAt || any.scheduledAt) ?? null;

      const latestByUpdate =
        items
          .slice()
          .sort(
            (a, b) => (toJSDate(b.updatedAt)?.getTime?.() ?? 0) - (toJSDate(a.updatedAt)?.getTime?.() ?? 0)
          )[0] || {};

      const requester = {
        name: latestByUpdate.name || latestByUpdate.requesterName || user?.displayName || '-',
        phone: latestByUpdate.phone || '-',
      };

      const enrichedItems = items.map((it) => {
        // 저장된 최종 교환중량(finalWeight, g)만 사용
        const fwNum = Number.isFinite(Number(it.finalWeight)) ? Number(it.finalWeight) : 0;
        const fwDon = Number.isFinite(Number(it.finalWeightDon)) ? Number(it.finalWeightDon) : fwNum / DON_TO_GRAMS;

        return {
          ...it,
          _displayOriginal: displayOriginalQty(it),
          _finalWeight: fwNum,
          _finalWeightDon: fwDon,
        };
      });

      const totalG = enrichedItems.reduce((s, i) => s + (Number(i._finalWeight) || 0), 0);
      const bonus = latestByUpdate.bonusGoldUsageStatus
        ? {
            status: String(latestByUpdate.bonusGoldUsageStatus),
            amountG: Number(latestByUpdate.bonusGoldUsedG || 0),
            finalRecognizedG: Number(
              latestByUpdate.finalRecognizedG || 0
            ),
            finalAppliedG: Number(
              latestByUpdate.finalAppliedG || 0
            ),
          }
        : null;
      const scheduleType = String(summary.scheduleChangeType || latestByUpdate.scheduleChangeType || '');
      const scheduleActivity = scheduleType ? {
        type: scheduleType,
        previousVisitDate: String(summary.previousVisitDate || latestByUpdate.previousVisitDate || ''),
        previousVisitTime: String(summary.previousVisitTime || latestByUpdate.previousVisitTime || ''),
        visitDate: String(summary.visitDate || latestByUpdate.visitDate || visitDate || ''),
        visitTime: String(summary.visitTime || latestByUpdate.visitTime || visitTime || ''),
        reason: String(
          scheduleType === 'canceled'
            ? (
                summary.cancellationReason ||
                latestByUpdate.cancellationReason ||
                ''
              )
            : (
                summary.scheduleChangeReason ||
                latestByUpdate.scheduleChangeReason ||
                ''
              )
        ),
        requestedAt: toJSDate(
          summary.scheduleChangeRequestedAt ||
          summary.cancellationRequestedAt ||
          latestByUpdate.scheduleChangeRequestedAt ||
          latestByUpdate.cancellationRequestedAt
        ),
      } : null;

      // 최신 barsPlan 보유 문서
      const planDoc = items
        .filter((i) => i.barsPlan)
        .sort(
          (a, b) => (toJSDate(b.updatedAt)?.getTime?.() ?? 0) - (toJSDate(a.updatedAt)?.getTime?.() ?? 0)
        )[0] || null;

      out.push({
        groupId: gid,
        items: enrichedItems,
        repStatus,
        createdAt,
        updatedAt,
        visitDate,
        visitTime,
        scheduledAt,
        requester,
        totalG,
        bonus,
        scheduleActivity,
        plan: planDoc ? planDoc.barsPlan : null,
      });
    }

    out.sort((a, b) => {
      const at = a.updatedAt && isValid(a.updatedAt) ? a.updatedAt.getTime() : 0;
      const bt = b.updatedAt && isValid(b.updatedAt) ? b.updatedAt.getTime() : 0;
      return bt - at;
    });

    return out;
  }, [docsA, docsB, groupSummaries, user?.displayName]);

  const toggle = (gid) => setExpanded((p) => ({ ...p, [gid]: !p[gid] }));

  // 필터링
  const groupsFiltered = useMemo(() => {
    if (statusFilter === 'all') return groups;
    if (statusFilter === 'active') {
      return groups.filter(g => ['requested','in_progress','교환중'].includes(g.repStatus));
    }
    return groups.filter(g => g.repStatus === statusFilter);
  }, [groups, statusFilter]);

  // 필터별 카운트
  const counts = useMemo(() => {
    const base = { all: groups.length, active: 0, scheduled: 0, completed: 0, canceled: 0, rejected: 0 };
    for (const g of groups) {
      if (['requested','in_progress','교환중'].includes(g.repStatus)) base.active += 1;
      if (g.repStatus === 'scheduled') base.scheduled += 1;
      if (g.repStatus === 'completed') base.completed += 1;
      if (g.repStatus === 'canceled') base.canceled += 1;
      if (g.repStatus === 'rejected') base.rejected += 1;
    }
    return base;
  }, [groups]);

  /* ── 렌더 ───────────────────────────────────── */
  if (!user) return <Page><Empty>로그인이 필요합니다.</Empty></Page>;
  if (loading) return (
    <Page>
      <PageHeader>
        <Kicker>MY EXCHANGE LEDGER</Kicker>
        <SectionTitle>나의 금 교환 내역</SectionTitle>
        <HeaderLead>예약 상태와 최종 교환 중량을 확인하고, 필요한 내역만 펼쳐볼 수 있습니다.</HeaderLead>
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
  if (groups.length === 0) return <Page><Empty>등록된 교환 요청이 없습니다.</Empty></Page>;

  return (
    <Page>
      <PageHeader>
        <Kicker>MY EXCHANGE LEDGER</Kicker>
        <SectionTitle>나의 금 교환 내역</SectionTitle>
        <HeaderLead>예약 상태와 최종 교환 중량을 확인하고, 필요한 내역만 펼쳐볼 수 있습니다.</HeaderLead>
      </PageHeader>

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
            <Count>{counts[key] ?? 0}</Count>
          </FilterChip>
        ))}
      </FilterBar>

      <CardGrid>
        {groupsFiltered.map((g) => {
          const statusKey = g.repStatus === '교환중' ? 'in_progress' : g.repStatus;
          const visitLine =
            [g.visitDate, g.visitTime]
              .filter(Boolean)
              .join(' ') || '-';
          const isBonusUsed = g.bonus?.status === 'used';
          const planBasisG = Number(
            isBonusUsed
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
                    <span>제품 {g.items.length}건</span>
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
                      {g.bonus?.status === 'used'
                        ? '최종 적용 중량'
                        : '예상 교환 중량'}
                    </small>
                    <strong>
                      {fmtG3(
                        g.bonus?.status === 'used'
                          ? g.bonus.finalAppliedG
                          : g.totalG
                      )}g ·{' '}
                      {fmtD2(
                        Number(
                          g.bonus?.status === 'used'
                            ? g.bonus.finalAppliedG
                            : g.totalG
                        ) / DON_TO_GRAMS
                      )}돈
                    </strong>
                  </FinalWeight>

                  <StatusBadge $status={statusKey}>
                    {displayCustomerStatus(statusKey, g.scheduleActivity)}
                  </StatusBadge>
                  <Chev $open={!!expanded[g.groupId]}>▾</Chev>
                </HeaderRight>
              </CardHeader>

              {expanded[g.groupId] && (
                <CardBody id={`panel-${g.groupId}`}>
                  {/* 예약/요청자 정보 */}
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

                  {g.scheduleActivity && (
                    <ScheduleActivity $type={g.scheduleActivity.type}>
                      <strong>
                        {g.scheduleActivity.type === 'canceled'
                          ? '예약 취소'
                          : statusKey === 'requested'
                            ? '일정 변경 확인 대기'
                            : statusKey === 'scheduled'
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
                          <th style={{width: '10%'}}>교환 중량</th>
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
                              <td>{it.goldType || '-'}</td>
                              <td>{it._displayOriginal}</td>
                              <td data-col="exchangeType">
                                {it.unknown ? '현장 확인' : (it.exchangeType || '999.9골드바')}
                              </td>
                              <td data-col="status">{STATUS_LABEL[it.status] || it.status || '-'}</td>
                              <td>
                                <Chips>
                                  <Chip $tone="grams">{fmtG3(it._finalWeight)} g</Chip>
                                  <Chip $tone="don">{fmtD2(it._finalWeightDon)} 돈</Chip>
                                </Chips>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                      </ItemsTable>
                    </TableWrap>

                    <TotalRow>
                      합계(순금 중량):
                      <Chips>
                        <Chip $tone="grams">{fmtG3(g.totalG)} g</Chip>
                        <Chip $tone="don">{fmtD2((g.totalG || 0) / DON_TO_GRAMS)} 돈</Chip>
                      </Chips>
                    </TotalRow>
                  </div>

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
                          {isBonusUsed
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
                            <PlanLabel>계산 기준</PlanLabel>
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
                            <PlanLabel>추가 예정</PlanLabel>
                            <PlanValue>
                              <strong>+{fmtG3(g.plan.topUpGrams)} g / {fmtD2(g.plan.topUpDon)} 돈</strong>
                              {' · '}방문 시 실측 후 최종 확정
                            </PlanValue>
                          </PlanRow>
                        ) : (
                          <PlanRow>
                            <PlanLabel>
                              {isBonusUsed ? '최종 잔여' : '예상 잔여'}
                            </PlanLabel>
                            <PlanValue>
                              {fmtG2Min(
                                g.plan.leftoverGrams
                              )} g /{' '}
                              {fmtD2(
                                g.plan.leftoverDon
                              )} 돈
                              {Number(g.plan.leftoverGrams) > 0
                                ? ' · 남은 금은 매입 가능합니다.'
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

                  {['requested', 'scheduled'].includes(statusKey) && (
                    <ScheduleActions group={g} />
                  )}

                  {statusKey === 'canceled' && (
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

                  <GoldExchangeReviewForm
                    exchangeId={g.groupId}
                    status={statusKey}
                  />
                </CardBody>
              )}
            </Card>
          );
        })}
      </CardGrid>
    </Page>
  );
}