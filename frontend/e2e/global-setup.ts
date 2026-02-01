/**
 * Playwright Global Setup
 *
 * Runs once before all tests (across all workers).
 * Use this for one-time setup like database initialization.
 */
import { chromium } from "@playwright/test";
import { ApiClient } from "./fixtures/api-client";

export default async function globalSetup() {
  console.log("\n[Global Setup] Starting global setup...");

  // Create a browser context for API calls
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const request = context.request;

  try {
    // Reset database once for all tests
    console.log("[Global Setup] Resetting database...");
    const client = await ApiClient.create(request);
    await client.resetDatabase();
    console.log("[Global Setup] Database reset successful");

    // Generate initial test data if needed
    // await client.generateTestData({ category: "basic" });
  } catch (error) {
    console.error("[Global Setup] CRITICAL: Global setup failed:", error);
    throw new Error(
      `Global setup failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await context.close();
    await browser.close();
  }

  console.log("[Global Setup] Global setup completed\n");
}
