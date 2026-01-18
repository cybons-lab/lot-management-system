/**
 * Base Page Object for common page functionality
 *
 * All page objects should extend this class.
 * Contains common helpers for navigation, assertions, and waiting.
 */
import { Page, Locator, expect } from "@playwright/test";

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ===========================
  // Navigation
  // ===========================

  /**
   * Navigate to this page
   * Should be implemented by subclasses
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(action: () => Promise<void>): Promise<void> {
    await Promise.all([this.page.waitForLoadState("networkidle"), action()]);
  }

  // ===========================
  // Toast / Notifications
  // ===========================

  /**
   * Wait for success toast to appear
   */
  async expectSuccessToast(message?: string): Promise<void> {
    // Sonner toast - success variant
    const toast = this.page.locator('[data-sonner-toast][data-type="success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    if (message) {
      await expect(toast.first()).toContainText(message);
    }
  }

  /**
   * Wait for error toast to appear
   */
  async expectErrorToast(message?: string): Promise<void> {
    // Sonner toast - error variant
    const toast = this.page.locator('[data-sonner-toast][data-type="error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    if (message) {
      await expect(toast.first()).toContainText(message);
    }
  }

  /**
   * Wait for any toast and check its content
   */
  async expectToast(options: {
    type?: "success" | "error" | "warning" | "info";
    message?: string;
  }): Promise<void> {
    const typeSelector = options.type ? `[data-type="${options.type}"]` : "";
    const toast = this.page.locator(`[data-sonner-toast]${typeSelector}`);

    await expect(toast.first()).toBeVisible({ timeout: 5000 });

    if (options.message) {
      await expect(toast.first()).toContainText(options.message);
    }
  }

  /**
   * Dismiss all visible toasts
   */
  async dismissToasts(): Promise<void> {
    const toasts = this.page.locator("[data-sonner-toast]");
    const count = await toasts.count();

    for (let i = 0; i < count; i++) {
      const toast = toasts.nth(i);
      const closeButton = toast.locator('button[aria-label="Close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  }

  // ===========================
  // Loading States
  // ===========================

  /**
   * Wait for loading indicator to disappear
   */
  async waitForLoadingComplete(): Promise<void> {
    // Common loading indicators
    const loadingIndicators = [
      this.page.locator('[data-testid="loading"]'),
      this.page.locator('[role="progressbar"]'),
      this.page.locator(".animate-spin"),
    ];

    for (const indicator of loadingIndicators) {
      if ((await indicator.count()) > 0) {
        await expect(indicator.first()).not.toBeVisible({ timeout: 10000 });
      }
    }
  }

  // ===========================
  // Dialog / Modal
  // ===========================

  /**
   * Wait for dialog to open
   */
  async waitForDialog(): Promise<Locator> {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /**
   * Close current dialog
   */
  async closeDialog(): Promise<void> {
    // Try close button first
    const closeButton = this.page.getByRole("button", { name: "閉じる" });
    if (await closeButton.isVisible()) {
      await closeButton.click();
      return;
    }

    // Try X button
    const xButton = this.page.locator('[data-testid="dialog-close"], [aria-label="Close"]');
    if (await xButton.first().isVisible()) {
      await xButton.first().click();
      return;
    }

    // Press Escape as fallback
    await this.page.keyboard.press("Escape");
  }

  /**
   * Confirm dialog action
   */
  async confirmDialog(buttonText = "確認"): Promise<void> {
    const dialog = await this.waitForDialog();
    await dialog.getByRole("button", { name: buttonText }).click();
  }

  // ===========================
  // Form Helpers
  // ===========================

  /**
   * Fill a form field by label
   */
  async fillField(label: string, value: string): Promise<void> {
    const input = this.page.getByLabel(label);
    await input.fill(value);
  }

  /**
   * Select an option from a dropdown by label
   */
  async selectOption(label: string, optionText: string): Promise<void> {
    const select = this.page.getByLabel(label);
    await select.click();
    await this.page.getByRole("option", { name: optionText }).click();
  }

  // ===========================
  // API Response Waiting
  // ===========================

  /**
   * Wait for API response during action
   * Critical for save verification!
   */
  async waitForApiResponse(
    urlPattern: string | RegExp,
    action: () => Promise<void>,
    options?: { timeout?: number; status?: number },
  ): Promise<{ ok: boolean; status: number }> {
    const responsePromise = this.page.waitForResponse(
      (response) => {
        const matches =
          typeof urlPattern === "string"
            ? response.url().includes(urlPattern)
            : urlPattern.test(response.url());
        return matches;
      },
      { timeout: options?.timeout ?? 10000 },
    );

    await action();
    const response = await responsePromise;

    if (options?.status) {
      expect(response.status()).toBe(options.status);
    }

    return {
      ok: response.ok(),
      status: response.status(),
    };
  }

  /**
   * Wait for successful save operation
   * Returns true if API returned 2xx
   */
  async waitForSaveSuccess(
    urlPattern: string | RegExp,
    saveAction: () => Promise<void>,
  ): Promise<boolean> {
    const { ok, status } = await this.waitForApiResponse(urlPattern, saveAction, {
      timeout: 15000,
    });

    if (!ok) {
      console.warn(`Save API returned non-success status: ${status}`);
    }

    return ok;
  }

  // ===========================
  // Screenshot
  // ===========================

  /**
   * Take a screenshot with automatic naming
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }
}
