import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planMyGoldGoalSave, sameMyGoldGoalSettings } from "../lib/notifications/myGoldGoalState.js";

const goals = (patch = {}) => ({
  enabled: true,
  valueTargetWon: 10_000_000,
  priceTargetPerDon: 700_000,
  priceDirection: "up",
  targetGoldBarG: 5,
  ...patch,
});
const reached = {
  valueGoalKey: "value:10000000", valueReached: true,
  priceGoalKey: "price:700000", priceReached: true,
  barGoalKey: "bar:5", barReached: true,
  lastPricePerDon: 800_000,
};

test("identical save is no-op, preserves revision and one-time reached state", () => {
  assert.equal(sameMyGoldGoalSettings(goals(), goals()), true);
  const plan = planMyGoldGoalSave(goals(), goals(), reached, 3);
  assert.deepEqual(plan, { changed: false, revision: 3, state: null });
});

test("change only value goal: reset value but retain already-reached price/bar", () => {
  const plan = planMyGoldGoalSave(goals(), goals({ valueTargetWon: 20_000_000 }), reached, 3);
  assert.equal(plan.changed, true);
  assert.equal(plan.revision, 4);
  assert.equal(plan.state.valueReached, false);
  assert.equal(plan.state.priceReached, true);
  assert.equal(plan.state.barReached, true);
  assert.equal(plan.state.valueGoalKey, "value:20000000");
});

test("price direction change re-arms only that price target", () => {
  const plan = planMyGoldGoalSave(goals(), goals({ priceDirection: "down" }), reached, 3);
  assert.equal(plan.state.priceGoalKey, "price-down:700000");
  assert.equal(plan.state.priceReached, false);
  assert.equal(plan.state.valueReached, true);
  assert.equal(plan.state.barReached, true);
});

test("goldbar target change re-arms only goldbar goal", () => {
  const plan = planMyGoldGoalSave(goals(), goals({ targetGoldBarG: 10 }), reached, 3);
  assert.equal(plan.state.barReached, false);
  assert.equal(plan.state.valueReached, true);
  assert.equal(plan.state.priceReached, true);
});

test("disabling goals never treats old achievements as active", () => {
  const plan = planMyGoldGoalSave(goals(), goals({ enabled: false }), reached, 3);
  assert.equal(plan.state.valueReached, false);
  assert.equal(plan.state.priceReached, false);
  assert.equal(plan.state.barReached, false);
});

test("re-enabling user-disabled goals re-arms them explicitly", () => {
  const plan = planMyGoldGoalSave(goals({ enabled: false }), goals(), reached, 3);
  assert.equal(plan.state.valueReached, false);
  assert.equal(plan.state.priceReached, false);
  assert.equal(plan.state.barReached, false);
});

test("legacy or malformed state is safely normalized", () => {
  const plan = planMyGoldGoalSave(goals({ enabled: false }), goals(), "bad", "not-a-number");
  assert.equal(plan.revision, 1);
  assert.equal(plan.state.valueReached, false);
});

test("goal save uses Firestore transaction and goal plan instead of unconditional reset", () => {
  const code = readFileSync("functions/src/notifications/myGoldAlerts.ts", "utf8");
  const save = code.split("export const saveMyGoldAlertGoals =")[1]?.split("export const checkMyGoldAlertGoals =")[0] || "";
  assert.match(save, /db\(\)\.runTransaction\(async \(tx\) =>/);
  assert.match(save, /planMyGoldGoalSave\(/);
  assert.match(save, /if \(plan\.changed\)/);
  assert.match(save, /if \(needsPreferenceUpdate\)/);
  assert.doesNotMatch(save, /myGoldAlertRevision:\s*nextRevision/);
  assert.doesNotMatch(save, /valueReached:\s*false/);
  assert.match(save, /await evaluateUserGoals\(uid, metrics, "save"\)/);
});
