// Safe local emulator test; no access to real Firestore.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const project = String(process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '');
const host = String(process.env.FIRESTORE_EMULATOR_HOST || '');
if (project !== 'demo-goldmarket' || !/^(?:localhost|127\.0\.0\.1|\[::1\]):\d{2,5}$/.test(host)) {
  throw new Error('SAFETY STOP: local Firestore emulator and demo-goldmarket project required.');
}
const { getFirestore } = await import('firebase-admin/firestore');
const { reconcileCanceledMemberGoldUsageRequests } = await import('../lib/rewards/bonusUsageReconciliationSchedule.js');
const store = getFirestore();
assert.equal(typeof reconcileCanceledMemberGoldUsageRequests.run, 'function');
const prefix = 'kgm-final-' + Date.now() + '-' + randomUUID().slice(0, 6);
const refs = [];
const users = [];
async function seed(label, status, usage = 'requested', withLedger = false) {
  const uid = prefix + '-' + label;
  const groupId = prefix + '-group-' + label;
  const userRef = store.doc('users/' + uid);
  const groupRef = store.doc('goldExchangeGroups/' + groupId);
  const requestRef = store.doc('bonusGoldRedemptionRequests/' + uid);
  refs.push(userRef,groupRef,requestRef);
  users.push(uid);
  await Promise.all([
    userRef.set({bonusGoldMilliGrams: 30, bonusGoldG: 0.03}),
    groupRef.set({ownerUid:uid, bonusGoldRequestUid:uid, bonusGoldUsageStatus:usage,
      repStatus:status, visitDate:'2026-01-01', visitTime:'11:00'}),
    requestRef.set({uid,groupId,status:'requested',amountMilliGrams:30,amountG:0.03}),
  ]);
  if (withLedger) {
    const ledger = store.doc('users/' + uid + '/ledger/redeem_' + groupId);
    refs.push(ledger);
    await ledger.set({direction:'debit',amountMilliGrams:30});
  }
  return {uid,groupRef,requestRef,userRef};
}
async function state(fixture) {
  const [group,request,user] = await Promise.all([
    fixture.groupRef.get(), fixture.requestRef.get(), fixture.userRef.get(),
  ]);
  assert.equal(user.get('bonusGoldMilliGrams'),30,'balance must never change');
  return [group.get('bonusGoldUsageStatus'),request.get('status')];
}
try {
  const past = await seed('past-active', 'scheduled');
  const canceled = await seed('orphan-canceled', 'canceled', 'canceled');
  const rejected = await seed('orphan-rejected', 'rejected');
  const protectedLedger = await seed('ledger', 'canceled', 'canceled', true);
  const used = await seed('used', 'completed', 'used');
  const sweep = () => reconcileCanceledMemberGoldUsageRequests.run({
    scheduleTime:new Date().toISOString(),jobName:'demo-test',
  });
  await sweep();
  assert.deepEqual(await state(past), ['requested','requested'], 'past valid request remains pending');
  assert.deepEqual(await state(canceled), ['canceled','canceled'], 'orphan canceled request reconciled');
  assert.deepEqual(await state(rejected), ['canceled','canceled'], 'orphan rejected request reconciled');
  assert.deepEqual(await state(protectedLedger), ['canceled','requested'], 'debit ledger must prevent unsafe reconciliation');
  assert.deepEqual(await state(used), ['used','requested'], 'completed booking must never be changed');
  await sweep();
  assert.deepEqual(await state(canceled), ['canceled','canceled']);
  console.log('MEMBER GOLD MANUAL CONFIRM POLICY + ORPHAN RECONCILIATION: PASS');
} finally {
  for (const uid of users) {
    const notificationSnap = await store.collection('notifications/' + uid + '/items').get();
    for (const doc of notificationSnap.docs) await doc.ref.delete();
  }
  for (const ref of refs.reverse()) await ref.delete();
}
