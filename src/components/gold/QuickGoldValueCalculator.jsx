import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, Gem } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import { DEFAULT_GOLD_PRODUCTS, DON_TO_GRAMS } from "@/lib/goldRates";
import {
  computeVaultMarketValueWon,
  computeVaultPureGoldG,
  getGoldVaultProductOptions,
} from "@/lib/goldVaultCatalog";
import { saveGuestMyGoldItems } from "@/lib/myGoldGuestDemo";
import {
  getAnalyticsGoldCategory,
  getAnalyticsWeightBand,
  trackProductEventOncePerSession,
} from "@/analytics/productAnalytics";

const PRIORITY_PRODUCT_IDS = [
  "gold-18k-jewelry",
  "gold-14k-jewelry",
  "gold-999-product",
];

const Card = styled.section`
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 22%, ${({ theme }) => theme.colors.border});
  border-radius: 22px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 14px 34px color-mix(in srgb, ${({ theme }) => theme.colors.primary} 7%, transparent);
`;

const Head = styled.div`
  padding: ${({ $compact }) => ($compact ? "16px 17px 12px" : "20px 21px 15px")};
  background: linear-gradient(138deg, ${({ theme }) => theme.colors.primaryDark}, ${({ theme }) => theme.colors.primary});
  color: ${({ theme }) => theme.on.primary};

  small {
    display: block;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: .62rem;
    font-weight: 950;
    letter-spacing: .12em;
  }

  h2 {
    margin: 6px 0 0;
    color: ${({ theme }) => theme.on.primary};
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: ${({ $compact }) => ($compact ? "1.05rem" : "clamp(1.26rem, 2.4vw, 1.62rem)")};
    font-weight: 850;
    line-height: 1.18;
    letter-spacing: -.035em;
  }

  p {
    margin: 7px 0 0;
    max-width: 620px;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 70%, transparent);
    font-size: .72rem;
    line-height: 1.5;
    word-break: keep-all;
  }
`;

const Body = styled.div`
  padding: ${({ $compact }) => ($compact ? "14px 15px 15px" : "18px 20px 20px")};
`;

const Fields = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(150px, .8fr);
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 6px;

  > span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .68rem;
    font-weight: 900;
  }

  select,
  input {
    width: 100%;
    min-height: 44px;
    padding: 9px 11px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 12px;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font: inherit;
  }

  select:focus,
  input:focus {
    outline: 2px solid color-mix(in srgb, ${({ theme }) => theme.colors.gold} 28%, transparent);
    outline-offset: 1px;
    border-color: ${({ theme }) => theme.colors.secondary};
  }
`;

const WeightField = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px;
  gap: 7px;
`;

const Results = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 13px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Result = styled.div`
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  small {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .64rem;
    font-weight: 850;
  }

  strong {
    display: block;
    margin-top: 5px;
    color: ${({ theme }) => theme.colors.primary};
    font-family: ${({ theme }) => theme.fonts.numeric};
    font-size: clamp(1.2rem, 4vw, 1.72rem);
    font-weight: 950;
    letter-spacing: -.035em;
  }
`;

const Action = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  min-height: 46px;
  margin-top: 12px;
  padding: 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: .78rem;
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: .5;
    cursor: not-allowed;
  }
`;

const Note = styled.p`
  margin: 9px 2px 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .62rem;
  line-height: 1.5;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "시세 공개 대기";
}

