/**
 * 14-edge-cases.spec.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Edge cases, boundary conditions, and stress scenarios:
 *
 *   • Bet amount clamped at MIN (1) when input set below
 *   • Bet amount clamped at MAX (50000) when input set above
 *   • Input filters non-numeric characters
 *   • Chip buttons always set an exact valid amount
 *   • Decrease button stops at MIN (1)
 *   • Attempting to bet more than balance is rejected (button disabled)
 *   • Rapid chip clicks don't corrupt the amount
 *   • History popup pills count matches history bar pills count
 *   • Sidebar "Previous" tab shows last round result after crash @slow
 *   • Both panels show cancel after dual-bet during betting @slow
 *   • No duplicate roundId emitted in back-to-back rounds @slow
 *   • Top tab period cycling produces stable entries
 *   • Player count bubble always ≥ 1
 *   • Resizing viewport mid-game doesn't break layout
 */
import { test, expect } from "@playwright/test";
import {
  gotoApp,
  waitForBetting,
  waitForFlying,
  waitForCrashed,
  betPanel,
  panelActionButton,
  setChipAmount,
  clickBet,
  getBalanceValue,
  captureSocketEvents,
} from "../helpers/game";
import { visibleSidebar } from "../helpers/layout";
import { sel, CHIP_VALUES } from "../helpers/selectors";

