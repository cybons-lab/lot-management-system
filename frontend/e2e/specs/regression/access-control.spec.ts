import { expect, test } from "@playwright/test";

test.describe("Access Control & Visibility Regression", () => {
  test.beforeEach(async ({ page }) => {
    // Set a dummy token to trigger auth/me fetch in AuthContext
    await page.addInitScript(() => {
      window.localStorage.setItem("auth_token", "dummy-token");
    });
  });

  test("User with no roles can access Supplier Assignments if visibility is ON for guest", async ({
    page,
  }) => {
    // 1. Mock system settings: ON for guest
    await page.route("**/api/system/public-settings", async (route) => {
      await route.fulfill({
        json: {
          maintenance_mode: false,
          page_visibility: {
            masters: { user: true, guest: true },
            "masters:supplier-assignments": { user: true, guest: true },
          },
        },
      });
    });

    // 2. Mock auth/me response
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        json: {
          id: 999,
          username: "guest_user",
          display_name: "Guest User",
          roles: [],
          assignments: [],
        },
      });
    });

    // 3. Mock assignments API - catch ALL assignments requests
    await page.route(
      (url) => url.pathname.includes("assignments"),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      },
    );

    // 4. Visit the target page
    await page.goto("/masters/supplier-assignments");

    // 5. Wait for loading to finish
    await expect(page.getByText("読み込み中...")).not.toBeVisible({ timeout: 10000 });

    // 6. Final check for the heading
    await expect(page.getByRole("heading", { name: "仕入先担当管理" })).toBeVisible({
      timeout: 5000,
    });
  });

  test("User with no roles is REDIRECTED from Supplier Assignments if visibility is OFF for guest", async ({
    page,
  }) => {
    await page.route("**/api/system/public-settings", async (route) => {
      await route.fulfill({
        json: {
          maintenance_mode: false,
          page_visibility: {
            masters: { user: true, guest: true },
            "masters:supplier-assignments": { user: true, guest: false },
          },
        },
      });
    });

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        json: {
          id: 999,
          username: "guest_user",
          display_name: "Guest User",
          roles: [],
          assignments: [],
        },
      });
    });

    await page.goto("/masters/supplier-assignments");
    await page.waitForURL("**/dashboard");
  });
});