export default function QuickGoldValueCalculator({
  source = "quick-value",
  eyebrow = "MY GOLD · 바로 확인",
  title = "내 금, 오늘 얼마일까요?",
  description = "금 종류와 중량만 입력하면 오늘 참고가치와 예상 순금량을 바로 확인합니다.",
  compact = false,
  onPreviewChange,
}) {
  const navigate = useNavigate();
  const { memberUser: user } = useAuthContext() || {};
  const dashboard = useGoldVaultDashboard(null);
  const [productId, setProductId] = useState("gold-18k-jewelry");
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState("g");

  const effectiveRates = useMemo(
    () => ({
      ...dashboard.rates,
      products: Object.keys(dashboard.rates?.products || {}).length
        ? dashboard.rates.products
        : DEFAULT_GOLD_PRODUCTS,
    }),
    [dashboard.rates]
  );

  const productOptions = useMemo(
    () => getGoldVaultProductOptions(effectiveRates),
    [effectiveRates]
  );

  const orderedProductOptions = useMemo(() => {
    const priority = new Map(PRIORITY_PRODUCT_IDS.map((id, index) => [id, index]));
    return productOptions
      .map((option, index) => ({ option, index }))
      .sort((a, b) => {
        const aRank = priority.has(a.option.productId)
          ? priority.get(a.option.productId)
          : PRIORITY_PRODUCT_IDS.length;
        const bRank = priority.has(b.option.productId)
          ? priority.get(b.option.productId)
          : PRIORITY_PRODUCT_IDS.length;
        return aRank - bRank || a.index - b.index;
      })
      .map(({ option }) => option);
  }, [productOptions]);

  useEffect(() => {
    if (!orderedProductOptions.length) return;
    if (orderedProductOptions.some((option) => option.productId === productId)) return;
    setProductId(orderedProductOptions[0].productId);
  }, [orderedProductOptions, productId]);

  const selected = useMemo(
    () => orderedProductOptions.find((option) => option.productId === productId) || orderedProductOptions[0] || null,
    [orderedProductOptions, productId]
  );

  const grams = useMemo(() => {
    const parsed = Number(String(weightValue || "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return weightUnit === "don" ? parsed * DON_TO_GRAMS : parsed;
  }, [weightUnit, weightValue]);

  const validWeight = grams > 0 && grams <= 10_000;
  const item = useMemo(
    () => ({
      label: selected?.label || "금제품",
      productId: selected?.productId || "",
      goldType: selected?.value || "",
      weightG: grams,
      note: "",
    }),
    [grams, selected]
  );

  const estimatedValueWon = useMemo(
    () =>
      dashboard.publicPriceEnabled && validWeight
        ? computeVaultMarketValueWon(item, effectiveRates, dashboard.market)
        : 0,
    [dashboard.market, dashboard.publicPriceEnabled, effectiveRates, item, validWeight]
  );

  const pureGoldG = useMemo(
    () =>
      validWeight
        ? computeVaultPureGoldG(item, effectiveRates, dashboard.pureGoldBuyPricePerDon)
        : 0,
    [dashboard.pureGoldBuyPricePerDon, effectiveRates, item, validWeight]
  );

  useEffect(() => {
    if (!onPreviewChange) return;
    if (!selected || !validWeight) {
      onPreviewChange(null);
      return;
    }
    onPreviewChange({
      label: selected.label || "금제품",
      weightG: grams,
      estimatedValueWon,
      pureGoldG,
    });
  }, [estimatedValueWon, grams, onPreviewChange, pureGoldG, selected, validWeight]);

  useEffect(() => {
    // Keep the original landing funnel event name so historical analytics stays comparable.
    // Other surfaces use the calculator as a utility without expanding the analytics schema.
    if (source !== "landing") return undefined;
    if (!selected || !validWeight || estimatedValueWon <= 0 || pureGoldG <= 0) return undefined;
    const timer = window.setTimeout(() => {
      trackProductEventOncePerSession(
        "landing_value_calculated",
        {
          gold_category: getAnalyticsGoldCategory(selected),
          weight_band: getAnalyticsWeightBand(grams),
        },
        "landing-value-calculated"
      );
    }, 700);
    return () => window.clearTimeout(timer);
  }, [estimatedValueWon, grams, pureGoldG, selected, source, validWeight]);

  const continueToMyGold = () => {
    if (!selected || !validWeight) return;

    if (source === "landing") {
      trackProductEventOncePerSession(
        "mygold_cta_clicked",
        { source: "landing" },
        "landing-mygold-cta"
      );
    }

    if (user?.uid) {
      navigate("/my-gold/items?add=1", {
        state: {
          source,
          quickGoldItem: item,
        },
      });
      return;
    }

    saveGuestMyGoldItems([item]);
    navigate("/my-gold");
  };

  return (
    <Card aria-label="내 금 오늘 가치 계산">
      <Head $compact={compact}>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        <p>{description}</p>
      </Head>
      <Body $compact={compact}>
        <Fields>
          <Field>
            <span>금 종류</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              {orderedProductOptions.map((option) => (
                <option key={option.productId} value={option.productId}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <span>중량</span>
            <WeightField>
              <input
                inputMode="decimal"
                aria-label="내 금 중량"
                placeholder={weightUnit === "g" ? "예: 10.0" : "예: 2.0"}
                value={weightValue}
                onChange={(event) => setWeightValue(event.target.value.replace(/[^0-9.,]/g, ""))}
              />
              <select
                aria-label="중량 단위"
                value={weightUnit}
                onChange={(event) => setWeightUnit(event.target.value)}
              >
                <option value="g">g</option>
                <option value="don">돈</option>
              </select>
            </WeightField>
          </Field>
        </Fields>

        <Results aria-live="polite">
          <Result>
            <small>오늘 참고가치</small>
            <strong>{validWeight ? formatWon(estimatedValueWon) : grams > 0 ? "입력 확인" : "—"}</strong>
          </Result>
          <Result>
            <small>예상 순금량</small>
            <strong>{validWeight ? `${Number(pureGoldG || 0).toFixed(3)}g` : grams > 0 ? "입력 확인" : "—"}</strong>
          </Result>
        </Results>

        <Action type="button" disabled={!selected || !validWeight} onClick={continueToMyGold}>
          <Gem size={16} aria-hidden /> MY GOLD에 기록해 보기 <ArrowRight size={16} aria-hidden />
        </Action>
        <Note>
          <strong>MY GOLD는 실물을 맡기는 보관 서비스가 아닙니다.</strong> 내가 가진 금의 종류와 중량을 기록해
          참고가치와 변화를 확인하는 개인 기록 공간입니다. 실제 교환은 매장 실측 후 확정됩니다.
        </Note>
      </Body>
    </Card>
  );
}
