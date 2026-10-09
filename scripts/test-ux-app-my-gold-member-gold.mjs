import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [myGold, styles, memberGold] = await Promise.all([
  read("src/pages/MyGoldVault.jsx"),
  read("src/components/myGoldVault/MyGoldVault.styles.js"),
  read("src/pages/MemberGold.jsx"),
]);

test("MY GOLD 순금 정보는 g 수치와 돈 보조 표기를 함께 제공한다", () => {
  assert.match(myGold, /formatGoldDon\(Number\(activeSummary\.pureGoldG \|\| 0\) \/ DON_TO_GRAMS\)/);
  assert.match(styles, /export const HeroStat[\s\S]*?small \{/);
});

test("MY GOLD 요약의 교환 버튼은 저장된 기록을 그대로 금교환 예상에 전달한다", () => {
  assert.match(myGold, /to="\/gold-exchange\?mode=vault&auto=1"/);
  assert.match(myGold, /state=\{\{ source: "my-gold", vaultProducts: exchangeProducts \}\}/);
  assert.match(myGold, /hasVaultContent && ratesReady && exchangeProducts\.length > 0/);
});

test("MEMBER GOLD는 개인 금 기록과 회원혜택을 명확히 구분한다", () => {
  assert.match(memberGold, /MY GOLD는 내가 가진 금의 기록, MEMBER GOLD는 교환에 적용할 수 있는 별도 혜택/);
  assert.match(memberGold, /loading && balanceLoading \? "확인 중"/);
});

test("매장 확인 대기 중이면 MEMBER GOLD 확인 코드를 혜택 목록보다 우선한다", () => {
  assert.match(memberGold, /const usagePanel = \(/);
  assert.match(memberGold, /\{hasPendingRequest && usagePanel\}/);
  assert.match(memberGold, /\{!hasPendingRequest && usagePanel\}/);
  assert.ok(memberGold.indexOf("{hasPendingRequest && usagePanel}") < memberGold.indexOf("<h2>회원혜택 현황</h2>"));
});

test("거래 혜택 ledger 로딩·오류·빈 상태를 구별하고 재시도 동작을 준다", () => {
  assert.match(memberGold, /\[ledgerLoading, setLedgerLoading\]/);
  assert.match(memberGold, /\[ledgerError, setLedgerError\]/);
  assert.match(memberGold, /\[ledgerRetryKey, setLedgerRetryKey\]/);
  assert.match(memberGold, /\{ledgerError \? \(/);
  assert.match(memberGold, /내역 다시 불러오기/);
  assert.match(memberGold, /setLedgerRetryKey\(\(key\) => key \+ 1\)/);
});
