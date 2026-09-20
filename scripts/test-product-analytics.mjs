import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

const [
  analyticsSource,
  mainSource,
  landingSource,
  quickGoldValueCalculatorSource,
  registerSource,
  myGoldVaultSource,
  goldExchangeSource,
  packageText,
] = await Promise.all([
  read("src/analytics/productAnalytics.js"),
  read("src/main.jsx"),
  read("src/pages/LandingPage.jsx"),
  read("src/components/gold/QuickGoldValueCalculator.jsx"),
  read("src/pages/Register.jsx"),
  read("src/pages/MyGoldVault.jsx"),
  read("src/pages/GoldExchange.jsx"),
  read("package.json"),
]);

const packageJson = JSON.parse(packageText);

test("Firebase Analytics foundation disables automatic page views and never assigns a user id", () => {
  assert.match(analyticsSource, /initializeAnalytics\(app,\s*\{[\s\S]*send_page_view:\s*false/);
  assert.match(analyticsSource, /setDefaultEventParameters\(\{[\s\S]*app_surface:/);
  assert.doesNotMatch(analyticsSource, /setUserId\s*\(/);
  assert.match(mainSource, /initializeProductAnalytics/);
});

test("analytics accepts only the small allowlisted KGM funnel schema", () => {
  for (const eventName of [
    "landing_view",
    "landing_value_calculated",
    "mygold_cta_clicked",
    "sign_up",
    "mygold_first_item_created",
    "exchange_calculated",
    "reservation_completed",
  ]) {
    assert.match(analyticsSource, new RegExp(`${eventName}:`));
  }

  assert.match(analyticsSource, /gold_category/);
  assert.match(analyticsSource, /weight_band/);
  assert.doesNotMatch(
    analyticsSource,
    /(?:email|phone|address|user_id|uid|inquiry_text|memo_text)\s*:/i
  );
});

test("landing funnel logs view, a debounced value calculation, and the MY GOLD CTA without exact weight", () => {
  assert.match(landingSource, /"landing_view"/);
  assert.match(landingSource, /QuickGoldValueCalculator[^\n]*source="landing"/);
  assert.match(quickGoldValueCalculatorSource, /source !== "landing"/);
  assert.match(quickGoldValueCalculatorSource, /"landing_value_calculated"/);
  assert.match(quickGoldValueCalculatorSource, /getAnalyticsWeightBand\(grams\)/);
  assert.match(quickGoldValueCalculatorSource, /getAnalyticsGoldCategory\(selected\)/);
  assert.match(quickGoldValueCalculatorSource, /window\.setTimeout\([\s\S]*700/);
  assert.match(quickGoldValueCalculatorSource, /"mygold_cta_clicked"/);
  assert.doesNotMatch(quickGoldValueCalculatorSource, /quick_gold_value_calculated/);
});

test("signup and first MY GOLD account record are measured only after successful writes", () => {
  assert.match(registerSource, /setDoc\([\s\S]*"sign_up"/);
  assert.match(myGoldVaultSource, /await createGoldVaultItems\([\s\S]*"mygold_first_item_created"/);
  assert.match(myGoldVaultSource, /await createGoldVaultItem\([\s\S]*"mygold_first_item_created"/);
  assert.match(myGoldVaultSource, /wasFirstAccountRecord = items\.length === 0/);
});

test("exchange funnel measures successful calculation and reservation completion, not reservation input PII", () => {
  assert.match(goldExchangeSource, /"exchange_calculated"/);
  assert.match(goldExchangeSource, /product_count: Math\.min\(products\.length/);
  assert.match(goldExchangeSource, /await submitGoldExchangeGroup\(payload\)[\s\S]*"reservation_completed"/);
  assert.match(goldExchangeSource, /calculation_mode: calculated \? "calculated" : "visit_only"/);
  assert.doesNotMatch(goldExchangeSource, /trackProductEvent\([^)]*\b(?:name|phone|email)\b/s);
});

test("analytics has an explicit verification command", () => {
  assert.equal(packageJson.scripts?.["test:analytics"], "node scripts/test-product-analytics.mjs");
});
