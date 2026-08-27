import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const firebaseClient = read("src/firebase/firebase.js");
const functionsIndex = read("functions/src/index.ts");
const rootEnvExample = read(".env.example");
const functionsEnvExample = read("functions/.env.example");
const gitignore = read(".gitignore");

assert.match(
  firebaseClient,
  /initializeAppCheck,\s*ReCaptchaV3Provider/,
  "Web client must import Firebase App Check."
);
assert.match(
  firebaseClient,
  /VITE_FIREBASE_APPCHECK_SITE_KEY/,
  "Web App Check site key must come from Vite environment configuration."
);
assert.match(
  firebaseClient,
  /provider:\s*new ReCaptchaV3Provider\(APP_CHECK_SITE_KEY\)/,
  "Web App Check must use the configured reCAPTCHA provider."
);
assert.match(
  firebaseClient,
  /import\.meta\.env\.DEV\s*&&\s*APP_CHECK_DEBUG_TOKEN/,
  "App Check debug token must only be enabled in Vite development mode."
);

const callableNames = [
  ...functionsIndex.matchAll(
    /export const\s+([A-Za-z0-9_]+)\s*=\s*onCall\b/g
  ),
].map((match) => match[1]);

const enforcementHookCount = (
  functionsIndex.match(
    /enforceAppCheck:\s*ENFORCE_APP_CHECK/g
  ) || []
).length;

assert.ok(
  callableNames.length > 0,
  "No callable Cloud Functions were detected."
);
assert.match(
  functionsIndex,
  /const ENFORCE_APP_CHECK\s*=[\s\S]{0,160}?process\.env\.ENFORCE_APP_CHECK\s*===\s*"true"/,
  "Callable App Check enforcement must remain controlled by ENFORCE_APP_CHECK."
);
assert.equal(
  enforcementHookCount,
  callableNames.length,
  `Every callable must use the shared App Check enforcement hook. callables=${callableNames.length}, hooks=${enforcementHookCount}`
);

assert.match(
  rootEnvExample,
  /^VITE_FIREBASE_APPCHECK_SITE_KEY=$/m,
  ".env.example must document the web App Check site key without committing a value."
);
assert.match(
  rootEnvExample,
  /^VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=$/m,
  ".env.example must document the debug token without committing a value."
);
assert.match(
  functionsEnvExample,
  /^ENFORCE_APP_CHECK=false$/m,
  "functions/.env.example must default App Check enforcement to false."
);
assert.match(
  gitignore,
  /^!functions\/\.env\.example$/m,
  "functions/.env.example must be explicitly allowed in Git."
);

console.log(
  `[OK] App Check policy guard: ${callableNames.length}/${callableNames.length} callable functions use the shared enforcement hook.`
);
console.log("[OK] Web App Check config is environment-based and debug-token values are not committed.");
console.log("[OK] Production enforcement remains an explicit rollout decision.");
