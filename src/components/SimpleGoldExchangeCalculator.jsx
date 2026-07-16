// SimpleGoldExchangeCalculator.jsx
import React, { useMemo, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { useAuthContext } from "@/context/AuthContext";

/* ── 상수/유틸 ───────────────────────────────── */
const DON_TO_GRAMS = 3.75;
const DEFAULT_PURITY = {
  "14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.53,
  "18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)": 0.71,
  "순금 995제품(목걸이,팔찌,반지,귀걸이)": 0.945,
  "순금 999제품(팔찌,목걸이, 반지,귀걸이)": 0.95,
  "순금 열쇠": 0.943,
  "순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)": 0.94,
  "순금 마고자 단추 / 색상이 들어있는 제품": 0.93,
  "999,24k 순금덩어리(순도 측정후 999일 경우)": 0.96,
};
const DEFAULT_EXCHANGE = { "999.9골드바": 1 };

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
const toFixed3 = (n) => roundTo3Custom(n).toFixed(3);

function computeFinalWeightFromRates({ grams, goldType, exchangeType, purity, exchange }) {
  const pRaw = (purity && purity[goldType]) ?? DEFAULT_PURITY[goldType];
  const eRaw = (exchange && exchange[exchangeType]) ?? DEFAULT_EXCHANGE[exchangeType];
  const p = typeof pRaw === "number" ? pRaw : 0;
  const e = typeof eRaw === "number" ? eRaw : 1;
  return roundTo3Custom(grams * p * e);
}

const BAR_GROUPS = {
  grams: [
    { key: "g-1", grams: 1, don: 1 / DON_TO_GRAMS, label: "1g 골드바" },
    { key: "g-3", grams: 3, don: 3 / DON_TO_GRAMS, label: "3g 골드바" },
    { key: "g-5", grams: 5, don: 5 / DON_TO_GRAMS, label: "5g 골드바" },
    { key: "g-10", grams: 10, don: 10 / DON_TO_GRAMS, label: "10g 골드바" },
    { key: "g-20", grams: 20, don: 20 / DON_TO_GRAMS, label: "20g 골드바" },
    { key: "g-30", grams: 30, don: 30 / DON_TO_GRAMS, label: "30g 골드바" },
    { key: "g-50", grams: 50, don: 50 / DON_TO_GRAMS, label: "50g 골드바" },
    { key: "g-100", grams: 100, don: 100 / DON_TO_GRAMS, label: "100g 골드바" },
  ],
  don: [
    { key: "d-1", grams: 3.75, don: 1, label: "1돈 (3.75g) 골드바" },
    { key: "d-2", grams: 7.5, don: 2, label: "2돈 (7.5g) 골드바" },
    { key: "d-3", grams: 11.25, don: 3, label: "3돈 (11.25g) 골드바" },
    { key: "d-5", grams: 18.75, don: 5, label: "5돈 (18.75g) 골드바" },
    { key: "d-10", grams: 37.5, don: 10, label: "10돈 (37.5g) 골드바" },
  ],
};
const ALL_DENOMS = [...BAR_GROUPS.grams, ...BAR_GROUPS.don].sort((a,b)=>a.grams-b.grams);

function breakdownByDenoms(grams) {
  let remain = Math.max(0, roundTo3Custom(grams));
  const items = [];
  for (let i = ALL_DENOMS.length - 1; i >= 0; i--) {
    const d = ALL_DENOMS[i];
    const qty = Math.floor((remain + 1e-9) / d.grams);
    if (qty > 0) {
      items.push({ denom: d, qty });
      remain = roundTo3Custom(remain - qty * d.grams);
    }
  }
  return { items, remain: Math.max(0, remain) };
}

/* ── UI ─────────────────────────────────────── */
const Wrap = styled.div`
  width: 100%; max-width: 860px; margin: 0 auto;
  background: linear-gradient(180deg, #fcfdff, #f7f9fc);
  border: 1px solid #e6e8eb; border-radius: 14px;
  padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,.06);
`;
const Grid = styled.div`
  display: grid; gap: 12px; grid-template-columns: 2fr 1fr 1fr auto; align-items: start;
  @media (max-width: 720px){ grid-template-columns: 1fr 1fr; }
`;
const Field = styled.div` display:flex; flex-direction:column; gap:6px; min-width:0; `;
const Label = styled.label` font-size:.95rem; font-weight:800; color:#111827; `;
const Input = styled.input` padding:10px 12px; border:1px solid #e6e8eb; border-radius:10px; `;
const Select = styled.select` padding:10px 12px; border:1px solid #e6e8eb; border-radius:10px; `;
const Button = styled.button`
  padding: 12px 16px; border:0; border-radius:12px; cursor:pointer; font-weight:900; font-size:1rem;
  ${(p)=>p.$variant==="primary" && css` background:#5b21b6; color:#fff; `}
  ${(p)=>p.$variant==="ghost" && css` background:transparent; color:#5b21b6; `}
`;
const LinkLike = styled.a` color:#5b21b6; font-weight:800; text-decoration:underline; cursor:pointer; `;
const Help = styled.small` color:#6b7280; display:block; `;
const UnitHint = styled.small` display:block; color:#374151; font-size:.9rem; .unit{font-weight:900;color:#111827;} `;

const Summary = styled.div`
  margin-top: 14px; padding: 12px; border:1px solid #e6e8eb; border-radius:12px; background:#fff;
  display:grid; gap:8px; position:relative;
`;
const Row = styled.div` display:flex; justify-content:space-between; align-items:center; `;
const Strong = styled.span` font-weight:900; `;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(91,33,182, .35); }
  60% { box-shadow: 0 0 0 12px rgba(91,33,182, 0); }
  100% { box-shadow: 0 0 0 0 rgba(91,33,182, 0); }
