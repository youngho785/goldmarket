// src/hooks/useFCM.js

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

import { useAuthContext } from "@/context/AuthContext";

import {
  registerForPush,
  onPushMessage,
  showForegroundPushNotification,
} from "@/firebase/firebase";


/* ────────────────────────────────────────────────────────────
 * 브라우저 환경 확인
 * ──────────────────────────────────────────────────────────── */

const hasWindow =
  typeof window !== "undefined";

const hasNavigator =
  typeof navigator !== "undefined";

const hasNotification =
  hasWindow &&
  "Notification" in window;

const hasSW =
  hasNavigator &&
  "serviceWorker" in navigator;


/* ────────────────────────────────────────────────────────────
 * 알림 권한 확인
 * ──────────────────────────────────────────────────────────── */

function isGranted() {
  try {
    return (
      hasNotification &&
      window.Notification.permission === "granted"
    );
  } catch {
    return false;
  }
}


/* ────────────────────────────────────────────────────────────
 * FCM Hook
 * ──────────────────────────────────────────────────────────── */

export default function useFCM() {
  const { user } =
    useAuthContext();

  const uid =
    user?.uid || "";


  const [fcmToken, setFcmToken] =
    useState(null);

  const [message, setMessage] =
    useState(null);


  /*
   * 현재 포그라운드 메시지 리스너가
   * 어느 UID에 연결되어 있는지 확인
   */
  const listenerUidRef =
    useRef("");


  /*
   * onMessage unsubscribe 함수
   */
  const unsubRef =
    useRef(null);


  /*
   * 동시에 여러 FCM 등록 요청이
   * 발생하는 것을 방지
   */
  const tryingRef =
    useRef(false);


  /*
   * 너무 짧은 시간에
   * 동일 등록 요청이 반복되는 것 방지
   */
  const lastSuccessRef =
    useRef({
      uid: "",
      at: 0,
    });


  /* ──────────────────────────────────────────────────────────
   * FCM 사용 가능 환경 확인
   * ────────────────────────────────────────────────────────── */

  const canTryFCM =
    useCallback(() => {
      return (
        hasNotification &&
        hasSW
      );
    }, []);


  /* ──────────────────────────────────────────────────────────
   * 실제 FCM 등록
   * ────────────────────────────────────────────────────────── */

  const tryRegister =
    useCallback(
      async (
        targetUid,
        {
          force = false,
        } = {}
      ) => {
        const normalizedUid =
          String(
            targetUid || ""
          ).trim();


        if (!normalizedUid) {
          return null;
        }


        /*
         * 브라우저에서
         * Notification / Service Worker를
         * 지원하지 않는 경우
         */
        if (!canTryFCM()) {
          console.warn(
            "[FCM] 이 브라우저에서는 푸시 알림을 사용할 수 없습니다."
          );

          return null;
        }


        /*
         * 알림 권한이 없으면
         * 여기서는 자동으로 권한창을 띄우지 않습니다.
         *
         * Profile / PushPermissionPrompt에서
         * 사용자가 직접 허용한 뒤
         * PUSH_PERMISSION_GRANTED 이벤트로
         * 다시 들어오게 됩니다.
         */
        if (!isGranted()) {
          return null;
        }


        /*
         * 이미 등록 작업 중이면
         * 중복 실행하지 않습니다.
         */
        if (tryingRef.current) {
          return null;
        }


        /*
         * 등록 성공 직후 여러 이벤트가
         * 연속으로 발생하는 경우
         * 불필요한 Firestore write를 줄입니다.
         *
         * force=true인 경우에는 무시하고 실행합니다.
         */
        const now =
          Date.now();

        const lastSuccess =
          lastSuccessRef.current;

        if (
          !force &&
          lastSuccess.uid ===
            normalizedUid &&
          now - lastSuccess.at <
            15000
        ) {
          return fcmToken;
        }


        tryingRef.current = true;


        try {
          /*
           * firebase.js의 registerForPush 실행
           *
           * registerForPush 내부에서 /sw.js를 직접 확인/등록하므로
           * 여기서 navigator.serviceWorker.ready를 먼저 기다리지 않습니다.
           * 처음 방문한 기기에서도 서비스워커 등록 기회를 보장합니다.
           *
           * 여기서:
           *
           * 1. getToken()
           * 2. users/{uid}/fcmTokens
           * 3. arrayUnion(token)
           *
           * 이 실행됩니다.
           */
          const token =
            await registerForPush(
              normalizedUid
            );


          if (!token) {
            console.warn(
              "[FCM] FCM 토큰 등록에 실패했습니다."
            );

            return null;
          }


          setFcmToken(token);


          lastSuccessRef.current = {
            uid: normalizedUid,
            at: Date.now(),
          };


          return token;

        } catch (error) {
          console.error(
            "[FCM] 등록 오류:",
            error
          );

          return null;

        } finally {
          tryingRef.current = false;
        }
      },
      [
        canTryFCM,
        fcmToken,
      ]
    );


  /* ──────────────────────────────────────────────────────────
   * 로그인 회원 변경 시 자동 등록
   * ────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!uid) {
      setFcmToken(null);
      setMessage(null);

      listenerUidRef.current =
        "";

      lastSuccessRef.current = {
        uid: "",
        at: 0,
      };

      return;
    }


    /*
     * 로그인된 회원이 확인되면
     * FCM 등록을 바로 시도합니다.
     *
     * firebase.js에서
     * 기존 localStorage 토큰과 같더라도
     * Firestore에 다시 arrayUnion 하므로
     *
     * 기존 회원 토큰 복구가 여기서 이루어집니다.
     */
    tryRegister(
      uid,
      {
        force: true,
      }
    );

  }, [
    uid,
    tryRegister,
  ]);


  /* ──────────────────────────────────────────────────────────
   * 포그라운드 메시지 리스너
   * ────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (
      !uid ||
      !canTryFCM()
    ) {
      return undefined;
    }


    /*
     * 로그인 계정이 바뀐 경우
     * 기존 메시지 리스너 제거
     */
    if (
      listenerUidRef.current !==
      uid
    ) {
      try {
        unsubRef.current?.();
      } catch {
        // 기존 리스너 정리 실패는 무시
      }

      unsubRef.current =
        null;

      listenerUidRef.current =
        uid;
    }


    /*
     * 현재 리스너가 없으면
     * 포그라운드 FCM 수신 시작
     */
    if (!unsubRef.current) {
      unsubRef.current =
        onPushMessage(
          async (payload) => {
            /*
             * 포그라운드에서도 휴대폰 상단 시스템 알림을 표시합니다.
             *
             * 백그라운드/화면 꺼짐:
             *   public/sw.js -> onBackgroundMessage -> showNotification()
             *
             * 현재 화면 활성:
             *   여기 onMessage -> showForegroundPushNotification()
             *
             * 시스템 알림 표시가 성공하면 기존 화면 토스트는 중복 방지를 위해
             * preferBadge=true로 전달하여 FCMNotifications가 억제합니다.
             * 시스템 알림 표시가 실패한 환경에서는 기존 토스트가 폴백으로 남습니다.
             */
            let systemNotificationShown = false;

            try {
              systemNotificationShown =
                await showForegroundPushNotification(payload);
            } catch (error) {
              console.warn(
                "[FCM] 포그라운드 시스템 알림 표시 실패:",
                error
              );
            }

            const nextPayload =
              systemNotificationShown
                ? {
                    ...payload,
                    data: {
                      ...(payload?.data || {}),
                      preferBadge: "true",
                    },
                  }
                : payload;

            setMessage(nextPayload);

            try {
              window.dispatchEvent(
                new CustomEvent(
                  "APP_PUSH_MESSAGE",
                  {
                    detail:
                      payload?.data ||
                      {},
                  }
                )
              );
            } catch {
              // CustomEvent 미지원 환경 무시
            }
          }
        );
    }


    return () => {
      try {
        unsubRef.current?.();
      } catch {
        // 정리 오류 무시
      }

      unsubRef.current =
        null;

      listenerUidRef.current =
        "";
    };

  }, [
    canTryFCM,
    uid,
  ]);


  /* ──────────────────────────────────────────────────────────
   * 사이트 복귀 / 온라인 복귀 시 자동 복구
   * ────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (
      !uid ||
      !canTryFCM()
    ) {
      return undefined;
    }


    /*
     * 인터넷 연결 복구
     */
    const onOnline = () => {
      tryRegister(uid);
    };


    /*
     * 백그라운드 →
     * 다시 화면으로 복귀
     */
    const onVisible = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        tryRegister(uid);
      }
    };


    /*
     * 브라우저 / PWA 창이
     * 다시 활성화될 때
     */
    const onFocus = () => {
      tryRegister(uid);
    };


    /*
     * BFCache 등을 통해 페이지가
     * 다시 나타난 경우
     */
    const onPageShow = () => {
      tryRegister(uid);
    };


    /*
     * 사용자가 알림 권한을
     * 방금 허용한 경우
     */
    const onPermissionGranted =
      () => {
        tryRegister(
          uid,
          {
            force: true,
          }
        );
      };


    /*
     * 서비스 워커에서
     * Push subscription 변경 감지
     */
    const onSubscriptionChanged =
      () => {
        tryRegister(
          uid,
          {
            force: true,
          }
        );
      };


    window.addEventListener(
      "online",
      onOnline
    );

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    window.addEventListener(
      "focus",
      onFocus
    );

    window.addEventListener(
      "pageshow",
      onPageShow
    );

    window.addEventListener(
      "PUSH_PERMISSION_GRANTED",
      onPermissionGranted
    );

    window.addEventListener(
      "PUSH_SUBSCRIPTION_CHANGED",
      onSubscriptionChanged
    );


    return () => {
      window.removeEventListener(
        "online",
        onOnline
      );

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );

      window.removeEventListener(
        "focus",
        onFocus
      );

      window.removeEventListener(
        "pageshow",
        onPageShow
      );

      window.removeEventListener(
        "PUSH_PERMISSION_GRANTED",
        onPermissionGranted
      );

      window.removeEventListener(
        "PUSH_SUBSCRIPTION_CHANGED",
        onSubscriptionChanged
      );
    };

  }, [
    canTryFCM,
    tryRegister,
    uid,
  ]);


  /* ──────────────────────────────────────────────────────────
   * 메시지 초기화
   * ────────────────────────────────────────────────────────── */

  const clearMessage =
    useCallback(
      () => {
        setMessage(null);
      },
      []
    );


  return {
    fcmToken,
    message,
    clearMessage,
  };
}