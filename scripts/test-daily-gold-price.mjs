import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { buildGoldPriceHistoryCsv } from '../src/lib/goldPriceHistoryCsv.js';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('../functions/src/goldPrice/dailyHistoryModel.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { PRICE_FIELDS, correctedRows, missingDailyRows, dateRange, koreaDay, normalizeMarket } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const price = amount => Object.fromEntries(PRICE_FIELDS.map(key => [key, amount]));
const row = (date, amount, kind = 'manual') => ({ sourceDate: date, market: price(amount), entryType: kind });

test('October 3 correction propagates through October 5 and preserves October 1–2', () => {
  const existing = new Map(dateRange('20261001', '20261005').map(date => [date, row(date, 100, date === '20261001' ? 'manual' : 'carry')]));
  const p = correctedRows('20261003', '20261005', price(120), existing, existing.get('20261002'));
  assert.deepEqual(p.rows.map(r => [r.sourceDate, r.market.pureGoldBuyPerDon]), [['20261003', 120], ['20261004', 120], ['20261005', 120]]);
  assert.equal(p.rows[0].changes.pureGoldBuyPerDon, 20);
  assert.equal(p.rows[1].changes.pureGoldBuyPerDon, 0);
  assert.equal(existing.get('20261002').market.pureGoldBuyPerDon, 100);
});
test('next manual price is protected and its previous-day comparison is repaired', () => {
  const existing = new Map([['20261005', row('20261005', 150)]]);
  const p = correctedRows('20261003', '20261008', price(120), existing, row('20261002', 100));
  assert.deepEqual(p.rows.map(r => r.sourceDate), ['20261003', '20261004']);
  assert.equal(p.boundary.market.pureGoldBuyPerDon, 150);
  assert.equal(p.boundary.previousMarket.pureGoldBuyPerDon, 120);
  assert.equal(p.boundary.changes.pureGoldBuyPerDon, 30);
});
test('a legacy ADMIN_MANUAL record is also a propagation boundary', () => {
  const p = correctedRows('20261003', '20261008', price(120), new Map([['20261004', { sourceDate: '20261004', source: 'ADMIN_MANUAL', market: price(140) }]]));
  assert.equal(p.stopDate, '20261004');
  assert.equal(p.rows.length, 1);
});
test('unchanged days and missed scheduler days are filled through today', () => {
  const rows = missingDailyRows('20261002', '20261005', new Map(), row('20261001', 100));
  assert.equal(rows.length, 4);
  assert(rows.every(r => r.market.pureGoldBuyPerDon === 100 && r.entryType === 'carry'));
  const saved = new Map(rows.map(r => [r.sourceDate, r]));
  assert.equal(missingDailyRows('20261002', '20261005', saved, row('20261001', 100)).length, 0);
});
test('daily repair fills interior holes without overwriting manually entered days', () => {
  const rows = missingDailyRows('20261001', '20261005', new Map([['20261001', row('20261001', 100)], ['20261003', row('20261003', 120)]]));
  assert.deepEqual(rows.map(r => [r.sourceDate, r.market.pureGoldBuyPerDon]), [['20261002', 100], ['20261004', 120], ['20261005', 120]]);
});
test('no prices are invented before first known day', () => {
  const rows = missingDailyRows('20261001', '20261005', new Map([['20261003', row('20261003', 120)]]));
  assert.deepEqual(rows.map(r => r.sourceDate), ['20261004', '20261005']);
});
test('multiple corrections on one day retain previous day as baseline', () => {
  const first = correctedRows('20261003', '20261003', price(120), new Map(), row('20261002', 100));
  const second = correctedRows('20261003', '20261003', price(130), new Map([['20261003', first.rows[0]]]), row('20261002', 100));
  assert.equal(second.rows[0].changes.pureGoldBuyPerDon, 30);
  assert.equal(second.rows[0].previousSourceDate, '20261002');
});
test('calendar boundaries, leap year and Korean midnight are exact', () => {
  assert.equal(dateRange('20240101', '20241231').length, 366);
  assert.throws(() => dateRange('20260229', '20260301'));
  assert.throws(() => dateRange('20250101', '20260102'));
  assert.equal(koreaDay(new Date('2026-10-02T15:00:00Z')), '20261003');
  assert.throws(() => normalizeMarket(price(0)));
});
test('annual CSV includes every calendar day and explicit gaps, with Excel UTF-8 BOM', () => {
  const result = buildGoldPriceHistoryCsv('20240101', '20241231', [row('20240101', 100), row('20240102', 100, 'carry')]);
  assert.equal(result.count, 366);
  assert.equal(result.missing, 364);
  assert.equal(result.csv.charCodeAt(0), 0xFEFF);
  assert.equal(result.csv.trimEnd().split('\r\n').length, 367);
  assert.match(result.csv, /"2024-01-02","100".*"자동 유지"/);
  assert.match(result.csv, /"2024-01-03","","","","","","","기록 없음"/);
  assert.throws(() => buildGoldPriceHistoryCsv('20260102', '20260101', []));
});
