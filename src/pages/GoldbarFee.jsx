// src/pages/GoldbarFee.js
import React, { useMemo, useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";

/* ================================
   기본 상수
================================== */
const DON_TO_GRAMS = 3.75;

const GRAM_BARS = [1, 2, 3, 5, 10, 20, 30, 50, 100, 500]; // g 규격(2g 포함)
const DON_BARS  = [1, 2, 3, 5, 10, 15, 20];               // 돈 규격(15돈 포함)

/* ================================
   공임 규칙
   - 우선순위: g 특별규격 → 돈(특별) → 돈(구간) → 문의
   - 전 구간 +10,000원 추가 인상 적용 (요청 반영)
================================== */
// g 기준 특별 규격 (각 항목 +10,000원 추가 인상)
const SPECIAL_GRAM_FEES = new Map([
  [1,   40000],
  [2,   40000],
  [3,   40000],   // 3g 40,000원
  [50,  60000],
  [500, 150000],  // 500g 150,000원
]);

// 돈 기준 특별 규격 (각 항목 +10,000원 추가 인상)
const SPECIAL_DON_FEES = new Map([
  [3,  40000],    // 3돈 40,000원 (구간 규칙보다 우선)
  [15, 70000],
]);

// 돈 기준 구간 규칙 (각 구간 +10,000원 추가 인상, 경계: 하위 상한 미포함, 상위 하한 포함)
const FEE_RULES_DON = [
  { test: (d) => d >= 1 && d < 3,    fee: 40000 },  // 1 ~ 3 미만
  { test: (d) => d >= 3 && d <= 10,  fee: 50000 },  // 3 ~ 10 (단, 3돈은 SPECIAL_DON_FEES로 40,000원)
  { test: (d) => d >= 20 && d <= 30, fee: 70000 },  // 20 ~ 30
  { test: (d) => Math.abs(d - 50) < 1e-6, fee: 100000 }, // 정확히 50돈
];

const approxEq = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

/** 범위 포함 체크 (양끝 포함, 부동소수 여유) */
const inRange = (x, a, b, eps = 1e-6) => x > a - eps && x < b + eps;

const getFee = (donVal, gramVal) => {
  // 1) g-특별규격
  for (const [g, fee] of SPECIAL_GRAM_FEES.entries()) {
    if (approxEq(gramVal, g)) return fee;
  }
  // 2) 돈-특별규격
  for (const [d, fee] of SPECIAL_DON_FEES.entries()) {
    if (approxEq(donVal, d)) return fee;
  }
  // 3) 돈-구간 규칙
  for (const rule of FEE_RULES_DON) {
    if (rule.test(donVal)) return rule.fee;
  }
  // 4) 없으면 문의
  return null;
};

const formatKRW = (n) =>
  typeof n === "number" ? `${n.toLocaleString("ko-KR")}원` : n;

const toDon = (grams) => grams / DON_TO_GRAMS;
const toGrams = (don) => don * DON_TO_GRAMS;

const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;

/* ================================
   스타일
================================== */
const Page = styled.main`
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 16px 40px;
`;

const Title = styled.h1`
  margin: 0 0 10px;
  font-size: clamp(22px, 4.8vw, 28px);
  font-weight: 900;
  color: ${({ theme }) => theme.colors.text};
`;

const Lead = styled.p`
  margin: 0 18px 16px 0;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const CalcCard = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
  padding: 12px;
  margin-bottom: 16px;

  display: grid;
  grid-template-columns: auto auto minmax(160px, 1fr) auto minmax(240px, 340px);
  gap: 10px;
  align-items: center;

  @media (max-width: 840px) {
    grid-template-columns: 1fr 1fr;
    row-gap: 12px;
  }
`;

const CalcLabel = styled.span`
  font-weight: 900;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text};
  @media (max-width: 840px) { grid-column: 1 / -1; }
`;

const DividerDot = styled.span`
  opacity: .5;
  user-select: none;
  @media (max-width: 840px) { display: none; }
`;

const Input = styled.input`
  min-width: 160px;
  padding: 10px 12px;
  border: 1px solid #e6e8eb;
  border-radius: 10px;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  @media (max-width: 840px) { grid-column: span 1; }
`;

const Select = styled.select`
  min-width: 120px;
  padding: 10px 12px;
  border: 1px solid #e6e8eb;
  border-radius: 10px;
  font-size: 1rem;
  background: ${({ theme }) => theme.colors.surface};
  @media (max-width: 840px) { grid-column: span 1; }
`;

const popIn = keyframes`
  0% { transform: scale(0.98); opacity: .6; }
  100% { transform: scale(1); opacity: 1; }
`;

/* ★ 강조된 결과 박스 */
const ResultBox = styled.div`
  justify-self: end;
  border-radius: 14px;
  padding: 10px 14px;
  background:
    linear-gradient(#fff, #fff) padding-box,
    conic-gradient(from 180deg at 50% 50%, ${({ theme }) => theme.colors.primary}66, transparent 30%, ${({ theme }) => theme.colors.primary}66) border-box;
  border: 2px solid transparent;
  box-shadow: 0 8px 22px rgba(0,0,0,.08), 0 0 0 6px ${({ theme }) => theme.colors.primary}0d inset;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: ${popIn} .18s ease-out;
  min-width: 240px;

  @media (max-width: 840px) {
    grid-column: 1 / -1;
    justify-self: stretch;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: .82rem;
  font-weight: 800;
  background: ${({ theme }) => theme.colors.primary}15;
  color: ${({ theme }) => theme.colors.primary};
  white-space: nowrap;
`;

const ResultValue = styled.div`
  margin-left: auto;
  font-weight: 900;
  font-size: clamp(18px, 3.6vw, 24px);
  letter-spacing: -0.2px;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text};
`;

const ResultSub = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .9rem;
`;

const ResultFallback = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .95rem;
  font-weight: 600;
`;

/* 테이블/기타 */
const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
  padding: 16px;
`;

const CardTitle = styled.h2`
  margin: 0 0 10px;
  font-size: 1.1rem;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.text};
