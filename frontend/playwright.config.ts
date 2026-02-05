import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * Usage:
 *   npm run test:e2e          # Run all E2E tests
 *   npm run test:e2e:smoke    # Run P0 smoke tests only (@smoke tag)
 *   npm run test:e2e:headed   # Run with visible browser
 *
 * Selector Priority (規約):
 *   1. getByRole (role + name)
 *   2. getByLabel (aria-label)
 *   3. getByTestId (data-testid)
 *   4. locator (CSS) - 最後の手段
 */
export default defineConfig({
  testDir: "./e2e",

  /* Global setup: runs once before all tests */
  globalSetup: "./e2e/global-setup.ts",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only - max 1 retry to detect flaky tests */
  retries: process.env.CI ? 1 : 0,

  /* Workers: Use 4 for parallel execution (DB reset is now done once in globalSetup) */
  workers: process.env.CI ? 1 : 4,

  /* Timeout settings */
  timeout: 30_000, // 30s per test
  expect: {
    timeout: 10_000, // 10s for assertions
  },

  /* Reporter configuration */
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["json", { outputFile: "test-results/results.json" }]]
    : [["html", { open: "on-failure" }]],

  /* Output directories */
  outputDir: "test-results",

  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5174",

    /* API URL for direct API calls */
    extraHTTPHeaders: {
      "X-Test-Mode": "true",
    },

    /* Trace: always on CI, on-first-retry locally */
    trace: process.env.CI ? "on" : "on-first-retry",

    /* Video: record on first retry (helps debug flaky tests) */
    video: "on-first-retry",

    /* Screenshot: capture on failure */
    screenshot: "only-on-failure",

    /* Viewport */
    viewport: { width: 1280, height: 720 },

    /* Navigation timeout */
    navigationTimeout: 15_000,

    /* Action timeout */
    actionTimeout: 10_000,
  },

  /* Configure projects */
  projects: [
    /* P0 Smoke Tests - Run on every PR */
    {
      name: "smoke",
      testDir: "./e2e/specs/smoke",
      use: { ...devices["Desktop Chrome"] },
    },

    /* P0 Critical Tests - Essential flows */
    {
      name: "p0",
      testDir: "./e2e/specs/p0",
      use: { ...devices["Desktop Chrome"] },
    },

    /* Full Test Suite - Chromium */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    /* Firefox - disabled by default, enable for cross-browser testing */
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    /* WebKit - disabled by default */
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "VITE_BACKEND_ORIGIN=http://localhost:18000 npm run dev -- --port 5174",
    url: "http://localhost:5174",
    reuseExistingServer: false,
    timeout: 120_000, // 2 minutes for server startup
  },
});
