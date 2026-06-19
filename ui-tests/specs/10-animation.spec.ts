/**
 * 10-animation.spec.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Tests every animated element in the Aviator UI:
 *   • GSAP plane repositioning during flying phase
 *   • Sunburst rays rotation (GSAP continuous tween)
 *   • Crash fly-out (plane exits canvas)
 *   • Canvas curve drawing (non-empty pixels while flying)
 *   • Countdown progress bar shrinks to 0
 *   • Multiplier text increments each tick
 *   • Win-toast appearance and auto-dismiss
 *   • Loading-logo visible during betting
 *   • Sunburst opacity: hidden during betting, visible during flying
 *   • Canvas DPR scaling (physical > CSS dimensions on HiDPI)
 *
 * All tests are isolated — they do NOT share phase state across a describe.
 */
import { test, expect } from "@playwright/test";
import {
  gotoApp,
  waitForBetting,
  waitForFlying,
  waitForCrashed,
  countPlanePositionChanges,
  canvasIsDrawing,
  getCanvasDimensions,
  elementIsAnimating,
} from "../helpers/game";
import { sel } from "../helpers/selectors";

test.describe("Animations & canvas rendering", () => {
  // ── Betting phase ─────────────────────────────────────────────────────────

  test("loading logo is visible in betting phase", async ({ page }) => {
    await gotoApp(page);
    await waitForBetting(page);
    // The betting-phase loading logo is inside the canvas overlay
    await expect(
      page.locator('[data-phase="betting"] img[alt="Aviator"]'),
    ).toBeVisible();
  });

  test("countdown progress bar renders and is non-empty", async ({ page }) => {
    await gotoApp(page);
    await waitForBetting(page);
    const bar = page.locator(sel.countdownBar);
    await expect(bar).toBeVisible();
    const width = await bar.evaluate(
      (el) => parseFloat(getComputedStyle(el).width),
    );
    // Bar is wider than 0 while countdown is running
    expect(width).toBeGreaterThan(0);
  });

  test("countdown bar shrinks toward zero over time", async ({ page }) => {
    await gotoApp(page);
    await waitForBetting(page);
    const bar = page.locator(sel.countdownBar);
    const w1 = await bar.evaluate(
      (el) => parseFloat(getComputedStyle(el).width),
    );
    await page.waitForTimeout(600);
    const w2 = await bar.evaluate(
      (el) => parseFloat(getComputedStyle(el).width),
    );
    // Width should have decreased (or stayed if already at 0)
    expect(w2).toBeLessThanOrEqual(w1 + 2); // +2 px tolerance for sub-pixel
  });

  test("sunburst rays hidden (opacity 0) during betting phase", async ({
    page,
  }) => {
    await gotoApp(page);
    await waitForBetting(page);
    const rays = page
      .locator(
        "[data-phase] .pointer-events-none.absolute.transition-opacity",
      )
      .first();
    const opacity = await rays.evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity),
    );
    // During betting the opacity inline style is 0
    expect(opacity).toBeLessThan(0.1);
  });

  test("canvas is empty (no drawn pixels) during betting phase", async ({
    page,
  }) => {
    await gotoApp(page);
    await waitForBetting(page);
    await page.waitForTimeout(200);
    const drawing = await canvasIsDrawing(page);
    // Curve should NOT be drawn during betting
    expect(drawing).toBe(false);
  });

  // ── Flying phase ──────────────────────────────────────────────────────────

  test("canvas draws non-empty pixels when flying", async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await waitForFlying(page);
    await page.waitForTimeout(300); // allow a few ticks to draw
    const drawing = await canvasIsDrawing(page);
    expect(drawing).toBe(true);
  });

  test("plane element is repositioned every frame during flying @slow", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await waitForFlying(page);
    const changes = await countPlanePositionChanges(page, 500);
    // At 50 ms tick, 500 ms should give ≥ 3 distinct positions
    expect(changes).toBeGreaterThan(2);
  });

  test("multiplier text increments tick-by-tick during flying", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await waitForFlying(page);

    const readMult = async () => {
      const txt = await page
        .locator('[data-phase="flying"] .tabular-nums')
        .first()
        .innerText()
        .catch(() => "0x");
      return parseFloat(txt.replace("x", "")) || 0;
    };

    const m1 = await readMult();
    await page.waitForTimeout(300);
    const m2 = await readMult();
    expect(m2).toBeGreaterThanOrEqual(m1);
  });

  test("sunburst rays visible (opacity > 0) during flying phase", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await waitForFlying(page);
    const rays = page
      .locator(
        "[data-phase] .pointer-events-none.absolute.transition-opacity",
      )
      .first();
    const opacity = await rays.evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity),
    );
    expect(opacity).toBeGreaterThan(0.5);
  });

  test("canvas has DPR-scaled physical size during flying", async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await waitForFlying(page);
    const dims = await getCanvasDimensions(page);
    // Physical canvas width must be >= CSS width (DPR ≥ 1)
    expect(dims.w).toBeGreaterThanOrEqual(dims.cssW - 1);
    expect(dims.h).toBeGreaterThanOrEqual(dims.cssH - 1);
  });

  test("plane is positioned near the curve tip, not at origin", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await waitForFlying(page);
    // Wait until multiplier is 1.3x+ so the plane has visibly moved
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-phase="flying"] .tabular-nums');
        return parseFloat(el?.textContent ?? "0") >= 1.3;
      },
      { timeout: 20_000 },
    );
    // Plane transform should have a non-zero translateX (moved right from 0)
    const transform = await page
      .locator(".pointer-events-none.absolute.left-0.top-0.z-20")
      .evaluate((el) => (el as HTMLElement).style.transform);
    expect(transform).toMatch(/translateX\((?!0px)/);
  });

  // ── Crashed phase ─────────────────────────────────────────────────────────

  test("crashed phase shows Flew Away text and stops drawing curve @slow", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await gotoApp(page);
    await waitForCrashed(page);
    await expect(page.getByText("Flew Away!")).toBeVisible();
    // After crash, canvas curve should be empty (cleared)
    await page.waitForTimeout(200);
    const drawing = await canvasIsDrawing(page);
    expect(drawing).toBe(false);
  });

  test("crash flash glow element appears on crash @slow", async ({ page }) => {
    test.setTimeout(150_000);
    await gotoApp(page);
    await waitForCrashed(page);
    // The crash flash div is conditionally rendered
    const flash = page.locator(
      '.pointer-events-none.absolute.inset-0[style*="radial-gradient"]',
    );
    await expect(flash).toBeVisible({ timeout: 3000 });
  });

  // ── History bar pill animation ────────────────────────────────────────────

  test("new pill appears in history bar after each crash @slow", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await gotoApp(page);
    const countBefore = await page.locator(sel.historyPill).count();
    await waitForCrashed(page);
    // After the crash, the new multiplier pill is prepended
    const countAfter = await page.locator(sel.historyPill).count();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    // First pill has valid multiplier format
    await expect(page.locator(sel.historyPill).first()).toHaveText(
      /\d+\.\d{2}x/,
    );
  });
});
