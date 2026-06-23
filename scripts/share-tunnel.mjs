/**
 * Public tunnel for sharing the dev app worldwide.
 * Prints ONLY a clean share link — no cloudflared log spam.
 */

import { spawn, exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LINK_FILE = path.join(ROOT, "share-link.url");

const PORT = process.env.SHARE_PORT ?? "5173";
const TARGET = `http://127.0.0.1:${PORT}`;
const WAIT_MS = 90_000;

const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

async function waitForDevServer() {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(TARGET, { signal: AbortSignal.timeout(2000) });
      if (r.ok || r.status === 404) return;
    } catch {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw new Error(`Frontend not running on :${PORT}. Start "Aviator: Frontend" first.`);
}

function printShareLink(url) {
  fs.writeFileSync(LINK_FILE, `${url}\n`, "utf8");

  // Clear screen so the link is impossible to miss (VS Code terminal)
  if (process.stdout.isTTY) {
    process.stdout.write("\x1b[2J\x1b[H");
  }

  const line = "━".repeat(62);

  console.log("");
  console.log(line);
  console.log("");
  console.log("  SHARE LINK  (send to friends anywhere)");
  console.log("");
  console.log(`  ${url}`);
  console.log("");
  console.log(line);
  console.log("");
  console.log("  Copied to clipboard · keep this terminal open");
  console.log("");

  // Machine-readable line for VS Code task matcher (single line, no extra noise)
  console.log(`AVIATOR_SHARE_URL=${url}`);

  if (process.platform === "win32") {
    exec(`powershell -NoProfile -Command "Set-Clipboard -Value '${url}'"`);
  }
}

function startTunnel() {
  console.log("Starting public tunnel…\n");

  const child = spawn("npx -y cloudflared tunnel --url " + TARGET, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let published = false;
  let buffer = "";

  const tryPublish = () => {
    if (published) return;
    const m = buffer.match(URL_RE);
    if (m) {
      published = true;
      printShareLink(m[0]);
    }
  };

  const onChunk = (buf) => {
    // Swallow cloudflared output — only scan for the URL
    buffer += buf.toString();
    if (buffer.length > 8000) buffer = buffer.slice(-4000);
    tryPublish();
  };

  child.stdout.on("data", onChunk);
  child.stderr.on("data", onChunk);
  child.on("exit", (code) => {
    if (!published) {
      console.error("\nTunnel stopped before a link was created.\n");
    }
    process.exit(code ?? 0);
  });

  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

await waitForDevServer();
startTunnel();