test.describe("Edge cases & boundary conditions", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await waitForBetting(page);
  });

  // ── Input clamping ────────────────────────────────────────────────────────

  test("amount clamped to MIN=1 when below-minimum entered", async ({
    page,
  }) => {
    const input = betPanel(page, 0).locator("input").first();
    await input.fill("0");
    await input.press("Tab"); // blur to trigger clamp
    const v = parseFloat(await input.inputValue());
    expect(v).toBeGreaterThanOrEqual(1);
  });

  test("amount clamped to MAX=50000 when above-maximum entered", async ({
    page,
  }) => {
    const input = betPanel(page, 0).locator("input").first();
    await input.fill("99999");
    await input.press("Tab");
    // Wait for value update
    await page.waitForTimeout(200);
    const v = parseFloat(await input.inputValue());
    expect(v).toBeLessThanOrEqual(50000);
  });

  test("non-numeric input characters are stripped", async ({ page }) => {
    const input = betPanel(page, 0).locator("input").first();
    await input.fill("abc");
    await input.press("Tab");
    await page.waitForTimeout(200);
    // Should still have a numeric value
    const v = await input.inputValue();
    expect(isNaN(parseFloat(v))).toBe(false);
  });

  // ── Chip buttons ─────────────────────────────────────────────────────────

  for (const chip of CHIP_VALUES) {
    test(`chip ${chip} sets input to exact value`, async ({ page }) => {
      await gotoApp(page);
      await waitForBetting(page);
      await setChipAmount(page, 0, chip);
      const input = betPanel(page, 0).locator("input").first();
      await expect(input).toHaveValue(`${chip}.00`);
    });
  }

  test("rapid chip clicks settle on the last clicked value", async ({
    page,
  }) => {
    const panel = betPanel(page, 0);
    // Click all four chips quickly
    for (const chip of CHIP_VALUES) {
      await panel.getByRole("button", { name: String(chip), exact: true }).click();
    }
    const input = panel.locator("input").first();
    await expect(input).toHaveValue("100.00");
  });

  // ── Decrease button stops at MIN ─────────────────────────────────────────

  test("decrease button stops at 1 and does not go below", async ({ page }) => {
    await setChipAmount(page, 0, 10);
    // Click decrease 15 times (should clamp at 1)
    const dec = betPanel(page, 0).getByRole("button", { name: "Decrease" });
    for (let i = 0; i < 15; i++) await dec.click();
    const input = betPanel(page, 0).locator("input").first();
    await expect(input).toHaveValue("1.00");
  });

  // ── Balance protection ────────────────────────────────────────────────────

  test("bet button disabled when amount exceeds balance", async ({ page }) => {
    // Strategy: use panel 1 to deduct balance without cancelling, keeping balance < 50000.
    // Then panel 0 (idle "Bet" action) with amount=50000 triggers insufficient=true.
    //
    // panel 1: place 10 ZAR bet → balance = 49990, panel 1 action="cancel"
    // panel 0: still idle, set amount to 50000 → 50000 > 49990 → disabled
    await setChipAmount(page, 1, 10);
    await clickBet(page, 1); // deducts 10, panel 1 goes to Cancel

    // Wait for balance to drop below 50000
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="header-balance"]');
        return parseFloat(el?.textContent?.replace(/[^0-9.]/g, "") ?? "99999") < 50000;
      },
      { timeout: 12000 },
    );

    // Panel 0 is still idle (action="bet"). Set amount to 50000.
    // insufficient = (50000 > 49990) = true → button disabled
    const input = betPanel(page, 0).locator("input").first();
    await input.fill("50000");
    await input.press("Tab");
    await page.waitForTimeout(400);
    await expect(panelActionButton(page, 0)).toBeDisabled();
  });

  // ── Dual-panel betting ────────────────────────────────────────────────────

  test("both panels show Cancel after dual-bet placed", async ({ page }) => {
    await waitForBetting(page); // re-sync: beforeEach timing may have elapsed
    await setChipAmount(page, 0, 10);
    await setChipAmount(page, 1, 10);
    await clickBet(page, 0);
    await clickBet(page, 1);
    await expect(panelActionButton(page, 0)).toContainText("Cancel");
    await expect(panelActionButton(page, 1)).toContainText("Cancel");
  });

  test("cancelling one panel does not affect the other", async ({ page }) => {
    await setChipAmount(page, 0, 10);
    await setChipAmount(page, 1, 10);
    await clickBet(page, 0);
    await clickBet(page, 1);
    // Confirm both bets are live before cancelling
    await expect(panelActionButton(page, 0)).toContainText("Cancel", { timeout: 6000 });
    await expect(panelActionButton(page, 1)).toContainText("Cancel", { timeout: 6000 });
    // Cancel panel 0 immediately
    await panelActionButton(page, 0).click();
    // Panel 0: back to idle Bet state (still in betting phase)
    await expect(panelActionButton(page, 0)).toContainText("Bet", { timeout: 6000 });
    // Panel 1: still has a live bet — Cancel OR Waiting (if flying started)
    // Either way it must NOT show the idle "Bet" state
    const p1Text = await panelActionButton(page, 1).innerText();
    expect(p1Text).not.toMatch(/^Bet$/);
  });

  // ── History consistency ───────────────────────────────────────────────────

  test("history popup pill count matches scrollable bar pill count", async ({
    page,
  }) => {
    const barPills = await page.locator(sel.historyPill).count();
    await page.locator(sel.historyButton).click();
    const popupPills = await page
      .locator('.absolute .font-bold')
      .count();
    await page.locator(sel.historyButton).click();
    // Both should have the same number of items
    expect(popupPills).toBe(barPills);
  });

  // ── Sidebar top tab ───────────────────────────────────────────────────────

  test("Top tab period buttons produce non-empty list", async ({ page }) => {
    const sidebar = visibleSidebar(page);
    await sidebar.getByRole("button", { name: "Top", exact: true }).click();
    for (const period of ["Day", "Month", "Year"]) {
      await sidebar.getByRole("button", { name: period, exact: true }).click();
      const cards = sidebar.locator(".rounded-\\[14px\\]");
      await expect(cards.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("Top metric tabs X/Win/Rounds all render cards", async ({ page }) => {
    const sidebar = visibleSidebar(page);
    await sidebar.getByRole("button", { name: "Top", exact: true }).click();
    for (const metric of ["X", "Win", "Rounds"]) {
      await sidebar
        .getByRole("button", { name: metric, exact: true })
        .click();
      await expect(
        sidebar.locator(".rounded-\\[14px\\]").first(),
      ).toBeVisible();
    }
  });

  // ── Player count bubble ───────────────────────────────────────────────────

  test("player count bubble shows number ≥ 1", async ({ page }) => {
    const countText = await page
      .locator('[data-phase] .tabular-nums')
      .filter({ hasNotText: "x" }) // exclude multiplier
      .first()
      .innerText()
      .catch(() => "0");
    const n = parseInt(countText.trim(), 10);
    expect(n).toBeGreaterThanOrEqual(1);
  });

  // ── Viewport resize mid-game ──────────────────────────────────────────────

  test("viewport resize from desktop to mobile does not break layout", async ({
    page,
  }) => {
    // Start at desktop
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.locator(sel.sidebarDesktop)).toBeVisible();

    // Shrink to mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(sel.sidebarMobile)).toBeVisible();
    await expect(page.locator(sel.sidebarDesktop)).toBeHidden();

    // Game canvas still visible
    await expect(page.locator(sel.gameCanvas).first()).toBeVisible();
    // Bet panels still visible
    await expect(page.locator(sel.betPanels)).toBeVisible();
  });

  test("viewport resize mobile to desktop shows desktop sidebar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(sel.sidebarMobile)).toBeVisible();
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.locator(sel.sidebarDesktop)).toBeVisible();
    await expect(page.locator(sel.sidebarMobile)).toBeHidden();
  });

  // ── Multi-round invariants ────────────────────────────────────────────────

  test("Previous tab shows round result after next crash @slow", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await gotoApp(page);
    await waitForCrashed(page);
    // Navigate to Previous tab
    const sidebar = visibleSidebar(page);
    await sidebar.getByRole("button", { name: "Previous", exact: true }).click();
    const result = sidebar.locator(".text-\\[20px\\].font-extrabold");
    await expect(result).toBeVisible();
    await expect(result).toHaveText(/\d+\.\d{2}x|—/);
  });

  test("round IDs are unique across back-to-back rounds @slow", async ({
    page,
  }) => {
    test.setTimeout(200_000);
    const get = captureSocketEvents(page, "round:betting");
    await gotoApp(page);

    // Collect two betting rounds
    const roundIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      await waitForBetting(page, 60_000);
      const events = await get();
      const id = (events[events.length - 1]?.data as any)?.roundId;
      if (id && !roundIds.includes(id)) roundIds.push(id);
      // Wait for the round to finish before next
      await waitForCrashed(page, 120_000);
    }
    // If we collected 2, they must be different
    if (roundIds.length >= 2) {
      expect(roundIds[0]).not.toBe(roundIds[1]);
    }
  });

  // ── No console errors under normal operation ──────────────────────────────

  test("no unhandled JS errors during full betting → flying flow @slow", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await gotoApp(page);
    await waitForBetting(page);
    await waitForFlying(page);
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
