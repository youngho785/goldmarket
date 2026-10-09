import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const header = read('src/components/common/AndroidAppHeader.jsx');
const home = read('src/pages/AndroidHome.jsx');
const price = read('src/components/goldPrice/NativeGoldPriceOverview.jsx');
const pricePage = read('src/pages/GoldPrice.jsx');
const steps = read('src/components/goldExchange/GoldExchangeSteps.jsx');
const styles = read('src/components/goldExchange/GoldExchange.styles.js');

test('Android statusbar: header/drawer use a nonzero inset fallback', () => {
  assert.match(header, /padding-top: max\(28px, env\(safe-area-inset-top, 0px\)\)/);
  assert.match(header, /14px \+ max\(28px, env\(safe-area-inset-top, 0px\)\)/);
});

test('Menu supports accessibility and separates story from calculator', () => {
  assert.match(header, /aria-expanded=\{menuOpen\}/);
  assert.match(header, /role="dialog"/);
  assert.match(header, /ref=\{drawerCloseButtonRef\}/);
  assert.match(header, /event\.key !== "Tab"/);
  assert.match(header, /to="\/gold-to-gold"/);
  assert.match(header, /to="\/gold-exchange"/);
  assert.match(header, /to="\/quiz\/gold-bonus"/);
});

test('Home offers GOLD TO GOLD story to guests and members', () => {
  assert.match(home, /<GoldToGoldStory to="\/gold-to-gold"/);
  assert.match(home, /금, 다시 가치 있게/);
  assert.match(home, /<QuickGoldValueCalculator/);
});

test('Native gold price uses prior compact three-column comparison with benefits and brand story', () => {
  assert.match(price, /<table>/);
  assert.match(price, /marketRows\.map\(\(row\) => <th/);
  assert.match(price, /팔 때/);
  assert.match(price, /살 때/);
  assert.match(price, /전일 대비/);
  assert.match(price, /!display14kSellPrice \? "제품 시세"/);
  assert.match(price, /최대 순금 0\.03g/);
  assert.match(price, /to="\/quiz\/gold-bonus"|"\/quiz\/gold-bonus"/);
  assert.match(price, /<StoryLink to="\/gold-to-gold"/);
  assert.match(pricePage, /\{!isNative && \(\s*<SectionHead>/);
});

test('Step2 retains calculations but simplifies native result and expands detail on request', () => {
  assert.match(steps, /<ExchangePureGoldTotal/);
  assert.match(steps, /getGoldBarFeeEstimate\(/);
  assert.match(steps, /roundTo3Custom\(Math\.max\(0, selectedTotalG - totalGrams\)\)/);
  assert.match(steps, /const GuideWrapper = isNative \? "details" : "div"/);
  assert.match(steps, /추가 조합의 제작 공임은 위 예상 공임에 포함되지 않으며/);
  assert.match(styles, /flex: 0 1 auto/);
});
