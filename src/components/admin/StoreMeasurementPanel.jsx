import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebase";
import { BAR_GROUPS } from "@/components/goldExchange/goldExchangeUi";
import { getGoldBarFeeEstimate, formatGoldBarFee } from "@/lib/goldBarFee";

const DON_TO_GRAMS = 3.75;

const Wrap = styled.section`
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Header = styled.div`
  display: grid;
  gap: 4px;

  h3 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.82rem;
    line-height: 1.5;
  }
`;

const ItemGrid = styled.div`
  display: grid;
  gap: 8px;
`;

const ItemCard = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 1.3fr) repeat(3, minmax(120px, 0.7fr));
  gap: 8px;
  align-items: end;
  padding: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const ProductInfo = styled.div`
  align-self: stretch;
  display: grid;
  align-content: center;
  gap: 4px;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.88rem;
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.76rem;
    line-height: 1.4;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.76rem;
  font-weight: 750;
`;

const Input = styled.input`
  width: 100%;
  min-height: 40px;
  padding: 8px 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;

  &:disabled,
  &:read-only {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const Select = styled.select`
  width: 100%;
  min-height: 40px;
  padding: 8px 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  display: grid;
  gap: 4px;
  padding: 10px 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  background: ${({ theme, $accent }) =>
    $accent ? theme.semantic.badgeGoldBg : theme.colors.surfaceAlt};

  small {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.74rem;
    font-weight: 700;
  }

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 1rem;
    font-weight: 900;
  }

  span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.76rem;
  }
`;

const FinalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Consent = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 11px;
  border: 1px solid ${({ theme, $checked }) =>
    $checked ? theme.colors.success : theme.colors.border};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.82rem;
  line-height: 1.5;

  input {
    margin-top: 3px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const SaveButton = styled.button`
  min-height: 40px;
  padding: 8px 13px;
  border: 0;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
`;

const InlineNote = styled.p`
  margin: 0;
  color: ${({ $error, theme }) =>
    $error ? theme.colors.error : theme.colors.textSecondary};
  font-size: 0.78rem;
  line-height: 1.5;
`;

const allBars = [
  ...BAR_GROUPS.grams.map((item) => ({ ...item, category: "grams" })),
  ...BAR_GROUPS.don.map((item) => ({ ...item, category: "don" })),
];

function round3(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 1000) / 1000;
}

function numberOrBlank(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(round3(number)) : "";
}

function bestBarForGrams(grams) {
  const total = Number(grams || 0);
  const under = allBars.filter((bar) => bar.grams <= total + 1e-9);
  if (under.length > 0) return under.sort((a, b) => b.grams - a.grams)[0];
  return allBars.slice().sort((a, b) => a.grams - b.grams)[0];
}

function findBarByPlan(plan, total) {
  const label = String(plan?.selected?.label || "");
  const grams = Number(plan?.selected?.grams);
  const matched = allBars.find(
    (bar) => bar.label === label && Math.abs(bar.grams - grams) < 0.0001
  );
  return matched || bestBarForGrams(total);
}

function planDelta(total, bar, qty) {
  const used = round3(Number(bar?.grams || 0) * Math.max(1, Number(qty) || 1));
  return {
    used,
    topUp: round3(Math.max(0, used - total)),
    leftover: round3(Math.max(0, total - used)),
  };
}

export default function StoreMeasurementPanel({
  group,
  items,
  disabled = false,
  onSaved,
  readOnly = false,
}) {
  const groupId = String(group?.id || "");
  const [rows, setRows] = useState({});
  const [barLabel, setBarLabel] = useState("");
  const [barQty, setBarQty] = useState(1);
  const [finalFeeWon, setFinalFeeWon] = useState("");
  const [customerConsentConfirmed, setCustomerConsentConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const nextRows = {};
    (items || []).forEach((item) => {
      nextRows[item.id] = {
        measuredWeightG: numberOrBlank(
          item.measuredWeightG ?? item.quantity ?? item.originalQuantity ?? 0
        ),
        measuredPurityPercent:
          item.measuredPurityPercent == null ? "" : numberOrBlank(item.measuredPurityPercent),
        confirmedPureGoldG: numberOrBlank(
          item.confirmedPureGoldG ?? item.finalWeight ?? 0
        ),
      };
    });
    setRows(nextRows);

    const basis = Number(
      group?.finalAppliedG ?? group?.finalRecognizedG ?? group?.totalG ?? 0
    );
    const plan = group?.finalBarsPlan || group?.barsPlan || null;
    const bar = findBarByPlan(plan, basis);
    setBarLabel(bar?.label || "");
    setBarQty(Math.max(1, Number(plan?.selected?.qty || 1)));
    setFinalFeeWon(
      group?.finalFeeWon == null ? "" : String(Math.max(0, Number(group.finalFeeWon) || 0))
    );
    setCustomerConsentConfirmed(group?.measurementStatus === "confirmed");
    setMessage("");
    setError("");
  }, [
    groupId,
    group?.measurementUpdatedAt,
    group?.repStatus,
    group?.finalAppliedG,
    group?.finalRecognizedG,
    group?.totalG,
    group?.finalBarsPlan,
    group?.barsPlan,
    group?.finalFeeWon,
    group?.measurementStatus,
    items,
  ]);

  const finalRecognizedG = useMemo(
    () => round3(
      Object.values(rows).reduce(
        (sum, row) => sum + (Number(row.confirmedPureGoldG) || 0),
        0
      )
    ),
    [rows]
  );

  const bonusUsedG =
    group?.bonusGoldUsageStatus === "used" ? Number(group?.bonusGoldUsedG || 0) : 0;
  const finalAppliedG = round3(finalRecognizedG + bonusUsedG);
  const validBars = useMemo(() => {
    const selected = [];
    ["grams", "don"].forEach((category) => {
      const categoryBars = allBars
        .filter((bar) => bar.category === category)
        .sort((a, b) => a.grams - b.grams);
      const under = categoryBars.filter((bar) => bar.grams <= finalAppliedG + 1e-9);
      selected.push(...under);
      const firstAbove = categoryBars.find((bar) => bar.grams > finalAppliedG + 1e-9);
      if (firstAbove) selected.push(firstAbove);
    });
    return selected.length ? selected : allBars.slice(0, 1);
  }, [finalAppliedG]);
  const selectedBar =
    validBars.find((bar) => bar.label === barLabel) ||
    bestBarForGrams(finalAppliedG);
  const normalizedQty = Math.max(1, Math.trunc(Number(barQty) || 1));
  const delta = planDelta(finalAppliedG, selectedBar, normalizedQty);
  const feeEstimate = getGoldBarFeeEstimate({
    grams: selectedBar?.grams,
    don: selectedBar?.don,
    qty: normalizedQty,
  });

  useEffect(() => {
    if (readOnly || group?.finalFeeWon != null) return;
    if (feeEstimate.totalFee != null) {
      setFinalFeeWon(String(feeEstimate.totalFee));
    }
  }, [barLabel, normalizedQty, feeEstimate.totalFee, group?.finalFeeWon, readOnly]);

  const updateRow = (id, field, value) => {
    setRows((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        [field]: value,
      },
    }));
  };

  const save = async () => {
    if (!groupId || saving || disabled) return;
    setError("");
    setMessage("");

    const payloadItems = (items || []).map((item) => {
      const row = rows[item.id] || {};
      return {
        id: item.id,
        measuredWeightG: Number(row.measuredWeightG),
        measuredPurityPercent:
          row.measuredPurityPercent === "" ? null : Number(row.measuredPurityPercent),
        confirmedPureGoldG: Number(row.confirmedPureGoldG),
      };
    });

    if (
      payloadItems.some(
        (item) =>
          !Number.isFinite(item.measuredWeightG) ||
          item.measuredWeightG < 0 ||
          !Number.isFinite(item.confirmedPureGoldG) ||
          item.confirmedPureGoldG < 0 ||
          item.confirmedPureGoldG > item.measuredWeightG + 0.001 ||
          (item.measuredPurityPercent != null &&
            (!Number.isFinite(item.measuredPurityPercent) ||
              item.measuredPurityPercent <= 0 ||
              item.measuredPurityPercent > 100))
      )
    ) {
      setError("실측 중량·확정 순금량·순도 값을 확인해 주세요. 확정 순금량은 실측 중량을 넘을 수 없습니다.");
      return;
    }

    const fee = Number(finalFeeWon);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100_000_000) {
      setError("최종 제작공임을 확인해 주세요.");
      return;
    }
    if (!selectedBar || finalAppliedG <= 0) {
      setError("확정 순금량과 최종 골드바 규격을 확인해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const call = httpsCallable(functions, "saveExchangeMeasurement");
      const response = await call({
        groupId,
        items: payloadItems,
        barsPlan: {
          category: selectedBar.category,
          selected: {
            label: selectedBar.label,
            grams: selectedBar.grams,
            qty: normalizedQty,
          },
        },
        finalFeeWon: fee,
        customerConsentConfirmed,
      });
      const result = response?.data || {};
      if (!result.ok) throw new Error("실측 결과 저장 결과를 확인할 수 없습니다.");

      setMessage(
        customerConsentConfirmed
          ? "실측 결과와 고객 동의가 확정 저장되었습니다. 이제 교환 완료 처리가 가능합니다."
          : "실측 결과를 임시 저장했습니다. 고객 확인 후 동의 체크를 저장해 주세요."
      );
      onSaved?.(result);
    } catch (saveError) {
      console.error("[StoreMeasurementPanel] save failed:", saveError);
      setError(
        saveError?.message?.replace(/^FirebaseError:\s*/i, "") ||
          "실측 결과를 저장하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  const locked = disabled || saving || readOnly;

  return (
    <Wrap aria-label={readOnly ? "확정 실측 결과" : "매장 실측 결과 입력"}>
      <Header>
        <h3>{readOnly ? "매장 실측 확정" : "매장 실측 · 최종 교환 조건"}</h3>
        <p>
          온라인 예상값은 원본 기록으로 보존됩니다. 매장에서 확인한 실측 중량과 확정 순금량을 별도로 기록합니다.
        </p>
      </Header>

      <ItemGrid>
        {(items || []).map((item) => {
          const row = rows[item.id] || {};
          return (
            <ItemCard key={item.id}>
              <ProductInfo>
                <strong>{item.productName || item.goldType || "제품"}</strong>
                <span>
                  온라인 예상 순금 {round3(item.finalWeight || 0).toFixed(3)}g · 요청 중량 {round3(item.quantity || 0).toFixed(3)}g
                </span>
              </ProductInfo>
              <Field>
                실측 중량(g)
                <Input
                  inputMode="decimal"
                  value={row.measuredWeightG ?? ""}
                  onChange={(event) => updateRow(item.id, "measuredWeightG", event.target.value)}
                  disabled={locked}
                />
              </Field>
              <Field>
                확인 순도(%) · 선택
                <Input
                  inputMode="decimal"
                  placeholder="예: 58.5"
                  value={row.measuredPurityPercent ?? ""}
                  onChange={(event) => updateRow(item.id, "measuredPurityPercent", event.target.value)}
                  disabled={locked}
                />
              </Field>
              <Field>
                확정 순금량(g)
                <Input
                  inputMode="decimal"
                  value={row.confirmedPureGoldG ?? ""}
                  onChange={(event) => updateRow(item.id, "confirmedPureGoldG", event.target.value)}
                  disabled={locked}
                />
              </Field>
            </ItemCard>
          );
        })}
      </ItemGrid>

      <SummaryGrid>
        <SummaryCard $accent>
          <small>실측 확정 순금량</small>
          <strong>{finalRecognizedG.toFixed(3)}g</strong>
          <span>{(finalRecognizedG / DON_TO_GRAMS).toFixed(2)}돈</span>
        </SummaryCard>
        <SummaryCard>
          <small>MEMBER GOLD 적용</small>
          <strong>{bonusUsedG > 0 ? `+${bonusUsedG.toFixed(2)}g` : "미적용"}</strong>
          <span>회원혜택 사용이 확정된 경우만 합산</span>
        </SummaryCard>
        <SummaryCard>
          <small>최종 적용량</small>
          <strong>{finalAppliedG.toFixed(3)}g</strong>
          <span>{(finalAppliedG / DON_TO_GRAMS).toFixed(2)}돈</span>
        </SummaryCard>
        <SummaryCard>
          <small>부족 / 잔여</small>
          <strong>
            {delta.topUp > 0 ? `부족 ${delta.topUp.toFixed(3)}g` : `잔여 ${delta.leftover.toFixed(3)}g`}
          </strong>
          <span>선택 골드바 총 {delta.used.toFixed(3)}g</span>
        </SummaryCard>
      </SummaryGrid>

      <FinalGrid>
        <Field>
          최종 골드바 규격
          <Select value={selectedBar?.label || ""} onChange={(e) => setBarLabel(e.target.value)} disabled={locked}>
            {validBars.map((bar) => (
              <option key={`${bar.category}-${bar.key}`} value={bar.label}>
                {bar.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          수량
          <Input
            type="number"
            min="1"
            max="10000"
            value={normalizedQty}
            onChange={(event) => setBarQty(event.target.value)}
            disabled={locked}
          />
        </Field>
        <Field>
          최종 제작공임(원)
          <Input
            inputMode="numeric"
            value={finalFeeWon}
            onChange={(event) => setFinalFeeWon(event.target.value.replace(/[^0-9]/g, ""))}
            disabled={locked}
          />
        </Field>
      </FinalGrid>

      <InlineNote>
        규격 기준 예상 공임 {formatGoldBarFee(feeEstimate.totalFee)} · 실제 공임은 현장 확인 후 입력한 최종 금액이 기록됩니다.
      </InlineNote>

      {!readOnly && (
        <Consent $checked={customerConsentConfirmed}>
          <input
            type="checkbox"
            checked={customerConsentConfirmed}
            onChange={(event) => setCustomerConsentConfirmed(event.target.checked)}
            disabled={disabled || saving}
          />
          <span>
            고객이 실측 중량·확정 순금량·골드바 규격·부족/잔여 및 최종 공임을 확인했고, 해당 조건으로 교환 진행에 동의했습니다.
          </span>
        </Consent>
      )}

      {!readOnly && (
        <ButtonRow>
          <SaveButton type="button" onClick={save} disabled={disabled || saving}>
            {saving
              ? "저장 중…"
              : customerConsentConfirmed
                ? "실측·동의 확정 저장"
                : "실측 결과 임시 저장"}
          </SaveButton>
        </ButtonRow>
      )}

      {message && <InlineNote role="status">{message}</InlineNote>}
      {error && <InlineNote $error role="alert">{error}</InlineNote>}
    </Wrap>
  );
}
