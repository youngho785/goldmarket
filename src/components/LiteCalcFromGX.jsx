// src/components/LiteCalcFromGX.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import {
  DON_TO_GRAMS,
  DEFAULT_PURITY,
  DEFAULT_EXCHANGE,
  roundTo3Custom,
  toFixed3CustomStr,
  computeFinalWeightFromRates,
  subscribeGoldRates,
} from "@/lib/goldRates";
import { db } from "@/firebase/firebase";

/* ───────────────── Styled ───────────────── */
const Card = styled.div`
  margin: 10px auto 14px; width: 100%; max-width: 820px;
  border: 1px solid ${({theme})=>theme.colors.border};
  border-radius: 12px; background: ${({theme})=>theme.colors.surface};
  box-shadow: 0 8px 24px rgba(0,0,0,.06); padding: 16px;
`;
const Row = styled.div`
  display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;
  @media(max-width:720px){grid-template-columns:1fr 1fr;}
`;
const Label = styled.small`color:${({theme})=>theme.colors.textSecondary}; font-weight:800;`;
const Input = styled.input`
  padding: 11px 12px; border: 1px solid #e6e8eb; border-radius: 10px;
  font-size: 1rem; background: ${({ theme }) => theme.colors.surface};
`;
const Select = styled.select`
  padding: 11px 12px; border: 1px solid #e6e8eb; border-radius: 10px;
  font-size: 1rem; background: ${({ theme }) => theme.colors.surface};
`;
const Helper = styled.small`color:${({theme})=>theme.colors.textSecondary};`;
const Hr = styled.div`height:1px;background:#eceff3;margin:12px 0;`;

/* 추천 조합 티저/옵션용 태그 */
const Tag = styled.span`
  display:inline-block;padding:6px 10px;border-radius:9999px;margin:6px 6px 0 0;
  background:#eef2ff;color:#4338ca;font-weight:800;font-size:.9rem;
`;

/* 버튼 영역 & 단일 CTA */
const BtnRow = styled.div`display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;`;
const Primary = styled(Link)`
  text-decoration:none;display:inline-flex;align-items:center;justify-content:center;
  gap:8px;border:none;border-radius:12px;padding:14px 18px;min-height:48px;
  background:${({theme})=>theme.colors.primary};color:#fff;font-weight:900;font-size:1rem;
  box-shadow:0 14px 28px rgba(0,0,0,.10);
  &:hover{transform:translateY(-2px);filter:brightness(1.02);}
`;
/* 단일 CTA를 화면 너비에 맞게 넓게 */
const OneLineCTA = styled(Primary)`
  width: 100%;
  justify-content: center;
`;

/* ─────────────── 데이터/상수 ──────────────── */
const PRODUCT_OPTIONS = [
  { value: '14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)', label: '14K (팔찌/목걸이/반지 등)' },
  { value: '18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)', label: '18K (팔찌/목걸이/반지 등)' },
  { value: '순금 995제품(목걸이,팔찌,반지,귀걸이)', label: '순금 995 (목걸이/팔찌/반지/귀걸이)' },
  { value: '순금 999제품(팔찌,목걸이, 반지,귀걸이)', label: '순금 999 (목걸이/팔찌/반지/귀걸이)' },
  { value: '순금 열쇠', label: '순금 열쇠' },
  { value: '순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)', label: '순금 장식모양(거북이/두꺼비 등)' },
  { value: '순금 마고자 단추 / 색상이 들어있는 제품', label: '순금 단추/색상 포함' },
  { value: '999,24k 순금덩어리(순도 측정후 999일 경우)', label: '999 순금덩어리' },
  { value: '기타(문의)', label: '기타(문의)' },
];

/** 라이트 조합용 규격 */
const DENOMS = [
  { key: "g-1", grams: 1, label: "1g" },
  { key: "g-3", grams: 3, label: "3g" },
  { key: "g-5", grams: 5, label: "5g" },
  { key: "g-10", grams: 10, label: "10g" },
  { key: "g-20", grams: 20, label: "20g" },
  { key: "g-30", grams: 30, label: "30g" },
  { key: "g-50", grams: 50, label: "50g" },
  { key: "g-100", grams: 100, label: "100g" },
];

/* greedy 분해 */
function breakdown(grams) {
  let remain = Math.max(0, roundTo3Custom(grams));
  const items = [];
  for (let i = DENOMS.length - 1; i >= 0; i--) {
    const d = DENOMS[i];
    const qty = Math.floor((remain + 1e-9) / d.grams);
    if (qty > 0) {
      items.push({ denom: d, qty });
      remain = roundTo3Custom(remain - qty * d.grams);
    }
  }
  return { items, remain };
}

