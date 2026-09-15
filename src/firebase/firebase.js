// src/firebase/firebase.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onIdTokenChanged,
  signOut,
} from "firebase/auth";
import {
  initializeFirestore,
  doc,
  setDoc,
  arrayRemove,
} from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  deleteToken,
} from "firebase/messaging";
import { getFunctions, httpsCallable } from "firebase/functions";
import firebaseConfig from "./firebaseConfig.js";

/* ────────────────────────────────────────────────────────────
 * App init (모듈러 SDK만 사용)
 * ──────────────────────────────────────────────────────────── */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const APP_CHECK_SITE_KEY = String(
  import.meta.env?.VITE_FIREBASE_APPCHECK_SITE_KEY || ""
).trim();

const APP_CHECK_DEBUG_TOKEN = String(
  import.meta.env?.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN || ""
).trim();

export let appCheck = null;

if (typeof window !== "undefined" && APP_CHECK_SITE_KEY) {
  if (import.meta.env.DEV && APP_CHECK_DEBUG_TOKEN) {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN =
      APP_CHECK_DEBUG_TOKEN.toLowerCase() === "true"
        ? true
        : APP_CHECK_DEBUG_TOKEN;
  }

  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.warn("[Firebase] App Check initialization failed:", error);
  }
}

/* ────────────────────────────────────────────────────────────
 * Auth
 * ──────────────────────────────────────────────────────────── */
export const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
  ],
});

try {
  auth.languageCode = "ko";
} catch {
  // 비브라우저 환경에서는 언어 설정을 지원하지 않을 수 있습니다.
}

/* ────────────────────────────────────────────────────────────
 * Firestore
 * ──────────────────────────────────────────────────────────── */
const FORCE_LONG_POLLING =
  (import.meta.env?.VITE_FIRESTORE_FORCE_LONG_POLLING || "")
    .toLowerCase()
    .trim() === "true";

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  experimentalForceLongPolling: FORCE_LONG_POLLING,
});

/* ────────────────────────────────────────────────────────────
 * RTDB / Storage / Functions
 * ──────────────────────────────────────────────────────────── */
