import { test, expect } from "@playwright/test";

test("guest MY GOLD summary and item management stay reachable", async ({ page }) => {
  await page.goto("/my-gold", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "내 금의 오늘 가치" })).toBeVisible();
  await expect(page.getByText("MY GOLD · 체험", { exact: true }).first()).toBeVisible();

  const viewTabs = page.getByRole("navigation", { name: "MY GOLD 화면 선택" });
  await viewTabs.getByRole("link", { name: "내 금", exact: true }).click();
  await expect(page).toHaveURL(/\/my-gold\/items$/);
  await expect(page.getByRole("heading", { name: "체험 중인 금 관리" })).toBeVisible();
});

test("guest MY GOLD add form opens and closes without writing data", async ({ page }) => {
  await page.goto("/my-gold/items?add=1", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "내 금 기록" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "이름" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
