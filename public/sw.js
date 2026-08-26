// public/sw.js
/* eslint-disable no-undef */

self.addEventListener("message", (event) => {
  try {
    if (event?.data === "SKIP_WAITING") self.skipWaiting();
    if (event?.data === "CLEAR_BADGE") {
      self.navigator?.clearAppBadge?.();
      self.registration?.clearAppBadge?.();
    }
  } catch {}
});

self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);

async function broadcastToClients(type, data) {
  try {
    const clientList = await clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    for (const client of clientList) {
      client.postMessage({ type, data });
    }
  } catch {}
}

function badgeSupport() {
  const hasNavigator =
    typeof self.navigator?.setAppBadge === "function" &&
    typeof self.navigator?.clearAppBadge === "function";
  const hasRegistration =
    typeof self.registration?.setAppBadge === "function" &&
    typeof self.registration?.clearAppBadge === "function";
  return { hasNavigator, hasRegistration };
}

async function setBadge(count) {
  const { hasNavigator, hasRegistration } = badgeSupport();
  const value = Number(count);
  const valid = Number.isFinite(value) && value > 0;

  try {
    if (valid) {
      if (hasNavigator) return self.navigator.setAppBadge(value);
      if (hasRegistration) return self.registration.setAppBadge(value);
    } else {
      if (hasNavigator) return self.navigator.clearAppBadge();
      if (hasRegistration) return self.registration.clearAppBadge();
    }
  } catch {}
}

async function clearBadge() {
  return setBadge(0);
}

function readNotificationLink(data = {}) {
  const fcmMsg = data?.FCM_MSG || {};
  const fcmData = fcmMsg?.data || {};
  const fcmOptions = fcmMsg?.fcmOptions || {};

  return (
    data.link ||
    data.url ||
    fcmData.link ||
    fcmData.url ||
    fcmOptions.link ||
    ""
  );
}

// Firebase 문서 권장사항에 따라 커스텀 notificationclick은
// Firebase Messaging 라이브러리를 import하기 전에 등록합니다.
self.addEventListener("notificationclick", (event) => {
  event.notification?.close?.();

  const data = event.notification?.data || {};
  const chatId = data.chatId || data?.FCM_MSG?.data?.chatId || null;
  const rawUrl = readNotificationLink(data) || (chatId ? `/chat/${chatId}` : "/");
  const absoluteUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      await clearBadge();

      const clientList = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (!client.url?.startsWith(self.location.origin)) continue;

        await client.focus();
        if (typeof client.navigate === "function") {
          await client.navigate(absoluteUrl);
        } else {
          client.postMessage({
            type: "OPEN_URL",
            data: { url: absoluteUrl },
          });
        }
        return;
      }

      await clients.openWindow?.(absoluteUrl);
    })()
  );
});

importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js");

const FIREBASE_SW_CONFIG_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
  "measurementId",
  "databaseURL",
];

const REQUIRED_FIREBASE_SW_CONFIG_KEYS = [
  "apiKey",
  "projectId",
  "messagingSenderId",
  "appId",
];

function readFirebaseConfigFromWorkerUrl() {
  try {
    const params = new URL(self.location.href).searchParams;
    const config = {};

    for (const key of FIREBASE_SW_CONFIG_KEYS) {
      const value = String(params.get(key) || "").trim();
      if (value) {
        config[key] = value;
      }
    }

    const missing = REQUIRED_FIREBASE_SW_CONFIG_KEYS.filter(
      (key) => !config[key]
    );

    if (missing.length > 0) {
      console.error(
        "[sw] Firebase 설정이 부족합니다:",
        missing.join(", ")
      );
      return null;
    }

    return config;
  } catch (error) {
    console.error("[sw] Firebase 설정을 읽지 못했습니다:", error);
    return null;
  }
}

const firebaseConfig = readFirebaseConfigFromWorkerUrl();

try {
  if (firebaseConfig && !firebase.apps?.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (error) {
  console.error("[sw] Firebase 초기화 실패:", error);
}

let messaging = null;
try {
  if (firebaseConfig) {
    messaging = firebase.messaging();
  }
} catch (error) {
  console.error("[sw] Firebase Messaging 초기화 실패:", error);
}

if (messaging?.onBackgroundMessage) {
  messaging.onBackgroundMessage(async (payload) => {
    try {
      const notification = payload?.notification || {};
      const data = payload?.data || {};
      const title = String(data.title || notification.title || "알림");
      const body = String(data.body || notification.body || "");
      const chatId = data.chatId || null;
      const rawLink = data.link || data.url || (chatId ? `/chat/${chatId}` : "/");
      const absoluteLink = new URL(rawLink, self.location.origin).href;
      const unreadCount = Number.isFinite(Number(data.unreadCount))
        ? Number(data.unreadCount)
        : undefined;

      if (badgeSupport().hasNavigator || badgeSupport().hasRegistration) {
        await setBadge(unreadCount);
      }

      await broadcastToClients("PUSH_MESSAGE", {
        payload: data,
        title,
        body,
        link: absoluteLink,
        unreadCount: Number.isFinite(unreadCount) ? unreadCount : null,
      });

      if (String(data.silent || "") === "true") return;

      const options = {
        body,
        // 알림 본문에 보이는 큰 아이콘
        icon: "/icons/notification-gold-bell-96.png",
        // Android 상단 상태바에 쓰이는 작은 단색 아이콘
        badge: "/icons/notification-bell-badge-icon-96.png",
        data: { ...data, link: absoluteLink, url: absoluteLink },
        timestamp: Date.now(),
      };

      // renotify:true는 tag가 반드시 있어야 하므로 채팅 알림에만 함께 적용합니다.
      if (chatId) {
        options.tag = `chat-${chatId}`;
        options.renotify = true;
      }

      await self.registration.showNotification(title, options);
    } catch (error) {
      console.error("[sw] background notification error:", error);
    }
  });
}

self.addEventListener("pushsubscriptionchange", () => {
  broadcastToClients("PUSH_SUBSCRIPTION_CHANGED", {});
});