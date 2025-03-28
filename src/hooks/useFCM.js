// src/hooks/useFCM.js
import { useEffect, useState } from "react";
import { messaging } from "../firebase/firebase";
import { getToken, onMessage } from "firebase/messaging";

export default function useFCM() {
  const [fcmToken, setFcmToken] = useState(() => localStorage.getItem("fcmToken") || null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const registerServiceWorkerAndGetToken = async () => {
      try {
        // 명시적으로 서비스 워커 등록
        const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        console.log("Service Worker 등록 성공:", swRegistration);

        // getToken 호출 시 swRegistration 옵션 추가
        const currentToken = await getToken(messaging, { vapidKey: "BF9GOXApES0_7Qee6N4y7cu5s4hLwvYlAgOEpKnxPTqr7v-_W7izJjlf3xJfv10oh0El5FcqWqvAXfd5d00f8CM", swRegistration });
        if (currentToken) {
          console.log("FCM Token retrieved:", currentToken);
          setFcmToken(currentToken);
          localStorage.setItem("fcmToken", currentToken);
        } else {
          console.log("No registration token available. Request permission to generate one.");
        }
      } catch (err) {
        console.error("토큰 가져오기 오류:", err);
      }
    };

    // 토큰이 없는 경우에만 요청
    if (!fcmToken) {
      // 확인 후에 서비스 워커 등록 및 토큰 요청
      registerServiceWorkerAndGetToken();
    }
  }, [fcmToken]);

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Message received:", payload);
      setMessage(payload);
    });
    return () => unsubscribe();
  }, []);

  return { fcmToken, message };
}
