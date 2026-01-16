import { test, expect } from "@playwright/test";

test.describe("Lot Allocation", () => {
  test.beforeEach(async ({ page }) => {
    // Debugging
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (exception) => console.log(`PAGE EXCEPTION: "${exception}"`));
    page.on("requestfailed", (request) =>
      console.log(`REQUEST FAILED: ${request.url()} ${request.failure()?.errorText}`),
    );
    page.on("request", (request) => console.log(`REQ: ${request.url()}`));

    // Mock Auth (Login as Admin)
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        json: {
          id: 1,
          username: "admin",
          display_name: "Admin User",
          roles: ["admin"],
          assignments: [],
        },
      });
    });

    // Mock Confirmed Order Lines
    await page.route("**/orders/confirmed-order-lines*", async (route) => {
      await route.fulfill({ json: [] });
    });

    // Mock Orders Lines List
    await page.route("**/orders/lines*", async (route) => {
      console.log("MOCK MATCHED: orders/lines");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        json: [
          {
            id: 100,
            order_line_id: 100,
            order_id: 1,
            order_number: "ORD-001",
            product_id: 1,
            product_code: "PROD-001",
            product_name: "Test Product",
            quantity: 100,
            order_quantity: 100,
            allocated_quantity: 0,
            allocated_lots: [],
            unit: "kg",
            status: "open",
            delivery_date: "2025-01-01",
            customer_name: "Test Customer",
            customer_code: "CUST-001",
            warehouse_id: 1,
            warehouse_name: "Main Warehouse",
            order_type: "ORDER",
          },
        ],
      });
    });

    // Mock Order Detail
    await page.route("**/v2/orders/*", async (route) => {
      console.log("MOCK MATCHED: v2/orders/detail");
      await route.fulfill({
        json: {
          id: 1,
          order_number: "ORD-001",
          customer_id: 1,
          customer_name: "Test Customer",
          status: "open",
          order_lines: [],
        },
      });
    });

    // Mock Allocation Candidates
    await page.route("**/v2/lot/available*", async (route) => {
      console.log("MOCK MATCHED: v2/lot/available");
      await route.fulfill({
        json: [
          {
            lot_id: 1,
            lot_code: "LOT-001",
            lot_number: "LOT-001",
            available_qty: 50,
            available_quantity: 50,
            expiry_date: "2025-12-31",
            warehouse_code: "Main Warehouse",
            warehouse_name: "Main Warehouse",
            product_code: "PROD-001",
          },
        ],
      });
    });
  });

  test("should display order list and open allocation dialog", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL("/orders");

    await page.waitForTimeout(2000);

    // Check if empty state is visible
    const emptyState = page.getByText("明細がありません");
    if (await emptyState.isVisible()) {
      console.log("DEBUG: Empty state is visible");
    } else {
      console.log("DEBUG: Empty state is NOT visible");
    }

    // We check for a real customer name that is returned by the mock.
    await expect(page.locator("td:has-text('Test Customer')").first()).toBeVisible({
      timeout: 20000,
    });

    // 3. Click Allocate button.
    await page.getByRole("button", { name: "引当" }).first().click();

    // 4. Verify Dialog opens
    await expect(page.getByRole("dialog")).toBeVisible();

    // Verify mock candidates (LOT-001)
    await expect(page.getByText("LOT-001")).toBeVisible();
  });
});
