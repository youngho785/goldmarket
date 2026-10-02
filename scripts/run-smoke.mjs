import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const npmCli = process.env.npm_execpath || "";
const headed = process.argv.includes("--headed");
const outputDir = path.resolve(root, "test-results", "smoke");
const emulatorLog = path.join(outputDir, "firebase-emulator-output.log");

function run(bin, args, options = {}, capture = false) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(bin, args, {
      cwd: options.cwd ?? root,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", ...(options.env ?? {}) },
      stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit",
      shell: false,
      windowsHide: false
    });
    let output = "";
    if (capture) {
      child.stdout?.on("data", (chunk) => { output += chunk.toString("utf8"); process.stdout.write(chunk); });
      child.stderr?.on("data", (chunk) => { output += chunk.toString("utf8"); process.stderr.write(chunk); });
    }
    child.once("error", rejectRun);
    child.once("close", (code) => resolveRun({ code: code ?? 1, output }));
  });
}

function runNode(args, options = {}, capture = false) {
  return run(process.execPath, args, options, capture);
}

function runNpm(args, options = {}, capture = false) {
  if (npmCli && existsSync(npmCli)) return runNode([npmCli, ...args], options, capture);
  if (process.platform === "win32") {
    const comspec = process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe";
    const quote = (value) => /[\s"&|<>^()]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value);
    return run(comspec, ["/d", "/s", "/c", ["npm", ...args].map(quote).join(" ")], options, capture);
  }
  return run("npm", args, options, capture);
}

function runFirebase(args, options = {}, capture = false) {
  return runNpm(["exec", "--yes", "--package=firebase-tools@15.30.2", "--", "firebase", ...args], options, capture);
}

function fail(message) {
  console.error(`\nSMOKE FAIL: ${message}`);
  console.error("No deployment was performed.");
  process.exitCode = 1;
}

if (!existsSync(path.join(root, "tests", "smoke", "node_modules", "@playwright", "test"))) {
  fail("Playwright is not installed. Run: npm run test:smoke:setup");
} else {
  console.log("KGM SMALL BROWSER SMOKE");
  console.log("6 critical desktop user flows only. Emulator data only. No deployment.");

  const build = await runNpm(["--prefix", "functions", "run", "build"]);
  if (build.code !== 0) {
    fail("Functions build failed.");
  } else {
    mkdirSync(outputDir, { recursive: true });
    const inner = headed
      ? "npm --prefix tests/smoke run test:inner:headed"
      : "npm --prefix tests/smoke run test:inner";
    const result = await runFirebase([
      "--config", "firebase.json",
      "--project", "demo-goldmarket",
      "emulators:exec",
      "--only", "auth,firestore,functions,storage",
      inner
    ], {
      env: {
        ENFORCE_APP_CHECK: "false",
        GCLOUD_PROJECT: "demo-goldmarket",
        GOOGLE_CLOUD_PROJECT: "demo-goldmarket",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        FIREBASE_STORAGE_EMULATOR_HOST: "127.0.0.1:9199",
        FUNCTIONS_EMULATOR_HOST: "127.0.0.1:5001",
        FUNCTIONS_DISCOVERY_TIMEOUT: "60"
      }
    }, true);

    writeFileSync(emulatorLog, result.output || "", "utf8");
    if (result.code !== 0) {
      fail(`One or more smoke flows failed. Log: ${emulatorLog}`);
    } else if (/Failed to (handle request for function|start functions|load function)/i.test(result.output || "")) {
      fail(`Functions Emulator load error detected. Log: ${emulatorLog}`);
    } else {
      console.log("\n========================================");
      console.log("SMALL BROWSER SMOKE: PASS");
      console.log("6/6 critical desktop flows completed.");
      console.log(`Report: ${path.join(outputDir, "report", "index.html")}`);
      console.log("No deployment was performed.");
    }
  }
}
