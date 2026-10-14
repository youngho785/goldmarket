import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getGoldPriceDatePresentation, getGoldPricePreviousDayMarket } from '../src/lib/goldPriceDatePresentation.js';
const page = fs.readFileSync(new URL('../src/pages/GoldPrice.jsx', import.meta.url), 'utf8');
const board = fs.readFileSync(new URL('../src/components/gold/GoldPriceBoard.jsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/pages/AndroidHome.jsx', import.meta.url), 'utf8');

test('금시세는 마지막 등록일과 관계없이 한국 오늘 날짜만 표시', () => {
  assert.equal(getGoldPriceDatePresentation('20261013','20261013',true).label, '오늘 날짜 2026.10.13');
  assert.equal(getGoldPriceDatePresentation('20261013','20261009',true).label, '오늘 날짜 2026.10.13');
  assert.equal(getGoldPriceDatePresentation('20261013','20261009',false).label, '오늘 날짜 2026.10.13');
});
test('어제 또는 오래전에 등록한 시세는 오늘도 유지: 전일 대비 보합', () => {
  const market = {pureGoldBuyPerDon:800000};
  const staleBase = {pureGoldBuyPerDon:780000};
  assert.equal(getGoldPricePreviousDayMarket('20261013','20261009',market,staleBase),market);
  assert.equal(getGoldPricePreviousDayMarket('20261013','20261012',market,staleBase),market);
});
test('오늘 변경하면 마지막 변경가 아닌 관리자 전일 기준가를 사용', () => {
  const market = {pureGoldBuyPerDon:810000};
  const previous = {pureGoldBuyPerDon:800000};
  assert.equal(getGoldPricePreviousDayMarket('20261013','20261013',market,previous),previous);
  assert.equal(getGoldPricePreviousDayMarket('20261013','20261013',market,null),null);
  assert.equal(getGoldPricePreviousDayMarket('20261013','20261014',market,previous),null);
});
test('웹과 앱 모두 동일 기준가와 한국 날짜 표시 기능 사용', () => {
  assert.match(page, /getGoldPricePreviousDayMarket\(todayKey, goldData\?\.sourceDate, market, goldData\?\.previousMarket\)/);
  assert.match(board, /getGoldPricePreviousDayMarket\(todayKey, data\?\.sourceDate, market, data\?\.previousMarket\)/);
  assert.match(app, /getGoldPriceDatePresentation\(todayKey, dashboard\.marketSourceDate, true\)/);
  assert.match(page, /<Source>\{priceDateLabel\}<\/Source>/);
  assert.doesNotMatch(page, /최근 공개 금시세/);
});
