import React, { useEffect, useMemo, useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { ArrowRight, Camera as CameraIcon, Coins, Gem } from "lucide-react";

import { useAuthContext } from "@/context/AuthContext";
import useGoldVaultDashboard from "@/hooks/useGoldVaultDashboard";
import { DEFAULT_GOLD_PRODUCTS, DON_TO_GRAMS } from "@/lib/goldRates";
import { formatGoldWeightPair } from "@/lib/goldDisplay";
import { getFirstValueElapsedBucket, markFirstValueStart } from "@/lib/firstValueTiming";
import {
  computeVaultMarketValueWon,
  computeVaultPureGoldG,
  getGoldVaultProductOptions,
} from "@/lib/goldVaultCatalog";
import { saveGuestMyGoldItems } from "@/lib/myGoldGuestDemo";
import { isGoldToGoldInputProduct } from "@/lib/goldExchangeForm";
import { getQuickGoldTypeGroups, isQuickPureGoldType } from "@/lib/quickGoldTypeChoices";
import {
  getAnalyticsGoldCategory,
  getAnalyticsWeightBand,
  trackProductEventOncePerSession,
} from "@/analytics/productAnalytics";
import { isAndroid } from "@/platform/runtime";
import { analyzeGoldHallmarkImage } from "@/services/hallmarkClient";

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
  padding: ${({ $compact, $nativeFirst, $webLanding }) => $nativeFirst ? "13px 15px 12px" : $webLanding ? "15px 20px 13px" : $compact ? "16px 17px 12px" : "20px 21px 15px"};
  background: linear-gradient(138deg, ${({ theme }) => theme.colors.primaryDark}, ${({ theme }) => theme.colors.primary});
  color: ${({ theme }) => theme.on.primary};

  small {
    display: block;
    color: ${({ theme }) => theme.colors.goldLight};
    font-size: .8rem;
    font-weight: 950;
    letter-spacing: .12em;
  }

  h2 {
    margin: ${({ $nativeFirst }) => $nativeFirst ? "4px 0 0" : "6px 0 0"};
    color: ${({ theme }) => theme.on.primary};
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: ${({ $compact, $nativeFirst }) => $nativeFirst ? "1.1rem" : $compact ? "1.2rem" : "clamp(1.26rem, 2.4vw, 1.62rem)"};
    font-weight: 850;
    line-height: 1.18;
    letter-spacing: -.035em;
  }

  p {
    margin: 7px 0 0;
    max-width: 620px;
    color: color-mix(in srgb, ${({ theme }) => theme.on.primary} 70%, transparent);
    font-size: .88rem;
    line-height: 1.5;
    word-break: keep-all;
  }

  @media (max-width: 700px) {
    ${({ $webLanding }) => $webLanding && `
      padding: 12px 16px 11px;
      small { font-size: .7rem; }
      h2 { margin-top: 2px; font-size: 1.15rem; }
      p { display: none; }
    `}
  }
`;

const Body = styled.div`
  padding: ${({ $compact, $nativeFirst, $webLanding }) => $nativeFirst ? "12px 14px 12px" : $webLanding ? "14px 18px 16px" : $compact ? "14px 15px 15px" : "18px 20px 20px"};

  @media (max-width: 700px) {
    ${({ $webLanding }) => $webLanding && `padding: 12px 16px 13px;`}
  }

  ${({ $nativeFirst }) => $nativeFirst && `
    .quick-calc-fields { gap: 11px; }
  `}
`;

const IntroHelp = styled.button`
  display: inline-block;
  margin-bottom: 12px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font: inherit;
  font-size: .84rem;
  font-weight: 900;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.secondary}; outline-offset: 2px; }
`;

const NextActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 12px;

  @media (max-width: 380px) { grid-template-columns: 1fr; }
`;

const NextExchangeLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 50px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.semantic.badgeGoldBg};
  color: ${({ theme }) => theme.colors.primary};
  font-size: .84rem;
  font-weight: 900;
  text-align: center;
  text-decoration: none;
  word-break: keep-all;
  &:focus-visible { outline: 3px solid ${({ theme }) => theme.colors.secondary}; outline-offset: 2px; }
