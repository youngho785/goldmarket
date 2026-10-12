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
  let reconciled = 0;
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
            String(group.bonusGoldRequestUid || '') !== uid ||
            (request.uid && String(request.uid) !== uid)) return null;
        const groupStatus = String(group.repStatus || '');
        const usageStatus = String(group.bonusGoldUsageStatus || '');
        const terminalWithoutExchange = ['canceled', 'rejected'].includes(groupStatus);
        // A canceled/rejected reservation may have left an old 'requested'
        // benefit record behind. Close only a verified, matching request. Never
        // touch used/restored/completed states or any actual MEMBER GOLD balance.
        if (terminalWithoutExchange && ['requested', 'canceled'].includes(usageStatus)) {
          // A historical debit ledger indicates the benefit may have been used;
          // do not silently release it, even if the legacy statuses disagree.
          const debitLedger = await tx.get(store.doc(`users/${uid}/ledger/redeem_${groupId}`));
          if (debitLedger.exists) return null;
          const now = FieldValue.serverTimestamp();
          tx.update(candidate.ref, {
            status: 'canceled', reason: `exchange_${groupStatus}_reconciled`,
            canceledAt: now, updatedAt: now,
          });
          if (usageStatus === 'requested') {
            tx.set(groupRef, {bonusGoldUsageStatus: 'canceled', bonusGoldCanceledAt: now,
              updatedAt: now}, {merge: true});
          }
          return {uid, groupId, amountG: Number(request.amountG || 0), action: 'reconciled'};
        }
        if (terminalWithoutExchange || groupStatus === 'completed' || usageStatus !== 'requested') return null;
        // When a reservation is rescheduled, use the current visit date, not
        // the earlier request snapshot. Missing dates require human review.
        if (!bonusUsageShouldExpire(group.visitDate, group.visitTime)) return null;
        const now = FieldValue.serverTimestamp();
        tx.update(candidate.ref, {status: 'expired', expiredAt: now, updatedAt: now,
          expiryReason: 'visit_grace_period_elapsed'});
        tx.set(groupRef, {bonusGoldUsageStatus: 'expired', bonusGoldExpiredAt: now,
          updatedAt: now}, {merge: true});
        return {uid, groupId, amountG: Number(request.amountG || 0), action: 'expired'};
      });
      if (!changed) continue;
      const wasReconciled = changed.action === 'reconciled';
      if (wasReconciled) reconciled += 1;
      else expired += 1;
      // Notifications are best-effort; balance is never debited/restored here.
      // Re-running the sweep does not re-notify because status is no longer requested.
      await Promise.allSettled([
        addNotificationForUser(changed.uid, {
          type: 'bonus_gold_usage_canceled',
          title: wasReconciled ? 'MEMBER GOLD 사용 신청 정리' : 'MEMBER GOLD 사용 신청 기간 종료',
          body: wasReconciled
            ? '방문 예약이 취소 또는 거절되어 사용 신청이 종료됐습니다. 적립된 MEMBER GOLD는 그대로 유지됩니다.'
            : '방문 일정 후 확인 기간이 지나 사용 신청이 종료됐습니다. 적립 잔액은 유지됩니다.',
          link: '/member-gold',
          meta: {groupId: changed.groupId, amountG: changed.amountG},
        }),
        addNotificationForAdmins({
          type: 'admin_bonus_gold_usage_canceled',
          title: wasReconciled ? 'MEMBER GOLD 취소 예약 신청 정리' : 'MEMBER GOLD 미확정 신청 종료',
          body: wasReconciled
            ? '취소 또는 거절된 예약에 남아 있던 MEMBER GOLD 사용 신청을 정리했습니다.'
            : '방문 일정 후 확인 기간이 지난 MEMBER GOLD 사용 신청이 종료됐습니다.',
          link: `/admin/gold-exchange?groupId=${encodeURIComponent(changed.groupId)}`,
          meta: {groupId: changed.groupId, customerUid: changed.uid},
        }),
      ]);
    }
    if (page.size < 150) break;
  }
  console.info('[MEMBER GOLD expiry]', {scanned, expired, reconciled});
});