export const database = getDatabase(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-northeast3");

/* ────────────────────────────────────────────────────────────
 * Messaging (FCM)
 * ──────────────────────────────────────────────────────────── */
const DEV = !!import.meta.env.DEV;

let messaging = null;

try {
  messaging = getMessaging(app);
} catch {
  // 메시징 미지원 브라우저에서는 푸시 기능만 비활성화합니다.
}

export { messaging };

const VAPID_KEY = String(import.meta.env.VITE_VAPID_KEY || "").trim();

if (DEV && !VAPID_KEY) {
  console.warn("VITE_VAPID_KEY 가 설정되어 있지 않습니다.");
}

/**
 * 서비스 워커 확보
 * 한국골드마켓은 /sw.js 를 사용합니다.
 */
async function ensureFcmServiceWorker() {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");

    if (reg) {
      return reg;
    }
  } catch {
    // 기존 등록 조회 실패 시 아래에서 다시 등록합니다.
  }

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    return reg;
  } catch (error) {
    console.warn("[FCM] sw.js 등록 실패:", error);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────
 * FCM 등록
 * ──────────────────────────────────────────────────────────── */

/**
 * UID별 등록 작업을 관리합니다.
 *
 * 같은 회원에 대해 동시에 여러 등록 요청이 들어와도
 * 하나의 Promise만 사용합니다.
 */
const registeringByUid = new Map();

/**
 * 이미 발급된 FCM 토큰을 회원 문서에 연결합니다.
 *
 * Web Push / Native Push 공통 저장용입니다.
 * 토큰 발급 자체는 이 함수에서 하지 않습니다.
 */
function detectWebPushDeviceInfo() {
  if (typeof navigator === "undefined") {
    return {
      label: "현재 브라우저",
      browser: "현재 브라우저",
      platform: "알 수 없음",
    };
  }

  const ua = String(navigator.userAgent || "");
  const rawPlatform = String(
    navigator.userAgentData?.platform || navigator.platform || ""
  );

  let browser = "현재 브라우저";

  if (/SamsungBrowser/i.test(ua)) browser = "삼성인터넷";
  else if (/EdgA|EdgiOS|Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/CriOS|Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  let platform = rawPlatform || "알 수 없음";

  const isIPadDesktopMode =
    /Mac/i.test(rawPlatform) && Number(navigator.maxTouchPoints || 0) > 1;

  if (/Android/i.test(ua)) platform = "Android";
  else if (/iPad|iPhone|iPod/i.test(ua) || isIPadDesktopMode) {
    platform = "iOS/iPadOS";
  } else if (/Windows/i.test(rawPlatform) || /Windows/i.test(ua)) {
    platform = "Windows";
  } else if (/Mac/i.test(rawPlatform) || /Macintosh/i.test(ua)) {
    platform = "macOS";
  } else if (/Linux/i.test(rawPlatform) || /Linux/i.test(ua)) {
    platform = "Linux";
  }

  return {
    label:
      platform && platform !== "알 수 없음"
        ? `${browser} · ${platform}`
        : browser,
    browser,
    platform,
  };
}

/**
 * 이미 발급된 FCM 토큰을 회원 문서에 연결합니다.
 *
 * Web Push / Native Push 공통 저장용입니다.
 * 토큰 발급 자체는 이 함수에서 하지 않습니다.
 *
 * device 정보는 알림 발송에 사용하지 않고,
 * Firebase Console에서 어떤 브라우저/앱이 등록돼 있는지
 * 확인하기 위한 진단 메타데이터입니다.
 */
async function bindFcmTokenOwnership(
  uid,
  token,
  native = false,
  device = null
) {
  const targetUid = String(uid || "").trim();
  const normalizedToken = String(token || "").trim();

  if (!targetUid || !normalizedToken || auth.currentUser?.uid !== targetUid) {
    return null;
  }

  const deviceInfo =
    device && typeof device === "object"
      ? device
      : native
        ? {
            label: "한국골드마켓 앱",
            browser: "",
            platform: "Android",
          }
        : detectWebPushDeviceInfo();

  const fn = httpsCallable(functions, "bindPushToken");
  const response = await fn({
    token: normalizedToken,
    native: native === true,
    device: {
      label: String(deviceInfo?.label || "").trim(),
      browser: String(deviceInfo?.browser || "").trim(),
      platform: String(deviceInfo?.platform || "").trim(),
    },
  });

  return response?.data?.ok ? normalizedToken : null;
}

export async function saveFcmTokenForUser(uid, token) {
  try {
    return await bindFcmTokenOwnership(
      uid,
      token,
      false,
      detectWebPushDeviceInfo()
    );
  } catch (error) {
    console.error("❌ FCM 토큰 소유권 연결 실패:", error?.message || error);
    return null;
  }
}

/**
 * Android Native Push에서 발급된 FCM 토큰을 회원 문서에 연결합니다.
 *
 * fcmTokens:
 *   예약·교환 등 실제 푸시 발송 대상 전체 목록
 *
 * nativeFcmTokens:
 *   서버가 Android Native 토큰을 Web Push 토큰과 구분하기 위한 보조 목록
 *
 * 로그아웃만으로는 토큰을 제거하지 않으며, 다른 계정 로그인 시 서버가 토큰 소유권을 이전합니다.
 */
export async function saveNativeFcmTokenForUser(uid, token) {
  try {
    return await bindFcmTokenOwnership(uid, token, true, {
      label: "한국골드마켓 앱",
      browser: "",
      platform: "Android",
    });
  } catch (error) {
    console.error("❌ Native FCM 토큰 소유권 연결 실패:", error?.message || error);
    return null;
  }
}

/**
 * 특정 FCM 토큰을 회원 문서에서 제거합니다.
 *
 * Web / Native 공통 토큰 정리용입니다.
 * 실제 기기의 FCM 토큰 삭제는 각 플랫폼에서 별도로 처리합니다.
 */
export async function removeFcmTokenForUser(uid, token) {
  const targetUid = String(uid || "").trim();
  const normalizedToken = String(token || "").trim();

  if (!targetUid || !normalizedToken) {
    return false;
  }

  try {
    await setDoc(
      doc(db, "users", targetUid),
      {
        fcmTokens: arrayRemove(normalizedToken),
        nativeFcmTokens: arrayRemove(normalizedToken),
      },
      {
        merge: true,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "❌ FCM 토큰 Firestore 제거 실패:",
      error?.message || error
    );

    return false;
  }
}

/**
 * 현재 브라우저/기기의 FCM 토큰을 가져와
 * users/{uid}.fcmTokens 에 연결합니다.
 *
 * 중요:
 * localStorage에 같은 토큰이 이미 있어도 서버 callable을 매번 호출해
 * 현재 로그인 계정으로 토큰 소유권을 확인/이전합니다.
 * 따라서 같은 기기 토큰이 여러 회원에게 동시에 남는 문제를 방지합니다.
 */
export async function registerForPush(uid) {
  const targetUid = String(uid || "").trim();

  if (!targetUid) {
    return null;
  }

  if (registeringByUid.has(targetUid)) {
    return registeringByUid.get(targetUid);
  }

  const task = (async () => {
    try {
      const supported = await isSupported();

      if (!supported) {
        if (DEV) {
          console.warn(
            "[FCM] 현재 브라우저는 Firebase Messaging을 지원하지 않습니다."
          );
        }
        return null;
      }

      if (
        typeof window === "undefined" ||
        !("Notification" in window)
      ) {
        if (DEV) {
          console.warn("[FCM] Notification API를 사용할 수 없습니다.");
        }
        return null;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
          if (DEV) {
            console.warn(
              "[FCM] 알림 권한이 허용되지 않았습니다:",
              permission
            );
          }
          return null;
        }
      }

      if (Notification.permission === "denied") {
        if (DEV) {
          console.warn("[FCM] 알림 권한이 차단되어 있습니다.");
        }
        return null;
      }

      let registration = await ensureFcmServiceWorker();

      if (!registration) {
        console.warn("[FCM] 서비스 워커를 확보하지 못했습니다.");
        return null;
      }

      // 새로 등록한 서비스워커라면 active 상태가 될 때까지 기다립니다.
      // 기존 active 등록이 있으면 즉시 resolve됩니다.
      try {
        registration =
          (await navigator.serviceWorker.ready) || registration;
      } catch {
        // ready 확인 실패 시 확보한 registration으로 계속 시도합니다.
      }

      if (!messaging) {
        try {
          messaging = getMessaging(app);
        } catch (error) {
          console.warn(
            "[FCM] Firebase Messaging 초기화 실패:",
            error
          );
          return null;
        }
      }

      if (!VAPID_KEY) {
        console.error(
          "[FCM] VAPID 키가 없습니다. .env.local의 VITE_VAPID_KEY를 확인하세요."
        );
        return null;
      }

      /*
       * 현재 브라우저/기기의 FCM 등록 토큰을 가져옵니다.
       */
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!token) {
        console.warn("[FCM] 등록 토큰을 가져오지 못했습니다.");
        return null;
      }

      /*
       * 핵심 수정:
       *
       * 기존에는 로컬 토큰이 달라진 경우에만
       * Firestore 저장을 실행했습니다.
       *
       * 수정 후:
       *   localStorage 값과 관계없이 서버에 현재 토큰을 다시 등록합니다.
       *   다른 계정에 같은 토큰이 남아 있으면 서버가 제거한 뒤 현재 계정에 연결합니다.
       */
      try {
        const bound = await bindFcmTokenOwnership(
          targetUid,
          token,
          false,
          detectWebPushDeviceInfo()
        );
        if (!bound) return null;
      } catch (error) {
        console.error(
          "❌ FCM 토큰 소유권 연결 실패:",
          error?.message || error
        );
        return null;
      }

      /*
       * Firestore 저장에 성공한 뒤 로컬 기록을 갱신합니다.
       */
      try {
        localStorage.setItem("fcmToken", token);
        localStorage.setItem("fcmTokenUid", targetUid);
        localStorage.setItem(
          "fcmTokenRegisteredAt",
          new Date().toISOString()
        );
      } catch (error) {
        if (DEV) {
          console.warn(
            "[FCM] localStorage 저장 실패:",
            error?.message || error
          );
        }
      }

      if (DEV) {
        console.log("✅ FCM 등록 완료:", {
          uid: targetUid,
          token:
            token.length > 16
              ? `${token.slice(0, 16)}...`
              : token,
        });
      }

      return token;
    } catch (error) {
      console.error("❌ FCM 등록 오류:", error);
      return null;
    }
  })();

  registeringByUid.set(targetUid, task);

  try {
    return await task;
  } finally {
    registeringByUid.delete(targetUid);
  }
}

/* ────────────────────────────────────────────────────────────
 * 포그라운드 메시지 수신
 * ──────────────────────────────────────────────────────────── */
export function onPushMessage(cb) {
  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    if (DEV) {
      console.log("🔔 포그라운드 메시지:", payload);
    }

    cb?.(payload);
  });
}

