import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { db } from "@/firebase/firebase";
import {
  DEFAULT_EXCHANGE,
  DEFAULT_PURITY,
  subscribeGoldRates,
} from "@/lib/goldRates";
import { saveGoldRates } from "@/services/adminManagementService";

const Page = styled.section`display: grid; gap: 16px; max-width: 920px;`;
const Header = styled.header`
  h1 { margin: 0 0 6px; font-size: clamp(1.55rem, 3vw, 2.1rem); }
  p { margin: 0; color: ${({ theme }) => theme.colors.textSecondary}; }
`;
const Notice = styled.div`
  padding: 13px 15px; border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ theme }) => theme.colors.secondary}; border-radius: 12px;
  background: ${({ theme }) => theme.semantic.alertWarningBg};
  color: ${({ theme }) => theme.semantic.alertWarningText}; line-height: 1.55;
`;
const Card = styled.form`
  display: grid; gap: 16px; padding: clamp(16px, 3vw, 24px);
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface}; box-shadow: ${({ theme }) => theme.shadows.card};
`;
const RateRow = styled.label`
  display: grid; grid-template-columns: minmax(0, 1fr) 150px; gap: 14px; align-items: center;
  padding: 11px 0; border-bottom: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
  span { font-weight: 720; line-height: 1.4; }
  @media (max-width: 620px) { grid-template-columns: 1fr; gap: 7px; }
`;
const PercentInput = styled.div`
  display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px;
  input { width: 100%; min-height: 42px; padding: 8px 10px; border: 1px solid ${({ theme }) => theme.colors.borderStrong}; border-radius: 9px; background: ${({ theme }) => theme.colors.elevated}; color: ${({ theme }) => theme.colors.text}; text-align: right; font: 700 1rem ${({ theme }) => theme.fonts.numeric}; }
`;
const Reason = styled.label`
  display: grid; gap: 7px; font-weight: 750;
  textarea { min-height: 86px; resize: vertical; padding: 11px; border: 1px solid ${({ theme }) => theme.colors.borderStrong}; border-radius: 10px; background: ${({ theme }) => theme.colors.elevated}; color: ${({ theme }) => theme.colors.text}; }
`;
const Actions = styled.div`display: flex; gap: 9px; justify-content: flex-end; flex-wrap: wrap;`;
const Button = styled.button`
  min-height: 43px; padding: 9px 15px; border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 9px; background: ${({ $secondary, theme }) => $secondary ? theme.colors.surface : theme.colors.primary};
  color: ${({ $secondary, theme }) => $secondary ? theme.colors.primary : theme.on.primary}; font-weight: 800; cursor: pointer;
  &:disabled { opacity: .5; cursor: not-allowed; }
`;
const Message = styled.p`
  margin: 0; padding: 11px 13px; border-radius: 10px;
  background: ${({ $error, theme }) => $error ? theme.semantic.alertErrorBg : theme.semantic.alertSuccessBg};
  color: ${({ $error, theme }) => $error ? theme.semantic.alertErrorText : theme.semantic.alertSuccessText};
`;

const toPercentDraft = (rates) => Object.fromEntries(
  Object.entries(rates).map(([key, value]) => [key, String(Number(value) * 100)])
);
const fromPercentDraft = (draft) => Object.fromEntries(
  Object.entries(draft).map(([key, value]) => [key, Number(value) / 100])
);

export default function AdminGoldRates() {
  const [remote, setRemote] = useState(null);
  const [purity, setPurity] = useState(() => toPercentDraft(DEFAULT_PURITY));
  const [exchange, setExchange] = useState(() => toPercentDraft(DEFAULT_EXCHANGE));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => subscribeGoldRates(db, (next) => {
    setRemote(next);
    setPurity(toPercentDraft(next.purity));
    setExchange(toPercentDraft(next.exchange));
  }, (_, err) => setError(err?.message || "환산율을 불러오지 못했습니다.")), []);

  const dirty = useMemo(() => {
    if (!remote) return false;
    return JSON.stringify(fromPercentDraft(purity)) !== JSON.stringify(remote.purity) ||
      JSON.stringify(fromPercentDraft(exchange)) !== JSON.stringify(remote.exchange);
  }, [exchange, purity, remote]);

  const reset = () => {
    if (!remote) return;
    setPurity(toPercentDraft(remote.purity));
    setExchange(toPercentDraft(remote.exchange));
    setReason("");
    setError("");
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!dirty) return setError("변경된 환산율이 없습니다.");
    if (reason.trim().length < 5) return setError("변경 사유를 5자 이상 입력해 주세요.");
    const nextPurity = fromPercentDraft(purity);
    const nextExchange = fromPercentDraft(exchange);
    if (![...Object.values(nextPurity), ...Object.values(nextExchange)].every((value) => Number.isFinite(value) && value > 0 && value <= 1)) {
      return setError("모든 환산율은 0%보다 크고 100% 이하여야 합니다.");
    }
    if (!window.confirm(`환산율 버전 ${remote.version}을 변경하시겠습니까? 새 예약부터 적용됩니다.`)) return;
    setBusy(true);
    try {
      const result = await saveGoldRates({
        purity: nextPurity,
        exchange: nextExchange,
        expectedVersion: remote.version,
        reason: reason.trim(),
      });
      setReason("");
      setMessage(`환산율 버전 ${result.version}으로 저장했습니다.`);
    } catch (err) {
      setError(err?.message?.replace(/^FirebaseError:\s*/i, "") || "환산율 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Header>
        <h1>금교환 환산율</h1>
        <p>현재 운영 버전 {remote?.version || 1} · 값은 퍼센트(%) 기준입니다.</p>
      </Header>
      <Notice>
        저장한 값은 새 금교환 요청의 서버 계산에 적용됩니다. 기존 요청에는 접수 당시 환산율과 버전이 그대로 보존됩니다.
      </Notice>
      <Card onSubmit={submit}>
        <section>
          <h2>품목별 환산율</h2>
          {Object.keys(DEFAULT_PURITY).map((key) => (
            <RateRow key={key}>
              <span>{key}</span>
              <PercentInput>
                <input type="number" min="0.001" max="100" step="0.001" required value={purity[key] ?? ""} onChange={(e) => setPurity((current) => ({ ...current, [key]: e.target.value }))} aria-label={`${key} 환산율`} />
                <b>%</b>
              </PercentInput>
            </RateRow>
          ))}
        </section>
        <section>
          <h2>교환 골드바 적용률</h2>
          {Object.keys(DEFAULT_EXCHANGE).map((key) => (
            <RateRow key={key}>
              <span>{key}</span>
              <PercentInput>
                <input type="number" min="0.001" max="100" step="0.001" required value={exchange[key] ?? ""} onChange={(e) => setExchange((current) => ({ ...current, [key]: e.target.value }))} aria-label={`${key} 적용률`} />
                <b>%</b>
              </PercentInput>
            </RateRow>
          ))}
        </section>
        <Reason>
          변경 사유 (감사 기록)
          <textarea maxLength={200} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 2026년 8월 운영 정책 반영" />
        </Reason>
        {message && <Message role="status">{message}</Message>}
        {error && <Message $error role="alert">{error}</Message>}
        <Actions>
          <Button type="button" $secondary onClick={reset} disabled={busy || !dirty}>변경 취소</Button>
          <Button type="submit" disabled={busy || !remote || !dirty}>{busy ? "저장 중…" : "검토 후 저장"}</Button>
        </Actions>
      </Card>
    </Page>
  );
}
