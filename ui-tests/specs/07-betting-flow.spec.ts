import { test, expect } from "@playwright/test";
import {
  gotoApp,
  waitForBetting,
  waitForFlying,
  clickBet,
  setChipAmount,
  panelActionButton,
  betPanel,
  switchPanelMode,
} from "../helpers/game";

test.describe("Betting flow (E2E)", () => {
  test("place bet → flying → cash out @slow", async ({ page }) => {
    test.setTimeout(120_000);
    await gotoApp(page);
    await waitForBetting(page);

    await setChipAmount(page, 0, 10);
    await clickBet(page, 0);
    await expect(panelActionButton(page, 0)).toContainText("Cancel");

    await waitForFlying(page);
    await expect(panelActionButton(page, 0)).toContainText("Cash Out");

    const cashBtn = panelActionButton(page, 0);
    await cashBtn.click();

    await expect
      .poll(async () => {
        const text = await panelActionButton(page, 0).innerText();
        return /cashed out|Waiting/i.test(text);
      }, { timeout: 15_000 })
      .toBe(true);
  });

  test("queue bet during flying shows waiting state", async ({ page }) => {
    test.setTimeout(90_000);
    await gotoApp(page);
    await waitForFlying(page);

    await setChipAmount(page, 1, 10);
    await clickBet(page, 1);
    await expect(panelActionButton(page, 1)).toContainText(/Waiting for next round|Cancel/);
  });

  test("cancel bet during betting window", async ({ page }) => {
    await gotoApp(page);
    await waitForBetting(page);

    await setChipAmount(page, 0, 20);
    await clickBet(page, 0);
    await expect(panelActionButton(page, 0)).toContainText("Cancel");

    await panelActionButton(page, 0).click();
    await expect(panelActionButton(page, 0)).toContainText("Bet");
  });

  test("auto bet locks manual bet button", async ({ page }) => {
    await gotoApp(page);
    await waitForFlying(page);

    await switchPanelMode(page, 0, "auto");
    const autoRow = betPanel(page, 0).getByText("Auto bet").locator("xpath=..");
    await autoRow.getByRole("button").first().click();

    const btn = panelActionButton(page, 0);
    await expect(btn).toBeDisabled();
    await expect(btn).toContainText("Bet");
  });
});
