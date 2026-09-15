import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  DON_TO_GRAMS,
  DEFAULT_PURITY,
  DEFAULT_EXCHANGE,
  DEFAULT_GOLD_PRODUCTS,
  roundTo3Custom,
  computeGoldPolicyResult,
  findGoldProduct,
  listGoldProducts,
  subscribeGoldRates,
} from "@/lib/goldRates";
import { db } from "@/firebase/firebase";

const Sheet = styled.section`
  position: relative;
  width: 100%;
  padding: clamp(22px, 3vw, 34px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background:
    linear-gradient(color-mix(in srgb, ${({ theme }) => theme.colors.primary} 4%, transparent) 1px, transparent 1px),
    ${({ theme }) => theme.colors.surface};
  background-size: 100% 32px, auto;
  box-shadow:
    18px 18px 0 color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent),
    ${({ theme }) => theme.shadows.lg};

  &::before,
  &::after {
    content: "";
    position: absolute;
    width: 42px;
    height: 42px;
    pointer-events: none;
  }
  &::before {
    top: 14px;
    left: 14px;
    border-top: 1px solid ${({ theme }) => theme.colors.secondary};
    border-left: 1px solid ${({ theme }) => theme.colors.secondary};
  }
  &::after {
    right: 14px;
    bottom: 14px;
    border-right: 1px solid ${({ theme }) => theme.colors.secondary};
    border-bottom: 1px solid ${({ theme }) => theme.colors.secondary};
  }

  @media (max-width: 720px) {
    box-shadow:
      8px 8px 0 color-mix(in srgb, ${({ theme }) => theme.colors.gold} 12%, transparent),
      ${({ theme }) => theme.shadows.card};
  }
`;

const DocumentHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 0 0 16px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.primary};
`;

const Eyebrow = styled.span`
  display: block;
  margin-bottom: 5px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .7rem;
  font-weight: 800;
  letter-spacing: .15em;
`;

const CalcTitle = styled.h2`
  margin: 0;
  font-size: clamp(1.35rem, 2.5vw, 1.8rem);
`;

const DocumentNo = styled.span`
  color: ${({ theme }) => theme.colors.textLight};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .67rem;
  letter-spacing: .08em;
  text-align: right;
`;

const PurityTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;
  margin: 18px 0 14px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const PurityTab = styled.button`
  min-height: 40px;
  padding: 8px 5px;
  border: 1px solid ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.border};
  border-radius: 0;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.white : theme.colors.textSecondary};
  box-shadow: none;
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .78rem;
  letter-spacing: .04em;

  &:hover:not(:disabled) {
    transform: none;
    box-shadow: none;
    border-color: ${({ theme }) => theme.colors.secondary};
  }
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) .7fr .8fr;
  gap: 9px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr 1fr;
    > label:first-child { grid-column: 1 / -1; }
  }
`;

const Field = styled.label`
  display: grid;
  gap: 6px;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .02em;
`;

const Input = styled.input`
  border-radius: 0;
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-weight: 700;
`;

const Select = styled.select`
  border-radius: 0;
`;

const UnitHelp = styled.small`
  grid-column: 1 / -1;
  margin-top: 2px;
  color: ${({ theme }) => theme.colors.textLight};
`;

const Result = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 16px;
  margin-top: 16px;
  padding: 18px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ResultValue = styled.strong`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(2rem, 4.2vw, 3.1rem);
  font-weight: 700;
  line-height: 1;

  small {
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: .78rem;
  }
`;

const ResultEquivalent = styled.span`
  display: block;
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: clamp(1.05rem, 2.4vw, 1.35rem);
  font-weight: 850;
`;

const Seal = styled.div`
  display: grid;
  place-items: center;
  width: 68px;
  aspect-ratio: 1;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font-size: .63rem;
  font-weight: 900;
  line-height: 1.25;
  text-align: center;
  transform: rotate(-6deg);
  box-shadow: inset 0 0 0 4px ${({ theme }) => theme.colors.surface},
    inset 0 0 0 5px ${({ theme }) => theme.colors.secondary}55;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
`;

const Tag = styled.span`
  padding: 5px 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.fonts.numeric};
  font-size: .76rem;
  font-weight: 800;
`;

const CTA = styled(Link)`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  margin-top: 16px;
  padding: 12px 18px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-weight: 850;
  letter-spacing: -.01em;

  &:hover {
    color: ${({ theme }) => theme.colors.white};
    background: ${({ theme }) => theme.colors.primaryDark};
  }
`;

const Disclaimer = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 12px 0 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .78rem;
  line-height: 1.55;

  svg { flex: 0 0 auto; margin-top: 2px; color: ${({ theme }) => theme.colors.success}; }
`;

const QUICK_PRODUCT_IDS = [
  { label: "999.9", id: "gold-9999-bar" },
  { label: "999", id: "gold-999-product" },
  { label: "18K", id: "gold-18k-jewelry" },
  { label: "14K", id: "gold-14k-jewelry" },
  { label: "기타", id: "other-inquiry" },
];

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

const formatGrams = (value) => Number(value || 0).toFixed(2);

function breakdown(grams) {
  let remain = Math.max(0, roundTo3Custom(grams));
  const items = [];
  for (let i = DENOMS.length - 1; i >= 0; i -= 1) {
    const denom = DENOMS[i];
    const qty = Math.floor((remain + 1e-9) / denom.grams);
    if (qty > 0) {
      items.push({ denom, qty });
      remain = roundTo3Custom(remain - qty * denom.grams);
    }
  }
  return { items, remain };
}

