import { test, expect } from "@playwright/test";
import {
  DEFAULT_PASSWORD,
  adminAuth,
  adminDb,
  blockProductionFirebase,
  createExchangeRequestViaUi,
  createVerifiedUser,
  findLatestExchangeGroupByUser,
  getOobCodeSet,
  getSupportTicketsByUser,
  loginFromUi,
  resetEmulators,
  seedCoreData,
  waitForFirestore,
  waitForNewOob
} from "../helpers/smoke.mjs";

const SIGNUP_PASSWORD = "Kgm!Signup2345";

test.beforeEach(async () => {
  await resetEmulators();
  await seedCoreData();
});

async function actualSignupAndVerify(page) {
  const email = `kgm.smoke.signup.${Date.now()}${Math.floor(Math.random() * 10000)}@example.com`;
  const before = await getOobCodeSet();
  await page.goto("/register?next=%2Fprofile", { waitUntil: "domcontentloaded" });
  await page.locator("#regEmail").fill(email);
  await page.locator("#regPassword").fill(SIGNUP_PASSWORD);
  await page.locator("#agree_age14").check();
  await page.locator("#agree_tos").check();
  await page.locator("#agree_privacy").check();

  const oobPromise = waitForNewOob({ seen: before, email });
  await page.getByRole("button", { name: "한국골드마켓 시작하기" }).click();
  const oob = await oobPromise;
  await expect(page).toHaveURL(/\/verify-email(?:\?|$)/, { timeout: 30_000 });

  const origin = new URL(page.url()).origin;
  await page.goto(
    `/verify-email?mode=verifyEmail&oobCode=${encodeURIComponent(oob.oobCode)}` +
      `&continueUrl=${encodeURIComponent(`${origin}/profile`)}`,
    { waitUntil: "domcontentloaded" }
  );
  await expect(page).toHaveURL(/\/profile(?:[?#]|$)/, { timeout: 20_000 });
  await expect(page.getByText(email, { exact: false }).first()).toBeVisible();
  return { email, password: SIGNUP_PASSWORD };
}

test("1. 회원가입 → 이메일 인증 → 새 브라우저 로그인", async ({ page, browser }) => {
  const assertNoProduction = await blockProductionFirebase(page);
  const account = await actualSignupAndVerify(page);

  const fresh = await browser.newContext();
  const loginPage = await fresh.newPage();
  const assertFreshNoProduction = await blockProductionFirebase(loginPage);
  try {
    await loginFromUi(loginPage, account.email, account.password, "/profile");
    await expect(loginPage).toHaveURL(/\/profile(?:[?#]|$)/);
    await expect(loginPage.getByText(account.email, { exact: false }).first()).toBeVisible();
    assertFreshNoProduction();
  } finally {
    await fresh.close();
  }
  assertNoProduction();
});

test("2. MY GOLD 기록 1개 추가", async ({ page }) => {
  const assertNoProduction = await blockProductionFirebase(page);
  const member = await createVerifiedUser("smoke-my-gold", { displayName: "MY GOLD 스모크" });
  await loginFromUi(page, member.email, member.password, "/my-gold/items");
  await page.goto("/my-gold/items?add=1", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog");
  const labels = dialog.locator("label");
  await labels.filter({ hasText: /^이름/ }).locator("input").fill("스모크 테스트 반지");
  await labels.filter({ hasText: /^금 종류/ }).locator("select").selectOption("gold-14k-jewelry");
  await labels.filter({ hasText: /^무게/ }).locator('input[type="number"]').fill("10");
  await dialog.getByRole("button", { name: "MY GOLD에 저장" }).click();

  await expect(page.getByRole("heading", { name: "스모크 테스트 반지" })).toBeVisible();
  const items = await waitForFirestore(async () => {
    const snap = await adminDb().collection(`users/${member.uid}/goldVaultItems`).get();
    return snap.size === 1 ? snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) : null;
  });
  expect(items).toHaveLength(1);
  assertNoProduction();
});

test("3. GOLD TO GOLD 방문 예약 신청", async ({ page }) => {
  const assertNoProduction = await blockProductionFirebase(page);
  const member = await createVerifiedUser("smoke-exchange-request", {
    displayName: "교환 신청 스모크",
    phone: "010-3333-4444"
  });
  const group = await createExchangeRequestViaUi(page, member, " 신청");
  expect(group.ownerUid || group.userId).toBe(member.uid);
  expect(group.repStatus).toBe("requested");
  assertNoProduction();
});

test("4. 관리자 예약확정 → 실측확정 → 교환완료", async ({ page, browser }) => {
  const assertCustomerNoProduction = await blockProductionFirebase(page);
  const member = await createVerifiedUser("smoke-admin-customer", {
    displayName: "관리처리 스모크 고객",
    phone: "010-5555-6666"
  });
  const admin = await createVerifiedUser("smoke-admin", {
    displayName: "관리처리 스모크 관리자",
    phone: "010-7777-8888",
    admin: true,
    superAdmin: true
  });
  const group = await createExchangeRequestViaUi(page, member, " 관리");

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const assertAdminNoProduction = await blockProductionFirebase(adminPage);
  try {
    await loginFromUi(adminPage, admin.email, DEFAULT_PASSWORD, `/admin/gold-exchange?groupId=${group.id}`);
    await adminPage.goto(`/admin/gold-exchange?groupId=${group.id}`, { waitUntil: "domcontentloaded" });
    await expect(adminPage.getByText(group.id).first()).toBeVisible();

    await adminPage.getByRole("button", { name: "예약 확정", exact: true }).click();
    await waitForFirestore(async () => {
      const row = await findLatestExchangeGroupByUser(member.uid);
      return row?.repStatus === "scheduled" ? row : null;
    });

    await adminPage.getByRole("button", { name: "매장 확인 시작", exact: true }).click();
    await waitForFirestore(async () => {
      const row = await findLatestExchangeGroupByUser(member.uid);
      return row?.repStatus === "in_progress" ? row : null;
    });

    const panel = adminPage.getByRole("region", { name: "매장 실측 결과 입력" });
    await panel.getByLabel("실측 중량(g)").first().fill("20");
    await panel.getByLabel(/확인 순도/).first().fill("58.5");
    await panel.getByLabel("확정 순금량(g)").first().fill("11");
    await panel.getByLabel("최종 제작공임(원)").fill("40000");
    await panel.getByRole("checkbox").check();
    await panel.getByRole("button", { name: "실측·동의 확정 저장" }).click();

    await waitForFirestore(async () => {
      const snap = await adminDb().doc(`goldExchangeGroups/${group.id}`).get();
      return snap.data()?.measurementStatus === "confirmed" ? snap.data() : null;
    }, { timeoutMs: 30_000 });

    const completeButton = adminPage.getByRole("button", { name: "교환 완료 확정", exact: true });
    await expect(completeButton).toBeEnabled();
    await completeButton.click();
    await waitForFirestore(async () => {
      const row = await findLatestExchangeGroupByUser(member.uid);
      return row?.repStatus === "completed" ? row : null;
    }, { timeoutMs: 30_000 });

    await page.goto("/my-exchanges", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("교환 완료", { exact: true }).first()).toBeVisible();
    assertAdminNoProduction();
  } finally {
    await adminContext.close();
  }
  assertCustomerNoProduction();
});

test("5. 1:1 문의 등록", async ({ page }) => {
  const assertNoProduction = await blockProductionFirebase(page);
  const member = await createVerifiedUser("smoke-support", { displayName: "문의 스모크" });
  await loginFromUi(page, member.email, member.password, "/support/new");
  await page.goto("/support/new", { waitUntil: "domcontentloaded" });
  await page.getByLabel("제목").fill("스모크 문의 제목");
  await page.getByLabel("문의 내용").fill("스모크 테스트 문의입니다.");
  await page.getByRole("button", { name: "문의 등록" }).click();
  await expect(page.getByRole("heading", { name: "스모크 문의 제목" })).toBeVisible();

  const tickets = await waitForFirestore(async () => {
    const rows = await getSupportTicketsByUser(member.uid);
    return rows.length === 1 ? rows : null;
  });
  expect(tickets).toHaveLength(1);
  assertNoProduction();
});

test("6. 회원탈퇴 → Auth 삭제 + 개인정보 익명화", async ({ page }) => {
  const assertNoProduction = await blockProductionFirebase(page);
  const member = await createVerifiedUser("smoke-delete", {
    displayName: "탈퇴 스모크",
    phone: "010-9999-0000"
  });
  await loginFromUi(page, member.email, member.password, "/settings");
  await page.goto("/settings", { waitUntil: "domcontentloaded" });

  await page.getByText("계정 탈퇴", { exact: true }).first().click();
  await page.locator("#settingsDeletePassword").fill(member.password);
  await page.getByText("안내 사항을 모두 확인했으며 계정을 영구 삭제합니다.").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "계정 탈퇴", exact: true }).click();

  await expect.poll(async () => {
    try { await adminAuth().getUser(member.uid); return false; }
    catch (error) { return error?.code === "auth/user-not-found"; }
  }, { timeout: 30_000 }).toBe(true);

  const [userSnap, profileSnap] = await Promise.all([
    adminDb().doc(`users/${member.uid}`).get(),
    adminDb().doc(`profiles/${member.uid}`).get()
  ]);
  expect(userSnap.exists).toBe(true);
  expect(userSnap.data()?.deleted).toBe(true);
  expect(userSnap.data()?.email).toBe("");
  expect(profileSnap.exists).toBe(true);
  expect(profileSnap.data()?.deleted).toBe(true);
  expect(profileSnap.data()?.displayName).toBe("탈퇴한 사용자");
  assertNoProduction();
});
