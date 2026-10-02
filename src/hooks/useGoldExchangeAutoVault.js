import { useEffect, useRef } from "react";
import { nudgeAppInstall } from "@/hooks/useInstallPrompt";
import {
  applyExchangeFinalWeights,
  validateExchangeProductsForCalculation,
} from "@/lib/goldExchangeForm";
import { STEP } from "@/components/goldExchange/goldExchangeUi";

export default function useGoldExchangeAutoVault({
  enabled,
  entryMode,
  vaultImportLoading,
  products,
  rates,
  pureGoldBuyPricePerDon,
  maxProducts,
  maxProductGrams,
  step,
  setError,
  setProducts,
  setCalculated,
  setStep,
  initializedChoiceRef,
  onCalculated,
}) {
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
  }, [entryMode]);

  useEffect(() => {
    if (!enabled || entryMode !== "vault" || vaultImportLoading) return;
    if (completedRef.current || step !== STEP.CALC || products.length === 0) return;

    const validation = validateExchangeProductsForCalculation(products, {
      rates,
      pureGoldBuyPricePerDon,
      maxProducts,
      maxProductGrams,
    });

    // 원격 시세/환산율이 아직 준비되지 않은 경우 다음 데이터 갱신에서 다시 시도합니다.
    if (!validation.ok) return;

    completedRef.current = true;
    setError("");

    if (validation.requiresManualCheck) {
      setCalculated(false);
      setStep(STEP.RESERVE);
      return;
    }

    setProducts((current) =>
      applyExchangeFinalWeights(current, { rates, pureGoldBuyPricePerDon })
    );
    setCalculated(true);
    initializedChoiceRef.current = false;
    onCalculated?.();
    setStep(STEP.BARS);
    window.setTimeout(() => nudgeAppInstall("calculation-complete"), 1400);
  }, [
    enabled,
    entryMode,
    initializedChoiceRef,
    maxProductGrams,
    maxProducts,
    onCalculated,
    products,
    pureGoldBuyPricePerDon,
    rates,
    setCalculated,
    setError,
    setProducts,
    setStep,
    step,
    vaultImportLoading,
  ]);
}
