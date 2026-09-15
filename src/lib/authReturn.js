// src/lib/authReturn.js

const AUTH_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/reset-password",
];

function isAuthPath(pathname) {
  return AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/**
 * 앱 내부 경로만 복귀 대상으로 허용합니다.
 */
export function sanitizeAppReturnPath(value, fallback = "/") {
  const safeFallback =
    typeof fallback === "string" &&
    fallback.startsWith("/") &&
    !fallback.startsWith("//")
      ? fallback
      : "/";

  if (typeof value !== "string") return safeFallback;

  const trimmed = value.trim();
  if (
    !trimmed ||
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.length > 500
  ) {
    return safeFallback;
  }

  try {
    const url = new URL(trimmed, "https://kgm.local");
    if (isAuthPath(url.pathname)) return safeFallback;
    return `${url.pathname}${url.search}${url.hash}` || safeFallback;
  } catch {
    return safeFallback;
  }
}

function legacyFromToPath(value) {
  if (value === "gold-price") return "/gold-price";
  return value;
}

/**
 * 우선순위:
 * 1) ?next=
 * 2) ?continueUrl=
 * 3) location.state.from
 * 4) 레거시 ?from=gold-price / ?from=/path
 */
export function getAuthReturnPath(location, fallback = "/") {
  const params = new URLSearchParams(location?.search || "");
  const candidates = [
    params.get("next"),
    params.get("continueUrl"),
    location?.state?.from,
    legacyFromToPath(params.get("from")),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const safe = sanitizeAppReturnPath(candidate, "");
    if (safe) return safe;
  }

  return sanitizeAppReturnPath(fallback, "/");
}

export function buildAuthPath(basePath, returnTo = "/") {
  const safeBase =
    basePath === "/register" || basePath === "/login"
      ? basePath
      : "/login";
  const safeReturn = sanitizeAppReturnPath(returnTo, "/");
  return `${safeBase}?next=${encodeURIComponent(safeReturn)}`;
}

export function buildVerifyEmailPath(returnTo = "/") {
  const safeReturn = sanitizeAppReturnPath(returnTo, "/");
  return `/verify-email?continueUrl=${encodeURIComponent(safeReturn)}`;
}
