import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareMyGoldTrendPoints, buildMyGoldTrendChartGeometry, goldTrendDateOrdinal } from "../src/lib/myGoldTrendTimeline.js";

const market = (pureGoldBuyPerDon) => ({ pureGoldBuyPerDon });
const valueAtMarket = (data) => data.pureGoldBuyPerDon;
const startDate = "2026-10-01";
const endDate = "2026-10-12";
const input = (more = {}) => ({ startDate, endDate, startReference: { market: market(600000) }, historyRows: [], currentMarket: market(600000), valueAtMarket, ...more });

test("selected-period baseline is effective as of its start, not first changed day", () => {
  const points = prepareMyGoldTrendPoints(input({historyRows:[{sourceDate:"20261010",market:market(700000)}],currentMarket:market(700000)}));
  assert.equal(points[0].date,"20261001");
  assert.equal(points[0].valueWon,600000);
  assert.equal(points.at(-1).valueWon,700000);
});

test("no price change produces a flat chart and zero net change", () => {
  const points = prepareMyGoldTrendPoints(input());
  assert.equal(points.length,2);
  assert.equal(points[0].valueWon,points.at(-1).valueWon);
  assert.equal(points.at(-1).date,"20261012");
});

test("missing start-of-period price never fabricates a zero-change result", () => {
  assert.deepEqual(prepareMyGoldTrendPoints(input({startReference:null})),[]);
});

test("intermediate rise and reversal stays visible even if net change is zero", () => {
  const points = prepareMyGoldTrendPoints(input({
    historyRows:[{sourceDate:"20261003",market:market(750000)},{sourceDate:"20261009",market:market(600000)}],
  }));
  assert.equal(points[0].valueWon,points.at(-1).valueWon);
  assert.ok(points.some((p) => p.valueWon===750000));
});

test("different real calendar gaps get proportional SVG x coordinates", () => {
  const geometry = buildMyGoldTrendChartGeometry([
    {date:"20261001",valueWon:600000},
    {date:"20261002",valueWon:650000},
    {date:"20261011",valueWon:680000},
    {date:"20261012",valueWon:680000},
  ]);
  const xs = geometry.polyline.split(" ").map((point)=>Number(point.split(",")[0]));
  assert.ok(xs[2]-xs[1] > 5*(xs[1]-xs[0]));
});

test("rate change draws a vertical step at the same date instead of diagonal drift", () => {
  const points=prepareMyGoldTrendPoints(input({historyRows:[{sourceDate:"20261009",market:market(700000)}],currentMarket:market(700000)}));
  const pair=points.filter((p)=>p.date==="20261009");
  assert.equal(pair.length,2);
  const geo=buildMyGoldTrendChartGeometry(points);
  const xs=geo.polyline.split(" ").map((s)=>Number(s.split(",")[0]));
  assert.equal(xs[1],xs[2]);
});

test("invalid dates are rejected rather than spaced on an imaginary timeline", () => {
  assert.equal(goldTrendDateOrdinal("20260230"),null);
  assert.notEqual(goldTrendDateOrdinal("20240229"),null);
  assert.equal(goldTrendDateOrdinal("20260229"),null);
});

test("MY GOLD implementation uses as-of reference, timeline model, and respects bonus-only mode", () => {
  const hook=readFileSync("src/hooks/useMyGoldValueTrend.js","utf8");
  const ui=readFileSync("src/components/gold/MyGoldValueTrend.jsx","utf8");
  assert.match(hook,/getGoldPriceAtOrBefore\(startDate\)/);
  assert.match(hook,/prepareMyGoldTrendPoints\(/);
  assert.match(hook,/if \(bonusOnly\)/);
  assert.match(ui,/buildMyGoldTrendChartGeometry\(trend\.points\)/);
  assert.match(ui,/기간 시작일 대비/);
  assert.doesNotMatch(ui,/첫 공개 시세 대비/);
});
