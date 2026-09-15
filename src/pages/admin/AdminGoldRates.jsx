import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { db } from "@/firebase/firebase";
import {
  DEFAULT_EXCHANGE,
  DEFAULT_GOLD_PRODUCTS,
  GOLD_CALCULATION_METHODS,
  subscribeGoldRates,
} from "@/lib/goldRates";
import { saveGoldRates } from "@/services/adminManagementService";

const Page = styled.section`display:grid;gap:16px;max-width:1080px;`;
const Header = styled.header`h1{margin:0 0 6px;font-size:clamp(1.55rem,3vw,2.1rem)}p{margin:0;color:${({theme})=>theme.colors.textSecondary}}`;
const Notice = styled.div`padding:13px 15px;border:1px solid ${({theme})=>theme.colors.border};border-left:4px solid ${({theme})=>theme.colors.secondary};border-radius:12px;background:${({theme})=>theme.semantic.alertWarningBg};color:${({theme})=>theme.semantic.alertWarningText};line-height:1.55;`;
const Card = styled.form`display:grid;gap:16px;padding:clamp(16px,3vw,24px);border:1px solid ${({theme})=>theme.colors.border};border-radius:16px;background:${({theme})=>theme.colors.surface};box-shadow:${({theme})=>theme.shadows.card};`;
const ProductCard = styled.section`display:grid;gap:12px;padding:14px;border:1px solid ${({theme})=>theme.colors.border};border-radius:13px;background:${({theme})=>theme.colors.elevated};`;
const ProductHead = styled.div`display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap;strong{font-size:1rem}small{color:${({theme})=>theme.colors.textSecondary};font-family:${({theme})=>theme.fonts.numeric}}`;
const Grid = styled.div`display:grid;grid-template-columns:2fr 1.2fr 1fr 1.2fr 1fr;gap:10px;@media(max-width:900px){grid-template-columns:1fr 1fr}@media(max-width:480px){grid-template-columns:1fr}`;
const Field = styled.label`display:grid;gap:6px;font-size:.78rem;font-weight:800;color:${({theme})=>theme.colors.textSecondary};input,select{min-height:42px;padding:8px 10px;border:1px solid ${({theme})=>theme.colors.borderStrong};border-radius:9px;background:${({theme})=>theme.colors.surface};color:${({theme})=>theme.colors.text};font:700 .94rem ${({theme})=>theme.fonts.numeric}}`;
const Checks = styled.div`display:flex;gap:14px;flex-wrap:wrap;label{display:inline-flex;align-items:center;gap:6px;font-size:.82rem;font-weight:760}`;
const Reason = styled.label`display:grid;gap:7px;font-weight:750;textarea{min-height:86px;resize:vertical;padding:11px;border:1px solid ${({theme})=>theme.colors.borderStrong};border-radius:10px;background:${({theme})=>theme.colors.elevated};color:${({theme})=>theme.colors.text}}`;
const Actions = styled.div`display:flex;gap:9px;justify-content:flex-end;flex-wrap:wrap;`;
const Button = styled.button`min-height:43px;padding:9px 15px;border:1px solid ${({theme})=>theme.colors.primary};border-radius:9px;background:${({$secondary,theme})=>$secondary?theme.colors.surface:theme.colors.primary};color:${({$secondary,theme})=>$secondary?theme.colors.primary:theme.on.primary};font-weight:800;cursor:pointer;&:disabled{opacity:.5;cursor:not-allowed}`;
const Message = styled.p`margin:0;padding:11px 13px;border-radius:10px;background:${({$error,theme})=>$error?theme.semantic.alertErrorBg:theme.semantic.alertSuccessBg};color:${({$error,theme})=>$error?theme.semantic.alertErrorText:theme.semantic.alertSuccessText};`;

const cloneProducts = (products) => Object.fromEntries(
  Object.entries(products || {}).map(([id, product]) => [id, { ...product, id }])
);

function makeCustomId(existing) {
  let id = `custom-${Date.now().toString(36)}`;
  let index = 1;
  while (existing[id]) id = `custom-${Date.now().toString(36)}-${index++}`;
  return id;
}

function methodLabel(method) {
  if (method === GOLD_CALCULATION_METHODS.RATE) return "환산율";
  if (method === GOLD_CALCULATION_METHODS.REFINING_FEE) return "정련비";
  if (method === GOLD_CALCULATION_METHODS.FULL) return "100% 인정";
  return "현장 확인";
}