`;

const TableWrap = styled.div`
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td { padding: 10px 12px; text-align: left; }
  thead th {
    background: #f6f7f9;
    font-weight: 900;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  tbody td { border-top: 1px solid #f0f2f5; }
  tbody tr:first-child td { border-top: none; }
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/* ================================
   컴포넌트
================================== */
export default function GoldbarFee() {
  // 가로형 빠른 계산기 상태
  const [unit, setUnit] = useState("don"); // 'don' | 'g'
  const [amount, setAmount] = useState("");

  // 결과가 바뀔 때마다 시각적으로 다시 "튀도록" 하기 위한 키
  const [resultKey, setResultKey] = useState(0);
  useEffect(() => { setResultKey((k) => k + 1); }, [unit, amount]);

  const calc = useMemo(() => {
    const n = parseFloat(String(amount).replace(",", "."));
    if (isNaN(n) || n <= 0) return null;

    const don = unit === "don" ? n : n / DON_TO_GRAMS;
    const grams = unit === "g" ? n : n * DON_TO_GRAMS;

    // 기본 규칙
    let fee = getFee(don, grams);

    // ✅ 계산기 전용 오버라이드: 환산값이 11~14돈이면 60,000원 (기존 50,000 → +10,000 반영)
    if (inRange(don, 11, 14)) {
      fee = 60000;
    }

    return {
      don: round2(don),
      grams: round3(grams),
      fee,
      label: fee === null ? "문의" : formatKRW(fee),
    };
  }, [unit, amount]);

  // 표 데이터 생성: (1) g 규격, (2) 돈 규격
  const gramRows = useMemo(() => {
    return GRAM_BARS.map((g) => {
      const d = toDon(g);
      const fee = getFee(d, g);
      return {
        label: `${g} g 골드바`,
        grams: round3(g),
        don: round2(d),
        fee,
      };
    });
  }, []);

  const donRows = useMemo(() => {
    return DON_BARS.map((d) => {
      const g = toGrams(d);
      const fee = getFee(d, g);
      return {
        label: `${d}돈 골드바`,
        grams: round3(g),
        don: round2(d),
        fee,
      };
    });
  }, []);

  return (
    <Page>
      <Title>골드바 공임 안내</Title>
      <Lead>
        나의 금을 <b>999.9 골드바</b>로 교환할 때 드는 <b>골드바 공임</b>입니다.
        아래 대표 규격별 공임과 빠른 계산기를 참고해 주세요. 최종 금액은 매장 확인 후 확정됩니다.
      </Lead>

      {/* ── 가로형 빠른 계산기 */}
      <CalcCard aria-label="빠른 계산기">
        <CalcLabel>빠른 계산기</CalcLabel>
        <DividerDot>·</DividerDot>

        <Input
          type="text"
          inputMode="decimal"
          placeholder={unit === "don" ? "예: 3 (돈)" : "예: 3 (그램)"}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={unit === "don" ? "돈 입력" : "그램 입력"}
        />

        <Select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label="단위 선택"
        >
          <option value="don">돈(don)</option>
          <option value="g">그램(g)</option>
        </Select>

        {/* ★ 강조 결과 박스: aria-live로 접근성 개선 */}
        <ResultBox key={resultKey} aria-live="polite">
          {calc ? (
            <>
              <ResultSub>
                <Badge>{calc.don}돈 · {calc.grams}g</Badge>
              </ResultSub>
              <ResultValue>
                {calc.label}
              </ResultValue>
            </>
          ) : (
            <ResultFallback>값을 입력하면 <b>예상 공임</b>을 보여드려요</ResultFallback>
          )}
        </ResultBox>
      </CalcCard>

      {/* ── 대표 규격별 공임(표만 표시) */}
      <Card aria-labelledby="fee-table">
        <CardTitle id="fee-table">대표 규격별 공임</CardTitle>

        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th style={{ width: "40%" }}>규격</th>
                <th style={{ width: "20%" }}>돈(don)</th>
                <th style={{ width: "20%" }}>그램(g)</th>
                <th style={{ width: "20%" }}>예상 공임</th>
              </tr>
            </thead>
            <tbody>
              {/* g 규격 */}
              {gramRows.map((r) => (
                <tr key={`g-${r.grams}`}>
                  <td>{r.label}</td>
                  <td>{r.don}</td>
                  <td>{r.grams}</td>
                  <td>{r.fee ? formatKRW(r.fee) : <Muted>문의</Muted>}</td>
                </tr>
              ))}
              {/* 돈 규격 */}
              {donRows.map((r) => (
                <tr key={`d-${r.don}`}>
                  <td>{r.label}</td>
                  <td>{r.don}</td>
                  <td>{r.grams}</td>
                  <td>{r.fee ? formatKRW(r.fee) : <Muted>문의</Muted>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>

        <Muted style={{ display: "block", marginTop: 8 }}>
          * 표는 참고용이며, 공임은 변경될 수 있습니다.
        </Muted>
      </Card>
    </Page>
  );
}
