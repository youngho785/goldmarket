import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import { addDays, format } from "date-fns";
import GoldExchangeTracker from "@/components/GoldExchangeTracker";
import PushPermissionPrompt from "@/components/common/PushPermissionPrompt";
import shopLogo from "@/assets/logo.webp";
import useReservedSlots from "@/hooks/useReservedSlots";
import useBookingAvailability, { getBookingAvailabilityEntry } from "@/hooks/useBookingAvailability";
import { DON_TO_GRAMS, roundTo3Custom } from "@/lib/goldRates";
import { getGoldBarFeeEstimate, formatGoldBarFee } from "@/lib/goldBarFee";
import { formatGoldWeightPair } from "@/lib/goldDisplay";
import { isNative } from "@/platform/runtime";
import {
  Card,
  StartChoiceGrid,
  StartChoice,
  StepCenter,
  StepMark,
  Title,
  ErrorText,
  FormGroup,
  Label,
  Select,
  HelpText,
  Inline,
  RemoveButton,
  SmallButton,
  SectionSeparator,
  Button,
  ModeSwitch,
  InfoCard,
  OutlineButton,
  GhostButton,
  ExchangeOutcome,
  ExchangePureGoldTotal,
  ExchangeDecisionSummary,
  ExchangeDecisionFact,
  MiniGoldBar,
  SubTitle,
  TableWrap,
  Table,
  Seg,
  SegBtn,
  DenomGrid,
  DenomTile,
  AIBadge,
  ConsentBox,
  ConsentRow,
  ConsentDetails,
  ConsentLink,
  PrivacyModalBackdrop,
  PrivacyModal,
  PrivacyModalHeader,
  PrivacyModalTitle,
  PrivacyCloseButton,
  PrivacyFrame,
  Input,
  ReservationSummary,
  FeeLink,
  PendingBadge
} from "./GoldExchange.styles";
import {
  STORE_INFO,
  STEP,
  TIME_SLOTS,
  MAX_BOOKING_DAYS_AHEAD,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  BAR_GROUPS,
  MIN_BAR_GRAMS,
  displayOriginal,
  qtyHelperText,
  breakdownByDenoms,
  bestIdxForGroup
} from "./goldExchangeUi";

