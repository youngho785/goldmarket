// Member gold bonuses and bonus-gold redemption lifecycle.
import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { createHash, randomInt } from "node:crypto";
import {
  db,
  msg,
  ENFORCE_APP_CHECK,
  requireCurrentAdmin,
  requireVerifiedUserRecord,
  roundTo3,
  buildValidatedBarsPlan,
  addNotificationForUser,
  addNotificationForAdmins,
} from "../core/runtime.js";
import { normalizeNotificationPreferences, readPushDevices } from "../notifications/shared.js";
import {
  type QuizBonusState,
  MARKETING_PUSH_BONUS_PROMO_ID,
  MARKETING_PUSH_BONUS_CREDIT_MG,
  MARKETING_PUSH_BONUS_CREDIT_G,
  WELCOME_BONUS_PROMO_ID,
  WELCOME_BONUS_CREDIT_MG,
  WELCOME_BONUS_CREDIT_G,
  QUIZ_BONUS_PROMO_ID,
  QUIZ_BONUS_CREDIT_MG,
  QUIZ_BONUS_CREDIT_G,
  benefitIdentityHashForVerifiedUser,
  benefitAccountHash,
  benefitClaimLockRef,
  benefitClaimedFromLock,
  recordBenefitClaimLock,
  toNonNegativeInteger,
  bonusBalanceMilliGrams,
  requestCreatedMillis,
  BENEFIT_BALANCE_CARRYOVER_LEDGER_SOURCE,
} from "./shared.js";

function marketingPushBonusConfigured(
  data: FirebaseFirestore.DocumentData | undefined,
  expectedToken = ""
): boolean {
  if (!data) return false;

  const token = String(data.marketingFcmToken || "").trim();
  if (!token || token.length < 20) return false;
  if (expectedToken && token !== expectedToken) return false;

  const marketingAccepted =
    data?.consents?.marketing?.accepted === true;
  const preferences = normalizeNotificationPreferences(
    data.notificationPreferences
  );

  if (
    !marketingAccepted ||
    preferences.allEnabled === false ||
    preferences.goldNews === false
  ) {
    return false;
  }

  const fcmTokens = Array.isArray(data.fcmTokens)
    ? data.fcmTokens.map((value: unknown) => String(value || "").trim())
    : [];

  if (!fcmTokens.includes(token)) return false;

  const devices = readPushDevices(data.pushDevices);
  return Object.values(devices).some(
    (entry) => String(entry?.token || "").trim() === token
  );
}

type BenefitCarryoverRestoreResult = {
  restoredNow: boolean;
  restoredG: number;
  restoredBalanceG: number;
  balanceG: number;
};

async function restoreBenefitBalanceCarryover(
  uid: string,
  identityHash: string
): Promise<BenefitCarryoverRestoreResult> {
  const userRef = db().doc(`users/${uid}`);
  const claimLockRef = benefitClaimLockRef(identityHash);
  const currentAccountHash = benefitAccountHash(identityHash, uid);

  return db().runTransaction(async (tx) => {
    const [userSnap, claimLockSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(claimLockRef),
    ]);

    const userData = userSnap.data();
    const currentBalanceMg = bonusBalanceMilliGrams(userData);
    const restoredBeforeMg = toNonNegativeInteger(
      userData?.bonusGoldCarryoverRestoredMilliGrams
    );
    const carryover = claimLockSnap.exists
      ? claimLockSnap.data()?.balanceCarryover
      : undefined;

    if (!carryover || String(carryover.state || "") !== "available") {
      return {
        restoredNow: false,
        restoredG: 0,
        restoredBalanceG: restoredBeforeMg / 1000,
        balanceG: currentBalanceMg / 1000,
      };
    }

    const sourceAccountHash = String(carryover.sourceAccountHash || "").trim();
    if (!sourceAccountHash || sourceAccountHash === currentAccountHash) {
      return {
        restoredNow: false,
        restoredG: 0,
        restoredBalanceG: restoredBeforeMg / 1000,
        balanceG: currentBalanceMg / 1000,
      };
    }

    const carryoverMg = toNonNegativeInteger(carryover.balanceMilliGrams);
    const archiveId = String(carryover.archiveId || "").trim().slice(0, 64);
    const now = FieldValue.serverTimestamp();
    const nextBalanceMg = currentBalanceMg + carryoverMg;

    if (carryoverMg > 0) {
      tx.set(
        userRef,
        {
          bonusGoldMilliGrams: nextBalanceMg,
          bonusGoldG: nextBalanceMg / 1000,
          bonusGoldUpdatedAt: now,
          bonusGoldCarryoverRestoredMilliGrams: carryoverMg,
          bonusGoldCarryoverRestoredG: carryoverMg / 1000,
          bonusGoldCarryoverRestoredAt: now,
          bonusGoldCarryoverArchiveId: archiveId || null,
        },
        { merge: true }
      );

      const ledgerId = `carryover_${archiveId || sourceAccountHash.slice(0, 32)}`;
      tx.set(
        userRef.collection("ledger").doc(ledgerId),
        {
          direction: "credit",
          amountMilliGrams: carryoverMg,
          amountG: carryoverMg / 1000,
          source: BENEFIT_BALANCE_CARRYOVER_LEDGER_SOURCE,
          createdAt: now,
          balanceApplied: true,
          restoredFromDeletedAccount: true,
        },
        { merge: true }
      );
    }

    tx.set(
      claimLockRef,
      {
        balanceCarryover: {
          schemaVersion: Number(carryover.schemaVersion || 1),
          archiveId: archiveId || sourceAccountHash.slice(0, 32),
          sourceAccountHash,
          balanceMilliGrams: carryoverMg,
          balanceG: carryoverMg / 1000,
          archivedAt: carryover.archivedAt || now,
          state: "restored",
          restoredAt: now,
        },
        updatedAt: now,
      },
      { merge: true }
    );

    return {
      restoredNow: carryoverMg > 0,
      restoredG: carryoverMg / 1000,
      restoredBalanceG: carryoverMg / 1000,
      balanceG: nextBalanceMg / 1000,
    };
  });
}