export default function LiteCalcFromGX({ showCombo = true }) {
  const [rates, setRates] = useState({
    purity: DEFAULT_PURITY,
    exchange: DEFAULT_EXCHANGE,
    products: DEFAULT_GOLD_PRODUCTS,
  });
  const [productId, setProductId] = useState("gold-18k-jewelry");
  const [pureGoldBuyPricePerDon, setPureGoldBuyPricePerDon] = useState(0);
  const [unit, setUnit] = useState("g");
  const [qtyStr, setQtyStr] = useState("");

  useEffect(() => {
    const unsub = subscribeGoldRates(db, (merged) => setRates(merged));
    return () => unsub?.();
  }, []);

  useEffect(() => onSnapshot(
    doc(db, "goldPrices", "current"),
    (snapshot) => setPureGoldBuyPricePerDon(Number(snapshot.get("market.pureGoldBuyPerDon")) || 0),
    () => setPureGoldBuyPricePerDon(0)
  ), []);

  const productOptions = useMemo(() => listGoldProducts(rates, { context: "exchange" }), [rates]);
  const selectedProduct = useMemo(() => findGoldProduct(rates, { productId }), [rates, productId]);

  const qty = useMemo(() => {
    const value = parseFloat(String(qtyStr || "").replace(",", "."));
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }, [qtyStr]);

  const gramsInput = useMemo(
    () => (unit === "g" ? qty : roundTo3Custom(qty * DON_TO_GRAMS)),
    [qty, unit]
  );

  const fineGrams = useMemo(() => {
    if (!productId || gramsInput <= 0) return 0;
    return computeGoldPolicyResult({
      grams: gramsInput,
      productId,
      goldType: selectedProduct?.legacyGoldType,
      exchangeType: "999.9골드바",
      rates,
      pureGoldBuyPricePerDon,
    }).finalWeightG;
  }, [productId, selectedProduct, gramsInput, rates, pureGoldBuyPricePerDon]);

  const combo = useMemo(
    () => (showCombo ? breakdown(fineGrams) : { items: [], remain: 0 }),
    [showCombo, fineGrams]
  );

  const targetHref = useMemo(() => {
    if (!productId || !(qty > 0)) return "/gold-exchange?from=home-certificate";
    return `/gold-exchange?${new URLSearchParams({
      w: String(gramsInput || 0),
      unit: "g",
      pid: productId,
      type: selectedProduct?.legacyGoldType || selectedProduct?.displayName || "",
      from: "home-certificate-prefill",
    })}`;
  }, [productId, selectedProduct, qty, gramsInput]);

  const selectedQuickType = QUICK_PRODUCT_IDS.find((item) => item.id === productId)?.id;

  return (
    <Sheet aria-label="예상 순금량 계산서">
      <DocumentHead>
        <div>
          <CalcTitle>예상 순금량 계산</CalcTitle>
        </div>
      </DocumentHead>

      <PurityTabs aria-label="금 종류 빠른 선택">
        {QUICK_PRODUCT_IDS.map((item) => (
          <PurityTab
            type="button"
            key={item.label}
            $active={selectedQuickType === item.id}
            aria-pressed={selectedQuickType === item.id}
            onClick={() => setProductId(item.id)}
          >
            {item.label}
          </PurityTab>
        ))}
      </PurityTabs>

      <FieldGrid>
        <Field>
          <Label>보유 제품 종류</Label>
          <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
            {productOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.displayName}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>단위</Label>
          <Select value={unit} onChange={(event) => setUnit(event.target.value)}>
            <option value="g">그램(g)</option>
            <option value="don">돈</option>
          </Select>
        </Field>
        <Field>
          <Label>보유 중량 입력</Label>
          <Input
            inputMode="decimal"
            aria-label="보유 금 중량"
            placeholder={unit === "g" ? "수량 입력 (g)" : "수량 입력 (돈)"}
            value={qtyStr}
            onChange={(event) => setQtyStr(event.target.value.replace(/[^0-9.,]/g, ""))}
            onBlur={() =>
              setQtyStr((value) => {
                const parsed = parseFloat(String(value || "").replace(",", "."));
                return Number.isFinite(parsed) ? parsed.toFixed(2) : "";
              })
            }
          />
        </Field>
        <UnitHelp>
          {qty > 0
            ? unit === "g"
              ? `${formatGrams(qty)}g ≈ ${(qty / DON_TO_GRAMS).toFixed(2)}돈`
              : `${qty.toFixed(2)}돈 ≈ ${formatGrams(qty * DON_TO_GRAMS)}g`
            : "보유한 금의 중량을 숫자로 직접 입력해 주세요."}
        </UnitHelp>
      </FieldGrid>

      <Result>
        <div>
          <Label>예상 순금량</Label>
          <ResultValue>
            {formatGrams(fineGrams)} <small>g</small>
          </ResultValue>
          <ResultEquivalent>
            {Number(fineGrams / DON_TO_GRAMS).toFixed(2)} 돈
          </ResultEquivalent>
        </div>
        <Seal>
          중량확인
          <br />
          예상결과
        </Seal>
      </Result>

      {showCombo && fineGrams > 0 && (
        <Tags aria-label="예상 골드바 조합">
          {combo.items.map(({ denom, qty: count }) => (
            <Tag key={`${denom.key}-${count}`}>{denom.label} × {count}</Tag>
          ))}
          <Tag>잔여 {formatGrams(combo.remain)}g</Tag>
        </Tags>
      )}

      <CTA to={targetHref}>
        여러 제품 합산하고 교환 조합 확인
        <ArrowRight size={17} aria-hidden />
      </CTA>
      <Disclaimer>
        <Check size={15} aria-hidden />
        온라인 결과는 예상값입니다. 최종 순도·중량·공임은 원일귀금속 매장에서
        고객과 함께 확인하고 동의 후 확정합니다.
      </Disclaimer>
    </Sheet>
  );
}
