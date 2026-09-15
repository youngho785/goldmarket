import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { addDays, format } from "date-fns";
import GoldExchangeTracker from "@/components/GoldExchangeTracker";
import PushPermissionPrompt from "@/components/common/PushPermissionPrompt";
import shopLogo from "@/assets/logo.webp";
import useReservedSlots from "@/hooks/useReservedSlots";
import useBookingAvailability, { getBookingAvailabilityEntry } from "@/hooks/useBookingAvailability";
import { DON_TO_GRAMS, roundTo3Custom, toFixed3CustomStr } from "@/lib/goldRates";
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
  Input
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
      <StartChoiceGrid aria-label="금교환 시작 방법">
        <StartChoice type="button" onClick={() => onChoose("vault")}>
          <strong>MY GOLD에서 불러오기</strong>
          <span>MY GOLD에 기록한 금 종류·중량으로 바로 계산합니다.</span>
        </StartChoice>
        <StartChoice type="button" onClick={() => onChoose("manual")}>
          <strong>직접 입력하기</strong>
          <span>14K·18K·순금의 종류와 중량을 직접 입력합니다.</span>
        </StartChoice>
        <StartChoice type="button" onClick={() => onChoose("visit")}>
          <strong>매장에서 확인하기</strong>
          <span>순도·중량을 몰라도 됩니다. 계산 없이 방문예약으로 이동합니다.</span>
        </StartChoice>
      </StartChoiceGrid>
    </>
  );
}

/* ── Step 1: 입력/계산 ─────────────────────────── */
export function CalcStep({
  products, productOptions, error, onCalculate,
  handleProductChange, handleProductSelect, addProduct, removeProduct,
  onGoReserveDirect, fromVault,
}) {
  return (
    <>
      <Card>
        <StepCenter><StepMark>스텝 1</StepMark></StepCenter>
        <Title>{fromVault ? "MY GOLD에서 불러온 내 금을 확인하세요" : "내 금 종류와 무게를 입력하세요"}</Title>
        {error && <ErrorText role="alert">{error}</ErrorText>}

        <form onSubmit={onCalculate}>
          {products.map((p, idx) => (
            <FormGroup key={`row-${idx}`}>
              <Label htmlFor={`product-${idx}`}>제품 종류</Label>
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
                  <b>현장 확인 방문예약</b> 방식으로 진행해 주세요.
                </HelpText>
              )}

              <Label htmlFor={`quantity-${idx}`}>수량</Label>
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
                  aria-label={`${idx + 1}번째 제품 수량 단위`}
                  value={p.inputUnit}
                  onChange={(e) => handleProductChange(idx, "inputUnit", e.target.value)}
                >
                  <option value="g">그램</option>
                  <option value="don">돈</option>
                </Select>
              </Inline>
              <HelpText>{qtyHelperText(p.quantity, p.inputUnit)}</HelpText>

              <Label htmlFor={`exchange-type-${idx}`}>교환 유형</Label>
              <Select
                id={`exchange-type-${idx}`}
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
          <Button type="submit">예상 순금량과 골드바 조합 확인</Button>
        </form>
      </Card>

      <ModeSwitch type="button" onClick={onGoReserveDirect}>
        순도·무게를 잘 모르겠다면 현장 확인 방문예약으로 전환 →
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
            예상 순금량은 <b>{fmtG(totalGrams)}g</b>이며, 최소 골드바 1g까지
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
          <OutlineButton type="button" onClick={onSaveToMyGold}>MY GOLD에 저장하고 가치 추적</OutlineButton>
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
      <Title>내 금으로 받을 골드바를 선택하세요</Title>

      <ExchangeOutcome aria-label="예상 금교환 결과">
        <div>
          <small>MY GOLD → 999.9 GOLD</small>
          <strong>예상 순금량 {fmtG(totalGrams)}g → {selectedBar.label} × {safeQty}</strong>
          <p>
            {roundTo3Custom(totalGrams - selectedBar.grams * safeQty) >= 0
              ? `예상 잔여 순금 ${toFixed3CustomStr(roundTo3Custom(totalGrams - selectedBar.grams * safeQty))}g`
              : `선택 규격까지 ${toFixed3CustomStr(roundTo3Custom(selectedBar.grams * safeQty - totalGrams))}g 추가 필요`}
            · 실제 순금량은 매장 실측 후 확정됩니다.
          </p>
        </div>
        <MiniGoldBar aria-hidden="true">
          <small>KOREA GOLD MARKET</small>
          <b>FINE GOLD 999.9</b>
          <em>{selectedBar.label.replace(" 골드바", "")}</em>
        </MiniGoldBar>
      </ExchangeOutcome>

      <SubTitle>제품별 순금 환산 결과</SubTitle>
      <TableWrap>
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
                  <td>{fmtG(g)} g</td>
                  <td>{fmtD(d)} 돈</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>합계(예상 순금량)</td>
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
                  현재 예상 순금량은 <b>{fmtG(totalGrams)}g</b> ({fmtD(totalDon)}돈)이며, 선택한 <b>{selectedBar.label} × {qty}</b>를 만들려면
                  <b> {toFixed3CustomStr(topUpG)}g</b> (<b>{fmtD(topUpG / DON_TO_GRAMS)}돈</b>)을 추가하면 됩니다.
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
                <p style={{ margin: "10px 0 0", fontWeight: 700 }}>잔여 금 처리방법은 교환 확정 시 안내합니다.</p>
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
              <p style={{ margin: "10px 0 0", fontWeight: 700 }}>잔여 금 처리방법은 교환 확정 시 안내합니다.</p>
            </>
          );
        })()}
      </InfoCard>

      <SectionSeparator />
      <div style={{ display: "grid", gap: 10 }}>
        <Button type="button" onClick={onGoReserve}>골드바 교환 하러가기</Button>
        <OutlineButton type="button" onClick={onSaveToMyGold}>MY GOLD에 저장하고 가치 추적</OutlineButton>
        <HelpText style={{ margin: 0, textAlign: "center" }}>
          지금 교환하지 않아도 저장해 두면 오늘 가치와 시세 변화를 계속 확인할 수 있습니다.
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
        <FormGroup>
          <Label htmlFor="exchange-name">성명</Label>
          <Input
            id="exchange-name"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
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
export function DoneStep({ status }) {
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
