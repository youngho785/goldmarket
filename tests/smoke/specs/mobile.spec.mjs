import { test, expect } from "@playwright/test";
import {
  blockProductionFirebase,
  createExchangeRequestViaUi,
  createVerifiedUser,
  adminDb,
  loginFromUi,
  resetEmulators,
  seedCoreData,
  waitForFirestore
} from "../helpers/smoke.mjs";

test.beforeEach(async () => {
  await resetEmulators();
  await seedCoreData();
});

test("1. 모바일 로그인 → 세션 유지 → 전체 메뉴 표시", async ({ page }) => {
  const assertNoProduction = await blockProductionFirebase(page);
  const member = await createVerifiedUser("mobile-login", { displayName: "모바일 로그인 스모크" });

  await loginFromUi(page, member.email, member.password, "/profile");
  await expect(page).toHaveURL(/\/profile(?:[?#]|$)/);
  await expect(page.getByText(member.email, { exact: false }).first()).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/profile(?:[?#]|$)/);
  await expect(page.getByText(member.email, { exact: false }).first()).toBeVisible();

  const openMenu = page.getByRole("button", { name: "전체 메뉴 열기" });
  await expect(openMenu).toBeVisible();
  await openMenu.click();
  await expect(page.getByRole("dialog", { name: "전체 메뉴" })).toBeVisible();
  assertNoProduction();
});

test("2. 모바일 MY GOLD 기록 추가", async ({ page }) => {
  const assertNoProduction = await blockProductionFirebase(page);
  const member = await createVerifiedUser("mobile-my-gold", { displayName: "모바일 MY GOLD" });

  await loginFromUi(page, member.email, member.password, "/my-gold/items");
  await page.goto("/my-gold/items?add=1", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("navigation", { name: "하단 네비게이션" })).toHaveCSS("pointer-events", "none");
  const labels = dialog.locator("label");
  await labels.filter({ hasText: /^이름/ }).locator("input").fill("모바일 스모크 반지");
  await labels.filter({ hasText: /^금 종류/ }).locator("select").selectOption("gold-14k-jewelry");
  await labels.filter({ hasText: /^무게/ }).locator('input[type="number"]').fill("7.5");
  await dialog.getByRole("button", { name: "MY GOLD에 저장" }).click();

  await expect(page.getByRole("heading", { name: "모바일 스모크 반지" })).toBeVisible();
  const item = await waitForFirestore(async () => {
    const snap = await adminDb().collection(`users/${member.uid}/goldVaultItems`).get();
    return snap.size === 1 ? snap.docs[0].data() : null;
  });
  expect(item).toBeTruthy();
  assertNoProduction();
});

test("3. 모바일 GOLD TO GOLD 방문 예약 신청", async ({ page }) => {
  const assertNoProduction = await blockProductionFirebase(page);
  const member = await createVerifiedUser("mobile-exchange", {
    displayName: "모바일 교환 스모크",
    phone: "010-2222-3333"
  });

  const group = await createExchangeRequestViaUi(page, member, " 모바일");
  expect(group.ownerUid || group.userId).toBe(member.uid);
  expect(group.repStatus).toBe("requested");
  await expect(page.getByRole("heading", { name: "방문 예약 요청이 접수되었습니다" })).toBeVisible();
  assertNoProduction();
});

test("4. 모바일 전체 메뉴 → 설정 이동 → 로그아웃", async ({ page }) => {
  const assertNoProduction = await blockProductionFirebase(page);
  const member = await createVerifiedUser("mobile-menu", { displayName: "모바일 메뉴 스모크" });

  await loginFromUi(page, member.email, member.password, "/profile");
  // loginFromUi only guarantees that /login was left. Wait for the final target
  // route and member UI before opening the drawer, otherwise an intermediate
  // onboarding/navigation transition can immediately close the drawer.
  await expect(page).toHaveURL(/\/profile(?:[?#]|$)/);
  await expect(page.getByText(member.email, { exact: false }).first()).toBeVisible();

  const openMenu = page.getByRole("button", { name: "전체 메뉴 열기" });
  await expect(openMenu).toBeVisible();
  await openMenu.click();
  let drawer = page.getByRole("dialog", { name: "전체 메뉴" });
  await expect(drawer).toBeVisible();

  const settingsLink = drawer.getByRole("link", { name: /설정/ }).first();
  await expect(settingsLink).toBeVisible();
  await settingsLink.click();
  await expect(page).toHaveURL(/\/settings(?:[?#]|$)/);

  await expect(openMenu).toBeVisible();
  await openMenu.click();
  drawer = page.getByRole("dialog", { name: "전체 메뉴" });
  await expect(drawer).toBeVisible();
  const logout = drawer.getByRole("button", { name: "로그아웃", exact: true });
  await expect(logout).toBeVisible();
  await logout.click();

  await expect.poll(async () => page.url()).not.toMatch(/\/(?:profile|settings)(?:[?#]|$)/);
  assertNoProduction();
});
