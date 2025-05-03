// src/components/common/Notifications.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { markNotificationAsRead } from "../../services/notificationService";
import { useNotificationContext } from "../../context/NotificationContext"; // 채팅 알림 카운트

export default function Notifications({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { unreadChats, clearUnreadChats } = useNotificationContext();

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
      (error) => console.error("알림 구독 에러:", error)
    );
    return () => unsubscribe();
  }, [userId]);

  const handleNotificationClick = (notificationId, link) => {
    // 읽음 처리
    markNotificationAsRead(notificationId)
      .then(() => console.log(`Notification ${notificationId} marked as read.`))
      .catch((err) => console.error("알림 읽음 처리 실패:", err));
    setDropdownOpen(false);
    if (link) navigate(link);
  };

  const handleChatClick = () => {
    clearUnreadChats();
    setDropdownOpen(false);
    navigate("/chat");
  };

  const totalBadge = notifications.filter((n) => !n.read).length + unreadChats;

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{ cursor: "pointer", position: "relative" }}
      >
        🔔
        {totalBadge > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              backgroundColor: "red",
              color: "white",
              borderRadius: "50%",
              padding: "2px 6px",
              fontSize: "0.8em",
            }}
          >
            {totalBadge}
          </span>
        )}
      </div>

      {dropdownOpen && (
        <div
          style={{
            position: "absolute",
            top: "120%",
            right: 0,
            width: "320px",
            background: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 100,
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          {/* 채팅 알림 섹션 */}
          {unreadChats > 0 && (
            <div
              onClick={handleChatClick}
              style={{
                padding: "10px",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
                backgroundColor: "#f0f8ff",
              }}
            >
              <strong>새 채팅 메시지 {unreadChats}건</strong>
            </div>
          )}

          {/* 일반 알림 목록 */}
          {notifications.length === 0 ? (
            <p style={{ padding: "10px" }}>알림이 없습니다.</p>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif.id, notif.link)}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  backgroundColor: notif.read ? "#fff" : "#f9f9f9",
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
