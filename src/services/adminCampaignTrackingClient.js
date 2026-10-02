// src/services/adminCampaignTrackingClient.js
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/firebase/firebase";

const PENDING_KEY = "__kgm_admin_campaign_clicks__";
const MAX_PENDING = 10;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
let flushPromise = null;

function normalizeId(value, maxLength = 180) {
  const text = String(value || "").trim();
  if (!text || text.length > maxLength || text.includes("/")) return "";
  return text;
}

function readPending() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    return parsed
      .map((item) => ({
        batchId: normalizeId(item?.batchId, 100),
        notificationId: normalizeId(item?.notificationId, 180),
        savedAt: Number(item?.savedAt || 0),
      }))
      .filter(
        (item) =>
          item.batchId &&
          item.notificationId &&
          item.savedAt > 0 &&
          now - item.savedAt <= MAX_AGE_MS
      )
      .slice(-MAX_PENDING);
  } catch {
    return [];
  }
}

function writePending(items) {
  if (typeof window === "undefined") return;

  try {
    if (!items.length) {
      localStorage.removeItem(PENDING_KEY);
      return;
    }
    localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-MAX_PENDING)));
  } catch {}
}

export function queueAdminCampaignClick({ batchId, notificationId } = {}) {
  const normalizedBatchId = normalizeId(batchId, 100);
  const normalizedNotificationId = normalizeId(notificationId, 180);
  if (!normalizedBatchId || !normalizedNotificationId) return false;

  const pending = readPending();
  const key = `${normalizedBatchId}:${normalizedNotificationId}`;
  const withoutDuplicate = pending.filter(
    (item) => `${item.batchId}:${item.notificationId}` !== key
  );

  withoutDuplicate.push({
    batchId: normalizedBatchId,
    notificationId: normalizedNotificationId,
    savedAt: Date.now(),
  });
  writePending(withoutDuplicate);
  return true;
}

export async function flushPendingAdminCampaignClicks() {
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    if (!auth.currentUser?.uid) return 0;

    const pending = readPending();
    if (!pending.length) return 0;

    const callable = httpsCallable(functions, "recordAdminNotificationClick");
    const remaining = [];
    let completed = 0;

    for (const item of pending) {
      if (!auth.currentUser?.uid) {
        remaining.push(item);
        continue;
      }

      try {
        await callable({
          batchId: item.batchId,
          notificationId: item.notificationId,
        });
        completed += 1;
      } catch (error) {
        const code = String(error?.code || "");
        const terminal =
          code.includes("not-found") ||
          code.includes("permission-denied") ||
          code.includes("invalid-argument");

        if (!terminal) remaining.push(item);
      }
    }

    writePending(remaining);
    return completed;
  })();

  try {
    return await flushPromise;
  } finally {
    flushPromise = null;
  }
}
