import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const npmCli = process.env.npm_execpath || '';

const results = [];
const startedAt = new Date();

function run(bin, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    let child;
    try {
      child = spawn(bin, args, {
        cwd: options.cwd ?? root,
        env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', ...(options.env ?? {}) },
        stdio: 'inherit',
        shell: false,
        windowsHide: false,
      });
    } catch (error) {
      rejectRun(error);
      return;
    }
    child.once('error', rejectRun);
    child.once('close', (code) => resolveRun({ code: code ?? 1 }));
  });
}

function runNode(args, options = {}) {
  return run(process.execPath, args, options);
}

function runNpm(args, options = {}) {
  if (npmCli && existsSync(npmCli)) {
    return runNode([npmCli, ...args], options);
  }

  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
    const quote = (value) => {
      const s = String(value);
      if (!/[\s"&|<>^()]/.test(s)) return s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const command = ['npm', ...args].map(quote).join(' ');
    return run(comspec, ['/d', '/s', '/c', command], options);
  }

  return run('npm', args, options);
}

function runFirebase(args, options = {}) {
  return runNpm([
    'exec',
    '--yes',
    '--package=firebase-tools@15.30.2',
    '--',
    'firebase',
    ...args,
  ], options);
}

async function step(name, fn) {
  const start = Date.now();
  process.stdout.write(`\n=== ${name} ===\n`);
  try {
    const outcome = await fn();
    const code = typeof outcome === 'number' ? outcome : outcome?.code ?? 1;
    const ok = code === 0;
    results.push({ name, ok, code, durationMs: Date.now() - start });
    process.stdout.write(`${ok ? 'PASS' : 'FAIL'}: ${name}\n`);
    return ok;
  } catch (error) {
    results.push({ name, ok: false, code: 1, durationMs: Date.now() - start, error: String(error?.stack || error) });
    process.stdout.write(`FAIL: ${name}\n${String(error?.stack || error)}\n`);
    return false;
  }
}

function requirePath(relativePath) {
  const full = resolve(root, relativePath);
  if (!existsSync(full)) {
    throw new Error(`Required path is missing: ${relativePath}`);
  }
}

async function main() {
  console.log('KGM SIMPLE RELEASE GATE');
  console.log(`Project: ${root}`);
  console.log('This gate does not deploy anything and does not touch production data.');

  const preflight = await step('PREFLIGHT', async () => {
    for (const p of [
      'package.json',
      'firebase.json',
      'firestore.rules',
      'storage.rules',
      'src/App.jsx',
      'src/pages/AndroidHome.jsx',
      'functions/package.json',
      'functions/tsconfig.json',
      'tests/rules/package.json',
    ]) requirePath(p);
    if (existsSync(resolve(root, 'tests/e2e'))) {
      throw new Error('Old tests/e2e folder is still active. Archive it before using the simple release gate.');
    }
    return 0;
  });
  if (!preflight) return finish(1);

  const sourcePreflight = await step('SOURCE PREFLIGHT', () => runNode(['scripts/test-release-preflight.mjs']));
  if (!sourcePreflight) return finish(1);

  const build = await step('WEB BUILD', () => runNpm(['run', 'build']));
  if (!build) return finish(1);

  const seoGuides = await step('SEO GUIDES', () => runNpm(['run', 'test:seo-guides']));
  if (!seoGuides) return finish(1);

  const functionsBuild = await step('FUNCTIONS BUILD', () => runNpm(['--prefix', 'functions', 'run', 'build']));
  if (!functionsBuild) return finish(1);

  const functionDeps = await step('FUNCTION DEPENDENCIES', () => runNpm(['--prefix', 'functions', 'run', 'test:dependency-security']));
  if (!functionDeps) return finish(1);

  const operationsUnit = await step('OPERATIONS RECOVERY UNIT',
    () => runNode(['--test', 'functions/scripts/test-operations-patch.mjs']));
  if (!operationsUnit) return finish(1);
  const operationsEmulator = await step('OPERATIONS RECOVERY EMULATOR', () => runFirebase([
    '--config', 'firebase.json', '--project', 'demo-goldmarket',
    'emulators:exec', '--only', 'firestore,auth',
    'node functions/scripts/test-operations-patch-emulator.mjs',
  ], { env: { GCLOUD_PROJECT: 'demo-goldmarket', GOOGLE_CLOUD_PROJECT: 'demo-goldmarket' } }));
  if (!operationsEmulator) return finish(1);


  const dailyHistory = await step('DAILY GOLD PRICE HISTORY', () => runNode(['--test', 'scripts/test-daily-gold-price.mjs']));
  if (!dailyHistory) return finish(1);

  const goldCalc = await step('GOLD CALCULATION', () => runNode(['scripts/test-gold-bar-fee.mjs']));
  if (!goldCalc) return finish(1);

  const goldDisplay = await step('GOLD DISPLAY CONSISTENCY', () => runNpm(['run', 'test:gold-display']));
  if (!goldDisplay) return finish(1);

  const memberGoldVisitPolicy = await step('MEMBER GOLD VISIT POLICY',
    async () => runNode(['--test', 'functions/scripts/test-bonus-usage-visit-policy.mjs']));
  if (!memberGoldVisitPolicy) return finish(1);

  const goalIdempotence = await step('MY GOLD GOAL IDEMPOTENCE', () => runNode(['functions/scripts/test-my-gold-goal-idempotence.mjs']));
  if (!goalIdempotence) return finish(1);

  const trendTimeline = await step('MY GOLD TREND TIMELINE', () => runNode(['--test', 'scripts/test-my-gold-trend-timeline.mjs']));
  if (!trendTimeline) return finish(1);

  const rateTrustCopy = await step('MY GOLD RATE TRUST COPY', () => runNode(['--test', 'scripts/test-my-gold-rate-trust-copy.mjs']));
  if (!rateTrustCopy) return finish(1);

  const priceDate = await step('GOLD PRICE DATE LABEL', () => runNode(['--test', 'scripts/test-gold-price-date-presentation.mjs']));
  if (!priceDate) return finish(1);

  const pricePolicy = await step('GOLD PRICE POLICY REGRESSION', () => runNode(['--test', 'scripts/test-kgm-price-date-fix.mjs']));
  if (!pricePolicy) return finish(1);

  const guestVaultSafety = await step('GUEST MY GOLD PRESERVATION',
    () => runNode(['--test', 'scripts/test-guest-my-gold-preservation.mjs']));
  if (!guestVaultSafety) return finish(1);

  const guestImportSafety = await step('GUEST MY GOLD ACCOUNT IMPORT',
    () => runNode(['--test', 'scripts/test-guest-my-gold-import.mjs']));
  if (!guestImportSafety) return finish(1);

  const onboardingExperience = await step('EXPERIENCE ONBOARDING UX',
    () => runNode(['--test', 'scripts/test-experience-onboarding-continuity.mjs']));
  if (!onboardingExperience) return finish(1);

  const quickHelp = await step('QUICK CALCULATOR HELP UX', () => runNode(['--test', 'scripts/test-quick-calc-help-layout.mjs']));
  if (!quickHelp) return finish(1);

  const homeFlowUx = await step('HOME JOURNEY UX', () => runNode(['--test', 'scripts/test-home-journey-consistency.mjs']));
  if (!homeFlowUx) return finish(1);

  const exchangeClarity = await step('GOLD EXCHANGE RESERVATION UX', () => runNode(['--test', 'scripts/test-gold-exchange-reservation-clarity.mjs']));
  if (!exchangeClarity) return finish(1);

  const bookingUx = await step('BOOKING UX POLICY', () => runNode(['--test', 'scripts/test-kgm-ux-phase4c.mjs', 'scripts/test-kgm-ux-phase4d.mjs']));
  if (!bookingUx) return finish(1);

  const screenTrust = await step('GOLD EXCHANGE SCREEN TRUST', () => runNode(['--test', 'scripts/test-gold-exchange-screen-trust.mjs']));
  if (!screenTrust) return finish(1);

  const rateReadiness = await step('GOLD RATE READINESS', () => runNode(['scripts/test-gold-exchange-rate-readiness.mjs']));
  if (!rateReadiness) return finish(1);

  const myGoldRateReadiness = await step('MY GOLD RATE READINESS', () => runNode(['scripts/test-my-gold-rate-readiness.mjs']));
  if (!myGoldRateReadiness) return finish(1);

  const authStatic = await step('AUTH SAFETY', () => runNode(['scripts/test-auth-core-safety.mjs']));
  if (!authStatic) return finish(1);

  const authSmokeGuard = await step('AUTH SMOKE STATIC GUARD', () => runNode(['--test', 'scripts/test-auth-e2e-safety.mjs']));
  if (!authSmokeGuard) return finish(1);

  const memberAuthCopy = await step('MEMBER AUTH ERROR COPY', () => runNode(['--test', 'scripts/test-member-auth-error-copy.mjs']));
  if (!memberAuthCopy) return finish(1);

  const authResume = await step('AUTH RESUME EXPERIENCE', () => runNode(['--test', 'scripts/test-auth-reservation-resume.mjs']));
  if (!authResume) return finish(1);

  const memberGoldUx = await step('MEMBER GOLD UX INTEGRATION', () => runNode(['--test', 'scripts/test-member-gold-ux-integration.mjs']));
  if (!memberGoldUx) return finish(1);

  const appCheck = await step('APP CHECK POLICY', () => runNpm(['run', 'test:app-check']));
  if (!appCheck) return finish(1);

  const rules = await step('FIRESTORE/STORAGE RULES', () => runFirebase([
    '--config',
    'firebase.json',
    '--project',
    'demo-goldmarket',
    'emulators:exec',
    '--only',
    'firestore,storage',
    'npm --prefix tests/rules test',
  ]));
  if (!rules) return finish(1);

  const functionPolicy = await step('FUNCTION POLICY', () => runNpm(['--prefix', 'functions', 'run', 'test:policy']));
  if (!functionPolicy) return finish(1);

  const accountDeletion = await step('ACCOUNT DELETION SECURITY', () => runNpm(['--prefix', 'functions', 'run', 'test:account-deletion']));
  if (!accountDeletion) return finish(1);

  const nickname = await step('NICKNAME SECURITY', () => runNpm(['--prefix', 'functions', 'run', 'test:nickname-security']));
  if (!nickname) return finish(1);

  const releaseSafety = await step('FUNCTION RELEASE SAFETY', () => runNpm(['--prefix', 'functions', 'run', 'test:release-safety']));
  if (!releaseSafety) return finish(1);

  const monitoring = await step('MONITORING SECURITY', () => runNpm(['run', 'test:monitoring']));
  if (!monitoring) return finish(1);

  const analytics = await step('PRODUCT ANALYTICS', () => runNpm(['run', 'test:analytics']));
  if (!analytics) return finish(1);

  const ux = await step('UX STATIC SAFETY', () => runNpm(['run', 'test:ux-upgrade']));
  if (!ux) return finish(1);

  const ui = await step('UI STATIC SAFETY', () => runNpm(['run', 'test:ui-safety']));
  if (!ui) return finish(1);

  const experience5v2 = await step('EXPERIENCE PHASE 5 DESIGN V2', () => runNode(['--test', 'scripts/test-experience-phase5-v2.mjs']));
  if (!experience5v2) return finish(1);

  const experience5 = await step('EXPERIENCE PHASE 5 DESIGN', () => runNode(['--test', 'scripts/test-experience-phase5.mjs']));
  if (!experience5) return finish(1);

  const experience4 = await step('EXPERIENCE PHASE 4', () => runNode(['--test', 'scripts/test-experience-phase4.mjs', 'scripts/test-kgm-ux-home-phase2.mjs', 'scripts/test-ux-exchange-decision.mjs']));
  if (!experience4) return finish(1);

  return finish(0);
}

function finish(exitCode) {
  const outputDir = resolve(root, 'test-results', 'simple-release');
  mkdirSync(outputDir, { recursive: true });
  const summary = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    exitCode,
    results,
  };
  writeFileSync(resolve(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log('\n========================================');
  console.log('KGM SIMPLE RELEASE SUMMARY');
  console.log('========================================');
  for (const r of results) {
    const secs = (r.durationMs / 1000).toFixed(1);
    console.log(`${r.name.padEnd(28)} ${r.ok ? 'PASS' : 'FAIL'}  ${secs}s`);
  }
  console.log('----------------------------------------');
  console.log(exitCode === 0 ? 'CORE RELEASE GATE: PASS' : 'CORE RELEASE GATE: FAIL');
  console.log('No deployment was performed.');
  console.log(`Summary: ${resolve(outputDir, 'summary.json')}`);
  process.exitCode = exitCode;
  return exitCode;
}

await main();
