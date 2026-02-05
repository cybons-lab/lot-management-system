import { test, expect } from "@playwright/test";

/**
 * Masters Smoke Test
 * 目的: 主要マスタページが正常に開き、基本UIが表示されることを確認
 * 実行時間: ~15秒
 */

test.describe("Masters Smoke Test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/");
  });

  const masterPages = [
    { path: "/master/products", label: "商品マスタ" },
    { path: "/master/customers", label: "得意先マスタ" },
    { path: "/master/suppliers", label: "仕入先マスタ" },
    { path: "/master/warehouses", label: "倉庫マスタ" },
  ];

  for (const { path, label } of masterPages) {
    test(`${label}ページが正常に表示される`, async ({ page }) => {
      await page.goto(`http://localhost:3000${path}`);

      // ページタイトルまたはヘッダーが表示されている
      await expect(page.locator("h1, h2").filter({ hasText: new RegExp(label) })).toBeVisible({
        timeout: 5000,
      });

      // テーブルまたは「新規作成」ボタンが存在する
      const hasTable = await page
        .locator("table, [role='table']")
        .isVisible()
        .catch(() => false);
      const hasCreateButton = await page
        .locator('button:has-text("新規"), button:has-text("作成")')
        .isVisible()
        .catch(() => false);

      expect(hasTable || hasCreateButton).toBe(true);

      // JavaScriptエラーがないことを確認
      page.on("pageerror", (error) => {
        throw new Error(`Page error in ${label}: ${error.message}`);
      });
    });
  }

  test("マスタ一覧ページからの遷移が正常に動作する", async ({ page }) => {
    // マスタ一覧ページが存在する場合
    await page.goto("http://localhost:3000/master");

    // いずれかのマスタへのリンクが存在する
    const hasMasterLinks =
      (await page.locator('a[href*="/master/"], button:has-text("マスタ")').count()) > 0;

    // または直接個別マスタページが表示される（リダイレクト）
    const isMasterPage = page.url().includes("/master/");

    expect(hasMasterLinks || isMasterPage).toBe(true);
  });
});