async function announceCarryoverRestore(
  uid: string,
  result: BenefitCarryoverRestoreResult
): Promise<void> {
  if (!result.restoredNow || result.restoredG <= 0) return;
  try {
    await addNotificationForUser(uid, {
      type: "bonus_gold_carryover_restored",
      title: "미사용 적립 순금 복원 완료",
      body: `이전 계정에서 사용하지 않은 순금 ${result.restoredG.toFixed(2)}g을 복원했습니다. 기존 혜택은 중복 지급되지 않습니다.`,
      link: "/profile",
      meta: {
        event: BENEFIT_BALANCE_CARRYOVER_LEDGER_SOURCE,
        restoredG: result.restoredG,
      },
    });
  } catch (error) {
    console.error("[benefitCarryover] 복원 알림 생성 실패", error);
  }
}

async function resolveMarketingPushBonusState(
  uid: string,
  identityHash: string,
  claimToken = ""
): Promise<QuizBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef
    .collection("promotions")
    .doc(MARKETING_PUSH_BONUS_PROMO_ID);
  const ledgerRef = userRef
    .collection("ledger")
    .doc(`marketing_${MARKETING_PUSH_BONUS_PROMO_ID}`);
  const claimLockRef = benefitClaimLockRef(identityHash);

  return db().runTransaction(async (tx) => {
    const [userSnap, promoSnap, claimLockSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(promoRef),
      tx.get(claimLockRef),
    ]);

    const userData = userSnap.data();
    const balanceMg = bonusBalanceMilliGrams(userData);

    if (promoSnap.exists) {
      const promo = promoSnap.data() || {};
      const creditedMg = toNonNegativeInteger(
        promo.creditedMilliGrams,
        Math.round(
          Number(
            promo.creditedG ||
              MARKETING_PUSH_BONUS_CREDIT_G
          ) * 1000
        )
      );

      if (!benefitClaimedFromLock(claimLockSnap, "marketingPush")) {
        recordBenefitClaimLock(
          tx,
          claimLockRef,
          "marketingPush",
          FieldValue.serverTimestamp()
        );
      }
      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: creditedMg / 1000,
        balanceG: balanceMg / 1000,
      };
    }

    if (benefitClaimedFromLock(claimLockSnap, "marketingPush")) {
      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: 0,
        balanceG: balanceMg / 1000,
      };
    }

    if (!claimToken) {
      return {
        ok: true,
        claimed: false,
        alreadyClaimed: false,
        claimedNow: false,
        creditedG: 0,
        balanceG: balanceMg / 1000,
      };
    }

    if (!marketingPushBonusConfigured(userData, claimToken)) {
      throw new HttpsError(
        "failed-precondition",
        "광고성 정보 수신동의(앱푸시)와 현재 기기의 푸시 등록을 먼저 완료해 주세요."
      );
    }

    const nextBalanceMg =
      balanceMg + MARKETING_PUSH_BONUS_CREDIT_MG;
    const now = FieldValue.serverTimestamp();

    tx.set(
      userRef,
      {
        bonusGoldMilliGrams: nextBalanceMg,
        bonusGoldG: nextBalanceMg / 1000,
        bonusGoldUpdatedAt: now,
      },
      { merge: true }
    );

    tx.create(promoRef, {
      creditedMilliGrams: MARKETING_PUSH_BONUS_CREDIT_MG,
      creditedG: MARKETING_PUSH_BONUS_CREDIT_G,
      claimedAt: now,
      source: MARKETING_PUSH_BONUS_PROMO_ID,
      marketingFcmTokenHash: createHash("sha256")
        .update(claimToken)
        .digest("hex"),
      balanceApplied: true,
      balanceAppliedAt: now,
    });

    tx.create(ledgerRef, {
      direction: "credit",
      amountMilliGrams: MARKETING_PUSH_BONUS_CREDIT_MG,
      amountG: MARKETING_PUSH_BONUS_CREDIT_G,
      source: MARKETING_PUSH_BONUS_PROMO_ID,
      createdAt: now,
    });
    recordBenefitClaimLock(tx, claimLockRef, "marketingPush", now);

    return {
      ok: true,
      claimed: true,
      alreadyClaimed: false,
      claimedNow: true,
      creditedG: MARKETING_PUSH_BONUS_CREDIT_G,
      balanceG: nextBalanceMg / 1000,
    };
  });
}

type WelcomeBonusState = {
  ok: true;
  claimed: true;
  alreadyClaimed: boolean;
  claimedNow: boolean;
  creditedG: number;
  balanceG: number;
};

