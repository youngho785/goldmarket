// KGM MEMBER GOLD expiry lifecycle — real handler integration tests.
// Only compatible with Firebase Auth + Firestore emulators and demo-goldmarket.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const project = String(process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '');
const fsHost = String(process.env.FIRESTORE_EMULATOR_HOST || '');
const authHost = String(process.env.FIREBASE_AUTH_EMULATOR_HOST || '');
const localHost = (host) => /^(?:localhost|127\.0\.0\.1|\[::1\]):\d{2,5}$/.test(host);
if (project !== 'demo-goldmarket' || !localHost(fsHost) || !localHost(authHost)) {
  throw new Error('SAFETY STOP: requires demo-goldmarket with LOCAL Firestore AND Auth emulators.');
}
process.env.GCLOUD_PROJECT = 'demo-goldmarket';
process.env.GOOGLE_CLOUD_PROJECT = 'demo-goldmarket';

// Firebase Admin initializes after the safety check.
const { getFirestore } = await import('firebase-admin/firestore');
const { getAuth } = await import('firebase-admin/auth');
const { expireMemberGoldUsageRequests } = await import('../lib/rewards/bonusUsageExpirySchedule.js');
const { bonusAdminConfirmGoldUsage } = await import('../lib/rewards/functions.js');
const { reconcileBonusUsageForGroup } = await import('../lib/rewards/reconciliation.js');
const db = getFirestore();
const auth = getAuth();
assert.equal(typeof expireMemberGoldUsageRequests.run, 'function');
assert.equal(typeof bonusAdminConfirmGoldUsage.run, 'function');

const prefix = `kgm-6c-edges-${Date.now()}-${randomUUID().slice(0, 6)}`;
const created = [];
const customers = [];
let adminUid = '';
let adminUserRef = null;
const track = ref => (created.push(ref), ref);
const KST = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
const prior = new Date(Date.now() - 5 * 86400000);
function toKstParts(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', KST).formatToParts(date).map(p => [p.type, p.value]));
  return { visitDate: `${parts.year}-${parts.month}-${parts.day}`, visitTime: `${parts.hour}:${parts.minute}` };
}
const visit = toKstParts(prior);
const cases = new Map();
async function seedCase(label, { repStatus = 'scheduled', groupUsage = 'requested' } = {}) {
  const uid = `${prefix}-${label}`;
  const groupId = `${prefix}-group-${label}`;
  const userRef = track(db.doc(`users/${uid}`));
  const requestRef = track(db.doc(`bonusGoldRedemptionRequests/${uid}`));
  const groupRef = track(db.doc(`goldExchangeGroups/${groupId}`));
  const exchangeRef = track(db.doc(`goldExchanges/${groupId}`));
  await Promise.all([
    userRef.set({ role: 'user', bonusGoldMilliGrams: 30, bonusGoldG: 0.03 }),
    requestRef.set({ uid, groupId, status: 'requested', amountMilliGrams: 30, amountG: 0.03, requestCode: '123456', ...visit }),
    groupRef.set({ ownerUid: uid, repStatus, bonusGoldUsageStatus: groupUsage,
      bonusGoldRequestUid: uid, bonusGoldRequestedMilliGrams: 30, bonusGoldRequestedG: 0.03, ...visit }),
    exchangeRef.set({ groupId, userId: uid, status: repStatus }),
  ]);
  const fixture = { uid, groupId, userRef, requestRef, groupRef, exchangeRef };
  cases.set(label, fixture);
  customers.push(uid);
  return fixture;
}
const confirm = fixture => bonusAdminConfirmGoldUsage.run({
  auth: { uid: adminUid },
  data: { groupId: fixture.groupId, requestCode: '123456', finalRecognizedG: 10 },
});
const sweep = () => expireMemberGoldUsageRequests.run({
  scheduleTime: new Date().toISOString(), jobName: 'member-gold-edge-test',
});
async function snapshot(fixture) {
  const [req, group, user, ledger] = await Promise.all([
    fixture.requestRef.get(), fixture.groupRef.get(), fixture.userRef.get(),
    db.doc(`users/${fixture.uid}/ledger/redeem_${fixture.groupId}`).get(),
  ]);
  const result = { req: req.data(), group: group.data(), user: user.data(), ledgerExists: ledger.exists };
  assert.ok(result.req && result.group && result.user, 'missing seed fixture');
  return result;
}
async function checkSettled(fixture, state) {
  const result = await snapshot(fixture);
  assert.equal(result.req.status, state, 'request status');
  assert.equal(result.group.bonusGoldUsageStatus, state, 'group status');
  assert.equal(result.ledgerExists, state === 'used', 'deduction ledger invariant');
  assert.equal(result.user.bonusGoldMilliGrams, state === 'used' ? 0 : 30, 'balance invariant');
  return result;
}
async function cleanup() {
  for (const uid of [...customers, adminUid].filter(Boolean)) {
    for (const path of [`notifications/${uid}/items`, `users/${uid}/ledger`]) {
      const docs = await db.collection(path).get().catch(() => ({docs: []}));
      await Promise.allSettled(docs.docs.map(doc => doc.ref.delete()));
    }
  }
  await Promise.allSettled(created.reverse().map(ref => ref.delete()));
  if (adminUserRef) await adminUserRef.delete().catch(() => {});
  if (adminUid) await auth.deleteUser(adminUid).catch(() => {});
}

