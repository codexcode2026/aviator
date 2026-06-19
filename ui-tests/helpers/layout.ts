import type { Page, Locator } from "@playwright/test";
import { sel } from "./selectors";

/** The sidebar visible for the current viewport (desktop vs mobile). */
export function visibleSidebar(page: Page): Locator {
  return page
    .locator(`${sel.sidebarDesktop}:visible, ${sel.sidebarMobile}:visible`)
    .first();
}

export function liveBetsRoot(page: Page): Locator {
  return visibleSidebar(page).locator(sel.liveBets);
}

/** Assert every major shell region is mounted and visible. */
export async function expectCoreLayout(page: Page, viewport: "desktop" | "tablet" | "mobile") {
  const { expect } = await import("@playwright/test");
  await expect(page.locator(sel.header)).toBeVisible();
  await expect(page.locator(sel.historyBar)).toBeVisible();
  await expect(page.locator(sel.mainContent)).toBeVisible();
  await expect(page.locator(sel.gameCanvas).first()).toBeVisible();
  await expect(page.locator(sel.betPanels)).toBeVisible();
  await expect(liveBetsRoot(page)).toBeVisible();

  if (viewport === "mobile") {
    await expect(page.locator(sel.sidebarDesktop)).toBeHidden();
    await expect(page.locator(sel.sidebarMobile)).toBeVisible();
  } else {
    await expect(page.locator(sel.sidebarDesktop)).toBeVisible();
    await expect(page.locator(sel.sidebarMobile)).toBeHidden();
  }
}

/** Full UI element manifest — every interactive / visible region. */
export async function expectFullUiManifest(page: Page) {
  const { expect } = await import("@playwright/test");
  const sidebar = visibleSidebar(page);

  const checks: { name: string; locator: Locator }[] = [
    { name: "header logo", locator: page.locator(`${sel.header} ${sel.logo}`) },
    { name: "balance", locator: page.locator(`${sel.header} .text-balance`) },
    { name: "currency", locator: page.locator(`${sel.header} [class*="text-white/55"]`).last() },
    { name: "history bar", locator: page.locator(sel.historyBar) },
    { name: "history clock", locator: page.getByRole("button", { name: "History" }) },
    { name: "fun mode banner", locator: page.getByText("FUN MODE") },
    { name: "player count bubble", locator: page.locator('[data-phase] .rounded-full.bg-black\\/50') },
    { name: "bet panel 0", locator: page.locator(sel.betPanel(0)) },
    { name: "bet panel 1", locator: page.locator(sel.betPanel(1)) },
    { name: "sidebar tabs", locator: sidebar.getByRole("button", { name: "All Bets", exact: true }) },
    { name: "sidebar previous tab", locator: sidebar.getByRole("button", { name: "Previous", exact: true }) },
    { name: "sidebar top tab", locator: sidebar.getByRole("button", { name: "Top", exact: true }) },
    { name: "provably fair footer", locator: sidebar.getByText("Provably Fair Game") },
    { name: "spribe footer", locator: sidebar.getByText("SPRIBE") },
  ];

  for (const { name, locator } of checks) {
    await expect(locator.first(), `${name} should render`).toBeVisible();
  }
}
