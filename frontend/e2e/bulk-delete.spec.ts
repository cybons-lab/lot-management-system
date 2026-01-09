/**
 * Bulk Delete E2E Tests
 *
 * Tests for bulk deletion functionality across master pages:
 * - Admin: Bulk permanent delete with DELETE phrase confirmation
 * - Non-admin: Bulk soft delete with end date
 */

import { test, expect } from "@playwright/test";

test.describe("Bulk Delete", () => {
  // Helper to mock auth with roles
  const mockAuth = async (page: import("@playwright/test").Page, roles: string[]) => {
    // Debugging
    // page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    // page.on("pageerror", (exception) => console.log(`PAGE EXCEPTION: "${exception}"`));
    // page.on("requestfailed", (request) =>
    //   console.log(`REQUEST FAILED: ${request.url()} ${request.failure()?.errorText}`),
    // );
    // page.on("request", (request) => console.log(`REQ: ${request.url()}`));

    await page.addInitScript(() => {
      window.localStorage.setItem("token", "test-token");
    });

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
    // Mock GET list
    await page.route("**/api/masters/customers", async (route) => {
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
      } else {
        await route.continue();
      }
    });

    // Mock DELETE
    await page.route("**/api/masters/customers/bulk-upsert", async (route) => {
      if (route.request().method() === "POST") {
        // upsert/delete endpoint
        await route.fulfill({ json: { success: true, count: 1 } });
      } else {
        await route.continue();
      }
    });

    // Mock specific delete endpoints if used
    await page.route("**/api/masters/customers/*/permanent", async (route) => {
      await route.fulfill({ json: { success: true } });
    });
  };

  // Helper to mock warehouses (often loaded in background)
  const mockWarehouses = async (page: import("@playwright/test").Page) => {
    await page.route("**/api/masters/warehouses", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: [{ id: 1, warehouse_name: "Warehouse 1" }],
        });
      } else {
        await route.continue();
      }
    });
  };

  test.describe("Admin - Bulk Permanent Delete", () => {
    test.beforeEach(async ({ page }) => {
      await mockAuth(page, ["admin"]);
      await mockWarehouses(page);
      await mockCustomersList(page);
    });

    test("should show bulk delete bar when items are selected", async ({ page }) => {
      await page.goto("/customers");

      // Select first item checkbox
      const firstCheckbox = page.locator('table tbody tr:first-child input[type="checkbox"]');
      await firstCheckbox.click();

      // Bulk action bar should appear with admin styling
      await expect(page.getByText("1 件選択中")).toBeVisible();
      await expect(page.getByRole("button", { name: "一括削除" })).toBeVisible();
    });

    test("should open bulk permanent delete dialog on click", async ({ page }) => {
      await page.goto("/customers");

      // Select multiple items
      const checkboxes = page.locator('table tbody input[type="checkbox"]');
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();

      // Click bulk delete button
      await page.getByRole("button", { name: "一括削除" }).click();

      // Dialog should open
      await expect(page.getByText("選択項目を完全に削除しますか？")).toBeVisible();
      await expect(
        page.getByText(/この操作は取り消せません。データベースから完全に削除されます/),
      ).toBeVisible();
    });

    test("should require DELETE confirmation for permanent delete", async ({ page }) => {
      await page.goto("/customers");

      // Select item and open dialog
      const firstCheckbox = page.locator('table tbody tr:first-child input[type="checkbox"]');
      await firstCheckbox.click();
      await page.getByRole("button", { name: "一括削除" }).click();

      // Confirm button should be disabled initially
      const confirmButton = page.getByRole("button", { name: /件を完全に削除/ });
      await expect(confirmButton).toBeDisabled();

      // Enter DELETE phrase
      await page.getByPlaceholder("DELETE").fill("DELETE");

      // Confirm button should be enabled
      await expect(confirmButton).toBeEnabled();
    });
  });

  test.describe("Non-Admin - Bulk Soft Delete", () => {
    test.beforeEach(async ({ page }) => {
      await mockAuth(page, ["user"]);
      await mockWarehouses(page);
      await mockCustomersList(page);
    });

    test("should show bulk inactivate bar when items are selected", async ({ page }) => {
      await page.goto("/customers");

      // Select first item checkbox
      const firstCheckbox = page.locator('table tbody tr:first-child input[type="checkbox"]');
      await firstCheckbox.click();

      // Bulk action bar should appear with non-admin styling
      await expect(page.getByText("1 件選択中")).toBeVisible();
      await expect(page.getByRole("button", { name: "一括無効化" })).toBeVisible();
    });

    test("should open bulk soft delete dialog on click", async ({ page }) => {
      await page.goto("/customers");

      // Select item
      const firstCheckbox = page.locator('table tbody tr:first-child input[type="checkbox"]');
      await firstCheckbox.click();

      // Click bulk inactivate button
      await page.getByRole("button", { name: "一括無効化" }).click();

      // Dialog should open
      await expect(page.getByText("選択項目を無効化しますか？")).toBeVisible();
      await expect(page.getByLabel(/無効化日/)).toBeVisible();
    });

    test("should allow setting end date for soft delete", async ({ page }) => {
      await page.goto("/customers");

      // Select item and open dialog
      const firstCheckbox = page.locator('table tbody tr:first-child input[type="checkbox"]');
      await firstCheckbox.click();
      await page.getByRole("button", { name: "一括無効化" }).click();

      // Date input should have today's date by default
      const dateInput = page.getByLabel(/無効化日/);
      await expect(dateInput).toHaveAttribute("type", "date");

      // Change date
      await dateInput.fill("2024-12-31");

      // Confirm button should be enabled
      const confirmButton = page.getByRole("button", { name: /件を無効化/ });
      await expect(confirmButton).toBeEnabled();
    });
  });
});
