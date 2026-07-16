// src/hooks/useSellerProfile.js
import { useEffect, useState, useCallback } from "react";
import { getUserProfile } from "../services/userService";

// 간단한 메모리 캐시 (페이지 새로고침 시 초기화됨)
const cache = new Map();

/** 외부에서 캐시 비우고 싶을 때 사용 */
export function invalidateSellerProfileCache(uid) {
  if (uid) cache.delete(uid);
}

/** 외부에서 미리 캐시 주입(옵티미스틱 업데이트 등에 유용) */
export function primeSellerProfileCache(uid, data) {
  if (uid && data) cache.set(uid, data);
}

/**
 * 판매자 프로필 조회 훅
 * - 첫 조회 후 메모리 캐시에 저장
 * - uid가 바뀌면 자동 재조회
 * - 반환: { profile, loading, error, refresh }
 */
export default function useSellerProfile(uid) {
  // uid가 있으면 캐시 확인
  const initial = uid ? cache.get(uid) || null : null;

  const [profile, setProfile] = useState(initial);
  const [loading, setLoading] = useState(!!uid && !initial);
  const [error, setError] = useState(null);

  // 강제 재조회 함수
  const refresh = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = await getUserProfile(uid);
      if (p) cache.set(uid, p);
      setProfile(p || null);
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // uid 변경에 반응하여 최초 로드
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const cached = cache.get(uid);
    if (cached) {
      setProfile(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getUserProfile(uid);
        if (cancelled) return;
        if (p) cache.set(uid, p);
        setProfile(p || null);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  return { profile, loading, error, refresh };
}
