// src/pages/GoldExchange.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import styled, { keyframes, css } from "styled-components";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useLoginGate } from "@/context/LoginGateContext";
import { db } from "../firebase/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { addDays, format } from "date-fns";
import GoldExchangeTracker from "../components/GoldExchangeTracker";
import PushPermissionPrompt from "../components/common/PushPermissionPrompt";
import shopLogo from "@/assets/logo.webp";
import useReservedSlots from "@/hooks/useReservedSlots"; // ✅ 예약 슬롯 훅
import useBookingAvailability, { getBookingAvailabilityEntry } from "@/hooks/useBookingAvailability";
import { nudgeAppInstall } from "@/hooks/useInstallPrompt";

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
import { fetchMyProfile } from "@/services/userService";
import {
  clearGoldExchangeDraft,
  draftDateToLocalDate,
  readGoldExchangeDraft,
  saveGoldExchangeDraft,
} from "@/lib/goldExchangeDraft";

/* ── 매장 정보 ─────────────────────────────────── */
const STORE_INFO = {
  name: "원일귀금속",
  address: "부산광역시 부산진구 골드테마길 21",
  phone: "051-646-9700",
  mobile: "010-7713-3739",
};

/* ── Styled Components ────────────────────────── */
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 28px 0 64px;
  background: transparent;
  min-height: calc(100svh - 180px);
`;

const FlowHeader = styled.header`
  width: 100%;
  max-width: 960px;
  margin-bottom: 24px;
  padding: clamp(24px, 4vw, 42px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.colors.surface};
`;

const PageEyebrow = styled.p`
  margin: 0 0 9px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .7rem;
  font-weight: 850;
  letter-spacing: .15em;
`;

const PageTitle = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.primary};
  font-size: clamp(2rem, 5vw, 3.45rem);
`;

const PageLead = styled.p`
  max-width: 700px;
  margin: 13px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const RebookNotice = styled.div`
  max-width: 760px;
  margin: 18px 0 0;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .92rem;
  line-height: 1.6;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const FlowTrack = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-top: 26px;
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 620px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FlowItem = styled.li`
  padding: 12px 13px;
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, $done, theme }) =>
    $active
      ? theme.colors.primary
      : $done
      ? theme.colors.goldLight
      : theme.colors.surfaceAlt};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.white : theme.colors.textSecondary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .69rem;
  font-weight: 800;
  text-align: center;

  &:first-child { border-left: 0; }
`;

const InfoCard = styled.div`
  padding: 15px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  line-height: 1.5;
`;

const Card = styled.div`
  position: relative;
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: clamp(20px, 4vw, 30px);
  width: 100%;
  max-width: 960px;
  margin-bottom: 18px;

  &::before {
    content: "";
    position: absolute;
    top: 13px;
    left: 13px;
    width: 34px;
    height: 34px;
    border-top: 1px solid ${({ theme }) => theme.colors.secondary};
    border-left: 1px solid ${({ theme }) => theme.colors.secondary};
    pointer-events: none;
  }
`;

const Title = styled.h2`
  margin: 0 0 14px;
  text-align: left;
  color: ${({ theme }) => theme.colors.text};
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

const ConsentBox = styled.div`
  margin: 18px 0;
  padding: 15px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const ConsentRow = styled.label`
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 10px;
  align-items: start;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 750;
  line-height: 1.5;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    margin: 2px 0 0;
    accent-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ConsentDetails = styled.p`
  margin: 10px 0 0 30px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .82rem;
  line-height: 1.55;
`;

const ConsentLink = styled.a`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: underline;
  text-underline-offset: 2px;
`;

const PrivacyModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.56);
`;

const PrivacyModal = styled.div`
  width: min(920px, 100%);
  height: min(82svh, 820px);
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const PrivacyModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

const PrivacyModalTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
`;

const PrivacyCloseButton = styled.button`
  flex: 0 0 auto;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  cursor: pointer;
`;

const PrivacyFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: 0;
  background: ${({ theme }) => theme.colors.surface};
`;

const Input = styled.input`
  padding: 11px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.surface};
`;

const Select = styled.select`
  padding: 11px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.surface};
`;

const Button = styled.button`
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 0;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: 1.05rem;
  font-weight: 900;
  cursor: pointer;
  transition: filter .18s ease, transform .12s ease;
  &:hover { filter: brightness(1.03); transform: translateY(-1px); }
  &:disabled { background: ${({ theme }) => theme.colors.disabled}; cursor: not-allowed; }
`;

const OutlineButton = styled(Button)`
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  border: 1.5px solid ${({ theme }) => theme.colors.primary};
`;

const GhostButton = styled(Button)`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
`;

const SmallButton = styled(Button)`
  width: auto;
  padding: 8px 12px;
  border-radius: 0;
  font-size: .95rem;
`;

const RemoveButton = styled(SmallButton)`
  background: ${({ theme }) => theme.colors.error};
  &:hover { filter: brightness(1.03); }
  margin-left: auto;
`;

const Inline = styled.div`
  display: flex; gap: 10px; align-items: center;
