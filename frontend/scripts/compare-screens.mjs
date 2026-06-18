import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("docs/screenshots");
const OURS = "http://localhost:5173/";
const REF = path.resolve(
  "../Aviator Game - Official Website by Spribe _ Play Online & Demo_files/aviator.html",
);

const viewports = [
  { name: "desktop", width: 1366, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 414, height: 896 },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  await page.goto(OURS, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: path.join(OUT, `ours-${vp.name}.png`),
    fullPage: false,
  });

  await page.goto(`file:///${REF.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
  await page.screenshot({
    path: path.join(OUT, `ref-${vp.name}.png`),
    fullPage: false,
  });

  await ctx.close();
  console.log(`captured ${vp.name}`);
}

await browser.close();
console.log("done → docs/screenshots/");
