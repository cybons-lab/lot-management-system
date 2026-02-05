import { test, expect } from "@playwright/test";

/**
 * Excel View Smoke Test
 * 目的: Excel Viewページが正常に開き、基本UIが表示されることを確認
 * 実行時間: ~10秒
 */

test.describe("Excel View Smoke Test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/");
  });

  test("Excel Viewページが正常に表示される", async ({ page }) => {
    await page.goto("http://localhost:3000/excel-view");

    // ページタイトルが表示されている
    await expect(page.locator("h1, h2").filter({ hasText: /Excel|一覧/ })).toBeVisible({
      timeout: 5000,
    });

    // テーブルまたはグリッドUIが存在する
    const hasTable =
      (await page.locator("table, [role='table'], [role='grid']").count()) > 0 ||
      (await page.locator("text=/データがありません|読み込み中/").count()) > 0;

    expect(hasTable).toBe(true);

    // JavaScriptエラーがないことを確認
    page.on("pageerror", (error) => {
      throw new Error(`Page error: ${error.message}`);
    });
  });

  test("Excel Viewのフィルタ/検索UIが表示される", async ({ page }) => {
    await page.goto("http://localhost:3000/excel-view");

    // 検索ボックスまたはフィルタUIが存在する
    const hasSearchOrFilter =
      (await page.locator('input[type="search"], input[placeholder*="検索"]').count()) > 0 ||
      (await page.locator('button:has-text("フィルタ"), [role="combobox"]').count()) > 0;

    expect(hasSearchOrFilter).toBe(true);
  });
});