try {
  adminUid = `${prefix}-admin`;
  await auth.createUser({ uid: adminUid, email: `${adminUid}@example.test`, emailVerified: true });
  await auth.setCustomUserClaims(adminUid, {admin: true});
  adminUserRef = db.doc(`users/${adminUid}`);
  await adminUserRef.set({ role: 'admin', admin: true });

  // A: Scheduler commits first; admin cannot settle a now-expired request.
  const expired = await seedCase('expiry-first');
  await sweep();
  await checkSettled(expired, 'expired');
  await assert.rejects(confirm(expired), 'admin confirmation must reject an already-expired request');
  await checkSettled(expired, 'expired');
  console.log('PASS: expiry first blocks later confirmation; no MEMBER GOLD debit');

  // B: Admin commits first; scheduler cannot expire an already-used request.
  const used = await seedCase('admin-first');
  await confirm(used);
  await checkSettled(used, 'used');
  await sweep();
  await checkSettled(used, 'used');
  console.log('PASS: admin first remains used; one deduction ledger and no restore');

  // C: Real scheduled sweep and real callable compete for same documents.
  const racing = await seedCase('concurrent');
  const outcomes = await Promise.allSettled([sweep(), confirm(racing)]);
  if (outcomes[0].status === 'rejected') throw outcomes[0].reason;
  const final = await snapshot(racing);
  assert.ok(['expired', 'used'].includes(final.req.status), 'race must settle in one terminal state');
  await checkSettled(racing, final.req.status);
  if (final.req.status === 'expired') {
    assert.equal(outcomes[1].status, 'rejected', 'expired request cannot also confirm successfully');
  } else {
    assert.equal(outcomes[1].status, 'fulfilled', 'used request must follow successful admin confirmation');
  }
  console.log(`PASS: concurrent sweep and admin confirmation — winner: ${final.req.status}`);

  // D: Regular cancel/reject should reconcile request; no deduction/restoration.
  const canceled = await seedCase('normal-cancel', {repStatus: 'canceled'});
  await reconcileBonusUsageForGroup({groupId: canceled.groupId, targetStatus: 'canceled', adminUid});
  await checkSettled(canceled, 'canceled');
  await sweep();
  await checkSettled(canceled, 'canceled');
  console.log('PASS: regular canceled reservation reconciles pending usage safely');

  // E: A historic inconsistent record: the exchange group was marked
  // canceled but the bonus request was left requested. This must not be
  // silently deducted or rewritten by a date-based expiry sweep.
  const orphan = await seedCase('orphan-cancel', {repStatus: 'canceled', groupUsage: 'canceled'});
  await sweep();
  const afterOrphan = await snapshot(orphan);
  assert.equal(afterOrphan.user.bonusGoldMilliGrams, 30);
  assert.equal(afterOrphan.ledgerExists, false);
  assert.equal(afterOrphan.req.status, 'canceled', 'historic orphan request must be released');
  assert.equal(afterOrphan.group.bonusGoldUsageStatus, 'canceled');
  console.log('PASS: historic orphan request reconciled without MEMBER GOLD debit');

  // E2: Another sweep must not reconcile or notify the same request twice.
  const orphanNotice = () => db.collection(`notifications/${orphan.uid}/items`)
    .where('title', '==', 'MEMBER GOLD 사용 신청 정리').get();
  assert.equal((await orphanNotice()).size, 1, 'send one reconciliation notice');
  await sweep();
  await checkSettled(orphan, 'canceled');
  assert.equal((await orphanNotice()).size, 1, 'no duplicate reconciliation notice');
  console.log('PASS: orphan reconciliation is idempotent; exactly one customer notice');

  // E3: A rejected reservation is equally terminal and must free pending use.
  const rejected = await seedCase('orphan-rejected', {repStatus: 'rejected', groupUsage: 'canceled'});
  await sweep();
  await checkSettled(rejected, 'canceled');
  console.log('PASS: rejected orphan request reconciled');

  // E4: A canceled group whose usage status is still requested is also repaired.
  const canceledPending = await seedCase('orphan-both-pending', {repStatus: 'canceled', groupUsage: 'requested'});
  await sweep();
  await checkSettled(canceledPending, 'canceled');
  console.log('PASS: terminal reservation closes matching pending request and group');

  // E5: Never release a request if a historical debit ledger exists.
  const withLedger = await seedCase('orphan-has-ledger', {repStatus: 'canceled', groupUsage: 'canceled'});
  const ledgerRef = track(db.doc(`users/${withLedger.uid}/ledger/redeem_${withLedger.groupId}`));
  await ledgerRef.set({direction: 'debit', amountMilliGrams: 30});
  await sweep();
  const ledgerState = await snapshot(withLedger);
  assert.equal(ledgerState.req.status, 'requested', 'ledger mismatch requires manual review');
  assert.equal(ledgerState.user.bonusGoldMilliGrams, 30, 'do not adjust balance');
  assert.equal(ledgerState.ledgerExists, true);
  console.log('PASS: historic debit ledger blocks unsafe reconciliation');

  // E6: Do not close another user's group, or a completed reservation.
  const wrongOwner = await seedCase('orphan-wrong-owner', {repStatus: 'canceled', groupUsage: 'canceled'});
  await wrongOwner.groupRef.update({ownerUid: `${prefix}-different-user`});
  const complete = await seedCase('orphan-completed', {repStatus: 'completed', groupUsage: 'canceled'});
  await sweep();
  assert.equal((await snapshot(wrongOwner)).req.status, 'requested');
  assert.equal((await snapshot(complete)).req.status, 'requested');
  console.log('PASS: owner mismatch and completed reservation fail closed');

  console.log('MEMBER GOLD EDGE HANDLER CHECKS: PASS');
} finally {
  await cleanup();
}
