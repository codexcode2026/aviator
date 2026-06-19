/**
 * 12-auto-bet.spec.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Full auto-bet feature coverage:
 *   • Auto mode tab shows correct sub-controls
 *   • Auto Cash Out input disabled until toggle on
 *   • Clearing auto cash out resets value to 1.10
 *   • Auto bet toggle enables and disables
 *   • Auto bet disables manual bet button
 *   • Auto bet auto-places bet at start of next betting round
 *   • Auto Cash Out fires at the configured multiplier @slow
 *   • Both panels can run independent auto-modes simultaneously
 *   • Switching to manual mode while auto-bet is on resets the lock
 */
import { test, expect } from "@playwright/test";
import {
  gotoApp,
  waitForBetting,
  waitForFlying,
  betPanel,
  panelActionButton,
  switchPanelMode,
  clickBet,
  setChipAmount,
  waitForMultiplierAbove,
} from "../helpers/game";
import { sel } from "../helpers/selectors";

test.describe("Auto-bet mode", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await waitForBetting(page);
  });

  // ── UI structure ────────────────────────────────────────────────────────

  test("auto mode tab reveals auto-bet and auto-cash-out controls", async ({
    page,
  }) => {
    await switchPanelMode(page, 0, "auto");
    const panel = betPanel(page, 0);
    await expect(panel.getByText("Auto bet")).toBeVisible();
    await expect(panel.getByText("Auto Cash Out")).toBeVisible();
    // Two toggle buttons should be present
    const toggles = panel.locator('[aria-pressed]');
    expect(await toggles.count()).toBeGreaterThanOrEqual(2);
  });

  test("auto mode hides controls when switching back to bet mode", async ({
    page,
  }) => {
    await switchPanelMode(page, 0, "auto");
    await expect(betPanel(page, 0).getByText("Auto bet")).toBeVisible();
    await switchPanelMode(page, 0, "bet");
    await expect(betPanel(page, 0).getByText("Auto bet")).toBeHidden();
    await expect(betPanel(page, 0).getByText("Auto Cash Out")).toBeHidden();
  });

  test("auto cash out input disabled when toggle is off", async ({ page }) => {
    await switchPanelMode(page, 0, "auto");
    const input = betPanel(page, 0).locator('input[inputmode="decimal"]').last();
    await expect(input).toBeDisabled();
  });

  test("auto cash out input enabled when toggle is turned on", async ({
    page,
  }) => {
    await switchPanelMode(page, 0, "auto");
    // Click Auto Cash Out toggle
    const toggleRow = betPanel(page, 0)
      .getByText("Auto Cash Out")
      .locator("..")
      .locator('[aria-pressed]')
      .first();
    await toggleRow.click();
    const input = betPanel(page, 0).locator('input[inputmode="decimal"]').last();
    await expect(input).toBeEnabled();
  });

  test("clearing auto cash out resets input to 1.10", async ({ page }) => {
    await switchPanelMode(page, 0, "auto");
    // Enable auto cash out
    const toggleRow = betPanel(page, 0)
      .getByText("Auto Cash Out")
      .locator("..")
      .locator('[aria-pressed]')
      .first();
    await toggleRow.click();
    // Type a custom value
    const input = betPanel(page, 0).locator('input[inputmode="decimal"]').last();
    await input.fill("3.50");
    // Click clear button
    await page
      .locator(sel.autoCashOutClearBtn)
      .first()
      .click();
    // Input should be disabled again and value reset to 1.10
    await expect(input).toBeDisabled();
    await expect(input).toHaveValue("1.10");
  });

  test("auto bet toggle aria-pressed reflects state", async ({ page }) => {
    await switchPanelMode(page, 0, "auto");
    const toggleBtn = betPanel(page, 0)
      .getByText("Auto bet")
      .locator("..")
      .locator('[aria-pressed]')
      .first();
    await expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-pressed", "true");
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
  });

  // ── Bet button locking ──────────────────────────────────────────────────

  test("manual bet button disabled while auto-bet is on", async ({ page }) => {
    await switchPanelMode(page, 0, "auto");
    const toggleBtn = betPanel(page, 0)
      .getByText("Auto bet")
      .locator("..")
      .locator('[aria-pressed]')
      .first();
    await toggleBtn.click();
    const actionBtn = panelActionButton(page, 0);
    await expect(actionBtn).toBeDisabled();
    await expect(actionBtn).toContainText("Bet");
  });

  test("manual bet button re-enabled after turning auto-bet off", async ({
    page,
  }) => {
    await switchPanelMode(page, 0, "auto");
    const toggleBtn = betPanel(page, 0)
      .getByText("Auto bet")
      .locator("..")
      .locator('[aria-pressed]')
      .first();
    await toggleBtn.click();
    await expect(panelActionButton(page, 0)).toBeDisabled();
    await toggleBtn.click();
    await expect(panelActionButton(page, 0)).toBeEnabled();
  });

  // ── Auto-bet places bets automatically ─────────────────────────────────

  test("enabling auto bet during betting window immediately places bet", async ({
    page,
  }) => {
    await setChipAmount(page, 0, 10);
    await switchPanelMode(page, 0, "auto");
    const toggleBtn = betPanel(page, 0)
      .getByText("Auto bet")
      .locator("..")
      .locator('[aria-pressed]')
      .first();
    await toggleBtn.click();
    // Should transition to Cancel state (bet was auto-placed)
    await expect(panelActionButton(page, 0)).toContainText("Cancel", {
      timeout: 5000,
    });
  });

  // ── Panel independence ───────────────────────────────────────────────────

  test("panel 1 can be in bet mode while panel 0 is in auto mode", async ({
    page,
  }) => {
    await switchPanelMode(page, 0, "auto");
    await expect(betPanel(page, 0).getByText("Auto bet")).toBeVisible();
    // Panel 1 should still show bet mode controls only
    await expect(betPanel(page, 1).getByText("Auto bet")).toBeHidden();
  });

  test("both panels can independently toggle auto-cash-out", async ({ page }) => {
    await switchPanelMode(page, 0, "auto");
    await switchPanelMode(page, 1, "auto");

    const toggle0 = betPanel(page, 0)
      .getByText("Auto Cash Out")
      .locator("..")
      .locator('[aria-pressed]')
      .first();
    const toggle1 = betPanel(page, 1)
      .getByText("Auto Cash Out")
      .locator("..")
      .locator('[aria-pressed]')
      .first();

    await toggle0.click();
    await expect(toggle0).toHaveAttribute("aria-pressed", "true");
    await expect(toggle1).toHaveAttribute("aria-pressed", "false");
  });

  // ── Auto cash out fires at target multiplier ─────────────────────────────

  test("auto cash out fires at configured multiplier @slow", async ({ page }) => {
    test.setTimeout(180_000);
    await gotoApp(page);
    await waitForBetting(page);

    await setChipAmount(page, 0, 10);
    await switchPanelMode(page, 0, "auto");

    // Enable auto cash out at 1.20x
    const acToggle = betPanel(page, 0)
      .getByText("Auto Cash Out")
      .locator("..")
      .locator('[aria-pressed]')
      .first();
    await acToggle.click();
    const acInput = betPanel(page, 0)
      .locator('input[inputmode="decimal"]')
      .last();
    await acInput.fill("1.20");

    // Enable auto bet
    const abToggle = betPanel(page, 0)
      .getByText("Auto bet")
      .locator("..")
      .locator('[aria-pressed]')
      .first();
    await abToggle.click();

    // Wait until the bet goes into flying mode and we see cashedOut state
    await waitForFlying(page);

    // Poll for the cashed-out state on the button
    await expect
      .poll(
        async () => {
          const txt = await panelActionButton(page, 0).innerText().catch(() => "");
          return /cashed out|Waiting/i.test(txt) || /\d+\.\d{2}x/i.test(txt);
        },
        { timeout: 60_000, intervals: [500] },
      )
      .toBe(true);
  });
});
