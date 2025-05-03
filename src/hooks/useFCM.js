// src/hooks/useFCM.js
import { useState, useEffect } from "react";
import { messaging } from "../firebase/firebase";
import { getToken, onMessage } from "firebase/messaging";

// 콘솔 > Cloud Messaging 탭에서 발급받은 VAPID_KEY
const VAPID_KEY = "BF9GOXApES0_7Qee6N4y7cu5s4hLwvYlAgOEpKnxPTqr7v-_W7izJjlf3xJfv10oh0El5FcqWqvAXfd5d00f8CM";

export default function useFCM() {
  const [fcmToken, setFcmToken] = useState(null);
  const [message, setMessage] = useState(null);

  // 1) 알림 권한 요청 & 토큰 발급
  useEffect(() => {
    Notification.requestPermission().then(permission => {
      if (permission !== "granted") {
        console.warn("알림 권한이 거부되었습니다.");
        return;
      }
      getToken(messaging, { vapidKey: VAPID_KEY })
        .then(currentToken => {
          if (currentToken) {
            setFcmToken(currentToken);
            console.log("FCM Token:", currentToken);
          } else {
            console.warn("토큰을 가져올 수 없습니다. 다시 시도하세요.");
          }
        })
        .catch(err => console.error("FCM 토큰 발급 오류:", err));
    });
  }, []);

  // 2) 포그라운드 메시지 수신 구독
  useEffect(() => {
    const unsubscribe = onMessage(messaging, payload => {
      console.log("Received FCM message:", payload);
      setMessage(payload);
    });
    return unsubscribe;
  }, []);

  return { fcmToken, message };
}
