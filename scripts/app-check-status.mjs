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

function walkFiles(directory, predicate) {
  if (!fs.existsSync(directory)) return [];

  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(absolute, predicate));
    } else if (predicate(absolute)) {
      result.push(absolute);
    }
  }
  return result;
}

function inspectCallableAppCheck() {
  const sourceRoot = path.join(root, "functions", "src");
  const sourceFiles = walkFiles(sourceRoot, (file) => file.endsWith(".ts"));
  const callables = [];

  for (const absolute of sourceFiles) {
    const source = fs.readFileSync(absolute, "utf8");
    const matches = [...source.matchAll(/export const\s+([A-Za-z0-9_]+)\s*=\s*onCall\b/g)];

    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const start = match.index ?? 0;
      const nextExport = source.indexOf("export const ", start + match[0].length);
      const end = nextExport >= 0 ? nextExport : source.length;
      const section = source.slice(start, end);

      callables.push({
        name: match[1],
        file: path.relative(root, absolute).replaceAll("\\", "/"),
        enforced: /enforceAppCheck:\s*ENFORCE_APP_CHECK/.test(section),
      });
    }
  }

  return callables;
}

const callableAppCheck = inspectCallableAppCheck();
const callableCount = callableAppCheck.length;
const enforcementHookCount = callableAppCheck.filter((item) => item.enforced).length;
const missingEnforcement = callableAppCheck.filter((item) => !item.enforced);

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
if (missingEnforcement.length) {
  for (const item of missingEnforcement) {
    console.log(`  MISSING: ${item.name} (${item.file})`);
  }
}
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
