import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { addDays, format } from "date-fns";
import useBookingAvailability, {
  BOOKING_TIME_SLOTS,
  normalizeBookingAvailabilityEntry,
} from "@/hooks/useBookingAvailability";
import { saveBookingAvailability } from "@/services/bookingAvailabilityClient";

const Panel = styled.section`
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
`;
const Header = styled.div`
  display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  strong { font-size: 1rem; color: ${({ theme }) => theme.colors.text}; }
  span { font-size: .8rem; color: ${({ theme }) => theme.colors.textSecondary}; }
`;
const Grid = styled.div`
  display: grid; grid-template-columns: minmax(160px, 220px) minmax(0, 1fr); gap: 10px 14px;
  @media (max-width: 680px) { grid-template-columns: 1fr; }
`;
const Field = styled.label`
  display: grid; gap: 6px; font-size: .82rem; font-weight: 750; color: ${({ theme }) => theme.colors.text};
  input { min-height: 40px; padding: 7px 9px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 8px; background: ${({ theme }) => theme.colors.background}; color: ${({ theme }) => theme.colors.text}; }
`;
const Slots = styled.div`
  display: flex; flex-wrap: wrap; gap: 7px;
  label { display: inline-flex; align-items: center; gap: 5px; padding: 7px 9px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 8px; font-size: .8rem; }
`;
const Actions = styled.div`display:flex; gap:8px; flex-wrap:wrap;`;
const Button = styled.button`
  min-height: 38px; padding: 7px 12px; border: 1px solid ${({ theme }) => theme.colors.primary}; border-radius: 8px;
  background: ${({ $secondary, theme }) => $secondary ? theme.colors.surface : theme.colors.primary};
  color: ${({ $secondary, theme }) => $secondary ? theme.colors.text : theme.on.primary}; font-weight: 800; cursor: pointer;
  &:disabled { opacity: .55; cursor: not-allowed; }
`;
const Message = styled.p`margin:0; font-size:.82rem; color:${({ $error, theme }) => $error ? theme.colors.error : theme.colors.textSecondary};`;
const Upcoming = styled.div`
  display:flex; gap:6px; flex-wrap:wrap; padding-top:2px;
  span { padding:6px 8px; border-radius:999px; background:${({ theme }) => theme.colors.surfaceAlt}; color:${({ theme }) => theme.colors.textSecondary}; font-size:.76rem; }
`;

export default function BookingAvailabilityManager() {
  const { dates } = useBookingAvailability();
  const [dateKey, setDateKey] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [closed, setClosed] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const entry = normalizeBookingAvailabilityEntry(dates?.[dateKey]);
    setClosed(entry.closed);
    setBlockedSlots([...entry.blockedSlots]);
    setReason(entry.reason);
    setMessage(""); setError("");
  }, [dateKey, dates]);

  const upcoming = useMemo(() => Object.entries(dates || {})
    .filter(([key, value]) => key >= format(new Date(), "yyyy-MM-dd") && (value?.closed || value?.blockedSlots?.length))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 8), [dates]);

  const toggleSlot = (slot) => setBlockedSlots((current) =>
    current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot]
  );

  const save = async (clear = false) => {
    setBusy(true); setMessage(""); setError("");
    try {
      await saveBookingAvailability({
        dateKey,
        closed: clear ? false : closed,
        blockedSlots: clear ? [] : blockedSlots,
        reason: clear ? "" : reason,
      });
      setMessage(clear ? "해당 날짜의 예약 제한을 해제했습니다." : "예약 가능일 설정을 저장했습니다.");
    } catch (e) {
      setError(e?.message || "예약 가능일 설정을 저장하지 못했습니다.");
    } finally { setBusy(false); }
  };

  return (
    <Panel aria-label="예약 가능일 관리">
      <Header>
        <div><strong>예약 가능일 관리</strong><br/><span>휴무일 또는 특정 시간 예약 마감을 설정합니다. 기존 확정 예약은 자동 취소되지 않습니다.</span></div>
      </Header>
      <Grid>
        <Field>날짜
          <input type="date" value={dateKey} min={format(new Date(), "yyyy-MM-dd")} max={format(addDays(new Date(), 60), "yyyy-MM-dd")} onChange={(e) => setDateKey(e.target.value)} />
        </Field>
        <Field>사유(고객에게 표시)
          <input value={reason} maxLength={120} placeholder="예: 추석 휴무 / 외부 일정" onChange={(e) => setReason(e.target.value.slice(0, 120))} />
        </Field>
      </Grid>
      <label><input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} /> 하루 전체 예약 마감</label>
      <div>
        <div style={{fontSize:'.82rem', fontWeight:750, marginBottom:6}}>시간별 마감</div>
        <Slots>{BOOKING_TIME_SLOTS.map((slot) => <label key={slot}><input type="checkbox" disabled={closed} checked={blockedSlots.includes(slot)} onChange={() => toggleSlot(slot)} />{slot}</label>)}</Slots>
      </div>
      <Actions>
        <Button type="button" onClick={() => save(false)} disabled={busy}>{busy ? "저장 중…" : "설정 저장"}</Button>
        <Button type="button" $secondary onClick={() => save(true)} disabled={busy}>이 날짜 제한 해제</Button>
      </Actions>
      {message && <Message>{message}</Message>}{error && <Message $error role="alert">{error}</Message>}
      {upcoming.length > 0 && <Upcoming>{upcoming.map(([key, value]) => {
        const entry = normalizeBookingAvailabilityEntry(value);
        return <span key={key}>{key} · {entry.closed ? "전체 마감" : `${entry.blockedSlots.size}개 시간 마감`}{entry.reason ? ` · ${entry.reason}` : ""}</span>;
      })}</Upcoming>}
    </Panel>
  );
}