`;

const SectionSeparator = styled.div`
  height: 1px; background: ${({ theme }) => theme.colors.dividerSubtle}; margin: 18px 0;
`;

const ErrorText = styled.p`
  font-size: 1.05rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.error};
  margin: 4px 0 12px;
`;

const TableWrap = styled.div`
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th, td { padding: 12px 14px; text-align: left; }
  thead th {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    font-weight: 900;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  tbody td { border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle}; }
  tbody tr:first-child td { border-top: none; }
  tfoot td { font-weight: 900; background: ${({ theme }) => theme.colors.surfaceAlt}; }
`;

/* 세그먼트(그램/돈 탭) */
const Seg = styled.div`
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 6px;
  border-radius: 0;
  width: 100%;
  max-width: 320px;
`;
const SegBtn = styled.button`
  border: 0;
  padding: 10px 12px;
  border-radius: 0;
  font-weight: 900;
  cursor: pointer;
  background: ${({ $active, theme }) => ($active ? theme.colors.surface : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)}; 
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadows.xs : "none")};
`;

/* 추천 하이라이트/스타일 */
const aiPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gm-gold) 30%, transparent); }
  60%  { box-shadow: 0 0 0 12px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;
const AIBadge = styled.span`
  display: inline-flex; align-items: center; gap: 6px;
  font-size: .75rem; font-weight: 900;
  padding: 4px 8px; border-radius: 9999px;
  color: ${({ theme }) => theme.on.primary};
  background: ${({ theme }) => theme.gradients.primary};
  border: 1px solid ${({ theme }) => theme.colors.secondary}66;
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
  border: 2px solid ${({ $active, $recommended, theme }) =>
    $active ? theme.colors.gold : $recommended ? theme.colors.primary : theme.colors.border};
  background:
    ${({ $active, $recommended, theme }) =>
      $active
        ? theme.colors.goldLight
        : $recommended
        ? theme.gradients.recommendation
        : "transparent"};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.text)};
  border-radius: 0;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 4px;
  transition: border-color .15s ease, box-shadow .15s ease, background .15s ease, transform .06s ease;
  &:hover {
    border-color: ${({ $recommended, theme }) =>
      $recommended ? theme.colors.primary : theme.colors.gold};
    box-shadow: 0 0 0 2px color-mix(in srgb, ${({ theme }) => theme.colors.gold} 18%, transparent);
    transform: translateY(-1px);
  }
  ${({ $recommended }) =>
    $recommended &&
    css`
      &::after{
        content: "";
        position: absolute;
        inset: -2px;
        border-radius: 0;
        background: ${({ theme }) => theme.gradients.recommendation};
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
  border: 2px solid ${({ theme }) => theme.colors.gold};
  background: ${({ theme }) => theme.colors.goldLight};
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-weight: 900;
  border-radius: 0;
  text-align: center;
  letter-spacing: .4px;
`;

/* ── Constants & Helpers ───────────────────────── */
const STEP = { CALC: 0, BARS: 1, RESERVE: 2, DONE: 3 };
const TIME_SLOTS = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const MAX_BOOKING_DAYS_AHEAD = 60;
const MAX_PRODUCTS_PER_BOOKING = 20;
const MAX_PRODUCT_GRAMS = 10_000;
const MAX_NAME_LENGTH = 40;
const MAX_PHONE_LENGTH = 20;

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
const MIN_BAR_GRAMS = ALL_DENOMS[0].grams;

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
    ? `${Number(n).toFixed(2)} g (${(roundTo3Custom(n / DON_TO_GRAMS_CONST)).toFixed(2)} 돈)`
    : `${Number(n * DON_TO_GRAMS_CONST).toFixed(2)} g (${(roundTo3Custom(n)).toFixed(2)} 돈)`;
};
const qtyHelperText = (qty, unit) => {
  const n = parseFloat(qty);
  if (isNaN(n) || n <= 0) return "그램(g) 또는 돈 단위를 선택하고 값을 입력하면 자동 환산됩니다.";
  return unit === "g"
    ? `${Number(n).toFixed(2)} g ≈ ${(roundTo3Custom(n / DON_TO_GRAMS_CONST)).toFixed(2)} 돈`
    : `${(roundTo3Custom(n)).toFixed(2)} 돈 ≈ ${Number(n * DON_TO_GRAMS_CONST).toFixed(2)} g`;
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
    const next = isNaN(v) ? "" : roundTo3Custom(v).toFixed(2);
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
        <Title>스텝 1. 내 금 종류와 무게 입력</Title>
        {error && <ErrorText role="alert">{error}</ErrorText>}

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
                  아래 <b>“순도·무게를 몰라도 방문예약”</b>으로 진행해 주세요.
                </HelpText>
              )}

              <Label>수량</Label>
              <Inline>
                <QuantityField
                  name={`quantity-${idx}`}
                  value={p.quantity}
                  unit={p.inputUnit}
                  placeholder="예: 37.50"
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
          <Button type="submit">예상 순금 중량과 골드바 조합 확인</Button>
        </form>
      </Card>

      <Card>
        <StepCenter><StepMark>바로 예약</StepMark></StepCenter>
        <Title>순도와 무게를 몰라도 방문예약</Title>
        <HelpText>
          금의 순도와 무게를 몰라도 괜찮습니다. 매장에서 고객과 함께 확인하고,
          최종 중량과 공임에 동의한 뒤 골드바 교환을 진행합니다.
        </HelpText>
        <OutlineButton
          type="button"
          onClick={onGoReserveDirect}
          style={{ marginTop: 12 }}
        >
          현장 확인 방문예약
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
  if (totalGrams < MIN_BAR_GRAMS) {
    const needed = roundTo3Custom(MIN_BAR_GRAMS - totalGrams);
    return (
      <Card>
        <StepCenter><StepMark>스텝 2</StepMark></StepCenter>
        <Title>예상 순금이 1g 미만입니다</Title>
        <InfoCard role="status">
          <p style={{ margin: 0 }}>
            예상 순금은 <b>{fmtG(totalGrams)}g</b>이며, 최소 골드바 1g까지
            <b> {toFixed3CustomStr(needed)}g</b>이 더 필요합니다.
          </p>
          <p style={{ margin: "8px 0 0" }}>
            1g 골드바를 임의로 선택하지 않습니다. 제품을 추가하거나 매장에서 실측 후
            매입·교환 방법을 안내받으세요.
          </p>
        </InfoCard>
        <SectionSeparator />
        <div style={{ display: "grid", gap: 10 }}>
          <Button type="button" onClick={onGoReserve}>현장 확인 방문예약</Button>
          <GhostButton type="button" onClick={() => setStep(STEP.CALC)}>이전(제품 추가)</GhostButton>
        </div>
      </Card>
    );
  }

  const current = BAR_GROUPS[barGroup];
  let recIdx = -1;
  for (let i = 0; i < current.length; i++) {
    if (current[i].grams <= totalGrams + 1e-9) recIdx = i;
  }
  const topUpIdx = current.findIndex((d) => d.grams > totalGrams + 1e-9);
  const maxVisibleIdx = topUpIdx >= 0 ? topUpIdx : current.length - 1;

  const safeIdx = Math.min(Math.max(0, barChoice.idx), maxVisibleIdx);
  const selectedBar = current[safeIdx];
  // 현재 환산량으로 만들 수 있는 수량 + 부족분을 보태서 만들 수 있는 바로 다음 수량까지 허용
  const maxSelectableQty = Math.max(1, Math.ceil((totalGrams - 1e-9) / selectedBar.grams));
  const safeQty = Math.min(
    maxSelectableQty,
    Math.max(1, Number(barChoice.qty) || 1)
  );

  const isTileRecommended = (i) => i === recIdx;
  const isTileTopUp = (i) => i === topUpIdx;

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
              <td colSpan={2}>합계(예상 순금)</td>
              <td>{fmtG(totalGrams)} g</td>
              <td>{fmtD(totalDon)} 돈</td>
            </tr>
          </tfoot>
        </Table>
      </TableWrap>

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
          const topUpRecommended = isTileTopUp(i);
          const disabled = i > maxVisibleIdx;
          const topUpGramsForOne = roundTo3Custom(Math.max(0, d.grams - totalGrams));
          return (
            <DenomTile
              key={d.key}
              type="button"
              $active={active}
              $recommended={recommended || topUpRecommended}
              role="radio"
              aria-checked={active}
              aria-label={`${d.label}${recommended ? " — 현재 금으로 추천" : topUpRecommended ? " — 조금 추가해서 선택 가능" : ""}`}
              tabIndex={disabled ? -1 : 0}
              disabled={disabled}
              style={disabled ? { opacity: 0.42, cursor: "not-allowed" } : undefined}
              onClick={() => {
                if (disabled) return;
                const nextMaxQty = Math.max(1, Math.ceil((totalGrams - 1e-9) / d.grams));
                setBarChoice({ idx: i, qty: Math.min(nextMaxQty, Math.max(1, safeQty)) });
              }}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const nextMaxQty = Math.max(1, Math.ceil((totalGrams - 1e-9) / d.grams));
                  setBarChoice({ idx: i, qty: Math.min(nextMaxQty, Math.max(1, safeQty)) });
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                <div style={{ fontWeight: 900 }}>{d.label}</div>
                {recommended && <AIBadge>현재 금 추천</AIBadge>}
                {topUpRecommended && !recommended && <AIBadge>추가해서 선택</AIBadge>}
              </div>
              <div style={{ fontSize: ".9rem", color: "var(--gm-text-secondary)" }}>
                ≈ {fmtD(d.don)} 돈 / {toFixed3CustomStr(d.grams)} g
              </div>
              {topUpRecommended && topUpGramsForOne > 0 && (
                <div style={{ fontSize: ".82rem", fontWeight: 800, color: "var(--gm-primary)" }}>
                  + {fmtD(topUpGramsForOne / DON_TO_GRAMS)} 돈 ({toFixed3CustomStr(topUpGramsForOne)}g) 추가 시 1개 선택 가능
                </div>
              )}
              {disabled && (
                <div style={{ fontSize: ".8rem", color: "var(--gm-text-secondary)" }}>
                  바로 위 규격까지만 추가 선택할 수 있습니다.
                </div>
              )}
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
            max={maxSelectableQty}
            step="1"
            value={safeQty}
            onChange={(e) => {
              const v = Number(e.target.value) || 1;
              const qty = Math.min(maxSelectableQty, Math.max(1, Math.trunc(v)));
              setBarChoice((prev) => ({ ...prev, qty }));
            }}
            style={{ width: 100, textAlign: "center" }}
          />
          <SmallButton
            type="button"
            aria-label="수량 증가"
            style={{ width: 44, padding: "8px 0" }}
            disabled={safeQty >= maxSelectableQty}
            onClick={() =>
              setBarChoice((p) => ({
                ...p,
                qty: Math.min(maxSelectableQty, Math.max(1, (p.qty || 1) + 1)),
              }))
            }
          >
            +
          </SmallButton>
        </Inline>
        <HelpText>
          선택 골드바 총중량: <b>{toFixed3CustomStr(roundTo3Custom(selectedBar.grams * safeQty))}</b> g / <b>{fmtD((selectedBar.grams * safeQty) / DON_TO_GRAMS)}</b> 돈{" "}
          (선택 가능 최대 {maxSelectableQty}개)
        </HelpText>
      </FormGroup>

      <SubTitle>안내</SubTitle>
      <InfoCard>
        {(() => {
          const qty = safeQty;
          const usedExact = selectedBar.grams * qty;
          const topUpG = roundTo3Custom(Math.max(0, usedExact - totalGrams));
          const leftoverG = roundTo3Custom(Math.max(0, totalGrams - usedExact));
          const groupMin = BAR_GROUPS[barGroup][0];

          if (topUpG > 0) {
            return (
              <>
                <p style={{ margin: 0 }}>
                  현재 예상 순금은 <b>{fmtG(totalGrams)}g</b> ({fmtD(totalDon)}돈)이며, 선택한 <b>{selectedBar.label} × {qty}</b>를 만들려면
                  <b> {toFixed3CustomStr(topUpG)}g</b> (<b>{fmtD(topUpG / DON_TO_GRAMS)}돈</b>)을 추가하면 됩니다.
                </p>
                <p style={{ margin: "8px 0 0", fontWeight: 700 }}>
                  실제 추가량과 금액은 방문 시 실측한 순금 중량과 당일 기준에 따라 최종 안내됩니다.
                </p>
              </>
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
                        background: "var(--gm-info-soft)",
                        color: "var(--gm-primary)",
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
                남는 금은 <b>{(Math.round(leftoverG * 100) / 100).toFixed(2)} g</b> (<b>{fmtD(leftoverG / DON_TO_GRAMS)} 돈</b>)입니다.
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
  user,
  isEmailVerified,
  error,
  setError,
  visitDate, setVisitDate,
  visitTime, setVisitTime,
  name, setName,
  phone, setPhone,
  privacyAccepted, setPrivacyAccepted,
  onRequireAuth,
  onSubmitReservation,
  loading,
  calculated, setStep,
}) {
  const dateKey = visitDate ? format(visitDate, "yyyy-MM-dd") : "";
  const taken = useReservedSlots(dateKey); // ✅ 날짜별 선점 시간 Set
  const { dates: bookingAvailabilityDates } = useBookingAvailability();
  const availability = useMemo(
    () => getBookingAvailabilityEntry({ dates: bookingAvailabilityDates }, dateKey),
    [bookingAvailabilityDates, dateKey]
  );
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    if (!privacyOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setPrivacyOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [privacyOpen]);

  // 사용자가 선택해 둔 시간이 실시간으로 선점되면 자동 해제
  useEffect(() => {
    if (!visitTime || !dateKey) return;
    if (taken.has(visitTime)) setVisitTime("");
  }, [taken, visitTime, dateKey, setVisitTime]);

  useEffect(() => {
    if (!dateKey) return;
    if (availability.closed) {
      setError(availability.reason || "해당 날짜는 예약을 받지 않습니다.");
      setVisitTime("");
      return;
    }
    if (visitTime && availability.blockedSlots.has(visitTime)) {
      setError(availability.reason || "해당 시간은 예약을 받지 않습니다.");
      setVisitTime("");
    }
  }, [availability.closed, availability.blockedSlots, availability.reason, dateKey, setError, setVisitTime, visitTime]);

  const handleTimeChange = (e) => {
    const v = e.target.value;
    if (!dateKey) return;
    if (taken.has(v) || availability.blockedSlots.has(v)) {
      setError(
        availability.blockedSlots.has(v)
          ? (availability.reason || "해당 시간은 예약을 받지 않습니다.")
          : "이미 예약된 시간입니다. 다른 시간을 선택해 주세요."
      );
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
          maxDate={addDays(new Date(), MAX_BOOKING_DAYS_AHEAD)}
          filterDate={(date) => date.getDay() !== 0 && !getBookingAvailabilityEntry({ dates: bookingAvailabilityDates }, format(date, "yyyy-MM-dd")).closed}
          placeholderText="날짜 선택"
        />
      </FormGroup>

      <FormGroup>
        <Label>방문 시간</Label>
        <Select value={visitTime} onChange={handleTimeChange} disabled={!visitDate}>
          <option value="">시간 선택</option>
          {TIME_SLOTS.map((t) => {
            const reserved = taken.has(t);
            const blocked = availability.blockedSlots.has(t);
            const disabled = reserved || blocked;
            return (
              <option key={t} value={t} disabled={disabled} aria-disabled={disabled}>
                {disabled ? `${t} (${blocked ? "예약 마감" : "이미 예약된 시간"})` : t}
              </option>
            );
          })}
        </Select>
      </FormGroup>
      <HelpText>
        일요일과 휴무일은 예약할 수 없으며, <b>예약 마감</b> 또는 <b>이미 예약된 시간</b>은 선택할 수 없습니다.
        가능한 다른 날짜와 시간을 선택해 주세요.
      </HelpText>

      {user && isEmailVerified ? (
        <>
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
          <Input
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
            required
            autoComplete="name"
            placeholder="예: 홍길동"
          />
        </FormGroup>
        <FormGroup>
          <Label>전화번호</Label>
          <Input
            type="tel"
            inputMode="tel"
            placeholder="예: 010-1234-5678"
            value={phone}
            maxLength={MAX_PHONE_LENGTH}
            onChange={(e) =>
              setPhone(
                e.target.value
                  .replace(/[^0-9+()\-\s]/g, "")
                  .slice(0, MAX_PHONE_LENGTH)
              )
            }
            required
            autoComplete="tel"
          />
        </FormGroup>
        <SectionSeparator />
        <ConsentBox>
          <ConsentRow>
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => {
                setError("");
                setPrivacyAccepted(e.target.checked);
              }}
              required
              aria-describedby="reservation-privacy-details"
            />
            <span>
              [필수] 방문 예약을 위한 개인정보 수집·이용에 동의합니다.{" "}
              <ConsentLink
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  setPrivacyOpen(true);
                }}
              >
                개인정보처리방침
              </ConsentLink>
            </span>
          </ConsentRow>
          <ConsentDetails id="reservation-privacy-details">
            수집 항목: 성명, 전화번호, 방문 날짜·시간 · 이용 목적: 방문 예약 접수와
            연락 · 보유 기간: 목적 달성 후 파기(관계 법령에 따른 보관 기간은 예외)
          </ConsentDetails>
        </ConsentBox>

        {privacyOpen && (
          <PrivacyModalBackdrop
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setPrivacyOpen(false);
            }}
          >
            <PrivacyModal
              role="dialog"
              aria-modal="true"
              aria-labelledby="privacy-modal-title"
            >
              <PrivacyModalHeader>
                <PrivacyModalTitle id="privacy-modal-title">
                  개인정보처리방침
                </PrivacyModalTitle>
                <PrivacyCloseButton
                  type="button"
                  onClick={() => setPrivacyOpen(false)}
                  aria-label="개인정보처리방침 닫기"
                >
                  닫기
                </PrivacyCloseButton>
              </PrivacyModalHeader>
              <PrivacyFrame
                src="/privacy"
                title="개인정보처리방침"
              />
            </PrivacyModal>
          </PrivacyModalBackdrop>
        )}

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
        </>
      ) : (
        <>
          <SectionSeparator />
          <InfoCard role="note">
            <p style={{ margin: 0, fontWeight: 850 }}>
              선택한 일정은 아직 예약된 것이 아닙니다.
            </p>
            <p style={{ margin: "8px 0 0" }}>
              {user
                ? "회원가입 때 받은 이메일 인증을 한 번 완료한 뒤 성명·전화번호 확인과 개인정보 동의를 거쳐 예약요청이 완료됩니다."
                : "로그인 또는 회원가입 후 이메일 인증을 완료하고, 성명·전화번호 확인과 개인정보 동의를 거쳐 예약요청이 완료됩니다."}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              인증을 진행하는 동안 이 시간은 선점되지 않습니다. 돌아오면 실시간 예약 상태를
              다시 확인하고, 이미 예약된 경우 다른 시간을 선택할 수 있습니다.
            </p>
            {dateKey && visitTime && (
              <p style={{ margin: "10px 0 0", fontWeight: 900 }}>
                선택 일정: {dateKey} {visitTime}
              </p>
            )}
          </InfoCard>

          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <Button type="button" onClick={onRequireAuth}>
              {user ? "이메일 인증하고 예약하기" : "이 일정으로 예약하기"}
            </Button>
            <GhostButton
              type="button"
              onClick={() => setStep(calculated ? STEP.BARS : STEP.CALC)}
            >
              이전
            </GhostButton>
          </div>
        </>
      )}
    </Card>
  );
}