async function resolveWelcomeBonusState(uid: string, identityHash: string): Promise<WelcomeBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef.collection("promotions").doc(WELCOME_BONUS_PROMO_ID);
  const ledgerRef = userRef.collection("ledger").doc(`welcome_${WELCOME_BONUS_PROMO_ID}`);
  const claimLockRef = benefitClaimLockRef(identityHash);

  return db().runTransaction(async (tx) => {
    const [userSnap, promoSnap, ledgerSnap, claimLockSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(promoRef),
      tx.get(ledgerRef),
      tx.get(claimLockRef),
    ]);

    let balanceMg = bonusBalanceMilliGrams(userSnap.data());

    if (promoSnap.exists) {
      const promo = promoSnap.data() || {};
      const creditedMg = toNonNegativeInteger(
        promo.creditedMilliGrams,
        Math.round(Number(promo.creditedG || WELCOME_BONUS_CREDIT_G) * 1000)
      );

      if (!ledgerSnap.exists) {
        balanceMg += creditedMg;
        tx.set(userRef, {
          bonusGoldMilliGrams: balanceMg,
          bonusGoldG: balanceMg / 1000,
          bonusGoldUpdatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        tx.set(ledgerRef, {
          direction: "credit",
          amountMilliGrams: creditedMg,
          amountG: creditedMg / 1000,
          source: WELCOME_BONUS_PROMO_ID,
          createdAt: FieldValue.serverTimestamp(),
          migratedFromLegacyClaim: true,
        });
      }

      if (!benefitClaimedFromLock(claimLockSnap, "welcome")) {
        recordBenefitClaimLock(
          tx,
          claimLockRef,
          "welcome",
          FieldValue.serverTimestamp()
        );
      }
      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: creditedMg / 1000,
        balanceG: balanceMg / 1000,
      };
    }

    if (benefitClaimedFromLock(claimLockSnap, "welcome")) {
      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: 0,
        balanceG: balanceMg / 1000,
      };
    }

    balanceMg += WELCOME_BONUS_CREDIT_MG;
    const now = FieldValue.serverTimestamp();
    tx.set(userRef, {
      bonusGoldMilliGrams: balanceMg,
      bonusGoldG: balanceMg / 1000,
      bonusGoldUpdatedAt: now,
    }, { merge: true });
    tx.create(promoRef, {
      creditedMilliGrams: WELCOME_BONUS_CREDIT_MG,
      creditedG: WELCOME_BONUS_CREDIT_G,
      claimedAt: now,
      source: WELCOME_BONUS_PROMO_ID,
      balanceApplied: true,
      balanceAppliedAt: now,
    });
    tx.create(ledgerRef, {
      direction: "credit",
      amountMilliGrams: WELCOME_BONUS_CREDIT_MG,
      amountG: WELCOME_BONUS_CREDIT_G,
      source: WELCOME_BONUS_PROMO_ID,
      createdAt: now,
    });
    recordBenefitClaimLock(tx, claimLockRef, "welcome", now);

    return {
      ok: true,
      claimed: true,
      alreadyClaimed: false,
      claimedNow: true,
      creditedG: WELCOME_BONUS_CREDIT_G,
      balanceG: balanceMg / 1000,
    };
  });
}

async function getQuizBonusState(uid: string, identityHash: string): Promise<QuizBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef.collection("promotions").doc(QUIZ_BONUS_PROMO_ID);
  const claimLockRef = benefitClaimLockRef(identityHash);
  const [userSnap, promoSnap, claimLockSnap] = await Promise.all([
    userRef.get(),
    promoRef.get(),
    claimLockRef.get(),
  ]);

  const balanceMg = bonusBalanceMilliGrams(userSnap.data());

  if (!promoSnap.exists && !benefitClaimedFromLock(claimLockSnap, "quiz")) {
    return {
      ok: true,
      claimed: false,
      alreadyClaimed: false,
      claimedNow: false,
      creditedG: 0,
      balanceG: balanceMg / 1000,
    };
  }

  if (!promoSnap.exists) {
    return {
      ok: true,
      claimed: true,
      alreadyClaimed: true,
      claimedNow: false,
      creditedG: 0,
      balanceG: balanceMg / 1000,
    };
  }

  const promo = promoSnap.data() || {};
  const creditedMg = toNonNegativeInteger(
    promo.creditedMilliGrams,
    Math.round(Number(promo.creditedG || QUIZ_BONUS_CREDIT_G) * 1000)
  );

  return {
    ok: true,
    claimed: true,
    alreadyClaimed: true,
    claimedNow: false,
    creditedG: creditedMg / 1000,
    balanceG: balanceMg / 1000,
  };
}

async function claimQuizBonusState(
  uid: string,
  identityHash: string,
  claim: { score: number; attemptId: string }
): Promise<QuizBonusState> {
  const userRef = db().doc(`users/${uid}`);
  const promoRef = userRef.collection("promotions").doc(QUIZ_BONUS_PROMO_ID);
  const ledgerRef = userRef.collection("ledger").doc(`quiz_${QUIZ_BONUS_PROMO_ID}`);
  const claimLockRef = benefitClaimLockRef(identityHash);

  return db().runTransaction(async (tx) => {
    const [userSnap, promoSnap, claimLockSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(promoRef),
      tx.get(claimLockRef),
    ]);

    const balanceMg = bonusBalanceMilliGrams(userSnap.data());

    if (promoSnap.exists) {
      const promo = promoSnap.data() || {};
      const creditedMg = toNonNegativeInteger(
        promo.creditedMilliGrams,
        Math.round(Number(promo.creditedG || QUIZ_BONUS_CREDIT_G) * 1000)
      );

      if (!benefitClaimedFromLock(claimLockSnap, "quiz")) {
        recordBenefitClaimLock(
          tx,
          claimLockRef,
          "quiz",
          FieldValue.serverTimestamp()
        );
      }
      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: creditedMg / 1000,
        balanceG: balanceMg / 1000,
      };
    }

    if (benefitClaimedFromLock(claimLockSnap, "quiz")) {
      return {
        ok: true,
        claimed: true,
        alreadyClaimed: true,
        claimedNow: false,
        creditedG: 0,
        balanceG: balanceMg / 1000,
      };
    }

    const nextBalanceMg = balanceMg + QUIZ_BONUS_CREDIT_MG;
    const now = FieldValue.serverTimestamp();

    tx.set(
      userRef,
      {
        bonusGoldMilliGrams: nextBalanceMg,
        bonusGoldG: nextBalanceMg / 1000,
        bonusGoldUpdatedAt: now,
      },
      { merge: true }
    );
    tx.create(promoRef, {
      creditedMilliGrams: QUIZ_BONUS_CREDIT_MG,
      creditedG: QUIZ_BONUS_CREDIT_G,
      score: claim.score,
      attemptId: claim.attemptId || null,
      claimedAt: now,
      source: QUIZ_BONUS_PROMO_ID,
      balanceApplied: true,
      balanceAppliedAt: now,
    });
    tx.create(ledgerRef, {
      direction: "credit",
      amountMilliGrams: QUIZ_BONUS_CREDIT_MG,
      amountG: QUIZ_BONUS_CREDIT_G,
      source: QUIZ_BONUS_PROMO_ID,
      createdAt: now,
    });
    recordBenefitClaimLock(tx, claimLockRef, "quiz", now);

    return {
      ok: true,
      claimed: true,
      alreadyClaimed: false,
      claimedNow: true,
      creditedG: QUIZ_BONUS_CREDIT_G,
      balanceG: nextBalanceMg / 1000,
    };
  });
}