/**
 * 포그라운드 FCM도 휴대폰/브라우저의 시스템 알림으로 표시합니다.
 *
 * 백그라운드 메시지는 public/sw.js의 onBackgroundMessage가 처리하고,
 * 페이지가 현재 활성 상태인 메시지만 이 함수가 처리합니다.
 *
 * true  = 시스템 알림 표시 성공
 * false = 표시 불가/실패 -> 기존 화면 토스트를 폴백으로 사용할 수 있음
 */
export async function showForegroundPushNotification(payload) {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    window.Notification.permission !== "granted"
  ) {
    return false;
  }

  try {
    let registration = await ensureFcmServiceWorker();

    if (!registration) {
      return false;
    }

    try {
      registration =
        (await navigator.serviceWorker.ready) || registration;
    } catch {
      // 확보한 registration으로 계속 진행합니다.
    }

    if (
      !registration ||
      typeof registration.showNotification !== "function"
    ) {
      return false;
    }

    const notification = payload?.notification || {};
    const data = payload?.data || {};

    const title = String(
      data.title ||
      notification.title ||
      "알림"
    );

    const body = String(
      data.body ||
      notification.body ||
      ""
    );

    const chatId =
      data.chatId || null;

    const rawLink =
      data.link ||
      data.url ||
      (chatId ? `/chat/${chatId}` : "/");

    const absoluteLink =
      new URL(
        rawLink,
        window.location.origin
      ).href;

    const options = {
      body,
      // 알림 본문에 보이는 큰 아이콘
      icon: "/icons/notification-gold-bell-96.png",
      // Android 상단 상태바에 쓰이는 작은 단색 아이콘
      badge: "/icons/notification-bell-badge-icon-96.png",
      data: {
        ...data,
        link: absoluteLink,
        url: absoluteLink,
      },
      timestamp: Date.now(),
    };

    // renotify:true는 tag가 반드시 있어야 하므로 채팅 알림에만 함께 적용합니다.
    if (chatId) {
      options.tag = `chat-${chatId}`;
      options.renotify = true;
    }

    await registration.showNotification(
      title,
      options
    );

    return true;
  } catch (error) {
    console.error(
      "[FCM] 포그라운드 시스템 알림 표시 오류:",
      error
    );
    return false;
  }
}

