import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function parseEnvFile(relativePath) {
  if (!exists(relativePath)) return {};
  const result = {};
  for (const rawLine of read(relativePath).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function yn(value) {
  return value ? "YES" : "NO";
}

function boolLabel(value) {
  if (value === "true") return "true";
  if (value === "false") return "false";
  if (value == null || value === "") return "(unset)";
  return "(non-standard value)";
}

const webEnvFiles = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
].filter(exists);

const mergedWebEnv = {};
for (const file of webEnvFiles) {
  Object.assign(mergedWebEnv, parseEnvFile(file));
}

const webSiteKey =
  String(
    process.env.VITE_FIREBASE_APPCHECK_SITE_KEY ||
      mergedWebEnv.VITE_FIREBASE_APPCHECK_SITE_KEY ||
      ""
  ).trim();

const webDebugToken =
  String(
    process.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN ||
      mergedWebEnv.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN ||
      ""
  ).trim();

let projectId = "";
try {
  const firebaserc = JSON.parse(read(".firebaserc"));
  projectId = String(firebaserc?.projects?.default || "").trim();
} catch {
  // Status command is diagnostic only.
}

const functionsDir = path.join(root, "functions");
const functionEnvFiles = fs.existsSync(functionsDir)
  ? fs
      .readdirSync(functionsDir)
      .filter(
        (name) =>
          name === ".env" ||
          (name.startsWith(".env.") && name !== ".env.example")
      )
      .sort()
  : [];

const functionEnvStatus = functionEnvFiles.map((name) => {
  const relativePath = `functions/${name}`;
  const env = parseEnvFile(relativePath);
  return {
    file: relativePath,
    enforce: env.ENFORCE_APP_CHECK,
  };
});

const functionsIndex = read("functions/src/index.ts");
const callableCount = [
  ...functionsIndex.matchAll(
    /export const\s+([A-Za-z0-9_]+)\s*=\s*onCall\b/g
  ),
].length;
const enforcementHookCount = (
  functionsIndex.match(
    /enforceAppCheck:\s*ENFORCE_APP_CHECK/g
  ) || []
).length;

const androidBuild = exists("android/app/build.gradle")
  ? read("android/app/build.gradle")
  : "";
const androidMain = exists(
  "android/app/src/main/java/com/koreagoldmarket/app/MainActivity.java"
)
  ? read(
      "android/app/src/main/java/com/koreagoldmarket/app/MainActivity.java"
    )
  : "";
const packageJson = exists("package.json")
  ? read("package.json")
  : "";

const nativeAppCheckDetected =
  /firebase-appcheck-playintegrity|FirebaseAppCheck|PlayIntegrityAppCheckProviderFactory|capacitor-firebase[^"\n]*app-check|firebase-app-check/i.test(
    `${androidBuild}\n${androidMain}\n${packageJson}`
  );

const functionTrueFiles = functionEnvStatus
  .filter((item) => item.enforce === "true")
  .map((item) => item.file);

console.log("=== Korea Gold Market App Check readiness ===");
console.log(`Firebase project: ${projectId || "(unknown)"}`);
console.log(
  `Web/PWA App Check site key configured locally: ${yn(!!webSiteKey)}`
);
console.log(
  `Web debug token configured locally: ${yn(!!webDebugToken)}`
);
console.log(
  `Callable enforcement hooks: ${enforcementHookCount}/${callableCount}`
);
console.log(
  `Android native App Check provider detected in repository: ${yn(
    nativeAppCheckDetected
  )}`
);
console.log("");
console.log("Functions environment files:");
if (!functionEnvStatus.length) {
  console.log("  (none found)");
} else {
  for (const item of functionEnvStatus) {
    console.log(
      `  ${item.file}: ENFORCE_APP_CHECK=${boolLabel(item.enforce)}`
    );
  }
}
console.log("");
console.log(
  "Firebase Console App Check enforcement: UNKNOWN (cannot be determined from repository files)"
);

const readyForGlobalEnforcement =
  !!webSiteKey &&
  nativeAppCheckDetected &&
  enforcementHookCount === callableCount;

console.log("");
console.log(
  `Repository/client readiness for global enforcement: ${
    readyForGlobalEnforcement ? "READY" : "NOT READY"
  }`
);

if (!webSiteKey) {
  console.log(
    "- Web/PWA site key is not detected in local Vite environment files."
  );
}
if (!nativeAppCheckDetected) {
  console.log(
    "- Capacitor Android native App Check provider is not detected. Enforcing App Check globally can block the Android app."
  );
}
if (functionTrueFiles.length) {
  console.log(
    `- WARNING: ENFORCE_APP_CHECK=true is present in: ${functionTrueFiles.join(
      ", "
    )}`
  );
}
if (webDebugToken) {
  console.log(
    "- WARNING: A web debug token is configured locally. Never ship a debug token in a production build."
  );
}
console.log(
  "- Before enforcement, verify App Check request metrics in Firebase Console for every client actually in use."
);
