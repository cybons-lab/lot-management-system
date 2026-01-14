import { test, expect } from "@playwright/test";

test.describe("Export Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Basic Auth Mocks
    await page.route("**/auth/login-users", async (route) => {
      await route.fulfill({ json: [{ id: 1, username: "admin", display_name: "Admin User" }] });
    });
    await page.route("**/auth/login", async (route) => {
      await route.fulfill({
        json: {
          access_token: "fake",
          user: {
            id: 1,
            username: "admin",
            roles: ["admin"],
            display_name: "Admin User",
          },
        },
      });
    });
    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        json: {
          id: 1,
          username: "admin",
          roles: ["admin"],
          display_name: "Admin User",
        },
      });
    });

    // Login
    await page.goto("/login");
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL("/");
  });

  test("should trigger download on Forecasts page", async ({ page }) => {
    // Mock the export endpoint
    await page.route("**/api/forecasts/export/download*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: Buffer.from("fake excel"),
      });
    });

    await page.goto("/forecasts");
    const downloadPromise = page.waitForEvent("download");
    // Find the button in the Actions area
    await page.getByRole("button", { name: "Excelエクスポート" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("forecasts");
  });

  test("should trigger download on Orders page", async ({ page }) => {
    await page.route("**/api/orders/lines/export/download*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: Buffer.from("fake excel"),
      });
    });

    await page.goto("/orders");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excelエクスポート" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("order_lines");
  });

  test("should trigger download on Inventory page", async ({ page }) => {
    await page.route("**/api/lots/export/download*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: Buffer.from("fake excel"),
      });
    });

    await page.goto("/inventory");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excelエクスポート" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("lots");
  });

  test("should access Bulk Export page and trigger ZIP download", async ({ page }) => {
    // Mock targets
    await page.route("**/api/bulk-export/targets*", async (route) => {
      await route.fulfill({
        json: [{ key: "customers", name: "顧客マスタ", description: "desc" }],
      });
    });
    // Mock bulk download
    await page.route("**/api/bulk-export/download*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/zip",
        body: Buffer.from("fake zip"),
      });
    });

    // Check menu link exists and works
    const exportMenu = page.getByRole("link", { name: "エクスポート" });
    await expect(exportMenu).toBeVisible();
    await exportMenu.click();
    await expect(page).toHaveURL("/admin/export");

    // Select target
    await page.getByLabel("すべて選択").click();

    // Download
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "ZIPダウンロード" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("bulk_export");
  });
});
