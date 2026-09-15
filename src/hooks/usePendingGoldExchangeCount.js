// src/hooks/usePendingGoldExchangeCount.js
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuthContext } from "../context/AuthContext";

/*
 * 관리자 화면의 여러 컴포넌트(Navbar, 관리자 대시보드, 모바일 관리자 메뉴)가
 * 같은 `repStatus === requested` 쿼리를 각각 열지 않도록 모듈 단위로 1개만 공유합니다.
 * 마지막 구독자가 사라지면 Firestore listener도 즉시 정리합니다.
 */
let sharedCount = 0;
let sharedUnsubscribe = null;
const sharedSubscribers = new Set();

function publishCount(nextCount) {
  sharedCount = Math.max(0, Number(nextCount) || 0);
  sharedSubscribers.forEach((listener) => {
    try {
      listener(sharedCount);
    } catch {}
  });
}

function startSharedListener() {
  if (sharedUnsubscribe || sharedSubscribers.size === 0) return;

  const pendingQuery = query(
    collection(db, "goldExchangeGroups"),
    where("repStatus", "==", "requested")
  );

  sharedUnsubscribe = onSnapshot(
    pendingQuery,
    (snapshot) => publishCount(snapshot.size),
    (error) => {
      console.warn(
        "[usePendingGoldExchangeCount] snapshot error:",
        error?.code || error
      );
      publishCount(0);
    }
  );
}

function subscribeSharedCount(listener) {
  sharedSubscribers.add(listener);
  listener(sharedCount);
  startSharedListener();

  return () => {
    sharedSubscribers.delete(listener);
    if (sharedSubscribers.size === 0 && sharedUnsubscribe) {
      try {
        sharedUnsubscribe();
      } catch {}
      sharedUnsubscribe = null;
      sharedCount = 0;
    }
  };
}

/**
 * 관리자 전용: goldExchangeGroups 중 repStatus === "requested" 그룹 개수 실시간 구독
 * - auth 로딩 완료 && isAdmin === true일 때만 공유 구독에 참여
 * - 비관리자/로그아웃/로딩 중에는 Firestore를 읽지 않고 0 반환
 */
export default function usePendingGoldExchangeCount() {
  const { loading, isAdmin } = useAuthContext();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (loading || !isAdmin) {
      setCount(0);
      return undefined;
    }

    return subscribeSharedCount(setCount);
  }, [loading, isAdmin]);

  return count;
}