`;
const Badge = styled.span`
  display:inline-block; padding:6px 10px; border-radius:9999px; background:#eef2ff; color:#4338ca; font-weight:800; font-size:.85rem; margin:0 6px 0 0;
  ${(p)=>p.$highlight && css`animation: ${pulse} 1.6s ease-out 1;`}
`;

const Divider = styled.hr` border:none; height:1px; background:#eceff3; margin:8px 0; `;
const TableWrap = styled.div` overflow:auto; border:1px solid #e6e8eb; border-radius:12px; margin-top:12px; `;
const Table = styled.table`
  width:100%; border-collapse:collapse;
  th,td{ padding:10px 12px; text-align:left; }
  thead th{ background:#f6f7f9; border-bottom:1px solid #e6e8eb; font-weight:900; }
  tbody td{ border-top:1px solid #f0f2f5; }
  tfoot td{ background:#fbfcfe; font-weight:900; }
`;

/* 🔒 상세 블러락(가입 유도) */
const BlurLockWrap = styled.div`
  position: absolute; inset: 0; display:flex; align-items:center; justify-content:center;
  backdrop-filter: blur(3px);
  background: linear-gradient(transparent, rgba(255,255,255,.95) 60%);
  border-radius: 12px;
`;
const BlurButton = styled.button`
  padding: 10px 14px; border-radius: 10px; font-weight: 900;
  border: 1.5px solid #5b21b6; background: #fff; color: #5b21b6; cursor: pointer;
`;

/* ── 옵션 ───────────────────────────────────── */
const PRODUCT_OPTIONS = [
  { value: '14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)', label: '14k(585) 제품' },
  { value: '18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)', label: '18k(750) 제품' },
  { value: '순금 995제품(목걸이,팔찌,반지,귀걸이)', label: '순금 995 제품' },
  { value: '순금 999제품(팔찌,목걸이, 반지,귀걸이)', label: '순금 999 제품' },
  { value: '순금 열쇠', label: '순금 열쇠' },
  { value: '순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)', label: '순금 장식/모양' },
  { value: '순금 마고자 단추 / 색상이 들어있는 제품', label: '마고자 단추/색상 포함' },
  { value: '999,24k 순금덩어리(순도 측정후 999일 경우)', label: '999 순금덩어리' },
];