const QuantityField = React.memo(function QuantityField({
  value,
  unit,
  placeholder,
  onCommit,
  name,
  id,
  inlineHelper = true,
}) {
  const inputRef = useRef(null);
  const [local, setLocal] = useState(value ?? "");

  useEffect(() => setLocal(value ?? ""), [value]);

  const handleChange = (e) => {
    const raw = e.target.value ?? "";
    const norm = raw.replace(/[^0-9.,]/g, "");
    setLocal(norm);
    // 단위 버튼을 바로 탭하더라도 마지막 입력이 부모 상태에 남아 있어야 합니다.
    onCommit(norm);
  };
  const handleBlur = () => {
    const str = (local || "").replace(",", ".");
    const v = parseFloat(str);
    const next = isNaN(v) ? "" : String(Number(v.toFixed(6)));
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
        id={id}
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

export function StartMethodScreen({ onChoose }) {
  return (
    <>
      <h2 style={{ width: "100%", maxWidth: 1160, margin: "8px 0 12px", fontSize: "1.1rem", color: "var(--gm-primary)" }}>
        내 금 정보에 맞춰 시작하세요
      </h2>
      <StartChoiceGrid aria-label="금교환 시작 방법">
        <StartChoice type="button" $active onClick={() => onChoose("manual")}>
          <small>종류와 무게를 알고 있다면</small>
          <strong>내 금으로 받을 골드바 계산</strong>
          <span>금 종류와 중량만 입력하면 예상 교환량과 제작 공임을 확인할 수 있어요.</span>
        </StartChoice>
        <StartChoice type="button" onClick={() => onChoose("visit")}>
          <small>정확한 정보를 모르겠다면</small>
          <strong>매장에서 확인하고 예약</strong>
          <span>순도나 무게를 몰라도 괜찮습니다. 계산 없이 방문 날짜부터 선택하세요.</span>
        </StartChoice>
        <StartChoice type="button" onClick={() => onChoose("vault")}>
          <small>MY GOLD에 금을 기록했다면</small>
          <strong>기록한 내 금 불러오기</strong>
          <span>저장한 종류·중량을 다시 입력하지 않고 예상 교환량을 확인합니다.</span>
        </StartChoice>
      </StartChoiceGrid>
    </>
  );
}

/* ── Step 1: 입력/계산 ─────────────────────────── */
export function CalcStep({
  products, productOptions, error, onCalculate,
  handleProductChange, handleProductSelect, addProduct, removeProduct,
  onGoReserveDirect, onImportMyGold, showVaultImportAction = false,
  fromVault, vaultImportNotice = "",
}) {
  return (
    <>
      <Card>
        <StepCenter><StepMark>스텝 1</StepMark></StepCenter>
        <Title>{fromVault ? "MY GOLD에서 불러온 내 금을 확인하세요" : "내 금 종류와 중량을 입력하세요"}</Title>
        {vaultImportNotice && (
          <InfoCard role="status" style={{ marginBottom: 18 }}>
            {vaultImportNotice}
          </InfoCard>
        )}
        {error && <ErrorText role="alert">{error}</ErrorText>}

        <form onSubmit={onCalculate}>
          <HelpText style={{ margin: "0 0 12px", fontWeight: 850 }}>
            교환 기준 · 999.9 골드바
          </HelpText>
          {products.map((p, idx) => (
            <FormGroup key={`row-${idx}`}>
              <Label htmlFor={`product-${idx}`}>금 종류·제품 선택</Label>
              <Select
                id={`product-${idx}`}
                value={p.productId || ""}
                onChange={(e) => handleProductSelect(idx, e.target.value)}
              >
                <option value="">선택</option>
                {productOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.displayName}</option>
                ))}
              </Select>
              {p.calculationMethod === "manual" && (
                <HelpText>
                  정확한 환산률 안내가 어려운 품목입니다. <b>010-7713-3739</b>로 문의하시거나
                  <b>현장 확인 예약</b> 방식으로 진행해 주세요.
                </HelpText>
              )}

              <Label htmlFor={`quantity-${idx}`}>중량</Label>
              <Inline>
                <QuantityField
                  id={`quantity-${idx}`}
                  name={`quantity-${idx}`}
                  value={p.quantity}
                  unit={p.inputUnit}
                  placeholder="예: 37.50"
                  onCommit={(next) => handleProductChange(idx, "quantity", next)}
                  inlineHelper={false}
                />
                <Select
                  id={`quantity-unit-${idx}`}
                  aria-label={`${idx + 1}번째 제품 중량 단위`}
                  value={p.inputUnit}
                  onChange={(e) => handleProductChange(idx, "inputUnit", e.target.value)}
                >
                  <option value="g">그램</option>
                  <option value="don">돈</option>
                </Select>
              </Inline>
              <HelpText>{qtyHelperText(p.quantity, p.inputUnit)}</HelpText>


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
          <Button type="submit">예상 순금량과 받을 골드바 확인</Button>
        </form>
      </Card>

      {showVaultImportAction && (
        <ModeSwitch type="button" onClick={onImportMyGold}>
          MY GOLD에 기록한 금 불러오기 →
        </ModeSwitch>
      )}
      <ModeSwitch type="button" onClick={onGoReserveDirect}>
        순도·무게를 잘 모르겠다면 현장 확인 예약으로 전환 →
      </ModeSwitch>
    </>
  );
}

/* ── Step 2: 골드바 선택 ───────────────────────── */
export function BarStep({
  products, totalGrams, totalDon, fmtG, fmtD,
  barGroup, setBarGroup, barChoice, setBarChoice,
  onGoReserve,
  onSaveToMyGold,
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
            예상 순금량은 <b>{fmtG(totalGrams)}g ({fmtD(totalDon)}돈)</b>이며, 최소 골드바 1g까지
            <b> {fmtG(needed)}g</b>이 더 필요합니다.
          </p>
          <p style={{ margin: "8px 0 0" }}>
            1g 골드바를 임의로 선택하지 않습니다. 제품을 추가하거나 매장에서 실측 후
            매입·교환 방법을 안내받으세요.
          </p>
        </InfoCard>
        <SectionSeparator />
        <div style={{ display: "grid", gap: 10 }}>
          <Button type="button" onClick={onGoReserve}>현장 확인 예약</Button>
          <OutlineButton type="button" onClick={onSaveToMyGold}>지금 교환하지 않고 내 금 기록하기</OutlineButton>
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
  const feeEstimate = getGoldBarFeeEstimate({
    grams: selectedBar.grams,
    don: selectedBar.don,
    qty: safeQty,
  });
  const selectedTotalG = roundTo3Custom(selectedBar.grams * safeQty);
  const neededG = roundTo3Custom(Math.max(0, selectedTotalG - totalGrams));
  const remainingG = roundTo3Custom(Math.max(0, totalGrams - selectedTotalG));
  const remainingCombo = remainingG > 0 ? breakdownByDenoms(remainingG) : { items: [], remain: 0 };
  const feeLabel = feeEstimate.totalFee == null
    ? "매장 확인"
    : formatGoldBarFee(feeEstimate.totalFee);

  const isTileRecommended = (i) => i === recIdx;
  const isTileTopUp = (i) => i === topUpIdx;

  return (
    <Card>
      <StepCenter><StepMark>스텝 2</StepMark></StepCenter>
      <Title>내 금으로 받을 골드바를 선택하세요</Title>

      <ExchangePureGoldTotal role="group" aria-label="내 금의 예상 순금량">
        <span className="pure-gold-label">내 금의 예상 순금량</span>
        <div className="pure-gold-amount">
          <strong>{fmtG(totalGrams)}g</strong>
          <span>({fmtD(totalDon)}돈)</span>
        </div>
        <small>1돈 = 3.75g · 매장 실측 후 최종 확정</small>
      </ExchangePureGoldTotal>

      <ExchangeOutcome $native={isNative} aria-label="예상 금교환 결과">
        <div>
          <small>내 금 → 999.9 골드바 예상 · 온라인 안내</small>
          <strong>{selectedBar.label} × {safeQty}개</strong>
          <p>선택한 골드바의 예상 결과입니다.</p>
        </div>
        <MiniGoldBar aria-hidden="true">
          <small>KOREA GOLD MARKET</small>
          <b>FINE GOLD 999.9</b>
          <em>{selectedBar.label.replace(" 골드바", "")}</em>
        </MiniGoldBar>
      </ExchangeOutcome>

      <ExchangeDecisionSummary role="group" aria-label="교환 예상 핵심 요약" aria-live="polite">
        <ExchangeDecisionFact>
          <span>선택한 골드바 총중량</span>
          <strong>{fmtG(selectedTotalG)}g <em>({fmtD(selectedTotalG / DON_TO_GRAMS)}돈)</em></strong>
        </ExchangeDecisionFact>
        <ExchangeDecisionFact>
          <span>{neededG > 0 ? "추가로 필요한 금" : "예상 남는 순금"}</span>
          <strong>
            {fmtG(neededG > 0 ? neededG : remainingG)}g
            {" "}<em>({fmtD((neededG > 0 ? neededG : remainingG) / DON_TO_GRAMS)}돈)</em>
          </strong>
        </ExchangeDecisionFact>
        <ExchangeDecisionFact>
          <span>예상 제작 공임</span>
          <strong>{feeLabel}</strong>
        </ExchangeDecisionFact>
      </ExchangeDecisionSummary>
      <HelpText style={{ margin: "6px 0 10px", lineHeight: 1.5 }}>
        온라인 예상입니다. 실측 순도·중량, 잔여 금 처리 및 공임은 매장에서 고객과 확인하고 동의 후 확정됩니다.
        {neededG > 0 && " 추가로 필요한 금의 비용은 위 제작 공임에 포함되지 않습니다."}
        선택한 골드바 외 추가 조합의 공임은 별도입니다.
        {" "}<FeeLink href="/goldbar-fee">전체 공임표 보기</FeeLink>
      </HelpText>

      {neededG === 0 && remainingCombo.items.length > 0 && (
        <InfoCard role="note" style={{ margin: "8px 0 10px", padding: "10px 12px" }}>
          <strong>남는 금 활용 참고</strong> · {remainingCombo.items.slice(0, 3).map(({ denom, qty }) => `${denom.label} × ${qty}`).join(", ")}
          {remainingCombo.items.length > 3 ? " 외" : ""}
          <br />추가 골드바의 제작 가능 여부·공임·잔여 금 처리는 매장에서 안내하고 동의 후 확정합니다.
        </InfoCard>
      )}

      <details style={{ margin: "14px 0 4px" }}>
        <summary style={{ cursor: "pointer", color: "var(--gm-primary)", fontWeight: 850, fontSize: ".88rem" }}>
          제품별 환산 결과 자세히 보기
        </summary>
        <TableWrap style={{ marginTop: 10 }}>
        <Table>
          <thead>
            <tr>
              <th style={{ width: "28%" }}>제품 종류</th>
              <th style={{ width: "32%" }}>입력 값</th>
              <th style={{ width: "20%" }}>예상 순금(g)</th>
              <th style={{ width: "20%" }}>예상 순금(돈)</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const g = p.finalWeight || 0;
              const d = g / DON_TO_GRAMS;
              return (
                <tr key={`sum-${idx}`}>
                  <td>{p.productName || p.goldType || "-"}</td>
                  <td>{displayOriginal(p.quantity, p.inputUnit)}</td>
                  <td>{fmtG(g)}g</td>
                  <td>{fmtD(d)}돈</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>합계(예상 순금량)</td>
              <td>{fmtG(totalGrams)}g</td>
              <td>{fmtD(totalDon)}돈</td>
            </tr>
          </tfoot>
        </Table>
        </TableWrap>
      </details>

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
          // 실제 선택할 수 없는 큰 규격은 목록에 늘어놓지 않습니다.
          if (disabled) return null;
          const topUpGramsForOne = roundTo3Custom(Math.max(0, d.grams - totalGrams));
          return (
            <DenomTile
              key={d.key}
              type="button"
              $active={active}
              $recommended={recommended || topUpRecommended}
              role="radio"
              aria-checked={active}
              aria-label={`${d.label}${recommended ? " — 현재 금으로 추천" : topUpRecommended ? " — 부족분을 채우면 선택 가능" : ""}`}
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
              <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 6, justifyContent: "space-between" }}>
                <div style={{ fontWeight: 900, flex: "1 1 75px", minWidth: 0 }}>{d.label}</div>
                {recommended && <AIBadge>현재 금 추천</AIBadge>}
                {topUpRecommended && !recommended && <AIBadge>{fmtG(topUpGramsForOne)}g 더 필요</AIBadge>}
              </div>
              <div style={{ fontSize: ".9rem", color: "var(--gm-text-secondary)" }}>
                {fmtG(d.grams)}g ({fmtD(d.don)}돈)
              </div>
              {topUpRecommended && topUpGramsForOne > 0 && (
                <div style={{ fontSize: ".82rem", fontWeight: 800, color: "var(--gm-primary)" }}>
                  {fmtG(topUpGramsForOne)}g ({fmtD(topUpGramsForOne / DON_TO_GRAMS)}돈) 더 필요 · 채우면 1개 선택 가능
                </div>
              )}
              {disabled && (
                <div style={{ fontSize: ".8rem", color: "var(--gm-text-secondary)" }}>
                  현재 금 기준 바로 다음 규격까지만 선택할 수 있습니다.
                </div>
              )}
            </DenomTile>
          );
        })}
      </DenomGrid>
      {maxVisibleIdx < current.length - 1 && (
        <HelpText>더 큰 규격은 현재 예상 순금량으로 선택할 수 없어 표시하지 않았습니다.</HelpText>
      )}

      <FormGroup style={{ marginTop: 12 }}>
        <Label htmlFor="bar-quantity">수량</Label>
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
            id="bar-quantity"
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
          선택 골드바 총중량: <b>{fmtG(roundTo3Custom(selectedBar.grams * safeQty))}g</b> (<b>{fmtD((selectedBar.grams * safeQty) / DON_TO_GRAMS)}돈</b>){" "}
          (최대 {maxSelectableQty}개 선택 가능)
        </HelpText>
      </FormGroup>

      {(() => {
        const GuideWrapper = isNative ? "details" : "div";
        return (
          <GuideWrapper style={isNative ? { marginTop: 14, marginBottom: 9 } : undefined}>
            {isNative ? (
              <summary style={{ fontWeight: 850, color: "var(--gm-primary)", cursor: "pointer", padding: "8px 0" }}>
                남는 금·부족분 처리 자세히 보기
              </summary>
            ) : <SubTitle>안내</SubTitle>}
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
                  현재 예상 순금량은 <b>{fmtG(totalGrams)}g</b> ({fmtD(totalDon)}돈)이며, 선택한 <b>{selectedBar.label} × {qty}</b>를 만들려면
                  <b> {fmtG(topUpG)}g</b> (<b>{fmtD(topUpG / DON_TO_GRAMS)}돈</b>)을 추가하면 됩니다.
                </p>
                <p style={{ margin: "8px 0 0", fontWeight: 700 }}>
                  부족분은 방문 시 실물 확인 후 당일 순금 판매시세를 기준으로 정산됩니다.
                </p>
              </>
            );
          }

          const extraCombo = breakdownByDenoms(leftoverG);
          if (leftoverG >= groupMin.grams) {
            return (
              <>
                <p style={{ margin: 0 }}>
                  선택한 골드바를 제외한 예상 남는 순금은 <b>{fmtG(leftoverG)}g</b> (<b>{fmtD(leftoverG / DON_TO_GRAMS)}돈</b>)입니다.
                </p>
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 850 }}>남는 금으로 가능한 추가 골드바 조합 보기 (참고)</summary>
                  <p style={{ margin: "8px 0 0" }}>
                    아래 추가 조합은 자동 계산한 참고안이며, 실제 제작 여부는 방문 시 결정됩니다.
                  </p>
                  <div style={{ marginTop: 7 }}>
                    {extraCombo.items.map(({ denom, qty: q }) => (
                      <span key={`${denom.key}-${q}`} style={{ display: "inline-block", padding: "5px 8px", margin: "4px 5px 0 0", borderRadius: 8, background: "var(--gm-info-soft)", fontWeight: 800 }}>
                        {denom.label} × {q}
                      </span>
                    ))}
                  </div>
                  <p style={{ margin: "9px 0 0" }}>
                    위 참고 조합까지 모두 제작한다면 예상 잔여 <b>{fmtG(extraCombo.remain)}g</b> (<b>{fmtD(extraCombo.remain / DON_TO_GRAMS)}돈</b>)입니다.
                  </p>
                  <p style={{ margin: "7px 0 0" }}>
                    추가 조합의 제작 공임은 위 예상 공임에 포함되지 않으며, 실제 잔여 금 처리방법과 함께 매장에서 안내합니다.
                  </p>
                </details>
              </>
            );
          }

          const needMore = Math.max(0, groupMin.grams - leftoverG);
          return (
            <>
              <p style={{ margin: 0 }}>
                남는 금은 <b>{fmtG(leftoverG)}g</b> (<b>{fmtD(leftoverG / DON_TO_GRAMS)}돈</b>)입니다.
              </p>
              <p style={{ margin: "6px 0 0" }}>
                <b>{groupMin.label}</b> 1개를 추가하려면 <b>{fmtG(needMore)}g</b> (<b>{fmtD(needMore / DON_TO_GRAMS)}돈</b>)이 더 필요합니다.
              </p>
              <p style={{ margin: "10px 0 0", fontWeight: 700 }}>잔여 금 처리방법은 교환 확정 시 안내합니다.</p>
            </>
          );
        })()}
            </InfoCard>
          </GuideWrapper>
        );
      })()}

      <SectionSeparator />
      <div style={{ display: "grid", gap: 10 }}>
        <Button type="button" onClick={onGoReserve}>선택한 골드바로 방문 예약 계속</Button>
        <OutlineButton type="button" onClick={onSaveToMyGold}>지금 교환하지 않고 내 금 기록하기</OutlineButton>
        <HelpText style={{ margin: 0, textAlign: "center" }}>
          금을 기록하면 다음에 중량을 다시 입력하지 않고 현재 참고가치를 확인할 수 있습니다.
        </HelpText>
        <GhostButton type="button" onClick={() => setStep(STEP.CALC)}>이전(수정)</GhostButton>
      </div>
    </Card>
  );
}