/* ────────────────────────────────────────────────────────────
 * 푸시 등록 해제
 * ──────────────────────────────────────────────────────────── */
export async function unregisterPush(uid) {
  if (!messaging) {
    return;
  }

  const targetUid = String(uid || "").trim();

  let previousToken = "";

  try {
    previousToken = localStorage.getItem("fcmToken") || "";
  } catch {
    previousToken = "";
  }

  try {
    /*
     * Firebase Messaging의 현재 등록 토큰/구독을 삭제합니다.
     */
    const ok = await deleteToken(messaging);

    if (!ok) {
      return;
    }

    /*
     * Firestore에 저장된 기존 토큰도 제거합니다.
     */
    if (targetUid && previousToken) {
      try {
        await setDoc(
          doc(db, "users", targetUid),
          {
            fcmTokens: arrayRemove(previousToken),
          },
          {
            merge: true,
          }
        );
      } catch (error) {
        if (DEV) {
          console.warn(
            "[FCM] Firestore 토큰 제거 실패:",
            error?.message || error
          );
        }
      }
    }

    /*
     * 로컬 토큰 정보 제거
     */
    try {
      localStorage.removeItem("fcmToken");
      localStorage.removeItem("fcmTokenUid");
      localStorage.removeItem("fcmTokenRegisteredAt");
    } catch {
      // localStorage 접근 제한은 무시합니다.
    }
  } catch (error) {
    if (DEV) {
      console.warn("[FCM] 토큰 삭제 실패:", error);
    }
  }
}

