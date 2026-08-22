// src/services/pushDiagnostics.js
import { doc, getDoc } from "firebase/firestore";
import { isSupported as isMessagingSupported } from "firebase/messaging";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase/firebase";

function detectPlatform() {
  if (typeof navigator === "undefined") return "알 수 없음";

  const ua = String(navigator.userAgent || "");
  const platform = String(
    navigator.userAgentData?.platform || navigator.platform || ""
  );
  const isIPadDesktopMode =
    /Mac/i.test(platform) && Number(navigator.maxTouchPoints || 0) > 1;

  if (/iPad|iPhone|iPod/i.test(ua) || isIPadDesktopMode) return "iOS/iPadOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(platform) || /Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return "macOS";
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "Linux";

  return platform || "알 수 없음";
}

function detectIOS() {
  return detectPlatform() === "iOS/iPadOS";
}

function detectStandalone() {
  if (typeof window === "undefined") return false;

  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)");

  return (
    standaloneMedia?.matches === true ||
    window.navigator.standalone === true
  );
}

function readStoredPushState(uid) {
  const targetUid = String(uid || "");

  if (typeof window === "undefined") {
    return {
      token: "",
      tokenPresent: false,
      tokenMatchesUser: false,
      registeredAt: "",
    };
  }

  try {
    const token = window.localStorage.getItem("fcmToken") || "";
    const tokenUid = window.localStorage.getItem("fcmTokenUid") || "";
    const registeredAt =
      window.localStorage.getItem("fcmTokenRegisteredAt") || "";

    const tokenPresent = token.length > 20;

    return {
      token,
      tokenPresent,
      tokenMatchesUser: tokenPresent && tokenUid === targetUid,
      registeredAt,
    };
  } catch {
    return {
      token: "",
      tokenPresent: false,
      tokenMatchesUser: false,
      registeredAt: "",
    };
  }
}

async function checkFirestorePushRegistration(uid, token) {
  const targetUid = String(uid || "").trim();
  const normalizedToken = String(token || "").trim();

  if (!targetUid || normalizedToken.length <= 20) {
    return {
      checked: false,
      registered: false,
      userDocumentExists: false,
      error: "",
    };
  }

  try {
    const snap = await getDoc(doc(db, "users", targetUid));

    if (!snap.exists()) {
      return {
        checked: true,
        registered: false,
        userDocumentExists: false,
        error: "",
      };
    }

    const data = snap.data() || {};
    const registeredTokens = Array.isArray(data.fcmTokens)
      ? data.fcmTokens.filter(
          (value) => typeof value === "string" && value.length > 0
        )
      : [];

    return {
      checked: true,
      registered: registeredTokens.includes(normalizedToken),
      userDocumentExists: true,
      error: "",
    };
  } catch (error) {
    return {
      checked: false,
      registered: false,
      userDocumentExists: false,
      error:
        error?.message ||
        "Firestore의 FCM 등록 상태를 확인하지 못했습니다.",
    };
  }
}

export async function collectPushDiagnostics(uid) {
  const targetUid = String(uid || "").trim();

  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";

  const secureContext = hasWindow && window.isSecureContext === true;
  const notificationSupported = hasWindow && "Notification" in window;
  const serviceWorkerSupported =
    hasNavigator && "serviceWorker" in navigator;

  let registration = null;

  if (serviceWorkerSupported) {
    try {
      registration = await navigator.serviceWorker.getRegistration();
    } catch {
      registration = null;
    }
  }

  const pushManagerSupported = registration
    ? "pushManager" in registration
    : hasWindow && "PushManager" in window;

  let messagingSupported = false;

  try {
    messagingSupported = await isMessagingSupported();
  } catch {
    messagingSupported = false;
  }

  const serviceWorkerState =
    registration?.active?.state ||
    registration?.waiting?.state ||
    registration?.installing?.state ||
    "missing";

  const stored = readStoredPushState(targetUid);

  const firestoreRegistration = await checkFirestorePushRegistration(
    targetUid,
    stored.token
  );

  const tokenRegistrationHealthy =
    stored.tokenPresent &&
    stored.tokenMatchesUser &&
    firestoreRegistration.checked &&
    firestoreRegistration.registered;

  return {
    checkedAt: new Date().toISOString(),

    platform: detectPlatform(),
    isIOS: detectIOS(),
    standalone: detectStandalone(),

    secureContext,
    notificationSupported,
    notificationPermission: notificationSupported
      ? window.Notification.permission || "default"
      : "unsupported",

    serviceWorkerSupported,
    serviceWorkerState,
    serviceWorkerReady: serviceWorkerState === "activated",
    pushManagerSupported,
    messagingSupported,

    tokenPresent: stored.tokenPresent,
    tokenMatchesUser: stored.tokenMatchesUser,
    registeredAt: stored.registeredAt,

    firestoreRegistrationChecked: firestoreRegistration.checked,
    firestoreTokenRegistered: firestoreRegistration.registered,
    firestoreUserDocumentExists: firestoreRegistration.userDocumentExists,
    firestoreRegistrationError: firestoreRegistration.error,

    tokenRegistrationHealthy,
  };
}

function normalizeCallableError(error) {
  const rawCode = String(error?.code || "");
  const code = rawCode.startsWith("functions/")
    ? rawCode.slice("functions/".length)
    : rawCode;

  const detailsMessage =
    typeof error?.details === "string"
      ? error.details
      : typeof error?.details?.message === "string"
        ? error.details.message
        : "";

  const message =
    detailsMessage ||
    String(error?.message || "").replace(/^FirebaseError:\s*/i, "") ||
    "시험 알림을 보내지 못했습니다.";

  const normalized = new Error(message);
  normalized.code = code;
  normalized.details = error?.details;

  return normalized;
}

export async function sendCurrentDevicePushTest(token) {
  const normalizedToken = String(token || "").trim();

  if (normalizedToken.length < 20) {
    throw new Error("현재 기기의 푸시 토큰이 등록되지 않았습니다.");
  }

  try {
    const callable = httpsCallable(
      functions,
      "sendPushTestNotification"
    );

    const result = await callable({
      token: normalizedToken,
    });

    return result?.data ?? null;
  } catch (error) {
    throw normalizeCallableError(error);
  }
}