import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

const db = () => getFirestore();
export const auditGoldExchangeChanges = onDocumentWritten(
  { region: "asia-northeast3", document: "goldExchanges/{exchangeId}" },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    if (!event.data?.after?.exists) return;

    const beforeStatus = String(before.status || "");
    const afterStatus = String(after.status || "");
    const beforeVisitDate = String(before.visitDate || "");
    const beforeVisitTime = String(before.visitTime || "");
    const afterVisitDate = String(after.visitDate || "");
    const afterVisitTime = String(after.visitTime || "");
    const statusChanged = beforeStatus !== afterStatus;
    const scheduleChanged =
      beforeVisitDate !== afterVisitDate || beforeVisitTime !== afterVisitTime;
    if (!statusChanged && !scheduleChanged) return;

    const groupId = String(after.groupId || event.params.exchangeId);
    const actorUid = String(after.lastStatusChangedBy || "system");
    const changeType = String(after.scheduleChangeType || "");
    const reason = String(after.scheduleChangeReason || after.cancellationReason || "");
    const action = scheduleChanged
      ? "exchange_schedule_rescheduled"
      : afterStatus === "canceled"
        ? "exchange_canceled"
        : "exchange_status_changed";
    await db().doc(`adminAuditLogs/exchange-${event.id}`).set({
      action,
      groupId,
      exchangeId: event.params.exchangeId,
      actorUid,
      before: {
        status: beforeStatus || null,
        visitDate: beforeVisitDate || null,
        visitTime: beforeVisitTime || null,
      },
      after: {
        status: afterStatus || null,
        visitDate: afterVisitDate || null,
        visitTime: afterVisitTime || null,
        changeType: changeType || null,
        reason: reason || null,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

  }
);

export const auditBonusGoldChanges = onDocumentWritten(
  { region: "asia-northeast3", document: "goldExchangeGroups/{groupId}" },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    if (!event.data?.after?.exists) return;

    const beforeBonusStatus = String(before.bonusGoldUsageStatus || "");
    const afterBonusStatus = String(after.bonusGoldUsageStatus || "");
    const beforeRecognized = Number(before.finalRecognizedG || 0);
    const afterRecognized = Number(after.finalRecognizedG || 0);
    const beforeApplied = Number(before.finalAppliedG || 0);
    const afterApplied = Number(after.finalAppliedG || 0);
    if (
      beforeBonusStatus === afterBonusStatus &&
      beforeRecognized === afterRecognized &&
      beforeApplied === afterApplied
    ) {
      return;
    }

    const actorUid = String(
      after.bonusGoldUsedBy ||
      after.bonusGoldCanceledBy ||
      after.bonusGoldRestoredBy ||
      "system"
    );
    await db().doc(`adminAuditLogs/bonus-${event.id}`).set({
      action: "exchange_bonus_changed",
      groupId: event.params.groupId,
      actorUid,
      before: {
        bonusGoldUsageStatus: beforeBonusStatus || null,
        finalRecognizedG: beforeRecognized,
        finalAppliedG: beforeApplied,
      },
      after: {
        bonusGoldUsageStatus: afterBonusStatus || null,
        finalRecognizedG: afterRecognized,
        finalAppliedG: afterApplied,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  }
);
