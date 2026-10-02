import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const supportSource = await readFile(
  new URL("../src/support/functions.ts", import.meta.url),
  "utf8"
);
const indexSource = await readFile(
  new URL("../src/index.ts", import.meta.url),
  "utf8"
);
const sharedSource = await readFile(
  new URL("../src/notifications/shared.ts", import.meta.url),
  "utf8"
);

test("new inquiry creates one deterministic admin service notification", () => {
  assert.match(supportSource, /const SUPPORT_TICKET_DOCUMENT = "supportTickets\/\{ticketId\}"/);
  assert.match(supportSource, /onDocumentCreated\([\s\S]*document: SUPPORT_TICKET_DOCUMENT/);
  assert.match(supportSource, /support-new-\$\{ticketId\}/);
  assert.match(supportSource, /addUniqueNotificationForAdmins/);
  assert.match(supportSource, /type:\s*"support_new_inquiry"/);
  assert.match(supportSource, /link:\s*ticketLink\("\/admin\/support",\s*ticketId\)/);
});

test("admin push preview never copies inquiry title or body to lock-screen notification", () => {
  const createdBlock = supportSource.slice(
    supportSource.indexOf("export const onSupportTicketCreate"),
    supportSource.indexOf("export const onSupportTicketAnswered")
  );
  assert.doesNotMatch(createdBlock, /\.title\b|\.content\b/);
  assert.match(createdBlock, /body:\s*"새로운 1:1 문의가 등록되었습니다\."/);
});

test("answer notification is sent only on transition into answered state", () => {
  assert.match(supportSource, /onDocumentUpdated\([\s\S]*document: SUPPORT_TICKET_DOCUMENT/);
  assert.match(
    supportSource,
    /if \(beforeStatus === "answered" \|\| afterStatus !== "answered"\) return;/
  );
  assert.match(supportSource, /type:\s*"support_answered"/);
  assert.match(supportSource, /link:\s*ticketLink\("\/support",\s*ticketId\)/);
  assert.match(supportSource, /read:\s*false/);
});

test("support service alerts stay outside marketing categories", () => {
  const categoryFunction = sharedSource.slice(
    sharedSource.indexOf("export function notificationCategory"),
    sharedSource.indexOf("export function marketingConsentAccepted")
  );
  assert.doesNotMatch(categoryFunction, /support_/);
  assert.match(categoryFunction, /return "other";/);
});

test("support notification triggers are exported for Firebase deployment", () => {
  assert.match(indexSource, /onSupportTicketCreate/);
  assert.match(indexSource, /onSupportTicketAnswered/);
  assert.match(indexSource, /from "\.\/support\/functions\.js"/);
});
