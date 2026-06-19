import { test, expect } from "@playwright/test";
import { gotoApp } from "../helpers/game";
import { expectCoreLayout } from "../helpers/layout";
import { sel } from "../helpers/selectors";

test.describe("Responsive layout", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  test("viewport-specific sidebar placement", async ({ page }, testInfo) => {
    const vp = testInfo.project.name as "desktop" | "tablet" | "mobile";
    await expectCoreLayout(page, vp);
  });

  test("bet panels stack on mobile, side-by-side on desktop", async ({ page }, testInfo) => {
    const panels = page.locator(sel.betPanels);
    const grid = await panels.evaluate((el) => getComputedStyle(el).gridTemplateColumns);

    if (testInfo.project.name === "desktop") {
      expect(grid.split(" ").length).toBeGreaterThanOrEqual(2);
    } else if (testInfo.project.name === "mobile") {
      expect(grid.split(" ").length).toBe(1);
    }
  });

  test("canvas maintains aspect ratio on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only");
    const canvas = page.locator('[data-phase]').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const ratio = box!.width / box!.height;
    expect(ratio).toBeGreaterThan(1.5);
    expect(ratio).toBeLessThan(2.1);
  });

  test("desktop canvas fills remaining vertical space", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only");
    const canvas = page.locator('[data-phase]').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(200);
    expect(box!.height).toBeLessThan(580);
  });
});
