import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/firebase/firebase";

function readBalanceG(data) {
  const milliGrams = Number(data?.bonusGoldMilliGrams);
  if (Number.isFinite(milliGrams) && milliGrams >= 0) {
    return milliGrams / 1000;
  }

  const grams = Number(data?.bonusGoldG);
  return Number.isFinite(grams) && grams > 0 ? grams : 0;
}

export default function useBonusGoldBalance(uid) {
  const [balanceG, setBalanceG] = useState(0);
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    if (!uid) {
      setBalanceG(0);
      setLoading(false);
      return undefined;
    }

    setBalanceG(0);
    setLoading(true);

    return onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        setBalanceG(snapshot.exists() ? readBalanceG(snapshot.data()) : 0);
        setLoading(false);
      },
      (error) => {
        console.warn("[useBonusGoldBalance] 적립 순금 조회 실패:", error?.message || error);
        setBalanceG(0);
        setLoading(false);
      }
    );
  }, [uid]);

  return {
    balanceG,
    loading,
  };
}