export default function AdminGoldRates() {
  const [remote, setRemote] = useState(null);
  const [products, setProducts] = useState(() => cloneProducts(DEFAULT_GOLD_PRODUCTS));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => subscribeGoldRates(db, (next) => {
    setRemote(next);
    setProducts(cloneProducts(next.products));
  }, (_, err) => setError(err?.message || "금제품 정책을 불러오지 못했습니다.")), []);

  const dirty = useMemo(() => remote && JSON.stringify(products) !== JSON.stringify(remote.products), [products, remote]);
  const ordered = useMemo(() => Object.values(products).sort((a,b)=>(Number(a.sortOrder)||999)-(Number(b.sortOrder)||999)), [products]);

  const patchProduct = (id, patch) => setProducts((current) => ({ ...current, [id]: { ...current[id], ...patch, id } }));
  const addProduct = () => {
    const id = makeCustomId(products);
    setProducts((current) => ({
      ...current,
      [id]: {
        id,
        displayName: "새 금제품",
        legacyGoldType: "",
        calculationMethod: "manual",
        conversionRate: 0,
        refiningFeePerDon: 0,
        valuationPriceBasis: "pure",
        active: true,
        myGoldEnabled: false,
        exchangeEnabled: true,
        sortOrder: Math.max(0, ...Object.values(current).map((row) => Number(row.sortOrder) || 0)) + 10,
      },
    }));
  };
  const reset = () => {
    if (!remote) return;
    setProducts(cloneProducts(remote.products));
    setReason(""); setError(""); setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    if (!dirty) return setError("변경된 금제품 정책이 없습니다.");
    if (reason.trim().length < 5) return setError("변경 사유를 5자 이상 입력해 주세요.");
    for (const row of Object.values(products)) {
      if (!String(row.displayName || "").trim()) return setError("모든 제품명을 입력해 주세요.");
      if (row.calculationMethod === "rate" && (!(Number(row.conversionRate)>0) || Number(row.conversionRate)>1)) return setError(`${row.displayName} 환산율을 확인해 주세요.`);
      if (row.calculationMethod === "refining_fee" && Number(row.refiningFeePerDon)<0) return setError(`${row.displayName} 정련비를 확인해 주세요.`);
      if (!["pure", "18k", "14k"].includes(row.valuationPriceBasis)) return setError(`${row.displayName} MY GOLD 가치 기준을 확인해 주세요.`);
    }
    if (!window.confirm(`금제품 정책 버전 ${remote.version}을 변경하시겠습니까? 새 예약부터 적용됩니다.`)) return;
    setBusy(true);
    try {
      const result = await saveGoldRates({ products, exchange: remote.exchange || DEFAULT_EXCHANGE, expectedVersion: remote.version, reason: reason.trim() });
      setReason(""); setMessage(`금제품 정책 버전 ${result.version}으로 저장했습니다.`);
    } catch (err) {
      setError(err?.message?.replace(/^FirebaseError:\s*/i, "") || "금제품 정책 저장에 실패했습니다.");
    } finally { setBusy(false); }
  };

  return <Page>
    <Header><h1>금제품·교환기준 관리</h1><p>현재 운영 버전 {remote?.version || 1} · 제품 추가와 계산방식 변경은 새 계산과 새 예약부터 적용됩니다.</p></Header>
    <Notice>제품은 삭제하지 않고 비활성화하세요. MY GOLD의 원화 가치는 제품별 매입시세 기준으로 계산하고, 예상 순금량은 교환정책으로 별도 계산합니다. 과거 예약은 접수 당시 계산기준을 유지합니다. 정련비 방식은 당일 순금 매입시세를 이용해 정련비 상당 중량을 차감합니다.</Notice>
    <Card onSubmit={submit}>
      <Actions><Button type="button" $secondary onClick={addProduct}>+ 새 금제품 추가</Button></Actions>
      {ordered.map((row) => <ProductCard key={row.id}>
        <ProductHead><strong>{row.displayName || "새 금제품"}</strong><small>{row.id}</small></ProductHead>
        <Grid>
          <Field>제품명<input value={row.displayName} maxLength={80} onChange={(e)=>patchProduct(row.id,{displayName:e.target.value})}/></Field>
          <Field>계산방식<select value={row.calculationMethod} onChange={(e)=>{
            const calculationMethod = e.target.value;
            patchProduct(row.id, calculationMethod === "manual" ? { calculationMethod, myGoldEnabled: false } : { calculationMethod });
          }}>
            <option value="rate">환산율</option><option value="refining_fee">정련비</option><option value="full">100% 인정</option><option value="manual">현장 확인</option>
          </select></Field>
          {row.calculationMethod === "rate" ? <Field>환산율 (%)<input type="number" min="0.001" max="100" step="0.001" value={Number(row.conversionRate||0)*100} onChange={(e)=>patchProduct(row.id,{conversionRate:Number(e.target.value)/100})}/></Field> :
           row.calculationMethod === "refining_fee" ? <Field>정련비 (원/돈)<input type="number" min="0" step="100" value={row.refiningFeePerDon||0} onChange={(e)=>patchProduct(row.id,{refiningFeePerDon:Number(e.target.value)})}/></Field> :
           <Field>적용기준<input value={methodLabel(row.calculationMethod)} disabled/></Field>}
          <Field>MY GOLD 가치 기준<select value={row.valuationPriceBasis || "pure"} onChange={(e)=>patchProduct(row.id,{valuationPriceBasis:e.target.value})}>
            <option value="pure">순금 매입시세</option><option value="18k">18K 매입시세</option><option value="14k">14K 매입시세</option>
          </select></Field>
          <Field>표시순서<input type="number" min="0" max="10000" step="1" value={row.sortOrder??999} onChange={(e)=>patchProduct(row.id,{sortOrder:Number(e.target.value)})}/></Field>
        </Grid>
        <Checks>
          <label><input type="checkbox" checked={row.active!==false} onChange={(e)=>patchProduct(row.id,{active:e.target.checked})}/> 활성</label>
          <label><input type="checkbox" checked={row.myGoldEnabled===true} disabled={row.calculationMethod === "manual"} onChange={(e)=>patchProduct(row.id,{myGoldEnabled:e.target.checked})}/> MY GOLD</label>
          <label><input type="checkbox" checked={row.exchangeEnabled===true} onChange={(e)=>patchProduct(row.id,{exchangeEnabled:e.target.checked})}/> 금교환</label>
        </Checks>
      </ProductCard>)}
      <Reason>변경 사유 (감사 기록)<textarea maxLength={200} required value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="예: 18K 교환율 및 순금 정련비 정책 반영"/></Reason>
      {message && <Message role="status">{message}</Message>}{error && <Message $error role="alert">{error}</Message>}
      <Actions><Button type="button" $secondary onClick={reset} disabled={busy||!dirty}>변경 취소</Button><Button type="submit" disabled={busy||!remote||!dirty}>{busy?"저장 중…":"검토 후 저장"}</Button></Actions>
    </Card>
  </Page>;
}
