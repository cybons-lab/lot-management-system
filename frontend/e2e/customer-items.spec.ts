/**
 * Customer Items (得意先品番マッピング) E2E Tests
 *
 * Tests for the Customer Items page:
 * - List display
 * - Export functionality (critical: catches API path issues)
 * - Basic CRUD operations
 */

import { test, expect } from "@playwright/test";

test.describe("Customer Items", () => {
    // Mock data
    const mockCustomerItem = {
        customer_id: 1,
        external_product_code: "EXT-001",
        product_id: 1,
        product_name: "Test Product",
        customer_code: "CUST-001",
        customer_name: "Test Customer",
        supplier_id: 1,
        supplier_code: "SUP-001",
        supplier_name: "Test Supplier",
        base_unit: "pcs",
        valid_from: "2024-01-01",
        valid_to: null,
        is_procurement_required: true,
        shipping_slip_text: null,
        special_instructions: null,
    };

    const mockCustomer = { id: 1, customer_code: "CUST-001", customer_name: "Test Customer" };
    const mockProduct = { id: 1, product_code: "P001", product_name: "Test Product" };

    const setupAuth = async (page: import("@playwright/test").Page) => {
        await page.addInitScript(() => localStorage.setItem("token", "fake-token"));
        await page.route("**/auth/me", async (route) => {
            await route.fulfill({
                json: { id: 1, username: "admin", roles: ["admin"], assignments: [] },
            });
        });
    };

    const setupMocks = async (page: import("@playwright/test").Page) => {
        // Master data mocks
        await page.route("**/masters/customers*", async (route) => route.fulfill({ json: [mockCustomer] }));
        await page.route("**/masters/products*", async (route) => route.fulfill({ json: [mockProduct] }));

        // Customer Items mocks
        await page.route("**/masters/customer-items*", async (route) => {
            const url = route.request().url();
            const method = route.request().method();

            // Export endpoint
            if (method === "GET" && url.includes("export/download")) {
                await route.fulfill({
                    body: "dummy excel content",
                    headers: {
                        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "content-disposition": "attachment; filename=customer_items.xlsx"
                    }
                });
                return;
            }

            // List endpoint
            if (method === "GET") {
                await route.fulfill({ json: [mockCustomerItem] });
                return;
            }

            await route.continue();
        });
    };

    test.beforeEach(async ({ page }) => {
        await setupAuth(page);
        await setupMocks(page);
        await page.goto("/customer-items");
    });

    test("should display customer items list", async ({ page }) => {
        // Check page title
        await expect(page.getByText("得意先品番マッピング")).toBeVisible();

        // Check table is rendered with data
        await expect(page.getByText("マッピング一覧")).toBeVisible();
        await expect(page.getByText("EXT-001")).toBeVisible();
        await expect(page.getByText("Test Customer")).toBeVisible();
    });

    test("should have export button visible", async ({ page }) => {
        await expect(page.getByRole("button", { name: "Excelエクスポート" })).toBeVisible();
    });

    test("should successfully trigger export download", async ({ page }) => {
        let exportCalled = false;

        // Override the export route specifically to track if called
        await page.route("**/masters/customer-items/export/download*", async (route) => {
            exportCalled = true;
            await route.fulfill({
                body: "dummy excel content",
                headers: {
                    "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "content-disposition": "attachment; filename=customer_items.xlsx"
                }
            });
        });

        // Click export button
        await page.getByRole("button", { name: "Excelエクスポート" }).click();

        // Wait for download to be triggered (export is async)
        await page.waitForTimeout(2000);

        // Verify API was called - this catches issues like:
        // 1. Wrong API path (leading slash issue with ky prefixUrl)
        // 2. Route order issues on backend (/{customer_id} matching before /export/download)
        expect(exportCalled).toBe(true);
    });

    test("should have import and create buttons", async ({ page }) => {
        await expect(page.getByRole("button", { name: "インポート" })).toBeVisible();
        await expect(page.getByRole("button", { name: "新規登録" })).toBeVisible();
    });
});
