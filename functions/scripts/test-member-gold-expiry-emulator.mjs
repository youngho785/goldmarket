// MEMBER GOLD expiry smoke-test: demo Firestore emulator only.
// This script invokes the *compiled scheduled function handler* directly.
// It never triggers a real Cloud Scheduler job and never accesses production Firestore.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';

const emulatorHost = String(process.env.FIRESTORE_EMULATOR_HOST || '');
const requestedProject = String(process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'demo-goldmarket');
if (!emulatorHost || requestedProject !== 'demo-goldmarket' || /https?:\/\//i.test(emulatorHost)) {
  throw new Error('SAFETY STOP: Requires local Firestore emulator and demo-goldmarket project');
}
process.env.GCLOUD_PROJECT = 'demo-goldmarket';
process.env.GOOGLE_CLOUD_PROJECT = 'demo-goldmarket';

// Imported after safety check because runtime initializes the admin app.
const { expireMemberGoldUsageRequests } = await import('../lib/rewards/bonusUsageExpirySchedule.js');
const { bonusUsageExpiryMillis, bonusUsageShouldExpire } = await import('../lib/rewards/bonusUsageExpiry.js');
const store = getFirestore();
assert.equal(process.env.GCLOUD_PROJECT, 'demo-goldmarket', 'Emulator project must be demo-goldmarket');
assert.equal(typeof expireMemberGoldUsageRequests.run, 'function', 'Expected testable scheduled function handler');

const MS_DAY = 86400000;
const now = Date.now();
function koreaVisit(ts) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hourCycle:'h23',
  }).formatToParts(new Date(ts));
  const v = Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {visitDate:`${v.year}-${v.month}-${v.day}`,visitTime:`${v.hour}:${v.minute}`};
}

assert.equal(bonusUsageExpiryMillis('2026-02-30','11:00'), null);
assert.equal(bonusUsageExpiryMillis('2026-02-28','25:00'), null);
assert.equal(bonusUsageExpiryMillis('2028-02-29','11:00') !== null, true);
assert.equal(bonusUsageExpiryMillis('2026-02-28','11:00') - Date.parse('2026-02-28T11:00:00+09:00'), 48*3600000);
assert.equal(bonusUsageShouldExpire(...Object.values(koreaVisit(now-4*MS_DAY)), now), true);
console.log('PASS: expiry cutoff KST +48 hours and invalid-date safety');

const suffix = `${Date.now()}-${randomUUID().slice(0,8)}`;
const fixturePrefix = `kgm6c-${suffix}`;
const created = [];
const customerUids = [];
function track(ref) {created.push(ref); return ref;}
function refs(label) {
  const uid=`${fixturePrefix}-${label}`;
  const groupId=`${fixturePrefix}-group-${label}`;
  const requestRef=track(store.doc(`bonusGoldRedemptionRequests/${uid}`));
  const groupRef=track(store.doc(`goldExchangeGroups/${groupId}`));
  const userRef=track(store.doc(`users/${uid}`));
  customerUids.push(uid);
  return {uid,groupId,requestRef,groupRef,userRef};
}
const fixtures = {};
async function createCase(label,{requestStatus='requested', groupStatus='requested', visit=koreaVisit(now-5*MS_DAY), requestVisit=visit, balance=30, repStatus='scheduled'}={}) {
  const f=refs(label);
  await Promise.all([
    f.userRef.set({bonusGoldMilliGrams:balance, bonusGoldG:balance/1000, role:'user'}),
    f.requestRef.set({uid:f.uid,groupId:f.groupId,status:requestStatus,amountMilliGrams:30,amountG:0.03,...requestVisit}),
    f.groupRef.set({ownerUid:f.uid,bonusGoldRequestUid:f.uid,bonusGoldUsageStatus:groupStatus,repStatus,...visit}),
  ]);
  fixtures[label]=f;
}
async function check(label,expectedStatus,expectedBalance=30) {
  const f=fixtures[label];
  const [r,g,u]=await Promise.all([f.requestRef.get(),f.groupRef.get(),f.userRef.get()]);
  assert.equal(r.get('status'),expectedStatus,`${label}: request status`);
  assert.equal(g.get('bonusGoldUsageStatus'),expectedStatus,`${label}: group status`);
  assert.equal(u.get('bonusGoldMilliGrams'),expectedBalance,`${label}: balance cannot silently change`);
  return [r,g,u];
}
async function sweep() {
  // Firebase Functions v2 exports a run() method for invocation in tests.
  await expireMemberGoldUsageRequests.run({scheduleTime:new Date().toISOString(),jobName:'emulator-test'});
}
async function notificationCount(uid) {
  return (await store.collection(`notifications/${uid}/items`).where('title','==','MEMBER GOLD 사용 신청 기간 종료').get()).size;
}
async function cleanup() {
  for(const uid of customerUids) {
    const snapshot=await store.collection(`notifications/${uid}/items`).get();
    for(const doc of snapshot.docs) await doc.ref.delete();
  }
  await Promise.allSettled(created.reverse().map(ref=>ref.delete()));
}

try {
  await createCase('expired');
  await createCase('today',{visit:koreaVisit(now)});
  await createCase('future',{visit:koreaVisit(now+MS_DAY)});
  await createCase('rescheduled',{visit:koreaVisit(now+3*MS_DAY),requestVisit:koreaVisit(now-10*MS_DAY)});
  await createCase('used',{requestStatus:'used',groupStatus:'used',balance:0});
  await createCase('canceled',{requestStatus:'canceled',groupStatus:'canceled'});
  await createCase('bad-date',{visit:{visitDate:'2026-02-30',visitTime:'11:00'}});
  await createCase('inconsistent',{groupStatus:'canceled'});
  await sweep();
  await check('expired','expired');
  await check('today','requested');
  await check('future','requested');
  await check('rescheduled','requested');
  await check('used','used',0);
  await check('canceled','canceled');
  await check('bad-date','requested');
  {
    const {requestRef,groupRef,userRef}=fixtures.inconsistent;
    const [r,g,u]=await Promise.all([requestRef.get(),groupRef.get(),userRef.get()]);
    assert.equal(r.get('status'),'requested');
    assert.equal(g.get('bonusGoldUsageStatus'),'canceled');
    assert.equal(u.get('bonusGoldMilliGrams'),30);
  }
  assert.equal(await notificationCount(fixtures.expired.uid),1,'One customer expiry notification per request');
  console.log('PASS: real sweep expires only valid overdue requests; other states and balance unchanged');
  await sweep();
  await check('expired','expired');
  assert.equal(await notificationCount(fixtures.expired.uid),1,'Second sweep must not re-notify');
  console.log('PASS: repeated sweep is idempotent; no double notification');
  console.log('NOTE: stale/inconsistent request records are intentionally NOT auto-cleared here; check terminal reservation reconciliation separately.');
  console.log('MEMBER GOLD EXPIRY EMULATOR: PASS');
} finally {
  await cleanup();
}
