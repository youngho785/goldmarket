import { test, expect } from "@playwright/test";

async function openGoldExchangeStart(page) {
  await page.goto("/gold-exchange", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /직접 입력하기/ })).toBeVisible();
}

test("gold exchange start screen shows only the three entry choices", async ({ page }) => {
  await openGoldExchangeStart(page);

  await expect(page.getByRole("button", { name: /MY GOLD에서 불러오기/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /매장에서 확인하기/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "내 금 종류와 무게를 입력하세요" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "MY GOLD에서 불러온 내 금을 확인하세요" })).toHaveCount(0);
});

test("manual entry opens a clean manual Step 1", async ({ page }) => {
  await openGoldExchangeStart(page);

  await page.getByRole("button", { name: /직접 입력하기/ }).click();
  await expect(page).toHaveURL(/\/gold-exchange\?mode=manual$/);
  await expect(page.getByRole("heading", { name: "내 금 종류와 무게를 입력하세요" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MY GOLD에서 불러온 내 금을 확인하세요" })).toHaveCount(0);
  await expect(page.locator("#product-0")).toHaveValue("");
});

test("browser Back restores the start screen after manual entry", async ({ page }) => {
  await openGoldExchangeStart(page);
  await page.getByRole("button", { name: /직접 입력하기/ }).click();
  await expect(page).toHaveURL(/mode=manual/);

  await page.goBack();
  await expect(page).toHaveURL(/\/gold-exchange$/);
  await expect(page.getByRole("button", { name: /직접 입력하기/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "내 금 종류와 무게를 입력하세요" })).toHaveCount(0);
});

test("guest MY GOLD import is gated before private data appears", async ({ page }) => {
  await openGoldExchangeStart(page);

  await page.getByRole("button", { name: /MY GOLD에서 불러오기/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("MY GOLD에 기록한 내 금을 불러오려면 로그인이 필요합니다.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "MY GOLD에서 불러온 내 금을 확인하세요" })).toHaveCount(0);
});

test("visit entry moves directly to reservation Step 3", async ({ page }) => {
  await openGoldExchangeStart(page);

  await page.getByRole("button", { name: /매장에서 확인하기/ }).click();
  await expect(page).toHaveURL(/\/gold-exchange\?mode=visit$/);
  await expect(page.getByRole("heading", { name: "스텝 3. 나의 골드바 예약하기" })).toBeVisible();
});
