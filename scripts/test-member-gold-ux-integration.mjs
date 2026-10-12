import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const m = await import('../src/lib/memberGoldEligibility.js');
const d = await import('../src/lib/myGoldImportCollision.js');
const member = source('src/pages/MemberGold.jsx');
const vault = source('src/pages/MyGoldVault.jsx');
const importPrompt = source('src/components/gold/MyGoldImportPrompt.jsx');
const alert = source('src/components/gold/MyGoldAlertGoals.jsx');
const backend = source('functions/src/rewards/bonusUsageExpirySchedule.ts');
const serverGuard = source('functions/src/rewards/functions.ts');
const index = source('functions/src/index.ts');
const expiry = source('functions/src/rewards/bonusUsageExpiry.ts');
const groups = [
  {groupId: 'old',visitDate:'2026-10-11',status:'requested'},
  {groupId: 'today',visitDate:'2026-10-12',status:'requested'},
  {groupId: 'tomorrow',visitDate:'2026-10-13',status:'scheduled'},
  {groupId: 'bad',visitDate:'2026-02-30',status:'requested'},
  {groupId: 'ended',visitDate:'2026-10-15',status:'completed'},
];
test('KST date is independent from browser timezone', () => {
  assert.equal(m.getKoreaTodayDateKey(new Date('2026-10-11T15:01:00Z')), '2026-10-12');
});
test('only today and future active reservations can be selected', () => {
  assert.deepEqual(m.eligibleMemberGoldGroups(groups,'2026-10-12').map(g=>g.groupId), ['today','tomorrow']);
});
test('duplicate candidates warn but do not automatically delete genuine items', () => {
  const existing = [{goldType:'18k', weightG:7.5}];
  assert.equal(d.findPossibleMyGoldDuplicates([{goldType:'18k',weightG:7.5}],existing).length,1);
  assert.equal(d.findPossibleMyGoldDuplicates([{goldType:'18k',weightG:7.6}],existing).length,0);
});
test('member screen guards selection and puts use action above historical rewards', () => {
  assert.match(member,/eligibleMemberGoldGroups/);
  assert.match(member,/effectiveSelectedGroupId/);
  assert.ok(member.indexOf('{usagePanel}') < member.indexOf('회원혜택 현황'));
});
test('MY GOLD import checks duplicates at the save boundary', () => {
  assert.match(vault,/findPossibleMyGoldDuplicates\(pendingItems, items\)/);
  assert.match(vault,/!allowPossibleDuplicates/);
  assert.match(importPrompt,/중복 가능성을 확인했습니다/);
});
test('MY GOLD alert explains already-met targets before saving', () => {
  assert.match(alert,/alreadyMetPriceTarget/);
  assert.match(alert,/이미 입력한 목표 조건을 충족/);
});
test('MEMBER GOLD expired state is visible and preserves balance', () => {
  assert.match(member,/request\?\.status === "expired"/);
  assert.doesNotMatch(backend,/bonusGoldMilliGrams:|bonusGoldG:/);
});
test('expiry checker is transaction guarded and registered daily', () => {
  assert.match(backend,/runTransaction/);
  assert.match(backend,/schedule: '15 4 \* \* \*'/);
  assert.match(index,/expireMemberGoldUsageRequests/);
  assert.match(expiry,/GRACE_PERIOD_MS = 48/);
});
test('server continues rejecting new past-date applications', () => {
  assert.match(serverGuard,/eligibleBonusUsageDate\(groupSnap.get\("visitDate"\), koreaDateKey\(\)\)/);
});
test('no existing gold valuation/fee formulas are modified', () => {
  assert.doesNotMatch(backend,/set\(userRef/);
});
