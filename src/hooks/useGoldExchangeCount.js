// src/hooks/useGoldExchangeCount.js
import { useState, useEffect } from "react";
import { db } from "../firebase/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuthContext } from "../context/AuthContext";

export default function useGoldExchangeCount() {
  const { user } = useAuthContext();
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!user?.uid) return;

    // 내가 보지 않은(viewed=false) 내 교환 요청만 쿼리
    const q = query(
      collection(db, "goldExchanges"),
      where("userId", "==", user.uid),
      where("viewed", "==", false)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setCount(snapshot.size);
      },
      (error) => {
        console.error("❌ useGoldExchangeCount 구독 에러:", error);
        setCount(0);
      }
    );

    return () => {
      try {
        unsub();
      } catch {}
    };
  }, [user?.uid]);

  return count;
}
