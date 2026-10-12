// Notification copy for the device lock screen. Keep the full original body
// in Firestore for the signed-in notification inbox and related detail pages.
// Never infer transactional outcomes from user-authored manual campaigns.
export type PushCopyNotification = {
  type?: string;
  title?: string;
  body?: string;
  pushTitle?: string;
  pushBody?: string;
  meta?: Record<string, unknown>;
};

type PushCopy = { title: string; body: string };

const FIXED_PUSH_COPY: Record<string, PushCopy> = {
  my_gold_goal_reached: {
    title: "MY GOLD 목표 달성",
    body: "설정하신 목표에 도달했습니다. 달성 내역을 확인해 보세요.",
  },
  exchange_requested: {
    title: "금교환 예약 신청 접수",
    body: "예약 신청이 접수되었습니다. 확정 후 다시 안내해 드립니다.",
  },
  exchange_reschedule_requested: {
    title: "금교환 일정 변경 요청 접수",
    body: "일정 변경 요청이 접수되었습니다. 확인 후 안내해 드립니다.",
  },
  exchange_reschedule_scheduled: {
    title: "금교환 일정 변경 완료",
    body: "변경된 방문 일정이 확정되었습니다. 예약 내역을 확인해 주세요.",
  },
  exchange_scheduled: {
    title: "금교환 예약 확정",
    body: "방문 예약이 확정되었습니다. 날짜와 시간을 확인해 주세요.",
  },
  exchange_in_progress: {
    title: "금교환 진행 안내",
    body: "순도와 중량을 확인하고 있습니다.",
  },
  exchange_canceled_by_customer: {
    title: "금교환 예약 취소 완료",
    body: "요청하신 예약이 취소되었습니다.",
  },
  exchange_canceled: {
    title: "금교환 예약 취소 안내",
    body: "방문 예약이 취소되었습니다. 상세 내용을 확인해 주세요.",
  },
  exchange_rejected: {
    title: "금교환 신청 확인 안내",
    body: "신청 내역을 확인해 주세요. 필요하시면 매장으로 문의해 주세요.",
  },
  exchange_completed: {
    title: "GOLD TO GOLD 교환 완료",
    body: "교환이 완료되었습니다. 감사합니다.",
  },
  welcome_bonus: {
    title: "웰컴 MEMBER GOLD 적립 완료",
    body: "회원가입 혜택이 적립되었습니다. 자세한 내용을 확인해 주세요.",
  },
  marketing_push_bonus: {
    title: "MEMBER GOLD 적립 완료",
    body: "알림 수신 설정 혜택이 적립되었습니다. 자세한 내용을 확인해 주세요.",
  },
  promo_bonus: {
    title: "퀴즈 참여 혜택 적립 완료",
    body: "퀴즈 혜택이 적립되었습니다. 자세한 내용을 확인해 주세요.",
  },
  bonus_gold_carryover_restored: {
    title: "MEMBER GOLD 잔액 복원 완료",
    body: "이전 계정의 미사용 MEMBER GOLD가 복원되었습니다.",
  },
  bonus_gold_usage_requested: {
    title: "MEMBER GOLD 사용 신청 접수",
    body: "사용 신청이 접수되었습니다. 매장 확인 절차를 안내해 드립니다.",
  },
  bonus_gold_usage_completed: {
    title: "MEMBER GOLD 사용 완료",
    body: "신청하신 MEMBER GOLD 사용이 완료되었습니다.",
  },
  bonus_gold_usage_canceled: {
    title: "MEMBER GOLD 사용 신청 취소",
    body: "사용 신청이 취소되었습니다. 이용 가능 잔액을 확인해 주세요.",
  },
  bonus_gold_usage_restored: {
    title: "MEMBER GOLD 복구 완료",
    body: "사용 내역이 정리되어 MEMBER GOLD 잔액이 복구되었습니다.",
  },
  admin_member_signup: {
    title: "신규 회원 가입",
    body: "신규 회원이 가입했습니다. 관리자 화면에서 확인해 주세요.",
  },
  admin_exchange_requested: {
    title: "금교환 예약 신청 확인",
    body: "새로운 예약 신청이 접수되었습니다. 관리자 화면에서 확인해 주세요.",
  },
  admin_exchange_rescheduled: {
    title: "금교환 예약 변경 요청",
    body: "예약 변경 요청이 접수되었습니다. 관리자 화면에서 확인해 주세요.",
  },
  admin_exchange_canceled_by_customer: {
    title: "금교환 예약 취소",
    body: "고객이 예약을 취소했습니다. 관리자 화면에서 확인해 주세요.",
  },
  admin_bonus_gold_usage_requested: {
    title: "MEMBER GOLD 사용 확인 필요",
    body: "새로운 사용 신청을 관리자 화면에서 확인해 주세요.",
  },
  admin_bonus_gold_usage_canceled: {
    title: "MEMBER GOLD 사용 신청 취소",
    body: "사용 신청이 취소되었습니다. 관리자 화면에서 확인해 주세요.",
  },
};

export function weeklyPushBody(
  changeWon: unknown,
  changePercent: unknown,
  hasComparison: boolean,
): string {
  const closing = "지난주와 비교한 변화를 확인해 보세요.";
  const won = Number(changeWon);
  const percent = Number(changePercent);
  if (!hasComparison || !Number.isFinite(won) || !Number.isFinite(percent)) {
    return "이번 주 MY GOLD 참고가치를 확인해 보세요.";
  }
  const rounded = Math.round(won);
  if (rounded === 0 && Math.abs(percent) < 0.005) {
    return `7일 전 대비 변동 없음\n${closing}`;
  }
  const arrow = won >= 0 ? "▲" : "▼";
  const sign = percent >= 0 ? "+" : "-";
  return `7일 전 대비 ${arrow} ${Math.abs(rounded).toLocaleString("ko-KR")}원 (${sign}${Math.abs(percent).toFixed(2)}%)\n${closing}`;
}

export function resolveNotificationPushCopy(notif: PushCopyNotification): PushCopy {
  const type = String(notif.type || "");
  const original = {
    title: String(notif.title || "알림"),
    body: String(notif.body || ""),
  };
  if (type === "my_gold_weekly") {
    const metadata = notif.meta || {};
    const past = Number(metadata.historicalValueWon);
    const hasComparison = Number.isFinite(past) && past > 0 &&
      metadata.changePercent !== null && metadata.changePercent !== undefined;
    return {
      title: "이번 주 MY GOLD 리포트",
      body: weeklyPushBody(metadata.changeWon, metadata.changePercent, hasComparison),
    };
  }
  if (type === "exchange_visit_reminder") {
    const time = String(notif.meta?.visitTime || "").trim();
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    return {
      title: "내일 금교환 방문 안내",
      body: validTime
        ? `내일 ${time} 원일귀금속 방문 예약이 있습니다.`
        : "내일 원일귀금속 방문 예약이 있습니다. 예약 시간을 확인해 주세요.",
    };
  }
  const fixed = FIXED_PUSH_COPY[type];
  if (fixed) return fixed;
  // Only operator-authored notices / new unknown types preserve original text.
  return {
    title: typeof notif.pushTitle === "string" && notif.pushTitle.trim()
      ? notif.pushTitle : original.title,
    body: typeof notif.pushBody === "string" && notif.pushBody.trim()
      ? notif.pushBody : original.body,
  };
}
