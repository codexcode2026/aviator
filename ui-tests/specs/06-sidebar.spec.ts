import { test, expect } from "@playwright/test";
import { gotoApp } from "../helpers/game";
import { liveBetsRoot, visibleSidebar } from "../helpers/layout";
import { sel } from "../helpers/selectors";

test.describe("Live bets sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page);
  });

  test("main tabs switch content", async ({ page }) => {
    const sidebar = visibleSidebar(page);
    await expect(sidebar.getByRole("button", { name: "All Bets", exact: true })).toBeVisible();

    await sidebar.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(sidebar.getByText("Round Result")).toBeVisible();

    await sidebar.getByRole("button", { name: "Top", exact: true }).click();
    await expect(sidebar.getByRole("button", { name: "X", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Day", exact: true })).toBeVisible();
  });

  test("All Bets summary shows progress bar and totals", async ({ page }) => {
    const sidebar = liveBetsRoot(page);
    await sidebar.getByRole("button", { name: "All Bets", exact: true }).click();
    await expect(sidebar.getByText(/Total win/)).toBeVisible();
    await expect(sidebar.locator(".bg-gradient-to-r")).toBeVisible();
    await expect(sidebar.getByText("Player")).toBeVisible();
    await expect(sidebar.getByText(/Bet ZAR/)).toBeVisible();
  });

  test("bet list renders rows with avatars", async ({ page }) => {
    const sidebar = liveBetsRoot(page);
    const rows = sidebar.locator(".rounded-\\[12px\\]");
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });
    expect(await rows.count()).toBeGreaterThan(3);
    await expect(rows.first().locator("svg")).toBeVisible();
  });

  test("Top tab has no chat/message icon", async ({ page }) => {
    const sidebar = liveBetsRoot(page);
    await sidebar.getByRole("button", { name: "Top", exact: true }).click();
    await expect(sidebar.getByRole("button", { name: "Chat" })).toHaveCount(0);
    await expect(sidebar.getByRole("button", { name: "Provably fair" }).first()).toBeVisible();
  });

  test("Top metric and period sub-tabs work", async ({ page }) => {
    const sidebar = liveBetsRoot(page);
    await sidebar.getByRole("button", { name: "Top", exact: true }).click();

    await sidebar.getByRole("button", { name: "Win", exact: true }).click();
    await sidebar.getByRole("button", { name: "Month", exact: true }).click();

    const cards = sidebar.locator(".rounded-\\[14px\\]");
    await expect(cards.first()).toBeVisible();
    await expect(cards.first().getByText(/Bet /)).toBeVisible();
    await expect(cards.first().getByText(/Result/)).toBeVisible();
  });

  test("sidebar scrolls internally on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only");
    const sidebar = page.locator(sel.sidebarMobile);
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThan(page.viewportSize()!.height * 0.85);

    const list = liveBetsRoot(page).locator(".overflow-y-auto").first();
    await expect(list).toBeVisible();
    const scrollable = await list.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(scrollable).toBe(true);
  });
});
