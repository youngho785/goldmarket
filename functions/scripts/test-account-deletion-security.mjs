import assert from "node:assert/strict";
import test, { after } from "node:test";
import { readFile } from "node:fs/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  cleanupExchangeGroupForDeletion,
  deleteCustomerNotificationCopies,
  isRecentAuthentication,
  runRequiredDeletionStages,
} from "../lib/accountDeletionSafety.js";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    "계정삭제 보안 테스트는 Firestore Emulator 안에서 실행해야 합니다. " +
      "npm --prefix functions run test:account-deletion 을 사용하세요."
  );
}

const testApp = initializeApp(
  { projectId: process.env.GCLOUD_PROJECT || "demo-goldmarket" },
  `account-deletion-test-${Date.now()}`
);
const firestore = getFirestore(testApp);

after(async () => {
  await deleteApp(testApp);
});

const REQUIRED_STAGE_NAMES = [
  "exchangeGroups",
  "supportTickets",
  "exchangeConfirmations",
  "reviewClaims",
  "customerNotificationCopies",
  "bonusGoldRedemptionRequest",
  "notificationItems",
  "ledger",
  "promotions",
  "notificationsParent",
  "pushTestRateLimit",
  "profileAndNickname",
  "profilePhotosStorage",
  "legacyProfilesStorage",
];

const ACTIVE_STATUSES = new Set([
  "requested",
  "scheduled",
  "in_progress",
  "교환중",
]);

function isActiveExchangeStatusForTest(status) {
  return ACTIVE_STATUSES.has(String(status || "requested"));
}

function setReservedTimeForTest(raw, dateKey, time, reserved) {
  const next = { ...raw };
  const current =
    next[dateKey] && typeof next[dateKey] === "object" && !Array.isArray(next[dateKey])
      ? { ...next[dateKey] }
      : {};

  if (reserved) current[time] = true;
  else delete current[time];

  next[dateKey] = current;
  delete next[`${dateKey}.${time}`];
  delete next[`${dateKey} ${time}`];
  return next;
}

function unique(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function seedDeletionGroup({
  uid,
  groupId,
  exchangeId,
  visitDate,
  visitTime,
  customerOwnedBonusFields = true,
}) {
  const exchangeRef = firestore.doc(`goldExchanges/${exchangeId}`);
  const groupRef = firestore.doc(`goldExchangeGroups/${groupId}`);
  const slotsRef = firestore.doc("appConfig/reservedSlots");

  await Promise.all([
    exchangeRef.set({
      groupId,
      userId: uid,
      participants: [uid],
      status: "requested",
      visitDate,
      visitTime,
      name: "삭제 대상",
      requesterName: "삭제 대상",
      phone: "010-0000-0000",
      email: "delete@example.com",
      customerName: "삭제 대상",
      customerPhone: "010-0000-0000",
      customerEmail: "delete@example.com",
      scheduleChangeRequestedBy: uid,
      cancellationRequestedBy: uid,
      lastStatusChangedBy: uid,
      bonusGoldCanceledBy: "admin-preserve",
      bonusGoldRestoredBy: customerOwnedBonusFields ? uid : "admin-preserve",
    }),
    groupRef.set({
      ownerUid: uid,
      customerUid: uid,
      bonusGoldRequestUid: uid,
      repStatus: "requested",
      visitDate,
      visitTime,
      scheduleChangeRequestedBy: uid,
      cancellationRequestedBy: uid,
      lastStatusChangedBy: uid,
      bonusGoldCanceledBy: "admin-preserve",
      bonusGoldRestoredBy: customerOwnedBonusFields ? uid : "admin-preserve",
    }),
  ]);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(slotsRef);
    const raw = snap.exists ? snap.data() || {} : {};
    tx.set(slotsRef, setReservedTimeForTest(raw, visitDate, visitTime, true));
  });

  return { exchangeRef, groupRef, slotsRef };
}

test("최근 auth_time 300초 경계와 비정상 값을 정확히 판정한다", () => {
  const now = 2_000_000_000;
  assert.equal(isRecentAuthentication(now, now, 300), true);
  assert.equal(isRecentAuthentication(now - 300, now, 300), true);
  assert.equal(isRecentAuthentication(now - 301, now, 300), false);
  assert.equal(isRecentAuthentication(now + 1, now, 300), false);
  assert.equal(isRecentAuthentication(undefined, now, 300), false);
  assert.equal(isRecentAuthentication(null, now, 300), false);
  assert.equal(isRecentAuthentication("not-a-number", now, 300), false);
});

