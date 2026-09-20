import { useEffect, useRef } from "react";
import { subscribeGoldVaultItems } from "@/services/goldVaultService";
import { readSavedGuestMyGoldItems } from "@/lib/myGoldGuestDemo";
import {
  createEmptyExchangeProduct,
  importVaultItemsToExchangeProducts,
} from "@/lib/goldExchangeForm";
import { STEP } from "@/components/goldExchange/goldExchangeUi";

export default function useGoldExchangeVaultImport({
  entryMode,
  importedFromMyGold,
  userId,
  rates,
  maxProducts,
  setProducts,
  setVaultImportedCount,
  setVaultImportLoading,
  setVaultImportNotice,
  setCalculated,
  setError,
  setStep,
  initializedChoiceRef,
}) {
  const guestAttemptedRef = useRef(false);
  const previousEntryModeRef = useRef(entryMode);

  useEffect(() => {
    if (previousEntryModeRef.current !== entryMode) {
      previousEntryModeRef.current = entryMode;
      guestAttemptedRef.current = false;
    }
  }, [entryMode]);

  useEffect(() => {
    if (entryMode !== "vault" || importedFromMyGold) return undefined;

    if (!userId) {
      if (guestAttemptedRef.current) return undefined;
      guestAttemptedRef.current = true;

      const guestItems = readSavedGuestMyGoldItems();
      const nextProducts = importVaultItemsToExchangeProducts(
        guestItems,
        rates,
        maxProducts
      );

      setVaultImportLoading(false);
      setCalculated(false);
      initializedChoiceRef.current = false;
      setStep(STEP.CALC);
      setError("");

      if (nextProducts.length > 0) {
        setProducts(nextProducts);
        setVaultImportedCount(nextProducts.length);
        setVaultImportNotice(
          "이 브라우저에 저장된 MY GOLD 기록을 불러왔습니다. 방문 예약 마지막 단계에서 로그인과 이메일 인증을 진행합니다."
        );
      } else {
        setProducts([createEmptyExchangeProduct()]);
        setVaultImportedCount(0);
        setVaultImportNotice(
          guestItems.length > 0
            ? "GOLD TO GOLD에 사용할 수 있는 MY GOLD 기록이 없어 직접 입력으로 계속합니다. 순금 999.9 덩어리와 999.9 골드바는 교환 대상 제품에서 제외됩니다."
            : "이 브라우저에 저장된 MY GOLD 기록이 없어 직접 입력으로 계속합니다. 로그인은 방문 예약 마지막 단계에서 진행합니다."
        );
      }
      return undefined;
    }

    let active = true;
    let unsubscribe = () => {};
    setVaultImportLoading(true);
    setVaultImportNotice("");
    setError("");

    unsubscribe = subscribeGoldVaultItems(
      userId,
      (items) => {
        if (!active) return;
        unsubscribe();
        const nextProducts = importVaultItemsToExchangeProducts(
          items,
          rates,
          maxProducts
        );

        if (nextProducts.length === 0) {
          setVaultImportedCount(0);
          setError(
            items.length > 0
              ? "GOLD TO GOLD에 사용할 수 있는 MY GOLD 기록이 없습니다. 순금 999.9 덩어리와 999.9 골드바는 교환 대상 제품에서 제외됩니다."
              : "MY GOLD에 기록된 금이 없습니다. 먼저 금을 기록하거나 직접 입력해 주세요."
          );
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
        console.error("[GoldExchange] MY GOLD import failed", vaultError);
        setVaultImportLoading(false);
        setError("MY GOLD의 금 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [
    entryMode,
    importedFromMyGold,
    initializedChoiceRef,
    maxProducts,
    rates,
    setCalculated,
    setError,
    setProducts,
    setStep,
    setVaultImportLoading,
    setVaultImportedCount,
    setVaultImportNotice,
    userId,
  ]);
}
