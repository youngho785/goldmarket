// Shared member-benefit identity, ledger, and bonus helpers.
import { type UserRecord } from "firebase-admin/auth";
import { HttpsError } from "firebase-functions/v2/https";
import { createHash } from "node:crypto";
import { db } from "../core/runtime.js";

export const QUIZ_BONUS_PROMO_ID = "gold_bonus_v1";
export const QUIZ_BONUS_CREDIT_MG = 10;
export const QUIZ_BONUS_CREDIT_G = QUIZ_BONUS_CREDIT_MG / 1000;
export const WELCOME_BONUS_PROMO_ID = "welcome_gold_v1";
export const WELCOME_BONUS_CREDIT_MG = 10;
export const WELCOME_BONUS_CREDIT_G = WELCOME_BONUS_CREDIT_MG / 1000;
export const MARKETING_PUSH_BONUS_PROMO_ID = "marketing_push_bonus_v1";
export const MARKETING_PUSH_BONUS_CREDIT_MG = 10;
export const MARKETING_PUSH_BONUS_CREDIT_G =
  MARKETING_PUSH_BONUS_CREDIT_MG / 1000;
export const BENEFIT_CLAIM_LOCK_COLLECTION = "benefitClaimLocks";
export const BENEFIT_IDENTITY_TYPE = "verified_email_sha256_v1";
export type BenefitRewardKey = "welcome" | "quiz" | "marketingPush";

export const BENEFIT_PROMO_ID_BY_KEY: Record<BenefitRewardKey, string> = {
  welcome: WELCOME_BONUS_PROMO_ID,
  quiz: QUIZ_BONUS_PROMO_ID,
  marketingPush: MARKETING_PUSH_BONUS_PROMO_ID,
};

export function benefitIdentityHashFromEmail(value: unknown): string {
  const email = String(value || "").trim().toLowerCase();
  if (!email) return "";
  return createHash("sha256")
    .update(`koreagoldmarket-benefit-v1|${email}`)
    .digest("hex");
}

export function benefitIdentityHashForVerifiedUser(userRecord: UserRecord): string {
  if (!userRecord.emailVerified) {
    throw new HttpsError(
      "failed-precondition",
      "이메일 인증을 완료한 회원만 순금 혜택을 받을 수 있습니다."
    );
  }
  const identityHash = benefitIdentityHashFromEmail(userRecord.email);
  if (!identityHash) {
    throw new HttpsError(
      "failed-precondition",
      "인증 이메일 정보를 확인한 뒤 다시 시도해 주세요."
    );
  }
  return identityHash;
}

export function benefitClaimLockRef(identityHash: string): FirebaseFirestore.DocumentReference {
  return db().doc(`${BENEFIT_CLAIM_LOCK_COLLECTION}/${identityHash}`);
}

export function benefitClaimedFromLock(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  rewardKey: BenefitRewardKey
): boolean {
  const claims = snapshot.exists ? snapshot.data()?.claims : undefined;
  return claims?.[rewardKey]?.claimed === true;
}

export function recordBenefitClaimLock(
  tx: FirebaseFirestore.Transaction,
  lockRef: FirebaseFirestore.DocumentReference,
  rewardKey: BenefitRewardKey,
  at: FirebaseFirestore.FieldValue
): void {
  tx.set(
    lockRef,
    {
      schemaVersion: 1,
      identityType: BENEFIT_IDENTITY_TYPE,
      claims: {
        [rewardKey]: {
          claimed: true,
          promoId: BENEFIT_PROMO_ID_BY_KEY[rewardKey],
          recordedAt: at,
        },
      },
      updatedAt: at,
    },
    { merge: true }
  );
}

export type QuizBonusState = {
  ok: true;
  claimed: boolean;
  alreadyClaimed: boolean;
  claimedNow: boolean;
  creditedG: number;
  balanceG: number;
};

export function toNonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

export function bonusBalanceMilliGrams(data: FirebaseFirestore.DocumentData | undefined): number {
  if (Number.isFinite(Number(data?.bonusGoldMilliGrams))) {
    return toNonNegativeInteger(data?.bonusGoldMilliGrams);
  }
  const legacyG = Number(data?.bonusGoldG || 0);
  return Number.isFinite(legacyG) && legacyG > 0 ? Math.round(legacyG * 1000) : 0;
}

export function requestCreatedMillis(value: unknown): number | null {
  if (value && typeof (value as FirebaseFirestore.Timestamp).toMillis === "function") {
    return (value as FirebaseFirestore.Timestamp).toMillis();
  }
  const parsed = new Date(String(value || "")).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}