/* ── Step 4: 완료 ─────────────────────────────── */
function DoneStep({ status }) {
  const gmapUrl = `https://maps.google.com/?q=${encodeURIComponent(STORE_INFO.address)}`;
  const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${STORE_INFO.address} ${STORE_INFO.name}`)}`;

  return (
    <>
      <GoldExchangeTracker status={status} />
      <Card>
        <Title>예약 신청 접수 완료</Title>
        <HelpText>관리자 확인 후 예약이 확정되면 알림으로 안내드립니다.</HelpText>

        <PushPermissionPrompt
          context="exchange-complete"
          variant="inline"
          snoozeDays={1}
        />

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

    </>
  );
}

/* ── Main Component ───────────────────────────── */
function normalizeRebookProducts(rebook) {
  const rawProducts = Array.isArray(rebook?.products) ? rebook.products : [];

  return rawProducts
    .slice(0, MAX_PRODUCTS_PER_BOOKING)
    .map((product) => {
      const goldType = String(product?.goldType || "").trim();
      const quantity = Number(product?.quantity);
      const inputUnit = product?.inputUnit === "don" ? "don" : "g";
      const exchangeType = String(product?.exchangeType || "999.9골드바").trim();

      if (!goldType || !Number.isFinite(quantity) || quantity <= 0) return null;

      return {
        goldType,
        quantity: String(quantity),
        inputUnit,
        exchangeType: exchangeType || "999.9골드바",
        finalWeight: 0,
      };
    })
    .filter(Boolean);
}

