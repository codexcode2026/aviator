import { test, expect } from "@playwright/test";
import { gotoApp } from "../helpers/game";
import { sel } from "../helpers/selectors";

test.describe("History bar", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  test("renders round multiplier pills", async ({ page }) => {
    const pills = page.locator(`${sel.historyBar} .font-bold`);
    await expect(pills.first()).toBeVisible({ timeout: 20_000 });
    const count = await pills.count();
    expect(count).toBeGreaterThan(0);
    await expect(pills.first()).toHaveText(/\d+\.\d{2}x/);
  });

  test("history popup opens and closes", async ({ page }) => {
    const btn = page.getByRole("button", { name: "History" });
    await btn.click();
    await expect(page.getByText("Round history")).toBeVisible();

    const popupPills = page.locator('.absolute .font-bold');
    expect(await popupPills.count()).toBeGreaterThan(0);

    await btn.click();
    await expect(page.getByText("Round history")).toBeHidden();
  });

  test("popup overlays bet panels (z-index)", async ({ page }) => {
    await page.getByRole("button", { name: "History" }).click();
    const popup = page.locator('.absolute.right-1.top-9');
    await expect(popup).toBeVisible();

    const zIndex = await popup.evaluate((el) => getComputedStyle(el).zIndex);
    expect(Number(zIndex)).toBeGreaterThanOrEqual(60);
  });
});