/* ─────────────── 메인 ─────────────── */
export default function LiteCalcFromGX({ showCombo = false }) {
  const [rates, setRates] = useState({ purity: DEFAULT_PURITY, exchange: DEFAULT_EXCHANGE });

  // 입력값
  const [goldType, setGoldType] = useState("");
  const [unit, setUnit] = useState("g");
  const [qtyStr, setQtyStr] = useState("");

  useEffect(() => {
    const unsub = subscribeGoldRates(db, (merged) => setRates(merged));
    return () => unsub && unsub();
  }, []);

  // 정규화 수치
  const qty = useMemo(() => {
    const v = parseFloat((qtyStr || "").toString().replace(",", "."));
    return isNaN(v) ? 0 : Math.max(0, v);
  }, [qtyStr]);

  const gramsInput = useMemo(
    () => (unit === "g" ? qty : roundTo3Custom(qty * DON_TO_GRAMS)),
    [qty, unit]
  );

  // 순금 환산 결과(g)
  const fineGrams = useMemo(() => {
    if (!goldType || gramsInput <= 0) return 0;
    return roundTo3Custom(
      computeFinalWeightFromRates({
        grams: gramsInput,
        goldType,
        exchangeType: "999.9골드바",
        purity: rates.purity,
        exchange: rates.exchange,
      })
    );
  }, [goldType, gramsInput, rates]);

  const fineDon = useMemo(() => (DON_TO_GRAMS > 0 ? fineGrams / DON_TO_GRAMS : 0), [fineGrams]);

  // 조합(옵션)
  const combo = useMemo(() => (showCombo ? breakdown(fineGrams) : { items: [], remain: 0 }), [showCombo, fineGrams]);

  const fmtG = (n) => toFixed3CustomStr(n);
  const fmtD = (n) => Number(n).toFixed(2);

  // 단일 CTA 목적지: 입력 없으면 전체 입력으로, 입력 있으면 프리필
  const targetHref = useMemo(() => {
    if (!goldType || !(qty > 0)) {
      return "/gold-exchange?from=lite-cta";
    }
    const params = new URLSearchParams({
      w: String(gramsInput || 0),
      unit: "g",               // 내부 계산은 g 기준으로 전달
      type: goldType,
      from: "lite-cta-prefill" // 퍼널 분석용
    }).toString();
    return `/gold-exchange?${params}`;
  }, [goldType, qty, gramsInput]);

  return (
    <Card aria-label="간편 환산 계산기(라이트)">
      <div style={{fontWeight:900, marginBottom:8}}>간편 환산 샘플 계산기</div>

      <Row>
        <label>
          <Label>금의 종류</Label>
          <Select value={goldType} onChange={(e)=>setGoldType(e.target.value)}>
            <option value="">선택</option>
            {PRODUCT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </label>

        <label>
          <Label>단위</Label>
          <Select value={unit} onChange={(e)=>setUnit(e.target.value)}>
            <option value="g">그램(g)</option>
            <option value="don">돈</option>
          </Select>
        </label>

        <label>
          <Label>금의 무게</Label>
          <Input
            inputMode="decimal"
            placeholder={unit==="g" ? "예: 37.500" : "예: 10.00"}
            value={qtyStr}
            onChange={(e)=>setQtyStr(e.target.value.replace(/[^0-9.,]/g,""))}
            onBlur={()=>setQtyStr((v)=> {
              const x = parseFloat((v||"").replace(",", "."));
              return isNaN(x) ? "" : x.toFixed(unit==="g"?3:2);
            })}
          />
          <Helper>
            {unit==="g"
              ? `${toFixed3CustomStr(qty||0)} g ≈ ${fmtD((qty||0) / DON_TO_GRAMS)} 돈`
              : `${fmtD(qty||0)} 돈 ≈ ${toFixed3CustomStr((qty||0) * DON_TO_GRAMS)} g`
            }
          </Helper>
        </label>
      </Row>

      <Hr />

      <div style={{display:'grid', gap:6}}>
        <Label>골드바 무게 계산결과</Label>
        <div style={{fontWeight:900, fontSize:'1.1rem'}}>
          {fmtG(fineGrams)} g / {fmtD(fineDon)} 돈
        </div>
        
      </div>

      {/* ▼ 추천 골드바 조합(옵션): 필요 시 showCombo={true}로 표시 */}
      {showCombo && (
        <div style={{marginTop:10}}>
          <Label>추천 골드바 조합</Label>
          <div style={{marginTop:4}}>
            {fineGrams <= 0 ? (
              <Helper>무게와 종류를 입력하면 조합이 표시됩니다.</Helper>
            ) : (
              <>
                {combo.items.length === 0 && <Helper>추천 가능한 규격이 없습니다.</Helper>}
                {combo.items.map(({denom, qty}) => (
                  <Tag key={`${denom.key}-${qty}`}>{denom.label} × {qty}</Tag>
                ))}
                <div style={{marginTop:6}}>
                  <Helper>
                    잔여: <b>{fmtG(combo.remain)}</b> g ({fmtD(combo.remain / DON_TO_GRAMS)} 돈)
                  </Helper>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BtnRow>
        <OneLineCTA
          to={targetHref}
          aria-label="나의 모든 금 입력하고 나의 추천 골드바 계산하기"
        >
          나의 금 모두 입력하고 추천 골드바 확인하기
        </OneLineCTA>
        <Helper style={{marginTop:4}}>
          다음 화면에서 여러 품목을 한 번에 추가할 수 있어요.
        </Helper>
      </BtnRow>
    </Card>
  );
}
