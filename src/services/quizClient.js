// src/services/quizClient.js
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { db, functions } from "@/firebase/firebase";

/** 안전한 attemptId 생성 (브라우저/Node 모두 동작) */
function createAttemptId() {
  try {
    const buf = new Uint8Array(16);
    (globalThis.crypto || window.crypto).getRandomValues(buf);
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
}

function normalizeCallableCode(error) {
  return String(error?.code || "").replace(/^functions\//, "");
}

function callableMessage(error, fallback) {
  const detailsMessage =
    typeof error?.details === "string"
      ? error.details
      : typeof error?.details?.message === "string"
        ? error.details.message
        : "";

  return (
    detailsMessage ||
    String(error?.message || "")
      .replace(/^FirebaseError:\s*/i, "")
      .trim() ||
    fallback
  );
}

export async function claimWelcomeGoldBonus() {
  const fn = httpsCallable(functions, "welcomeClaimGoldBonus");

  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    const code = normalizeCallableCode(error);
    if (code === "unauthenticated") {
      throw new Error("로그인이 필요합니다.");
    }
    if (code === "unavailable") {
      throw new Error(
        "서버가 혼잡합니다. 잠시 후 다시 확인해 주세요."
      );
    }
    throw new Error(
      callableMessage(
        error,
        "웰컴 순금 적립을 확인하지 못했습니다."
      )
    );
  }
}

export async function claimGoldQuizBonus(payload) {
  const answers = payload?.answers;
  const requiredIds = ["q1", "q2", "q3", "q4", "q5"];

  if (
    !answers ||
    typeof answers !== "object" ||
    Array.isArray(answers) ||
    !requiredIds.every((id) =>
      Number.isInteger(Number(answers[id]))
    )
  ) {
    throw new Error("모든 퀴즈 답안이 필요합니다.");
  }

  const normalizedAnswers = Object.fromEntries(
    requiredIds.map((id) => [id, Number(answers[id])])
  );

  const attemptId =
    typeof payload?.attemptId === "string" &&
    payload.attemptId.trim()
      ? payload.attemptId.trim().slice(0, 64)
      : createAttemptId();

  const fn = httpsCallable(functions, "quizClaimGoldBonus");

  try {
    const { data } = await fn({
      answers: normalizedAnswers,
      attemptId,
    });
    return data;
  } catch (error) {
    const code = normalizeCallableCode(error);

    if (code === "failed-precondition") {
      throw new Error("아쉽지만 기준 점수 미달입니다.");
    }
    if (code === "unauthenticated") {
      throw new Error("로그인이 필요합니다.");
    }
    if (code === "unavailable") {
      throw new Error(
        "서버가 혼잡합니다. 잠시 후 다시 시도해 주세요."
      );
    }

    throw new Error(
      callableMessage(error, "요청 중 오류가 발생했습니다.")
    );
  }
}

export async function getGoldQuizBonusStatus(uid) {
  if (!uid) {
    return {
      ok: true,
      claimed: false,
      alreadyClaimed: false,
      creditedG: 0,
      balanceG: 0,
    };
  }

  const fn = httpsCallable(functions, "quizGetGoldBonusStatus");

  try {
    const { data } = await fn();
    return data;
  } catch (callError) {
    try {
      const [promoSnap, userSnap] = await Promise.all([
        getDoc(
          doc(
            db,
            "users",
            uid,
            "promotions",
            "gold_bonus_v1"
          )
        ),
        getDoc(doc(db, "users", uid)),
      ]);

      const promo = promoSnap.exists() ? promoSnap.data() : {};
      const user = userSnap.exists() ? userSnap.data() : {};

      const creditedG = Number(
        promo.creditedG ??
          Number(promo.creditedMilliGrams || 0) / 1000
      );
      const storedBalanceG = Number(
        user.bonusGoldG ??
          Number(user.bonusGoldMilliGrams || 0) / 1000
      );
      const claimed = promoSnap.exists();

      return {
        ok: true,
        claimed,
        alreadyClaimed: claimed,
        creditedG: Number.isFinite(creditedG)
          ? creditedG
          : 0,
        balanceG:
          Number.isFinite(storedBalanceG) &&
          storedBalanceG > 0
            ? storedBalanceG
            : claimed && Number.isFinite(creditedG)
              ? creditedG
              : 0,
        legacyFallback: true,
      };
    } catch {
      throw callError;
    }
  }
}

function bonusUsageError(error, fallback) {
  const code = normalizeCallableCode(error);
  const message = callableMessage(error, fallback);

  if (code === "unauthenticated") {
    return new Error("로그인이 필요합니다.");
  }
  if (code === "permission-denied") {
    return new Error("처리 권한이 없습니다.");
  }
  if (code === "not-found") {
    return new Error(
      "연결된 금교환 예약을 찾을 수 없습니다."
    );
  }
  if (code === "already-exists") {
    return new Error(
      "이미 처리된 적립 순금 사용 내역입니다."
    );
  }
  if (code === "failed-precondition") {
    return new Error(
      message ||
        "현재 상태에서는 적립 순금을 사용할 수 없습니다."
    );
  }

  return new Error(message);
}

/** 현재 잔액, 사용 신청 상태, 연결 가능한 예약을 조회합니다. */
export async function getBonusGoldUsageState() {
  const fn = httpsCallable(
    functions,
    "bonusGetGoldUsageState"
  );

  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw bonusUsageError(
      error,
      "적립 순금 사용 상태를 확인하지 못했습니다."
    );
  }
}

/** 보유 적립 순금 전액을 선택한 예약에 잠금 신청합니다. */
export async function requestBonusGoldUsage(groupId) {
  const normalizedGroupId = String(groupId || "").trim();

  if (!normalizedGroupId) {
    throw new Error(
      "적립 순금을 사용할 금교환 예약을 선택해 주세요."
    );
  }

  const fn = httpsCallable(
    functions,
    "bonusRequestGoldUsage"
  );

  try {
    const { data } = await fn({
      groupId: normalizedGroupId,
    });
    return data;
  } catch (error) {
    throw bonusUsageError(
      error,
      "적립 순금 사용을 신청하지 못했습니다."
    );
  }
}

/** 매장 확정 전 잠금 신청을 취소합니다. */
export async function cancelBonusGoldUsage() {
  const fn = httpsCallable(
    functions,
    "bonusCancelGoldUsage"
  );

  try {
    const { data } = await fn();
    return data;
  } catch (error) {
    throw bonusUsageError(
      error,
      "적립 순금 사용 신청을 취소하지 못했습니다."
    );
  }
}
