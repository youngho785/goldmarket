import {
  sanitizeClientEvent,
  sanitizeMonitoringContext,
  sanitizeRoute,
} from "./privacy.js";

const PENDING_STORAGE_KEY = "__kgm_monitoring_pending_v1__";
const MAX_PENDING_EVENTS = 3;
const MAX_EVENTS_PER_MINUTE = 6;
const MAX_EVENTS_PER_SESSION = 30;
const DEDUPE_WINDOW_MS = 30 * 1000;
const MINUTE_MS = 60 * 1000;

let monitoringTransport = null;
let initialized = false;
let sessionEventCount = 0;
const recentSendTimes = [];
const recentFingerprints = new Map();
let cleanupHandlers = [];

function runtimeRelease() {
  return String(import.meta.env?.VITE_KGM_RELEASE || "kgm-web@unknown");
}

function runtimeEnvironment() {
  if (import.meta.env?.MODE) return String(import.meta.env.MODE);
  return import.meta.env?.PROD ? "production" : "development";
}

function runtimePlatform() {
  if (typeof window === "undefined") return "server";
  const capacitor = window.Capacitor;
  const nativePlatform = capacitor?.getPlatform?.();
  if (nativePlatform === "android") return "android";
  if (nativePlatform === "ios") return "ios";
  return "web";
}

function runtimeDeviceClass() {
  if (typeof window === "undefined") return "unknown";
  try {
    if (window.matchMedia?.("(max-width: 767px)")?.matches) return "mobile";
  } catch {}
  return "desktop";
}

function currentRoute() {
  if (typeof window === "undefined") return "/";
  return sanitizeRoute(window.location?.pathname || "/");
}

function createEventId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}

  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createFingerprint(event) {
  const name = event?.error?.name || "Error";
  const message = event?.error?.message || "";
  const route = event?.route || "/";
  return `${name}|${message}|${route}`.slice(0, 1600);
}

function allowSend(event) {
  const now = Date.now();

  while (recentSendTimes.length && now - recentSendTimes[0] > MINUTE_MS) {
    recentSendTimes.shift();
  }

  for (const [key, lastAt] of recentFingerprints) {
    if (now - lastAt > DEDUPE_WINDOW_MS) recentFingerprints.delete(key);
  }

  if (sessionEventCount >= MAX_EVENTS_PER_SESSION) return false;
  if (recentSendTimes.length >= MAX_EVENTS_PER_MINUTE) return false;

  const fingerprint = createFingerprint(event);
  const lastSentAt = recentFingerprints.get(fingerprint) || 0;
  if (lastSentAt && now - lastSentAt < DEDUPE_WINDOW_MS) return false;

  recentFingerprints.set(fingerprint, now);
  recentSendTimes.push(now);
  sessionEventCount += 1;
  return true;
}

function readPendingEvents() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(PENDING_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(-MAX_PENDING_EVENTS) : [];
  } catch {
    return [];
  }
}

function writePendingEvents(events) {
  if (typeof window === "undefined") return;
  try {
    const limited = Array.isArray(events) ? events.slice(-MAX_PENDING_EVENTS) : [];
    if (limited.length) {
      window.sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(limited));
    } else {
      window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
    }
  } catch {}
}

function buildClientEvent(error, context = {}) {
  return sanitizeClientEvent({
    eventId: createEventId(),
    occurredAt: Date.now(),
    release: runtimeRelease(),
    environment: runtimeEnvironment(),
    route: currentRoute(),
    platform: runtimePlatform(),
    deviceClass: runtimeDeviceClass(),
    online:
      typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
        ? navigator.onLine
        : null,
    error,
    context: sanitizeMonitoringContext(context),
  });
}

async function dispatchEvent(event, { bypassLimits = false } = {}) {
  if (!monitoringTransport || typeof monitoringTransport.send !== "function") {
    return false;
  }

  const safeEvent = sanitizeClientEvent(event);
  if (!bypassLimits && !allowSend(safeEvent)) return false;

  try {
    const result = await monitoringTransport.send(safeEvent);
    return result !== false;
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.warn("[Monitoring] report delivery failed:", error?.message || error);
    }
    return false;
  }
}

export async function captureOperationalError(error, context = {}) {
  try {
    return await dispatchEvent(buildClientEvent(error, context));
  } catch {
    return false;
  }
}

export function queueOperationalError(error, context = {}) {
  try {
    const pending = readPendingEvents();
    pending.push(buildClientEvent(error, context));
    writePendingEvents(pending);
  } catch {}
}

async function flushPendingEvents() {
  const pending = readPendingEvents();
  if (!pending.length) return;

  const remaining = [];
  for (const event of pending) {
    const delivered = await dispatchEvent(event, { bypassLimits: true });
    if (!delivered) remaining.push(event);
  }
  writePendingEvents(remaining);
}

function installGlobalHandlers() {
  if (typeof window === "undefined") return [];

  const onWindowError = (event) => {
    const error = event?.error || event?.message || "Unhandled window error";
    void captureOperationalError(error, {
      source: "window.error",
      area: "app",
      action: "unhandled-error",
      level: "error",
    });
  };

  const onUnhandledRejection = (event) => {
    void captureOperationalError(event?.reason || "Unhandled promise rejection", {
      source: "window.unhandledrejection",
      area: "app",
      action: "unhandled-promise",
      level: "error",
    });
  };

  const onOnline = () => {
    void flushPendingEvents();
  };

  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("online", onOnline);

  return [
    () => window.removeEventListener("error", onWindowError),
    () => window.removeEventListener("unhandledrejection", onUnhandledRejection),
    () => window.removeEventListener("online", onOnline),
  ];
}

export function initializeOperationalMonitoring({ transport } = {}) {
  if (initialized) return;
  initialized = true;
  monitoringTransport = transport || null;
  cleanupHandlers = installGlobalHandlers();
  void flushPendingEvents();
}

export function shutdownOperationalMonitoring() {
  for (const cleanup of cleanupHandlers) {
    try {
      cleanup();
    } catch {}
  }
  cleanupHandlers = [];
  monitoringTransport = null;
  initialized = false;
}

export const monitoringInternals = {
  buildClientEvent,
  createFingerprint,
  allowSend,
};
