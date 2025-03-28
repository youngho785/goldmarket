// src/components/NotificationList.js
import React, { useEffect, useState } from "react";
import { getNotifications, markAsRead } from "../firebase/notificationService";

function NotificationList({ userId }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const userNotifications = await getNotifications(userId);
      setNotifications(userNotifications);
    };
    fetchNotifications();
  }, [userId]);

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  return (
    <div>
      <h2>알림</h2>
      {notifications.length === 0 ? (
        <p>새로운 알림이 없습니다.</p>
      ) : (
        notifications.map((notification) => (
          <div key={notification.id} className="notification-item">
            <p>{notification.message}</p>
            <button onClick={() => handleMarkAsRead(notification.id)}>읽음</button>
          </div>
        ))
      )}
    </div>
  );
}

export default NotificationList;
