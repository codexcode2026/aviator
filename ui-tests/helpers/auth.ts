import type { Page } from "@playwright/test";

export const CREDS = {
  admin:   { email: "admin@aviator.local",   password: "Admin@Aviator2026!",   role: "superadmin" },
  player1: { email: "player1@aviator.local", password: "Player1@2026!",        role: "user" },
  player2: { email: "player2@aviator.local", password: "Player2@2026!",        role: "user" },
  invalid: { email: "nobody@nowhere.com",    password: "wrongpassword",        role: null },
} as const;

/** Navigate to app and fill + submit the login form. */
export async function loginAs(
  page: Page,
  cred: { email: string; password: string },
) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // Wait for login screen
  await page.locator('[data-testid="login-screen"]').waitFor({ state: "visible", timeout: 10_000 });

  await page.locator('[data-testid="login-email"]').fill(cred.email);
  await page.locator('[data-testid="login-password"]').fill(cred.password);
  await page.locator('[data-testid="login-submit"]').click();
}

/** Login and wait until the game canvas is visible (auth succeeded). */
export async function loginAndWait(
  page: Page,
  cred: { email: string; password: string },
) {
  await loginAs(page, cred);
  await page.locator('[data-testid="header"]').waitFor({ state: "visible", timeout: 15_000 });
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 10_000 });
}

/** Click logout and wait for login screen to reappear. */
export async function logout(page: Page) {
  await page.locator('[data-testid="logout-btn"]').click();
  await page.locator('[data-testid="login-screen"]').waitFor({ state: "visible", timeout: 8_000 });
}
