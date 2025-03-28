// src/components/common/Notifications.js
import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { markNotificationAsRead } from "../../services/notificationService"; // 읽음 처리 함수 import

export default function Notifications({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notis = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setNotifications(notis);
      },
      (error) => {
        console.error("알림 구독 에러:", error);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  // 알림 항목 클릭 시 해당 알림을 읽음 처리하는 함수
  const handleNotificationClick = (notificationId) => {
    markNotificationAsRead(notificationId)
      .then(() => {
        // 알림 읽음 후, UI 업데이트(예: 목록에서 제거하거나, 스타일 변경)
        // 여기서는 단순히 콘솔 로그로 확인합니다.
        console.log(`Notification ${notificationId} marked as read.`);
      })
      .catch((err) => {
        console.error("알림 읽음 처리 실패:", err);
      });
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{ cursor: "pointer", position: "relative" }}
      >
        🔔
        {notifications.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              backgroundColor: "red",
              color: "white",
              borderRadius: "50%",
              padding: "2px 6px",
              fontSize: "0.8em"
            }}
          >
            {notifications.length}
          </span>
        )}
      </div>
      {dropdownOpen && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            right: 0,
            width: "300px",
            background: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 100,
            maxHeight: "400px",
            overflowY: "auto"
          }}
        >
          {notifications.length === 0 ? (
            <p style={{ padding: "10px" }}>알림이 없습니다.</p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif.id)}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  backgroundColor: notif.read ? "#fff" : "#f0f8ff"
                }}
              >
                <p>{notif.message}</p>
                {notif.createdAt && (
                  <p style={{ fontSize: "0.8em", color: "#999" }}>
                    {formatDistanceToNow(
                      new Date(notif.createdAt.seconds * 1000),
                      { addSuffix: true, locale: ko }
                    )}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