function getInitialProductsFromQuery() {
  const emptyProduct = {
    goldType: "",
    quantity: "",
    inputUnit: "g",
    exchangeType: "999.9골드바",
    finalWeight: 0,
  };
  if (typeof window === "undefined") return [emptyProduct];

  const params = new URLSearchParams(window.location.search);
  const goldType = String(params.get("type") || "").trim();
  const rawWeight = Number(params.get("w"));
  const inputUnit = params.get("unit") === "don" ? "돈" : "g";
  if (!goldType || !Number.isFinite(rawWeight) || rawWeight <= 0) {
    return [emptyProduct];
  }

  return [{
    ...emptyProduct,
    goldType,
    quantity: String(rawWeight),
    inputUnit,
  }];
}

export default function GoldExchange() {
  const { user, isEmailVerified } = useAuthContext();
  const { openGate } = useLoginGate();
  const location = useLocation();
  const rebook = location.state?.rebook || null;
  const resumeRequested =
    new URLSearchParams(location.search).get("resume") === "reservation";
  const authDraftRef = useRef(
    !rebook && resumeRequested ? readGoldExchangeDraft() : null
  );
  const authDraft = authDraftRef.current;
  const initialRebookProductsRef = useRef(normalizeRebookProducts(rebook));
  const isRebook = !!rebook;
  const isDirectRebook = isRebook && (rebook?.directReservation === true || initialRebookProductsRef.current.length === 0);

  /* 스텝 상태 */
  const [step, setStep] = useState(isRebook || authDraft ? STEP.RESERVE : STEP.CALC);
  const pageTopRef = useRef(null);

  // 같은 라우트 안에서 단계만 바뀌는 경우에도 새 단계의 맨 위부터 보여줍니다.
  // Capacitor 앱처럼 window 자체가 아닌 WebView 스크롤 컨테이너인 경우를 위해
  // scrollIntoView와 window.scrollTo를 함께 사용합니다.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const frame = window.requestAnimationFrame(() => {
      pageTopRef.current?.scrollIntoView?.({ block: "start", inline: "nearest", behavior: "auto" });
      window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
      if (document?.documentElement) document.documentElement.scrollTop = 0;
      if (document?.body) document.body.scrollTop = 0;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  /* 계산 상태 */
  const [products, setProducts] = useState(() =>
    initialRebookProductsRef.current.length > 0
      ? initialRebookProductsRef.current
      : authDraft?.products?.length
      ? authDraft.products
      : getInitialProductsFromQuery()
  );
  const [calculated, setCalculated] = useState(
    isRebook ? !isDirectRebook : !!authDraft?.calculated
  );

  /* 골드바 선택 상태 */
  const [barGroup, setBarGroup] = useState(
    authDraft?.barGroup === "grams" ? "grams" : "don"
  );
  const [barChoice, setBarChoice] = useState(() =>
    authDraft?.barChoice || { idx: 0, qty: 1 }
  );
  const initializedChoiceRef = useRef(!!authDraft?.calculated);

  /* 예약/연락처 */
  const [visitDate, setVisitDate] = useState(() =>
    draftDateToLocalDate(authDraft?.visitDate)
  );
  const [visitTime, setVisitTime] = useState(
    String(authDraft?.visitTime || "")
  );
  const [name, setName] = useState(() => String(rebook?.requester?.name || ""));
  const [phone, setPhone] = useState(() => String(rebook?.requester?.phone || ""));
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  /* 제출/결과 */
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [exchangeId, setExchangeId] = useState(null); // groupId
  const [status, setStatus] = useState("requested");

  /* 환산율 */
  const [rates, setRates] = useState({
    purity: DEFAULT_PURITY,
    exchange: DEFAULT_EXCHANGE,
  });

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

  /* 취소 예약 다시 신청: 기존 제품은 유지하고 현재 환산율로 다시 계산 */
  useEffect(() => {
    if (!isRebook || isDirectRebook) return;

    setProducts((prev) =>
      prev.map((product) => {
        const n = Number(product.quantity);
        if (!Number.isFinite(n) || n <= 0 || !product.goldType) {
          return { ...product, finalWeight: 0 };
        }
        const grams = product.inputUnit === "don" ? n * DON_TO_GRAMS : n;
        return {
          ...product,
          finalWeight: computeFinalWeightFromRates({
            grams,
            goldType: product.goldType,
            exchangeType: product.exchangeType,
            purity: rates.purity,
            exchange: rates.exchange,
          }),
        };
      })
    );
    setCalculated(true);
    initializedChoiceRef.current = false;
  }, [isDirectRebook, isRebook, rates.exchange, rates.purity]);

  /* 사용자 정보로 기본값 채우기 */
  useEffect(() => {
    if (!user?.uid) return undefined;

    let cancelled = false;

    setName((prev) => prev || user.displayName || "");
    setPhone((prev) => prev || user.phoneNumber || "");

    fetchMyProfile(user.uid)
      .then((profile) => {
        if (cancelled || !profile) return;
        setName((prev) => prev || profile.displayName || profile.name || "");
        setPhone((prev) => prev || profile.phone || "");
      })
      .catch((profileError) => {
        console.warn(
          "[GoldExchange] profile preload failed:",
          profileError?.message || profileError
        );
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.displayName, user?.phoneNumber]);

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

  const addProduct = () => {
    if (products.length >= MAX_PRODUCTS_PER_BOOKING) {
      setError(`제품은 한 예약에 최대 ${MAX_PRODUCTS_PER_BOOKING}개까지 추가할 수 있습니다.`);
      return;
    }
    setError("");
    setProducts((prev) => [
      ...prev,
      { goldType: "", quantity: "", inputUnit: "g", exchangeType: "999.9골드바", finalWeight: 0 },
    ]);
  };

  const removeProduct = (idx) =>
    setProducts((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  /* 스텝1: 결과 계산 */
  const onCalculateCore = (e) => {
    e.preventDefault();
    setError("");

    if (products.length > MAX_PRODUCTS_PER_BOOKING) {
      setError(`제품은 한 예약에 최대 ${MAX_PRODUCTS_PER_BOOKING}개까지 등록할 수 있습니다.`);
      return;
    }

    for (const p of products) {
      const qty = Number(p.quantity);
      const grams = p.inputUnit === "don" ? qty * DON_TO_GRAMS : qty;
      if (!p.goldType || !p.exchangeType || !Number.isFinite(qty) || qty <= 0) {
        setError("모든 제품 항목을 정확히 입력해주세요.");
        return;
      }
      if (!Number.isFinite(grams) || grams > MAX_PRODUCT_GRAMS) {
        setError(`제품 한 항목의 중량은 ${MAX_PRODUCT_GRAMS.toLocaleString("ko-KR")}g 이하여야 합니다.`);
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
    window.setTimeout(() => nudgeAppInstall("calculation-complete"), 1400);
  };

  // 예상 중량 계산은 로그인 없이 이용할 수 있습니다.
  const onCalculate = onCalculateCore;

  // 비회원도 날짜/시간 선택까지 진행할 수 있습니다.
  const onGoReserveDirect = () => {
    setCalculated(false);
    setStep(STEP.RESERVE);
  };

  const onGoReserve = () => setStep(STEP.RESERVE);

  const onRequireAuth = (event) => {
    event?.preventDefault?.();
    setError("");

    if (!visitDate) {
      setError("방문 날짜를 선택해주세요.");
      return;
    }
    if (!visitTime) {
      setError("방문 시간을 선택해주세요.");
      return;
    }

    const saved = saveGoldExchangeDraft({
      products,
      calculated,
      barGroup,
      barChoice,
      visitDate: format(visitDate, "yyyy-MM-dd"),
      visitTime,
    });

    if (!saved) {
      setError(
        "예약 진행 정보를 임시 저장하지 못했습니다. 브라우저 설정을 확인한 뒤 다시 시도해 주세요."
      );
      return;
    }

    openGate({
      title: user
        ? "이메일 인증 후 예약을 완료해 주세요"
        : "로그인 후 예약을 완료해 주세요",
      message: user
        ? "선택한 날짜와 시간을 보관했습니다. 회원가입 때 받은 이메일 인증을 완료하면 예약 화면으로 돌아옵니다."
        : "선택한 날짜와 시간을 보관했습니다. 로그인 또는 회원가입과 이메일 인증을 완료하면 예약 화면으로 돌아옵니다.",
      requireVerified: true,
      intent: "exchange-reservation-final",
      next: "/gold-exchange?resume=reservation",
    });
  };

  /* 합계/포맷 */
  const totalGramsRaw = products.reduce((sum, p) => sum + (p.finalWeight || 0), 0);
  const totalGrams = roundTo3Custom(totalGramsRaw);
  const totalDon = totalGrams / DON_TO_GRAMS;
  const fmtG = (n) => Number(n || 0).toFixed(2);
  const fmtD = (n) => Number(n).toFixed(2);

  /* 계산 후 골드바 기본 선택 */
  useEffect(() => {
    if (!calculated || initializedChoiceRef.current) return;
    if (totalGrams < MIN_BAR_GRAMS) return;
    const best = findBestChoice(totalGrams);
    setBarGroup(best.group);
    const maxQty = Math.max(1, Math.floor(totalGrams / BAR_GROUPS[best.group][best.idx].grams));
    setBarChoice({ idx: best.idx, qty: maxQty });
    initializedChoiceRef.current = true;
  }, [calculated, totalGrams]);

  /* barsPlan 생성 (서버 저장용) */
  const makeBarsPlan = () => {
    if (!calculated) return undefined;
    if (totalGrams < MIN_BAR_GRAMS) return null;
    const current = BAR_GROUPS[barGroup];
    const idx = Math.min(barChoice.idx, current.length - 1);
    const selectedBar = current[idx];
    const topUpIdx = current.findIndex((d) => d.grams > totalGrams + 1e-9);
    const maxVisibleIdx = topUpIdx >= 0 ? topUpIdx : current.length - 1;
    if (idx > maxVisibleIdx) {
      throw new Error("추가 선택은 현재 예상 중량의 바로 위 골드바 규격까지만 가능합니다.");
    }
    const maxSelectableQty = Math.max(1, Math.ceil((totalGrams - 1e-9) / selectedBar.grams));
    const qty = Math.max(1, Math.trunc(Number(barChoice.qty) || 1));
    if (qty > maxSelectableQty) {
      throw new Error(`선택 가능한 최대 수량은 ${maxSelectableQty}개입니다.`);
    }
    const usedByChoice = roundTo3Custom(selectedBar.grams * qty);
    const topUpGrams = roundTo3Custom(Math.max(0, usedByChoice - totalGrams));
    const topUpDon = topUpGrams / DON_TO_GRAMS;
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
      requiresTopUp: topUpGrams > 0,
      topUpGrams: Number(fmtG(topUpGrams)),
      topUpDon: Number(fmtD(topUpDon)),
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
    if (!isEmailVerified) {
      setError("이메일 인증을 완료한 회원만 예약할 수 있습니다.");
      onRequireAuth();
      return;
    }
    const nameTrim = (name || "").trim();
    const phoneTrim = (phone || "").trim();
    const phoneDigits = phoneTrim.replace(/\D/g, "");
    if (nameTrim.length < 2 || nameTrim.length > MAX_NAME_LENGTH) {
      setError(`성명은 2자 이상 ${MAX_NAME_LENGTH}자 이하로 입력해 주세요.`);
      return;
    }
    if (
      phoneTrim.length > MAX_PHONE_LENGTH ||
      !/^[0-9+()\-\s]+$/.test(phoneTrim) ||
      phoneDigits.length < 9 ||
      phoneDigits.length > 15
    ) {
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
    if (!privacyAccepted) {
      setError("방문 예약을 위한 개인정보 수집·이용에 동의해 주세요.");
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
      name: nameTrim,
      phone: phoneTrim, // 서버 스키마 유지 (표시는 사용자가 입력한 형태)
      privacyConsent: true,
      privacyConsentVersion: "reservation-v1.0",
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
      clearGoldExchangeDraft();
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
      } else if (
        code === "invalid-argument" ||
        code === "failed-precondition" ||
        code === "resource-exhausted" ||
        code === "already-exists"
      ) {
        setError(err?.message || "예약 정보를 다시 확인해 주세요.");
      } else {
        setError(`제출 실패: ${err?.message || "알 수 없는 오류"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitReservation = (e) => onSubmitReservationCore(e);

  return (
    <PageContainer ref={pageTopRef}>
      <FlowHeader>
        <PageEyebrow>GOLD EXCHANGE APPLICATION</PageEyebrow>
        <PageTitle>내 금을 999.9 골드바로 교환</PageTitle>
        <PageLead>
          예상 중량 계산과 방문 날짜·시간 선택까지 로그인 없이 이용할 수 있습니다.
          실제 예약요청은 로그인 또는 회원가입 후 완료합니다.
        </PageLead>
        {isRebook && (
          <RebookNotice role="status">
            <strong>취소된 예약 내용을 불러왔습니다.</strong><br />
            기존 제품과 연락처는 유지되며, 새로운 방문 날짜와 시간을 선택해 다시 신청해 주세요.
          </RebookNotice>
        )}
        <FlowTrack aria-label="금교환 진행 단계">
          {["01 예상계산", "02 조합선택", "03 방문예약", "04 접수완료"].map(
            (label, index) => (
              <FlowItem
                key={label}
                $active={step === index}
                $done={step > index}
                aria-current={step === index ? "step" : undefined}
              >
                {label}
              </FlowItem>
            )
          )}
        </FlowTrack>
      </FlowHeader>
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
          user={user}
          isEmailVerified={isEmailVerified}
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
          privacyAccepted={privacyAccepted}
          setPrivacyAccepted={setPrivacyAccepted}
          onRequireAuth={onRequireAuth}
          onSubmitReservation={onSubmitReservation}
          loading={loading}
          calculated={calculated}
          setStep={setStep}
        />
      )}

      {step === STEP.DONE && submitted && (
        <DoneStep status={status} />
      )}
    </PageContainer>
  );
}
