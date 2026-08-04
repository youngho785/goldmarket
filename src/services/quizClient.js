// src/services/quizClient.js
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "@/firebase/firebase";

/**
 * 서버 callable: quizClaimGoldBonus
 * 요청: { answers: Record<string, number>, attemptId?: string }
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

/**
 * 회원가입 웰컴 순금 0.01g을 한 번만 적립합니다.
 * 서버 원장과 프로모션 문서가 중복 지급을 방지합니다.
 */
export async function claimWelcomeGoldBonus() {
  const fn = httpsCallable(functions, "welcomeClaimGoldBonus");
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    if (error?.code === "functions/unauthenticated") {
      throw new Error("로그인이 필요합니다.");
    }
    if (error?.code === "functions/unavailable") {
      throw new Error("서버가 혼잡합니다. 잠시 후 다시 확인해 주세요.");
    }
    throw new Error(error?.message || "웰컴 순금 적립을 확인하지 못했습니다.");
  }
}

/**
 * 퀵퀴즈 보너스 지급 요청
 * - 서버가 답안을 직접 채점합니다.
 * - attemptId가 없으면 자동 생성하여 멱등성 강화
 */
export async function claimGoldQuizBonus(payload) {
  const answers = payload?.answers;
  const requiredIds = ["q1", "q2", "q3", "q4", "q5"];
  if (
    !answers ||
    typeof answers !== "object" ||
    Array.isArray(answers) ||
    !requiredIds.every((id) => Number.isInteger(Number(answers[id])))
  ) {
    throw new Error("모든 퀴즈 답안이 필요합니다.");
  }
  const normalizedAnswers = Object.fromEntries(
    requiredIds.map((id) => [id, Number(answers[id])])
  );

  const attemptId =
    typeof payload?.attemptId === "string" && payload.attemptId.trim()
      ? payload.attemptId.trim().slice(0, 64)
      : createAttemptId();

  const fn = httpsCallable(functions, "quizClaimGoldBonus");

  try {
    const { data } = await fn({ answers: normalizedAnswers, attemptId });
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

/**
 * 로그인 사용자의 퀵퀴즈 수령 여부와 현재 보너스 잔액을 조회합니다.
 * 새 status callable이 아직 배포되지 않은 로컬 개발 환경에서는
 * 소유자에게 허용된 Firestore 문서를 읽어 기존 수령 여부를 표시합니다.
 */
export async function getGoldQuizBonusStatus(uid) {
  if (!uid) {
    return { ok: true, claimed: false, alreadyClaimed: false, creditedG: 0, balanceG: 0 };
  }

  const fn = httpsCallable(functions, "quizGetGoldBonusStatus");
  try {
    const { data } = await fn();
    return data;
  } catch (callError) {
    try {
      const [promoSnap, userSnap] = await Promise.all([
        getDoc(doc(db, "users", uid, "promotions", "gold_bonus_v1")),
        getDoc(doc(db, "users", uid)),
      ]);
      const promo = promoSnap.exists() ? promoSnap.data() : {};
      const user = userSnap.exists() ? userSnap.data() : {};
      const creditedG = Number(
        promo.creditedG ?? (Number(promo.creditedMilliGrams || 0) / 1000)
      );
      const storedBalanceG = Number(
        user.bonusGoldG ?? (Number(user.bonusGoldMilliGrams || 0) / 1000)
      );
      const claimed = promoSnap.exists();
      return {
        ok: true,
        claimed,
        alreadyClaimed: claimed,
        creditedG: Number.isFinite(creditedG) ? creditedG : 0,
        // 레거시 수령 문서는 배포된 status 함수가 최초 조회 시 실제 잔액으로 보정합니다.
        balanceG: Number.isFinite(storedBalanceG) && storedBalanceG > 0
          ? storedBalanceG
          : (claimed && Number.isFinite(creditedG) ? creditedG : 0),
        legacyFallback: true,
      };
    } catch {
      throw callError;
    }
  }
}

function bonusUsageError(error, fallback) {
  const code = String(error?.code || "");
  if (code === "functions/unauthenticated") return new Error("로그인이 필요합니다.");
  if (code === "functions/permission-denied") return new Error("처리 권한이 없습니다.");
  if (code === "functions/not-found") return new Error("연결된 금교환 예약을 찾을 수 없습니다.");
  if (code === "functions/failed-precondition") {
    return new Error(error?.message || "현재 상태에서는 적립 순금을 사용할 수 없습니다.");
  }
  return new Error(error?.message || fallback);
}

/** 현재 적립 순금 잔액, 사용 신청 상태, 연결 가능한 예약을 조회합니다. */
export async function getBonusGoldUsageState() {
  const fn = httpsCallable(functions, "bonusGetGoldUsageState");
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw bonusUsageError(error, "적립 순금 사용 상태를 확인하지 못했습니다.");
  }
}

/** 보유 적립 순금 전액을 선택한 금교환 예약에 사용 신청합니다. */
export async function requestBonusGoldUsage(groupId) {
  const fn = httpsCallable(functions, "bonusRequestGoldUsage");
  try {
    const { data } = await fn({ groupId });
    return data;
  } catch (error) {
    throw bonusUsageError(error, "적립 순금 사용을 신청하지 못했습니다.");
  }
}

/** 매장 확정 전 적립 순금 사용 신청을 취소합니다. */
export async function cancelBonusGoldUsage() {
  const fn = httpsCallable(functions, "bonusCancelGoldUsage");
  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw bonusUsageError(error, "적립 순금 사용 신청을 취소하지 못했습니다.");
  }
}
