// src/services/exchangeClient.js
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase/firebase";

/**
 * Cloud Functions region
 * - 백엔드가 asia-northeast3 이므로 동일하게 지정합니다.
 */
const functions = getFunctions(app, "asia-northeast3");

async function callExchangeFunction(name, payload) {
  const call = httpsCallable(functions, name);
  try {
    const res = await call(payload);
    return res?.data ?? { ok: false };
  } catch (err) {
    const rawCode = String(err?.code || "");
    const code = rawCode.startsWith("functions/")
      ? rawCode.slice("functions/".length)
      : rawCode;

    const detailsMessage =
      typeof err?.details === "string"
        ? err.details
        : typeof err?.details?.message === "string"
          ? err.details.message
          : "";

    const message =
      detailsMessage ||
      (typeof err?.message === "string"
        ? err.message.replace(/^FirebaseError:\s*/i, "")
        : "") ||
      "서버 요청 처리 중 오류가 발생했습니다.";

    const normalized = new Error(message);
    normalized.code =
      code ||
      (typeof err?.details?.code === "string" ? err.details.code : "");
    normalized.details = err?.details;
    throw normalized;
  }
}

/**
 * 예약/그룹 생성 (Functions: onCall)
 * @param {Object} payload
 * @param {string} payload.visitDate
 * @param {string} payload.visitTime
 * @param {string} payload.name
 * @param {string} payload.phone
 * @param {string|null=} payload.email
 * @param {boolean} payload.privacyConsent
 * @param {string} payload.privacyConsentVersion
 * @param {Array<{goldType:string; quantity:number; inputUnit:"g"|"don"; exchangeType:"999.9골드바"}>=} payload.products
 * @param {Record<string,unknown>|null=} payload.barsPlan
 * @returns {Promise<{ok:boolean, groupId?:string}>}
 */
export async function submitGoldExchangeGroup(payload) {
  return callExchangeFunction("requestGoldExchangeGroup", payload);
}

export async function rescheduleGoldExchangeGroup(payload) {
  return callExchangeFunction("rescheduleGoldExchangeGroup", payload);
}

export async function cancelGoldExchangeGroup(payload) {
  return callExchangeFunction("cancelGoldExchangeGroup", payload);
}
