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
    title: "MY GOLD 목표에 도달했어요",
    body: "설정하신 목표에 도달했어요. MY GOLD에서 확인해 보세요.",
  },
  exchange_requested: {
    title: "방문 예약 신청을 받았어요",
    body: "예약 내용을 확인하고 있어요. 확정되면 다시 알려드릴게요.",
  },
  exchange_reschedule_requested: {
    title: "일정 변경 요청을 받았어요",
    body: "변경하신 일정을 확인하고 있어요. 확정되면 다시 알려드릴게요.",
  },
  exchange_reschedule_scheduled: {
    title: "방문 일정이 변경됐어요",
    body: "새로운 방문 일정이 확정됐어요. 변경된 날짜와 시간을 확인해 주세요.",
  },
  exchange_scheduled: {
    title: "방문 예약이 확정됐어요",
    body: "예약하신 일정이 확정됐어요. 방문 날짜와 시간을 확인해 주세요.",
  },
  exchange_in_progress: {
    title: "금교환을 진행하고 있어요",
    body: "금의 순도와 중량을 확인하고 있어요.",
  },
  exchange_canceled_by_customer: {
    title: "요청하신 예약이 취소됐어요",
    body: "예약이 정상적으로 취소됐어요. 다음에 다시 이용해 주세요.",
  },
  exchange_canceled: {
    title: "방문 예약이 취소됐어요",
    body: "방문 예약이 취소됐어요. 자세한 내용은 예약 내역에서 확인해 주세요.",
  },
  exchange_rejected: {
    title: "금교환 신청이 확정되지 않았어요",
    body: "신청 내역을 확인해 주세요. 궁금한 점은 매장에 문의해 주세요.",
  },
  exchange_completed: {
    title: "GOLD TO GOLD 교환이 완료됐어요",
    body: "교환이 완료됐어요. 한국골드마켓을 이용해 주셔서 감사합니다.",
  },
  welcome_bonus: {
    title: "첫 MEMBER GOLD가 적립됐어요",
    body: "한국골드마켓 가입을 환영해요! 회원 혜택 순금이 적립됐어요.",
  },
  marketing_push_bonus: {
    title: "알림 설정 혜택이 적립됐어요",
    body: "알림 수신 설정 혜택으로 MEMBER GOLD가 적립됐어요.",
  },
  promo_bonus: {
    title: "퀴즈 혜택이 적립됐어요",
    body: "퀴즈 참여로 MEMBER GOLD가 적립됐어요. 잔액을 확인해 보세요.",
  },
  bonus_gold_carryover_restored: {
    title: "MEMBER GOLD가 복원됐어요",
    body: "이전 계정의 미사용 MEMBER GOLD가 복원됐어요.",
  },
  bonus_gold_usage_requested: {
    title: "MEMBER GOLD 사용 신청을 받았어요",
    body: "사용 신청이 접수됐어요. 매장 확인 시 6자리 코드를 준비해 주세요.",
  },
  bonus_gold_usage_completed: {
    title: "MEMBER GOLD 사용이 완료됐어요",
    body: "회원 혜택 사용이 완료됐어요. 이용 내역을 확인해 주세요.",
  },
  bonus_gold_usage_canceled: {
    title: "MEMBER GOLD 사용 신청이 취소됐어요",
    body: "사용 신청이 취소됐어요. 이용 가능한 잔액을 확인해 주세요.",
  },
  bonus_gold_usage_restored: {
    title: "사용 가능 잔액이 복구됐어요",
    body: "MEMBER GOLD 잔액이 복구됐어요. 현재 잔액을 확인해 주세요.",
  },
  admin_member_signup: {
    title: "새로운 회원이 가입했어요",
    body: "신규 회원가입이 완료됐어요. 회원 정보를 확인해 주세요.",
  },
  admin_exchange_requested: {
    title: "새로운 방문 예약 신청이 있어요",
    body: "금교환 예약 신청이 접수됐어요. 일정을 확인해 주세요.",
  },
  admin_exchange_rescheduled: {
    title: "예약 일정 변경 요청이 있어요",
    body: "고객이 방문 일정 변경을 요청했어요. 변경 내용을 확인해 주세요.",
  },
  admin_exchange_canceled_by_customer: {
    title: "고객이 방문 예약을 취소했어요",
    body: "취소된 예약 내용을 확인해 주세요.",
  },
  admin_bonus_gold_usage_requested: {
    title: "MEMBER GOLD 사용 확인이 필요해요",
    body: "새로운 회원 혜택 사용 신청이 있어요. 내용을 확인해 주세요.",
  },
  admin_bonus_gold_usage_canceled: {
    title: "MEMBER GOLD 사용 신청이 취소됐어요",
    body: "취소된 사용 신청 내역을 확인해 주세요.",
  },
};

// Lock-screen MY GOLD copy never displays holdings or exact gold value.
export function weeklyPushBody(changeWon: unknown, changePercent: unknown, hasComparison: boolean): string {
  const won = Number(changeWon);
  const percent = Number(changePercent);
  if (!hasComparison || !Number.isFinite(won) || !Number.isFinite(percent)) {
    return "MY GOLD에 기록한 금의 현재 참고가치를 확인해 보세요.";
  }
  if (Math.round(won) === 0 && Math.abs(percent) < 0.005) {
    return "지난주와 비교해 큰 변화가 없어요. 현재 가치를 확인해 보세요.";
  }
  return won > 0
    ? "지난주보다 MY GOLD의 참고가치가 올랐어요. 최근 변화를 확인해 보세요."
    : "지난주보다 MY GOLD의 참고가치가 내려갔어요. 최근 변화를 확인해 보세요.";
}

function weeklyPushTitle(changeWon: unknown, changePercent: unknown, hasComparison: boolean): string {
  const won = Number(changeWon);
  const percent = Number(changePercent);
  if (!hasComparison || !Number.isFinite(won) || !Number.isFinite(percent)) {
    return "이번 주 내 금의 가치를 확인해 보세요";
  }
  if (Math.round(won) === 0 && Math.abs(percent) < 0.005) {
    return "이번 주 MY GOLD 리포트가 도착했어요";
  }
  return won > 0
    ? "이번 주 내 금의 가치가 올랐어요"
    : "이번 주 내 금의 가치를 확인해 보세요";
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
      title: weeklyPushTitle(metadata.changeWon, metadata.changePercent, hasComparison),
      body: weeklyPushBody(metadata.changeWon, metadata.changePercent, hasComparison),
    };
  }
  if (type === "exchange_visit_reminder") {
    const time = String(notif.meta?.visitTime || "").trim();
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    return {
      title: "내일 방문 예약이 있어요",
      body: validTime
        ? `내일 ${time} 원일귀금속 방문이 예정돼 있어요.`
        : "내일 원일귀금속 방문이 예정돼 있어요. 예약 시간을 확인해 주세요.",
    };
  }
  if (type === "my_gold_goal_reached") {
    const rawCodes = notif.meta?.reachedCodes;
    const codes = Array.isArray(rawCodes) ? rawCodes : [];
    if (codes.length === 1) {
      if (codes[0] === "value") return {
        title: "내 금 가치가 목표에 도달했어요",
        body: "MY GOLD 참고가치가 설정하신 목표에 도달했어요.",
      };
      if (codes[0] === "price") return {
        title: "설정한 금시세에 도달했어요",
        body: "순금 참고시세가 설정하신 목표 가격에 도달했어요.",
      };
      if (codes[0] === "bar") return {
        title: "골드바 목표에 도달했어요",
        body: "예상 교환 순금량이 목표에 도달했어요. 자세한 내용을 확인해 주세요.",
      };
    }
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
