// src/pages/GoldExchange.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useLoginGate } from "@/context/LoginGateContext";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { nudgeAppInstall } from "@/hooks/useInstallPrompt";
import {
  useGoldExchangeMarketData,
  useGoldExchangeProfileDefaults,
  useGoldExchangeStatus,
} from "@/hooks/useGoldExchangeRemoteData";

// 🔗 공용 goldRates 모듈
import {
  DON_TO_GRAMS,
  roundTo3Custom,
  computeGoldPolicyResult,
  findGoldProduct,
  listGoldProducts,
} from "@/lib/goldRates";

// ✅ callable 래퍼 사용 (클라 단 로직 최소화)
import { submitGoldExchangeGroup } from "@/services/exchangeClient";
import {
  clearGoldExchangeDraft,
  draftDateToLocalDate,
  readGoldExchangeDraft,
  saveGoldExchangeDraft,
} from "@/lib/goldExchangeDraft";
import { saveGoldVaultImportDraft } from "@/lib/goldVaultImportDraft";
import { subscribeGoldVaultItems } from "@/services/goldVaultService";
import {
  applyExchangeFinalWeights,
  buildReservationProducts,
  createEmptyExchangeProduct,
  getInitialExchangeProductsFromSearch,
  importVaultItemsToExchangeProducts,
  normalizeExchangeProducts,
  syncExchangeProductsWithRates,
  validateExchangeProductsForCalculation,
} from "@/lib/goldExchangeForm";

/* ── 매장 정보 ─────────────────────────────────── */

import {
  PageContainer, FlowHeader, PageEyebrow, PageTitle, PageLead, RebookNotice,
  FlowTrack, FlowItem, InfoCard, Card,
} from "@/components/goldExchange/GoldExchange.styles";
import {
  STEP, MAX_PRODUCTS_PER_BOOKING, MAX_PRODUCT_GRAMS, MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH, BAR_GROUPS, MIN_BAR_GRAMS, breakdownByDenoms, findBestChoice,
} from "@/components/goldExchange/goldExchangeUi";
import {
  StartMethodScreen, CalcStep, BarStep, ReserveStep, DoneStep,
} from "@/components/goldExchange/GoldExchangeSteps";

