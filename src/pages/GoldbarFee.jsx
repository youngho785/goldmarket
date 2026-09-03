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
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px 0 46px;

  @media (max-width: 720px) {
    padding: 8px 0 18px;
  }
`;

const Header = styled.header`
  position: relative;
  overflow: hidden;
  margin-bottom: 12px;
  padding: clamp(24px, 4.2vw, 42px);
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 72%, transparent);
  border-radius: 24px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 12px 30px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 13%, transparent);

  &::after {
    content: "G";
    position: absolute;
    right: -14px;
    bottom: -50px;
    color: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 8%, transparent);
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: clamp(8rem, 18vw, 12rem);
    font-weight: 900;
    line-height: 1;
    pointer-events: none;
  }

  @media (max-width: 540px) {
    padding: 21px 17px 22px;
    border-radius: 20px;
  }
`;

const Kicker = styled.p`
  position: relative;
  z-index: 1;
  margin: 0 0 7px;
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .64rem;
  font-weight: 900;
  letter-spacing: .14em;
`;

const Title = styled.h1`
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 0 8px;
  color: ${({ theme }) => theme.on.primary};
  font-size: clamp(1.8rem, 4.6vw, 3.1rem);
  font-weight: 760;
  line-height: 1.15;
  letter-spacing: -.04em;
  word-break: keep-all;
`;

const Lead = styled.p`
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 70%, transparent);
  font-size: .88rem;
  line-height: 1.65;
  word-break: keep-all;

  b {
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const CalcCard = styled.section`
  display: grid;
  grid-template-columns: auto auto minmax(160px, 1fr) auto minmax(240px, 340px);
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 20%, ${({ theme }) => theme.colors.border});
  border-radius: 20px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, ${({ theme }) => theme.semantic.badgeGoldBg} 48%, white) 0%,
      ${({ theme }) => theme.colors.surface} 56%
    );
  box-shadow: 0 8px 22px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 6%, transparent);

  @media (max-width: 840px) {
    grid-template-columns: 1fr 1fr;
    row-gap: 10px;
  }

  @media (max-width: 520px) {
    padding: 13px;
    border-radius: 18px;
  }
`;

const CalcLabel = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-size: .82rem;
  font-weight: 900;
  white-space: nowrap;

  @media (max-width: 840px) {
    grid-column: 1 / -1;
  }
`;

const DividerDot = styled.span`
  color: ${({ theme }) => theme.colors.secondaryDark};
  opacity: .7;
  user-select: none;

  @media (max-width: 840px) {
    display: none;
  }
`;

const Input = styled.input`
  width: 100%;
  min-width: 160px;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.secondary};
    box-shadow: 0 0 0 3px
      color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent);
  }

  @media (max-width: 840px) {
    grid-column: span 1;
    min-width: 0;
  }
`;

const Select = styled.select`
  width: 100%;
  min-width: 120px;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: .92rem;

  @media (max-width: 840px) {
    grid-column: span 1;
    min-width: 0;
  }
`;

const popIn = keyframes`
  0% { transform: scale(0.98); opacity: .6; }
  100% { transform: scale(1); opacity: 1; }
`;

const ResultBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  justify-self: end;
  min-width: 240px;
  min-height: 54px;
  padding: 10px 13px;
  border: 1px solid
    color-mix(in srgb, ${({ theme }) => theme.colors.gold} 24%, transparent);
  border-radius: 14px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.on.primary};
  box-shadow: 0 8px 20px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 14%, transparent);
  animation: ${popIn} .18s ease-out;

  @media (max-width: 840px) {
    grid-column: 1 / -1;
    justify-self: stretch;
    min-width: 0;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 5px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, ${({ theme }) => theme.colors.gold} 14%, transparent);
  color: ${({ theme }) => theme.colors.goldLight};
  font-size: .74rem;
  font-weight: 850;
  white-space: nowrap;
`;

const ResultValue = styled.div`
  margin-left: auto;
  color: ${({ theme }) => theme.colors.goldLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: clamp(1.08rem, 3.5vw, 1.45rem);
  font-weight: 900;
  letter-spacing: -.02em;
  white-space: nowrap;
`;

const ResultSub = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 72%, transparent);
  font-size: .84rem;
`;

const ResultFallback = styled.div`
  color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 72%, transparent);
  font-size: .85rem;
  font-weight: 650;

  b {
    color: ${({ theme }) => theme.colors.goldLight};
  }
`;

const Card = styled.section`
  padding: clamp(16px, 3.2vw, 26px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 8px 22px
    color-mix(in srgb, ${({ theme }) => theme.colors.primary} 5%, transparent);
`;

const CardTitle = styled.h2`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: -.02em;
`;

const TableWrap = styled.div`
  overflow: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 640px) {
    overflow: hidden;
  }
`;

const Table = styled.table`
  width: 100%;
  min-width: 620px;
  border-collapse: collapse;

  th,
  td {
    padding: 11px 12px;
    text-align: left;
  }

  thead th {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.primary};
    font-size: .78rem;
    font-weight: 900;
  }

  tbody td {
    border-top: 1px solid ${({ theme }) => theme.colors.dividerSubtle};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
  }

  tbody td:first-child,
  tbody td:last-child {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
  }

  tbody tr:first-child td {
    border-top: none;
  }

  @media (max-width: 640px) {
    min-width: 0;
    table-layout: fixed;

    th:nth-child(2),
    th:nth-child(3),
    td:nth-child(2),
    td:nth-child(3) {
      display: none;
    }

    th,
    td {
      padding: 10px 11px;
    }

    th:first-child {
      width: 62% !important;
    }

    th:last-child {
      width: 38% !important;
      text-align: right;
    }

    td:first-child {
      font-size: .82rem;
    }

    td:last-child {
      text-align: right;
      white-space: nowrap;
      font-size: .82rem;
    }
  }
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
      <Header>
        <Kicker>GOLDBAR MAKING FEE SCHEDULE</Kicker>
        <Title>골드바 제작 공임 안내</Title>
        <Lead>
          나의 금을 <b>999.9 골드바</b>로 교환할 때 적용되는 제작 공임입니다.
          대표 규격과 예상 공임을 먼저 확인하고, 최종 금액은 매장에서 교환 확정 전에 안내받으세요.
        </Lead>
      </Header>

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
