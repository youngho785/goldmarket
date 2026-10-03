import fs from "node:fs";
import path from "node:path";

const lockPath = path.resolve(process.cwd(), "package-lock.json");
const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
const packages = lock.packages || {};

function parse(v) {
  const [a = 0, b = 0, c = 0] = String(v || "0").split(".").map((x) => Number.parseInt(x, 10) || 0);
  return [a, b, c];
}
function cmp(a, b) {
  const av = parse(a), bv = parse(b);
  for (let i = 0; i < 3; i += 1) {
    if (av[i] !== bv[i]) return av[i] < bv[i] ? -1 : 1;
  }
  return 0;
}
function packageVersions(name) {
  const suffix = `/node_modules/${name}`;
  return Object.entries(packages)
    .filter(([key]) => key === `node_modules/${name}` || key.endsWith(suffix))
    .map(([key, value]) => ({ key, version: String(value?.version || "") }));
}
function failIf(name, predicate, reason) {
  const versions = packageVersions(name);
  for (const { key, version } of versions) {
    const installedPath = path.resolve(process.cwd(), key, "package.json");
    if (!fs.existsSync(installedPath)) throw new Error(`Missing installed dependency: ${key}`);
    const installed = JSON.parse(fs.readFileSync(installedPath, "utf8"));
    if (installed.version !== version) throw new Error(`Lock/install mismatch: ${key} lock=${version} installed=${installed.version}`);
  }
  const bad = versions.filter(({ version }) => predicate(version));
  if (bad.length) {
    throw new Error(`${reason}: ${bad.map((x) => `${x.key}@${x.version}`).join(", ")}`);
  }
}

failIf("@fastify/busboy", (v) => cmp(v, "3.2.2") < 0,
  "@fastify/busboy must be >= 3.2.2");
failIf("qs", (v) => cmp(v, "6.16.0") < 0,
  "qs must be >= 6.16.0");
failIf("brace-expansion", (v) => {
  const [maj] = parse(v);
  if (maj === 1) return cmp(v, "1.1.21") < 0;
  if (maj === 2) return cmp(v, "2.1.7") < 0;
  if (maj === 3) return cmp(v, "3.0.9") < 0;
  if (maj === 4) return true;
  if (maj === 5) return cmp(v, "5.0.12") < 0;
  return false;
}, "brace-expansion contains a known vulnerable version");
failIf("uuid", (v) => {
  const [maj] = parse(v);
  if (maj < 11) return true;
  if (maj === 11) return cmp(v, "11.1.1") < 0;
  if (maj === 12) return v === "12.0.0";
  if (maj === 13) return v === "13.0.0";
  return false;
}, "uuid contains a known vulnerable version");

for (const name of ["@fastify/busboy", "brace-expansion", "qs", "uuid"]) {
  console.log(`${name}: ${packageVersions(name).map((x) => x.version).join(", ") || "not installed"}`);
}
console.log("Functions targeted dependency security check: PASS");
