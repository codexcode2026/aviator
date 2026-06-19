import { test, expect } from "@playwright/test";
import { gotoApp, waitForBetting, waitForFlying, waitForCrashed } from "../helpers/game";
import { sel } from "../helpers/selectors";

test.describe("Game canvas", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  test("FUN MODE banner always visible", async ({ page }) => {
    await expect(page.getByText("FUN MODE")).toBeVisible();
  });

  test("betting phase shows loading state", async ({ page }) => {
    await waitForBetting(page);
    await expect(page.getByText("Loading next round")).toBeVisible();
    await expect(page.locator(`${sel.gameCanvas} img[alt="Aviator"]`)).toBeVisible();
    const bar = page.locator(`${sel.gameCanvas} .bg-brand`);
    await expect(bar).toBeVisible();
  });

  test("flying phase shows multiplier and canvas", async ({ page }) => {
    await waitForFlying(page);
    const mult = page.locator('[data-phase="flying"] .tabular-nums').first();
    await expect(mult).toBeVisible();
    await expect(mult).toHaveText(/\d+\.\d{2}x/);

    const canvas = page.locator('[data-phase="flying"] canvas');
    await expect(canvas).toBeVisible();
    const dims = await canvas.evaluate((c) => ({
      w: (c as HTMLCanvasElement).width,
      h: (c as HTMLCanvasElement).height,
    }));
    expect(dims.w).toBeGreaterThan(100);
    expect(dims.h).toBeGreaterThan(100);
  });

  test("player count bubble renders avatars", async ({ page }) => {
    await waitForBetting(page);
    const bubble = page.locator('[data-phase] .rounded-full.bg-black\\/50');
    await expect(bubble).toBeVisible();
    await expect(bubble.locator("svg")).toHaveCount(3, { timeout: 20_000 });
    await expect(bubble.locator(".tabular-nums")).toHaveText(/\d+/);
  });

  test("crashed phase shows flew away text @slow", async ({ page }) => {
    test.setTimeout(150_000);
    await waitForCrashed(page);
    await expect(page.getByText("Flew Away!")).toBeVisible();
    const mult = page.locator('[data-phase="crashed"] .text-brand');
    await expect(mult).toHaveText(/\d+\.\d{2}x/);
  });
});