test("필수 정리 단계가 모두 성공한 뒤에만 Auth 삭제를 호출한다", async () => {
  const calls = [];
  const stages = REQUIRED_STAGE_NAMES.map((name) => ({
    name,
    run: async () => {
      calls.push(name);
      return true;
    },
  }));

  await runRequiredDeletionStages(stages, async () => {
    calls.push("deleteAuth");
  });

  assert.deepEqual(calls, [...REQUIRED_STAGE_NAMES, "deleteAuth"]);
});

test("Storage/필수 Firestore 실패 시 Auth 삭제를 호출하지 않는다", async () => {
  const failureStages = [
    "customerNotificationCopies",
    "bonusGoldRedemptionRequest",
    "notificationsParent",
    "pushTestRateLimit",
    "profilePhotosStorage",
    "legacyProfilesStorage",
  ];

  for (const failureStage of failureStages) {
    let authDeleteCalls = 0;
    const calls = [];
    const stages = REQUIRED_STAGE_NAMES.map((name) => ({
      name,
      run: async () => {
        calls.push(name);
        if (name === failureStage) {
          throw new Error(`injected failure: ${name}`);
        }
        return true;
      },
    }));

    await assert.rejects(
      runRequiredDeletionStages(stages, async () => {
        authDeleteCalls += 1;
      }),
      /injected failure/
    );

    assert.equal(authDeleteCalls, 0, `${failureStage} 실패 후 Auth 삭제 금지`);
    assert.equal(calls.at(-1), failureStage);
  }
});

test("그룹 트랜잭션 실패 시 그룹·교환·슬롯이 모두 롤백된다", async () => {
  const uid = unique("rollback-user");
  const groupId = unique("rollback-group");
  const exchangeId = unique("rollback-exchange");
  const visitDate = "2026-09-11";
  const visitTime = "11:00";
  const { exchangeRef, groupRef, slotsRef } = await seedDeletionGroup({
    uid,
    groupId,
    exchangeId,
    visitDate,
    visitTime,
  });

  let authDeleteCalls = 0;
  await assert.rejects(
    runRequiredDeletionStages(
      [
        {
          name: "exchangeGroups",
          run: () =>
            cleanupExchangeGroupForDeletion({
              firestore,
              uid,
              groupId,
              exchanges: firestore.collection("goldExchanges"),
              slotsRef,
              isActiveExchangeStatus: isActiveExchangeStatusForTest,
              setReservedTime: setReservedTimeForTest,
              beforeCommit: () => {
                throw new Error("injected transaction failure");
              },
            }),
        },
      ],
      async () => {
        authDeleteCalls += 1;
      }
    ),
    /injected transaction failure/
  );

  assert.equal(authDeleteCalls, 0);

  const [exchangeSnap, groupSnap, slotsSnap] = await Promise.all([
    exchangeRef.get(),
    groupRef.get(),
    slotsRef.get(),
  ]);

  assert.equal(exchangeSnap.get("userId"), uid);
  assert.equal(exchangeSnap.get("status"), "requested");
  assert.equal(exchangeSnap.get("scheduleChangeRequestedBy"), uid);
  assert.equal(groupSnap.get("ownerUid"), uid);
  assert.equal(groupSnap.get("customerUid"), uid);
  assert.equal(groupSnap.get("scheduleChangeRequestedBy"), uid);
  assert.equal(slotsSnap.get(`${visitDate}.${visitTime}`), true);
});

