// src/utils/formatTime.js

import { format, differenceInMinutes, differenceInHours } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * timestamp: Firestore Timestamp이거나 Date 객체라고 가정
 * 1) 지금 기준으로 1시간 이내면 "xx분 전" 형태로 반환
 * 2) 1시간 이상~24시간 이내면 "xx시간 전" 형태로 반환
 * 3) 그 이후면 "YYYY-MM-DD HH:mm" 형식으로 반환
 */
export default function formatChatTime(timestamp) {
  // Firestore Timestamp일 경우 Date로 변환
  const date =
    typeof timestamp.toDate === "function" ? timestamp.toDate() : timestamp;
  const now = new Date();

  const diffMins = differenceInMinutes(now, date);
  if (diffMins < 60) {
    return `${diffMins}분 전`;
  }

  const diffHours = differenceInHours(now, date);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  // 24시간 이상이면 "2025-06-06 14:23" 같은 포맷
  return format(date, "yyyy-MM-dd HH:mm", { locale: ko });
}
