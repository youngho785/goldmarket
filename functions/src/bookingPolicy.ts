export type ExchangeStatus =
  | "requested"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "canceled"
  | "rejected";

const EXCHANGE_TRANSITIONS: Record<ExchangeStatus, ReadonlySet<ExchangeStatus>> = {
  requested: new Set(["scheduled", "canceled", "rejected"]),
  scheduled: new Set(["in_progress", "canceled"]),
  in_progress: new Set(["completed", "canceled"]),
  completed: new Set(),
  canceled: new Set(),
  rejected: new Set(["requested"]),
};

export function normalizeExchangeStatus(value: unknown): ExchangeStatus | null {
  const normalized = String(value || "").trim() === "교환중"
    ? "in_progress"
    : String(value || "").trim();
  return normalized in EXCHANGE_TRANSITIONS
    ? (normalized as ExchangeStatus)
    : null;
}

export function canTransitionExchangeStatus(
  from: ExchangeStatus,
  to: ExchangeStatus
): boolean {
  if (from === to) return true;
  return EXCHANGE_TRANSITIONS[from].has(to);
}

export type BookingAvailabilityEntry = {
  closed: boolean;
  blockedSlots: string[];
  reason: string;
};

export function normalizeAvailabilityEntry(
  value: unknown,
  allowedSlots?: ReadonlySet<string>
): BookingAvailabilityEntry {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const blockedSlots = Array.isArray(source.blockedSlots)
    ? [...new Set(
        source.blockedSlots
          .map((slot) => String(slot || "").trim())
          .filter((slot) => slot && (!allowedSlots || allowedSlots.has(slot)))
      )]
    : [];
  return {
    closed: source.closed === true,
    blockedSlots,
    reason: String(source.reason || "").trim().slice(0, 120),
  };
}

export function bookingBlockReason(
  availabilityData: unknown,
  dateKey: string,
  time: string,
  allowedSlots?: ReadonlySet<string>
): string {
  const source = availabilityData && typeof availabilityData === "object" && !Array.isArray(availabilityData)
    ? (availabilityData as Record<string, unknown>)
    : {};
  const dates = source.dates && typeof source.dates === "object" && !Array.isArray(source.dates)
    ? (source.dates as Record<string, unknown>)
    : {};
  const entry = normalizeAvailabilityEntry(dates[dateKey], allowedSlots);
  if (entry.closed) {
    return entry.reason || "해당 날짜는 예약을 받지 않습니다.";
  }
  if (entry.blockedSlots.includes(time)) {
    return entry.reason || "해당 시간은 예약을 받지 않습니다.";
  }
  return "";
}
