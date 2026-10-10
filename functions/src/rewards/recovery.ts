import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { db } from "../core/runtime.js";
import { reconcileBonusUsageForGroup } from "./reconciliation.js";

// The group status is durable; retries always read its latest state.
export const recoverGoldExchangeBonus = onDocumentWritten({
  region: "asia-northeast3", document: "goldExchangeGroups/{groupId}",
  retry: true, timeoutSeconds: 60,
}, async event => {
  const ref = db().doc("goldExchangeGroups/" + event.params.groupId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const status = String(snap.get("repStatus") || "");
  const usage = String(snap.get("bonusGoldUsageStatus") || "");
  if (!["canceled", "rejected", "requested"].includes(status)) return;
  if (!["requested", "used"].includes(usage)) return;
  await reconcileBonusUsageForGroup({
    groupId: event.params.groupId, targetStatus: status,
    adminUid: String(snap.get("lastStatusChangedBy") || snap.get("cancellationRequestedBy") || "system"),
  });
});
