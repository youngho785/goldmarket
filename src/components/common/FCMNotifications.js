// src/components/common/FCMNotifications.js
import React, { useState, useEffect } from "react";
import useFCM from "../../hooks/useFCM";

export default function FCMNotifications() {
  const { message } = useFCM();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (message && message.notification) {
      // FCM 메시지의 notification 객체를 기반으로 새 알림 객체 생성
      const newNotification = {
        id: Date.now(), // 고유 ID (간단한 예시로 타임스탬프 사용)
        title: message.notification.title,
        body: message.notification.body,
        clickAction: message.notification.clickAction || null, // 선택 사항: 클릭 시 이동 URL
      };

      // 알림 배열에 추가
      setNotifications((prev) => [...prev, newNotification]);

      // 5초 후에 자동으로 알림 제거
      const timer = setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== newNotification.id)
        );
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [message]);

  // 알림 클릭 시 clickAction이 있으면 해당 URL로 이동하고, 알림 제거
  const handleNotificationClick = (notification) => {
    if (notification.clickAction) {
      window.location.href = notification.clickAction;
    }
    setNotifications((prev) =>
      prev.filter((n) => n.id !== notification.id)
    );
  };

  // 수동 해제
  const handleDismiss = (id, e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        zIndex: 1000,
      }}
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          style={{
            backgroundColor: "#333",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "5px",
            marginBottom: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            cursor: notification.clickAction ? "pointer" : "default",
            minWidth: "250px",
          }}
          onClick={() => handleNotificationClick(notification)}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h4 style={{ margin: 0 }}>{notification.title}</h4>
            <button
              onClick={(e) => handleDismiss(notification.id, e)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              &times;
            </button>
          </div>
          <p style={{ margin: 0 }}>{notification.body}</p>
        </div>
      ))}
    </div>
  );
}
