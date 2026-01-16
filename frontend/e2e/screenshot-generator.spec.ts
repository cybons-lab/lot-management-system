import { test, expect } from "@playwright/test";

const ROUTES = [
  { name: "dashboard", path: "/dashboard" },
  { name: "forecasts", path: "/forecasts" },
  { name: "inbound-plans", path: "/inbound-plans" },
  { name: "inventory", path: "/inventory" },
  { name: "orders", path: "/orders" },
  { name: "rpa", path: "/rpa" },
  { name: "admin", path: "/admin" },
  { name: "masters", path: "/masters" },
  { name: "warehouses", path: "/warehouses" },
  { name: "suppliers", path: "/suppliers" },
  { name: "customers", path: "/customers" },
  { name: "products", path: "/products" },
  { name: "customer-items", path: "/customer-items" },
  { name: "help-flow-map", path: "/help/flow-map" },
];

test.describe("UI Audit Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    // Auth mocks
    await page.route("**/auth/login-users", async (route) => {
      await route.fulfill({
        json: [{ id: 1, username: "admin", display_name: "Admin User" }],
      });
    });

    await page.route("**/auth/login", async (route) => {
      await route.fulfill({
        json: {
          access_token: "fake-token",
          user: {
            id: 1,
            username: "admin",
            display_name: "Admin User",
            roles: ["admin"],
          },
        },
      });
    });

    await page.route("**/auth/me", async (route) => {
      await route.fulfill({
        json: {
          id: 1,
          username: "admin",
          display_name: "Admin User",
          roles: ["admin"],
        },
      });
    });

    // API Mocks to prevent empty screens or errors
    await page.route("**/api/v1/**", async (route) => {
      await route.fulfill({ json: [] });
    });

    // Login
    await page.goto("/login");
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "ログイン" }).click();
    await expect(page).toHaveURL("/");
  });

  for (const route of ROUTES) {
    test(`screenshot for ${route.name}`, async ({ page }) => {
      // Dashboard path is "/" in constants
      const targetPath = route.name === "dashboard" ? "/" : route.path;
      await page.goto(targetPath);
      // Wait for network idle to ensure everything is loaded
      await page.waitForLoadState("networkidle");
      // Subtle wait for animations
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `screenshots/ui-audit/${route.name}.png`,
        fullPage: true,
      });
    });
  }

  test("screenshot for global navigation dropdowns", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // "ログ" dropdown - using text selector as it's more reliable for the button content
    const logsButton = page.locator("nav button").filter({ hasText: "ログ" });
    await logsButton.click({ force: true });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "screenshots/ui-audit/nav-logs-dropdown.png" });

    // "ヘルプ" dropdown
    const helpButton = page.locator("nav button").filter({ hasText: "ヘルプ" });
    await helpButton.click({ force: true });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "screenshots/ui-audit/nav-help-dropdown.png" });
  });

  test("screenshot for inventory detail popup", async ({ page }) => {
    // Mock inventory data to have at least one row
    await page.route("**/api/v1/inventory/**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          json: [
            {
              product_code: "TEST-PROD",
              product_name: "Test Product",
              warehouse_code: "W1",
              warehouse_name: "Warehouse 1",
              total_quantity: 100,
              available_quantity: 80,
            },
          ],
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    // Check if there is a row and click it if possible
    // (Assuming clicking a row or a specific button opens a dialog)
    // Here we just try to capture the initial state of the page
    await page.screenshot({ path: "screenshots/ui-audit/inventory-list.png", fullPage: true });
  });
});