export const welcomeClaimGoldBonus = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const verifiedUser = await requireVerifiedUserRecord(req.auth?.uid);
    const uid = verifiedUser.uid;
    const identityHash = benefitIdentityHashForVerifiedUser(verifiedUser);

    const carryover = await restoreBenefitBalanceCarryover(uid, identityHash);
    await announceCarryoverRestore(uid, carryover);
    const res = await resolveWelcomeBonusState(uid, identityHash);
    if (res.claimedNow) {
      try {
        await addNotificationForUser(uid, {
          type: "welcome_bonus",
          title: "웰컴 순금 적립 완료",
          body: `회원가입 웰컴 순금 ${res.creditedG.toFixed(2)}g이 적립되었습니다. 골드바 교환 시 사용할 수 있습니다.`,
          link: "/profile",
          meta: { event: WELCOME_BONUS_PROMO_ID, creditedG: res.creditedG },
        });
      } catch (error) {
        console.error("[welcomeClaimGoldBonus] 지급 알림 생성 실패", error);
      }
    }
    return res;
  }
);

export const marketingPushClaimGoldBonus = onCall(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    const verifiedUser = await requireVerifiedUserRecord(req.auth?.uid);
    const uid = verifiedUser.uid;
    const identityHash = benefitIdentityHashForVerifiedUser(verifiedUser);

    const carryover = await restoreBenefitBalanceCarryover(uid, identityHash);
    await announceCarryoverRestore(uid, carryover);

    // 이미 받은 인증 이메일은 알림 설정을 나중에 꺼도 회수하지 않습니다.
    const existing =
      await resolveMarketingPushBonusState(uid, identityHash);
    if (existing.claimed) return existing;

    const userRef = db().doc(`users/${uid}`);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    const token = String(
      userData?.marketingFcmToken || ""
    ).trim();

    if (!marketingPushBonusConfigured(userData, token)) {
      throw new HttpsError(
        "failed-precondition",
        "광고성 정보 수신동의(앱푸시)와 현재 기기의 푸시 등록을 먼저 완료해 주세요."
      );
    }

    // 임의 문자열을 토큰처럼 등록해서 보너스를 받는 것을 줄이기 위해
    // Firebase Messaging에 실제 등록 가능한 토큰인지 dry-run으로 확인합니다.
    try {
      await msg().send(
        {
          token,
          data: {
            event: "marketing_push_bonus_validation",
          },
        },
        true
      );
    } catch (error) {
      const code = String(
        (error as { code?: string })?.code || ""
      );
      console.warn(
        "[marketingPushClaimGoldBonus] token validation failed",
        { uid, code }
      );

      throw new HttpsError(
        "failed-precondition",
        "현재 기기의 알림 등록을 확인하지 못했습니다. 알림을 다시 허용한 뒤 시도해 주세요."
      );
    }

    // dry-run 뒤에도 트랜잭션 안에서 같은 토큰/동의 상태를 재확인합니다.
    const res =
      await resolveMarketingPushBonusState(uid, identityHash, token);

    if (res.claimedNow) {
      try {
        await addNotificationForUser(uid, {
          type: "marketing_push_bonus",
          title: "광고성 정보 수신 설정 순금 적립",
          body: `광고성 정보 수신 앱푸시 설정 혜택 순금 ${res.creditedG.toFixed(2)}g이 적립되었습니다. 골드바 교환 시 사용할 수 있습니다.`,
          link: "/profile",
          meta: {
            event: MARKETING_PUSH_BONUS_PROMO_ID,
            creditedG: res.creditedG,
          },
        });
      } catch (error) {
        console.error(
          "[marketingPushClaimGoldBonus] 지급 알림 생성 실패",
          error
        );
      }
    }

    return res;
  }
);

