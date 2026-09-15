import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("SAFETY STOP: test-release-safety.mjs must run against the Firestore emulator");
}

const projectId = process.env.GCLOUD_PROJECT || "demo-goldmarket";
const app = initializeApp({ projectId }, `release-safety-${Date.now()}`);
const firestore = getFirestore(app);

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing source end marker: ${endMarker}`);
  return source.slice(start, end);
}

async function verifySourceGuards() {
  const sourcePath = path.resolve(import.meta.dirname, "../src/index.ts");
  const source = fs.readFileSync(sourcePath, "utf8");

  const statusSection = sourceSection(
    source,
    "export const setExchangeGroupStatus",
    "export const aggregateGoldExchangeGroup"
  );
  assert.doesNotMatch(
    statusSection,
    /groupMetaRef\.get\(\)/,
    "bonus usage status must not be read outside the completion transaction"
  );
  assert.match(
    statusSection,
    /tx\.get\(groupMetaRef\)/,
    "completion transaction must read goldExchangeGroups/{groupId}"
  );
  assert.match(
    statusSection,
    /status === "completed"[\s\S]*bonusUsageStatus === "requested"/,
    "completion transaction must block pending bonus usage"
  );

  const rewardsSource = fs.readFileSync(
    path.resolve(import.meta.dirname, "../src/rewards/functions.ts"),
    "utf8"
  );
  const rewardSharedSource = fs.readFileSync(
    path.resolve(import.meta.dirname, "../src/rewards/shared.ts"),
    "utf8"
  );
  const accountSource = fs.readFileSync(
    path.resolve(import.meta.dirname, "../src/account/functions.ts"),
    "utf8"
  );
  assert.match(rewardSharedSource, /BENEFIT_CLAIM_LOCK_COLLECTION = "benefitClaimLocks"/);
  assert.match(rewardsSource, /benefitClaimedFromLock\(claimLockSnap, "welcome"\)/);
  assert.match(rewardsSource, /benefitClaimedFromLock\(claimLockSnap, "quiz"\)/);
  assert.match(rewardsSource, /benefitClaimedFromLock\(claimLockSnap, "marketingPush"\)/);
  assert.match(accountSource, /name: "benefitClaimLocks"/);
  assert.match(rewardSharedSource, /BENEFIT_BALANCE_CARRYOVER_SCHEMA_VERSION = 1/);
  assert.match(rewardsSource, /restoreBenefitBalanceCarryover/);
  assert.match(rewardsSource, /balanceCarryover[\s\S]*state: "restored"/);
  assert.match(accountSource, /balanceCarryover[\s\S]*state: "available"/);
  assert.match(accountSource, /bonusGoldCarriedOverAt/);

  const roleSection = sourceSection(source, "export const setUserRole", "function adminBonusGoldGrams");
  assert.match(roleSection, /revokeRefreshTokens\(uid\)/);
  assert.match(roleSection, /action: "user_role_changed"/);

  const disabledSection = sourceSection(
    source,
    "export const setAdminUserDisabled",
    "function normalizeRateTable"
  );
  assert.match(disabledSection, /if \(disabled\)[\s\S]*revokeRefreshTokens\(uid\)/);
  assert.doesNotMatch(source, /requireAdmin\(\(req\.auth\?\.token/);
  assert.doesNotMatch(source, /requireSuperAdmin\(\(req\.auth\?\.token/);
}

async function runCompletion(groupRef) {
  return firestore.runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    const bonusStatus = String(groupSnap.get("bonusGoldUsageStatus") || "");
    if (bonusStatus === "requested") throw new Error("BONUS_PENDING");
    const status = String(groupSnap.get("repStatus") || "requested");
    if (status !== "in_progress") throw new Error("INVALID_COMPLETION_STATE");
    tx.update(groupRef, { repStatus: "completed" });
  });
}

async function runBonusRequest(groupRef) {
  return firestore.runTransaction(async (tx) => {
    const groupSnap = await tx.get(groupRef);
    const status = String(groupSnap.get("repStatus") || "requested");
    if (["completed", "canceled", "rejected"].includes(status)) {
      throw new Error("EXCHANGE_CLOSED");
    }
    tx.update(groupRef, { bonusGoldUsageStatus: "requested" });
  });
}

async function verifyBonusConcurrency() {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const groupRef = firestore.doc(`releaseSafety/${runId}/groups/group-1`);

  // Firestore server transactions use pessimistic locking. Do not pause a
  // transaction after its read: that intentionally holds the document lock
  // and makes the competing transaction time out in the emulator.
  //
  // Instead, start both short transactions at the same time and assert the
  // only two valid serializable outcomes. Whichever transaction wins, the
  // final state must never be completed + requested.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await groupRef.set({
      repStatus: "in_progress",
      bonusGoldUsageStatus: null,
      attempt,
    });

    const [completionResult, requestResult] = await Promise.allSettled([
      runCompletion(groupRef),
      runBonusRequest(groupRef),
    ]);

    const finalSnap = await groupRef.get();
    const finalStatus = String(finalSnap.get("repStatus") || "");
    const finalBonusStatus = String(finalSnap.get("bonusGoldUsageStatus") || "");

    assert.notEqual(
      finalStatus === "completed" && finalBonusStatus === "requested",
      true,
      "completed + requested must never be observable"
    );

    if (finalStatus === "completed") {
      assert.equal(completionResult.status, "fulfilled");
      assert.equal(requestResult.status, "rejected");
      assert.match(String(requestResult.reason), /EXCHANGE_CLOSED/);
      assert.notEqual(finalBonusStatus, "requested");
      continue;
    }

    assert.equal(finalStatus, "in_progress");
    assert.equal(finalBonusStatus, "requested");
    assert.equal(completionResult.status, "rejected");
    assert.match(String(completionResult.reason), /BONUS_PENDING/);
    assert.equal(requestResult.status, "fulfilled");
  }
}

async function verifyPersistentBenefitLock() {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const identityHash = "same-verified-email-hash";
  const lockRef = firestore.doc(`releaseSafetyBenefitLocks/${identityHash}`);
  const firstUserRef = firestore.doc(`releaseSafetyUsers/${runId}-first`);
  const secondUserRef = firestore.doc(`releaseSafetyUsers/${runId}-second`);

  const claimOnce = async (userRef) => firestore.runTransaction(async (tx) => {
    const [userSnap, lockSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(lockRef),
    ]);
    if (lockSnap.exists && lockSnap.get("welcomeClaimed") === true) return false;
    const current = Number(userSnap.get("bonusMg") || 0);
    tx.set(userRef, { bonusMg: current + 10 }, { merge: true });
    tx.set(lockRef, { welcomeClaimed: true }, { merge: true });
    return true;
  });

  await firstUserRef.set({ bonusMg: 0 });
  assert.equal(await claimOnce(firstUserRef), true);
  assert.equal((await firstUserRef.get()).get("bonusMg"), 10);

  // Account-specific data may be deleted, but the pseudonymous benefit lock remains.
  await firstUserRef.delete();
  await secondUserRef.set({ bonusMg: 0 });
  assert.equal(await claimOnce(secondUserRef), false);
  assert.equal((await secondUserRef.get()).get("bonusMg"), 0);
}

try {
  await verifySourceGuards();
  await verifyBonusConcurrency();
  await verifyPersistentBenefitLock();
  console.log("release safety tests passed");
} finally {
  await deleteApp(app);
}
