import assert from "node:assert/strict";
import test from "node:test";
import {
  redactSensitiveText,
  sanitizeArea,
  sanitizeClientEvent,
  sanitizeLevel,
  sanitizeRoute,
} from "../src/monitoring/privacy.js";

const sampleJwt =
  "eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOiJ1c2VyMTIzNDU2Nzg5MCJ9.signature1234567890";

test("monitoring privacy redacts common personal and credential values", () => {
  const raw = [
    "person@example.com",
    "010-1234-5678",
    "Bearer secret-token-value",
    sampleJwt,
    "https://example.com/path?oobCode=super-secret&email=person@example.com",
  ].join(" ");

  const redacted = redactSensitiveText(raw, 5000);

  assert.doesNotMatch(redacted, /person@example\.com/);
  assert.doesNotMatch(redacted, /010-1234-5678/);
  assert.doesNotMatch(redacted, /secret-token-value/);
  assert.doesNotMatch(redacted, /eyJhbGciOiJIUzI1NiJ9/);
  assert.match(redacted, /\[redacted-email\]/);
  assert.match(redacted, /\[redacted-phone\]/);
  assert.match(redacted, /Bearer \[redacted\]/);
  assert.match(redacted, /https:\/\/example\.com\/path\[query-redacted\]/);
});

test("monitoring routes never keep query strings or hashes", () => {
  assert.equal(
    sanitizeRoute("https://www.koreagoldmarket.com/settings?token=secret#privacy"),
    "/settings"
  );
  assert.equal(sanitizeRoute("/gold-exchange?mode=manual"), "/gold-exchange");
  assert.equal(sanitizeRoute("not-a-route"), "/not-a-route");
  assert.equal(
    sanitizeRoute("/support/abcdefghijklmnopqrstuvwx?token=secret"),
    "/support/:redacted"
  );
});

test("monitoring categories and severities are allowlisted", () => {
  assert.equal(sanitizeArea("settings"), "settings");
  assert.equal(sanitizeArea("member-email-address"), "unknown");
  assert.equal(sanitizeLevel("fatal"), "fatal");
  assert.equal(sanitizeLevel("panic"), "error");
});

test("client monitoring event keeps diagnostics but strips sensitive input", () => {
  const event = sanitizeClientEvent({
    eventId: "event-1",
    occurredAt: 123,
    release: "kgm-web@abc123",
    environment: "production",
    route: "/profile?email=person@example.com",
    platform: "web",
    deviceClass: "mobile",
    online: true,
    error: new Error("Could not load person@example.com at 010-1234-5678"),
    context: {
      source: "react-router",
      area: "routing",
      action: "open-settings",
      level: "error",
      recovered: false,
      email: "must-not-pass-through@example.com",
    },
  });

  assert.equal(event.route, "/profile");
  assert.equal(event.context.area, "routing");
  assert.equal(event.context.source, "react-router");
  assert.equal(event.context.recovered, false);
  assert.ok(!("email" in event.context));
  assert.doesNotMatch(event.error.message, /person@example\.com/);
  assert.doesNotMatch(event.error.message, /010-1234-5678/);
});
