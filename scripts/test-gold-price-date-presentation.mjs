import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getGoldPriceDatePresentation } from '../src/lib/goldPriceDatePresentation.js';
const page = fs.readFileSync(new URL('../src/pages/GoldPrice.jsx', import.meta.url), 'utf8');

test('오늘 등록 시세: 웹·Android 모두 오늘 날짜만 표시', () => {
  assert.deepEqual(getGoldPriceDatePresentation('20261012','20261012',true), {
    isTodayPublished: true, label: '오늘 날짜 2026.10.12'
  });
});
test('과거 공개 시세: 현재 조회일과 최근 공개 시세를 구분', () => {
  assert.deepEqual(getGoldPriceDatePresentation('20261012','20261009',true), {
    isTodayPublished: false, label: '오늘 날짜 2026.10.12 · 최근 공개 시세'
  });
});
test('시세가 표시되지 않으면 최근 공개 시세라는 문구를 붙이지 않는다', () => {
  assert.equal(getGoldPriceDatePresentation('20261012','20261009',false).label, '오늘 날짜 2026.10.12');
});
test('자정 이후에도 한국의 새 날짜 기준으로 최근 공개 여부를 판단', () => {
  const data = getGoldPriceDatePresentation('20261013','20261012',true);
  assert.equal(data.label, '오늘 날짜 2026.10.13 · 최근 공개 시세');
  assert.equal(data.isTodayPublished, false);
});
test('웹과 Android는 동일한 금시세 날짜 문구를 사용하고 등록일은 별도로 노출하지 않는다', () => {
  assert.match(page, /<Source>\{priceDateLabel\}<\/Source>/);
  assert.match(page, /getGoldPriceDatePresentation\(\s*todayKey, goldData\?\.sourceDate, pagePriceAvailable/);
  assert.doesNotMatch(page, /조회일 \$\{formatDateKey|시세 등록일 \$\{referenceDate/);
  assert.match(page, /isTodayPublished \? "오늘의 금시세" : "최근 공개 금시세"/);
  assert.match(page, /const todayKey = useKoreaTodayDate\(\)/);
});