export const memberBonusGetStatus = onCall(
  {
    region: "asia-northeast3",
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (req) => {
    const verifiedUser = await requireVerifiedUserRecord(req.auth?.uid);
    const uid = verifiedUser.uid;
    const identityHash = benefitIdentityHashForVerifiedUser(verifiedUser);

    const carryover = await restoreBenefitBalanceCarryover(uid, identityHash);
    await announceCarryoverRestore(uid, carryover);

    const userRef = db().doc(`users/${uid}`);
    const claimLockRef = benefitClaimLockRef(identityHash);
    const [userSnap, welcomeSnap, marketingSnap, quizSnap, claimLockSnap] =
      await Promise.all([
        userRef.get(),
        userRef
          .collection("promotions")
          .doc(WELCOME_BONUS_PROMO_ID)
          .get(),
        userRef
          .collection("promotions")
          .doc(MARKETING_PUSH_BONUS_PROMO_ID)
          .get(),
        userRef
          .collection("promotions")
          .doc(QUIZ_BONUS_PROMO_ID)
          .get(),
        claimLockRef.get(),
      ]);

    const creditG = (
      snap: FirebaseFirestore.DocumentSnapshot,
      fallbackG: number
    ): number => {
      if (!snap.exists) return 0;
      const data = snap.data() || {};
      const mg = toNonNegativeInteger(
        data.creditedMilliGrams,
        Math.round(
          Number(data.creditedG || fallbackG) * 1000
        )
      );
      return mg / 1000;
    };

    const welcomeG = creditG(
      welcomeSnap,
      WELCOME_BONUS_CREDIT_G
    );
    const marketingG = creditG(
      marketingSnap,
      MARKETING_PUSH_BONUS_CREDIT_G
    );
    const quizG = creditG(
      quizSnap,
      QUIZ_BONUS_CREDIT_G
    );

    return {
      ok: true,
      maxG: 0.03,
      earnedG: roundTo3(
        welcomeG + marketingG + quizG
      ),
      balanceG:
        bonusBalanceMilliGrams(userSnap.data()) / 1000,
      restoredBalanceG: toNonNegativeInteger(
        userSnap.data()?.bonusGoldCarryoverRestoredMilliGrams
      ) / 1000,
      carryoverRestoredNow: carryover.restoredNow,
      rewards: {
        welcome: {
          claimed: welcomeSnap.exists || benefitClaimedFromLock(claimLockSnap, "welcome"),
          claimedThisAccount: welcomeSnap.exists,
          previouslyClaimed: !welcomeSnap.exists && benefitClaimedFromLock(claimLockSnap, "welcome"),
          creditedG: welcomeG,
        },
        marketingPush: {
          claimed: marketingSnap.exists || benefitClaimedFromLock(claimLockSnap, "marketingPush"),
          claimedThisAccount: marketingSnap.exists,
          previouslyClaimed: !marketingSnap.exists && benefitClaimedFromLock(claimLockSnap, "marketingPush"),
          creditedG: marketingG,
        },
        quiz: {
          claimed: quizSnap.exists || benefitClaimedFromLock(claimLockSnap, "quiz"),
          claimedThisAccount: quizSnap.exists,
          previouslyClaimed: !quizSnap.exists && benefitClaimedFromLock(claimLockSnap, "quiz"),
          creditedG: quizG,
        },
      },
    };
  }
);

export const quizGetGoldBonusStatus = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const verifiedUser = await requireVerifiedUserRecord(req.auth?.uid);
    const identityHash = benefitIdentityHashForVerifiedUser(verifiedUser);
    const carryover = await restoreBenefitBalanceCarryover(verifiedUser.uid, identityHash);
    await announceCarryoverRestore(verifiedUser.uid, carryover);
    return getQuizBonusState(verifiedUser.uid, identityHash);
  }
);

export const quizClaimGoldBonus = onCall<{
  answers: Record<string, number>;
  attemptId?: string;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const verifiedUser = await requireVerifiedUserRecord(req.auth?.uid);
    const uid = verifiedUser.uid;
    const identityHash = benefitIdentityHashForVerifiedUser(verifiedUser);
    const carryover = await restoreBenefitBalanceCarryover(uid, identityHash);
    await announceCarryoverRestore(uid, carryover);

    const answerKey: Record<string, number> = { q1: 0, q2: 0, q3: 1, q4: 0, q5: 0 };
    const answers = req.data?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      throw new HttpsError("invalid-argument", "퀴즈 답안이 필요합니다.");
    }
    const answerIds = Object.keys(answerKey);
    if (
      Object.keys(answers).length !== answerIds.length ||
      !answerIds.every((id) => Number.isInteger(Number(answers[id])))
    ) {
      throw new HttpsError("invalid-argument", "모든 퀴즈 답안을 제출해 주세요.");
    }
    const score = answerIds.reduce(
      (total, id) => total + (Number(answers[id]) === answerKey[id] ? 1 : 0),
      0
    );
    const attemptId =
      req.data?.attemptId ? String(req.data.attemptId).slice(0, 64) : "";

    if (score !== answerIds.length) {
      throw new HttpsError("failed-precondition", "아쉽지만 기준 점수 미달입니다.");
    }

    const res = await claimQuizBonusState(uid, identityHash, { score, attemptId });

    // 이미 수령한 계정에는 중복 알림을 만들지 않습니다.
    if (res.claimedNow) {
      try {
        await addNotificationForUser(uid, {
          type: "promo_bonus",
          title: "퀵퀴즈 보너스 지급",
          body: `축하합니다! ${res.creditedG.toFixed(2)}g 보너스가 적립되었습니다.`,
          link: "/profile",
          meta: { event: QUIZ_BONUS_PROMO_ID, creditedG: res.creditedG, score },
        });
      } catch (error) {
        console.error("[quizClaimGoldBonus] 보너스 지급 알림 생성 실패", error);
      }
    }

    return res;
  }
);

/* ─────────────────────────────────────────────────────────────
 * 적립 순금 사용 신청·매장 확정·복구
 * 잔액은 mg 정수로 보관하며, 모든 차감과 복구를 서버 트랜잭션으로 처리합니다.
 * ───────────────────────────────────────────────────────────── */
type BonusUsageStatus = "requested" | "used" | "canceled" | "restored";

function cleanGroupId(value: unknown): string {
  return String(value || "").trim().slice(0, 128);
}

function cleanUsageCode(value: unknown): string {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}


function publicBonusUsageRequest(data: FirebaseFirestore.DocumentData | undefined) {
  if (!data?.status) return null;
  const amountMg = toNonNegativeInteger(data.amountMilliGrams);
  return {
    status: String(data.status) as BonusUsageStatus,
    amountG: amountMg / 1000,
    groupId: String(data.groupId || ""),
    requestCode: data.status === "requested" ? String(data.requestCode || "") : "",
    visitDate: String(data.visitDate || ""),
    visitTime: String(data.visitTime || ""),
    finalRecognizedG: Number(data.finalRecognizedG || 0),
    finalAppliedG: Number(data.finalAppliedG || 0),
    createdAtMillis: requestCreatedMillis(data.createdAt),
    usedAtMillis: requestCreatedMillis(data.usedAt),
    canceledAtMillis: requestCreatedMillis(data.canceledAt),
    restoredAtMillis: requestCreatedMillis(data.restoredAt),
  };
}