test("실제 그룹 정리는 고객 UID 이력만 제거하고 관리자 UID는 보존한다", async () => {
  const uid = unique("trace-user");
  const groupId = unique("trace-group");
  const exchangeId = unique("trace-exchange");
  const visitDate = "2026-09-12";
  const visitTime = "12:00";
  const { exchangeRef, groupRef, slotsRef } = await seedDeletionGroup({
    uid,
    groupId,
    exchangeId,
    visitDate,
    visitTime,
  });
  const alternateExchangeRef = firestore.doc(
    `goldExchanges/${unique("trace-exchange-alt")}`
  );
  await alternateExchangeRef.set({
    groupId,
    userId: uid,
    participants: [uid],
    status: "completed",
    visitDate,
    visitTime,
    bonusGoldCanceledBy: uid,
    bonusGoldRestoredBy: "admin-preserve-alt",
  });

  const result = await cleanupExchangeGroupForDeletion({
    firestore,
    uid,
    groupId,
    exchanges: firestore.collection("goldExchanges"),
    slotsRef,
    isActiveExchangeStatus: isActiveExchangeStatusForTest,
    setReservedTime: setReservedTimeForTest,
  });

  assert.deepEqual(result, { exchangeUpdates: 2, groupUpdates: 1 });

  const [exchangeSnap, alternateExchangeSnap, groupSnap, slotsSnap] = await Promise.all([
    exchangeRef.get(),
    alternateExchangeRef.get(),
    groupRef.get(),
    slotsRef.get(),
  ]);

  assert.equal(exchangeSnap.get("userId"), "");
  assert.equal(exchangeSnap.get("status"), "canceled");
  assert.equal(exchangeSnap.get("scheduleChangeRequestedBy"), undefined);
  assert.equal(exchangeSnap.get("cancellationRequestedBy"), undefined);
  assert.equal(exchangeSnap.get("lastStatusChangedBy"), undefined);
  assert.equal(exchangeSnap.get("bonusGoldRestoredBy"), undefined);
  assert.equal(exchangeSnap.get("bonusGoldCanceledBy"), "admin-preserve");
  assert.equal(alternateExchangeSnap.get("bonusGoldCanceledBy"), undefined);
  assert.equal(
    alternateExchangeSnap.get("bonusGoldRestoredBy"),
    "admin-preserve-alt"
  );

  assert.equal(groupSnap.get("ownerUid"), null);
  assert.equal(groupSnap.get("customerUid"), null);
  assert.equal(groupSnap.get("scheduleChangeRequestedBy"), undefined);
  assert.equal(groupSnap.get("cancellationRequestedBy"), undefined);
  assert.equal(groupSnap.get("lastStatusChangedBy"), undefined);
  assert.equal(groupSnap.get("bonusGoldRestoredBy"), undefined);
  assert.equal(groupSnap.get("bonusGoldCanceledBy"), "admin-preserve");
  assert.equal(slotsSnap.get(`${visitDate}.${visitTime}`), undefined);
});

test("일부 그룹 성공 후 실패해도 재실행으로 남은 그룹을 실제 정리한다", async () => {
  const uid = unique("retry-user");
  const groupA = unique("retry-group-a");
  const groupB = unique("retry-group-b");
  const exchangeA = unique("retry-exchange-a");
  const exchangeB = unique("retry-exchange-b");
  const slotsRef = firestore.doc("appConfig/reservedSlots");

  await seedDeletionGroup({
    uid,
    groupId: groupA,
    exchangeId: exchangeA,
    visitDate: "2026-09-13",
    visitTime: "13:00",
  });
  await seedDeletionGroup({
    uid,
    groupId: groupB,
    exchangeId: exchangeB,
    visitDate: "2026-09-14",
    visitTime: "14:00",
  });

  const common = {
    firestore,
    uid,
    exchanges: firestore.collection("goldExchanges"),
    slotsRef,
    isActiveExchangeStatus: isActiveExchangeStatusForTest,
    setReservedTime: setReservedTimeForTest,
  };

  await cleanupExchangeGroupForDeletion({ ...common, groupId: groupA });
  await assert.rejects(
    cleanupExchangeGroupForDeletion({
      ...common,
      groupId: groupB,
      beforeCommit: () => {
        throw new Error("fail group B once");
      },
    }),
    /fail group B once/
  );

  let remaining = await firestore
    .collection("goldExchanges")
    .where("userId", "==", uid)
    .get();
  assert.equal(remaining.size, 1);
  assert.equal(remaining.docs[0].get("groupId"), groupB);

  const alreadyDone = await cleanupExchangeGroupForDeletion({
    ...common,
    groupId: groupA,
  });
  assert.deepEqual(alreadyDone, { exchangeUpdates: 0, groupUpdates: 0 });

  await cleanupExchangeGroupForDeletion({ ...common, groupId: groupB });

  remaining = await firestore
    .collection("goldExchanges")
    .where("userId", "==", uid)
    .get();
  assert.equal(remaining.empty, true);
});

test("meta.customerUid가 탈퇴 UID인 관리자 알림 복사본을 실제 삭제한다", async () => {
  const uid = unique("notification-user");
  const otherUid = unique("other-user");
  const refs = [
    firestore.doc(`notifications/admin-a/items/${unique("n")}`),
    firestore.doc(`notifications/admin-b/items/${unique("n")}`),
    firestore.doc(`notifications/${uid}/items/${unique("n")}`),
  ];
  const keepRef = firestore.doc(`notifications/admin-c/items/${unique("keep")}`);

  await Promise.all([
    ...refs.map((ref, index) =>
      ref.set({
        title: "예약 알림",
        body: `삭제 대상 고객 ${index}`,
        meta: { customerUid: uid, groupId: unique("group") },
      })
    ),
    keepRef.set({
      title: "다른 고객 알림",
      body: "보존",
      meta: { customerUid: otherUid },
    }),
  ]);

  const deleted = await deleteCustomerNotificationCopies(firestore, uid);
  assert.equal(deleted, refs.length);

  const [deletedSnaps, keepSnap] = await Promise.all([
    Promise.all(refs.map((ref) => ref.get())),
    keepRef.get(),
  ]);
  deletedSnaps.forEach((snap) => assert.equal(snap.exists, false));
  assert.equal(keepSnap.exists, true);
});

