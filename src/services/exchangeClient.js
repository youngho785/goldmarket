// src/services/exchangeClient.js
import { getFunctions, httpsCallable /* , httpsCallableFromURL */ } from "firebase/functions";
import { app } from "@/firebase/firebase";

/**
 * Cloud Functions region
 * - 백엔드가 asia-northeast3 이므로 동일하게 지정합니다.
 */
const functions = getFunctions(app, "asia-northeast3");

/**
 * 예약/그룹 생성 (Functions: onCall)
 * @param {Object} payload
 * @param {string} payload.visitDate   yyyy-MM-dd
 * @param {string} payload.visitTime   "HH:mm"
 * @param {string} payload.name
 * @param {string} payload.phone
 * @param {string} payload.address
 * @param {string|null=} payload.email
 * @param {Array<{goldType:string; quantity:number; inputUnit:"g"; exchangeType:"999.9골드바">>=} payload.products
 * @param {Record<string,unknown>|null=} payload.barsPlan
 * @returns {Promise<{ok:boolean, groupId?:string}>}
 */
export async function submitGoldExchangeGroup(payload) {
  // 기본: 함수 이름 기반 callable
  const call = httpsCallable(functions, "requestGoldExchangeGroup");

  // URL 기반을 강제로 쓰고 싶으면 위 대신 아래 사용
  // const call = httpsCallableFromURL(functions, "https://asia-northeast3-<proj>.cloudfunctions.net/requestGoldExchangeGroup");

  try {
    const res = await call(payload);
    return res?.data ?? { ok: false };
  } catch (err) {
    // FirebaseError: code 예) "functions/invalid-argument"
    const raw = err?.code || "";
    const code = raw.startsWith("functions/") ? raw.split("/")[1] : raw;

    const msg = err?.message || (typeof err?.details === "string" ? err.details : "callable error");
    const e = new Error(msg);
    // 호출부에서 코드로 분기할 수 있도록 부착
    e.code = code || (typeof err?.details?.code === "string" ? err.details.code : "");
    throw e;
  }
}