export const bonusGetGoldUsageState = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const verifiedUser = await requireVerifiedUserRecord(req.auth?.uid);
    const uid = verifiedUser.uid;
    const identityHash = benefitIdentityHashForVerifiedUser(verifiedUser);
    const carryover = await restoreBenefitBalanceCarryover(uid, identityHash);
    await announceCarryoverRestore(uid, carryover);

    const userRef = db().doc(`users/${uid}`);
    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const groupsQuery = db().collection("goldExchangeGroups").where("ownerUid", "==", uid);
    const [userSnap, requestSnap, groupsSnap] = await Promise.all([
      userRef.get(),
      requestRef.get(),
      groupsQuery.get(),
    ]);

    const balanceMg = bonusBalanceMilliGrams(userSnap.data());
    const requestData = requestSnap.exists ? requestSnap.data() : undefined;
    const requestStatus = String(requestData?.status || "");
    const requestedMg = requestStatus === "requested"
      ? toNonNegativeInteger(requestData?.amountMilliGrams)
      : 0;

    const eligibleGroups = groupsSnap.docs
      .map((document) => {
        const data = document.data() || {};
        return {
          groupId: document.id,
          status: String(data.repStatus || "requested"),
          visitDate: String(data.visitDate || ""),
          visitTime: String(data.visitTime || ""),
          totalG: Number(data.totalG || 0),
        };
      })
      .filter((group) => !["completed", "canceled", "rejected"].includes(group.status))
      .sort((a, b) => `${a.visitDate} ${a.visitTime}`.localeCompare(`${b.visitDate} ${b.visitTime}`));

    return {
      ok: true,
      balanceG: balanceMg / 1000,
      spendableG: Math.max(0, balanceMg - requestedMg) / 1000,
      request: publicBonusUsageRequest(requestData),
      eligibleGroups,
    };
  }
);

export const bonusRequestGoldUsage = onCall<{ groupId: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const verifiedUser = await requireVerifiedUserRecord(req.auth?.uid);
    const uid = verifiedUser.uid;
    const identityHash = benefitIdentityHashForVerifiedUser(verifiedUser);
    const carryover = await restoreBenefitBalanceCarryover(uid, identityHash);
    await announceCarryoverRestore(uid, carryover);

    const groupId = cleanGroupId(req.data?.groupId);
    if (!groupId) {
      throw new HttpsError("invalid-argument", "적립 순금을 사용할 금교환 예약을 선택해 주세요.");
    }

    const userRef = db().doc(`users/${uid}`);
    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const groupRef = db().doc(`goldExchangeGroups/${groupId}`);

    const result = await db().runTransaction(async (tx) => {
      const [userSnap, requestSnap, groupSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(requestRef),
        tx.get(groupRef),
      ]);

      if (!groupSnap.exists || String(groupSnap.get("ownerUid") || "") !== uid) {
        throw new HttpsError("not-found", "본인의 금교환 예약을 찾을 수 없습니다.");
      }
      const groupStatus = String(groupSnap.get("repStatus") || "requested");
      if (["completed", "canceled", "rejected"].includes(groupStatus)) {
        throw new HttpsError("failed-precondition", "종료된 금교환 예약에는 사용할 수 없습니다.");
      }

      const existing = requestSnap.exists ? requestSnap.data() : undefined;
      if (existing?.status === "requested") {
        if (String(existing.groupId || "") !== groupId) {
          throw new HttpsError("failed-precondition", "이미 다른 예약에 사용 신청 중입니다.");
        }
        return {
          createdNow: false,
          balanceMg: bonusBalanceMilliGrams(userSnap.data()),
          request: publicBonusUsageRequest(existing),
        };
      }

      const balanceMg = bonusBalanceMilliGrams(userSnap.data());
      if (balanceMg <= 0) {
        throw new HttpsError("failed-precondition", "사용 가능한 적립 순금이 없습니다.");
      }

      const now = FieldValue.serverTimestamp();
      const requestCode = String(randomInt(100000, 1000000));
      const visitDate = String(groupSnap.get("visitDate") || "");
      const visitTime = String(groupSnap.get("visitTime") || "");
      const requestData = {
        uid,
        groupId,
        status: "requested" as BonusUsageStatus,
        amountMilliGrams: balanceMg,
        amountG: balanceMg / 1000,
        requestCode,
        visitDate,
        visitTime,
        createdAt: now,
        updatedAt: now,
      };

      tx.set(requestRef, requestData);
      tx.set(groupRef, {
        bonusGoldUsageStatus: "requested",
        bonusGoldRequestUid: uid,
        bonusGoldRequestedMilliGrams: balanceMg,
        bonusGoldRequestedG: balanceMg / 1000,
        bonusGoldRequestedAt: now,
        updatedAt: now,
      }, { merge: true });

      return {
        createdNow: true,
        balanceMg,
        request: {
          status: "requested" as BonusUsageStatus,
          amountG: balanceMg / 1000,
          groupId,
          requestCode,
          visitDate,
          visitTime,
        },
      };
    });

    if (result.createdNow) {
      const amountG = result.balanceMg / 1000;
      await Promise.allSettled([
        addNotificationForUser(uid, {
          type: "bonus_gold_usage_requested",
          title: "적립 순금 사용 신청 완료",
          body: `${amountG.toFixed(2)}g 사용 신청을 매장에서 확인합니다. 6자리 확인 코드를 준비해 주세요.`,
          link: "/profile",
          meta: { groupId, amountG },
        }),
        addNotificationForAdmins({
          type: "admin_bonus_gold_usage_requested",
          title: "적립 순금 사용 신청",
          body: `${amountG.toFixed(2)}g 사용 확인이 필요한 금교환 예약입니다.`,
          link: `/admin/gold-exchange?groupId=${encodeURIComponent(groupId)}`,
          meta: { groupId, customerUid: uid, amountG },
        }),
      ]);
    }

    return {
      ok: true,
      balanceG: result.balanceMg / 1000,
      spendableG: 0,
      request: result.request,
    };
  }
);

