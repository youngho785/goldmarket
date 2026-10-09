import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/GoldPrice.jsx", "utf8");
const styles = readFileSync("src/components/goldPrice/GoldPrice.styles.js", "utf8");
const native = readFileSync("src/components/goldPrice/NativeGoldPriceOverview.jsx", "utf8");

test("앱 금시세는 금액이 주인공이며 웹 장식과 중복 시세 띠를 제외한다", () => {
  assert.match(page, /import \{ isNative \} from "@\/platform\/runtime"/);
  assert.match(page, /\{!isNative && <MyGoldTicker \/>\}/);
  assert.match(page, /<NativeGoldPriceOverview/);
  assert.match(native, /<CompactMarket aria-label="금 종류별 1돈 시세 비교표">/);
  assert.match(native, /<table>/);
  assert.match(page, /\{!isNative && \(\s*<>\s*<Section id="web-gold-value-calculator" aria-labelledby="gold-price-my-gold-title">/);
});

test("앱 금시세 숫자는 공개 승인 설정과 14K 판매가 공개 설정을 따른다", () => {
  assert.match(native, /pagePriceAvailable \? formatWon\(row.buy\) : "-"/);
  assert.match(page, /!display14kSellPrice/);
  assert.match(native, /!display14kSellPrice \? "제품 시세"/);
  assert.match(native, /changeText\(trend\)/);
});

test("앱 금시세는 내 금 계산과 금교환으로 즉시 연결한다", () => {
  assert.match(native, /<AppPricePrimary to="\/">/);
  assert.match(native, /<AppPriceSecondary to="\/gold-exchange">/);
  assert.match(native, /<AppPriceDisclaimer>/);
  assert.match(native, /<StoryLink to="\/gold-to-gold"/);
});

test("웹의 시세표 계산기 알림과 회원혜택은 구조를 유지한다", () => {
  assert.match(page, /<PriceGrid>/);
  assert.match(page, /<MobilePriceMatrix aria-label="모바일 금시세 요약">/);
  assert.match(page, /<QuickGoldValueCalculator/);
  assert.match(page, /<AlertCard>/);
  assert.match(page, /<RewardCard>/);
  assert.match(page, /<GuideLinks/);
});
