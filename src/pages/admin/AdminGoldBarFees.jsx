import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useGoldBarFeeConfig, GOLD_BAR_FEE_KEYS } from "@/lib/goldBarFeeSettings";
import { updateGoldBarFees } from "@/services/adminManagementService";

const Shell = styled.main`max-width:1080px; margin:0 auto; display:grid; gap:16px; color:${({theme})=>theme.colors.text};`;
const Intro = styled.header`h1{margin:0 0 7px;font-size:clamp(1.5rem,3vw,2rem)}p{margin:0;color:${({theme})=>theme.colors.textSecondary};line-height:1.55}`;
const Notice = styled.p`margin:0;padding:13px 16px;border-radius:12px;background:${({theme})=>theme.semantic.badgeGoldBg};font-size:.85rem;line-height:1.6`;
const Panel = styled.form`display:grid;gap:15px;padding:clamp(14px,2.5vw,24px);border:1px solid ${({theme})=>theme.colors.border};border-radius:17px;background:${({theme})=>theme.colors.surface};`;
const Grid = styled.div`display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;@media(max-width:780px){grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:520px){grid-template-columns:1fr}`;
const Row = styled.label`display:grid;gap:6px;font-size:.85rem;font-weight:850;color:${({theme})=>theme.colors.primary};input{width:100%;min-height:44px;border:1px solid ${({theme})=>theme.colors.borderStrong};border-radius:10px;padding:8px 12px;background:${({theme})=>theme.colors.surface};color:${({theme})=>theme.colors.text};font:inherit;font-variant-numeric:tabular-nums;}small{color:${({theme})=>theme.colors.textSecondary};font-weight:500}`;
const Button = styled.button`min-height:44px;border:0;border-radius:12px;background:${({theme})=>theme.colors.primary};color:${({theme})=>theme.on.primary};padding:9px 16px;font-weight:900;cursor:pointer;&:disabled{opacity:.5;cursor:not-allowed}`;
const Actions = styled.div`display:flex;flex-wrap:wrap;justify-content:flex-end;gap:9px;`;
const ErrorBox = styled.p`margin:0;color:${({theme})=>theme.colors.error};font-size:.86rem;`;

const DESCRIPTION = {
  "g-1":"1g", "g-2":"2g (공임 안내)", "g-3":"3g", "g-5":"5g", "g-10":"10g", "g-20":"20g", "g-30":"30g", "g-50":"50g", "g-100":"100g", "g-500":"500g",
  "d-1":"1돈 · 3.75g", "d-2":"2돈 · 7.5g", "d-3":"3돈 · 11.25g", "d-5":"5돈 · 18.75g", "d-10":"10돈 · 37.5g", "d-15":"15돈 · 56.25g", "d-20":"20돈 · 75g", "d-50":"50돈 (공임 안내)",
  "range-1-3":"일반 중량 1~3돈 미만", "range-3-10":"일반 중량 3~10돈", "range-11-14":"공임 안내 11~14돈", "range-20-30":"일반 중량 20~30돈",
};

export default function AdminGoldBarFees() {
  const config = useGoldBarFeeConfig();
  const [draft, setDraft] = useState(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const ready = config.status === "ready" || config.status === "defaults";

  useEffect(() => {
    if (!ready || !config.fees) return;
    setDraft(Object.fromEntries(GOLD_BAR_FEE_KEYS.map(key => [key, String(config.fees[key])])));
    setReason("");
  }, [config.version, config.status, ready, config.fees]);

  const dirty = useMemo(() => draft && config.fees && GOLD_BAR_FEE_KEYS.some((key) => draft[key] !== String(config.fees[key])), [draft, config.fees]);
  const patch = (key, value) => { setMessage(""); setDraft((before) => ({ ...before, [key]: value })); };

  const submit = async (event) => {
    event.preventDefault();
    setMessage(""); setError("");
    if (!ready || !draft || !dirty) return;
    if (reason.trim().length < 5 || reason.trim().length > 200) return setError("변경 사유를 5~200자로 입력해 주세요.");
    const fees = {};
    for (const key of GOLD_BAR_FEE_KEYS) {
      const raw = String(draft[key] ?? "").trim();
      if (!/^\d+$/.test(raw)) return setError(`${DESCRIPTION[key] || key}: 공임은 0 이상의 정수여야 합니다.`);
      const fee = Number(raw);
      if (!Number.isSafeInteger(fee) || fee > 2_000_000) return setError(`${DESCRIPTION[key] || key}: 최대 200만원까지 설정할 수 있습니다.`);
      fees[key] = fee;
    }
    if (!window.confirm(`제작공임표 버전 ${config.version} → ${config.version + 1}로 변경하시겠습니까? 새 예약부터 적용됩니다.`)) return;
    setSaving(true);
    try {
      const result = await updateGoldBarFees({ fees, expectedVersion: config.version, reason: reason.trim() });
      setMessage(`제작공임표 버전 ${result.version}으로 저장했습니다. 사용자 화면에 자동 반영됩니다.`);
      setReason("");
    } catch (err) {
      setError(err?.message || "공임표 저장에 실패했습니다. 현재 버전과 권한을 확인해 주세요.");
    } finally { setSaving(false); }
  };

  return <Shell>
    <Intro><h1>골드바 제작공임 관리</h1><p>관리자가 저장한 공임표를 금교환·공임 안내·웹과 앱에서 함께 사용합니다. 현재 버전: {config.version}{config.status === "defaults" ? " (기존 기본 공임)" : ""}</p></Intro>
    <Notice>공임은 선택한 골드바의 제작비이며 부족한 금의 추가 비용과는 별개입니다. 0원도 유효한 금액입니다. 기존 예약의 안내 금액은 변경하지 않고 새 예약부터 적용됩니다. 교환 완료 시 최종 공임은 매장 실측과 고객 동의로 별도 확정됩니다.</Notice>
    {!ready && <ErrorBox role="alert">{config.status === "loading" ? "공임표를 불러오는 중입니다." : config.status === "cached" ? "오프라인 상태입니다. 온라인으로 연결한 뒤 수정해 주세요." : config.error}</ErrorBox>}
    {ready && draft && <Panel onSubmit={submit}>
      <Grid>{GOLD_BAR_FEE_KEYS.map((key) => <Row key={key}>
        {DESCRIPTION[key] || key}
        <input aria-label={`${DESCRIPTION[key] || key} 제작공임 원`} type="number" min="0" max="2000000" step="1000" inputMode="numeric" value={draft[key] ?? ""} onChange={(event) => patch(key, event.target.value)} disabled={saving}/>
        <small>원 · {key}</small>
      </Row>)}</Grid>
      <Row>변경 사유 (감사 기록)<input maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="예: 제작 원가 조정으로 규격별 공임 반영" disabled={saving}/></Row>
      {error && <ErrorBox role="alert">{error}</ErrorBox>}
      {message && <p role="status">{message}</p>}
      <Actions><Button type="button" disabled={saving || !dirty} onClick={() => {setDraft(Object.fromEntries(GOLD_BAR_FEE_KEYS.map(key=>[key,String(config.fees[key])] )));setError("");}}>변경 취소</Button><Button disabled={saving || !dirty || !reason.trim()} type="submit">{saving ? "저장 중…" : "공임 변경 저장"}</Button></Actions>
    </Panel>}
  </Shell>;
}
