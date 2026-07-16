// src/hooks/usePendingGoldExchangeCount.js
import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuthContext } from "../context/AuthContext";

/**
 * 관리자 전용: goldExchanges 중 status === "requested" 개수 실시간 구독
 * - auth 로딩 완료 && isAdmin === true일 때만 구독 시작
 * - 비관리자/로그아웃/로딩 중에는 구독하지 않음(0 반환)
 */
export default function usePendingGoldExchangeCount() {
  const { loading, isAdmin } = useAuthContext();
  const [count, setCount] = useState(0);
  const unsubRef = useRef(null);

  useEffect(() => {
    // 이전 구독이 있으면 정리
    if (unsubRef.current) {
      try {
        unsubRef.current();
      } catch {}
      unsubRef.current = null;
    }

    if (loading) return;
    if (!isAdmin) {
      setCount(0);
      return;
    }

    const q = query(
      collection(db, "goldExchanges"),
      where("status", "==", "requested")
    );

    const unsub = onSnapshot(
      q,
      (snap) => setCount(snap.size),
      (err) => {
        console.warn("[usePendingGoldExchangeCount] snapshot error:", err?.code || err);
        setCount(0);
      }
    );

    unsubRef.current = unsub;

    return () => {
      if (unsubRef.current) {
        try {
          unsubRef.current();
        } catch {}
        unsubRef.current = null;
      }
    };
  }, [loading, isAdmin]);

  return count;
}