export const bonusCancelGoldUsage = onCall(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const result = await db().runTransaction(async (tx) => {
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists) {
        throw new HttpsError("not-found", "적립 순금 사용 신청을 찾을 수 없습니다.");
      }
      const data = requestSnap.data() || {};
      if (data.status !== "requested") {
        throw new HttpsError("failed-precondition", "매장 확정 전 신청만 취소할 수 있습니다.");
      }

      const groupId = cleanGroupId(data.groupId);
      const groupRef = db().doc(`goldExchangeGroups/${groupId}`);
      const groupSnap = await tx.get(groupRef);
      const now = FieldValue.serverTimestamp();
      tx.update(requestRef, { status: "canceled", canceledAt: now, updatedAt: now });
      if (groupSnap.exists && String(groupSnap.get("bonusGoldRequestUid") || "") === uid) {
        tx.set(groupRef, {
          bonusGoldUsageStatus: "canceled",
          bonusGoldCanceledAt: now,
          updatedAt: now,
        }, { merge: true });
      }
      return {
        groupId,
        amountG: toNonNegativeInteger(data.amountMilliGrams) / 1000,
      };
    });

    await Promise.allSettled([
      addNotificationForUser(uid, {
        type: "bonus_gold_usage_canceled",
        title: "적립 순금 사용 신청 취소",
        body: `${result.amountG.toFixed(2)}g이 다시 사용 가능한 상태입니다.`,
        link: "/profile",
        meta: { groupId: result.groupId, amountG: result.amountG },
      }),
      addNotificationForAdmins({
        type: "admin_bonus_gold_usage_canceled",
        title: "적립 순금 사용 신청 취소",
        body: "고객이 적립 순금 사용 신청을 취소했습니다.",
        link: `/admin/gold-exchange?groupId=${encodeURIComponent(result.groupId)}`,
        meta: { groupId: result.groupId, customerUid: uid },
      }),
    ]);

    return { ok: true, ...result };
  }
);

export const bonusAdminConfirmGoldUsage = onCall<{
  groupId: string;
  requestCode: string;
  finalRecognizedG: number;
}>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);
    const adminUid = req.auth?.uid || "admin";
    const groupId = cleanGroupId(req.data?.groupId);
    const requestCode = cleanUsageCode(req.data?.requestCode);
    const finalRecognizedG = Number(req.data?.finalRecognizedG);

    if (!groupId || requestCode.length !== 6) {
      throw new HttpsError(
        "invalid-argument",
        "교환번호와 고객의 6자리 확인 코드가 필요합니다."
      );
    }
    if (
      !Number.isFinite(finalRecognizedG) ||
      finalRecognizedG <= 0 ||
      finalRecognizedG > 1_000_000
    ) {
      throw new HttpsError(
        "invalid-argument",
        "현장에서 확인한 인정 순금 중량을 입력해 주세요."
      );
    }

    const exchangeQuery = db()
      .collection("goldExchanges")
      .where("groupId", "==", groupId);
    let exchangeDocs: FirebaseFirestore.DocumentSnapshot[] =
      (await exchangeQuery.get()).docs;

    if (exchangeDocs.length === 0) {
      const single = await db().doc(`goldExchanges/${groupId}`).get();
      if (single.exists) exchangeDocs = [single];
    }
    if (exchangeDocs.length === 0) {
      throw new HttpsError("not-found", "금교환 예약을 찾을 수 없습니다.");
    }

    // 가장 최근에 저장된 기존 교환 계획을 기준으로 선택 규격과 수량을 유지합니다.
    const sourcePlanDocument = [...exchangeDocs]
      .filter((document) => {
        const value = document.get("barsPlan");
        return !!value && typeof value === "object" && !Array.isArray(value);
      })
      .sort((a, b) => {
        const aMillis =
          requestCreatedMillis(a.get("updatedAt")) ?? 0;
        const bMillis =
          requestCreatedMillis(b.get("updatedAt")) ?? 0;
        return bMillis - aMillis;
      })[0];

    const sourceBarsPlan = sourcePlanDocument?.get("barsPlan") ?? null;
    const groupRef = db().doc(`goldExchangeGroups/${groupId}`);

    const result = await db().runTransaction(async (tx) => {
      const groupSnap = await tx.get(groupRef);
      if (!groupSnap.exists) {
        throw new HttpsError(
          "not-found",
          "금교환 예약 요약을 찾을 수 없습니다."
        );
      }

      const groupData = groupSnap.data() || {};
      const uid = String(
        groupData.bonusGoldRequestUid || groupData.ownerUid || ""
      );

      if (!uid || groupData.bonusGoldUsageStatus !== "requested") {
        throw new HttpsError(
          "failed-precondition",
          "확인 대기 중인 적립 순금 신청이 없습니다."
        );
      }

      const userRef = db().doc(`users/${uid}`);
      const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
      const ledgerRef = userRef.collection("ledger").doc(`redeem_${groupId}`);

      const [userSnap, requestSnap, ledgerSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(requestRef),
        tx.get(ledgerRef),
      ]);

      const requestData = requestSnap.exists ? requestSnap.data() || {} : {};

      if (
        requestData.status === "used" &&
        String(requestData.groupId || "") === groupId
      ) {
        return {
          alreadyUsed: true,
          uid,
          amountG: Number(requestData.amountG || 0),
          finalRecognizedG: Number(requestData.finalRecognizedG || 0),
          finalAppliedG: Number(requestData.finalAppliedG || 0),
          barsPlan:
            requestData.finalBarsPlan &&
            typeof requestData.finalBarsPlan === "object"
              ? requestData.finalBarsPlan
              : groupData.barsPlan || null,
        };
      }

      if (
        requestData.status !== "requested" ||
        String(requestData.groupId || "") !== groupId ||
        cleanUsageCode(requestData.requestCode) !== requestCode
      ) {
        throw new HttpsError(
          "failed-precondition",
          "고객의 6자리 확인 코드가 일치하지 않습니다."
        );
      }

      if (ledgerSnap.exists) {
        throw new HttpsError(
          "already-exists",
          "이미 차감 처리된 적립 순금입니다."
        );
      }

      const amountMg = toNonNegativeInteger(
        requestData.amountMilliGrams
      );
      const balanceMg = bonusBalanceMilliGrams(userSnap.data());

      if (amountMg <= 0 || balanceMg < amountMg) {
        throw new HttpsError(
          "failed-precondition",
          "고객의 적립 순금 잔액을 다시 확인해 주세요."
        );
      }

      const nextBalanceMg = balanceMg - amountMg;
      const amountG = amountMg / 1000;
      const recognizedG = roundTo3(finalRecognizedG);
      const finalAppliedG = roundTo3(recognizedG + amountG);

      // 기존에 고객이 선택한 골드바 규격과 수량을 유지한 채
      // 최종 적용 중량을 기준으로 잔여 중량과 자동 조합을 다시 계산합니다.
      const finalBarsPlan =
        sourceBarsPlan != null
          ? buildValidatedBarsPlan(sourceBarsPlan, finalAppliedG)
          : null;

      const now = FieldValue.serverTimestamp();

      tx.set(
        userRef,
        {
          bonusGoldMilliGrams: nextBalanceMg,
          bonusGoldG: nextBalanceMg / 1000,
          bonusGoldUpdatedAt: now,
        },
        { merge: true }
      );

      tx.update(requestRef, {
        status: "used",
        finalRecognizedG: recognizedG,
        finalAppliedG,
        finalBarsPlan,
        usedAt: now,
        usedBy: adminUid,
        updatedAt: now,
      });

      tx.create(ledgerRef, {
        direction: "debit",
        amountMilliGrams: amountMg,
        amountG,
        source: "gold_exchange_redemption",
        groupId,
        finalRecognizedG: recognizedG,
        finalAppliedG,
        finalBarsPlan,
        createdAt: now,
        createdBy: adminUid,
      });

      tx.set(
        groupRef,
        {
          bonusGoldUsageStatus: "used",
          bonusGoldUsedMilliGrams: amountMg,
          bonusGoldUsedG: amountG,
          bonusGoldUsedAt: now,
          bonusGoldUsedBy: adminUid,
          finalRecognizedG: recognizedG,
          finalAppliedG,
          ...(finalBarsPlan ? { barsPlan: finalBarsPlan } : {}),
          updatedAt: now,
        },
        { merge: true }
      );

      exchangeDocs.forEach((document) => {
        tx.set(
          document.ref,
          {
            bonusGoldUsageStatus: "used",
            bonusGoldUsedMilliGrams: amountMg,
            bonusGoldUsedG: amountG,
            bonusGoldUsedAt: now,
            bonusGoldUsedBy: adminUid,
            finalRecognizedG: recognizedG,
            finalAppliedG,
            ...(finalBarsPlan ? { barsPlan: finalBarsPlan } : {}),
            updatedAt: now,
          },
          { merge: true }
        );
      });

      return {
        alreadyUsed: false,
        uid,
        amountG,
        finalRecognizedG: recognizedG,
        finalAppliedG,
        barsPlan: finalBarsPlan,
      };
    });

    if (!result.alreadyUsed) {
      await addNotificationForUser(result.uid, {
        type: "bonus_gold_usage_completed",
        title: "적립 순금 사용 완료",
        body:
          `적립 순금 ${result.amountG.toFixed(2)}g을 적용해 ` +
          `최종 ${result.finalAppliedG.toFixed(3)}g으로 확인했습니다.`,
        link: "/my-exchanges",
        meta: {
          groupId,
          amountG: result.amountG,
          finalAppliedG: result.finalAppliedG,
        },
      });
    }

    return { ok: true, groupId, ...result };
  }
);

