// src/pages/GoldExchange.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import styled, { keyframes, css } from "styled-components";
import { useAuthContext } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { addDays, format } from "date-fns";
import GoldExchangeTracker from "../components/GoldExchangeTracker";
import ReviewList from "../components/reviews/GoldExchangeReviewList";
import shopLogo from "@/assets/logo.webp";
import useGuardAction from "@/hooks/useGuardAction";
import useReservedSlots from "@/hooks/useReservedSlots"; // ✅ 예약 슬롯 훅

// 🔗 공용 goldRates 모듈
import {
  DON_TO_GRAMS,
  DEFAULT_PURITY,
  DEFAULT_EXCHANGE,
  roundTo3Custom,
  toFixed3CustomStr,
  computeFinalWeightFromRates,
  subscribeGoldRates,
} from "@/lib/goldRates";

// ✅ callable 래퍼 사용 (클라 단 로직 최소화)
import { submitGoldExchangeGroup } from "@/services/exchangeClient";

/* ── 매장 정보 ─────────────────────────────────── */
const STORE_INFO = {
  name: "원일귀금속",
  address: "부산광역시 진구 골드테마길 21",
  phone: "051-646-9700",
  mobile: "010-7713-3739",
};

/* ── Styled Components ────────────────────────── */
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  background-color: ${({ theme }) => theme.colors.background};
  min-height: 100vh;
`;

const InfoCard = styled.div`
  padding: 14px;
  border: 1px solid #e6e8eb;
  border-radius: 12px;
  background: linear-gradient(180deg, #fcfdff, #f7f9fc);
  line-height: 1.5;
`;

const Card = styled.div`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
  padding: 26px;
  width: 100%;
  max-width: 860px;
  margin-bottom: 18px;
`;

const Title = styled.h2`
  margin: 0 0 14px;
  text-align: left;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.4rem;
`;

const SubTitle = styled.h3`
  margin: 18px 0 12px;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.05rem;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 6px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
`;

const HelpText = styled.small`
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .9rem;
`;

const Input = styled.input`
  padding: 11px 12px;
  border: 1px solid #e6e8eb;
  border-radius: 10px;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.surface};
`;

const Select = styled.select`
  padding: 11px 12px;
  border: 1px solid #e6e8eb;
  border-radius: 10px;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.surface};
`;

const Button = styled.button`
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.buttonText};
  font-size: 1.05rem;
  font-weight: 900;
  cursor: pointer;
  transition: filter .18s ease, transform .12s ease;
  &:hover { filter: brightness(1.03); transform: translateY(-1px); }
  &:disabled { background: #c7cbd1; cursor: not-allowed; }
`;

const OutlineButton = styled(Button)`
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  border: 1.5px solid ${({ theme }) => theme.colors.primary};
`;

const GhostButton = styled(Button)`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px dashed #d8dbe0;
`;

const SmallButton = styled(Button)`
  width: auto;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: .95rem;
`;

const RemoveButton = styled(SmallButton)`
  background: #ef4444;
  &:hover { filter: brightness(1.03); }
  margin-left: auto;
`;

const Inline = styled.div`
  display: flex; gap: 10px; align-items: center;
`;

const SectionSeparator = styled.div`
  height: 1px; background: #eceff3; margin: 18px 0;
`;

const ErrorText = styled.p`
  font-size: 1.05rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.error};
  margin: 4px 0 12px;
