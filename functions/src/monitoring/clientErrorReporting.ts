import { createHash } from "node:crypto";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ENFORCE_APP_CHECK } from "../core/runtime.js";
import { writeOperationalLog } from "./structuredLogger.js";

const MAX_MESSAGE_LENGTH = 1200;
const MAX_STACK_LENGTH = 7000;
const MAX_LABEL_LENGTH = 80;
const MAX_ROUTE_LENGTH = 240;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_PER_CLIENT = 30;
const MAX_RATE_BUCKETS = 1200;

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

const rateBuckets = new Map<string, { startedAt: number; count: number }>();

function clamp(value: unknown, maxLength: number): string {
  return String(value ?? "").slice(0, maxLength);
}

function redact(value: unknown, maxLength = MAX_MESSAGE_LENGTH): string {
  return clamp(value, maxLength)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:\+?82[-.\s]?)?(?:0?1[016789]|0?2|0?[3-6][1-5])[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "[redacted-phone]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[redacted-token]")
    .replace(/([?&](?:token|access_token|refresh_token|id_token|oobCode|apiKey|key|code|email|phone|uid|session|secret)=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/(https?:\/\/[^\s?#)]+)[?#][^\s)]*/gi, "$1[query-redacted]");
}

function safeLabel(value: unknown, fallback = ""): string {
  const normalized = redact(value, MAX_LABEL_LENGTH)
    .replace(/[\r\n\t]+/g, " ")
    .trim();
  return normalized || fallback;
}

function safeRoute(value: unknown): string {
  const raw = String(value || "/").trim();
  const path = raw.split(/[?#]/, 1)[0] || "/";
  if (!path.startsWith("/")) return "/";

  const segments = path.split("/").map((segment) => {
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

  return segments.join("/").slice(0, MAX_ROUTE_LENGTH) || "/";
}

function safeLevel(value: unknown): string {
  const normalized = String(value || "error").toLowerCase();
  return ALLOWED_LEVELS.has(normalized) ? normalized : "error";
}

function safeArea(value: unknown): string {
  const normalized = String(value || "unknown").toLowerCase();
  return ALLOWED_AREAS.has(normalized) ? normalized : "unknown";
}

function severityForLevel(level: string): "INFO" | "WARNING" | "ERROR" | "CRITICAL" {
  if (level === "fatal") return "CRITICAL";
  if (level === "warning") return "WARNING";
  if (level === "info") return "INFO";
  return "ERROR";
}

function rateLimitKey(rawIp: string): string {
  return createHash("sha256")
    .update(`kgm-monitoring-v1:${rawIp}`)
    .digest("hex")
    .slice(0, 24);
}

function enforceRateLimit(rawIp: string): void {
  const now = Date.now();
  const key = rateLimitKey(rawIp || "unknown");
  const current = rateBuckets.get(key);

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
  } else {
    current.count += 1;
    if (current.count > RATE_LIMIT_PER_CLIENT) {
      throw new HttpsError("resource-exhausted", "오류 보고가 일시적으로 제한되었습니다.");
    }
  }

  if (rateBuckets.size > MAX_RATE_BUCKETS) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
        rateBuckets.delete(bucketKey);
      }
      if (rateBuckets.size <= MAX_RATE_BUCKETS) break;
    }
  }
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export const reportClientError = onCall(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 10,
    memory: "128MiB",
    maxInstances: 3,
  },
  async (request) => {
    enforceRateLimit(String(request.rawRequest?.ip || "unknown"));

    const data = readObject(request.data);
    const error = readObject(data.error);
    const context = readObject(data.context);

    const level = safeLevel(context.level);
    const eventId = safeLabel(data.eventId, "unknown");
    const message = redact(error.message || "Unknown client error");

    if (!message) {
      throw new HttpsError("invalid-argument", "오류 정보가 비어 있습니다.");
    }

    writeOperationalLog({
      severity: severityForLevel(level),
      message: "KGM client operational error",
      eventType: "client_error",
      data: {
        eventId,
        occurredAt: Number.isFinite(Number(data.occurredAt))
          ? Number(data.occurredAt)
          : Date.now(),
        release: safeLabel(data.release, "kgm-web@unknown"),
        environment: safeLabel(data.environment, "production"),
        route: safeRoute(data.route),
        platform: safeLabel(data.platform, "web"),
        deviceClass: safeLabel(data.deviceClass, "unknown"),
        online: typeof data.online === "boolean" ? data.online : null,
        authenticated: Boolean(request.auth?.uid),
        appCheck: request.app ? "valid" : "missing",
        error: {
          name: safeLabel(error.name, "Error"),
          message,
          stack: redact(error.stack || "", MAX_STACK_LENGTH),
        },
        context: {
          source: safeLabel(context.source, "unknown"),
          area: safeArea(context.area),
          action: safeLabel(context.action, ""),
          level,
          recovered:
            typeof context.recovered === "boolean"
              ? context.recovered
              : null,
        },
      },
    });

    return { ok: true, eventId };
  }
);
