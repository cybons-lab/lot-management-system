import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:5173";
const screenshotsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "screenshots");

const routes = [
  "/dashboard",
  "/forecasts",
  "/inbound-plans",
  "/inventory",
  "/orders",
  "/rpa",
  "/admin",
  "/masters",
];

const sanitizeFilename = (route) =>
  route
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-") || "root";

async function ensureDir() {
  await fs.mkdir(screenshotsDir, { recursive: true });
}

async function captureScreens() {
  await ensureDir();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const route of routes) {
    const url = new URL(route, baseUrl).toString();
    const fileName = `${sanitizeFilename(route)}.png`;
    const outputPath = path.join(screenshotsDir, fileName);

    console.log(`Capturing ${url} -> ${outputPath}`);

    try {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: outputPath, fullPage: true });
    } catch (error) {
      console.error(`Failed to capture ${route}:`, error);
    }
  }

  await browser.close();
}

captureScreens();
