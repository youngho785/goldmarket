import { useCallback, useEffect, useState } from "react";

import { trackProductEvent } from "@/analytics/productAnalytics";
import {
  getMemberGoldOverview,
  requestBonusGoldUsage,
} from "@/services/quizClient";

export default function useGoldExchangeMemberGold({ user, isEmailVerified }) {
  const [overview, setOverview] = useState(null);
  const [useMemberGold, setUseMemberGoldState] = useState(false);
  const [usageResult, setUsageResult] = useState(null);
  const [usageError, setUsageError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!user?.uid || !isEmailVerified) {
      setOverview(null);
      setUseMemberGoldState(false);
      return () => { cancelled = true; };
    }

    getMemberGoldOverview()
      .then((next) => {
        if (cancelled) return;
        setOverview(next);
        if (next?.request?.status === "requested" || Number(next?.spendableG || 0) <= 0) {
          setUseMemberGoldState(false);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("[GoldExchange] MEMBER GOLD overview failed:", error?.message || error);
        setOverview(null);
        setUseMemberGoldState(false);
      });

    return () => { cancelled = true; };
  }, [user?.uid, isEmailVerified]);

  const setUseMemberGold = useCallback((next) => {
    const enabled = !!next;
    setUseMemberGoldState(enabled);
    if (enabled) {
      void trackProductEvent("member_gold_exchange_cta_clicked", { source: "exchange" });
    }
  }, []);

  const linkToGroup = useCallback(async (groupId) => {
    setUsageResult(null);
    setUsageError("");

    if (
      !useMemberGold ||
      Number(overview?.spendableG || 0) <= 0 ||
      overview?.request?.status === "requested"
    ) {
      return null;
    }

    try {
      const result = await requestBonusGoldUsage(groupId);
      setUsageResult(result?.request || null);
      setOverview((current) => current ? {
        ...current,
        spendableG: Number(result?.spendableG || 0),
        request: result?.request || null,
      } : current);
      void trackProductEvent("member_gold_usage_requested", { source: "exchange" });
      return result;
    } catch (error) {
      // 예약 자체는 이미 성공한 뒤 호출됩니다. MEMBER GOLD 연결 실패가 예약 성공을 되돌리면 안 됩니다.
      setUsageError(
        error?.message ||
          "예약은 접수되었지만 MEMBER GOLD 사용 신청을 연결하지 못했습니다. MEMBER GOLD 화면에서 다시 신청해 주세요."
      );
      return null;
    }
  }, [overview?.request?.status, overview?.spendableG, useMemberGold]);

  const reset = useCallback(() => {
    setUseMemberGoldState(false);
    setUsageResult(null);
    setUsageError("");
  }, []);

  return {
    overview,
    useMemberGold,
    setUseMemberGold,
    usageResult,
    usageError,
    linkToGroup,
    reset,
  };
}