export const bonusAdminCancelGoldUsage = onCall<{ groupId: string; reason?: string }>(
  { region: "asia-northeast3", enforceAppCheck: ENFORCE_APP_CHECK },
  async (req) => {
    await requireCurrentAdmin(req.auth?.uid);
    const groupId = cleanGroupId(req.data?.groupId);
    const reason = String(req.data?.reason || "매장 확인 중 신청 취소").trim().slice(0, 200);
    if (!groupId) throw new HttpsError("invalid-argument", "교환번호가 필요합니다.");

    const groupRef = db().doc(`goldExchangeGroups/${groupId}`);
    const result = await db().runTransaction(async (tx) => {
      const groupSnap = await tx.get(groupRef);
      if (!groupSnap.exists || groupSnap.get("bonusGoldUsageStatus") !== "requested") {
        throw new HttpsError("failed-precondition", "취소할 적립 순금 사용 신청이 없습니다.");
      }
      const uid = String(groupSnap.get("bonusGoldRequestUid") || "");
      const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
      const requestSnap = await tx.get(requestRef);
      if (!requestSnap.exists || requestSnap.get("status") !== "requested") {
        throw new HttpsError("failed-precondition", "고객의 사용 신청 상태를 다시 확인해 주세요.");
      }
      const amountG = toNonNegativeInteger(requestSnap.get("amountMilliGrams")) / 1000;
      const now = FieldValue.serverTimestamp();
      tx.update(requestRef, { status: "canceled", reason, canceledAt: now, updatedAt: now });
      tx.set(groupRef, {
        bonusGoldUsageStatus: "canceled",
        bonusGoldCanceledAt: now,
        bonusGoldCanceledBy: req.auth?.uid || "admin",
        bonusGoldCancelReason: reason,
        updatedAt: now,
      }, { merge: true });
      return { uid, amountG };
    });

    await addNotificationForUser(result.uid, {
      type: "bonus_gold_usage_canceled",
      title: "적립 순금 사용 신청 취소",
      body: `${result.amountG.toFixed(2)}g 사용 신청이 취소되어 다시 사용할 수 있습니다.`,
      link: "/profile",
      meta: { groupId, amountG: result.amountG, reason },
    });
    return { ok: true, groupId, ...result };
  }
);

