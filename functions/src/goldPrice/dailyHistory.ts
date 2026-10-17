import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { Transaction, DocumentSnapshot, QuerySnapshot } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db, ENFORCE_APP_CHECK, requireCurrentAdmin } from '../core/runtime.js';
import { koreaDay, validDate, shiftDay, normalizeMarket, correctedRows, missingDailyRows, comparison } from './dailyHistoryModel.js';
import type { Market, PriceRow } from './dailyHistoryModel.js';

function inputPrice(value: PriceRow): Market {
  try { return normalizeMarket(value); }
  catch (error) { throw new HttpsError('invalid-argument', (error as Error).message); }
}
function snapshotVersion(snapshot: DocumentSnapshot) {
  return [snapshot.id, snapshot.updateTime?.seconds ?? null, snapshot.updateTime?.nanoseconds ?? null];
}
async function readRange(start: string, end: string, transaction?: Transaction) {
  const store = db();
  const col = store.collection('goldPriceHistory');
  const beforeQuery = col.where('sourceDate', '<', start).orderBy('sourceDate', 'desc').limit(1);
  const rangeQuery = col.where('sourceDate', '>=', start).where('sourceDate', '<=', end).orderBy('sourceDate');
  const currentRef = store.doc('goldPrices/current');
  const before: QuerySnapshot = transaction ? await transaction.get(beforeQuery) : await beforeQuery.get();
  const range: QuerySnapshot = transaction ? await transaction.get(rangeQuery) : await rangeQuery.get();
  const current = transaction ? await transaction.get(currentRef) : await currentRef.get();
  const existing = new Map<string, PriceRow>(range.docs.map(s => [s.id, s.data()]));
  let prior = before.docs[0]?.data();
  const live = current.data();
  // Preserve a legacy live price even when its history document is missing.
  if (live?.market && validDate(live.sourceDate)) {
    if (live.sourceDate >= start && live.sourceDate <= end && !existing.has(live.sourceDate)) existing.set(live.sourceDate, live);
    if (live.sourceDate < start && (!prior || live.sourceDate > prior.sourceDate)) prior = live;
  }
  const expected = createHash('sha256').update(JSON.stringify([
    end, before.docs.map(snapshotVersion), range.docs.map(snapshotVersion), snapshotVersion(current),
  ])).digest('hex');
  const liveHistoryMissing = !!live?.market && validDate(live.sourceDate) && live.sourceDate >= start && live.sourceDate <= end && !range.docs.some(s => s.id === live.sourceDate);
  return { existing, prior, current, expected, liveHistoryMissing };
}
export async function planGoldPriceCorrection(start: string, price: Market, transaction?: Transaction) {
  const today = koreaDay();
  if (!validDate(start) || start > today) throw new HttpsError('invalid-argument', '오늘 또는 과거의 올바른 날짜를 선택하세요.');
  const state = await readRange(start, today, transaction);
  try { return {
    ...state, ...correctedRows(start, today, price, state.existing, state.prior),
    expected: createHash('sha256').update(JSON.stringify([state.expected, start, price])).digest('hex'),
  }; }
  catch (error) { throw new HttpsError('invalid-argument', (error as Error).message); }
}
export const previewGoldPriceCorrection = onCall({ region: 'asia-northeast3', enforceAppCheck: ENFORCE_APP_CHECK }, async req => {
  await requireCurrentAdmin(req.auth?.uid);
  const price = inputPrice(req.data?.market);
  const p = await planGoldPriceCorrection(String(req.data?.date || ''), price);
  return {
    ok: true, expected: p.expected, stopDate: p.stopDate,
    updatesCurrent: !p.stopDate || p.current.data()?.sourceDate === p.stopDate,
    rows: p.rows.map(row => ({ date: row.sourceDate, before: p.existing.get(row.sourceDate)?.market || null, after: row.market, kind: row.entryType })),
  };
});
export const saveGoldPriceCorrection = onCall({ region: 'asia-northeast3', enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 120 }, async req => {
  const uid = await requireCurrentAdmin(req.auth?.uid);
  return applyGoldPriceCorrection(uid, req.data || {});
});
// Internal service used by the authenticated callable and isolated emulator tests.
export async function applyGoldPriceCorrection(uid: string, data: PriceRow) {
  const start = String(data.date || '');
  const price = inputPrice(data.market);
  const reason = String(data.reason || '').trim();
  if (reason.length < 5 || reason.length > 200) throw new HttpsError('invalid-argument', '수정 사유는 5~200자로 입력하세요.');
  const auditRef = db().collection('goldPriceCorrectionAudit').doc();
  return db().runTransaction(async transaction => {
    const p = await planGoldPriceCorrection(start, price, transaction);
    if (data.expected !== p.expected) throw new HttpsError('aborted', '시세 기록이 변경되었습니다. 미리보기를 다시 확인하세요.');
    const stamp = { updatedAt: FieldValue.serverTimestamp(), updatedBy: uid };
    for (const row of p.rows) {
      transaction.set(db().doc(`goldPriceHistory/${row.sourceDate}`), {
        ...row, ...stamp,
        ...(row.sourceDate === start ? { publishedAt: FieldValue.serverTimestamp(), publishedBy: uid } : {}),
      });
    }
    if (p.boundary) transaction.set(db().doc(`goldPriceHistory/${p.stopDate}`), { ...p.boundary, ...stamp });
    // Update today's effective price only if no later manual price supersedes it.
    const liveRow = p.stopDate ? (p.current.data()?.sourceDate === p.stopDate ? p.boundary : null) : p.rows.at(-1);
    if (liveRow) transaction.set(db().doc('goldPrices/current'), { ...liveRow, ...stamp });
    transaction.set(auditRef, {
      date: start, reason, actorUid: uid, createdAt: FieldValue.serverTimestamp(), stopDate: p.stopDate,
      changes: p.rows.map(row => ({ date: row.sourceDate, before: p.existing.get(row.sourceDate)?.market || null, after: row.market, kind: row.entryType })),
    });
    return { ok: true, count: p.rows.length, updatedCurrent: !!liveRow };
  });
}

