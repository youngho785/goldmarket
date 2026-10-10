import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGoldPriceDate } from "../../src/lib/goldPriceDate.js";
import { readKrxResponse, KRX_REQUEST_TIMEOUT_MS } from "../lib/goldPrice/krxTransport.js";
import { claimDecision, classifyPushBatch, isTransientPushError, MAX_PUSH_ATTEMPTS } from "../lib/notifications/delivery.js";

test("public compact and manual dates normalize, including leap-year validation", () => {
  assert.equal(normalizeGoldPriceDate("20261008"), "2026-10-08");
  assert.equal(normalizeGoldPriceDate("2026-10-08"), "2026-10-08");
  assert.equal(normalizeGoldPriceDate("20240229"), "2024-02-29");
  for (const value of ["20260229", "20261301", "20261032", null, 20261008]) {
    assert.equal(normalizeGoldPriceDate(value), "");
  }
});
test("KRX budget exhaustion makes no network call", async () => {
  let calls = 0;
  await assert.rejects(readKrxResponse(new URL("https://example.test"), 100,
    async () => { calls++; throw Error("must not call"); }, () => 100), /BUDGET_EXHAUSTED/);
  assert.equal(calls, 0);
});
test("KRX transport preserves HTTP failure, rejects HTML, and parses JSON", async () => {
  await assert.rejects(readKrxResponse(new URL("https://example.test"), Date.now()+10000,
    async () => new Response("secret body", {status:403})), /KRX_HTTP_403/);
  await assert.rejects(readKrxResponse(new URL("https://example.test"), Date.now()+10000,
    async () => new Response("<html>error</html>")), /KRX_INVALID_JSON/);
  assert.deepEqual(await readKrxResponse(new URL("https://example.test"), Date.now()+10000,
    async () => new Response('{"response":{}}')), {response:{}});
});
test("KRX timeout aborts stalled body while staying inside remaining budget", async () => {
  assert.equal(KRX_REQUEST_TIMEOUT_MS, 8000);
  await assert.rejects(readKrxResponse(new URL("https://example.test"), Date.now()+35,
    async (_, options) => ({ok:true, text:() => new Promise((_,reject) => {
      options.signal.addEventListener("abort", () => reject(Error("body aborted")), {once:true});
      // Keep Node alive while AbortSignal's unref timer is pending.
      const timer = setTimeout(() => reject(Error("test failed to abort")), 1000);
      options.signal.addEventListener("abort", () => clearTimeout(timer), {once:true});
    })})), /body aborted/);
});
test("delivery leases and terminal receipts prevent unbounded and concurrent delivery", () => {
  assert.equal(claimDecision({}, 100), "claim");
  assert.equal(claimDecision({leaseUntilMs:101},100), "busy");
  assert.equal(claimDecision({attempts:MAX_PUSH_ATTEMPTS},100), "exhausted");
  assert.equal(claimDecision({status:"complete"},100), "complete");
  assert.equal(claimDecision({attempts:1,leaseUntilMs:99},100), "claim");
  assert.equal(isTransientPushError("messaging/server-unavailable"), true);
  assert.equal(isTransientPushError("messaging/invalid-argument"), false);
  assert.equal(isTransientPushError("messaging/registration-token-not-registered"), false);
});
test("mixed FCM results retry only transient failures and never delete a valid token for bad payload", () => {
  const result = classifyPushBatch({responses:[
    {success:true},
    {success:false,error:{code:"messaging/server-unavailable"}},
    {success:false,error:{code:"messaging/registration-token-not-registered"}},
    {success:false,error:{code:"messaging/invalid-argument"}},
  ]}, ["success", "temporary", "expired", "valid-but-bad-payload"]);
  assert.deepEqual(result.accepted, ["success", "expired", "valid-but-bad-payload"]);
  assert.deepEqual(result.invalid, ["expired"]);
  assert.equal(result.transient, true);
  assert.equal(result.successes, 1);
});
