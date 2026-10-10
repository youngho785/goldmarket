import { type BatchResponse } from "firebase-admin/messaging";
import { createHash, randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../core/runtime.js";

export const MAX_PUSH_ATTEMPTS = 6;
export const PUSH_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const PUSH_LEASE_MS = 120_000;
export const deliveryHash = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export function isTransientPushError(code: string): boolean {
  return ["messaging/server-unavailable", "messaging/internal-error",
    "messaging/unknown-error", "messaging/quota-exceeded",
    "messaging/message-rate-exceeded", "messaging/device-message-rate-exceeded",
    "app/network-error"].includes(code);
}

export function claimDecision(data: FirebaseFirestore.DocumentData, now: number):
  "complete" | "busy" | "exhausted" | "claim" {
  if (data.status === "complete" || data.status === "exhausted") return "complete";
  if (Number(data.leaseUntilMs || 0) > now) return "busy";
  if (Number(data.attempts || 0) >= MAX_PUSH_ATTEMPTS) return "exhausted";
  return "claim";
}

export type PushDeliverySummary = { successes: number; attempted: boolean };

export async function withPushDelivery(
  notificationPath: string, createdMs: number,
  deliver: (receipts: Set<string>, acknowledge: (tokens: string[], successful?: number) => Promise<void>, priorSuccesses: number) => Promise<void>,
  finalize?: (summary: PushDeliverySummary) => Promise<void>
): Promise<void> {
  const ref = db().doc("pushDeliveryReceipts/" + deliveryHash(notificationPath));
  const finalizeRecorded = async () => {
    if (!finalize) return;
    const snap = await ref.get();
    await finalize({ successes: Number(snap.get("successes") || 0),
      attempted: snap.get("attempted") === true || Number(snap.get("successes") || 0) > 0 });
  };
  if (Date.now() - createdMs > PUSH_MAX_AGE_MS) {
    console.warn("[pushDelivery] expired");
    await finalizeRecorded();
    return;
  }
  const owner = randomUUID();
  const claim = await db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const decision = claimDecision(data, Date.now());
    if (decision === "exhausted") {
      console.error("[pushDelivery] attempts-exhausted");
      tx.set(ref, { status: "exhausted", leaseUntilMs: 0 }, { merge: true });
      return null;
    }
    if (decision === "complete") return null;
    if (decision === "busy") throw new Error("PUSH_DELIVERY_LEASE_BUSY");
    tx.set(ref, {
      status: "sending", owner, attempts: Number(data.attempts || 0) + 1,
      leaseUntilMs: Date.now() + PUSH_LEASE_MS,
      expiresAt: Timestamp.fromMillis(createdMs + 7 * PUSH_MAX_AGE_MS),
    }, { merge: true });
    return { receipts: new Set<string>(Array.isArray(data.acceptedHashes) ? data.acceptedHashes : []),
      successes: Number(data.successes || 0) };
  });
  if (!claim) { await finalizeRecorded(); return; }
  const finish = async (status: string) => db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.get("owner") === owner) tx.update(ref, { status, leaseUntilMs: 0 });
  });
  try {
    await deliver(claim.receipts, async (tokens, successful = 0) => {
      await ref.set({
        attempted: true,
        ...(tokens.length ? { acceptedHashes: FieldValue.arrayUnion(...tokens.map(deliveryHash)) } : {}),
        ...(successful ? { successes: FieldValue.increment(successful) } : {}),
      }, { merge: true });
    }, claim.successes);
    // Commit statistics before marking delivery complete. If this fails, the next
    // attempt finalizes from receipts without resending successful tokens.
    await finalizeRecorded();
    await finish("complete");
  } catch (error) {
    await finish("pending");
    throw error;
  }
}

export function classifyPushBatch(response: BatchResponse, tokens: string[]) {
  const accepted: string[] = [];
  const invalid: string[] = [];
  const permanentCodes: string[] = [];
  let transient = false;
  let successes = 0;
  response.responses.forEach((result, index) => {
    const token = tokens[index];
    if (!token) return;
    if (result.success) { successes++; accepted.push(token); return; }
    const code = result.error?.code || "";
    if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(code)) {
      invalid.push(token);
      accepted.push(token);
    } else if (isTransientPushError(code)) {
      transient = true;
    } else {
      accepted.push(token);
      permanentCodes.push(code);
    }
  });
  return { accepted, invalid, permanentCodes, transient, successes };
}
