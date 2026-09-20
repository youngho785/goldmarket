import { app } from "@/firebase/firebase";
import { platform } from "@/platform/runtime";

const ANALYTICS_DEBUG =
  String(import.meta.env?.VITE_PRODUCT_ANALYTICS_DEBUG || "")
    .trim()
    .toLowerCase() === "true";

const ANALYTICS_EXPLICITLY_ENABLED =
  String(import.meta.env?.VITE_PRODUCT_ANALYTICS_ENABLED || "")
    .trim()
    .toLowerCase() === "true";

const ANALYTICS_EXPLICITLY_DISABLED =
  String(import.meta.env?.VITE_PRODUCT_ANALYTICS_ENABLED || "")
    .trim()
    .toLowerCase() === "false";

const EVENT_PARAM_RULES = Object.freeze({
  landing_view: Object.freeze({}),
  landing_value_calculated: Object.freeze({
    gold_category: new Set(["14k", "18k", "pure_995", "pure_999", "pure_9999", "pure_other", "other"]),
    weight_band: new Set(["0_1g", "1_5g", "5_10g", "10_20g", "20_50g", "50_100g", "100g_plus"]),
  }),
  mygold_cta_clicked: Object.freeze({
    source: new Set(["landing"]),
  }),
  sign_up: Object.freeze({
    method: new Set(["email"]),
  }),
  mygold_first_item_created: Object.freeze({
    source: new Set(["manual", "guest_import", "calculator_import"]),
  }),
  exchange_calculated: Object.freeze({
    source_mode: new Set(["manual", "vault", "visit", "rebook", "resume"]),
    product_count: "bounded_integer",
  }),
  reservation_completed: Object.freeze({
    source_mode: new Set(["manual", "vault", "visit", "rebook", "resume"]),
    calculation_mode: new Set(["calculated", "visit_only"]),
  }),
});

let analyticsModulePromise = null;
let analyticsPromise = null;

function shouldEnableAnalytics() {
  if (typeof window === "undefined") return false;
  if (ANALYTICS_EXPLICITLY_DISABLED) return false;
  if (import.meta.env.PROD) return true;
  return ANALYTICS_DEBUG || ANALYTICS_EXPLICITLY_ENABLED;
}

function getAnalyticsModule() {
  if (!analyticsModulePromise) {
    analyticsModulePromise = import("firebase/analytics");
  }
  return analyticsModulePromise;
}

export async function initializeProductAnalytics() {
  if (!shouldEnableAnalytics()) return null;
  if (analyticsPromise) return analyticsPromise;

  analyticsPromise = (async () => {
    const analyticsModule = await getAnalyticsModule();
    const supported = await analyticsModule.isSupported();
    if (!supported) return null;

    // Automatic page_view is intentionally disabled. Some auth routes can carry
    // one-time query parameters, so KGM logs only explicit, allowlisted product
    // events instead of forwarding route URLs or query strings to Analytics.
    const analytics = analyticsModule.initializeAnalytics(app, {
      config: { send_page_view: false },
    });

    analyticsModule.setDefaultEventParameters({
      app_surface: ["android", "ios", "web"].includes(platform) ? platform : "web",
    });

    return analytics;
  })().catch((error) => {
    if (import.meta.env.DEV) {
      console.warn("[Analytics] initialization skipped:", error?.message || error);
    }
    return null;
  });

  return analyticsPromise;
}

function sanitizeParams(eventName, params) {
  const rules = EVENT_PARAM_RULES[eventName];
  if (!rules) return null;

  const safe = {};
  const source = params && typeof params === "object" ? params : {};

  Object.entries(rules).forEach(([key, rule]) => {
    const value = source[key];

    if (rule === "bounded_integer") {
      const number = Number(value);
      if (Number.isInteger(number) && number >= 1 && number <= 20) {
        safe[key] = number;
      }
      return;
    }

    if (rule instanceof Set && rule.has(value)) {
      safe[key] = value;
    }
  });

  if (ANALYTICS_DEBUG) {
    safe.debug_mode = true;
  }

  return safe;
}

export async function trackProductEvent(eventName, params = {}) {
  const safeParams = sanitizeParams(eventName, params);
  if (!safeParams) return false;

  const analytics = await initializeProductAnalytics();
  if (!analytics) return false;

  try {
    const analyticsModule = await getAnalyticsModule();
    analyticsModule.logEvent(analytics, eventName, safeParams);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[Analytics] event skipped:", eventName, error?.message || error);
    }
    return false;
  }
}

export function trackProductEventOncePerSession(eventName, params = {}, onceKey = eventName) {
  if (typeof window === "undefined") return false;

  const storageKey = `kgm.analytics.session.${String(onceKey || eventName)}`;
  try {
    if (window.sessionStorage.getItem(storageKey) === "1") return false;
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Storage can be unavailable in hardened/private browser contexts. In that
    // case log normally rather than breaking a product action.
  }

  void trackProductEvent(eventName, params);
  return true;
}

export function getAnalyticsWeightBand(weightG) {
  const grams = Number(weightG);
  if (!Number.isFinite(grams) || grams <= 0) return null;
  if (grams <= 1) return "0_1g";
  if (grams <= 5) return "1_5g";
  if (grams <= 10) return "5_10g";
  if (grams <= 20) return "10_20g";
  if (grams <= 50) return "20_50g";
  if (grams <= 100) return "50_100g";
  return "100g_plus";
}

export function getAnalyticsGoldCategory(product) {
  const text = `${product?.productId || ""} ${product?.goldType || ""} ${product?.value || ""}`.toLowerCase();

  if (/14k|585/.test(text)) return "14k";
  if (/18k|750/.test(text)) return "18k";
  if (/999[.]?9|9999/.test(text)) return "pure_9999";
  if (/99[.]?9|\b999\b|24k/.test(text)) return "pure_999";
  if (/99[.]?5|\b995\b/.test(text)) return "pure_995";
  if (/순금|pure/.test(text)) return "pure_other";
  return "other";
}
