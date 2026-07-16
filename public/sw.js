/* public/sw.js */
/* eslint-disable no-undef */

/**
 * 단일 Service Worker(FCM 포함) 구성
 * - firebase-app-compat / firebase-messaging-compat 사용
 * - 메시지 기반 업데이트(깜박임 최소화): 페이지에서 'SKIP_WAITING' 메시지를 보낼 때만 새 버전 활성화
 * - 알림 배지(App Badge API) / 백그라운드 메시지 / 알림 클릭 처리 포함
 */

/* ────────────────────────────────────────────────────────────
 * 업데이트 전략: 메시지 기반 즉시 활성화
 *  - 로그인 직후 등 민감 타이밍에 SW 교체로 인한 깜박임 방지
 *  - 새 버전 감지 시 페이지 측에서:
 *      navigator.serviceWorker.controller?.postMessage("SKIP_WAITING")
 * ──────────────────────────────────────────────────────────── */
self.addEventListener("message", (event) => {
  try {
    if (event?.data === "SKIP_WAITING") self.skipWaiting();
    if (event?.data === "CLEAR_BADGE") {
      // 선택: 앱에서 배지 지우기 요청 시 사용
      try { self.navigator?.clearAppBadge?.(); } catch {}
      try { self.registration?.clearAppBadge?.(); } catch {}
    }
  } catch {}
});

self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/* ────────────────────────────────────────────────────────────
 * Firebase compat 로드 (FCM용)
 * ──────────────────────────────────────────────────────────── */
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js");

/* ────────────────────────────────────────────────────────────
 * Firebase 앱 설정
 *  - SW 안에서만 compat 초기화 (웹 번들에서는 모듈러만 사용 권장)
 * ──────────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyAvjsOmLSZ9sTPOn38LYMbESEYV1qJ914M",
  authDomain: "goldmarket-0.firebaseapp.com",
  projectId: "goldmarket-0",
  storageBucket: "goldmarket-0.appspot.com",
  messagingSenderId: "598933990716",
  appId: "1:598933990716:web:ac87a6fe3ea7f956260239",
  measurementId: "G-M2V18ZN6TL",
};

try {
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch {}
let messaging = null;
try {
  messaging = firebase.messaging();
} catch { /* FCM 미지원 환경에서는 무시 */ }

/* ────────────────────────────────────────────────────────────
 * 유틸: 클라이언트(열린 탭) 브로드캐스트
 * ──────────────────────────────────────────────────────────── */
async function broadcastToClients(type, data) {
  try {
    const list = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of list) {
      try { c.postMessage({ type, data }); } catch {}
    }
  } catch {}
}

/* ────────────────────────────────────────────────────────────
 * App Badge API 지원 감지/제어
 * ──────────────────────────────────────────────────────────── */
function badgeSupport() {
  const nav = (self && self.navigator) || null;
  const hasNav = !!(nav && typeof nav.setAppBadge === "function" && typeof nav.clearAppBadge === "function");
  const hasReg = !!(self.registration && typeof self.registration.setAppBadge === "function" && typeof self.registration.clearAppBadge === "function");
  return { hasNav, hasReg };
}
async function setBadge(count) {
  const { hasNav, hasReg } = badgeSupport();
  const n = Number(count);
  const hasNumber = Number.isFinite(n) && n > 0;
  try {
    if (hasNumber) {
      if (hasNav) return await self.navigator.setAppBadge(n);
      if (hasReg) return await self.registration.setAppBadge(n);
    } else {
      if (hasNav) return await self.navigator.clearAppBadge();
      if (hasReg) return await self.registration.clearAppBadge();
    }
  } catch {}
}
async function clearBadge() {
  try {
    const { hasNav, hasReg } = badgeSupport();
    if (hasNav) return await self.navigator.clearAppBadge();
    if (hasReg) return await self.registration.clearAppBadge();
  } catch {}
}

/* ────────────────────────────────────────────────────────────
 * 백그라운드 메시지 (FCM)
 * ──────────────────────────────────────────────────────────── */
if (messaging && messaging.onBackgroundMessage) {
  messaging.onBackgroundMessage(async (payload) => {
    try {
      const notif = payload?.notification || {};
      const data  = payload?.data || {};

      const title = String(data.title || notif.title || "알림");
      const body  = String(data.body  || notif.body  || "");

      const type   = String(data.type || "");      // e.g., 'chat_message'
      const chatId = data.chatId || null;
      const link   = data.link || (chatId ? `/chat/${chatId}` : "/");
      const absolute = new URL(link, self.location.origin).href;

      const preferBadge = (typeof data.preferBadge !== "undefined")
        ? String(data.preferBadge).toLowerCase() === "true"
        : (type === "chat_message");

      const silent = String(data.silent || "").toLowerCase() === "true";
      const hasAutoNotification = !!payload.notification;

      const unreadCount = Number.isFinite(Number(data.unreadCount))
        ? Number(data.unreadCount)
        : undefined;

      const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const hasWindow = clientList.length > 0;
      const supportsBadge = badgeSupport().hasNav || badgeSupport().hasReg;

      // 1) 배지 갱신
      if (supportsBadge && (preferBadge || type === "chat_message")) {
        await setBadge(unreadCount); // 숫자 없으면 자동 clear
      }

      // 2) 열린 탭들에 브로드캐스트
      await broadcastToClients("PUSH_MESSAGE", {
        payload: data, title, body, link: absolute,
        unreadCount: Number.isFinite(unreadCount) ? unreadCount : null,
      });

      // 3) 시스템 알림(폴백) 필요 판단
      const needFallback = !supportsBadge || !hasWindow;
      const shouldShowManually = (!hasAutoNotification) && !silent && (!preferBadge || needFallback);

      if (shouldShowManually && self.registration?.showNotification) {
        const options = {
          body,
          icon: notif.icon || "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
          data: { ...data, link: absolute },
          tag: chatId ? `chat-${chatId}` : undefined,
          renotify: true,
          timestamp: Date.now(),
        };
        await self.registration.showNotification(title, options);
      }
    } catch {}
  });
}

/* ────────────────────────────────────────────────────────────
 * 알림 클릭: 기존 탭 포커스 → 없으면 새 창 열기
 *  - navigate API 지원 시 직접 이동, 미지원 시 메시지 브릿지 사용
 * ──────────────────────────────────────────────────────────── */
self.addEventListener("notificationclick", (event) => {
  event.notification?.close?.();
  const data = (event.notification && event.notification.data) || {};
  const url = data.link || (data.chatId ? `/chat/${data.chatId}` : "/");
  const absolute = new URL(url, self.location.origin).href;

  event.waitUntil((async () => {
    try { await clearBadge(); } catch {}
    try {
      const list = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of list) {
        try {
          if (client.url && client.url.startsWith(self.location.origin)) {
            await client.focus();
            if ("navigate" in client && typeof client.navigate === "function") {
              await client.navigate(absolute);
            } else {
              client.postMessage({ type: "OPEN_URL", data: { url: absolute } });
            }
            return;
          }
        } catch {}
      }
      if (clients.openWindow) await clients.openWindow(absolute);
    } catch {}
  })());
});

/* ────────────────────────────────────────────────────────────
 * 푸시 구독 변경 신호 (선택)
 * ──────────────────────────────────────────────────────────── */
self.addEventListener("pushsubscriptionchange", () => {
  broadcastToClients("PUSH_SUBSCRIPTION_CHANGED", {});
});
