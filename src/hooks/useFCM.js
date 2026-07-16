// src/hooks/useFCM.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { registerForPush, onPushMessage } from '../firebase/firebase';

/** 런타임 환경 가드 */
const hasWindow = typeof window !== 'undefined';
const hasNavigator = typeof navigator !== 'undefined';
const hasNotification = hasWindow && 'Notification' in window;
const hasSW = hasNavigator && 'serviceWorker' in navigator;

/** 권한이 허용(granted)인지 */
function isGranted() {
  if (!hasNotification) return false;
  try {
    return window.Notification.permission === 'granted';
  } catch {
    return false;
  }
}

/** (옵션) Permissions API 지원 여부 */
function getPermissionsQuery() {
  try {
    if (!hasNavigator || !('permissions' in navigator)) return null;
    // @ts-ignore
    return navigator.permissions.query({ name: 'notifications' });
  } catch {
    return null;
  }
}

/** SW ready를 기다리되, 타임아웃 방어 */
async function waitServiceWorkerReady(timeoutMs = 10000) {
  if (!hasSW) return null;
  try {
    const readyPromise =
      (hasWindow && window.__swReadyPromise) ||
      navigator.serviceWorker.ready;

    if (!readyPromise) return null;

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SW ready timeout')), timeoutMs)
    );
    // race
    return await Promise.race([readyPromise, timeout]);
  } catch {
    return null;
  }
}

export default function useFCM() {
  const { user } = useAuthContext();
  const [fcmToken, setFcmToken] = useState(null);
  const [message, setMessage] = useState(null);

  const initUidRef = useRef(null); // 같은 uid로 중복 초기화 방지
  const unsubRef = useRef(null);   // 포그라운드 리스너 해제용
  const tryingRef = useRef(false); // 동시 중복 등록 방지

  /** 현재 환경에서 FCM을 시도할 수 있는지 (필수 조건만 체크) */
  const canTryFCM = () => hasNotification && hasSW;

  /** 실제 등록 시도 로직 */
  const tryRegister = useCallback(async (uid) => {
    if (!uid) return;
    if (!canTryFCM()) return;                 // 브라우저 미지원 시 패스
    if (!isGranted()) return;                 // 권한 없는 경우 패스 (Prompt에서 허용 후 재시도)

    if (tryingRef.current) return;            // 이미 진행 중
    tryingRef.current = true;

    try {
      const ready = await waitServiceWorkerReady(12000);
      if (!ready) {
        console.warn('Service Worker not ready; skip FCM register (timeout)');
        return;
      }

      const t = await registerForPush(uid);   // 내부에서 getToken
      if (t) setFcmToken(t);
    } catch (e) {
      console.error('FCM 등록 오류:', e);
    } finally {
      tryingRef.current = false;
    }
  }, []);

  // 1) uid 기준 1회 초기화 (권한 허용 상태에서만 등록)
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;

    // uid 변경 시 포그라운드 리스너도 새로 세팅하기 위해 해제
    if (initUidRef.current && initUidRef.current !== uid) {
      try {
        if (unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }
      } catch {}
      setFcmToken(null);
      setMessage(null);
    }

    if (initUidRef.current === uid) {
      // 이미 초기화한 uid — 다만 권한이 새로 허용되었을 수 있으니 재시도 한 번
      tryRegister(uid);
      return;
    }

    initUidRef.current = uid;
    tryRegister(uid);
  }, [user?.uid, tryRegister]);

  // 2) 포그라운드 메시지 리스너: 1번만 구독 (uid 기준)
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    if (!canTryFCM()) return;

    if (unsubRef.current) return; // 이미 구독 중

    try {
      unsubRef.current = onPushMessage((payload) => {
        setMessage(payload);
        // 전역 컨텍스트/배지 즉시 재집계 트리거
        try {
          if (hasWindow) {
            window.dispatchEvent(
              new CustomEvent('APP_PUSH_MESSAGE', { detail: payload?.data || {} })
            );
          }
        } catch {}
      });
    } catch (e) {
      console.warn('onPushMessage 구독 실패:', e);
    }

    return () => {
      try {
        if (unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }
      } catch {}
    };
  }, [user?.uid]);

  // 3) 권한 상태 변화 감지 -> 허용되면 즉시 등록
  useEffect(() => {
    if (!canTryFCM()) return;
    const uid = user?.uid;
    if (!uid) return;

    // Permissions API가 있을 때만 사용
    let permStatus = null;
    let mounted = true;

    (async () => {
      try {
        permStatus = await getPermissionsQuery();
        if (!mounted || !permStatus) return;

        // 최초 상태 확인 후 허용이면 재시도
        if (permStatus.state === 'granted') {
          tryRegister(uid);
        }

        // 권한 변화 감지
        const onChange = () => {
          if (!mounted) return;
          if (permStatus.state === 'granted') {
            tryRegister(uid);
          }
        };
        permStatus.addEventListener?.('change', onChange);

        // 정리
        return () => permStatus?.removeEventListener?.('change', onChange);
      } catch {
        // Permissions API 미지원/예외 -> 무시
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.uid, tryRegister]);

  // 4) 온라인/탭복귀 시 한 번 더 등록 재시도 (토큰 만료/등록 실패 보완)
  useEffect(() => {
    if (!canTryFCM()) return;
    const uid = user?.uid;
    if (!uid) return;

    const onOnline = () => tryRegister(uid);
    const onVisible = () => {
      try {
        if (document.visibilityState === 'visible') tryRegister(uid);
      } catch {}
    };

    try {
      window.addEventListener('online', onOnline);
      document.addEventListener('visibilitychange', onVisible);
    } catch {}

    return () => {
      try {
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisible);
      } catch {}
    };
  }, [user?.uid, tryRegister]);

  // 5) PushPermissionPrompt와 연동하고 싶다면(선택):
  //    권한 허용 직후 아래 커스텀 이벤트를 쏘도록 하고, 여기서도 재시도 가능.
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;

    const onGranted = () => tryRegister(uid);
    try {
      window.addEventListener('PUSH_PERMISSION_GRANTED', onGranted);
    } catch {}

    return () => {
      try {
        window.removeEventListener('PUSH_PERMISSION_GRANTED', onGranted);
      } catch {}
    };
  }, [user?.uid, tryRegister]);

  const clearMessage = useCallback(() => setMessage(null), []);
  return { fcmToken, message, clearMessage };
}
