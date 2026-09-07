// Keeps bonus-gold redemption state consistent when an exchange status changes.
import { FieldValue } from "firebase-admin/firestore";
import {
  db,
  roundTo3,
  buildValidatedBarsPlan,
  addNotificationForUser,
} from "../core/runtime.js";
import {
  requestCreatedMillis,
  toNonNegativeInteger,
  bonusBalanceMilliGrams,
} from "./shared.js";

export async function reconcileBonusUsageForGroup(args: {
  groupId: string;
  targetStatus: string;
  adminUid: string;
}): Promise<void> {
  const { groupId, targetStatus, adminUid } = args;
  const groupRef = db().doc(`goldExchangeGroups/${groupId}`);

  const exchangeQuery = db()
    .collection("goldExchanges")
    .where("groupId", "==", groupId);
  let exchangeDocs: FirebaseFirestore.DocumentSnapshot[] =
    (await exchangeQuery.get()).docs;

  if (exchangeDocs.length === 0) {
    const single = await db().doc(`goldExchanges/${groupId}`).get();
    if (single.exists) exchangeDocs = [single];
  }

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

  const result = await db().runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    if (!groupSnap.exists) return null;

    const groupData = groupSnap.data() || {};
    const usageStatus = String(groupData.bonusGoldUsageStatus || "");
    const uid = String(
      groupData.bonusGoldRequestUid || groupData.ownerUid || ""
    );

    if (!uid || !["requested", "used"].includes(usageStatus)) {
      return null;
    }

    const requestRef = db().doc(`bonusGoldRedemptionRequests/${uid}`);
    const requestSnap = await tx.get(requestRef);
    const requestData = requestSnap.exists
      ? requestSnap.data() || {}
      : {};
    const now = FieldValue.serverTimestamp();

    if (usageStatus === "requested") {
      if (!["canceled", "rejected"].includes(targetStatus)) {
        return null;
      }

      if (
        requestData.status === "requested" &&
        String(requestData.groupId || "") === groupId
      ) {
        tx.update(requestRef, {
          status: "canceled",
          reason: `exchange_${targetStatus}`,
          canceledAt: now,
          updatedAt: now,
        });
      }

      tx.set(
        groupRef,
        {
          bonusGoldUsageStatus: "canceled",
          bonusGoldCanceledAt: now,
          bonusGoldCanceledBy: adminUid,
          updatedAt: now,
        },
        { merge: true }
      );

      exchangeDocs.forEach((document) => {
        tx.set(
          document.ref,
          {
            bonusGoldUsageStatus: "canceled",
            bonusGoldCanceledAt: now,
            bonusGoldCanceledBy: adminUid,
            updatedAt: now,
          },
          { merge: true }
        );
      });

      return {
        uid,
        amountG:
          toNonNegativeInteger(
            groupData.bonusGoldRequestedMilliGrams
          ) / 1000,
        restored: false,
      };
    }

    const amountMg = toNonNegativeInteger(
      groupData.bonusGoldUsedMilliGrams
    );
    if (amountMg <= 0) return null;

    const userRef = db().doc(`users/${uid}`);
    const restoreLedgerRef = userRef
      .collection("ledger")
      .doc(`restore_${groupId}`);

    const [userSnap, restoreLedgerSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(restoreLedgerRef),
    ]);

    if (restoreLedgerSnap.exists) return null;

    const recognizedG = roundTo3(
      Number(
        groupData.finalRecognizedG ??
          requestData.finalRecognizedG ??
          0
      )
    );

    // 적립 순금 복구 시에는 현장 인정 중량만을 기준으로
    // 골드바 계획과 잔여 중량을 원상 복구합니다.
    const restoredBarsPlan =
      sourceBarsPlan != null && recognizedG > 0
        ? buildValidatedBarsPlan(sourceBarsPlan, recognizedG)
        : null;

    const nextBalanceMg =
      bonusBalanceMilliGrams(userSnap.data()) + amountMg;

    tx.set(
      userRef,
      {
        bonusGoldMilliGrams: nextBalanceMg,
        bonusGoldG: nextBalanceMg / 1000,
        bonusGoldUpdatedAt: now,
      },
      { merge: true }
    );

    if (
      requestSnap.exists &&
      String(requestData.groupId || "") === groupId
    ) {
      tx.update(requestRef, {
        status: "restored",
        restoredAt: now,
        restoredBy: adminUid,
        restoreReason: `exchange_${targetStatus}`,
        finalAppliedG: recognizedG,
        ...(restoredBarsPlan
          ? { finalBarsPlan: restoredBarsPlan }
          : {}),
        updatedAt: now,
      });
    }

    tx.create(restoreLedgerRef, {
      direction: "credit",
      amountMilliGrams: amountMg,
      amountG: amountMg / 1000,
      source: "gold_exchange_redemption_restore",
      groupId,
      reason: `exchange_${targetStatus}`,
      finalRecognizedG: recognizedG,
      finalAppliedG: recognizedG,
      ...(restoredBarsPlan ? { barsPlan: restoredBarsPlan } : {}),
      createdAt: now,
      createdBy: adminUid,
    });

    tx.set(
      groupRef,
      {
        bonusGoldUsageStatus: "restored",
        bonusGoldRestoredAt: now,
        bonusGoldRestoredBy: adminUid,
        finalAppliedG: recognizedG,
        ...(restoredBarsPlan ? { barsPlan: restoredBarsPlan } : {}),
        updatedAt: now,
      },
      { merge: true }
    );

    exchangeDocs.forEach((document) => {
      tx.set(
        document.ref,
        {
          bonusGoldUsageStatus: "restored",
          bonusGoldRestoredAt: now,
          bonusGoldRestoredBy: adminUid,
          finalAppliedG: recognizedG,
          ...(restoredBarsPlan ? { barsPlan: restoredBarsPlan } : {}),
          updatedAt: now,
        },
        { merge: true }
      );
    });

    return {
      uid,
      amountG: amountMg / 1000,
      restored: true,
    };
  });

  if (!result) return;

  await addNotificationForUser(result.uid, {
    type: result.restored
      ? "bonus_gold_usage_restored"
      : "bonus_gold_usage_canceled",
    title: result.restored
      ? "적립 순금이 복구되었습니다"
      : "적립 순금 사용 신청 취소",
    body: result.restored
      ? `교환 상태 변경으로 ${result.amountG.toFixed(2)}g이 다시 적립되었습니다.`
      : `${result.amountG.toFixed(2)}g 사용 신청이 취소되었습니다.`,
    link: "/profile",
    meta: {
      groupId,
      amountG: result.amountG,
      targetStatus,
    },
  });
}

