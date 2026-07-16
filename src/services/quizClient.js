// src/services/quizClient.js
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/firebase";

/**
 * 서버 callable: quizClaimGoldBonus
 * 요청: { score: number, attemptId?: string }
 * 응답: { ok: boolean, alreadyClaimed?: boolean, creditedG?: number }
 */

/** 안전한 attemptId 생성 (브라우저/Node 모두 동작) */
function createAttemptId() {
  try {
    // 브라우저 환경
    const buf = new Uint8Array(16);
    (globalThis.crypto || window.crypto).getRandomValues(buf);
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // 폴백
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** 숫자 유효성 보정 */
function normalizeScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  // 정수 스코어만 전달 (서버는 임계값 비교만 사용)
  return Math.floor(n);
}

/**
 * 퀵퀴즈 보너스 지급 요청
 * - score만 전달하면 됩니다. (answers는 서버로 보내지 않음)
 * - attemptId가 없으면 자동 생성하여 멱등성 강화
 */
export async function claimGoldQuizBonus(payload) {
  const score = normalizeScore(payload?.score);
  if (score === null) {
    throw new Error("유효한 점수가 필요합니다.");
  }

  const attemptId =
    typeof payload?.attemptId === "string" && payload.attemptId.trim()
      ? payload.attemptId.trim().slice(0, 64)
      : createAttemptId();

  const fn = httpsCallable(functions, "quizClaimGoldBonus");

  try {
    const { data } = await fn({ score, attemptId });
    // 기대 응답: { ok, alreadyClaimed?, creditedG? }
    return data;
  } catch (e) {
    // Firebase HttpsError 정제
    const code = e?.code || "";
    const msg = e?.message || "요청 중 오류가 발생했습니다.";
    // 사용자 친화 메시지로 가공
    if (code === "functions/failed-precondition") {
      throw new Error("아쉽지만 기준 점수 미달입니다.");
    }
    if (code === "functions/unauthenticated") {
      throw new Error("로그인이 필요합니다.");
    }
    if (code === "functions/unavailable") {
      throw new Error("서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.");
    }
    // 그 외는 원본 메시지 사용
    throw new Error(msg);
  }
}
