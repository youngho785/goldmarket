// 1:1 support notification triggers.
// These functions only create notification documents; the existing
// onNotificationCreate trigger is responsible for FCM/Web Push delivery.
import { FieldValue } from "firebase-admin/firestore";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import {
  addUniqueNotificationForAdmins,
  db,
} from "../core/runtime.js";

const REGION = "asia-northeast3";
const SUPPORT_TICKET_DOCUMENT = "supportTickets/{ticketId}";

function cleanId(value: unknown, maxLength = 120): string {
  return String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, maxLength);
}

function ticketLink(prefix: "/support" | "/admin/support", ticketId: string): string {
  return `${prefix}/${encodeURIComponent(ticketId)}`;
}

/**
 * A newly-created inquiry is an operational task, not marketing.
 * Use one deterministic notification document per ticket/admin so retries
 * update the existing document instead of creating duplicate push events.
 */
export const onSupportTicketCreate = onDocumentCreated(
  { region: REGION, document: SUPPORT_TICKET_DOCUMENT },
  async (event) => {
    const ticketId = cleanId(event.params.ticketId);
    if (!ticketId || !event.data) return;

    const notificationId = `support-new-${ticketId}`;
    const recipientCount = await addUniqueNotificationForAdmins(
      notificationId,
      {
        type: "support_new_inquiry",
        title: "새로운 1:1 문의",
        body: "새로운 1:1 문의가 등록되었습니다.",
        link: ticketLink("/admin/support", ticketId),
        meta: {
          supportTicketId: ticketId,
          notificationKind: "support_new_inquiry",
        },
      }
    );

    console.log("[onSupportTicketCreate] admin notification created", {
      ticketId,
      recipientCount,
    });
  }
);

/**
 * Notify the inquiry author only when a ticket moves into answered state.
 * Editing an already-answered reply does not send another notification.
 * If an answer is removed and the ticket is answered again later, the new
 * Firestore event id creates one new notification for that new transition.
 */
export const onSupportTicketAnswered = onDocumentUpdated(
  { region: REGION, document: SUPPORT_TICKET_DOCUMENT },
  async (event) => {
    const before = event.data?.before.data() || {};
    const after = event.data?.after.data() || {};

    const beforeStatus = String(before.status || "").trim();
    const afterStatus = String(after.status || "").trim();

    if (beforeStatus === "answered" || afterStatus !== "answered") return;

    const ticketId = cleanId(event.params.ticketId);
    const authorId = String(after.authorId || "").trim().slice(0, 128);
    if (!ticketId || !authorId || authorId.includes("/")) return;

    const eventKey = cleanId(event.id, 80) || "answered";
    const notificationId = `support-answered-${ticketId}-${eventKey}`;
    const notificationRef = db().doc(
      `notifications/${authorId}/items/${notificationId}`
    );

    await notificationRef.set({
      type: "support_answered",
      title: "1:1 문의 답변이 등록되었습니다",
      body: "문의하신 내용에 답변이 도착했습니다.",
      link: ticketLink("/support", ticketId),
      meta: {
        supportTicketId: ticketId,
        notificationKind: "support_answered",
      },
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });

    console.log("[onSupportTicketAnswered] user notification created", {
      ticketId,
      authorId,
    });
  }
);
