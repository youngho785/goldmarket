// src/services/notificationService.js
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

// 알림 전송 로직 (예: Firebase Cloud Messaging 또는 Cloud Functions 연동)
export const sendNotification = (notification) => {
  console.log("Notification sent:", notification);
  // 여기에 실제 알림 전송 로직을 구현합니다.
};

// 알림을 읽음 상태로 업데이트하는 함수
export const markNotificationAsRead = async (notificationId) => {
  const notifDocRef = doc(db, "notifications", notificationId);
  await updateDoc(notifDocRef, { read: true });
};
