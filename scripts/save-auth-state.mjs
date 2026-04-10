import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const outputPath = process.env.E2E_AUTH_STORAGE || "e2e/.auth/storage.json";

const authDir = path.dirname(outputPath);
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

console.log(`Opening browser for manual login at: ${baseUrl}`);
console.log("After completing login, return here and press ENTER to save the storage state.");

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(baseUrl, { waitUntil: "load" });

await new Promise(resolve => {
  process.stdin.resume();
  process.stdin.once("data", () => resolve());
});

await context.storageState({ path: outputPath });
console.log(`Saved storage state to ${outputPath}`);
await browser.close();
