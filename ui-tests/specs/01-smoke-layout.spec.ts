import { test, expect } from "@playwright/test";
import { gotoApp } from "../helpers/game";
import { expectCoreLayout, expectFullUiManifest } from "../helpers/layout";
import { expectNoHorizontalOverflow } from "../helpers/game";

test.describe("Smoke & layout", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  test("loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("core layout regions render", async ({ page }, testInfo) => {
    const vp = testInfo.project.name as "desktop" | "tablet" | "mobile";
    await expectCoreLayout(page, vp);
  });

  test("full UI element manifest", async ({ page }) => {
    await expectFullUiManifest(page);
  });

  test("no horizontal page overflow", async ({ page }) => {
    const overflow = await expectNoHorizontalOverflow(page);
    expect(overflow).toBe(false);
  });

  test("canvas has valid game phase attribute", async ({ page }) => {
    const phase = await page.locator('[data-phase]').first().getAttribute("data-phase");
    expect(["betting", "flying", "crashed"]).toContain(phase);
  });
});
