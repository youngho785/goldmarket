import assert from "node:assert/strict";
import {
  bookingBlockReason,
  canTransitionExchangeStatus,
  normalizeAvailabilityEntry,
} from "../lib/bookingPolicy.js";

assert.equal(canTransitionExchangeStatus("requested", "scheduled"), true);
assert.equal(canTransitionExchangeStatus("scheduled", "in_progress"), true);
assert.equal(canTransitionExchangeStatus("in_progress", "completed"), true);
assert.equal(canTransitionExchangeStatus("rejected", "requested"), true);
assert.equal(canTransitionExchangeStatus("scheduled", "completed"), false);
assert.equal(canTransitionExchangeStatus("canceled", "requested"), false);
assert.equal(canTransitionExchangeStatus("completed", "requested"), false);

const allowed = new Set(["11:00", "12:00", "13:00"]);
assert.deepEqual(
  normalizeAvailabilityEntry({ blockedSlots: ["12:00", "99:00", "12:00"], reason: " 외부 일정 " }, allowed),
  { closed: false, blockedSlots: ["12:00"], reason: "외부 일정" }
);
assert.equal(
  bookingBlockReason({ dates: { "2026-08-25": { closed: true, reason: "휴무" } } }, "2026-08-25", "11:00", allowed),
  "휴무"
);
assert.equal(
  bookingBlockReason({ dates: { "2026-08-26": { blockedSlots: ["12:00"] } } }, "2026-08-26", "12:00", allowed),
  "해당 시간은 예약을 받지 않습니다."
);
assert.equal(
  bookingBlockReason({ dates: { "2026-08-26": { blockedSlots: ["12:00"] } } }, "2026-08-26", "11:00", allowed),
  ""
);

console.log("booking policy tests passed");
