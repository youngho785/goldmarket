import { FieldValue } from "firebase-admin/firestore";
import { db } from "../core/runtime.js";

// Preserve the same three legacy administrator selectors and deduplicate recipients.
export async function readReservationAdminRecipients(
  tx: FirebaseFirestore.Transaction
): Promise<string[]> {
  const users = db().collection("users");
  const snapshots = await Promise.all([
    tx.get(users.where("role", "in", ["admin", "superAdmin"])),
    tx.get(users.where("admin", "==", true)),
    tx.get(users.where("superAdmin", "==", true)),
  ]);
  return [...new Set(snapshots.flatMap(snapshot => snapshot.docs.map(doc => doc.id)))];
}

export function writeReservationAdminNotifications(
  tx: FirebaseFirestore.Transaction,
  recipients: string[],
  payload: { type: string; title: string; body: string; link: string; meta: Record<string, unknown> }
): void {
  // Uncommitted transaction retries discard their generated IDs. Only one commit
  // persists the status, slot, customer notification and administrator notifications.
  recipients.forEach(uid => {
    tx.create(db().collection("notifications").doc(uid).collection("items").doc(), {
      ...payload, createdAt: FieldValue.serverTimestamp(), read: false,
    });
  });
}
