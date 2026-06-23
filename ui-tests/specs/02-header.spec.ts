import { test, expect } from "@playwright/test";
import { gotoApp } from "../helpers/game";
import { sel } from "../helpers/selectors";

test.describe("Header", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  test("shows Aviator logo", async ({ page }) => {
    const logo = page.locator(`${sel.header} ${sel.logo}`);
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("src", /logo\.svg/);
  });

  test("shows formatted balance and currency", async ({ page }) => {
    const balance = page.locator('[data-testid="header-balance"]');
    await expect(balance).toBeVisible();
    await expect(balance).toHaveText(/\d[\d,.]*/);

    const currency = page.locator(`${sel.header} [class*="text-white/55"]`).first();
    await expect(currency).toHaveText(/ZAR|EUR|USD/);
  });

  test("logo scales on viewport", async ({ page }, testInfo) => {
    const logo = page.locator(`${sel.header} ${sel.logo}`);
    const box = await logo.boundingBox();
    expect(box).not.toBeNull();
    if (testInfo.project.name === "mobile") {
      expect(box!.height).toBeGreaterThanOrEqual(24);
      expect(box!.height).toBeLessThanOrEqual(32);
    } else {
      expect(box!.height).toBeGreaterThanOrEqual(26);
    }
  });
});
