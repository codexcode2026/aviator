import { test, expect } from "@playwright/test";
import { gotoApp, waitForBetting, waitForFlying } from "../helpers/game";

const VIEWPORTS = [
  { name: "xs", width: 320, height: 568 },
  { name: "sm", width: 390, height: 844 },
  { name: "md", width: 768, height: 1024 },
  { name: "lg", width: 1024, height: 768 },
  { name: "xl", width: 1366, height: 768 },
] as const;

test.describe("Visual snapshots @visual", () => {
  for (const vp of VIEWPORTS) {
    test(`betting state — ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoApp(page);
      await waitForBetting(page);

      await expect(page).toHaveScreenshot(`betting-${vp.name}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
        animations: "disabled",
      });
    });
  }

  test("flying state — desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await gotoApp(page);
    await waitForFlying(page);
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot("flying-desktop.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.03,
    });
  });
});
