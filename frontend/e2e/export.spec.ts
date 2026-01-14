import { test, expect } from "@playwright/test";

const USE_REAL_API = process.env.E2E_REAL_API === "true";

test.describe("Export Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Basic Auth Mocks - Only when not using real API
    if (!USE_REAL_API) {
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
    }

    // Login
    await page.goto("/login");
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL("/");
  });

  test("should trigger download on Forecasts page", async ({ page }) => {
    // Mock the export endpoint
    if (!USE_REAL_API) {
      await page.route("**/api/forecasts/export/download*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          body: Buffer.from("fake excel"),
        });
      });
    }

    await page.goto("/forecasts");
    const downloadPromise = page.waitForEvent("download");
    // Find the button in the Actions area
    await page.getByRole("button", { name: "Excelエクスポート" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("forecasts");
  });

  test("should trigger download on Orders page", async ({ page }) => {
    if (!USE_REAL_API) {
      await page.route("**/api/orders/lines/export/download*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          body: Buffer.from("fake excel"),
        });
      });
    }

    await page.goto("/orders");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excelエクスポート" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("order_lines");
  });

  test("should trigger download on Inventory page", async ({ page }) => {
    if (!USE_REAL_API) {
      await page.route("**/api/lots/export/download*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          body: Buffer.from("fake excel"),
        });
      });
    }

    await page.goto("/inventory");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Excelエクスポート" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("lots");
  });

  test("should access Bulk Export page and trigger ZIP download", async ({ page }) => {
    // Mock targets
    if (!USE_REAL_API) {
      await page.route("**/api/bulk-export/targets*", async (route) => {
        await route.fulfill({
          json: [
            { key: "customers", name: "顧客マスタ", description: "desc" },
            { key: "products", name: "製品マスタ", description: "desc" },
            { key: "suppliers", name: "仕入先マスタ", description: "desc" },
            { key: "warehouses", name: "倉庫マスタ", description: "desc" },
            { key: "delivery_places", name: "納入先マスタ", description: "desc" },
            { key: "product_mappings", name: "得意先品番マッピング", description: "desc" },
            { key: "customer_items", name: "顧客別品番設定", description: "desc" },
            { key: "supplier_products", name: "仕入先商品関連", description: "desc" },
            { key: "uom_conversions", name: "単位換算マスタ", description: "desc" },
            { key: "warehouse_delivery_routes", name: "配送ルートマスタ", description: "desc" },
            { key: "customer_item_delivery_settings", name: "顧客別納入設定", description: "desc" },
            { key: "lots", name: "ロット一覧", description: "desc" },
            { key: "orders", name: "受注一覧", description: "desc" },
            { key: "forecasts", name: "フォーキャスト", description: "desc" },
            { key: "users", name: "ユーザー一覧", description: "desc" },
          ],
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
    }

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
