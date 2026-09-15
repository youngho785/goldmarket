// src/services/myGoldAlertGoalsService.js
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "@/firebase/firebase";

export const MY_GOLD_ALERT_BAR_OPTIONS = Object.freeze([
  { grams: 1, label: "1g 골드바" },
  { grams: 3, label: "3g 골드바" },
  { grams: 3.75, label: "1돈 (3.75g) 골드바" },
  { grams: 5, label: "5g 골드바" },
  { grams: 7.5, label: "2돈 (7.5g) 골드바" },
  { grams: 10, label: "10g 골드바" },
  { grams: 11.25, label: "3돈 (11.25g) 골드바" },
  { grams: 18.75, label: "5돈 (18.75g) 골드바" },
  { grams: 20, label: "20g 골드바" },
  { grams: 30, label: "30g 골드바" },
  { grams: 37.5, label: "10돈 (37.5g) 골드바" },
  { grams: 50, label: "50g 골드바" },
  { grams: 56.25, label: "15돈 (56.25g) 골드바" },
  { grams: 75, label: "20돈 (75g) 골드바" },
  { grams: 100, label: "100g 골드바" },
  { grams: 500, label: "500g 골드바" },
]);

export const EMPTY_MY_GOLD_ALERT_GOALS = Object.freeze({
  enabled: false,
  valueTargetWon: null,
  priceTargetPerDon: null,
  priceDirection: "up",
  targetGoldBarG: null,
});

function normalizePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeMyGoldAlertGoals(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const normalized = {
    enabled: source.enabled === true,
    valueTargetWon: normalizePositiveNumber(source.valueTargetWon),
    priceTargetPerDon: normalizePositiveNumber(source.priceTargetPerDon),
    priceDirection: source.priceDirection === "down" ? "down" : "up",
    targetGoldBarG: normalizePositiveNumber(source.targetGoldBarG),
  };
  if (!normalized.valueTargetWon && !normalized.priceTargetPerDon && !normalized.targetGoldBarG) {
    normalized.enabled = false;
  }
  return normalized;
}

function readPushReady(data) {
  const preferences = data?.notificationPreferences || {};
  const hasExplicitTarget =
    !!data && Object.prototype.hasOwnProperty.call(data, "marketingFcmToken");
  const hasTarget = hasExplicitTarget
    ? typeof data?.marketingFcmToken === "string" && data.marketingFcmToken.trim().length >= 20
    : Array.isArray(data?.fcmTokens) && data.fcmTokens.some(
        (token) => typeof token === "string" && token.trim().length >= 20
      );
  return (
    data?.consents?.marketing?.accepted === true &&
    preferences.allEnabled !== false &&
    preferences.goldNews !== false &&
    hasTarget
  );
}

export async function getMyGoldAlertGoals(uid) {
  if (!uid) throw new Error("로그인이 필요합니다.");
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.exists() ? snap.data() || {} : {};
  return {
    goals: normalizeMyGoldAlertGoals(data.myGoldAlertGoals),
    state:
      data.myGoldAlertState && typeof data.myGoldAlertState === "object"
        ? data.myGoldAlertState
        : {},
    pushReady: readPushReady(data),
  };
}

function callableMessage(error, fallback) {
  const details =
    typeof error?.details === "string"
      ? error.details
      : typeof error?.details?.message === "string"
        ? error.details.message
        : "";
  return details || String(error?.message || "").replace(/^FirebaseError:\s*/i, "").trim() || fallback;
}

export async function saveMyGoldAlertGoals(goals) {
  const call = httpsCallable(functions, "saveMyGoldAlertGoals");
  try {
    const { data } = await call({ goals });
    return data || {};
  } catch (error) {
    const code = String(error?.code || "").replace(/^functions\//, "");
    if (code === "unauthenticated") throw new Error("로그인이 필요합니다.");
    if (code === "failed-precondition") {
      throw new Error(callableMessage(error, "회원 상태를 확인해 주세요."));
    }
    if (code === "invalid-argument") {
      throw new Error(callableMessage(error, "목표 값을 확인해 주세요."));
    }
    throw new Error(callableMessage(error, "MY GOLD 목표 알림을 저장하지 못했습니다."));
  }
}