test("계정삭제 호출 순서·필수 경로·로컬/CI 명령의 회귀를 방지한다", async () => {
  const [
    indexSource,
    deletionSafetySource,
    settingsSource,
    packageText,
    qualitySource,
  ] = await Promise.all([
    readFile(new URL("../src/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/accountDeletionSafety.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/pages/Settings.jsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../../.github/workflows/quality.yml", import.meta.url), "utf8"),
  ]);

  const deleteStart = indexSource.indexOf("export const deleteMyAccount");
  const deleteEnd = indexSource.indexOf("export const submitGoldExchangeReview", deleteStart);
  assert.ok(deleteStart >= 0 && deleteEnd > deleteStart);
  const deleteBlock = indexSource.slice(deleteStart, deleteEnd);

  const recentAuthIndex = deleteBlock.indexOf("requireRecentAuthentication");
  const firstDataRefIndex = deleteBlock.indexOf("const userRef = db().doc");
  assert.ok(recentAuthIndex >= 0 && recentAuthIndex < firstDataRefIndex);
  assert.match(deleteBlock, /runRequiredDeletionStages/);
  assert.match(deleteBlock, /deleteCustomerNotificationCopies\(db\(\), uid\)/);
  assert.match(deleteBlock, /pushTestRateLimits\/\$\{uid\}/);
  assert.match(deleteBlock, /bonusGoldRedemptionRequests\/\$\{uid\}/);
  assert.match(deleteBlock, /notifications\/\$\{uid\}/);
  assert.match(
    deleteBlock,
    /displayName:\s*"\(탈퇴한 사용자\)",[\s\S]{0,160}name:\s*"\(탈퇴한 사용자\)"/
  );
  assert.doesNotMatch(
    deleteBlock,
    /bonusGoldRedemptionRequests\/\$\{uid\}`\)\.delete\(\)\.catch/
  );
  assert.doesNotMatch(
    deleteBlock,
    /notifications\/\$\{uid\}`\)\.delete\(\)\.catch/
  );

  const storageStart = indexSource.indexOf("async function deleteStoragePrefix");
  const storageEnd = indexSource.indexOf("function isActiveExchangeStatus", storageStart);
  const storageBlock = indexSource.slice(storageStart, storageEnd);
  assert.match(storageBlock, /Promise\.allSettled/);
  assert.match(storageBlock, /failures\.length > 0/);

  assert.match(deletionSafetySource, /scheduleChangeRequestedBy/);
  assert.match(deletionSafetySource, /cancellationRequestedBy/);
  assert.match(deletionSafetySource, /lastStatusChangedBy/);
  assert.match(deletionSafetySource, /bonusGoldCanceledBy/);
  assert.match(deletionSafetySource, /bonusGoldRestoredBy/);
  assert.match(deletionSafetySource, /collectionGroup\("items"\)/);
  assert.doesNotMatch(
    deletionSafetySource,
    /collectionGroup\("items"\)[\s\S]{0,120}where\("meta\.customerUid"/
  );

  const reauthIndex = settingsSource.indexOf("await reauthenticateWithCredential");
  const forceRefreshIndex = settingsSource.indexOf("await currentUser.getIdToken(true)", reauthIndex);
  const unregisterIndex = settingsSource.indexOf("await unregisterPush", forceRefreshIndex);
  const deleteCallIndex = settingsSource.indexOf("await callDeleteMyAccount", forceRefreshIndex);
  assert.ok(reauthIndex >= 0);
  assert.ok(forceRefreshIndex > reauthIndex);
  assert.ok(unregisterIndex > forceRefreshIndex);
  assert.ok(deleteCallIndex > forceRefreshIndex);
  assert.match(settingsSource, /auth\/invalid-credential/);
  assert.match(settingsSource, /failed-precondition/);

  const functionsPackage = JSON.parse(packageText);
  assert.match(
    functionsPackage.scripts["test:account-deletion"],
    /firebase-tools@15\.28\.1.*emulators:exec --only firestore.*test-account-deletion-security\.mjs/
  );
  assert.match(qualitySource, /npm --prefix functions run test:account-deletion/);
});
