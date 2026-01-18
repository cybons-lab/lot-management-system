/**
 * Authentication fixtures for E2E tests
 *
 * Provides login state and user context for tests.
 */
import { test as base, Page } from "@playwright/test";
import { ApiClient } from "./api-client";

// User credentials
export const TEST_USERS = {
  admin: {
    username: "admin",
    password: "admin123",
  },
  user: {
    username: "testuser",
    password: "testuser123",
  },
} as const;

// Extend base test with authentication fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  adminApiClient: ApiClient;
  userApiClient: ApiClient;
}>({
  /**
   * Page with admin user logged in
   */
  authenticatedPage: async ({ page, request }, use) => {
    // Login via API to verify credentials work
    await ApiClient.create(request, TEST_USERS.admin);

    // Set auth cookie/token in browser context
    // Navigate to login page and login via UI for session
    await page.goto("/");

    // Wait for potential redirect to login
    await page.waitForLoadState("networkidle");

    // Check if we need to login
    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/auth")) {
      // Fill login form if present
      const usernameInput = page.getByLabel("ユーザー名").or(page.getByPlaceholder("ユーザー名"));
      const passwordInput = page.getByLabel("パスワード").or(page.getByPlaceholder("パスワード"));

      if (await usernameInput.isVisible()) {
        await usernameInput.fill(TEST_USERS.admin.username);
        await passwordInput.fill(TEST_USERS.admin.password);
        await page.getByRole("button", { name: "ログイン" }).click();
        await page.waitForLoadState("networkidle");
      }
    }

    await use(page);
  },

  /**
   * API Client authenticated as admin
   */
  adminApiClient: async ({ request }, use) => {
    const client = await ApiClient.create(request, TEST_USERS.admin);
    await use(client);
  },

  /**
   * API Client authenticated as normal user
   * Note: This requires that a normal user exists in the database
   */
  userApiClient: async ({ request }, use) => {
    // For now, use admin - in future, create separate test user
    const client = await ApiClient.create(request, TEST_USERS.admin);
    await use(client);
  },
});

export { expect } from "@playwright/test";
