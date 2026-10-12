import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { eligibleBonusUsageDate } from "../lib/rewards/bonusUsageEligibility.js";

const today = "2026-10-12";

test("오늘 방문 예약은 신규 MEMBER GOLD 사용 신청 가능", () => {
  assert.equal(eligibleBonusUsageDate(today, today), true);
});
test("미래 방문 예약은 신규 MEMBER GOLD 사용 신청 가능", () => {
  assert.equal(eligibleBonusUsageDate("2026-10-13", today), true);
});
test("지난 방문 예약은 신규 사용 신청 불가", () => {
  assert.equal(eligibleBonusUsageDate("2026-10-11", today), false);
});
test("방문일 누락은 신규 사용 신청 불가", () => {
  for (const value of [undefined, null, "", "미정"]) {
    assert.equal(eligibleBonusUsageDate(value, today), false);
  }
});
test("잘못된 날짜 표기나 존재하지 않는 날짜는 사용 불가", () => {
  for (const value of ["2026.10.12", "2026-02-30", "2026-13-01", "2026-10-12T11:00:00"]) {
    assert.equal(eligibleBonusUsageDate(value, today), false);
  }
});
test("윤년 날짜 검증", () => {
  assert.equal(eligibleBonusUsageDate("2028-02-29", "2028-02-28"), true);
  assert.equal(eligibleBonusUsageDate("2027-02-29", "2027-02-28"), false);
});
test("두 조회 API가 동일한 방문일 기준으로 과거 예약을 제외", () => {
  const source = readFileSync(new URL("../src/rewards/functions.ts", import.meta.url), "utf8");
  assert.equal((source.match(/eligibleBonusUsageDate\(group\.visitDate, koreaDateKey\(\)\)/g) || []).length, 2);
});
test("신규 요청은 서버에서 차단하며 기존 요청 조회·관리자 정산은 유지", () => {
  const source = readFileSync(new URL("../src/rewards/functions.ts", import.meta.url), "utf8");
  const start = source.indexOf("export const bonusRequestGoldUsage");
  const end = source.indexOf("export const bonusCancelGoldUsage", start);
  const request = source.slice(start, end);
  const existing = request.indexOf('if (existing?.status === "requested")');
  const guard = request.indexOf('if (!eligibleBonusUsageDate(groupSnap.get("visitDate"), koreaDateKey()))');
  const write = request.indexOf('tx.set(requestRef, requestData)');
  assert.ok(existing >= 0 && guard > existing && write > guard, "기존 요청 확인 후 신규 요청 차단");
  assert.ok(source.includes("export const bonusAdminConfirmGoldUsage"), "관리자 정산 기능 유지");
});
