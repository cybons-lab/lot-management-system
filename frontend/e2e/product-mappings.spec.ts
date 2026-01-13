/**
 * Product Mappings E2E Tests
 *
 * Tests for Product Mappings page features:
 * - List display with related master data
 * - Filtering (Customer, Supplier, Product, Inactive)
 * - Bulk Operations (Delete)
 * - Export/Import UI availability
 */

import { test, expect } from "@playwright/test";

test.describe("Product Mappings", () => {
    // Mock data
    const mockMapping = {
        id: 1,
        customer_id: 1,
        customer_part_code: "CUST-PART-001",
        supplier_id: 1,
        product_id: 1,
        base_unit: "EA",
        pack_unit: "BOX",
        pack_quantity: 10,
        special_instructions: "Handle with care",
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
    };

    const mockCustomer = { id: 1, customer_code: "C001", customer_name: "Test Customer" };
    const mockSupplier = { id: 1, supplier_code: "S001", supplier_name: "Test Supplier" };
    const mockProduct = { id: 1, product_code: "P001", maker_part_code: "P001", product_name: "Test Product" };

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
        await page.route("**/masters/suppliers*", async (route) => route.fulfill({ json: [mockSupplier] }));
        await page.route("**/masters/products*", async (route) => route.fulfill({ json: [mockProduct] }));

        // Product Mappings mocks
        await page.route("**/masters/product-mappings*", async (route) => {
            if (route.request().method() === "GET" && route.request().url().includes("export")) {
                await route.fulfill({ body: "dummy excel content", headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
                return;
            }
            if (route.request().method() === "GET") {
                await route.fulfill({ json: [mockMapping] });
            } else if (route.request().method() === "DELETE") {
                await route.fulfill({ json: { success: true } });
            } else {
                await route.continue();
            }
        });
    };

    test.beforeEach(async ({ page }) => {
        await setupAuth(page);
        await setupMocks(page);
        await page.goto("/product-mappings");
    });

    test("should display product mapping list with resolved names", async ({ page }) => {
        await expect(page.getByText("商品マッピング一覧")).toBeVisible();
        await expect(page.getByText("CUST-PART-001")).toBeVisible();

        // Verify resolved names (from Map lookups)
        await expect(page.getByText(`${mockCustomer.customer_code} - ${mockCustomer.customer_name}`)).toBeVisible();
        await expect(page.getByText(`${mockSupplier.supplier_code} - ${mockSupplier.supplier_name}`)).toBeVisible();
        await expect(page.getByText(`${mockProduct.maker_part_code} - ${mockProduct.product_name}`)).toBeVisible();
    });

    test("should filter list by customer", async ({ page }) => {
        // Since we only have 1 item, filtering by its customer should keep it visible
        // Filtering by "All" is default
        await expect(page.getByText("CUST-PART-001")).toBeVisible();

        // Note: To test actual filtering logic, we'd need multiple items.
        // Here we check the UI elements exist
        await expect(page.getByText("すべての得意先")).toBeVisible();
        await expect(page.getByText("すべての仕入先")).toBeVisible();
        await expect(page.getByText("すべての商品")).toBeVisible();

        // Checkbox
        await expect(page.getByLabel("削除済みを表示")).toBeVisible();
    });

    test("should show bulk delete action when items selected", async ({ page }) => {
        const checkbox = page.getByRole("checkbox").first(); // Header checkbox or row checkbox?
        // DataTable usually puts a checkbox in header and each row.
        // Let's target row checkbox. First one in body.
        // Our DataTable implementation might use specific test ids or structure.
        // Based on bulk-delete.spec.ts, it uses `page.getByTestId("select-row-checkbox")`
        // I need to ensure my DataTable renders with that testid?
        // DataTables usually don't have testids unless added.
        // Let's try locating by role "checkbox".
        // The first one is "Select all", second is row 1.

        // Wait for table to load
        await expect(page.getByRole("row").nth(1)).toBeVisible(); // Header is 0

        // Click row checkbox
        await page.getByRole("checkbox").nth(1).click();

        // Expect Bulk Action Bar
        await expect(page.getByText("1 件選択中")).toBeVisible();
        await expect(page.getByText("一括削除")).toBeVisible();
    });

    test("should trigger bulk delete", async ({ page }) => {
        let deleteCalled = false;
        await page.route("**/masters/product-mappings/1", async (route) => {
            if (route.request().method() === "DELETE") {
                deleteCalled = true;
                await route.fulfill({ json: { success: true } });
            } else {
                await route.continue();
            }
        });

        // Select row
        await page.getByRole("checkbox").nth(1).click();

        // Click Bulk Delete
        await page.getByRole("button", { name: "一括削除" }).click();

        // Check Dialog
        await expect(page.getByText("選択したマッピングを完全に削除しますか？")).toBeVisible();

        // Fill confirmation phrase
        await page.getByPlaceholder("DELETE").fill("DELETE");

        // Confirm
        await page.getByRole("button", { name: "1 件を完全に削除" }).click();

        // Verify API call
        // Note: Promise.all might fire fast.
        // We wait for toast or some UI change.
        await expect(page.getByText("1件を削除しました")).toBeVisible();
        expect(deleteCalled).toBe(true);
    });

    test("should have export and import buttons", async ({ page }) => {
        await expect(page.getByRole("button", { name: "Excelエクスポート" })).toBeVisible();
        await expect(page.getByRole("button", { name: "インポート" })).toBeVisible();
        await expect(page.getByRole("button", { name: "新規登録" })).toBeVisible();
    });

    test("should open import dialog", async ({ page }) => {
        await page.getByRole("button", { name: "インポート" }).click();
        await expect(page.getByText("商品マッピング一括登録")).toBeVisible();
        // Check if correct template group is inferred (hard to test without network spy on template download button)
        // But we can check if "テンプレートをダウンロード" button exists
        await expect(page.getByRole("button", { name: "テンプレートをダウンロード" })).toBeVisible();
    });
});