/* ── 메인 ───────────────────────────────────── */
export default function SimpleGoldExchangeCalculator({
  mode = "recommend",
  reserveHref = "/gold-exchange",
  purityTable = DEFAULT_PURITY,
  exchangeTable = DEFAULT_EXCHANGE,
  maxRows = 3,
  unitHintPosition = "below",
  showInstructionBanner = false,
  gateDetails = true,
  freeRows = 1,
  onRequireAuth,
}){
  const { user } = useAuthContext();
  const [rows, setRows] = useState([{ goldType:'', qty:'', unit:'g', exchangeType:'999.9골드바' }]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const summaryRef = useRef(null);

  const addRow = () => {
    if (gateDetails && !user && rows.length >= freeRows) {
      onRequireAuth?.();
      return;
    }
    setRows((prev)=> prev.length>=maxRows ? prev : [...prev, { goldType:'', qty:'', unit:'g', exchangeType:'999.9골드바' }]);
  };
  const removeRow = (i) => setRows((prev)=> prev.length<=1 ? prev : prev.filter((_,idx)=>idx!==i));
  const update = (i, k, v) => setRows((prev)=> prev.map((r,idx)=> idx===i ? { ...r, [k]: v } : r));

  const computed = useMemo(()=>{
    const items = rows.map((r)=>{
      const n = parseFloat(String(r.qty).replace(",", "."));
      const valid = !isNaN(n) && n>0 && r.goldType;
      const grams = valid ? (r.unit==='g' ? n : n * DON_TO_GRAMS) : 0;
      const g = valid ? computeFinalWeightFromRates({ grams, goldType:r.goldType, exchangeType:r.exchangeType, purity: purityTable, exchange: exchangeTable }) : 0;
      return { ...r, inputGrams: grams, finalGrams: g };
    });
    const totalG = roundTo3Custom(items.reduce((s,x)=> s + (x.finalGrams||0), 0));
    const totalD = totalG / DON_TO_GRAMS;
    const best = suggestBestDenom(totalG);
    const combo = breakdownByDenoms(totalG);
    const hasInput = items.some(it => it.finalGrams > 0);
    return { items, totalG, totalD, best, combo, hasInput };
  }, [rows, purityTable, exchangeTable]);

  const isFull = mode === "full";
  const canSeeDetails = isFull || (detailsOpen && computed.hasInput);
  const lockDetails = gateDetails && !user;

  const handleToggleDetails = () => {
    if (gateDetails && !user) { onRequireAuth?.(); return; }
    setDetailsOpen(v=>!v);
  };

  const handleCheckCapacity = () => {
    if (!computed.hasInput) {
      alert("제품과 수량을 입력해 주세요. 현재 단위를 선택하고 숫자를 입력하면 자동환산됩니다.");
      return;
    }
    setDetailsOpen(true);
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlight(true);
    setTimeout(()=> setHighlight(false), 1600);
    if (gateDetails && !user) {
      onRequireAuth?.();
    }
  };

  return (
    <Wrap>
      <h3 style={{marginTop:0}}>간편 교환 계산기</h3>
      <p style={{marginTop:6, color:'#4b5563'}}>
        무게만 입력하면 보유 금을 합산해 <b>교환 가능량</b>과 <b>골드바 자동추천</b>을 확인할 수 있어요.
      </p>

      {rows.map((r, i)=> (
        <Grid key={i}>
          <Field>
            <Label>제품 종류</Label>
            <Select value={r.goldType} onChange={(e)=>update(i,'goldType', e.target.value)}>
              <option value="">선택</option>
              {PRODUCT_OPTIONS.map(o=> <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>

          <Field>
            <Label>수량</Label>
            <Input
              inputMode="decimal"
              placeholder={r.unit==='g' ? '예: 37.500' : '예: 10.00'}
              value={r.qty}
              onChange={(e)=> update(i,'qty', e.target.value.replace(/[^0-9.,]/g,''))}
            />
            <UnitHint>현재 단위: <span className="unit">{r.unit==='g'?'그램(g)':'돈'}</span> · 숫자를 입력하면 자동환산됩니다.</UnitHint>
            {isValidQty(r.qty) && <Help>{quantityHelper(r.qty, r.unit)}</Help>}
          </Field>

          <Field>
            <Label>단위</Label>
            <Select value={r.unit} onChange={(e)=>update(i,'unit', e.target.value)}>
              <option value="g">그램</option>
              <option value="don">돈</option>
            </Select>
          </Field>

          <div style={{display:'flex', gap:8, justifyContent:'flex-end', alignItems:'flex-start'}}>
            {rows.length>1 && <Button $variant="ghost" type="button" onClick={()=>removeRow(i)}>삭제</Button>}
          </div>
        </Grid>
      ))}

      <div style={{display:'flex', gap:10, marginTop:10, flexWrap:'wrap'}}>
        <Button $variant="ghost" type="button" onClick={addRow}>+ 항목 추가</Button>
        <Button $variant="primary" type="button" onClick={handleCheckCapacity} aria-label="보유 금 전체 합산하고 골드바 자동추천 보기">
          교환 가능량 확인
        </Button>
      </div>

      {/* 요약 섹션 */}
      <Summary aria-live="polite" ref={summaryRef}>
        <Row>
          <span>합계(예상 순금)</span>
          <Strong>{toFixed3(computed.totalG)} g · {computed.totalD.toFixed(2)} 돈</Strong>
        </Row>
        {computed.totalG > 0 && (
          <Row>
            <span>추천 규격</span>
            <div>
              <Badge $highlight={highlight}>{computed.best.label} × {computed.best.qty}</Badge>
            </div>
          </Row>
        )}
        {!isFull && (
          <Row>
            <span />
            <LinkLike onClick={handleToggleDetails}>{canSeeDetails ? "간단히 보기" : "자세히 보기"}</LinkLike>
          </Row>
        )}
      </Summary>

      {/* 상세 (표/조합/남는무게) */}
      {(isFull || (detailsOpen && computed.hasInput)) && (
        <div style={{ position: 'relative' }}>
          {/* 🔒 로그아웃 + 자세히 보기 상태에서만 잠금 */}
          {lockDetails && !isFull && detailsOpen && (
            <BlurLockWrap>
              <div style={{textAlign:'center'}}>
                <BlurButton onClick={()=> onRequireAuth?.()}>무료 가입하고 전체 보기</BlurButton>
                <p style={{marginTop:8, fontSize:12, color:'#6b7280'}}>
                  • 여러 품목 합산 / 상세 조합 / 남는 무게까지 <b>모두</b> 확인 가능해요
                </p>
              </div>
            </BlurLockWrap>
          )}

          <Divider />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th style={{width:'32%'}}>제품</th>
                  <th style={{width:'28%'}}>입력 값</th>
                  <th style={{width:'20%'}}>환산(g)</th>
                  <th style={{width:'20%'}}>환산(돈)</th>
                </tr>
              </thead>
              <tbody>
                {computed.items.map((it, idx)=> (
                  <tr key={idx}>
                    <td>{it.goldType || '-'}</td>
                    <td>{displayOriginal(it.qty, it.unit)}</td>
                    <td>{toFixed3(it.finalGrams)} g</td>
                    <td>{(it.finalGrams / DON_TO_GRAMS).toFixed(2)} 돈</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>합계(예상 순금)</td>
                  <td>{toFixed3(computed.totalG)} g</td>
                  <td>{computed.totalD.toFixed(2)} 돈</td>
                </tr>
              </tfoot>
            </Table>
          </TableWrap>

          {computed.totalG>0 && (
            <div style={{marginTop:12}}>
              {computed.combo.items.length>0 && (
                <>
                  <p style={{margin:'0 0 6px', fontWeight:700}}>추가 조합 가능</p>
                  <div>{computed.combo.items.map(({denom, qty})=> (
                    <Badge key={denom.key+qty}>{denom.label} × {qty}</Badge>
                  ))}</div>
                </>
              )}
              {computed.combo.remain>0 && (
                <p style={{margin:'10px 0 0', color:'#6b7280'}}>
                  남는 무게: {toFixed3(computed.combo.remain)} g ({(computed.combo.remain / DON_TO_GRAMS).toFixed(2)} 돈)
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 최종 전환 */}
      <div style={{display:'grid', gap:10, marginTop:16}}>
        <Button as="a" href={reserveHref} $variant="primary" aria-label="무료로 교환 가능량 확인 & 예약하기">
          무료로 교환 가능량 확인 & 예약하기
        </Button>
        <LinkLike href={reserveHref} aria-label="매장에서 측정 후 진행">매장에서 측정 후 진행</LinkLike>
      </div>
    </Wrap>
  );
}

/* ── 헬퍼 ─────────────────────────────── */
function isValidQty(qty){
  const n = parseFloat(String(qty).replace(",", "."));
  return !isNaN(n) && n > 0;
}
function quantityHelper(qty, unit){
  const n = parseFloat(String(qty).replace(",", "."));
  if (isNaN(n) || n<=0) return "";
  return unit==='g'
    ? `${toFixed3(n)} g ≈ ${(n / DON_TO_GRAMS).toFixed(2)} 돈`
    : `${n.toFixed(2)} 돈 ≈ ${toFixed3(n * DON_TO_GRAMS)} g`;
}
function displayOriginal(qty, unit){
  const n = parseFloat(String(qty).replace(",", "."));
  if (isNaN(n) || n<=0) return '0';
  return unit==='g'
    ? `${toFixed3(n)} g (${(n / DON_TO_GRAMS).toFixed(2)} 돈)`
    : `${toFixed3(n * DON_TO_GRAMS)} g (${n.toFixed(2)} 돈)`;
}
function suggestBestDenom(totalGrams){
  if (totalGrams<=0) return { label:'-', qty:0 };
  let best = ALL_DENOMS[0];
  for (const d of ALL_DENOMS){ if (d.grams <= totalGrams) best = d; }
  const qty = Math.max(1, Math.floor(totalGrams / best.grams));
  return { label: best.label, grams: best.grams, qty };
}
