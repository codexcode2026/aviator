import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  "share-link.url",
);

if (!fs.existsSync(file)) {
  console.log("No share link yet. Run: npm run dev:share");
  process.exit(1);
}

const url = fs.readFileSync(file, "utf8").trim();
console.log(url);
