// src/lib/memberOnboarding.js
import { sanitizeAppReturnPath } from "@/lib/authReturn";

const STORAGE_KEY = "kgm_member_onboarding_pending_v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function buildMemberOnboardingPath(returnTo = "/") {
  const safeReturn = sanitizeAppReturnPath(returnTo, "/");
  return `/welcome?next=${encodeURIComponent(safeReturn)}`;
}

export function markMemberOnboardingPending(returnTo = "/") {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        next: sanitizeAppReturnPath(returnTo, "/"),
        savedAt: Date.now(),
      })
    );
  } catch {}
}

export function readMemberOnboardingPath(fallback = "") {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt || 0);

    if (!savedAt || Date.now() - savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return fallback;
    }

    return buildMemberOnboardingPath(parsed?.next || "/");
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return fallback;
  }
}

export function clearMemberOnboardingPending() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
