# 現在のタスク一覧

**最終更新:** 2025-12-07

> このドキュメントは**現在進行中および未着手のタスク**を管理します。
> 完了したタスクは `CHANGELOG.md` に記録され、このファイルから削除されます。

---

## 🎯 残タスク（今すぐ対応が必要）

### なし

現在、緊急対応が必要なタスクはありません。

---

## 🔜 近い将来対応予定

### ✅ P2-1: SAP在庫同期機能の完成（モック環境対応完了）

**ページ:** `/admin/batch-jobs` (実装完了)

**実装完了:**
- ✅ `InventorySyncService`: SAP在庫とローカルDB在庫の差異チェック（モック対応）
- ✅ `/api/batch-jobs/inventory-sync/execute`: 手動実行API
- ✅ `/api/batch-jobs/inventory-sync/alerts`: 差異アラート取得API
- ✅ `BatchJobsPage`: SAP在庫同期専用UI
  - ワンクリック実行ボタン
  - 差異アラート一覧表示（商品ID、ローカル/SAP在庫、差異率、最終チェック日時）
  - アクティブアラート/全履歴切り替え
- ✅ `BatchJobsPage`: 汎用バッチジョブ管理UI（ジョブ一覧・実行・削除）

**残タスク（本番SAP接続が必要）:**
- ❌ **本番SAP API接続**（現在はモック: `SAPMockClient`）
  - `backend/app/external/sap_mock_client.py` を実際のSAP APIクライアントに置き換え
- ❌ **定期実行設定**（オプション）
  - APScheduler または Celery Beat による自動スケジュール実行
  - 実行頻度設定UI

> **Note**: モック環境で実装可能な部分は全て完了。本番SAP環境が準備できたら残タスクに着手。


---

## 📌 将来対応（P3: 低優先度）

### 1. SAP受注登録の本番化

**現状:**
- ✅ SAP受注登録: モック実装済み
- ❌ 本番SAP API接続: 未実装

**関連TODO:**
- `backend/app/services/sap/sap_service.py:L61`

### 2. Bulk Import API（マスタ一括登録）

**現状:**
- ✅ UI実装済み
- ❌ Backend API未実装

**関連TODO:**
- `CustomerBulkImportDialog.tsx` (2件): bulk-upsert/template API
- `ProductBulkImportDialog.tsx` (2件): bulk-upsert/template API

### 3. 担当者ロック表示（排他制御）のバックエンド実装

**現状:**
- ✅ UI実装済み
- ❌ バックエンド未実装

### 4. 引当機能の拡張

**関連TODO:**
- `useAllocationMutations.ts` (2件)
  - 受注明細単位の一括取消API
  - 自動引当API (FEFO方式)

### 5. Forecast機能の実装

**現状:** スコープ外

**関連TODO:**
- `test_allocation_suggestions.py`: Forecast機能テスト（無効化中）
- `suggestion.py`: 削除範囲の最適化

---

## 🔧 技術的負債（リファクタリング候補）

### eslint-disable削減（39件）

**現状:** 全てに理由コメント追加済み  
**対応:** リファクタリングは将来対応

<details>
<summary>詳細を見る</summary>

#### `max-lines-per-function` (約25件)

| ファイル | 行数 | リファクタリング案 |
|----------|------|-------------------|
| `App.tsx` | ~200行 | ルート定義を別ファイルに分離 |
| `GlobalNavigation.tsx` | ~100行 | NavItemsを別コンポーネントに分離 |
| `LineBasedAllocationList.tsx` | ~200行 | 仮想スクロール/フィルタ/グルーピングを分離 |
| `PrimaryAssignmentsPage.tsx` | ~200行 | テーブル/サマリー/ダイアログを分離 |
| `OrderDetailPage.tsx` | ~160行 | AllocationDialogを別ファイルに分離 |
| `*BulkImportDialog.tsx` | ~250行 | プレビュー/結果表示を別コンポーネントに分離 |
| その他ダイアログ/フォーム | 各100-150行 | フォームフィールドを別コンポーネントに分離 |

#### `complexity` (約8件)

| ファイル | リファクタリング案 |
|----------|-------------------|
| `getOrderQuantity()` | 単位変換ロジックを別ユーティリティに分離 |
| `LotInfoSection.tsx` | 条件分岐をhelper関数に分離 |
| `AllocationInputSection.tsx` | 状態計算をカスタムフックに分離 |
| `parseXxxCsv()` | バリデーションを別関数に分離 |

#### `max-params` (1件)

| ファイル | リファクタリング案 |
|----------|-------------------|
| `filterHelpers.ts` | パラメータをオブジェクト（options）にまとめる |

</details>

---

## 📊 コード品質サマリー

| 種類 | 件数 | 状態 |
|------|------|------|
| **ESLint errors** | 0 | ✅ 完全クリーン |
| **TypeScript errors** | 0 | ✅ 完全クリーン |
| **Mypy errors** | 0 | ✅ 完全クリーン |
| eslint-disable | 39件 | ✅ 全てにコメント追加済み |
| @typescript-eslint/no-explicit-any | 1件 | ✅ 完了（external-modules.d.tsのみ） |
| type: ignore | 0件 | ✅ 完了 |
| noqa | 42件 | ✅ 意図的（Backend Ruff） |
| pragma: no cover | 5件 | ✅ テストカバレッジ除外（正常） |
| TODO | 9件 | 🟡 全てBackend待ち/将来対応 |

---

## 📝 完了済み（最近の履歴）

<details>
<summary>2025-12-07: コード品質改善・TODOコメント整理</summary>

- ✅ フィルタをID検索から名前検索に変更（SearchableSelect導入）
- ✅ ESLint: 0エラー/0ワーニング
- ✅ Mypy: 0エラー（types-PyYAML追加、型アノテーション修正）
- ✅ pre-commit設定改善（docformatter削除、ruff統一）
- ✅ no-explicit-any: 5件 → 1件（external-modules.d.tsのみ）
- ✅ system_router.py: ユーザー名をJoinで取得
- ✅ eslint-disable: 39件に理由コメント追加
- ✅ TODOコメント整理: Type定義から不要なTODO 4件削除、残り9件に優先度・詳細追加

</details>

<details>
<summary>2025-12: 認証・権限管理</summary>

- ✅ Login UI / Debug User Switcher
- ✅ Auth Context (Frontend) & `current_user` logic (Backend)
- ✅ Role-based Menu Display, AdminGuard
- ✅ 操作ログへのユーザー関連付け（AdjustmentForm, RPA）

</details>

<details>
<summary>2025-12: Hard Allocation機能</summary>

- ✅ `confirm_hard_allocation` 実装
- ✅ `confirm_hard_allocations_batch` バッチAPI
- ✅ Soft/Hard 分割表示（在庫一覧）

</details>

<details>
<summary>2025-12: テストデータ生成の改善</summary>

- ✅ 在庫量: フォーキャストの70-90%（制約発生）
- ✅ ロット: 60% 1ロット、30% 2ロット、10% 3ロット
- ✅ フォーキャスト種別: 50% 日別、30% 旬別、20% 月別
- ✅ 受注: 90%がフォーキャスト一致、10%のみ変動
- ✅ 全製品に最低1ロット確保（depleted含む）
- ✅ エッジケーステスト用データパターン追加

</details>

---

## 参照

- **変更履歴:** [`CHANGELOG.md`](../CHANGELOG.md)
- **完了機能:** [`docs/COMPLETED_FEATURES.adoc`](COMPLETED_FEATURES.adoc)
- **開発ガイド:** [`CLAUDE.md`](../CLAUDE.md)
