import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, addNotificationForUser, addNotificationForAdmins } from '../core/runtime.js';

// Housekeeping only for canceled/rejected reservations whose benefit request
// was left pending. A valid active request is NEVER expired based on visit date.
export const reconcileCanceledMemberGoldUsageRequests = onSchedule({
  schedule: '15 4 * * *',
  timeZone: 'Asia/Seoul',
  region: 'asia-northeast3',
  timeoutSeconds: 300,
}, async () => {
  const store = db();
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let scanned = 0;
  let reconciled = 0;
  for (;;) {
    let query = store.collection('bonusGoldRedemptionRequests')
      .where('status', '==', 'requested')
      .orderBy(FieldPath.documentId())
      .limit(150);
    if (last) query = query.startAfter(last);
    const page = await query.get();
    if (page.empty) break;
    last = page.docs[page.docs.length - 1];
    for (const candidate of page.docs) {
      scanned += 1;
      const groupId = String(candidate.get('groupId') || '').trim();
      if (!groupId || groupId.includes('/')) continue;
      const groupRef = store.doc(`goldExchangeGroups/${groupId}`);
      const changed = await store.runTransaction(async (tx) => {
        const [requestSnap, groupSnap] = await Promise.all([
          tx.get(candidate.ref), tx.get(groupRef),
        ]);
        if (!requestSnap.exists || !groupSnap.exists) return null;
        const request = requestSnap.data() || {};
        const group = groupSnap.data() || {};
        const uid = candidate.id;
        if (request.status !== 'requested' || request.groupId !== groupId ||
            String(group.ownerUid || '') !== uid ||
            String(group.bonusGoldRequestUid || '') !== uid ||
            (request.uid && String(request.uid) !== uid)) return null;
        const groupStatus = String(group.repStatus || '');
        if (!['canceled', 'rejected'].includes(groupStatus) ||
            !['requested', 'canceled'].includes(String(group.bonusGoldUsageStatus || ''))) return null;
        // Historical usage might already be debited. Never silently change it.
        const debitLedger = await tx.get(store.doc(`users/${uid}/ledger/redeem_${groupId}`));
        if (debitLedger.exists) return null;
        const now = FieldValue.serverTimestamp();
        tx.update(candidate.ref, {
          status: 'canceled', reason: `exchange_${groupStatus}_reconciled`,
          canceledAt: now, updatedAt: now,
        });
        if (String(group.bonusGoldUsageStatus) === 'requested') {
          tx.set(groupRef, {
            bonusGoldUsageStatus: 'canceled', bonusGoldCanceledAt: now, updatedAt: now,
          }, {merge: true});
        }
        return {uid, groupId, amountG: Number(request.amountG || 0)};
      });
      if (!changed) continue;
      reconciled += 1;
      // Best effort notifications; transaction has already committed.
      await Promise.allSettled([
        addNotificationForUser(changed.uid, {
          type: 'bonus_gold_usage_canceled',
          title: 'MEMBER GOLD 사용 신청 정리',
          body: '방문 예약이 취소 또는 거절되어 사용 신청이 종료됐습니다. 적립된 MEMBER GOLD는 그대로 유지됩니다.',
          link: '/member-gold',
          meta: {groupId: changed.groupId, amountG: changed.amountG},
        }),
        addNotificationForAdmins({
          type: 'admin_bonus_gold_usage_canceled',
          title: 'MEMBER GOLD 취소 예약 신청 정리',
          body: '취소 또는 거절된 예약에 남아 있던 MEMBER GOLD 사용 신청을 정리했습니다.',
          link: `/admin/gold-exchange?groupId=${encodeURIComponent(changed.groupId)}`,
          meta: {groupId: changed.groupId, customerUid: changed.uid},
        }),
      ]);
    }
    if (page.size < 150) break;
  }
  console.info('[MEMBER GOLD canceled-orphan reconciliation]', {scanned, reconciled});
});