`;

const EntryModeChooser = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 15px;

  > p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-size: .96rem;
    font-weight: 850;
    line-height: 1.4;
  }

  > div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }
`;

const EntryModeButton = styled.button`
  min-height: 52px;
  padding: 12px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: .9rem;
  font-weight: 850;
  cursor: pointer;

  &[aria-pressed="true"] {
    border-color: ${({ theme }) => theme.colors.secondary};
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 2px;
  }
`;

const UnknownGuide = styled.section`
  display: grid;
  gap: 9px;
  margin-bottom: 16px;
  padding: 15px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 15px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.6;
  word-break: keep-all;

  strong { font-size: .93rem; }
  p { margin: 0; font-size: .86rem; color: ${({ theme }) => theme.colors.textSecondary}; }
`;

const UnknownActions = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 440px) { grid-template-columns: 1fr; }
`;

const UnknownVisitLink = styled(Link)`
  display: grid;
  place-items: center;
  min-height: 46px;
  padding: 10px 12px;
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.on.primary};
  font-size: .88rem;
  font-weight: 850;
  text-align: center;
  text-decoration: none;

  &:focus-visible { outline: 3px solid ${({ theme }) => theme.colors.secondary}; outline-offset: 2px; }
`;

const UnknownBackButton = styled.button`
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: .88rem;
  font-weight: 850;
  cursor: pointer;

  &:focus-visible { outline: 3px solid ${({ theme }) => theme.colors.secondary}; outline-offset: 2px; }
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
    font-size: .84rem;
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

const QuickTypeGroup = styled.div`
  display: grid;
  gap: ${({ $nativeFirst }) => $nativeFirst ? "7px" : "9px"};

  > span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
    font-weight: 900;
  }
`;

const QuickTypeHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 5px 10px;

  > span { color: ${({ theme }) => theme.colors.textSecondary}; font-size: .84rem; font-weight: 900; }
  button { margin: 0; font-size: .77rem; }
`;

const QuickTypeButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`;

const QuickTypeButton = styled.button`
  min-width: 0;
  min-height: 46px;
  padding: 9px 5px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 13px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  font-size: 1rem;
  font-weight: 900;
  cursor: pointer;

  &[aria-pressed="true"] {
    border: 2px solid ${({ theme }) => theme.colors.secondary};
    background: ${({ theme }) => theme.semantic.badgeGoldBg};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 2px;
  }
`;

const QuickDetailGroup = styled.div`
  display: grid;
  gap: 8px;
  padding: 11px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  > span {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
    font-weight: 850;
  }

  > div {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
`;

const MoreTypeToggle = styled.button`
  justify-self: start;
  padding: 3px 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font: inherit;
  font-size: .86rem;
  font-weight: 900;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 2px;
  }
`;

const WeightField = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px;
  gap: 7px;
`;

const FieldGroup = styled.div`
  min-width: 0;
`;

const HelpRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px 12px;
  flex-wrap: wrap;
  margin-top: 7px;
`;

const HelpButton = styled.button`
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSecondary};
  font: inherit;
  font-size: .84rem;
  font-weight: 800;
  text-align: left;
  cursor: pointer;

  strong {
    color: ${({ theme }) => theme.colors.secondaryDark};
    font-weight: 950;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 3px;
    border-radius: 4px;
  }
`;

const HelpPanel = styled.div`
  display: grid;
  gap: 5px;
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .84rem;
  line-height: 1.55;

  p { margin: 0; }
  strong { color: ${({ theme }) => theme.colors.text}; }
`;

const HelpAction = styled.button`
  justify-self: start;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.secondaryDark};
  font: inherit;
  font-size: .84rem;
  font-weight: 950;
  cursor: pointer;
`;

const HallmarkScanButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 44px;
  padding: 5px 9px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.secondaryDark};
  font: inherit;
  font-size: .84rem;
  font-weight: 950;
  cursor: pointer;

  &:disabled {
    opacity: .58;
    cursor: wait;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: 2px;
  }
`;

const HallmarkStatus = styled.div`
  display: grid;
  gap: 6px;
  margin-top: 8px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 11px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: .84rem;
  line-height: 1.5;
  word-break: keep-all;

  p,
  small {
    margin: 0;
  }

  strong {
    color: ${({ theme }) => theme.colors.text};
  }

  small {
    font-size: .8rem;
  }
