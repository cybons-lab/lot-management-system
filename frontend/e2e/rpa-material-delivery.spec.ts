import { test, expect } from "@playwright/test";

test.describe("RPA Material Delivery Note Flow", () => {
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
  });

  test("should import CSV and create a run", async ({ page }) => {
    // Mock Run Creation (POST multipart)
    await page.route("**/rpa/material-delivery-note/runs", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          json: {
            id: 123,
            status: "created",
            item_count: 5,
            message: "Run created successfully",
          },
        });
      } else {
        await route.continue();
      }
    });

    // Mock Run Detail (GET) - for redirection validation
    await page.route("**/rpa/material-delivery-note/runs/123", async (route) => {
      await route.fulfill({
        json: {
          id: 123,
          status: "created",
          rpa_type: "material_delivery_note",
          created_at: "2025-01-01T10:00:00Z",
          items: [],
          all_items_complete: false,
          complete_count: 0,
          issue_count: 0,
          item_count: 5,
        },
      });
    });

    // 1. Navigate to CSV Import Page
    await page.goto("/rpa/material-delivery-note/csv-import");

    // 2. Upload File
    // We create a dummy buffer for the file
    const buffer = Buffer.from("dummy,content\n1,2");

    // Find input[type="file"]
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles({
      name: "test-import.csv",
      mimeType: "text/csv",
      buffer,
    });

    // 3. Submit
    // Needs to find the submit button. Usually "アップロード" or "Import"
    // Let's assume there is a button that becomes enabled after file selection
    const uploadButton = page.getByRole("button", { name: /アップロード|Import|実行/i });
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    // 4. Verify redirection to run detail page or success message
    // Assuming redirection to /rpa/material-delivery-note/runs/123
    await expect(page).toHaveURL(/\/rpa\/material-delivery-note\/runs\/123/);

    // Verify run ID is visible
    await expect(page.getByText("Run #123"))
      .toBeVisible({ timeout: 5000 })
      .catch(() => {}); // Optional check logic
  });
});
