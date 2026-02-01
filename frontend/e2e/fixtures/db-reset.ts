/**
 * Database reset and test data fixtures
 *
 * Provides database reset functionality for E2E tests.
 * Follows the pattern: reset at worker level, unique prefix per test.
 */
import { test as base, APIRequestContext } from "@playwright/test";
import { ApiClient } from "./api-client";

// Re-export test with DB reset extensions
export const test = base.extend<
  {
    // Per-test fixtures
    testId: string;
  },
  {
    // Per-worker fixtures
    resetDatabase: void;
    workerRequest: APIRequestContext;
  }
>({
  /**
   * Unique test identifier for data isolation
   * Use this prefix for all test data to avoid conflicts
   */
  testId: async (
    // eslint-disable-next-line no-empty-pattern
    {},
    use,
    testInfo,
  ) => {
    // Generate unique prefix based on test file, title, and retry count
    const sanitizedTitle = testInfo.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
    const uniqueId = `${sanitizedTitle}_${Date.now() % 100000}`;
    await use(uniqueId);
  },

  /**
   * Worker-scoped request context
   */
  workerRequest: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext();
      await use(request);
      await request.dispose();
    },
    { scope: "worker" },
  ],

  /**
   * Reset database at worker level (before all tests in worker)
   * This runs once per worker, not per test
   */
  resetDatabase: [
    async ({ workerRequest }, use) => {
      console.log("[DB Reset] Resetting database for worker...");

      try {
        const client = await ApiClient.create(workerRequest);
        await client.resetDatabase();
        console.log("[DB Reset] Database reset successful");
      } catch (error) {
        console.error("[DB Reset] CRITICAL: Failed to reset database:", error);
        console.error("[DB Reset] Tests will likely fail due to dirty database state");
        // Throw to fail fast - continuing with dirty DB state causes confusing test failures
        throw new Error(
          `Database reset failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      await use();

      // No cleanup needed - next worker will reset
    },
    { scope: "worker", auto: true },
  ],
});

export { expect } from "@playwright/test";

/**
 * Test data factory helpers
 */
export const testData = {
  /**
   * Generate a unique order number
   */
  orderNumber: (prefix: string) => `E2E-${prefix}-${Date.now() % 100000}`,

  /**
   * Generate a unique lot number
   */
  lotNumber: (prefix: string) => `LOT-${prefix}-${Date.now() % 100000}`,

  /**
   * Generate a unique product code
   */
  productCode: (prefix: string) => `PRD-${prefix}-${Date.now() % 100000}`,

  /**
   * Date helpers
   */
  dates: {
    today: () => new Date().toISOString().split("T")[0],
    tomorrow: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    },
    inDays: (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    },
  },
};