/* ── Step 3: 예약 ─────────────────────────────── */
export function ReserveStep({
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
  barsPlan,
  memberGoldBalanceG = 0,
  memberGoldSpendableG = 0,
  memberGoldPending = false,
  useMemberGold = false,
  setUseMemberGold = () => {},
}) {
  const dateKey = visitDate ? format(visitDate, "yyyy-MM-dd") : "";
  const taken = useReservedSlots(dateKey); // ✅ 날짜별 선점 시간 Set
  const { dates: bookingAvailabilityDates } = useBookingAvailability();
  const availability = useMemo(
    () => getBookingAvailabilityEntry({ dates: bookingAvailabilityDates }, dateKey),
    [bookingAvailabilityDates, dateKey]
  );
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const privacyDialogRef = useRef(null);
  const phoneDigits = String(phone || "").replace(/\D/g, "");
  const contactReady = String(name || "").trim().length >= 2 && phoneDigits.length >= 9;
  const [editingContact, setEditingContact] = useState(false);
  const [contactTouched, setContactTouched] = useState(false);

  useEffect(() => {
    if (contactTouched) return;
    setEditingContact(!contactReady);
  }, [contactReady, contactTouched]);

  useEffect(() => {
    if (!privacyOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const dialog = privacyDialogRef.current;
    const focusableSelector = [
      'button:not([disabled])',
      'a[href]',
      'iframe',
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    const focusTimer = window.setTimeout(() => {
      const first = dialog?.querySelector(focusableSelector);
      first?.focus?.();
    }, 0);

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPrivacyOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll(focusableSelector)).filter(
        (element) => element.getAttribute("aria-hidden") !== "true"
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
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
      <Title>방문 예약 요청</Title>
      {error && <ErrorText role="alert">{error}</ErrorText>}

      <ReservationSummary role="note" aria-label="방문 전 예상 정보">
        <small>{calculated && barsPlan ? "온라인 예상 · 매장 확정 전" : "현장 확인 방문"}</small>
        {calculated && barsPlan ? (
          <>
            <strong>
              내 금 예상 순금 {formatGoldWeightPair(barsPlan.totalGrams || 0)} · 받을 골드바 {barsPlan.selected?.label || "골드바"} × {barsPlan.selected?.qty || 1}개
            </strong>
            <p>
              {(() => {
                const chosenGrams = Number(barsPlan.selected?.grams || 0) * Number(barsPlan.selected?.qty || 1);
                const difference = roundTo3Custom(Number(barsPlan.totalGrams || 0) - chosenGrams);
                return difference >= 0
                  ? `선택 후 예상 남는 순금 ${formatGoldWeightPair(difference)}`
                  : `선택 후 순금 ${formatGoldWeightPair(Math.abs(difference))} 추가 필요 (별도 정산)`;
              })()}
            </p>
            {Array.isArray(barsPlan.autoBreakdown) && barsPlan.autoBreakdown.length > 0 && (
              <p>남는 금 활용 참고 조합: {barsPlan.autoBreakdown.map((item) => `${item.label} × ${item.qty}`).join(", ")} · 실제 제작 여부는 매장에서 결정합니다.</p>
            )}
            <p>
              예상 제작 공임 {formatGoldBarFee(getGoldBarFeeEstimate({
                grams: barsPlan.selected?.grams,
                don: barsPlan.selected?.don,
                qty: barsPlan.selected?.qty,
              }).totalFee)} (선택한 골드바 기준 · 참고 추가 조합 공임 제외) · 실측과 고객 동의 후 최종 확정됩니다.
            </p>
          </>
        ) : (
          <>
            <strong>금 종류·중량을 매장에서 직접 확인하는 방문 예약입니다.</strong>
            <p>온라인에서 교환량을 확정하지 않습니다. 매장에서 실물의 순도와 중량, 공임을 확인한 뒤 동의한 경우에만 실제 교환을 진행합니다.</p>
          </>
        )}
      </ReservationSummary>

      <SubTitle>방문 날짜와 시간</SubTitle>
      <FormGroup>
        <Label htmlFor="exchange-visit-date">방문 날짜</Label>
        <DatePicker
          id="exchange-visit-date"
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
        <Label htmlFor="exchange-visit-time">방문 시간</Label>
        <Select
          id="exchange-visit-time"
          value={visitTime}
          onChange={handleTimeChange}
          disabled={!visitDate}
        >
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
        {!editingContact && contactReady ? (
          <InfoCard role="group" aria-label="예약자 연락처 확인">
            <p style={{ margin: 0, fontWeight: 900 }}>예약자 정보</p>
            <p style={{ margin: "6px 0 10px" }}>{String(name).trim()} · {String(phone).trim()}</p>
            <SmallButton
              type="button"
              onClick={() => {
                setContactTouched(true);
                setEditingContact(true);
              }}
            >
              정보 변경
            </SmallButton>
          </InfoCard>
        ) : (
          <>
            <FormGroup>
              <Label htmlFor="exchange-name">성명</Label>
              <Input
                id="exchange-name"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(e) => {
                  setContactTouched(true);
                  setName(e.target.value.slice(0, MAX_NAME_LENGTH));
                }}
                required
                autoComplete="name"
                placeholder="예: 홍길동"
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="exchange-phone">전화번호</Label>
              <Input
                id="exchange-phone"
                type="tel"
                inputMode="tel"
                placeholder="예: 010-1234-5678"
                value={phone}
                maxLength={MAX_PHONE_LENGTH}
                onChange={(e) => {
                  setContactTouched(true);
                  setPhone(
                    e.target.value
                      .replace(/[^0-9+()\-\s]/g, "")
                      .slice(0, MAX_PHONE_LENGTH)
                  );
                }}
                required
                autoComplete="tel"
              />
            </FormGroup>
            <HelpText>한 번 예약하면 입력한 이름과 전화번호를 다음 예약에 자동으로 불러옵니다.</HelpText>
            {contactReady && (
              <SmallButton
                type="button"
                onClick={() => {
                  setContactTouched(true);
                  setEditingContact(false);
                }}
              >
                입력 완료
              </SmallButton>
            )}
          </>
        )}
        {(memberGoldBalanceG > 0 || memberGoldPending) && (
          <>
            <SectionSeparator />
            <InfoCard role="group" aria-label="MEMBER GOLD 사용 선택">
              <p style={{ margin: 0, fontWeight: 900 }}>
                MEMBER GOLD · {Number(memberGoldBalanceG || 0).toFixed(2)}g
              </p>
              {memberGoldPending ? (
                <>
                  <p style={{ margin: "7px 0 0" }}>
                    현재 다른 금교환 예약에 MEMBER GOLD 사용 신청이 연결되어 있습니다.
                    기존 신청을 취소하거나 완료한 뒤 새 예약에 연결할 수 있습니다.
                  </p>
                  <OutlineButton as={Link} to="/member-gold" style={{ marginTop: 10 }}>
                    MEMBER GOLD 확인
                  </OutlineButton>
                </>
              ) : Number(memberGoldSpendableG || 0) > 0 ? (
                <>
                  <ConsentRow style={{ marginTop: 8 }}>
                    <input
                      type="checkbox"
                      checked={useMemberGold}
                      onChange={(e) => setUseMemberGold(e.target.checked)}
                    />
                    <span>
                      이번 GOLD TO GOLD 예약에 <b>{Number(memberGoldSpendableG || 0).toFixed(2)}g 전액</b> 사용 신청
                    </span>
                  </ConsentRow>
                  <ConsentDetails>
                    MEMBER GOLD는 위 내 금 예상 순금량에 합산되지 않은 별도 혜택입니다.
                    선택해도 지금 차감되지 않으며, 예약 접수 후 사용 신청만 연결됩니다.
                    매장에서 6자리 코드를 확인하고 실제 교환을 확정할 때 차감됩니다.
                  </ConsentDetails>
                </>
              ) : (
                <p style={{ margin: "7px 0 0" }}>현재 사용할 수 있는 MEMBER GOLD가 없습니다.</p>
              )}
            </InfoCard>
          </>
        )}

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
              ref={privacyDialogRef}
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

        <HelpText style={{ display: "block", margin: "10px 0" }}>
          이 버튼은 예약 <b>요청</b>입니다. 매장 확인 후 방문 예약이 확정됩니다.
        </HelpText>
        <div style={{ display: "grid", gap: 10 }}>
          <Button type="submit" disabled={loading} aria-busy={loading}>
            {loading ? "제출 중..." : "방문 예약 요청"}
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
                ? "이메일 인증을 완료한 뒤 예약에 필요한 성명·전화번호를 확인하고 개인정보 동의를 거치면 예약요청이 완료됩니다."
                : "로그인 또는 간단 가입과 이메일 인증 후, 예약에 필요한 성명·전화번호를 한 번 입력하면 예약요청이 완료됩니다."}
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
              방문 예약 계속하기
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
export function DoneStep({ status, memberGoldUsage = null, memberGoldUsageError = "" }) {
  const gmapUrl = `https://maps.google.com/?q=${encodeURIComponent(STORE_INFO.address)}`;
  const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(`${STORE_INFO.address} ${STORE_INFO.name}`)}`;

  return (
    <>
      <GoldExchangeTracker status={status} />
      <Card>
        <PendingBadge>현재 상태 · 예약 확인 대기</PendingBadge>
        <Title>방문 예약 요청이 접수되었습니다</Title>
        <HelpText>아직 예약 확정이나 교환 완료 상태가 아닙니다. 관리자 확인 후 방문 예약이 확정되면 알림으로 안내드립니다.</HelpText>

        {memberGoldUsage?.status === "requested" && (
          <InfoCard role="status" style={{ marginTop: 12 }}>
            <p style={{ margin: 0, fontWeight: 900 }}>
              MEMBER GOLD {Number(memberGoldUsage.amountG || 0).toFixed(2)}g 사용 신청도 연결되었습니다.
            </p>
            <p style={{ margin: "7px 0 0" }}>
              매장 방문 시 아래 6자리 확인 코드를 관리자에게 보여주세요. 실제 차감은 매장 교환 확정 시 이루어집니다.
            </p>
            <p
              aria-label={`MEMBER GOLD 매장 확인 코드 ${memberGoldUsage.requestCode || ""}`}
              style={{
                margin: "12px 0 0",
                fontSize: "1.7rem",
                fontWeight: 950,
                letterSpacing: ".16em",
                color: "var(--gm-primary)",
              }}
            >
              {memberGoldUsage.requestCode}
            </p>
          </InfoCard>
        )}

        {memberGoldUsageError && (
          <InfoCard role="alert" style={{ marginTop: 12 }}>
            <p style={{ margin: 0, fontWeight: 900 }}>예약은 정상 접수되었습니다.</p>
            <p style={{ margin: "7px 0 0" }}>{memberGoldUsageError}</p>
            <OutlineButton as={Link} to="/member-gold" style={{ marginTop: 10 }}>
              MEMBER GOLD에서 다시 확인
            </OutlineButton>
          </InfoCard>
        )}

        <OutlineButton as={Link} to="/my-exchanges" style={{ marginTop: 12 }}>
          내 예약 확인하기
        </OutlineButton>

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
