/** Pre-flight: ensure Playwright browsers are available before the suite runs. */
export default async function globalSetup() {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  await browser.close();
}
