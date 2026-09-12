import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const listFilesRecursive = (relativeDirectory, extension = ".ts") => {
  const absoluteDirectory = path.join(root, relativeDirectory);
  const files = [];

  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const childRelativePath = path.join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(childRelativePath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(childRelativePath);
    }
  }

  return files;
};

const firebaseClient = read("src/firebase/firebase.js");
const functionsRuntime = read("functions/src/core/runtime.ts");
const functionSourceFiles = listFilesRecursive("functions/src");
const functionSources = functionSourceFiles.map((relativePath) => ({
  relativePath,
  source: read(relativePath),
}));
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

const callablePattern =
  /export const\s+([A-Za-z0-9_]+)\s*=\s*onCall\b/g;
const enforcementPattern =
  /enforceAppCheck:\s*ENFORCE_APP_CHECK/g;

const callables = functionSources.flatMap(({ relativePath, source }) =>
  [...source.matchAll(callablePattern)].map((match) => ({
    name: match[1],
    relativePath,
  }))
);

const enforcementHookCount = functionSources.reduce(
  (count, { source }) =>
    count + (source.match(enforcementPattern) || []).length,
  0
);

assert.ok(
  callables.length > 0,
  "No callable Cloud Functions were detected."
);
assert.match(
  functionsRuntime,
  /export const ENFORCE_APP_CHECK\s*=\s*process\.env\.ENFORCE_APP_CHECK\s*===\s*"true"/,
  "Callable App Check enforcement must remain controlled by ENFORCE_APP_CHECK."
);
assert.equal(
  enforcementHookCount,
  callables.length,
  `Every callable must use the shared App Check enforcement hook. callables=${callables.length}, hooks=${enforcementHookCount}`
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
  `[OK] App Check policy guard: ${callables.length}/${callables.length} callable functions use the shared enforcement hook.`
);
console.log(
  `[OK] Callable scan covers ${functionSourceFiles.length} TypeScript files under functions/src.`
);
console.log("[OK] Web App Check config is environment-based and debug-token values are not committed.");
console.log("[OK] Production enforcement remains an explicit rollout decision.");
