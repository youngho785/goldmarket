import { test, expect } from "@playwright/test";

test("guest settings stays protected and offers login", async ({ page }) => {
  await page.goto("/settings", { waitUntil: "domcontentloaded" });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "로그인이 필요합니다" })
  ).toBeVisible();

  const loginLink = dialog.getByRole("link", { name: "로그인/회원가입" });
  await expect(loginLink).toBeVisible();
  await expect(loginLink).toHaveAttribute("href", "/login?next=%2Fsettings");
});
