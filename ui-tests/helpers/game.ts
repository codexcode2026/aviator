import type { Page, Locator } from "@playwright/test";
import { sel, type GamePhase } from "./selectors";

export async function gotoApp(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(sel.header).waitFor({ state: "visible" });
  await page.locator(sel.gameCanvas).first().waitFor({ state: "visible" });
}

export async function waitForPhase(
  page: Page,
  phase: GamePhase,
  timeout = 60_000,
) {
  await page
    .locator(`[data-phase="${phase}"]`)
    .first()
    .waitFor({ state: "visible", timeout });
}

export async function waitForBetting(page: Page, timeout = 30_000) {
  await waitForPhase(page, "betting", timeout);
  await page.waitForTimeout(300);
}

export async function waitForFlying(page: Page, timeout = 30_000) {
  await waitForPhase(page, "flying", timeout);
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-phase="flying"]');
      const mult = el?.querySelector(".tabular-nums");
      const v = parseFloat(mult?.textContent ?? "0");
      return v >= 1.1;
    },
    { timeout },
  );
}

export async function waitForCrashed(page: Page, timeout = 120_000) {
  await waitForPhase(page, "crashed", timeout);
  await page.getByText("Flew Away!").first().waitFor({ state: "visible", timeout: 5000 });
}

export function betPanel(page: Page, index: 0 | 1): Locator {
  return page.locator(sel.betPanel(index));
}

export function panelActionButton(page: Page, index: 0 | 1): Locator {
  return betPanel(page, index).locator(".grid > button.rounded-xl").first();
}

export async function clickBet(page: Page, index: 0 | 1 = 0) {
  const btn = panelActionButton(page, index);
  await btn.waitFor({ state: "visible" });
  await btn.click();
}

export async function setChipAmount(page: Page, index: 0 | 1, amount: number) {
  await betPanel(page, index).getByRole("button", { name: String(amount), exact: true }).click();
}

export function panelModeTab(page: Page, index: 0 | 1, mode: "bet" | "auto") {
  return betPanel(page, index)
    .locator(".rounded-full.bg-\\[\\#101113\\]")
    .getByRole("button", { name: mode });
}

export async function switchPanelMode(page: Page, index: 0 | 1, mode: "bet" | "auto") {
  await panelModeTab(page, index, mode).click();
}

export async function getCurrentPhase(page: Page): Promise<GamePhase> {
  return page.locator(sel.gameCanvas).first().getAttribute("data-phase") as Promise<GamePhase>;
}

export async function getBalanceText(page: Page): Promise<string> {
  return page.locator(`${sel.header} .text-balance`).innerText();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
  return overflow;
}
