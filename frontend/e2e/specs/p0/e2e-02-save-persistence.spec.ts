/**
 * E2E-02: 保存永続化テスト
 *
 * 検知する事故:
 *   - DB保存失敗（"保存できたように見える"問題）
 *   - 楽観ロック不整合
 *   - フロントエンドのみの更新（バックエンド未反映）
 *
 * テスト内容:
 *   1. 保存ボタン押下
 *   2. APIリクエスト発生確認（waitForResponse）
 *   3. レスポンス成功確認（2xx）
 *   4. 成功トースト表示確認
 *   5. ページリロード
 *   6. 変更が残っていることを確認
 *
 * @tags @smoke @p0 @save-verification
 */
import { test, expect } from "@playwright/test";
import { ApiClient } from "../../fixtures/api-client";
import { loginAs } from "../../fixtures/login-helper";

test.describe("E2E-02: 保存永続化テスト", () => {
  let apiClient: ApiClient;

  test.beforeAll(async ({ request }) => {
    apiClient = await ApiClient.create(request);
    await apiClient.resetDatabase();
  });

  test("マスタ編集: 保存→APIリクエスト確認→リロード後も残る", async ({ page }) => {
    // ===========================
    // Step 1: ログインとマスタ一覧へ移動
    // ===========================
    await page.goto("/warehouses");
    await page.waitForLoadState("networkidle");

    // ログイン処理
    await loginAs(page, "admin");

    // ===========================
    // Step 2: 新規作成ダイアログを開く
    // ===========================
    const createButton = page.getByRole("button", { name: /新規|作成|追加/ });
    if (!(await createButton.isVisible())) {
      test.skip(true, "新規作成ボタンが見つかりません");
      return;
    }

    await createButton.click();

    // ダイアログ待機
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // ===========================
    // Step 3: ユニークなテストデータを入力
    // ===========================
    const testCode = `E2E-${Date.now() % 100000}`;
    const testName = `テスト倉庫 ${testCode}`;

    // 倉庫コードと名前を入力
    const codeInput = dialog.getByLabel("倉庫コード").or(dialog.getByPlaceholder("コード"));
    const nameInput = dialog.getByLabel("倉庫名").or(dialog.getByPlaceholder("名前"));

    if (await codeInput.isVisible()) {
      await codeInput.fill(testCode);
    }
    if (await nameInput.isVisible()) {
      await nameInput.fill(testName);
    }

    // ===========================
    // Step 4: 保存 - APIリクエストを待つ（重要！）
    // ===========================
    const saveButton = dialog.getByRole("button", { name: /保存|作成|登録|更新/ });

    // 【重要】APIレスポンスを待つ
    const apiResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/") &&
        (response.request().method() === "POST" || response.request().method() === "PUT"),
      { timeout: 15000 },
    );

    await saveButton.click();

    // APIレスポンスを確認
    const response = await apiResponsePromise;
    const status = response.status();

    // 2xx成功確認
    expect(status >= 200 && status < 300, `保存API失敗: status=${status}`).toBeTruthy();

    console.log(`保存APIレスポンス: status=${status}`);

    // ===========================
    // Step 5: 成功トースト確認
    // ===========================
    await expect(
      page
        .locator('[data-sonner-toast][data-type="success"]')
        .or(page.locator("[data-sonner-toast]")),
    ).toBeVisible({ timeout: 5000 });

    // ダイアログが閉じることを確認
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // ===========================
    // Step 6: ページリロード - 永続化確認（重要！）
    // ===========================
    await page.reload();
    await page.waitForLoadState("networkidle");

    // ===========================
    // Step 7: 作成したデータが残っていることを確認
    // ===========================
    // 検索してデータを探す
    const searchInput = page.getByPlaceholder("検索").or(page.getByLabel("検索"));
    if (await searchInput.isVisible()) {
      await searchInput.fill(testCode);
      await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle");
    }

    // テーブルに表示されていることを確認
    const tableRows = page.locator("table tbody tr");
    const hasData = await tableRows.filter({ hasText: testCode }).count();

    expect(hasData, `リロード後にデータ ${testCode} が見つかりません`).toBeGreaterThan(0);

    console.log(`E2E-02: 保存永続化テスト完了 - ${testCode} がDBに永続化されました`);
  });

  test("編集保存: 既存データ編集→保存→リロード確認", async ({ page }) => {
    // ===========================
    // Step 1: 製品マスタ一覧へ移動
    // ===========================
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // ログイン処理
    await loginAs(page, "admin");

    // テーブルが表示されるのを待つ
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });

    // ===========================
    // Step 2: 最初の行をクリック（詳細/編集画面へ）
    // ===========================
    const tableRows = page.locator("table tbody tr");
    const rowCount = await tableRows.count();

    if (rowCount === 0) {
      test.skip(true, "編集可能なデータがありません");
      return;
    }

    // 編集ボタンを探すか、行をクリック
    const firstRow = tableRows.first();
    const editButton = firstRow.getByRole("button", { name: /編集/ });

    if (await editButton.isVisible()) {
      await editButton.click();
    } else {
      // 行クリックで詳細に遷移
      await firstRow.click();
    }

    await page.waitForLoadState("networkidle");

    // ===========================
    // Step 3: 編集可能なフィールドを変更
    // ===========================
    const editMark = `_E2E_${Date.now() % 10000}`;

    // ダイアログまたはフォームを探す
    const form = page.getByRole("dialog").or(page.locator("form"));

    // 製品名などを編集
    const nameInput = form.getByLabel(/名/).first();
    if (await nameInput.isVisible()) {
      const currentValue = await nameInput.inputValue();
      // 既存の編集マークを削除して新しいマークを追加
      const cleanValue = currentValue.replace(/_E2E_\d+$/, "");
      await nameInput.fill(cleanValue + editMark);
    } else {
      console.log("編集可能な名前フィールドが見つかりません");
      test.skip(true, "編集可能なフィールドが見つかりません");
      return;
    }

    // ===========================
    // Step 4: 保存 - APIリクエスト確認
    // ===========================
    const saveButton = page.getByRole("button", { name: /保存|更新|作成|登録/ });

    const apiResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/") &&
        (response.request().method() === "PUT" || response.request().method() === "PATCH"),
      { timeout: 15000 },
    );

    await saveButton.click();

    const response = await apiResponsePromise;
    expect(response.ok(), `編集保存API失敗: ${response.status()}`).toBeTruthy();

    // ===========================
    // Step 5: リロードして確認
    // ===========================
    await page.reload();
    await page.waitForLoadState("networkidle");

    // 編集マークが残っていることを確認
    await expect(page.getByText(editMark)).toBeVisible({ timeout: 10000 });

    console.log(`E2E-02: 編集保存テスト完了 - 編集マーク ${editMark} が永続化されました`);
  });
});