export default function GoldExchange() {
  const { user, isEmailVerified } = useAuthContext();
  const { openGate } = useLoginGate();
  const location = useLocation();
  const navigate = useNavigate();
  const rebook = location.state?.rebook || null;
  const searchParams = new URLSearchParams(location.search);
  const resumeRequested = searchParams.get("resume") === "reservation";
  const directReservationRequested = searchParams.get("reserve") === "1";
  const requestedEntryMode = String(searchParams.get("mode") || "").trim();
  const explicitEntryMode = ["vault", "manual", "visit"].includes(requestedEntryMode)
    ? requestedEntryMode
    : "";
  const authDraftRef = useRef(
    !rebook && resumeRequested ? readGoldExchangeDraft() : null
  );
  const authDraft = authDraftRef.current;
  const initialRebookProductsRef = useRef(normalizeExchangeProducts(rebook?.products, MAX_PRODUCTS_PER_BOOKING));
  const initialVaultProductsRef = useRef(
    !rebook
      ? normalizeExchangeProducts(location.state?.vaultProducts, MAX_PRODUCTS_PER_BOOKING)
      : []
  );
  const importedFromMyGold =
    location.state?.source === "my-gold" && initialVaultProductsRef.current.length > 0;
  // The URL mode is the primary source of truth. A MY GOLD navigation without
  // an explicit mode is treated as the vault flow for backwards compatibility.
  const entryMode = explicitEntryMode || (importedFromMyGold ? "vault" : "");
  const isRebook = !!rebook;
  const showStartMethod =
    !isRebook &&
    !authDraft &&
    !directReservationRequested &&
    !importedFromMyGold &&
    !entryMode;
  const isDirectRebook = isRebook && (rebook?.directReservation === true || initialRebookProductsRef.current.length === 0);

  /* 스텝 상태 */
  const [step, setStep] = useState(
    isRebook || authDraft || directReservationRequested || entryMode === "visit"
      ? STEP.RESERVE
      : STEP.CALC
  );
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
  }, [step, entryMode, showStartMethod]);

  /* 계산 상태 */
  const [products, setProducts] = useState(() =>
    initialRebookProductsRef.current.length > 0
      ? initialRebookProductsRef.current
      : authDraft?.products?.length
      ? authDraft.products
      : entryMode === "vault" && initialVaultProductsRef.current.length > 0
      ? initialVaultProductsRef.current
      : getInitialExchangeProductsFromSearch(location.search)
  );
  const [calculated, setCalculated] = useState(
    isRebook ? !isDirectRebook : !!authDraft?.calculated
  );
  const [vaultImportedCount, setVaultImportedCount] = useState(
    entryMode === "vault" && importedFromMyGold
      ? initialVaultProductsRef.current.length
      : 0
  );
  const [vaultImportLoading, setVaultImportLoading] = useState(
    entryMode === "vault" && !importedFromMyGold && !!user?.uid
  );
  const fromVault =
    entryMode === "vault" && (importedFromMyGold || vaultImportedCount > 0);


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
  const previousEntryModeRef = useRef(entryMode);

  // Keep URL mode and in-memory flow state synchronized when React Router keeps
  // this page mounted. This covers start/manual/vault/visit switching as well as
  // browser back/forward navigation without spreading reset logic across buttons.
  useEffect(() => {
    const previousMode = previousEntryModeRef.current;
    if (previousMode === entryMode) return;
    previousEntryModeRef.current = entryMode;

    // Resume/rebook flows have their own persisted state and must not be reset by
    // ordinary entry-mode transitions.
    if (isRebook || authDraft || directReservationRequested) return;

    setError("");
    setCalculated(false);
    setVaultImportedCount(0);
    setVaultImportLoading(false);
    setBarGroup("don");
    setBarChoice({ idx: 0, qty: 1 });
    initializedChoiceRef.current = false;
    setVisitDate(null);
    setVisitTime("");
    setPrivacyAccepted(false);
    setSubmitted(false);
    setExchangeId(null);

    if (entryMode === "vault") {
      if (importedFromMyGold && initialVaultProductsRef.current.length > 0) {
        setProducts(initialVaultProductsRef.current.map((product) => ({ ...product })));
        setVaultImportedCount(initialVaultProductsRef.current.length);
      } else {
        setProducts([createEmptyExchangeProduct()]);
        setVaultImportLoading(!!user?.uid);
      }
      setStep(STEP.CALC);
      return;
    }

    if (entryMode === "manual") {
      setProducts(getInitialExchangeProductsFromSearch(location.search));
      setStep(STEP.CALC);
      return;
    }

    if (entryMode === "visit") {
      setProducts([createEmptyExchangeProduct()]);
      setStep(STEP.RESERVE);
      return;
    }

    // No entry mode means the start-method chooser. Keep every previous step
    // hidden and reset the next choice to a clean calculation flow.
    setProducts([createEmptyExchangeProduct()]);
    setStep(STEP.CALC);
  }, [
    authDraft,
    directReservationRequested,
    entryMode,
    importedFromMyGold,
    isRebook,
    location.search,
    user?.uid,
  ]);

  /* 환산율 */
  const { rates, pureGoldBuyPricePerDon } = useGoldExchangeMarketData();
  const productOptions = useMemo(
    () => listGoldProducts(rates, { context: "exchange" }),
    [rates]
  );

  useEffect(() => {
    if (entryMode !== "vault" || importedFromMyGold) return undefined;
    if (!user?.uid) return undefined;

    let active = true;
    let unsubscribe = () => {};
    setVaultImportLoading(true);
    setError("");

    unsubscribe = subscribeGoldVaultItems(
      user.uid,
      (items) => {
        if (!active) return;
        unsubscribe();
        const nextProducts = importVaultItemsToExchangeProducts(
          items,
          rates,
          MAX_PRODUCTS_PER_BOOKING
        );

        if (nextProducts.length === 0) {
          setVaultImportedCount(0);
          setError("MY GOLD에 기록된 금이 없습니다. 먼저 금을 기록하거나 직접 입력해 주세요.");
          setProducts([createEmptyExchangeProduct()]);
        } else {
          setProducts(nextProducts);
          setVaultImportedCount(nextProducts.length);
          setCalculated(false);
          initializedChoiceRef.current = false;
          setStep(STEP.CALC);
        }
        setVaultImportLoading(false);
      },
      (vaultError) => {
        if (!active) return;
        console.error("[GoldExchange] 내금고 불러오기 실패", vaultError);
        setVaultImportLoading(false);
        setError("MY GOLD의 금 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [entryMode, importedFromMyGold, rates, user?.uid]);

  /* 예약 상태 구독 → 그룹 요약 문서 구독 유지 */
  const status = useGoldExchangeStatus(exchangeId);

  useEffect(() => {
    setProducts((current) => syncExchangeProductsWithRates(current, rates));
  }, [rates]);

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
        const policy = findGoldProduct(rates, { productId: product.productId, goldType: product.goldType });
        const calculation = computeGoldPolicyResult({
          grams,
          productId: policy?.id || product.productId,
          goldType: product.goldType,
          exchangeType: product.exchangeType,
          rates,
          pureGoldBuyPricePerDon,
        });
        return {
          ...product,
          productId: policy?.id || product.productId,
          productName: policy?.displayName || product.productName || product.goldType,
          calculationMethod: policy?.calculationMethod || product.calculationMethod,
          finalWeight: calculation.finalWeightG,
        };
      })
    );
    setCalculated(true);
    initializedChoiceRef.current = false;
  }, [isDirectRebook, isRebook, rates, pureGoldBuyPricePerDon]);

  /* 사용자 정보로 기본값 채우기 */
  useGoldExchangeProfileDefaults(user, setName, setPhone);

  const handleProductChange = useCallback((idx, field, value) => {
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }, []);

  const handleProductSelect = useCallback((idx, productId) => {
    const policy = findGoldProduct(rates, { productId });
    setProducts((prev) => prev.map((row, i) => i === idx ? {
      ...row,
      productId: policy?.id || "",
      productName: policy?.displayName || "",
      calculationMethod: policy?.calculationMethod || "",
      goldType: policy?.legacyGoldType || policy?.displayName || "",
      finalWeight: 0,
    } : row));
  }, [rates]);

  const addProduct = () => {
    if (products.length >= MAX_PRODUCTS_PER_BOOKING) {
      setError(`제품은 한 예약에 최대 ${MAX_PRODUCTS_PER_BOOKING}개까지 추가할 수 있습니다.`);
      return;
    }
    setError("");
    setProducts((prev) => [
      ...prev,
      createEmptyExchangeProduct(),
    ]);
  };

  const removeProduct = (idx) =>
    setProducts((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  /* 스텝1: 결과 계산 */
  const onCalculateCore = (e) => {
    e.preventDefault();
    setError("");

    const validation = validateExchangeProductsForCalculation(products, {
      rates,
      pureGoldBuyPricePerDon,
      maxProducts: MAX_PRODUCTS_PER_BOOKING,
      maxProductGrams: MAX_PRODUCT_GRAMS,
    });
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    if (validation.requiresManualCheck) {
      setCalculated(false);
      setStep(STEP.RESERVE);
      return;
    }

    setProducts((prev) => applyExchangeFinalWeights(prev, { rates, pureGoldBuyPricePerDon }));
    setCalculated(true);
    initializedChoiceRef.current = false;
    setStep(STEP.BARS);
    window.setTimeout(() => nudgeAppInstall("calculation-complete"), 1400);
  };

  // 예상 중량 계산은 로그인 없이 이용할 수 있습니다.
  const onCalculate = onCalculateCore;

  // 비회원도 날짜/시간 선택까지 진행할 수 있습니다.
  const onGoReserveDirect = () => {
    navigate("/gold-exchange?mode=visit", { state: null });
  };

  const chooseStartMethod = (mode) => {
    if (mode === "vault" && !user) {
      openGate({
        unifiedContinue: true,
        purposeLabel: "MY GOLD 불러오기",
        message: "MY GOLD에 기록한 내 금을 불러오려면 로그인이 필요합니다.",
        requireVerified: false,
        intent: "exchange-vault-import",
        next: "/gold-exchange?mode=vault",
        cancelLabel: "나중에",
        cancelAsText: true,
      });
      return;
    }

    const nextMode = ["vault", "manual", "visit"].includes(mode) ? mode : "manual";
    navigate(`/gold-exchange?mode=${nextMode}`, { state: null });
  };

  const onGoReserve = () => setStep(STEP.RESERVE);

  const onSaveToMyGold = () => {
    setError("");
    try {
      const draft = saveGoldVaultImportDraft(products);
      const next = "/my-gold?import=calculator";

      if (user) {
        navigate(next);
        return;
      }

      openGate({
        unifiedContinue: true,
        purposeLabel: "MY GOLD 저장",
        message: `계산한 금 ${draft.items.length}개의 종류와 중량을 잠시 보관했습니다. 로그인 후 MY GOLD에서 이어서 저장할 수 있습니다.`,
        requireVerified: false,
        intent: "my-gold-import",
        next,
        cancelLabel: "나중에",
        cancelAsText: true,
      });
    } catch (saveError) {
      setError(saveError?.message || "MY GOLD 저장 준비에 실패했습니다.");
    }
  };

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
      unifiedContinue: true,
      purposeLabel: "방문 예약",
      message: "입력한 금 정보와 선택한 방문 일정을 잠시 보관했습니다. 로그인 후 예약을 이어서 완료할 수 있습니다.",
      verificationMessage: "입력한 금 정보와 선택한 방문 일정을 잠시 보관했습니다. 이메일 인증 후 예약을 이어서 완료할 수 있습니다.",
      requireVerified: true,
      intent: "exchange-reservation-final",
      next: "/gold-exchange?resume=reservation",
      cancelLabel: "나중에",
      cancelAsText: true,
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
        ? buildReservationProducts(products)
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
      <FlowHeader $compact={!showStartMethod}>
        <PageEyebrow>GOLD TO GOLD</PageEyebrow>
        <PageTitle $compact={!showStartMethod}>내 금을 999.9 골드바로 교환</PageTitle>
        <PageLead $compact={!showStartMethod}>
          예상 계산과 방문 날짜·시간 선택은 로그인 없이 이용할 수 있습니다.
          예약 요청만 로그인 또는 회원가입 후 완료합니다.
        </PageLead>
        {isRebook && (
          <RebookNotice role="status">
            <strong>취소된 예약 내용을 불러왔습니다.</strong><br />
            기존 제품과 연락처는 유지되며, 새로운 방문 날짜와 시간을 선택해 다시 신청해 주세요.
          </RebookNotice>
        )}
        {fromVault && (
          <RebookNotice role="status">
            <strong>MY GOLD에 기록한 내 금 {vaultImportedCount || initialVaultProductsRef.current.length}개를 불러왔습니다.</strong><br />
            금 종류와 기록 중량을 다시 입력하지 않고 스텝 1에서 확인한 뒤 바로 예상 교환량을 계산할 수 있습니다. 실제 인정 중량은 매장 실측 후 확정됩니다.
          </RebookNotice>
        )}
        {!showStartMethod && (
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
        )}
      </FlowHeader>
      {showStartMethod && <StartMethodScreen onChoose={chooseStartMethod} />}
      {!showStartMethod && vaultImportLoading && (
        <Card><InfoCard role="status">MY GOLD에서 내 금 기록을 불러오고 있습니다.</InfoCard></Card>
      )}
      {!showStartMethod && step === STEP.CALC && !vaultImportLoading && (
        <CalcStep
          products={products}
          productOptions={productOptions}
          error={error}
          onCalculate={onCalculate}
          handleProductChange={handleProductChange}
          handleProductSelect={handleProductSelect}
          addProduct={addProduct}
          removeProduct={removeProduct}
          onGoReserveDirect={onGoReserveDirect}
          fromVault={fromVault}
        />
      )}

      {!showStartMethod && step === STEP.BARS && calculated && (
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
          onSaveToMyGold={onSaveToMyGold}
          setStep={setStep}
        />
      )}

      {!showStartMethod && step === STEP.RESERVE && (
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

      {!showStartMethod && step === STEP.DONE && submitted && (
        <DoneStep status={status} />
      )}
    </PageContainer>
  );
}
