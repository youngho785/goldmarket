import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const groups = [
  {
    name: "core-source",
    fatal: true,
    files: [
      "package.json", "package-lock.json", "vite.config.js", "firebase.json",
      "firestore.rules", "storage.rules", "src/App.jsx", "functions/package.json",
      "functions/tsconfig.json", "tests/e2e/package.json", "tests/e2e/playwright.release.config.mjs",
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
  try { await access(path.join(root, rel)); return true; } catch { return false; }
}

const report = { generatedAt: new Date().toISOString(), groups: [], blockers: [], warnings: [] };
for (const group of groups) {
  const rows = [];
  for (const file of group.files) rows.push({ file, exists: await exists(file) });
  const missing = rows.filter((r) => !r.exists).map((r) => r.file);
  report.groups.push({ ...group, files: rows, missing });
  if (missing.length) {
    (group.fatal ? report.blockers : report.warnings).push({ group: group.name, missing });
  }
}

await mkdir(path.join(root, "test-results", "release-e2e"), { recursive: true });
await writeFile(
  path.join(root, "test-results", "release-e2e", "preflight.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

for (const group of report.groups) {
  console.log(`${group.missing.length ? "WARN" : "PASS"}: ${group.name}`);
  for (const file of group.missing) console.log(`  missing: ${file}`);
}
if (report.blockers.length) process.exitCode = 1;