/* ────────────────────────────────────────────────────────────
 * Callable helpers
 * ──────────────────────────────────────────────────────────── */

/** 관리자: 예약 슬롯 해제 */
export async function callReleaseReservedSlot(dateKey, time) {
  const fn = httpsCallable(functions, "releaseReservedSlot");
  const res = await fn({ dateKey, time });
  return res?.data ?? null;
}

/** 최고 관리자: Firebase Auth 관리자 역할 부여/해제 */
export async function callSetUserRole(uid, role) {
  if (!uid || !["user", "admin"].includes(role)) {
    throw new Error("사용자와 역할을 확인해 주세요.");
  }

  const fn = httpsCallable(functions, "setUserRole");
  const res = await fn({ uid, role });

  return res?.data ?? null;
}

/** 계정 탈퇴(서버 정리) 요청 */
export async function callDeleteMyAccount() {
  const fn = httpsCallable(functions, "deleteMyAccount");
  const res = await fn({});

  return res?.data ?? null;
}

/** 관리자: 금시세 가격 설정 저장 */
export async function callSaveGoldPriceSettings(settings) {
  const fn = httpsCallable(functions, "saveGoldPriceSettings");
  const res = await fn({ settings });

  return res?.data ?? null;
}

/** 관리자: 공공데이터포털 KRX 확정시세 즉시 조회 */
export async function callRefreshGoldPriceNow() {
  const fn = httpsCallable(functions, "refreshGoldPriceNow");
  const res = await fn({});

  return res?.data ?? null;
}

/** 관리자: 대기 중인 계산 시세를 홈페이지에 공개 */
export async function callPublishPendingGoldPrice() {
  const fn = httpsCallable(functions, "publishPendingGoldPrice");
  const res = await fn({});

  return res?.data ?? null;
}

/* ────────────────────────────────────────────────────────────
 * 토큰 새로고침 실패 보호(선택)
 * ──────────────────────────────────────────────────────────── */
const AUTO_SIGNOUT_ON_REFRESH_FAIL = String(
  import.meta.env?.VITE_AUTO_SIGNOUT_ON_REFRESH_FAIL ?? "false"
)
  .trim()
  .toLowerCase() === "true";

if (
  AUTO_SIGNOUT_ON_REFRESH_FAIL &&
  typeof window !== "undefined"
) {
  onIdTokenChanged(auth, async (user) => {
    if (!user) {
      return;
    }

    try {
      await user.getIdToken(true);
    } catch (error) {
      console.warn(
        "[Firebase] Token refresh failed. Clearing local state…",
        error
      );

      try {
        await signOut(auth);
      } catch {
        // 로그아웃 실패와 관계없이 로컬 인증 상태 정리를 계속합니다.
      }

      try {
        indexedDB &&
          indexedDB.deleteDatabase("firebaseLocalStorageDb");
      } catch {
        // IndexedDB 미지원 또는 잠금 상태는 무시합니다.
      }

      try {
        localStorage.removeItem(
          "firebase:previous_websocket_failure"
        );
      } catch {
        // localStorage 접근 제한은 무시합니다.
      }

      try {
        sessionStorage.removeItem(
          "firebase:previous_websocket_failure"
        );
      } catch {
        // sessionStorage 접근 제한은 무시합니다.
      }
    }
  });
}

/* ────────────────────────────────────────────────────────────
 * Firestore re-exports
 * ──────────────────────────────────────────────────────────── */
export {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";