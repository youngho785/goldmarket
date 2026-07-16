//src/firebase/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
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
  arrayUnion,
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
} catch {}

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
} catch {}
export { messaging };

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;
if (DEV && !VAPID_KEY) {
  console.warn("VITE_VAPID_KEY 가 설정되어 있지 않습니다.");
}

/** 서비스 워커 확보: /sw.js 전용 */
async function ensureFcmServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (reg) return reg;
  } catch {}

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (e) {
    if (DEV) console.warn("sw.js 등록 실패:", e);
    return null;
  }
}

/** FCM 등록 */
let registering = null;
export async function registerForPush(uid) {
  if (registering) return registering;
  registering = (async () => {
    try {
      if (!uid) return null;
      if (!(await isSupported())) return null;
      if (typeof window === "undefined" || !("Notification" in window)) return null;

      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return null;
      }
      if (Notification.permission === "denied") return null;

      const registration = await ensureFcmServiceWorker();
      if (!registration) return null;

      if (!messaging) {
        try {
          messaging = getMessaging(app);
        } catch {
          return null;
        }
      }
      if (!VAPID_KEY) {
        console.error("VAPID 키가 없습니다. .env(.local)에 VITE_VAPID_KEY 를 설정하세요.");
        return null;
      }

      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      if (!token) return null;

      const prev = localStorage.getItem("fcmToken");
      if (token !== prev) {
        localStorage.setItem("fcmToken", token);
        try {
          await setDoc(
            doc(db, "users", uid),
            { fcmTokens: arrayUnion(token) },
            { merge: true }
          );
        } catch (e) {
          if (DEV) console.warn("FCM 토큰 Firestore 저장 실패:", e?.message || e);
        }
      }
      return token;
    } catch (err) {
      console.error("❌ FCM 등록 오류:", err);
      return null;
    } finally {
      registering = null;
    }
  })();
  return registering;
}

/** 포그라운드 메시지 수신 */
export function onPushMessage(cb) {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    if (DEV) console.log("🔔 포그라운드 메시지:", payload);
    cb?.(payload);
  });
}

/** 푸시 등록 해제 */
export async function unregisterPush(uid) {
  if (!messaging) return;
  try {
    const registration = await ensureFcmServiceWorker();
    if (!registration) return;
    const ok = await deleteToken(messaging, {
      serviceWorkerRegistration: registration,
    });
    const prev = localStorage.getItem("fcmToken");
    if (ok && prev) {
      localStorage.removeItem("fcmToken");
      if (uid) {
        await setDoc(
          doc(db, "users", uid),
          { fcmTokens: arrayRemove(prev) },
          { merge: true }
        );
      }
    }
  } catch (e) {
    if (DEV) console.warn("FCM 토큰 삭제 실패:", e);
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

/** ✅ 채팅 읽음 처리 — Functions 이름과 동일하게 호출 */
async function _callMarkChatAsReadImpl(chatId) {
  if (!chatId) return null;
  const fn = httpsCallable(functions, "markChatAsRead");
  try {
    const res = await fn({ chatId });
    return res?.data ?? null;
  } catch (e) {
    if (DEV) console.warn("[callMarkChatAsRead] failed:", e?.message || e);
    return null;
  }
}

/** 주 함수(대문자 M): 기존 코드 호환 */
export async function callMarkChatAsRead(chatId) {
  return _callMarkChatAsReadImpl(chatId);
}

/** 별칭(소문자 m): 최근 코드 호환 */
export async function callmarkChatAsRead(chatId) {
  return _callMarkChatAsReadImpl(chatId);
}

/** ✅ 계정 탈퇴(서버 정리) 요청 */
export async function callDeleteMyAccount() {
  const fn = httpsCallable(functions, "deleteMyAccount");
  const res = await fn({});
  return res?.data ?? null;
}

/* ────────────────────────────────────────────────────────────
 * Presence heartbeat (선택)
 * ──────────────────────────────────────────────────────────── */
let presenceTimer = null;

export async function startPresenceHeartbeat(uid) {
  stopPresenceHeartbeat();
  if (!uid) return;
  const ref = doc(db, "presence", uid);
  const tick = async () => {
    try {
      await setDoc(
        ref,
        { active: true, updatedAt: new Date() },
        { merge: true }
      );
    } catch {}
  };
  await tick();
  presenceTimer = setInterval(tick, 45_000);
  window.addEventListener("beforeunload", () => stopPresenceHeartbeat(true));
}

export function stopPresenceHeartbeat(inactive = false) {
  if (presenceTimer) {
    clearInterval(presenceTimer);
    presenceTimer = null;
  }
  if (inactive) {
    // 필요 시 active=false 같은 종료 마킹 추가 가능
  }
}

/* ────────────────────────────────────────────────────────────
 * 토큰 새로고침 실패 보호(선택)
 * ──────────────────────────────────────────────────────────── */
const AUTO_SIGNOUT_ON_REFRESH_FAIL = String(
  import.meta.env?.VITE_AUTO_SIGNOUT_ON_REFRESH_FAIL ?? "false"
)
  .trim()
  .toLowerCase() === "true";

if (AUTO_SIGNOUT_ON_REFRESH_FAIL && typeof window !== "undefined") {
  onIdTokenChanged(auth, async (user) => {
    if (!user) return;
    try {
      await user.getIdToken(true);
    } catch (e) {
      console.warn("[Firebase] Token refresh failed. Clearing local state…", e);
      try {
        await signOut(auth);
      } catch {}
      try {
        indexedDB && indexedDB.deleteDatabase("firebaseLocalStorageDb");
      } catch {}
      try {
        localStorage.removeItem("firebase:previous_websocket_failure");
      } catch {}
      try {
        sessionStorage.removeItem("firebase:previous_websocket_failure");
      } catch {}
    }
  });
}

// --- add at the bottom of src/firebase/firebase.js ---
export {
  collection, doc, getDoc, getDocs, query, where, updateDoc, setDoc, writeBatch, serverTimestamp
} from "firebase/firestore";