`;

const SavePrompt = styled.div`
  margin-top: 13px;
  padding: 13px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.surfaceAlt};

  > strong {
    display: block;
    color: ${({ theme }) => theme.colors.primary};
    font-size: .92rem;
    font-weight: 950;
  }

  p {
    margin: 5px 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: .84rem;
    line-height: 1.55;
    word-break: keep-all;
  }
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
    font-size: .83rem;
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
  font-size: .92rem;
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
  font-size: .8rem;
  line-height: 1.5;
  word-break: keep-all;

  strong {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const MAX_HALLMARK_UPLOAD_BYTES = 1_500_000;

function estimateBase64Bytes(value) {
  const base64 = String(value || "").replace(/\s+/g, "");

  if (!base64) return 0;

  const padding = base64.endsWith("==")
    ? 2
    : base64.endsWith("=")
      ? 1
      : 0;

  return Math.max(
    0,
    Math.floor((base64.length * 3) / 4) - padding
  );
}

function isCameraCancelError(error) {
  const message = String(
    error?.message || error || ""
  ).toLowerCase();

  return (
    message.includes("cancel") ||
    message.includes("취소")
  );
}

function hallmarkErrorMessage(error) {
  const code = String(error?.code || "").toLowerCase();

  if (
    code.includes("resource-exhausted")
  ) {
    return "각인 확인을 여러 번 시도했습니다. 잠시 후 다시 이용해 주세요.";
  }

  if (
    code.includes("permission") ||
    code.includes("denied")
  ) {
    return "카메라 권한을 허용한 뒤 다시 시도해 주세요.";
  }

  if (
    code.includes("unavailable") ||
    code.includes("deadline")
  ) {
    return "각인 확인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "각인을 확인하지 못했습니다. 다시 촬영하거나 직접 선택해 주세요.";
}
function formatWon(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0
    ? `${Math.round(number).toLocaleString("ko-KR")}원`
    : "시세 공개 대기";
}

export default function QuickGoldValueCalculator({
  source = "quick-value",
  eyebrow = "회원가입 없이 먼저 확인",
  title = "내 금, 오늘 얼마일까요?",
  description = "금 종류와 중량만 입력하면 오늘 참고가치와 예상 순금량을 바로 확인합니다.",
  compact = false,
  onPreviewChange,
}) {
  const navigate = useNavigate();
  const { memberUser: user } = useAuthContext() || {};
  const dashboard = useGoldVaultDashboard(null);
  const [productId, setProductId] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState("g");
  const [entryMode, setEntryMode] = useState("known");
  const [pureOptionsOpen, setPureOptionsOpen] = useState(false);
  const [moreTypesOpen, setMoreTypesOpen] = useState(false);
  const appFirstExperience = source === "app-home" || source === "app-first-gold";
  // Only web landing gets the quick product choice: native home behavior stays unchanged.
  const webLandingExperience = source === "landing";
  const quickEntryExperience = appFirstExperience || webLandingExperience;
  const [stampHelpOpen, setStampHelpOpen] = useState(false);
  const [weightHelpOpen, setWeightHelpOpen] = useState(false);
  const [hallmarkBusy, setHallmarkBusy] = useState(false);
  const [hallmarkResult, setHallmarkResult] = useState(null);
  const [hallmarkError, setHallmarkError] = useState("");



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
    if (!productId) return;
    if (orderedProductOptions.some((option) => option.productId === productId)) return;
    setProductId("");
  }, [orderedProductOptions, productId]);

  const selected = useMemo(
    () => orderedProductOptions.find((option) => option.productId === productId) || null,
    [orderedProductOptions, productId]
  );

  const quickTypeGroups = useMemo(
    () => getQuickGoldTypeGroups(orderedProductOptions),
    [orderedProductOptions]
  );
  const hasPureSelection = isQuickPureGoldType(productId);
  const hasMoreSelection = quickTypeGroups.more.some((option) => option.productId === productId);

  const chooseQuickType = (id) => {
    setProductId(id);
    setPureOptionsOpen(false);
    setMoreTypesOpen(false);
  };

  const openPureTypes = () => {
    // '순금'만으로는 995/999 비율을 확정할 수 없습니다.
    if (!hasPureSelection) setProductId("");
    setPureOptionsOpen(true);
    setMoreTypesOpen(false);
  };

  const grams = useMemo(() => {
    const parsed = Number(String(weightValue || "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return weightUnit === "don" ? parsed * DON_TO_GRAMS : parsed;
  }, [weightUnit, weightValue]);

  const validWeight = grams > 0 && grams <= 10_000;
  const canCalculate = !!selected && validWeight;
  // 금 가치 계산에는 제품 모양이 필요하지 않습니다. 실제 금 종류와 중량만 사용합니다.
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
      dashboard.publicPriceEnabled && canCalculate
        ? computeVaultMarketValueWon(item, effectiveRates, dashboard.market)
        : 0,
    [canCalculate, dashboard.market, dashboard.publicPriceEnabled, effectiveRates, item]
  );

  const pureGoldG = useMemo(
    () =>
      canCalculate
        ? computeVaultPureGoldG(item, effectiveRates, dashboard.pureGoldBuyPricePerDon)
        : 0,
    [canCalculate, dashboard.pureGoldBuyPricePerDon, effectiveRates, item]
  );

  const publishedEstimateReady = canCalculate && dashboard.ratesReady &&
    !dashboard.marketLoading && !dashboard.publicPriceLoading &&
    dashboard.publicPriceEnabled && estimatedValueWon > 0;
  const pureGoldEstimateReady = dashboard.ratesReady && pureGoldG > 0;

  const changeWeightUnit = (nextUnit) => {
    if (nextUnit === weightUnit) return;
    // 단위 선택은 입력 숫자의 의미를 정합니다. 10 입력 후 돈을 고르면 10돈입니다.
    // 자동 숫자 환산은 별도 동작이므로 이 선택기에서는 하지 않습니다.
    setWeightUnit(nextUnit);
  };

  useEffect(() => {
    if (appFirstExperience) markFirstValueStart();
  }, [appFirstExperience]);

  useEffect(() => {
    if (!appFirstExperience || !publishedEstimateReady || !pureGoldEstimateReady) return undefined;
    const timer = window.setTimeout(() => {
      const elapsed_bucket = getFirstValueElapsedBucket();
      if (!elapsed_bucket) return;
      trackProductEventOncePerSession(
        "app_first_value_calculated",
        { elapsed_bucket, audience: source === "app-home" ? "guest" : "new_member" },
        "app-first-value-calculated"
      );
    }, 700);
    return () => window.clearTimeout(timer);
  }, [appFirstExperience, publishedEstimateReady, pureGoldEstimateReady, source]);

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

  const selectEntryMode = (nextMode) => {
    setEntryMode(nextMode);
    if (nextMode === "unknown") {
      trackProductEventOncePerSession(
        "quick_calc_help_opened",
        { source },
        `quick-calc-help-${source}`
      );
    }
  };

  const toggleStampHelp = () => {
    setStampHelpOpen((open) => !open);
  };

  const toggleWeightHelp = () => {
    setWeightHelpOpen((open) => !open);
  };

  const openStoreMeasurementHelp = () => {
    navigate("/stores");
  };

  const scanHallmarkWithSystemCamera = async () => {
    if (!isAndroid || hallmarkBusy) return;

    setHallmarkBusy(true);
    setHallmarkError("");
    setHallmarkResult(null);

    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        width: 1600,
        height: 1600,
        allowEditing: false,
        correctOrientation: true,
        saveToGallery: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      const imageBase64 = String(
        photo?.base64String || ""
      ).trim();

      if (!imageBase64) {
        throw new Error("camera-image-empty");
      }

      if (
        estimateBase64Bytes(imageBase64) >
        MAX_HALLMARK_UPLOAD_BYTES
      ) {
        setHallmarkError(
          "사진 용량이 큽니다. 각인 부분을 화면에 크게 보이도록 가까이 촬영해 주세요."
        );
        return;
      }

      const format = String(
        photo?.format || "jpeg"
      ).toLowerCase();

      if (
        !["jpeg", "jpg", "png"].includes(format)
      ) {
        setHallmarkError(
          "이 사진 형식은 판독할 수 없습니다. 카메라로 다시 촬영해 주세요."
        );
        return;
      }

      const result = await analyzeGoldHallmarkImage({
        imageBase64,
        mimeType:
          format === "png"
            ? "image/png"
            : "image/jpeg",
      });

      if (!result?.ok) {
        throw new Error("hallmark-analysis-failed");
      }

      setHallmarkResult(result);
    } catch (error) {
      if (isCameraCancelError(error)) {
        return;
      }

      setHallmarkError(
        hallmarkErrorMessage(error)
      );
    } finally {
      setHallmarkBusy(false);
    }
  };


  const applyHallmarkRecommendation = () => {
    const nextProductId = String(
      hallmarkResult?.recommendationProductId ||
      hallmarkResult?.suggestedProductId ||
      ""
    );

    if (!nextProductId) return;

    const supported = orderedProductOptions.some(
      (option) =>
        option.productId === nextProductId
    );

    if (!supported) {
      setHallmarkError(
        "확인한 금 종류를 현재 목록에서 찾지 못했습니다. 직접 선택해 주세요."
      );
      return;
    }

    setProductId(nextProductId);
    setHallmarkError("");
    setHallmarkResult((current) =>
      current
        ? {
            ...current,
            applied: true,
          }
        : current
    );
  };

  // GoldExchange의 기존 URL 기반 초기값 로더를 재사용합니다.
  // 단순 제품 그림 선택은 금의 함량을 추정하지 않으며, 고객이 고른 금 종류만 전달합니다.
  const exchangeUrl = useMemo(() => {
    if (!canCalculate || !isGoldToGoldInputProduct(selected?.productId)) return "";
    const params = new URLSearchParams({
      mode: "manual",
      quick: "1",
      pid: selected.productId,
      type: selected.value,
      w: String(Number(String(weightValue).replace(",", "."))),
      unit: weightUnit,
    });
    return `/gold-exchange?${params.toString()}`;
  }, [canCalculate, selected, weightUnit, weightValue]);

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
      <Head $compact={compact} $nativeFirst={compact && appFirstExperience} $webLanding={webLandingExperience}>
        {eyebrow && <small>{eyebrow}</small>}
        <h2>{title}</h2>
        {!(compact && appFirstExperience) && <p>{description}</p>}
      </Head>
      <Body $compact={compact} $nativeFirst={compact && appFirstExperience} $webLanding={webLandingExperience}>
        {appFirstExperience && !compact && (
          <IntroHelp
            type="button"
            onClick={() => selectEntryMode(entryMode === "unknown" ? "known" : "unknown")}
            aria-expanded={entryMode === "unknown"}
          >
            금 종류나 무게를 모르겠어요
          </IntroHelp>
        )}

        {!quickEntryExperience && <EntryModeChooser>
          <p>금 종류와 무게를 알고 계신가요?</p>
          <div role="group" aria-label="금 가치 확인 시작 방법">
            <EntryModeButton
              type="button"
              aria-pressed={entryMode === "known"}
              onClick={() => selectEntryMode("known")}
            >
              네, 알고 있어요
            </EntryModeButton>
            <EntryModeButton
              type="button"
              aria-pressed={entryMode === "unknown"}
              onClick={() => selectEntryMode("unknown")}
            >
              잘 모르겠어요
            </EntryModeButton>
          </div>
        </EntryModeChooser>}

        {entryMode === "unknown" && (
          <UnknownGuide role="region" aria-label="금 종류와 무게 확인 방법">
            <strong>모르셔도 괜찮습니다. 확인 방법부터 안내해 드릴게요.</strong>
            <p>① 금 종류: 반지·목걸이 안쪽의 14K·585, 18K·750 등의 표시를 살펴보세요. 각인은 참고용이며 실제 순도를 확정하지 않습니다.</p>
            <p>② 무게: 보증서·구매 영수증을 확인하거나 정밀 저울로 참고 측정할 수 있어요. 사진만으로 무게를 알 수는 없습니다.</p>
            <p>정보를 확인할 수 없으면 계산 없이 매장 실측 방문 예약을 진행할 수 있습니다.</p>
            <UnknownActions>
              <UnknownVisitLink
                to="/gold-exchange?mode=visit"
                onClick={() => trackProductEventOncePerSession(
                  "quick_calc_store_visit_clicked",
                  { source },
                  `quick-calc-store-visit-${source}`
                )}
              >
                매장에서 확인 예약하기
              </UnknownVisitLink>
              <UnknownBackButton type="button" onClick={() => selectEntryMode("known")}>
                입력해서 계산하기
              </UnknownBackButton>
            </UnknownActions>
          </UnknownGuide>
        )}

        <Fields className="quick-calc-fields">
          <FieldGroup>
            {quickEntryExperience ? (
              <QuickTypeGroup $nativeFirst={compact}>
                {(compact || webLandingExperience) ? (
                  <QuickTypeHeading>
                    <span>금 종류</span>
                    <IntroHelp
                      type="button"
                      onClick={() => selectEntryMode(entryMode === "unknown" ? "known" : "unknown")}
                      aria-expanded={entryMode === "unknown"}
                    >
                      금 종류·무게를 모르겠어요
                    </IntroHelp>
                  </QuickTypeHeading>
                ) : <span>금 종류</span>}
                <QuickTypeButtons role="group" aria-label="자주 선택하는 금 종류">
                  {quickTypeGroups.quick.map((option) => (
                    <QuickTypeButton
                      key={option.productId}
                      type="button"
                      aria-pressed={productId === option.productId}
                      onClick={() => chooseQuickType(option.productId)}
                    >
                      {option.productId === "gold-14k-jewelry" ? "14K" : "18K"}
                    </QuickTypeButton>
                  ))}
                  {quickTypeGroups.pure.length > 0 && (
                    <QuickTypeButton
                      type="button"
                      aria-pressed={hasPureSelection}
                      aria-expanded={pureOptionsOpen || hasPureSelection}
                      aria-controls="quick-pure-gold-types"
                      onClick={openPureTypes}
                    >
                      순금
                    </QuickTypeButton>
                  )}
                </QuickTypeButtons>
                {(pureOptionsOpen || hasPureSelection) && quickTypeGroups.pure.length > 0 && (
                  <QuickDetailGroup id="quick-pure-gold-types" role="group" aria-label="순금 종류 선택">
                    <span>순금의 종류를 선택하세요</span>
                    <div>
                      {quickTypeGroups.pure.map((option) => (
                        <QuickTypeButton
                          type="button"
                          key={option.productId}
                          aria-pressed={productId === option.productId}
                          onClick={() => chooseQuickType(option.productId)}
                        >
                          {option.productId === "gold-995-product" ? "99.5% (995)" : "99.9% (999)"}
                        </QuickTypeButton>
                      ))}
                    </div>
                  </QuickDetailGroup>
                )}
                {quickTypeGroups.more.length > 0 && (
                  <>
                    <MoreTypeToggle
                      type="button"
                      aria-expanded={moreTypesOpen || hasMoreSelection}
                      aria-controls="quick-more-gold-types"
                      onClick={() => {
                        setMoreTypesOpen((open) => !open);
                        setPureOptionsOpen(false);
                      }}
                    >
                      다른 금 종류 보기 {moreTypesOpen || hasMoreSelection ? "▴" : "▾"}
                    </MoreTypeToggle>
                    {(moreTypesOpen || hasMoreSelection) && (
                      <Field id="quick-more-gold-types">
                        <span>기타 금 종류</span>
                        <select
                          aria-label="기타 금 종류"
                          value={hasMoreSelection ? productId : ""}
                          onChange={(event) => chooseQuickType(event.target.value)}
                        >
                          <option value="">금 종류를 선택하세요</option>
                          {quickTypeGroups.more.map((option) => (
                            <option key={option.productId} value={option.productId}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </>
                )}
              </QuickTypeGroup>
            ) : (
              <Field>
                <span>금 종류</span>
                <select
                  aria-label="금 종류"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                >
                  <option value="" disabled>금 종류를 선택하세요</option>
                  {orderedProductOptions.map((option) => (
                    <option key={option.productId} value={option.productId}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {((!compact && !webLandingExperience) || entryMode === "unknown") && <HelpRow>
              <HelpButton type="button" onClick={toggleStampHelp} aria-expanded={stampHelpOpen}>
                금 종류를 모르시나요? <strong>각인 확인 방법</strong>
              </HelpButton>

              {isAndroid && (
                <HallmarkScanButton
                  type="button"
                  onClick={scanHallmarkWithSystemCamera}
                  disabled={hallmarkBusy}
                >
                  <CameraIcon size={14} aria-hidden />
                  {hallmarkBusy
                    ? "각인 확인 중..."
                    : "각인 촬영으로 확인"}
                </HallmarkScanButton>
              )}
            </HelpRow>}
            {isAndroid && (hallmarkError || hallmarkResult) && (
              <HallmarkStatus
                role={hallmarkError ? "alert" : "status"}
                aria-live="polite"
              >
                {hallmarkError ? (
                  <p>{hallmarkError}</p>
                ) : (
                  <>
                    <p>
                      <strong>
                        {hallmarkResult.message}
                      </strong>
                    </p>

                    {(hallmarkResult.recommendationProductId ||
                      hallmarkResult.suggestedProductId) &&
                      !hallmarkResult.applied && (
                        <HelpAction
                          type="button"
                          onClick={applyHallmarkRecommendation}
                        >
                          {hallmarkResult.suggestedProductId
                            ? `${hallmarkResult.suggestedLabel || "후보"}로 선택하기`
                            : "이 금 종류로 선택"}
                        </HelpAction>
                      )}

                    {(hallmarkResult.suggestedProductId ||
                      hallmarkResult.matchConfidence === "medium") &&
                      !hallmarkResult.applied && (
                        <small>
                          제품의 실제 각인을 눈으로 확인한 경우에만 선택해 주세요.
                        </small>
                      )}

                    {hallmarkResult.applied && (
                      <small>
                        금 종류에 반영했습니다. 선택값을 한 번 더 확인해 주세요.
                      </small>
                    )}

                    {hallmarkResult.requiresProductForm && (
                      <small>
                        순금 계열은 각인만으로 제품 형태를 구분하기 어려울 수 있으므로 아래 목록에서 형태를 직접 선택해 주세요.
                      </small>
                    )}
                  </>
                )}

                <small>
                  각인 촬영은 제품의 표시를 읽는 보조 기능이며 실제 금 순도를 판정하지 않습니다. 실제 교환은 매장 실측 후 확정됩니다.
                </small>
                <small>
                  촬영 이미지는 각인 확인을 위해 분석하며 한국골드마켓에는 저장하지 않습니다.
                </small>
              </HallmarkStatus>
            )}

            {stampHelpOpen && (
              <HelpPanel>
                <p><strong>제품 안쪽 각인을 확인해 보세요.</strong></p>
                <p><strong>585 · 14K · K14</strong> → 14K</p>
                <p><strong>750 · 18K · K18</strong> → 18K</p>
                <p><strong>995 · 99.5</strong> → 순금 99.5%</p>
                <p><strong>999 · 99.9</strong> → 순금 99.9% 계열</p>
                <p><strong>24K · K24</strong> → 순금 계열</p>
                <p><strong>999.9 · 9999 · 99.99</strong> → 순금 999.9 계열</p>
                <p>각인이 없거나 흐리다면 금 종류를 직접 선택하거나 매장에서 확인할 수 있습니다.</p>
                <HelpAction type="button" onClick={openStoreMeasurementHelp}>매장에서 확인하기</HelpAction>
              </HelpPanel>
            )}
          </FieldGroup>

          <FieldGroup>
            <Field>
              <span>중량</span>
              <WeightField>
                <input
                  inputMode="decimal"
                  aria-label="내 금 중량"
                  placeholder={weightUnit === "g" ? "예: 37.5" : "예: 10"}
                  value={weightValue}
                  onChange={(event) => setWeightValue(event.target.value.replace(/[^0-9.,]/g, ""))}
                />
                <select
                  aria-label="중량 단위"
                  value={weightUnit}
                  onChange={(event) => changeWeightUnit(event.target.value)}
                >
                  <option value="g">g</option>
                  <option value="don">돈</option>
                </select>
              </WeightField>
              {validWeight && (
                <small aria-live="polite" style={{ color: "#606a75", fontWeight: 750 }}>
                  입력한 {weightValue}{weightUnit === "don" ? "돈" : "g"} = {weightUnit === "don"
                    ? `${grams.toFixed(2)}g`
                    : `${(grams / DON_TO_GRAMS).toFixed(2)}돈`}
                </small>
              )}
            </Field>

            {((!compact && !webLandingExperience) || entryMode === "unknown") && <HelpRow>
              <HelpButton type="button" onClick={toggleWeightHelp} aria-expanded={weightHelpOpen}>
                무게를 모르시나요? <strong>확인 방법 보기</strong>
              </HelpButton>
            </HelpRow>}

            {weightHelpOpen && (
              <HelpPanel>
                <p><strong>보증서·영수증 확인</strong> · 구입 당시 중량이 표시되어 있는지 확인해 보세요.</p>
                <p><strong>집에서 참고 측정</strong> · 0.01g 단위 전자저울을 이용하면 참고 중량을 확인할 수 있습니다.</p>
                <p>일반 주방저울은 작은 귀금속을 측정할 때 오차가 클 수 있습니다.</p>
                <p><strong>정확한 중량은 매장에서 직접 실측할 수 있습니다.</strong></p>
                <HelpAction type="button" onClick={openStoreMeasurementHelp}>매장 실측 안내</HelpAction>
              </HelpPanel>
            )}
          </FieldGroup>
        </Fields>

        {canCalculate && (
          <Results aria-live="polite" role="status" aria-label="내 금 예상 계산 결과">
            <Result>
              <small>오늘 예상 참고가치</small>
              <strong>{publishedEstimateReady ? formatWon(estimatedValueWon) : "시세 확인 중 · 잠시 후 다시 확인"}</strong>
            </Result>
            <Result>
              <small>예상 순금량</small>
              <strong>{pureGoldEstimateReady ? formatGoldWeightPair(pureGoldG) : "환산 기준 확인 중"}</strong>
            </Result>
          </Results>
        )}

        {canCalculate && !quickEntryExperience && (
          <SavePrompt>
            <strong>한 번 기록하면, 매주 내 금의 변화가 보입니다.</strong>
            <p>다시 입력할 필요 없이 확인할 수 있어요. 주간 알림은 회원의 수신 동의 후 제공됩니다.</p>
          </SavePrompt>
        )}

        {canCalculate && (
          <>
            {quickEntryExperience ? (
              <NextActions>
                <Action type="button" onClick={continueToMyGold} style={{ marginTop: 0 }}>
                  <Gem size={16} aria-hidden /> 내 금 기록하기 <ArrowRight size={16} aria-hidden />
                </Action>
                {exchangeUrl && (
                  <NextExchangeLink to={exchangeUrl}>
                    <Coins size={16} aria-hidden /> 골드바로 바꾸면? <ArrowRight size={16} aria-hidden />
                  </NextExchangeLink>
                )}
              </NextActions>
            ) : (
              <Action type="button" onClick={continueToMyGold}>
                <Gem size={16} aria-hidden /> MY GOLD에 기록하기 <ArrowRight size={16} aria-hidden />
              </Action>
            )}
            <Note>
              <strong>MY GOLD는 금 실물을 맡기는 보관 서비스가 아닙니다.</strong> 오늘 가치는 참고용이며,
              실제 교환은 매장 실측 후 확정됩니다.
            </Note>
          </>
        )}
        {!canCalculate && compact && !appFirstExperience && (
          <Note>금 종류와 중량을 입력하면 예상 결과가 나타납니다. 입력한 금은 이곳에 맡기지 않습니다.</Note>
        )}
        {!canCalculate && !compact && (
          <Note>
            {webLandingExperience ? (
              <>예상 가치는 참고용 · 실제 교환은 매장 실측·동의 후 확정됩니다. MY GOLD는 금 실물 보관이 아닙니다.</>
            ) : (
              <><strong>MY GOLD는 금 실물을 맡기는 보관 서비스가 아닙니다.</strong> 금 종류와 중량을 입력해 참고가치를 확인할 수 있으며, 실제 교환은 매장 실측 후 확정됩니다.</>
            )}
          </Note>
        )}
      </Body>
    </Card>
  );
}
