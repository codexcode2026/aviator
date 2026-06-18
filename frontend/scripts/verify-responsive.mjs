import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("docs/screenshots");
const OURS = "http://localhost:5173/";

const viewports = [
  { name: "xs", width: 320, height: 568 },
  { name: "mobile", width: 414, height: 896 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1366, height: 768 },
];

const states = [
  { id: "betting", wait: waitBetting },
  { id: "flying", wait: waitFlying },
  { id: "crashed", wait: waitCrashed },
];

async function waitBetting(page) {
  await page.locator('[data-phase="betting"]').first().waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(400);
}

async function waitFlying(page) {
  const canvas = page.locator('[data-phase="flying"]').first();
  await canvas.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-phase="flying"]');
      const mult = el?.querySelector(".tabular-nums");
      const v = parseFloat(mult?.textContent ?? "0");
      return v >= 1.15;
    },
    { timeout: 15000 },
  );
  await page.waitForTimeout(120);
}

async function waitCrashed(page) {
  await page.locator('[data-phase="crashed"]').first().waitFor({ state: "visible", timeout: 120000 });
  await page.waitForTimeout(250);
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(OURS, { waitUntil: "domcontentloaded", timeout: 60000 });

  for (const st of states) {
    try {
      await st.wait(page);
      const file = `ours-${vp.name}-${st.id}.png`;
      await page.screenshot({
        path: path.join(OUT, file),
        fullPage: false,
      });
      results.push({ viewport: vp.name, state: st.id, file, status: "ok" });
      console.log(`✓ ${vp.name} / ${st.id}`);
    } catch (e) {
      results.push({
        viewport: vp.name,
        state: st.id,
        status: "fail",
        error: String(e.message ?? e),
      });
      console.log(`✗ ${vp.name} / ${st.id}: ${e.message ?? e}`);
    }
  }

  await ctx.close();
}

await browser.close();

const report = `# Responsive Verification

**Generated:** ${new Date().toISOString().slice(0, 10)}

## Viewports × Game states

| Viewport | Size | Betting | Flying | Crashed |
|----------|------|---------|--------|---------|
${viewports
  .map((vp) => {
    const row = states.map((st) => {
      const r = results.find((x) => x.viewport === vp.name && x.state === st.id);
      return r?.status === "ok" ? `✅ \`${r.file}\`` : "❌";
    });
    return `| ${vp.name} | ${vp.width}×${vp.height} | ${row.join(" | ")} |`;
  })
  .join("\n")}

## Files

${results
  .filter((r) => r.file)
  .map((r) => `- \`${r.file}\` — ${r.viewport} ${r.state}`)
  .join("\n")}
`;

await writeFile(path.join(OUT, "VERIFICATION.md"), report);
console.log("done → docs/screenshots/VERIFICATION.md");