export async function publishDailyGoldPrice(uid: string, data: PriceRow, now = new Date()) {
  const today = koreaDay(now);
  const date = String(data.date || '');
  if (!validDate(date) || date > today) throw new HttpsError('invalid-argument', '오늘 또는 과거의 올바른 날짜를 선택하세요.');
  const price = inputPrice(data.market);
  if (typeof data.enabled !== 'boolean' || typeof data.display14kSellPrice !== 'boolean') throw new HttpsError('invalid-argument', '표시 설정을 확인하세요.');
  if (date < today) {
    const auditRef = db().collection('goldPriceCorrectionAudit').doc();
    return db().runTransaction(async transaction => {
      const p = await planGoldPriceCorrection(date, price, transaction);
      const effective = new Map(p.existing);
      for (const row of p.rows) effective.set(row.sourceDate, row);
      if (p.boundary) effective.set(p.stopDate!, p.boundary);
      const missing = missingDailyRows(date, today, effective, p.prior);
      const stamp = { updatedAt: FieldValue.serverTimestamp(), updatedBy: uid };
      for (const row of [...p.rows, ...missing, ...(p.boundary ? [p.boundary] : [])]) {
        transaction.set(db().doc('goldPriceHistory/' + row.sourceDate), {
          ...row, ...stamp,
          ...(row.sourceDate === date ? { publishedAt: FieldValue.serverTimestamp(), publishedBy: uid } : {}),
        });
      }
      if (p.liveHistoryMissing && p.stopDate && p.current.data()?.sourceDate !== p.stopDate) {
        transaction.set(db().doc('goldPriceHistory/' + p.current.data()!.sourceDate), p.current.data()!);
      }
      const final = missing.find(row => row.sourceDate === today) || effective.get(today);
      if (final) transaction.set(db().doc('goldPrices/current'), { ...final, ...stamp });
      transaction.set(db().doc('goldPricePublic/config'), {
        enabled: data.enabled, display14kSellPrice: data.display14kSellPrice, ...stamp,
      }, { merge: true });
      transaction.set(auditRef, {
        date, reason: '기준일 시세 저장', actorUid: uid, createdAt: FieldValue.serverTimestamp(), stopDate: p.stopDate,
        changes: p.rows.map(row => ({ date: row.sourceDate, before: p.existing.get(row.sourceDate)?.market || null, after: row.market, kind: row.entryType })),
      });
      return { ok: true, count: p.rows.length, updatedCurrent: !p.stopDate };
    });
  }
  return db().runTransaction(async transaction => {
    const start = shiftDay(today, -365);
    const p = await readRange(start, today, transaction);
    const carried = missingDailyRows(start, shiftDay(today, -1), p.existing, p.prior);
    const previous = carried.at(-1)?.sourceDate === shiftDay(today, -1)
      ? carried.at(-1) : p.existing.get(shiftDay(today, -1)) || p.prior;
    const row = {
      sourceDate: today, market: price, entryType: 'manual', source: 'ADMIN_MANUAL',
      sourceLabel: '한국골드마켓 관리자 직접 입력', status: 'published',
      ...comparisonForPublish(price, previous, p.current.data(), today),
      publishedAt: FieldValue.serverTimestamp(), publishedBy: uid,
      updatedAt: FieldValue.serverTimestamp(), updatedBy: uid,
    };
    for (const missing of carried) transaction.set(db().doc(`goldPriceHistory/${missing.sourceDate}`), { ...missing, updatedAt: FieldValue.serverTimestamp() });
    const live = p.current.data();
    if (p.liveHistoryMissing && live && live.sourceDate < today) transaction.set(db().doc(`goldPriceHistory/${live.sourceDate}`), live);
    transaction.set(db().doc(`goldPriceHistory/${today}`), row);
    transaction.set(db().doc('goldPrices/current'), row);
    transaction.set(db().doc('goldPricePublic/config'), {
      enabled: data.enabled, display14kSellPrice: data.display14kSellPrice,
      updatedAt: FieldValue.serverTimestamp(), updatedBy: uid,
    }, { merge: true });
    return { ok: true };
  });
}
function comparisonForPublish(price: Market, previous: PriceRow | undefined, live: PriceRow | undefined, today: string) {
  // Older installations may only have today's live row and its previous-day baseline.
  return comparison(price, previous || (live?.sourceDate === today && live.previousMarket
    ? { sourceDate: live.previousSourceDate, market: live.previousMarket } : undefined));
}
export const saveDailyGoldPrice = onCall({ region: 'asia-northeast3', enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 120 }, async req => {
  const uid = await requireCurrentAdmin(req.auth?.uid);
  return publishDailyGoldPrice(uid, req.data || {});
});

