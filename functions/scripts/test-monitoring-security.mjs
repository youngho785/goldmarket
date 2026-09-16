import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

const [reporterSource, loggerSource, indexSource] = await Promise.all([
  read("src/monitoring/clientErrorReporting.ts"),
  read("src/monitoring/structuredLogger.ts"),
  read("src/index.ts"),
]);

test("client error callable follows shared App Check rollout and cost bounds", () => {
  assert.match(reporterSource, /export const reportClientError = onCall/);
  assert.match(reporterSource, /enforceAppCheck:\s*ENFORCE_APP_CHECK/);
  assert.match(reporterSource, /timeoutSeconds:\s*10/);
  assert.match(reporterSource, /memory:\s*"128MiB"/);
  assert.match(reporterSource, /maxInstances:\s*3/);
  assert.match(reporterSource, /RATE_LIMIT_PER_CLIENT = 30/);
  assert.match(reporterSource, /createHash\("sha256"\)/);
  assert.match(reporterSource, /request\.rawRequest\?\.ip/);
});

test("client error logs keep only authentication state and redact payload text", () => {
  assert.match(reporterSource, /authenticated:\s*Boolean\(request\.auth\?\.uid\)/);
  assert.match(reporterSource, /appCheck:\s*request\.app \? "valid" : "missing"/);
  assert.match(reporterSource, /\[redacted-email\]/);
  assert.match(reporterSource, /\[redacted-phone\]/);
  assert.match(reporterSource, /Bearer \[redacted\]/);
  assert.match(reporterSource, /MAX_STACK_LENGTH = 7000/);
  assert.doesNotMatch(reporterSource, /collection\(|getFirestore|setDoc|addDoc/);
});

test("operational logs use a versioned structured envelope and public export", () => {
  assert.match(loggerSource, /kgmMonitoring:\s*\{/);
  assert.match(loggerSource, /schemaVersion:\s*1/);
  assert.match(loggerSource, /eventType:\s*input\.eventType/);
  assert.match(indexSource, /reportClientError/);
  assert.match(indexSource, /\.\/monitoring\/clientErrorReporting\.js/);
});
