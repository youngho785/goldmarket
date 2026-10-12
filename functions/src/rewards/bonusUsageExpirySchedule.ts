import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, addNotificationForUser, addNotificationForAdmins } from '../core/runtime.js';
import { bonusUsageShouldExpire } from './bonusUsageExpiry.js';

// Daily sweep is deliberately bounded by pages; all writes are guarded by a
// Firestore transaction. Already settled requests never lose their balances.
export const expireMemberGoldUsageRequests = onSchedule({
  schedule: '15 4 * * *',
  timeZone: 'Asia/Seoul',
  region: 'asia-northeast3',
  timeoutSeconds: 300,
}, async () => {
  const store = db();
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let expired = 0;
  let scanned = 0;
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
      const data = candidate.data();
      const groupId = String(data?.groupId || '').trim();
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
            group.bonusGoldUsageStatus !== 'requested' ||
            String(group.bonusGoldRequestUid || '') !== uid ||
            ['completed', 'canceled', 'rejected'].includes(String(group.repStatus || ''))) return null;
        // When a reservation is rescheduled, use the current visit date, not
        // the earlier request snapshot. Missing dates require human review.
        if (!bonusUsageShouldExpire(group.visitDate, group.visitTime)) return null;
        const now = FieldValue.serverTimestamp();
        tx.update(candidate.ref, {status: 'expired', expiredAt: now, updatedAt: now,
          expiryReason: 'visit_grace_period_elapsed'});
        tx.set(groupRef, {bonusGoldUsageStatus: 'expired', bonusGoldExpiredAt: now,
          updatedAt: now}, {merge: true});
        return {uid, groupId, amountG: Number(request.amountG || 0)};
      });
      if (!changed) continue;
      expired += 1;
      // Notifications are best-effort; balance is never debited/restored here.
      // Re-running the sweep does not re-notify because status is no longer requested.
      await Promise.allSettled([
        addNotificationForUser(changed.uid, {
          type: 'bonus_gold_usage_canceled',
          title: 'MEMBER GOLD 사용 신청 기간 종료',
          body: '방문 일정 후 확인 기간이 지나 사용 신청이 종료됐습니다. 적립 잔액은 유지됩니다.',
          link: '/member-gold',
          meta: {groupId: changed.groupId, amountG: changed.amountG},
        }),
        addNotificationForAdmins({
          type: 'admin_bonus_gold_usage_canceled',
          title: 'MEMBER GOLD 미확정 신청 종료',
          body: '방문 일정 후 확인 기간이 지난 MEMBER GOLD 사용 신청이 종료됐습니다.',
          link: `/admin/gold-exchange?groupId=${encodeURIComponent(changed.groupId)}`,
          meta: {groupId: changed.groupId, customerUid: changed.uid},
        }),
      ]);
    }
    if (page.size < 150) break;
  }
  console.info('[MEMBER GOLD expiry]', {scanned, expired});
});
