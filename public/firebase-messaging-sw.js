importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCvW_OtCbHIPQHJpwwR8XffZHY0O0a4scQ",
  authDomain: "goldmarket-200a0.firebaseapp.com",
  projectId: "goldmarket-200a0",
  storageBucket: "goldmarket-200a0.firebasestorage.app",
  messagingSenderId: "889431417972",
  appId: "1:889431417972:web:75d99a0fd1c531166f9d21",
});

const messaging = firebase.messaging();

// 백그라운드에서 알림 수신 시
messaging.onBackgroundMessage((payload) => {
  console.log("백그라운드에서 푸시 알림 수신:", payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/firebase-logo.png",
  });
});
