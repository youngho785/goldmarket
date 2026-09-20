import { expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

export const PROJECT_ID = "demo-goldmarket";
export const DEFAULT_PASSWORD = "Kgm!Smoke2345";
export const AUTH_EMULATOR_ORIGIN = "http://127.0.0.1:9099";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "../../..");
let adminApp;

function getAdminApp() {
  if (adminApp) return adminApp;
  adminApp = getApps().find((app) => app.name === "kgm-small-smoke") ||
    initializeApp({ projectId: PROJECT_ID }, "kgm-small-smoke");
  return adminApp;
}

export function adminAuth() { return getAuth(getAdminApp()); }
export function adminDb() { return getFirestore(getAdminApp()); }

async function deleteEmulator(url) {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) throw new Error(`Emulator reset failed: ${response.status}`);
}

export async function resetEmulators() {
  await deleteEmulator(`${AUTH_EMULATOR_ORIGIN}/emulator/v1/projects/${PROJECT_ID}/accounts`);
  await deleteEmulator(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`);
}

function yyyyMmDd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function nextBookableDate(daysAhead = 2) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  while (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return yyyyMmDd(date);
}

export async function seedCoreData() {
  const db = adminDb();
  const defaultsPath = path.join(projectRoot, "functions", "src", "goldRates.defaults.json");
  const defaults = JSON.parse(await readFile(defaultsPath, "utf8"));
  const now = Timestamp.now();
  await Promise.all([
    db.doc("appConfig/goldRates").set({ ...defaults, updatedAt: now, updatedBy: "small-smoke" }),
    db.doc("goldPricePublic/config").set({ enabled: true, display14kSellPrice: true, updatedAt: now }),
    db.doc("goldPrices/current").set({
      market: {
        pureGoldSellPerDon: 790000, pureGoldBuyPerDon: 760000,
        gold18kSellPerDon: 570000, gold18kBuyPerDon: 540000,
        gold14kSellPerDon: 450000, gold14kBuyPerDon: 420000
      },
      previousMarket: {
        pureGoldSellPerDon: 785000, pureGoldBuyPerDon: 755000,
        gold18kSellPerDon: 566000, gold18kBuyPerDon: 536000,
        gold14kSellPerDon: 447000, gold14kBuyPerDon: 417000
      },
      updatedAt: now,
      source: "small-smoke"
    }),
    db.doc("appConfig/bookingAvailability").set({ dates: {}, updatedAt: now }),
    db.doc("appConfig/reservedSlots").set({ slots: {}, updatedAt: now })
  ]);
}

function unique(prefix) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 100000)}`;
}

export async function createVerifiedUser(prefix = "member", options = {}) {
  const token = unique(prefix);
  const email = `${token}@example.com`;
  const password = options.password || DEFAULT_PASSWORD;
  const auth = adminAuth();
  const db = adminDb();
  const user = await auth.createUser({
    email,
    password,
    emailVerified: true,
    displayName: options.displayName || "스모크 회원"
  });

  const claims = {};
  if (options.admin) claims.admin = true;
  if (options.superAdmin) claims.superAdmin = true;
  if (Object.keys(claims).length) await auth.setCustomUserClaims(user.uid, claims);

  const profile = {
    email,
    displayName: options.displayName || "스모크 회원",
    nickname: `smk${user.uid.slice(0, 8)}`.slice(0, 16),
    phone: options.phone || "010-1234-5678",
    role: options.superAdmin ? "superAdmin" : options.admin ? "admin" : "user",
    admin: options.admin || options.superAdmin || false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  await Promise.all([
    db.doc(`users/${user.uid}`).set(profile, { merge: true }),
    db.doc(`profiles/${user.uid}`).set(profile, { merge: true })
  ]);

  return { uid: user.uid, email, password, ...profile };
}

export async function loginFromUi(page, email, password, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`, { waitUntil: "domcontentloaded" });
  await page.locator("#loginEmail").fill(email);
  await page.locator("#loginPassword").fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login(?:[?#]|$)/, { timeout: 20_000 });
}

const BLOCKED_PRODUCTION_HOSTS = [
  /(^|\.)identitytoolkit\.googleapis\.com$/i,
  /(^|\.)securetoken\.googleapis\.com$/i,
  /(^|\.)firestore\.googleapis\.com$/i,
  /(^|\.)firebasestorage\.googleapis\.com$/i,
  /(^|\.)firebaseinstallations\.googleapis\.com$/i,
  /(^|\.)fcmregistrations\.googleapis\.com$/i,
  /(^|\.)cloudfunctions\.net$/i,
  /(^|\.)google-analytics\.com$/i,
  /(^|\.)googletagmanager\.com$/i
];

export async function blockProductionFirebase(page) {
  const blocked = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    let url;
    try { url = new URL(request.url()); } catch { await route.continue(); return; }
    const local = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
    if (!local && BLOCKED_PRODUCTION_HOSTS.some((pattern) => pattern.test(url.hostname))) {
      blocked.push(request.url());
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  return () => expect(blocked, `Production Firebase request detected:\n${blocked.join("\n")}`).toEqual([]);
}

export async function getOobCodes() {
  const response = await fetch(`${AUTH_EMULATOR_ORIGIN}/emulator/v1/projects/${PROJECT_ID}/oobCodes`);
  if (!response.ok) throw new Error(`Auth OOB lookup failed: HTTP ${response.status}`);
  const body = await response.json();
  return Array.isArray(body?.oobCodes) ? body.oobCodes : [];
}

export async function getOobCodeSet() {
  return new Set((await getOobCodes()).map((entry) => String(entry?.oobCode || "")).filter(Boolean));
}

export async function waitForNewOob({ seen = new Set(), email, timeoutMs = 30_000 }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const entries = await getOobCodes();
    const match = [...entries].reverse().find((entry) => {
      const code = String(entry?.oobCode || "");
      const address = String(entry?.email || entry?.newEmail || "").toLowerCase();
      return code && !seen.has(code) && (!email || address === String(email).toLowerCase());
    });
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`New Auth OOB code not found for ${email || "any"}`);
}

export async function findLatestExchangeGroupByUser(uid) {
  const db = adminDb();
  let snap = await db.collection("goldExchangeGroups").where("ownerUid", "==", uid).get();
  if (snap.empty) snap = await db.collection("goldExchangeGroups").where("userId", "==", uid).get();
  const rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  rows.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  return rows[0] || null;
}

export async function getSupportTicketsByUser(uid) {
  const snap = await adminDb().collection("supportTickets").where("authorId", "==", uid).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function waitForFirestore(check, { timeoutMs = 20_000, intervalMs = 250 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await check();
    if (last) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Firestore condition timed out. Last=${JSON.stringify(last)}`);
}

export async function createExchangeRequestViaUi(page, member, suffix = "") {
  await loginFromUi(page, member.email, member.password, "/gold-exchange");
  await page.goto("/gold-exchange", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /직접 입력하기/ }).click();
  await page.locator("#product-0").selectOption("gold-14k-jewelry");
  await page.locator("#quantity-0").fill("20");
  await page.locator("#quantity-0").blur();
  await page.getByRole("button", { name: "예상 순금량과 골드바 조합 확인" }).click();
  await expect(page.getByRole("heading", { name: "내 금으로 받을 골드바를 선택하세요" })).toBeVisible();
  await page.getByRole("button", { name: "이 예상으로 방문 예약 계속" }).click();

  await page.locator("#exchange-visit-date").fill(nextBookableDate(2));
  await page.locator("#exchange-visit-date").press("Tab");

  const timeSelect = page.locator("#exchange-visit-time");
  await expect(timeSelect).toBeEnabled();
  const availableTime = await expect.poll(async () => {
    return timeSelect.locator("option").evaluateAll((options) => {
      const option = options.find((item) => item.value && !item.disabled);
      return option?.value || "";
    });
  }, { timeout: 10_000, message: "No enabled booking time was found for the selected date." }).not.toBe("").then(async () => {
    return timeSelect.locator("option").evaluateAll((options) => {
      const option = options.find((item) => item.value && !item.disabled);
      return option?.value || "";
    });
  });
  await timeSelect.selectOption(availableTime);
  if (await page.locator("#exchange-name").isVisible().catch(() => false)) {
    await page.locator("#exchange-name").fill(`스모크 고객${suffix}`);
    await page.locator("#exchange-phone").fill(member.phone || "010-1234-5678");
  }
  await page.getByRole("checkbox").last().check();
  await page.getByRole("button", { name: "방문 예약 요청", exact: true }).click();
  await expect(page.getByRole("heading", { name: "방문 예약 요청이 접수되었습니다" })).toBeVisible({ timeout: 30_000 });

  return waitForFirestore(async () => {
    const group = await findLatestExchangeGroupByUser(member.uid);
    return group?.repStatus === "requested" ? group : null;
  }, { timeoutMs: 30_000 });
}
