import { test, expect } from "@playwright/test";
import {
  gotoApp,
  betPanel,
  panelActionButton,
  setChipAmount,
  switchPanelMode,
  waitForBetting,
  clickBet,
} from "../helpers/game";
import { sel } from "../helpers/selectors";

test.describe("Bet panels", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
    await waitForBetting(page);
  });

  test("renders dual panels by default", async ({ page }) => {
    await expect(page.locator(sel.betPanel(0))).toBeVisible();
    await expect(page.locator(sel.betPanel(1))).toBeVisible();
  });

  test("chip buttons update amount", async ({ page }) => {
    await setChipAmount(page, 0, 50);
    const input = betPanel(page, 0).locator("input").first();
    await expect(input).toHaveValue("50.00");
  });

  test("increase/decrease amount controls", async ({ page }) => {
    await setChipAmount(page, 0, 10);
    await betPanel(page, 0).getByRole("button", { name: "Increase" }).click();
    await expect(betPanel(page, 0).locator("input").first()).toHaveValue("11.00");
    await betPanel(page, 0).getByRole("button", { name: "Decrease" }).click();
    await expect(betPanel(page, 0).locator("input").first()).toHaveValue("10.00");
  });

  test("bet mode / auto mode tabs switch", async ({ page }) => {
    await switchPanelMode(page, 0, "auto");
    await expect(betPanel(page, 0).getByText("Auto bet")).toBeVisible();
    await expect(betPanel(page, 0).getByText("Auto Cash Out")).toBeVisible();
    await switchPanelMode(page, 0, "bet");
    await expect(betPanel(page, 0).getByText("Auto bet")).toBeHidden();
  });

  test("auto cash out input disabled until toggle on", async ({ page }) => {
    await switchPanelMode(page, 0, "auto");
    const input = betPanel(page, 0).locator('input[inputmode="decimal"]').last();
    await expect(input).toBeDisabled();
    await betPanel(page, 0).getByText("Auto Cash Out").locator("..").getByRole("button").first().click();
    await expect(input).toBeEnabled();
  });

  test("merge and restore dual panels", async ({ page }) => {
    await page.getByRole("button", { name: "Merge into single panel" }).click();
    await expect(page.locator(sel.betPanel(1))).toHaveCount(0);
    await page.getByRole("button", { name: "Add second panel" }).click();
    await expect(page.locator(sel.betPanel(1))).toBeVisible();
  });

  test("place bet shows cancel during betting window", async ({ page }) => {
    await setChipAmount(page, 0, 10);
    await clickBet(page, 0);
    await expect(panelActionButton(page, 0)).toContainText("Cancel");
  });
});
