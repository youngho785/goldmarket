const MAX_MESSAGE_LENGTH = 1200;
const MAX_STACK_LENGTH = 7000;
const MAX_LABEL_LENGTH = 80;
const MAX_ROUTE_LENGTH = 240;

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const KOREAN_PHONE_PATTERN = /\b(?:\+?82[-.\s]?)?(?:0?1[016789]|0?2|0?[3-6][1-5])[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const SENSITIVE_QUERY_PATTERN = /([?&](?:token|access_token|refresh_token|id_token|oobCode|apiKey|key|code|email|phone|uid|session|secret)=)[^&#\s]+/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const URL_QUERY_PATTERN = /(https?:\/\/[^\s?#)]+)[?#][^\s)]*/gi;

const ALLOWED_LEVELS = new Set(["info", "warning", "error", "fatal"]);
const ALLOWED_AREAS = new Set([
  "app",
  "auth",
  "routing",
  "preload",
  "service-worker",
  "gold-exchange",
  "my-gold",
  "my-exchanges",
  "settings",
  "profile",
  "notifications",
  "admin",
  "unknown",
]);

function clampText(value, maxLength) {
  return String(value ?? "").slice(0, maxLength);
}

export function redactSensitiveText(value, maxLength = MAX_MESSAGE_LENGTH) {
  return clampText(value, maxLength)
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(JWT_PATTERN, "[redacted-token]")
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(KOREAN_PHONE_PATTERN, "[redacted-phone]")
    .replace(SENSITIVE_QUERY_PATTERN, "$1[redacted]")
    .replace(URL_QUERY_PATTERN, "$1[query-redacted]");
}

function sanitizePathname(pathname) {
  const segments = String(pathname || "/").split("/").map((segment) => {
    if (!segment) return segment;

    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {}

    const looksLikeOpaqueId =
      /^[A-Za-z0-9_-]{20,}$/.test(decoded) || /^\d{8,}$/.test(decoded);
    const containsContact =
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(decoded) ||
      /(?:\+?82[-.\s]?)?(?:0?1[016789]|0?2|0?[3-6][1-5])[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(decoded);

    return looksLikeOpaqueId || containsContact ? ":redacted" : segment;
  });

  const normalized = segments.join("/") || "/";
  return clampText(normalized.startsWith("/") ? normalized : `/${normalized}`, MAX_ROUTE_LENGTH);
}

export function sanitizeRoute(value) {
  if (typeof value !== "string" || !value.trim()) return "/";

  const raw = value.trim();
  try {
    const parsed = new URL(raw, "https://monitoring.koreagoldmarket.invalid");
    const path = parsed.pathname || "/";
    return path.startsWith("/") ? sanitizePathname(path) : "/";
  } catch {
    const pathOnly = raw.split(/[?#]/, 1)[0] || "/";
    return pathOnly.startsWith("/") ? sanitizePathname(pathOnly) : "/";
  }
}

export function sanitizeLevel(value) {
  const normalized = String(value || "error").toLowerCase();
  return ALLOWED_LEVELS.has(normalized) ? normalized : "error";
}

export function sanitizeArea(value) {
  const normalized = String(value || "unknown").toLowerCase();
  return ALLOWED_AREAS.has(normalized) ? normalized : "unknown";
}

export function sanitizeLabel(value, fallback = "") {
  const normalized = redactSensitiveText(value, MAX_LABEL_LENGTH)
    .replace(/[\r\n\t]+/g, " ")
    .trim();
  return normalized || fallback;
}

export function sanitizeError(error) {
  if (error instanceof Error) {
    return {
      name: sanitizeLabel(error.name, "Error"),
      message: redactSensitiveText(error.message || String(error)),
      stack: redactSensitiveText(error.stack || "", MAX_STACK_LENGTH),
    };
  }

  if (error && typeof error === "object") {
    const candidate = error;
    return {
      name: sanitizeLabel(candidate.name, "Error"),
      message: redactSensitiveText(
        candidate.message || candidate.statusText || candidate.code || "Unknown client error"
      ),
      stack: redactSensitiveText(candidate.stack || "", MAX_STACK_LENGTH),
    };
  }

  return {
    name: "Error",
    message: redactSensitiveText(error || "Unknown client error"),
    stack: "",
  };
}

export function sanitizeMonitoringContext(context = {}) {
  const safeContext = {
    source: sanitizeLabel(context.source, "unknown"),
    area: sanitizeArea(context.area),
    action: sanitizeLabel(context.action, ""),
    level: sanitizeLevel(context.level),
  };

  if (typeof context.recovered === "boolean") {
    safeContext.recovered = context.recovered;
  }

  return safeContext;
}

export function sanitizeClientEvent(event) {
  const error = sanitizeError(event?.error || event);
  const context = sanitizeMonitoringContext(event?.context || {});

  return {
    schemaVersion: 1,
    eventId: sanitizeLabel(event?.eventId, "unknown"),
    occurredAt: Number.isFinite(Number(event?.occurredAt))
      ? Number(event.occurredAt)
      : Date.now(),
    release: sanitizeLabel(event?.release, "kgm-web@unknown"),
    environment: sanitizeLabel(event?.environment, "production"),
    route: sanitizeRoute(event?.route || "/"),
    platform: sanitizeLabel(event?.platform, "web"),
    deviceClass: sanitizeLabel(event?.deviceClass, "unknown"),
    online:
      typeof event?.online === "boolean"
        ? event.online
        : null,
    error,
    context,
  };
}
