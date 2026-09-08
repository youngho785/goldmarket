// Shared admin/member MY GOLD aggregation helpers.
import { db } from "../core/runtime.js";
import {
  marketingPushEnabled,
  normalizeNotificationPreferences,
} from "../notifications/shared.js";

export function adminBonusGoldGrams(
  data: FirebaseFirestore.DocumentData | undefined
): number {
  const milliGrams = Number(data?.bonusGoldMilliGrams);
  if (Number.isFinite(milliGrams) && milliGrams >= 0) {
    return milliGrams / 1000;
  }

  const legacyG = Number(data?.bonusGoldG || 0);
  return Number.isFinite(legacyG) && legacyG > 0 ? legacyG : 0;
}

export function adminMarketingConsentAccepted(
  data: FirebaseFirestore.DocumentData | undefined
): boolean {
  return data?.consents?.marketing?.accepted === true;
}

export function adminMarketingPushReady(
  data: FirebaseFirestore.DocumentData | undefined
): boolean {
  if (!data) return false;

  const preferences = normalizeNotificationPreferences(
    data.notificationPreferences
  );
  if (!marketingPushEnabled(data, preferences)) return false;

  const hasExplicitTarget = Object.prototype.hasOwnProperty.call(
    data,
    "marketingFcmToken"
  );
  if (hasExplicitTarget) {
    return typeof data.marketingFcmToken === "string" &&
      data.marketingFcmToken.trim().length >= 20;
  }

  return Array.isArray(data.fcmTokens) &&
    data.fcmTokens.some(
      (token: unknown) => typeof token === "string" && token.trim().length >= 20
    );
}

function firestoreDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (!value || typeof value !== "object") return null;

  const candidate = value as { toDate?: () => Date };
  if (typeof candidate.toDate !== "function") return null;

  try {
    const result = candidate.toDate();
    return result instanceof Date && Number.isFinite(result.getTime()) ? result : null;
  } catch {
    return null;
  }
}

export async function loadGoldVaultActivity(options: {
  todayStart?: Date;
  weekStart?: Date;
} = {}): Promise<{
  itemCount: number;
  activeUids: Set<string>;
  todayItemCount: number;
  weekItemCount: number;
}> {
  const snapshot = await db()
    .collectionGroup("goldVaultItems")
    .select("createdAt")
    .get();
  const activeUids = new Set<string>();
  let todayItemCount = 0;
  let weekItemCount = 0;

  snapshot.docs.forEach((document) => {
    const ownerRef = document.ref.parent.parent;
    if (ownerRef?.id) activeUids.add(ownerRef.id);

    const createdAt = firestoreDate(document.get("createdAt"));
    if (!createdAt) return;
    if (options.todayStart && createdAt >= options.todayStart) {
      todayItemCount += 1;
    }
    if (options.weekStart && createdAt >= options.weekStart) {
      weekItemCount += 1;
    }
  });

  return {
    itemCount: snapshot.size,
    activeUids,
    todayItemCount,
    weekItemCount,
  };
}
