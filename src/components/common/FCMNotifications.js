// src/components/common/FCMNotifications.js
import React, { useState, useEffect } from "react";
import useFCM from "../../hooks/useFCM";

export default function FCMNotifications() {
  const { message } = useFCM();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (message && message.notification) {
      // 받은 FCM 메시지의 notification 객체를 상태에 저장
      setNotification(message.notification);
      // 5초 후에 알림을 숨김
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!notification) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        backgroundColor: "#333",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: "5px",
        zIndex: 1000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
      }}
    >
      <h4 style={{ margin: 0 }}>{notification.title}</h4>
      <p style={{ margin: 0 }}>{notification.body}</p>
    </div>
  );
}
