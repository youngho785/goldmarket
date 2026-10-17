import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const groups = [
  {
    name: "core-source",
    fatal: true,
    files: [
      "package.json", "package-lock.json", "vite.config.js", "firebase.json",
      "firestore.rules", "storage.rules", "src/App.jsx", "functions/package.json",
      "functions/tsconfig.json",
      // The active release browser checks live in tests/smoke, not tests/e2e.
      "tests/smoke/package.json", "tests/smoke/playwright.config.mjs",
      "tests/smoke/playwright.mobile.config.mjs", "tests/smoke/specs/smoke.spec.mjs",
      "tests/smoke/specs/mobile.spec.mjs",
    ],
  },
  {
    name: "quality-gates",
    fatal: false,
    files: ["eslint.config.js", "functions/eslint.config.js", "tests/rules/package.json"],
  },
  {
    name: "android-rebuild",
    fatal: false,
    files: ["android/gradlew", "android/settings.gradle", "android/app/build.gradle"],
  },
  {
    name: "environment-template",
    fatal: false,
    files: [".env.example", "functions/.env.example"],
  },
];

async function exists(rel) {
  try { await access(join(root, rel)); return true; } catch { return false; }
}

const report = { generatedAt: new Date().toISOString(), groups: [], blockers: [], warnings: [] };
for (const group of groups) {
  const rows = await Promise.all(group.files.map(async (file) => ({ file, exists: await exists(file) })));
  const missing = rows.filter((r) => !r.exists).map((r) => r.file);
  report.groups.push({ ...group, files: rows, missing });
  if (missing.length) (group.fatal ? report.blockers : report.warnings).push({ group: group.name, missing });
}

await mkdir(join(root, "test-results", "preflight"), { recursive: true });
await writeFile(join(root, "test-results", "preflight", "report.json"), JSON.stringify(report, null, 2), "utf8");
for (const group of report.groups) {
  console.log(`${group.missing.length ? (group.fatal ? "FAIL" : "WARN") : "PASS"}: ${group.name}`);
  for (const file of group.missing) console.log(`  missing: ${file}`);
}
if (report.blockers.length) process.exitCode = 1;
