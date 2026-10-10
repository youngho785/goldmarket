import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("src/pages/AndroidHome.jsx", "utf8");
const page = readFileSync("src/pages/GoldPrice.jsx", "utf8");
const native = readFileSync("src/components/goldPrice/NativeGoldPriceOverview.jsx", "utf8");

test("앱 홈 GOLD TO GOLD는 금 등록 여부와 무관하게 소개 페이지로 이동", () => {
  assert.match(home, /<GoldToGoldStory\s+to="\/gold-to-gold"/);
  assert.doesNotMatch(home, /to=\{hasMyGold \? "\/gold-to-gold" : "\/gold-exchange"\}/);
});

test("앱 금시세는 한국 오늘 날짜를 표시하고, 지난 시세에는 별도 안내", () => {
  assert.match(page, /const todayKey = useKoreaTodayDate\(\)/);
  assert.match(page, /\? `오늘 날짜 \$\{formatDateKey\(todayKey\)\}/);
  assert.match(page, /최근 공개 시세/);
  assert.doesNotMatch(page, /\? `시세 등록일/);
});

test("앱 금시세는 가입 유도 문구만 제거하고 퀵퀴즈 0.03g 혜택은 유지", () => {
  assert.doesNotMatch(native, /회원 혜택 알아보기/);
  assert.match(native, /isMember && <Link to="\/settings">금시세 알림 설정<\/Link>/);
  assert.match(native, /금 퀵퀴즈도 풀고, 최대 순금 0\.03g 혜택/);
  assert.match(native, /to=\{isMember \? "\/member-gold" : "\/quiz\/gold-bonus"\}/);
  assert.match(native, /<AppPriceSecondary to="\/gold-exchange">/);
});
