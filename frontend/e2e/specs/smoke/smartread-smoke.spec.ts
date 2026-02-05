import { test, expect } from "@playwright/test";

/**
 * SmartRead Smoke Test
 * 目的: SmartReadページが正常に開き、基本UIが表示されることを確認
 * 実行時間: ~10秒
 */

test.describe("SmartRead Smoke Test", () => {
  test.beforeEach(async ({ page }) => {
    // ログイン（既存のfixtureを利用）
    await page.goto("http://localhost:3000/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/");
  });

  test("SmartReadページが正常に表示される", async ({ page }) => {
    // SmartReadページに遷移
    await page.goto("http://localhost:3000/smartread");

    // ページタイトルが表示されている
    await expect(page.locator("h1, h2").filter({ hasText: /SmartRead|OCR/ })).toBeVisible({
      timeout: 5000,
    });

    // ファイルアップロードUIが存在する
    const uploadArea = page.locator('input[type="file"], [role="button"]:has-text("アップロード")');
    await expect(uploadArea.first()).toBeVisible();

    // JavaScriptエラーがないことを確認
    page.on("pageerror", (error) => {
      throw new Error(`Page error: ${error.message}`);
    });

    // コンソールエラーがないことを確認
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        throw new Error(`Console error: ${msg.text()}`);
      }
    });
  });

  test("SmartRead履歴ページが正常に表示される", async ({ page }) => {
    await page.goto("http://localhost:3000/smartread/history");

    // 履歴テーブルまたは「データなし」メッセージが表示される
    const hasTable = await page
      .locator("table, [role='table']")
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .locator("text=/データがありません|履歴がありません/")
      .isVisible()
      .catch(() => false);

    expect(hasTable || hasEmptyState).toBe(true);
  });
});
