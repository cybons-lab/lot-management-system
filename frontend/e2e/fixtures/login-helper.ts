/**
 * Login helper for E2E tests
 *
 * Provides a unified login function that works with the current UI
 * (user selection dropdown, no password required).
 */
import { Page } from "@playwright/test";

/**
 * Log in as a specific user using the new dropdown UI
 *
 * @param page - Playwright page object
 * @param username - Username to log in as (default: "admin")
 */
export async function loginAs(page: Page, username: string = "admin"): Promise<void> {
  // Check if already on login page
  if (!page.url().includes("/login") && !page.url().includes("/auth")) {
    // Already logged in or not on login page
    return;
  }

  // Wait for login page to load
  await page.waitForLoadState("networkidle");

  // Find and click the user selection dropdown
  const selectTrigger = page.getByRole("combobox").or(page.locator('[role="combobox"]'));
  await selectTrigger.click();

  // Wait for dropdown to open
  await page.waitForTimeout(300);

  // Select the user by username (matches display_name or username in parentheses)
  const userOption = page.getByRole("option", { name: new RegExp(username, "i") });
  await userOption.click();

  // Click login button
  const loginButton = page.getByRole("button", { name: /ログイン/ });
  await loginButton.click();

  // Wait for navigation to complete
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to a page and log in if redirected to login page
 *
 * @param page - Playwright page object
 * @param url - URL to navigate to
 * @param username - Username to log in as (default: "admin")
 */
export async function navigateAndLogin(
  page: Page,
  url: string,
  username: string = "admin",
): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState("networkidle");

  // If redirected to login, perform login
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    await loginAs(page, username);
  }
}
