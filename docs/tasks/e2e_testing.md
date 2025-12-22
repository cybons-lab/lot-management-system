# E2Eテスト導入

## 概要

フロントエンドのE2E（End-to-End）テストを導入し、重要な操作フローの品質を担保する。

## 現状

- Playwright設定は存在（`package.json` に設定あり）
- E2Eテストファイルは未作成

## 対象フロー（優先度順）

### P1: ビジネスクリティカル

1. **ログイン → ダッシュボード表示**
   - 認証フロー全体の動作確認

2. **ロット引当フロー**
   - 受注一覧 → 明細選択 → ロット候補表示 → 引当実行 → 確定

3. **RPA素材納品書フロー**
   - CSV取込 → Step2確認 → Step3編集 → Step4完了

### P2: マスタ管理

4. **倉庫CRUD**
   - 一覧表示 → 新規作成 → 編集 → 削除

5. **商品マスタCRUD**
   - 同上

### P3: レポート・監査

6. **在庫一覧・フィルタリング**
7. **操作ログ表示**

## 実装方針

```bash
# Playwright インストール済みの場合
npx playwright test

# 新規テストファイル格納先
frontend/e2e/
├── auth.spec.ts
├── allocation.spec.ts
├── rpa-material-delivery.spec.ts
├── warehouses.spec.ts
└── ...
```

## 参考リソース

- [Playwright Documentation](https://playwright.dev/)
- 既存の `frontend/playwright.config.ts`（設定確認）

## 備考

- 中期タスク（1ヶ月目安）
- バックエンドのAPIモック or テスト用DBシードが必要
