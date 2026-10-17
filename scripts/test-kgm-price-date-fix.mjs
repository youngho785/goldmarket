import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getKoreaTodayDateKey } from "../src/utils/koreaDisplayDate.js";
import {
  getGoldPriceDatePresentation,
  getGoldPricePreviousDayMarket,
} from "../src/lib/goldPriceDatePresentation.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// 2026-10 policy: the customer-facing label is TODAY in Korea, not the admin's
// last edit date.  Price changes compare against yesterday's *effective* price.
test("한국 자정 경과 시 가격 등록일과 관계없이 표시 날짜가 바뀐다", () => {
  assert.equal(getKoreaTodayDateKey(new Date("2026-10-09T14:59:59Z")), "20261009");
  assert.equal(getKoreaTodayDateKey(new Date("2026-10-09T15:00:00Z")), "20261010");
  assert.equal(getGoldPriceDatePresentation("20261010", "20261008", true).label, "오늘 날짜 2026.10.10");
});

test("웹 금시세판은 한국 오늘 날짜를 표시하며 등록일을 제목으로 사용하지 않는다", () => {
  const board = read("src/components/gold/GoldPriceBoard.jsx");
  assert.match(board, /const todayKey = useKoreaTodayDate\(\)/);
  assert.match(board, /getGoldPriceDatePresentation\(/);
  assert.match(board, /<SourceDate>\{priceDateLabel\}<\/SourceDate>/);
  assert.match(board, /getGoldPricePreviousDayMarket\(todayKey, data\?\.sourceDate, market, data\?\.previousMarket\)/);
});

test("웹·앱 금시세는 등록일 대신 오늘을 표시하고 전날 적용 가격으로 비교한다", () => {
  const page = read("src/pages/GoldPrice.jsx");
  const board = read("src/components/gold/GoldPriceBoard.jsx");
  const app = read("src/pages/AndroidHome.jsx");
  assert.match(page, /getGoldPriceDatePresentation\(/);
  assert.match(page, /<Source>\{priceDateLabel\}<\/Source>/);
  assert.match(page, /getGoldPricePreviousDayMarket\(todayKey, goldData\?\.sourceDate, market, goldData\?\.previousMarket\)/);
  assert.match(app, /getGoldPriceDatePresentation\(todayKey, dashboard\.marketSourceDate, true\)/);
  const market = { pureGoldBuyPerDon: 820000 };
  const previousDay = { pureGoldBuyPerDon: 800000 };
  assert.equal(getGoldPricePreviousDayMarket("20261016", "20261015", market, previousDay), market);
  assert.equal(getGoldPricePreviousDayMarket("20261016", "20261016", market, previousDay), previousDay);
});

test("화면을 열어 둔 상태에서도 한국 날짜와 포커스를 주기적으로 재확인한다", () => {
  const hook = read("src/hooks/useKoreaTodayDate.js");
  assert.match(hook, /setInterval\(refresh, 60 \* 1000\)/);
  assert.match(hook, /addEventListener\("focus", refresh\)/);
});