// Daily transaction also repairs holes in the last 366 days, including missed runs.
// Existing daily final prices always win; concurrent admin writes trigger a retry.
export async function ensureDailyGoldPrice(now = new Date()) {
  const today = koreaDay(now);
  const start = shiftDay(today, -365);
  return db().runTransaction(async transaction => {
    const p = await readRange(start, today, transaction);
    const rows = missingDailyRows(start, today, p.existing, p.prior);
    const stamp = { updatedAt: FieldValue.serverTimestamp() };
    for (const row of rows) transaction.set(db().doc(`goldPriceHistory/${row.sourceDate}`), { ...row, ...stamp });
    const live = p.current.data();
    if (p.liveHistoryMissing && live) transaction.set(db().doc(`goldPriceHistory/${live.sourceDate}`), live);
    const final = rows.find(row => row.sourceDate === today) || p.existing.get(today);
    if (final && (!live || live.sourceDate < today)) transaction.set(db().doc('goldPrices/current'), { ...final, ...stamp });
    return { count: rows.length };
  });
}
export const carryForwardDailyGoldPrice = onSchedule({ schedule: '5 0 * * *', timeZone: 'Asia/Seoul', region: 'asia-northeast3', retryCount: 3 }, async () => {
  const result = await ensureDailyGoldPrice();
  console.log('[carryForwardDailyGoldPrice]', result);
});