`;

const TableWrap = styled.div`
  overflow: auto;
  border: 1px solid #e6e8eb;
  border-radius: 12px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th, td { padding: 12px 14px; text-align: left; }
  thead th {
    background: #f6f7f9;
    font-weight: 900;
    border-bottom: 1px solid #e6e8eb;
  }
  tbody td { border-top: 1px solid #f0f2f5; }
  tbody tr:first-child td { border-top: none; }
  tfoot td { font-weight: 900; background: #fbfcfe; }
`;

/* 세그먼트(그램/돈 탭) */
const Seg = styled.div`
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: #f4f6fa;
  padding: 6px;
  border-radius: 12px;
  width: 100%;
  max-width: 320px;
`;
const SegBtn = styled.button`
  border: 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-weight: 900;
  cursor: pointer;
  background: ${({ $active, theme }) => ($active ? theme.colors.surface : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)}; 
  box-shadow: ${({ $active }) => ($active ? "0 1px 6px rgba(0,0,0,.06)" : "none")};
`;

/* 추천 하이라이트/스타일 */
const GOLD_BORDER = "#d4af37";
const GOLD_BG_TINT = "rgba(212,175,55,.08)";
const aiPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(124,58,237,0.36); }
  60%  { box-shadow: 0 0 0 12px rgba(124,58,237,0); }
  100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
`;
const AIBanner = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  margin: 6px 0 10px;
  border-radius: 12px;
  font-weight: 800;
  background: linear-gradient(135deg, rgba(124,58,237,.12), rgba(212,175,55,.14));
  border: 1px solid rgba(124,58,237,.28);
  color: #4c1d95;
`;
const AIBadge = styled.span`
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .75rem; font-weight: 900;
  padding: 4px 8px; border-radius: 9999px;
  color: #3b0764;
  background: linear-gradient(135deg, rgba(124,58,237,.18), rgba(212,175,55,.20));
  border: 1px solid rgba(124,58,237,.35);
  animation: ${aiPulse} 2.8s ease-in-out infinite;
`;

/* Denoms */
const DenomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
  @media (max-width: 520px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;
const DenomTile = styled.button`
  position: relative;
  border: 2px solid ${({ $active, $recommended }) =>
    $active ? GOLD_BORDER : $recommended ? "rgba(124,58,237,.55)" : "#e6e8eb"};
  background:
    ${({ $active, $recommended }) =>
      $active
        ? GOLD_BG_TINT
        : $recommended
        ? "linear-gradient(135deg, rgba(124,58,237,.10), rgba(212,175,55,.10))"
        : "#fff"};
  color: ${({ $active }) => ($active ? "#5b21b6" : "inherit")}; /* 대비 살짝 강화 */
  border-radius: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 4px;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease, transform .06s ease;
  &:hover {
    border-color: ${({ $active, $recommended }) =>
      $active ? GOLD_BORDER : $recommended ? "rgba(124,58,237,.75)" : GOLD_BORDER};
    box-shadow: 0 0 0 2px rgba(212,175,55,0.15);
    transform: translateY(-1px);
  }
  ${({ $recommended }) =>
    $recommended &&
    css`
      &::after{
        content: "";
        position: absolute;
        inset: -2px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(124,58,237,.18), rgba(212,175,55,.18));
        z-index: -1;
        filter: blur(8px);
      }
    `}
`;

/* 스텝 마크 */
const StepCenter = styled.div` display: flex; justify-content: center; `;
const StepMark = styled.div`
  display: inline-block;
  margin: 0 auto 12px;
  padding: 6px 14px;
  border: 2px solid ${GOLD_BORDER};
  background: ${GOLD_BG_TINT};
  color: ${GOLD_BORDER};
  font-weight: 900;
  border-radius: 9999px;
  text-align: center;
  letter-spacing: .4px;
`;

/* ── Constants & Helpers ───────────────────────── */
const STEP = { CALC: 0, BARS: 1, RESERVE: 2, DONE: 3 };
const TIME_SLOTS = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

/** 골드바 규격 정의 */
const BAR_GROUPS = {
  grams: [
    { key: "g-1",   grams: 1,   don: 1 / DON_TO_GRAMS,   label: "1g 골드바" },
    { key: "g-3",   grams: 3,   don: 3 / DON_TO_GRAMS,   label: "3g 골드바" },
    { key: "g-5",   grams: 5,   don: 5 / DON_TO_GRAMS,   label: "5g 골드바" },
    { key: "g-10",  grams: 10,  don: 10 / DON_TO_GRAMS,  label: "10g 골드바" },
    { key: "g-20",  grams: 20,  don: 20 / DON_TO_GRAMS,  label: "20g 골드바" },
    { key: "g-30",  grams: 30,  don: 30 / DON_TO_GRAMS,  label: "30g 골드바" },
    { key: "g-50",  grams: 50,  don: 50 / DON_TO_GRAMS,  label: "50g 골드바" },
    { key: "g-100", grams: 100, don: 100 / DON_TO_GRAMS, label: "100g 골드바" },
    { key: "g-500", grams: 500, don: 500 / DON_TO_GRAMS, label: "500g 골드바" },
  ],
  don: [
    { key: "d-1",   grams: 3.75,   don: 1,  label: "1돈 (3.75g) 골드바" },
    { key: "d-2",   grams: 7.5,    don: 2,  label: "2돈 (7.5g) 골드바" },
    { key: "d-3",   grams: 11.25,  don: 3,  label: "3돈 (11.25g) 골드바" },
    { key: "d-5",   grams: 18.75,  don: 5,  label: "5돈 (18.75g, 약 19g) 골드바" },
    { key: "d-10",  grams: 37.5,   don: 10, label: "10돈 (37.5g) 골드바" },
    { key: "d-15",  grams: 56.25,  don: 15, label: "15돈 (56.25g) 골드바" },
    { key: "d-20",  grams: 75,     don: 20, label: "20돈 (75g) 골드바" },
  ],
};
/** 잔여 조합용: 모든 규격(오름차순) */
const ALL_DENOMS = [...BAR_GROUPS.grams, ...BAR_GROUPS.don].sort((a, b) => a.grams - b.grams);

/* ── 제품 옵션 ───────────────────────── */
/** ⚠️ value 문자열은 DEFAULT_PURITY 키와 "완전히 동일"해야 합니다. */
const PRODUCT_OPTIONS = [
  { value: '14k(585) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)', label: '14k(585) 제품(팔찌/목걸이/반지/귀걸이/발찌)' },
  { value: '18k(750) 제품(팔찌,목걸이, 반지,귀걸이, 발찌 등)', label: '18k(750) 제품(팔찌/목걸이/반지/귀걸이/발찌)' },
  { value: '순금 995제품(목걸이,팔찌,반지,귀걸이)', label: '순금 995 제품(목걸이/팔찌/반지/귀걸이)' },
  { value: '순금 999제품(팔찌,목걸이, 반지,귀걸이)', label: '순금 999 제품(목걸이/팔찌/반지/귀걸이)' }, // ← 순서 포함 정확히 일치
  { value: '순금 열쇠', label: '순금 열쇠' },
  { value: '순금 장식모양(거북이,두꺼비, 골프공, 핸드폰고리 등)', label: '순금 장식모양(거북이/두꺼비 등)' }, // ← DEFAULT_PURITY 키와 동일
  { value: '순금 마고자 단추 / 색상이 들어있는 제품', label: '순금 마고자 단추/색상 포함' },
  { value: '999,24k 순금덩어리(순도 측정후 999일 경우)', label: '999 순금덩어리' }, // ← DEFAULT_PURITY 키와 동일
  { value: '기타(문의)', label: '기타(문의)' },
];

/* ── 입력값 표시 ───────────────────────── */
const DON_TO_GRAMS_CONST = DON_TO_GRAMS;
const displayOriginal = (qty, unit) => {
  const n = parseFloat(qty);
  if (isNaN(n) || n <= 0) return "0";
  return unit === "g"
    ? `${toFixed3CustomStr(n)} g (${(roundTo3Custom(n / DON_TO_GRAMS_CONST)).toFixed(2)} 돈)`
    : `${toFixed3CustomStr(n * DON_TO_GRAMS_CONST)} g (${(roundTo3Custom(n)).toFixed(2)} 돈)`;
};
const qtyHelperText = (qty, unit) => {
  const n = parseFloat(qty);
  if (isNaN(n) || n <= 0) return "그램(g) 또는 돈 단위를 선택하고 값을 입력하면 자동 환산됩니다.";
  return unit === "g"
    ? `${toFixed3CustomStr(n)} g ≈ ${(roundTo3Custom(n / DON_TO_GRAMS_CONST)).toFixed(2)} 돈`
    : `${(roundTo3Custom(n)).toFixed(2)} 돈 ≈ ${toFixed3CustomStr(n * DON_TO_GRAMS_CONST)} g`;
};

/** 잔여 조합(그리디) — 부동소수 보정 강화 */
const breakdownByDenoms = (grams) => {
  let remain = Math.max(0, roundTo3Custom(grams));
  const items = [];
  for (let i = ALL_DENOMS.length - 1; i >= 0; i--) {
    const d = ALL_DENOMS[i];
    const qty = Math.floor((remain + 1e-9) / d.grams);
    if (qty > 0) {
      items.push({ denom: d, qty });
      remain -= qty * d.grams;
      remain = Math.max(0, roundTo3Custom(remain));
    }
  }
  return { items, remain: Math.max(0, remain) };
};

/** 총량 이하에서 가장 큰 규격 추천 */
const findBestChoice = (totalGrams) => {
  let best = ALL_DENOMS[0];
  for (const d of ALL_DENOMS) if (d.grams <= totalGrams) best = d;
  const group = BAR_GROUPS.grams.some((x) => x.key === best.key) ? "grams" : "don";
  const idx = Math.max(0, BAR_GROUPS[group].findIndex((x) => x.key === best.key));
  return { group, idx };
};

/** 그룹별 최적 인덱스 (탭 전환용) */
const bestIdxForGroup = (group, totalGrams) => {
  const arr = BAR_GROUPS[group];
  let idx = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].grams <= totalGrams) idx = i;
  }
  return idx;
};

/* ── 독립 입력 컴포넌트 ───────────────────────── */
const QuantityField = React.memo(function QuantityField({
  value,
  unit,
  placeholder,
  onCommit,
  name,
  inlineHelper = true,
}) {
  const inputRef = useRef(null);
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => setLocal(value ?? ""), [value]);

  const handleChange = (e) => {
    const raw = e.target.value ?? "";
    const norm = raw.replace(/[^0-9.,]/g, "");
    setLocal(norm);
  };
  const handleBlur = () => {
    const str = (local || "").replace(",", ".");
    const v = parseFloat(str);
    const next = isNaN(v) ? "" : roundTo3Custom(v).toFixed(3);
    setLocal(next);
    onCommit(next);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <>
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        name={name}
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize="none"
        enterKeyHint="done"
      />
      {inlineHelper && <HelpText>{qtyHelperText(local, unit)}</HelpText>}
    </>
  );
});

/* ── Step 1: 입력/계산 ─────────────────────────── */
function CalcStep({
  products, error, onCalculate,
  handleProductChange, addProduct, removeProduct,
  onGoReserveDirect,
}) {
  return (
    <>
      <Card>
        <StepCenter><StepMark>스텝 1</StepMark></StepCenter>
        <Title>스텝 1. 골드바 교환을 위한 나의 금 입력하기</Title>
        {error && <ErrorText role="alert">{error}</ErrorText>}

        {/* onCalculate는 guard로 감싼 핸들러 */}
        <form onSubmit={onCalculate}>
          {products.map((p, idx) => (
            <FormGroup key={`row-${idx}`}>
              <Label>제품 종류</Label>
              <Select
                value={p.goldType}
                onChange={(e) => handleProductChange(idx, "goldType", e.target.value)}
              >
                <option value="">선택</option>
                {PRODUCT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              {p.goldType === '기타(문의)' && (
                <HelpText>
                  정확한 환산률 안내가 어려운 품목입니다. <b>010-7713-3739</b>로 문의하시거나
                  아래 <b>“나의 금 현장에서 확인하기”</b>로 진행해 주세요.
                </HelpText>
              )}

              <Label>수량</Label>
              <Inline>
                <QuantityField
                  name={`quantity-${idx}`}
                  value={p.quantity}
                  unit={p.inputUnit}
                  placeholder="예: 37.500"
                  onCommit={(next) => handleProductChange(idx, "quantity", next)}
                  inlineHelper={false}
                />
                <Select
                  value={p.inputUnit}
                  onChange={(e) => handleProductChange(idx, "inputUnit", e.target.value)}
                >
                  <option value="g">그램</option>
                  <option value="don">돈</option>
                </Select>
              </Inline>
              <HelpText>{qtyHelperText(p.quantity, p.inputUnit)}</HelpText>

              <Label>교환 유형</Label>
              <Select
                value={p.exchangeType}
                onChange={(e) => handleProductChange(idx, "exchangeType", e.target.value)}
              >
                <option value="999.9골드바">999.9골드바</option>
              </Select>

              {products.length > 1 && (
                <RemoveButton type="button" onClick={() => removeProduct(idx)}>
                  항목 삭제
                </RemoveButton>
              )}
            </FormGroup>
          ))}

          <SmallButton type="button" onClick={addProduct}>
            + 제품 추가
          </SmallButton>

          <SectionSeparator />
          <Button type="submit">나의 골드바 보고 AI 추천받기</Button>
        </form>
      </Card>

      <Card>
        <StepCenter><StepMark>스텝 1</StepMark></StepCenter>
        <Title>스텝 1. 나의 금 골드바로 업그레이드 예약</Title>
        <HelpText>
          금의 순도 및 무게를 몰라도 괜찮아요. 매장에서 확인 후 골드바 교환을 진행을 할수 있어요.
        </HelpText>
        {/* guard 적용 */}
        <OutlineButton
          type="button"
          onClick={onGoReserveDirect}
          style={{ marginTop: 12 }}
        >
          나의 금 현장에서 확인하기
        </OutlineButton>
      </Card>
    </>
  );
}

/* ── Step 2: 골드바 선택 ───────────────────────── */
function BarStep({
  products, totalGrams, totalDon, fmtG, fmtD,
  barGroup, setBarGroup, barChoice, setBarChoice,
  onGoReserve,
  setStep,
}) {
  const current = BAR_GROUPS[barGroup];
  let recIdx = 0;
  for (let i = 0; i < current.length; i++) if (current[i].grams <= totalGrams) recIdx = i;

  const safeIdx = Math.min(barChoice.idx, current.length - 1);
  const selectedBar = current[safeIdx];
  const maxSelectableQty = Math.floor(totalGrams / selectedBar.grams) || 1;
  const safeQty = Math.max(1, barChoice.qty || 1);

  const usedByChoiceExact = selectedBar.grams * safeQty;
  const usedByChoice = roundTo3Custom(usedByChoiceExact);

  const shortfallGramsRaw = Math.max(0, usedByChoiceExact - totalGrams);
  const leftoverGramsRaw = Math.max(0, totalGrams - usedByChoiceExact);

  const groupMin = BAR_GROUPS[barGroup][0];
  const extraCombo = breakdownByDenoms(leftoverGramsRaw);

  const isTileRecommended = (i) => i === recIdx;

  return (
    <Card>
      <StepCenter><StepMark>스텝 2</StepMark></StepCenter>
      <Title>스텝 2. 나의 금 골드바 선택하기</Title>

      <SubTitle>제품별 환산 결과</SubTitle>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <th style={{ width: "28%" }}>제품 종류</th>
              <th style={{ width: "32%" }}>입력 값</th>
              <th style={{ width: "20%" }}>환산(g)</th>
              <th style={{ width: "20%" }}>환산(돈)</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const g = p.finalWeight || 0;
              const d = g / DON_TO_GRAMS;
              return (
                <tr key={`sum-${idx}`}>
                  <td>{p.goldType || "-"}</td>
                  <td>{displayOriginal(p.quantity, p.inputUnit)}</td>
                  <td>{fmtG(g)} g</td>
                  <td>{fmtD(d)} 돈</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>합계(환산 순금)</td>
              <td>{fmtG(totalGrams)} g</td>
              <td>{fmtD(totalDon)} 돈</td>
            </tr>
          </tfoot>
        </Table>
      </TableWrap>

      <AIBanner aria-live="polite">
        <span role="img" aria-label="ai">🧠</span>
        <span>AI가 남는 무게를 줄이고 조합이 유리한 규격을 추천했어요.</span>
      </AIBanner>

      <SubTitle>골드바 규격 선택</SubTitle>
      <Seg role="tablist" aria-label="골드바 규격 선택 탭">
        <SegBtn
          type="button"
          $active={barGroup === "grams"}
          role="tab"
          aria-selected={barGroup === "grams"}
          onClick={() => {
            setBarGroup("grams");
            const idxInGroup = bestIdxForGroup("grams", totalGrams);
            const maxQty = Math.max(1, Math.floor(totalGrams / BAR_GROUPS.grams[idxInGroup].grams));
            setBarChoice({ idx: idxInGroup, qty: maxQty });
          }}
        >
          그램별 골드바
        </SegBtn>
        <SegBtn
          type="button"
          $active={barGroup === "don"}
          role="tab"
          aria-selected={barGroup === "don"}
          onClick={() => {
            setBarGroup("don");
            const idxInGroup = bestIdxForGroup("don", totalGrams);
            const maxQty = Math.max(1, Math.floor(totalGrams / BAR_GROUPS.don[idxInGroup].grams));
            setBarChoice({ idx: idxInGroup, qty: maxQty });
          }}
        >
          돈수별 골드바
        </SegBtn>
      </Seg>

      <DenomGrid role="radiogroup" aria-label="골드바 규격 목록">
        {current.map((d, i) => {
          const active = i === safeIdx;
          const recommended = isTileRecommended(i);
          return (
            <DenomTile
              key={d.key}
              type="button"
              $active={active}
              $recommended={recommended}
              role="radio"
              aria-checked={active}
              aria-label={`${d.label}${recommended ? " — AI 추천" : ""}`}
              tabIndex={0}
              onClick={() => {
                setBarChoice({ idx: i, qty: Math.max(1, safeQty) });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setBarChoice({ idx: i, qty: Math.max(1, safeQty) });
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                <div style={{ fontWeight: 900 }}>{d.label}</div>
                {recommended && <AIBadge><span role="img" aria-label="ai">🤖</span>AI 추천</AIBadge>}
              </div>
              <div style={{ fontSize: ".9rem", color: "#6b7280" }}>
                ≈ {fmtD(d.don)} 돈 / {toFixed3CustomStr(d.grams)} g
              </div>
            </DenomTile>
          );
        })}
      </DenomGrid>

      <FormGroup style={{ marginTop: 12 }}>
        <Label>수량</Label>
        <Inline>
          <SmallButton
            type="button"
            aria-label="수량 감소"
            style={{ width: 44, padding: "8px 0" }}
            onClick={() => setBarChoice((p) => ({ ...p, qty: Math.max(1, (p.qty || 1) - 1) }))}
          >
            −
          </SmallButton>
          <Input
            type="number"
            min={1}
            step="1"
            value={Math.max(1, barChoice.qty || 1)}
            onChange={(e) => {
              const v = Number(e.target.value) || 1;
              setBarChoice((prev) => ({ ...prev, qty: Math.max(1, v) }));
            }}
            style={{ width: 100, textAlign: "center" }}
          />
          <SmallButton
            type="button"
            aria-label="수량 증가"
            style={{ width: 44, padding: "8px 0" }}
            onClick={() => setBarChoice((p) => ({ ...p, qty: (p.qty || 1) + 1 }))}
          >
            +
          </SmallButton>
        </Inline>
        <HelpText>
          선택 사용량: <b>{toFixed3CustomStr(roundTo3Custom(selectedBar.grams * Math.max(1, barChoice.qty || 1)))}</b> g / <b>{fmtD((selectedBar.grams * Math.max(1, barChoice.qty || 1)) / DON_TO_GRAMS)}</b> 돈{" "}
          (환산 기준 권장 최대 {Math.floor(totalGrams / selectedBar.grams) || 1}개)
        </HelpText>
      </FormGroup>

      <SubTitle>안내</SubTitle>
      <InfoCard>
        {(() => {
          const qty = Math.max(1, barChoice.qty || 1);
          const usedExact = selectedBar.grams * qty;
          const shortfallG = Math.max(0, usedExact - totalGrams);
          const leftoverG = Math.max(0, totalGrams - usedExact);
          const groupMin = BAR_GROUPS[barGroup][0];

          if (shortfallG > 0) {
            return (
              <p style={{ margin: 0 }}>
                선택한 골드바가 환산량보다 <b>{(Math.round(shortfallG * 100) / 100).toFixed(2)} g</b> (<b>{fmtD(shortfallG / DON_TO_GRAMS)} 돈</b>) 만큼 <b>추가</b>로 필요합니다.
              </p>
            );
          }

          const extraCombo = breakdownByDenoms(leftoverG);
          if (leftoverG >= groupMin.grams) {
            return (
              <>
                <p style={{ margin: 0 }}>
                  남는 무게는 <b>{(Math.round(leftoverG * 100) / 100).toFixed(2)} g</b> (<b>{fmtD(leftoverG / DON_TO_GRAMS)} 돈</b>) 입니다. 다음과 같은 추가 조합이 가능합니다:
                </p>
                <div style={{ marginTop: 8 }}>
                  {extraCombo.items.map(({ denom, qty: q }) => (
                    <span
                      key={`${denom.key}-${q}`}
                      style={{
                        display: "inline-block",
                        padding: "6px 10px",
                        borderRadius: 9999,
                        margin: "6px 6px 0 0",
                        background: "#eef2ff",
                        color: "#4338ca",
                        fontWeight: 800,
                        fontSize: ".9rem",
                      }}
                    >
                      {denom.label} × {q}
                    </span>
                  ))}
                </div>
                <p style={{ margin: "10px 0 0", fontWeight: 700 }}>남은 금은 매입 가능합니다.</p>
              </>
            );
          }

          const needMore = Math.max(0, groupMin.grams - leftoverG);
          return (
            <>
              <p style={{ margin: 0 }}>
                남는 무게는 <b>{(Math.round(leftoverG * 100) / 100).toFixed(2)} g</b> (<b>{fmtD(leftoverG / DON_TO_GRAMS)} 돈</b>) 로, 선택 가능한 최솟값보다 적습니다.
              </p>
              <p style={{ margin: "6px 0 0" }}>
                <b>{groupMin.label}</b> 1개를 추가하려면 <b>{(Math.round(needMore * 100) / 100).toFixed(2)} g</b> (<b>{fmtD(needMore / DON_TO_GRAMS)} 돈</b>)이 더 필요합니다.
              </p>
              <p style={{ margin: "10px 0 0", fontWeight: 700 }}>남은 금은 매입 가능합니다.</p>
            </>
          );
        })()}
      </InfoCard>

      <SectionSeparator />
      <div style={{ display: "grid", gap: 10 }}>
        <Button type="button" onClick={onGoReserve}>골드바 교환 하러가기</Button>
        <GhostButton type="button" onClick={() => setStep(STEP.CALC)}>이전(수정)</GhostButton>
      </div>
    </Card>
  );
}

/* ── Step 3: 예약 ─────────────────────────────── */
function ReserveStep({
  error,
  setError,
  visitDate, setVisitDate,
  visitTime, setVisitTime,
  name, setName,
  phone, setPhone,
  address, setAddress,
  onSubmitReservation,
  loading,
  calculated, setStep,
}) {
  const dateKey = visitDate ? format(visitDate, "yyyy-MM-dd") : "";
  const taken = useReservedSlots(dateKey); // ✅ 날짜별 선점 시간 Set

  // 사용자가 선택해 둔 시간이 실시간으로 선점되면 자동 해제
  useEffect(() => {
    if (!visitTime || !dateKey) return;
    if (taken.has(visitTime)) setVisitTime("");
  }, [taken, visitTime, dateKey, setVisitTime]);

  const handleTimeChange = (e) => {
    const v = e.target.value;
    if (!dateKey) return;
    if (taken.has(v)) {
      setError("이미 예약된 시간입니다. 다른 시간을 선택해 주세요.");
      setVisitTime("");
      return;
    }
    setError("");
    setVisitTime(v);
  };

  return (
    <Card>
      <StepCenter><StepMark>스텝 3</StepMark></StepCenter>
      <Title>스텝 3. 나의 골드바 예약하기</Title>
      {error && <ErrorText role="alert">{error}</ErrorText>}

      <SubTitle>방문 예약</SubTitle>
      <FormGroup>
        <Label>방문 날짜</Label>
        <DatePicker
          selected={visitDate}
          onChange={(d) => { setError(""); setVisitTime(""); setVisitDate(d); }}
          dateFormat="yyyy-MM-dd"
          minDate={addDays(new Date(), 1)}
          filterDate={(date) => date.getDay() !== 0}
          placeholderText="날짜 선택"
        />
      </FormGroup>

      <FormGroup>
        <Label>방문 시간</Label>
        <Select value={visitTime} onChange={handleTimeChange} disabled={!visitDate}>
          <option value="">시간 선택</option>
          {TIME_SLOTS.map((t) => {
            const disabled = taken.has(t);
            return (
              <option key={t} value={t} disabled={disabled} aria-disabled={disabled}>
                {disabled ? `${t} (이미 예약된 시간)` : t}
              </option>
            );
          })}
        </Select>
      </FormGroup>
      <HelpText>
        일요일은 예약 불가이며, <b>(이미 예약된 시간)</b> 표기된 시간은 선택할 수 없습니다.
        가능한 다른 시간대를 선택해 주세요.
      </HelpText>

      <SectionSeparator />
      <SubTitle>연락처</SubTitle>

      <form
        onSubmit={(e) => {
          if (loading) { e.preventDefault(); return; } // 중복 제출 가드
          onSubmitReservation(e);
        }}
      >
        <FormGroup>
          <Label>성명</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="예: 홍길동" />
        </FormGroup>
        <FormGroup>
          <Label>전화번호</Label>
          <Input
            type="tel"
            inputMode="tel"
            placeholder="예: 010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
          />
        </FormGroup>
        <FormGroup>
          <Label>주소</Label>
          <Input
            placeholder="예: 부산광역시 진구 골드테마길 21 1층"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            autoComplete="street-address"
          />
        </FormGroup>

        <SectionSeparator />
        <div style={{ display: "grid", gap: 10 }}>
          <Button type="submit" disabled={loading} aria-busy={loading}>
            {loading ? "제출 중..." : "예약요청 하기"}
          </Button>
          <GhostButton
            type="button"
            onClick={() => setStep(calculated ? STEP.BARS : STEP.CALC)}
          >
            이전
          </GhostButton>
        </div>
      </form>
    </Card>
  );
}

/* ── Step 4: 완료 ─────────────────────────────── */
function DoneStep({ status, exchangeId }) {
  const gmapUrl = `https://maps.google.com/?q=${encodeURIComponent(STORE_INFO.address)}`;
  const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${STORE_INFO.address} ${STORE_INFO.name}`)}`;

  return (
    <>
      <GoldExchangeTracker status={status} />
      <Card>
        <Title>요청 접수 완료</Title>
        <SectionSeparator />
        <Title style={{ fontSize: "1.2rem" }}>매장 방문 안내</Title>
        <img
          src={shopLogo}
          alt="원일귀금속 로고"
          width={320}
          loading="lazy"
          decoding="async"
          style={{ width: 320, height: "auto", margin: "10px auto", display: "block" }}
        />
        <p><strong>상호:</strong> {STORE_INFO.name}</p>
        <p><strong>주소:</strong> {STORE_INFO.address}</p>
        <p>
          <strong>전화:</strong>{" "}
          <a href={`tel:${STORE_INFO.phone.replace(/-/g, "")}`}>{STORE_INFO.phone}</a>
        </p>
        <p>
          <strong>모바일:</strong>{" "}
          <a href={`tel:${STORE_INFO.mobile.replace(/-/g, "")}`}>{STORE_INFO.mobile}</a>
        </p>
        <HelpText>아래 버튼을 눌러 지도를 확인해 보세요!</HelpText>
        <Inline style={{ marginTop: 10 }}>
          <Button type="button" onClick={() => window.open(gmapUrl, "_blank")}>
            Google 지도
          </Button>
          <OutlineButton
            type="button"
            onClick={() => window.open(naverUrl, "_blank")}
          >
            네이버 지도
          </OutlineButton>
        </Inline>
      </Card>

      <SectionSeparator />
      <Title style={{ fontSize: "1.2rem" }}>고객 리뷰</Title>
      {exchangeId && <ReviewList exchangeId={exchangeId} />}
    </>
  );
}

/* ── Main Component ───────────────────────────── */
export default function GoldExchange() {
  const { user } = useAuthContext();
  const guard = useGuardAction();

  /* 스텝 상태 */
  const [step, setStep] = useState(STEP.CALC);

  /* 계산 상태 */
  const [products, setProducts] = useState([
    { goldType: "", quantity: "", inputUnit: "g", exchangeType: "999.9골드바", finalWeight: 0 },
  ]);
  const [calculated, setCalculated] = useState(false);

  /* 골드바 선택 상태 */
  const [barGroup, setBarGroup] = useState("don");
  const [barChoice, setBarChoice] = useState({ idx: 0, qty: 1 });
  const initializedChoiceRef = useRef(false);

  /* 예약/연락처 */
  const [visitDate, setVisitDate] = useState(null);
  const [visitTime, setVisitTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  /* 제출/결과 */
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [exchangeId, setExchangeId] = useState(null); // groupId
  const [status, setStatus] = useState("requested");

  /* 환산율 */
  const [rates, setRates] = useState({ purity: DEFAULT_PURITY, exchange: DEFAULT_EXCHANGE });

  /* 예약 상태 구독 → 그룹 요약 문서 구독 유지 */
  useEffect(() => {
    if (!exchangeId) return;
    const refDoc = doc(db, "goldExchangeGroups", exchangeId);
    const unsub = onSnapshot(refDoc, (snap) => {
      const s = snap.data()?.repStatus;
      if (s) setStatus(s);
    });
    return () => unsub();
  }, [exchangeId]);

  /* 환산율 실시간 구독(공용 모듈 사용) */
  useEffect(() => {
    const unsub = subscribeGoldRates(
      db,
      (merged) => setRates(merged),
      (msg, err) => console.error(msg, err)
    );
    return () => unsub && unsub();
  }, []);

  /* 사용자 정보로 기본값 채우기 */
  useEffect(() => {
    if (!user) return;
    setPhone((prev) => prev || user.phoneNumber || "");
  }, [user]);

  /* 계산 로직 (UI 표시용) */
  const computeFinalWeight = ({ quantity, inputUnit, goldType, exchangeType }) => {
    const n = parseFloat(quantity);
    if (isNaN(n) || n <= 0) return 0;
    const grams = inputUnit === "g" ? n : n * DON_TO_GRAMS;
    return computeFinalWeightFromRates({
      grams,
      goldType,
      exchangeType,
      purity: rates.purity,
      exchange: rates.exchange,
    });
  };

  const handleProductChange = useCallback((idx, field, value) => {
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }, []);

  const addProduct = () =>
    setProducts((prev) => [
      ...prev,
      { goldType: "", quantity: "", inputUnit: "g", exchangeType: "999.9골드바", finalWeight: 0 },
    ]);

  const removeProduct = (idx) =>
    setProducts((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  /* 스텝1: 결과 계산 */
  const onCalculateCore = (e) => {
    e.preventDefault();
    setError("");

    for (const p of products) {
      const qty = parseFloat(p.quantity);
      if (!p.goldType || !p.exchangeType || isNaN(qty) || qty <= 0) {
        setError("모든 제품 항목을 정확히 입력해주세요.");
        return;
      }
    }

    const hasEtc = products.some((p) => p.goldType === '기타(문의)');
    if (hasEtc) {
      setCalculated(false);
      setStep(STEP.RESERVE);
      return;
    }

    setProducts((prev) => prev.map((p) => ({ ...p, finalWeight: computeFinalWeight(p) })));
    setCalculated(true);
    initializedChoiceRef.current = false;
    setStep(STEP.BARS);
  };

  const onCalculate = guard(onCalculateCore, {
    intent: "exchange-calc",
    requireVerified: false,
  });

  const onGoReserveDirect = guard(() => {
    setCalculated(false);
    setStep(STEP.RESERVE);
  }, {
    intent: "reserve-direct",
    requireVerified: false,
  });

  const onGoReserve = () => setStep(STEP.RESERVE);

  /* 합계/포맷 */
  const totalGramsRaw = products.reduce((sum, p) => sum + (p.finalWeight || 0), 0);
  const totalGrams = roundTo3Custom(totalGramsRaw);
  const totalDon = totalGrams / DON_TO_GRAMS;
  const fmtG = (n) => toFixed3CustomStr(n);
  const fmtD = (n) => Number(n).toFixed(2);

  /* 계산 후 골드바 기본 선택 */
  useEffect(() => {
    if (!calculated || initializedChoiceRef.current) return;
    if (totalGrams <= 0) return;
    const best = findBestChoice(totalGrams);
    setBarGroup(best.group);
    const maxQty = Math.max(1, Math.floor(totalGrams / BAR_GROUPS[best.group][best.idx].grams));
    setBarChoice({ idx: best.idx, qty: maxQty });
    initializedChoiceRef.current = true;
  }, [calculated, totalGrams]);

  /* barsPlan 생성 (서버 저장용) */
  const makeBarsPlan = () => {
    if (!calculated) return undefined;
    const current = BAR_GROUPS[barGroup];
    const idx = Math.min(barChoice.idx, current.length - 1);
    const selectedBar = current[idx];
    const maxSelectableQty = Math.floor(totalGrams / selectedBar.grams) || 1;
    const qty = Math.min(Math.max(1, barChoice.qty || 1), Math.max(1, maxSelectableQty));
    const usedByChoice = roundTo3Custom(selectedBar.grams * qty);
    const leftoverGrams = roundTo3Custom(Math.max(0, totalGrams - usedByChoice));
    const leftoverDon = leftoverGrams / DON_TO_GRAMS;
    const extraCombo = breakdownByDenoms(leftoverGrams);

    return {
      category: barGroup,
      totalGrams: Number(fmtG(totalGrams)),
      totalDon: Number(fmtD(totalDon)),
      selected: {
        label: selectedBar.label,
        grams: selectedBar.grams,
        don: selectedBar.don,
        qty,
        usedGrams: Number(fmtG(usedByChoice)),
        usedDon: Number(fmtD(usedByChoice / DON_TO_GRAMS)),
      },
      leftoverGrams: Number(fmtG(leftoverGrams)),
      leftoverDon: Number(fmtD(leftoverDon)),
      autoBreakdown: extraCombo.items.map(({ denom, qty: q }) => ({
        label: denom.label,
        grams: denom.grams,
        don: denom.don,
        qty: q,
      })),
    };
  };

  /* 스텝3: 예약 제출 (callable로 원자 처리) */
  const onSubmitReservationCore = async (e) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }
    const phoneTrim = (phone || "").trim();
    const phoneDigits = phoneTrim.replace(/[^\d+]/g, "");
    if (!name || !address || !phoneTrim) {
      setError("성명, 전화번호, 주소는 필수입니다.");
      return;
    }
    if (phoneDigits.length < 9) {
      setError("전화번호 형식을 다시 확인해 주세요.");
      return;
    }
    if (!visitDate) {
      setError("방문 날짜를 선택해주세요.");
      return;
    }
    if (!visitTime) {
      setError("방문 시간을 선택해주세요.");
      return;
    }

    const visitDateStr = format(visitDate, "yyyy-MM-dd");
    const barsPlan = makeBarsPlan();
    const hasValidProducts =
      calculated &&
      products.every((p) => p.goldType && !isNaN(parseFloat(p.quantity)) && parseFloat(p.quantity) > 0);

    const payload = {
      visitDate: visitDateStr,
      visitTime,
      name,
      phone: phoneTrim, // 서버 스키마 유지 (표시는 사용자가 입력한 형태)
      address,
      email: user.email || null,
      products: hasValidProducts
        ? products.map((p) => {
            const n = Number(p.quantity || 0);
            const gramsInput = p.inputUnit === "g" ? n : roundTo3Custom(n * DON_TO_GRAMS);
            return {
              goldType: p.goldType,
              quantity: roundTo3Custom(gramsInput),
              inputUnit: "g", // 서버는 g 기준
              exchangeType: p.exchangeType,
            };
          })
        : [], // 비계산(현장확인) 시 빈 배열
      barsPlan: barsPlan || null,
    };

    setLoading(true);
    try {
      const res = await submitGoldExchangeGroup(payload);
      if (!res?.ok || !res?.groupId) throw new Error("서버 응답이 올바르지 않습니다.");
      setExchangeId(res.groupId);
      setSubmitted(true);
      setStep(STEP.DONE);
    } catch (err) {
      const code = err?.code || "";
      if (code === "aborted") {
        setError("이미 예약된 시간입니다. 다른 시간을 선택해 주세요.");
        setVisitTime(""); // 즉시 해제하여 UI 동기화
      } else if (code === "unauthenticated" || code === "permission-denied") {
        setError("권한이 없습니다. 다시 로그인 해주세요.");
      } else if (code === "invalid-argument") {
        setError("입력값이 올바르지 않습니다. 다시 확인해 주세요.");
      } else {
        setError(`제출 실패: ${err?.message || "알 수 없는 오류"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitReservation = (e) => onSubmitReservationCore(e);

  return (
    <PageContainer>
      {step === STEP.CALC && (
        <CalcStep
          products={products}
          error={error}
          onCalculate={onCalculate}
          handleProductChange={handleProductChange}
          addProduct={addProduct}
          removeProduct={removeProduct}
          onGoReserveDirect={onGoReserveDirect}
        />
      )}

      {step === STEP.BARS && calculated && (
        <BarStep
          products={products}
          totalGrams={totalGrams}
          totalDon={totalDon}
          fmtG={fmtG}
          fmtD={fmtD}
          barGroup={barGroup}
          setBarGroup={setBarGroup}
          barChoice={barChoice}
          setBarChoice={setBarChoice}
          onGoReserve={onGoReserve}
          setStep={setStep}
        />
      )}

      {step === STEP.RESERVE && (
        <ReserveStep
          error={error}
          setError={setError}
          visitDate={visitDate}
          setVisitDate={setVisitDate}
          visitTime={visitTime}
          setVisitTime={setVisitTime}
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          address={address}
          setAddress={setAddress}
          onSubmitReservation={onSubmitReservation}
          loading={loading}
          calculated={calculated}
          setStep={setStep}
        />
      )}

      {step === STEP.DONE && submitted && (
        <DoneStep status={status} exchangeId={exchangeId} />
      )}
    </PageContainer>
  );
}
