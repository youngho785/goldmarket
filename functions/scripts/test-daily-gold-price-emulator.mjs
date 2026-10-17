import assert from 'node:assert/strict';

if (process.env.GCLOUD_PROJECT !== 'demo-goldmarket' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8099') {
  throw new Error('Local isolated demo-goldmarket emulator on port 8099 required.');
}
const { getFirestore } = await import('firebase-admin/firestore');
const { ensureDailyGoldPrice, planGoldPriceCorrection, applyGoldPriceCorrection, publishDailyGoldPrice, saveDailyGoldPrice } = await import('../lib/goldPrice/dailyHistory.js');
const { PRICE_FIELDS, koreaDay, shiftDay } = await import('../lib/goldPrice/dailyHistoryModel.js');
const store = getFirestore();
const today = koreaDay();
const d = n => shiftDay(today, n);
const price = n => Object.fromEntries(PRICE_FIELDS.map(key => [key, n]));
const history = key => store.doc(`goldPriceHistory/${key}`);
const live = store.doc('goldPrices/current');
const get = async ref => (await ref.get()).data();
const seed = (key, amount, kind = 'manual') => ({ sourceDate: key, market: price(amount), entryType: kind, source: kind === 'manual' ? 'ADMIN_MANUAL' : 'ADMIN_CARRY_FORWARD' });
const clear = async () => {
  for (const name of ['goldPriceHistory', 'goldPrices', 'goldPricePublic', 'goldPriceCorrectionAudit']) await store.recursiveDelete(store.collection(name));
};
const correct = async (key, amount) => {
  const preview = await planGoldPriceCorrection(key, price(amount));
  return applyGoldPriceCorrection('test-admin', { date: key, market: price(amount), reason: 'local regression test', expected: preview.expected });
};
try {
  await clear();
  const saveAt = (date, amount) => publishDailyGoldPrice('test-admin', { date, market: price(amount), enabled: true, display14kSellPrice: false });
  await saveAt(d(-44), 100);
  await saveAt(d(-40), 120);
  for (let n = -44; n < -40; n++) assert.equal((await get(history(d(n)))).market.pureGoldBuyPerDon, 100);
  for (let n = -40; n <= 0; n++) assert.equal((await get(history(d(n)))).market.pureGoldBuyPerDon, 120);
  await saveAt(d(-44), 90);
  assert.equal((await get(history(d(-41)))).market.pureGoldBuyPerDon, 90);
  assert.equal((await get(history(d(-40)))).previousMarket.pureGoldBuyPerDon, 90);
  assert.equal((await get(live)).market.pureGoldBuyPerDon, 120);
  await saveAt(d(-40), 130);
  assert.equal((await get(live)).market.pureGoldBuyPerDon, 130);
  await assert.rejects(saveAt(d(1), 140), e => e.code === 'invalid-argument');
  console.log('PASS: single save historical dates, daily propagation, protected later change, same-date edit, future rejection');

  await clear();
  const first = seed(d(-4), 100);
  await history(d(-4)).set(first);
  await live.set(first);
  assert.equal((await ensureDailyGoldPrice()).count, 4);
  assert.equal((await ensureDailyGoldPrice()).count, 0);
  assert.equal((await get(history(today))).market.pureGoldBuyPerDon, 100);
  await correct(d(-2), 120);
  assert.equal((await get(history(d(-3)))).market.pureGoldBuyPerDon, 100);
  assert.equal((await get(history(d(-2)))).market.pureGoldBuyPerDon, 120);
  assert.equal((await get(history(d(-1)))).market.pureGoldBuyPerDon, 120);
  assert.equal((await get(live)).market.pureGoldBuyPerDon, 120);
  assert.equal((await get(live)).changes.pureGoldBuyPerDon, 0);
  console.log('PASS: unchanged days, idempotent daily repair, historical propagation and live price');

  await history(d(-1)).set(seed(d(-1), 150));
  await history(today).set({ ...seed(today, 150, 'carry'), previousMarket: price(150) });
  await live.set({ ...seed(today, 150, 'carry'), previousMarket: price(150) });
  await correct(d(-2), 130);
  const boundary = await get(history(d(-1)));
  assert.equal(boundary.market.pureGoldBuyPerDon, 150);
  assert.equal(boundary.previousMarket.pureGoldBuyPerDon, 130);
  assert.equal(boundary.changes.pureGoldBuyPerDon, 20);
  assert.equal((await get(live)).market.pureGoldBuyPerDon, 150);
  console.log('PASS: later manual price and corrected comparison baseline');

  const preview = await planGoldPriceCorrection(d(-2), price(140));
  await assert.rejects(applyGoldPriceCorrection('test-admin', { date: d(-2), market: price(145), reason: 'changed input price', expected: preview.expected }), e => e.code === 'aborted');
  await history(d(-1)).update({ note: 'another admin changed this document' });
  await assert.rejects(applyGoldPriceCorrection('test-admin', { date: d(-2), market: price(140), reason: 'stale preview test', expected: preview.expected }), e => e.code === 'aborted');
  console.log('PASS: stale preview and changed input rejected atomically');

  const publish = amount => publishDailyGoldPrice('test-admin', { date: today, market: price(amount), enabled: true, display14kSellPrice: false });
  await publish(160);
  await publish(170);
  assert.equal((await get(live)).market.pureGoldBuyPerDon, 170);
  assert.equal((await get(history(today))).market.pureGoldBuyPerDon, 170);
  assert.equal((await get(live)).previousMarket.pureGoldBuyPerDon, 150);
  assert.equal((await get(live)).changes.pureGoldBuyPerDon, 20);
  await Promise.all([publish(180), ensureDailyGoldPrice()]);
  assert.equal((await get(live)).market.pureGoldBuyPerDon, 180);
  assert.equal((await get(history(today))).market.pureGoldBuyPerDon, 180);
  await assert.rejects(saveDailyGoldPrice.run({ data: {} }), e => e.code === 'unauthenticated');
  console.log('PASS: repeated intraday publication, concurrent scheduler and unauthenticated rejection');

  await clear();
  await live.set(seed(d(-4), 100));
  await ensureDailyGoldPrice();
  assert.equal((await get(history(d(-4)))).market.pureGoldBuyPerDon, 100);
  assert.equal((await get(history(today))).market.pureGoldBuyPerDon, 100);
  console.log('PASS: legacy live-only installation repairs history');
} finally {
  await clear();
  await store.terminate();
}
