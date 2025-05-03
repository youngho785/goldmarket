// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCvW_OtCbHIPQHJpwwR8XffZHY0O0a4scQ",
  authDomain: "goldmarket-200a0.firebaseapp.com",
  projectId: "goldmarket-200a0",
  storageBucket: "goldmarket-200a0.appspot.com",
  messagingSenderId: "889431417972",
  appId: "1:889431417972:web:75d99a0fd1c531166f9d21",
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || "새 알림";
  const options = {
    body: payload.notification?.body || "",
    icon: "/favicon.ico",
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const clickAction = event.notification.data.click_action || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientsArr => {
      for (const client of clientsArr) {
        if (client.url === clickAction) return client.focus();
      }
      return clients.openWindow(clickAction);
    })
  );
});
