// Notification consent/preference and push-device normalization helpers.
import { createHash } from "node:crypto";

export type NotificationPreferences = { allEnabled: boolean; exchange: boolean; goldNews: boolean; benefits: boolean; };

export function normalizeNotificationPreferences(raw: unknown): NotificationPreferences {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return { allEnabled: source.allEnabled !== false, exchange: source.exchange !== false, goldNews: source.goldNews !== false, benefits: source.benefits === true };
}

export function notificationCategory(typeValue: unknown): "exchange" | "goldNews" | "benefits" | "other" {
  const type = String(typeValue || "").toLowerCase();
  if (type.startsWith("exchange_") || type.startsWith("bonus_gold_usage_")) return "exchange";
  if (type.startsWith("gold_price") || type.startsWith("gold_news") || type.startsWith("market_") || type === "notice") return "goldNews";
  if (type.startsWith("my_gold_") || type.startsWith("promo_") || type.startsWith("quiz_") || type === "promo_bonus" || type === "welcome_bonus" || type.startsWith("event_") || type.startsWith("benefit_")) return "benefits";
  return "other";
}

export function marketingConsentAccepted(userData: FirebaseFirestore.DocumentData | undefined): boolean {
  return userData?.consents?.marketing?.accepted === true;
}

export function marketingPushEnabled(
  userData: FirebaseFirestore.DocumentData | undefined,
  preferences: NotificationPreferences
): boolean {
  // 광고성 정보는 법적 동의와 기존 사용자 알림 선호를 모두 통과해야 합니다.
  // benefits 레거시 필드는 새 단일 스위치와 호환되지 않을 수 있어 goldNews를 공통 마케팅 푸시 선호로 사용합니다.
  return (
    marketingConsentAccepted(userData) &&
    preferences.allEnabled !== false &&
    preferences.goldNews !== false
  );
}

export function shouldSendPushForUser(
  userData: FirebaseFirestore.DocumentData | undefined,
  preferences: NotificationPreferences,
  typeValue: unknown
): boolean {
  const category = notificationCategory(typeValue);

  // 예약·교환 등 이용자가 신청한 서비스 진행 안내는 마케팅 선택과 분리합니다.
  if (category === "exchange") return true;

  // 금시세·주요 소식·이벤트·혜택은 광고성 정보 수신동의가 있는 경우에만 발송합니다.
  if (category === "goldNews" || category === "benefits") {
    return marketingPushEnabled(userData, preferences);
  }

  // 일반 중요/서비스 알림은 광고 카테고리로 사용하지 않는 것을 전제로 합니다.
  return true;
}


export type PushDeviceInput = {
  label?: string;
  browser?: string;
  platform?: string;
};

export function normalizePushDeviceText(
  value: unknown,
  fallback: string,
  maxLength = 80
): string {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return normalized || fallback;
}

export function pushDeviceIdForToken(token: string): string {
  const digest = createHash("sha256").update(token).digest("hex").slice(0, 20);
  return `d_${digest}`;
}

export function readPushDevices(value: unknown): Record<string, FirebaseFirestore.DocumentData> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const source = value as Record<string, unknown>;
  const result: Record<string, FirebaseFirestore.DocumentData> = {};

  Object.entries(source).forEach(([key, entry]) => {
    if (!key || !entry || typeof entry !== "object" || Array.isArray(entry)) return;
    result[key] = { ...(entry as FirebaseFirestore.DocumentData) };
  });

  return result;
}

export function removePushDevicesForTokens(
  value: unknown,
  tokens: string[]
): Record<string, FirebaseFirestore.DocumentData> {
  const devices = readPushDevices(value);
  const badTokens = new Set(tokens.map((token) => String(token || "").trim()).filter(Boolean));

  if (!badTokens.size) return devices;

  Object.entries(devices).forEach(([key, entry]) => {
    const entryToken = String(entry?.token || "").trim();
    if (badTokens.has(entryToken)) {
      delete devices[key];
      return;
    }

    for (const token of badTokens) {
      if (key === pushDeviceIdForToken(token)) {
        delete devices[key];
        break;
      }
    }
  });

  return devices;
}

export function inferWebPushDeviceFromUserAgent(userAgent: string): PushDeviceInput {
  const ua = String(userAgent || "").trim();
  if (!ua) return {};

  let browser = "";

  if (/SamsungBrowser/i.test(ua)) browser = "삼성인터넷";
  else if (/EdgA|EdgiOS|Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/CriOS|Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  let platform = "";

  if (/Android/i.test(ua)) platform = "Android";
  else if (/iPad|iPhone|iPod/i.test(ua)) platform = "iOS/iPadOS";
  else if (/Windows/i.test(ua)) platform = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) platform = "macOS";
  else if (/Linux/i.test(ua)) platform = "Linux";

  const fallbackBrowser = browser || "현재 브라우저";

  return {
    browser: browser || undefined,
    platform: platform || undefined,
    label: platform
      ? `${fallbackBrowser} · ${platform}`
      : browser || undefined,
  };
}

export function normalizedPushDevice(
  native: boolean,
  input: PushDeviceInput | undefined,
  userAgent = ""
): {
  label: string;
  browser: string;
  platform: string;
  channel: "android-app" | "web";
} {
  if (native) {
    return {
      label: "한국골드마켓 앱",
      browser: "",
      platform: "Android",
      channel: "android-app",
    };
  }

  /*
   * 웹 브라우저는 callable 요청의 User-Agent를 우선 사용합니다.
   * 따라서 예전 웹 번들이 device 정보를 보내지 않더라도
   * 다음 토큰 재등록 시 삼성인터넷/Chrome 등을 식별할 수 있습니다.
   */
  const inferred = inferWebPushDeviceFromUserAgent(userAgent);

  const browser = normalizePushDeviceText(
    inferred.browser || input?.browser,
    "현재 브라우저",
    60
  );
  const platform = normalizePushDeviceText(
    inferred.platform || input?.platform,
    "알 수 없음",
    60
  );
  const defaultLabel =
    platform && platform !== "알 수 없음"
      ? `${browser} · ${platform}`
      : browser;

  return {
    label: normalizePushDeviceText(
      inferred.label || input?.label,
      defaultLabel,
      100
    ),
    browser,
    platform,
    channel: "web",
  };
}

