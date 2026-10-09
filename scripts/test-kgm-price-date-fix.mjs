import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getKoreaTodayDateKey,
} from "../src/utils/koreaDisplayDate.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("한국 시각이 자정을 넘기면 등록일과 무관하게 오늘 기준일이 변경된다", () => {
  assert.equal(getKoreaTodayDateKey(new Date("2026-10-09T14:59:59Z")), "20261009");
  assert.equal(getKoreaTodayDateKey(new Date("2026-10-09T15:00:00Z")), "20261010");
});

test("웹 홈 금시세표는 기준일과 시세 등록일을 명확하게 구분", () => {
  const board = read("src/components/gold/GoldPriceBoard.jsx");
  assert.match(board, /const todayKey = useKoreaTodayDate\(\)/);
  assert.match(board, /기준일 <strong>\{formatDateKey\(todayKey\)\}<\/strong>/);
  assert.match(board, /시세 등록일 <strong>\{data\.sourceDate \? formatDateKey\(data\.sourceDate\) : "확인 중"\}<\/strong>/);
  assert.match(board, /publicationTime\(data\.updatedAt\)/);
});

test("웹 금시세 전체 페이지는 오늘 기준일, Android 표시는 유지", () => {
  const page = read("src/pages/GoldPrice.jsx");
  assert.match(page, /isNative\s*\? `기준일 \${referenceDate}`/);
  assert.match(page, /: `기준일 \${formatDateKey\(todayKey\)} · 시세 등록일 \${referenceDate}`/);
});

test("탭을 계속 켜 두어도 날짜가 바뀌도록 주기적으로 재확인", () => {
  const hook = read("src/hooks/useKoreaTodayDate.js");
  assert.match(hook, /setInterval\(refresh, 60 \* 1000\)/);
  assert.match(hook, /addEventListener\("focus", refresh\)/);
});
