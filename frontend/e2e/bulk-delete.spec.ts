/**
 * Bulk Delete E2E Tests
 *
 * Tests for bulk deletion functionality across master pages:
 * - Admin: Bulk permanent delete with DELETE phrase confirmation
 * - Non-admin: Bulk soft delete with end date
 */

import { test, expect } from "@playwright/test";

test.describe("Bulk Delete", () => {
  // Helper to mock auth with roles and set up localStorage
  const setupAuth = async (page: import("@playwright/test").Page, roles: string[]) => {
    // Set fake token to trigger auth/me call
    await page.addInitScript(() => {
      localStorage.setItem("token", "fake-test-token");
    });

    // Mock auth/me API
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        json: {
          id: 1,
          username: "testuser",
          display_name: "Test User",
          roles,
          assignments: [],
        },
      });
    });
  };

  // Helper to mock customers list
  const mockCustomersList = async (page: import("@playwright/test").Page) => {
    await page.route("**/masters/customers*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: [
            {
              id: 1,
              customer_code: "C001",
              customer_name: "Customer 1",
              updated_at: "2025-01-01T10:00:00Z",
            },
            {
              id: 2,
              customer_code: "C002",
              customer_name: "Customer 2",
              updated_at: "2025-01-01T10:00:00Z",
            },
            {
              id: 3,
              customer_code: "C003",
              customer_name: "Customer 3",
              updated_at: "2025-01-01T10:00:00Z",
            },
          ],
        });
      } else if (route.request().method() === "DELETE") {
        await route.fulfill({ json: { success: true } });
      } else {
        await route.continue();
      }
    });
  };

  test.describe("Admin - Bulk Permanent Delete", () => {
    test.beforeEach(async ({ page }) => {
      await setupAuth(page, ["admin"]);
      await mockCustomersList(page);
    });

    test("should show bulk delete bar when items are selected", async ({ page }) => {
      await page.goto("/customers");
      await expect(page.getByText("Customer 1")).toBeVisible();

      // Select first item checkbox
      const firstCheckbox = page.getByTestId("select-row-checkbox").first();
      await firstCheckbox.click({ force: true });
      await expect(firstCheckbox).toBeChecked();

      // Bulk action bar should appear with admin styling
      await expect(page.getByTestId("bulk-delete-button")).toBeVisible();
    });

    test("should open bulk permanent delete dialog on click", async ({ page }) => {
      await page.goto("/customers");
      await expect(page.getByText("Customer 1")).toBeVisible();

      // Select multiple items
      const checkboxes = page.getByTestId("select-row-checkbox");
      await checkboxes.nth(0).click({ force: true });
      await expect(checkboxes.nth(0)).toBeChecked();
      await checkboxes.nth(1).click({ force: true });
      await expect(checkboxes.nth(1)).toBeChecked();

      // Click bulk delete button
      await page.getByTestId("bulk-delete-button").click();

      // Dialog should open (check by testid instead of Japanese text)
      await expect(page.getByTestId("delete-dialog")).toBeVisible();
      await expect(page.getByTestId("delete-dialog-confirm-input")).toBeVisible();
    });

    test("should require DELETE confirmation for permanent delete", async ({ page }) => {
      await page.goto("/customers");
      await expect(page.getByText("Customer 1")).toBeVisible();

      // Select item and open dialog
      const firstCheckbox = page.getByTestId("select-row-checkbox").first();
      await expect(firstCheckbox).toBeVisible();
      await firstCheckbox.click({ force: true });
      await expect(firstCheckbox).toBeChecked();
      await page.getByTestId("bulk-delete-button").click();

      // Confirm button should be disabled initially
      const confirmButton = page.getByTestId("delete-dialog-confirm-button");
      await expect(confirmButton).toBeDisabled();

      // Enter DELETE phrase
      await page.getByTestId("delete-dialog-confirm-input").fill("DELETE");

      // Confirm button should be enabled
      await expect(confirmButton).toBeEnabled();
    });
  });

  test.describe("Non-Admin - Bulk Soft Delete", () => {
    test.beforeEach(async ({ page }) => {
      await setupAuth(page, ["user"]);
      await mockCustomersList(page);
    });

    test("should show bulk inactivate bar when items are selected", async ({ page }) => {
      await page.goto("/customers");
      await expect(page.getByText("Customer 1")).toBeVisible();

      // Select first item checkbox
      const firstCheckbox = page.getByTestId("select-row-checkbox").first();
      await expect(firstCheckbox).toBeVisible();
      await firstCheckbox.click({ force: true });
      await expect(firstCheckbox).toBeChecked();

      // Bulk action bar should appear with non-admin styling
      await expect(page.getByTestId("bulk-inactivate-button")).toBeVisible();
    });

    test("should open bulk soft delete dialog on click", async ({ page }) => {
      await page.goto("/customers");
      await expect(page.getByText("Customer 1")).toBeVisible();

      // Select item
      const firstCheckbox = page.getByTestId("select-row-checkbox").first();
      await expect(firstCheckbox).toBeVisible();
      await firstCheckbox.click({ force: true });
      await expect(firstCheckbox).toBeChecked();

      // Click bulk inactivate button
      await page.getByTestId("bulk-inactivate-button").click();

      // Dialog should open (check by testid instead of Japanese text)
      await expect(page.getByTestId("delete-dialog")).toBeVisible();
      await expect(page.getByTestId("delete-dialog-date-input")).toBeVisible();
    });

    test("should allow setting end date for soft delete", async ({ page }) => {
      await page.goto("/customers");
      await expect(page.getByText("Customer 1")).toBeVisible();

      // Select first item checkbox
      const firstCheckbox = page.getByTestId("select-row-checkbox").first();
      await expect(firstCheckbox).toBeVisible();
      await firstCheckbox.click({ force: true });
      await expect(firstCheckbox).toBeChecked();
      await page.getByTestId("bulk-inactivate-button").click();

      // Date input should be visible
      const dateInput = page.getByTestId("delete-dialog-date-input");
      await expect(dateInput).toHaveAttribute("type", "date");

      // Change date
      await dateInput.fill("2024-12-31");

      // Confirm button should be enabled
      const confirmButton = page.getByTestId("delete-dialog-confirm-button");
      await expect(confirmButton).toBeEnabled();
    });
  });
});
