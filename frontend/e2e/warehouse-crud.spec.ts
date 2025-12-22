import { test, expect } from "@playwright/test";

test.describe("Warehouse CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Debugging
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (exception) => console.log(`PAGE EXCEPTION: "${exception}"`));
    page.on("requestfailed", (request) =>
      console.log(`REQUEST FAILED: ${request.url()} ${request.failure()?.errorText}`),
    );
    page.on("request", (request) => console.log(`REQ: ${request.url()}`));

    // Mock Auth
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
  });

  test("should display warehouse list and create a new warehouse", async ({ page }) => {
    // Mock List
    await page.route("**/masters/warehouses*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: [
            {
              id: 1,
              warehouse_code: "WH-001",
              warehouse_name: "Existing Warehouse",
              warehouse_type: "internal",
              updated_at: "2025-01-01T10:00:00Z",
            },
          ],
        });
      } else if (route.request().method() === "POST") {
        // Return created object
        const postData = route.request().postDataJSON();
        await route.fulfill({
          json: {
            id: 2,
            warehouse_code: postData.warehouse_code,
            warehouse_name: postData.warehouse_name,
            warehouse_type: postData.warehouse_type,
            updated_at: new Date().toISOString(),
          },
        });
      } else {
        await route.continue();
      }
    });

    // 1. Navigate to List
    await page.goto("/warehouses");
    await expect(page).toHaveURL("/warehouses");
    await expect(page.getByText("Existing Warehouse")).toBeVisible();

    // 2. Click Create
    // Need to find the create button.
    // PageHeader actions usually have a "New" or "Create" button.
    // MasterPageActions likely renders a button with "新規登録" or similar.
    // MasterPageActions props: onCreateClick={openCreate}
    // Let's assume text is "新規登録" or icon.
    // Actually MasterPageActions uses "新規登録" usually.
    await page.getByRole("button", { name: "新規登録" }).click();

    // 3. Fill Form
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("倉庫コード").fill("WH-NEW");
    await page.getByLabel("倉庫名").fill("New Warehouse");

    // Select type if it's a select
    // WarehouseForm likely has a select for type
    // Let's assume it's a combinobox or select.
    // Or radio?
    // If select:
    // await page.getByRole('combobox', { name: 'タイプ' }).click();
    // await page.getByRole('option', { name: '社内' }).click();

    // Let's check WarehouseForm content if fail. Assuming standard inputs for now.
    // If Type defaults to internal, we might skip.

    // 4. Submit
    await page.getByRole("button", { name: /登録|保存/ }).click();

    // 5. Verify success
    // Toast should appear?
    // List should update (refetch).
    // Since we mock GET again with same list, it won't show new item unless we update mock state?
    // But we can verify "POST" request happened via our route handler or `request` listener.
    // Or we can verify dialog closes.
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
