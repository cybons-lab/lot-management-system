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

### ✅ 2. Bulk Import API（完了済み）
- CHANGELOG.mdを参照

---

## 🔧 技術的負債（リファクタリング候補）

### 残り 3件 (eslint-disable)

以下のファイルに `eslint-disable` が残っていますが、分割すると可読性が低下するため維持しています。

#### `max-lines-per-function` (2件)
- `frontend/src/features/orders/hooks/useOrderLineAllocation.ts` - 複合フックのため分割困難
- `frontend/src/features/forecasts/components/ForecastDetailCard/useLotCandidateRow.ts` - 83行で3行超過

#### `complexity` (1件)
- `frontend/src/components/ui/form/SearchableSelect.tsx` - 複雑性13で1つ超過、サブコンポーネント分離済み

### ✅ リファクタリング完了 (2025-12-07)
以下のファイルは eslint-disable を削除し、サブコンポーネント/ヘルパー関数を抽出してリファクタリング完了：
- `frontend/src/factories/order-factory.ts` - ヘルパー関数 `resolveDeliveryDate`, `resolveExtraFields` 抽出
- `frontend/src/features/forecasts/components/ForecastDetailCard/PlanningAllocationPanel.tsx` - `LotBreakdownSection`, `PeriodSection` 分離
- `frontend/src/features/client-logs/pages/ClientLogsPage.tsx` - `LogsTable`, `getLevelBadgeVariant` 分離
- `frontend/src/components/common/SAPRegistrationDialog.tsx` - `LineItem` コンポーネント分離
- `frontend/src/components/ui/form/SearchableSelect.tsx` - `ClearButton`, `SearchInput` 分離（max-lines-per-function解消）

### 🐛 既知の不具合 (Known Issues)

#### Backend Test Failures (40 errors)
`backend/tests/api/test_order_allocation_refactor.py` などで既存のテストエラーが発生しています。
これらは今回のBulk Importリファクタリングとは関連しないレガシーな問題ですが、将来的に解消が必要です。
- `TestOrderAPI`: create/duplicate/cancel 関連のエラー
- `TestAllocationPreviewStatus`: ステータス遷移テストのエラー

### ✅ 解消済み (Refactoring Complete)
- （CHANGELOG.md へ移動済み）

---

## 📊 コード品質サマリー

| 種類 | 件数 | 状態 |
|------|------|------|
| **ESLint Errors** | 0 | ✅ Clean |
| **TS Errors** | 0 | ✅ Clean |
| **Mypy Errors** | 0 | ✅ Clean |
| **eslint-disable** | 3 | ✅ 最小限（分割困難なケースのみ） |
| **TODO** | 5 | 🟡 Backend待ち/将来対応 |

---

## 参照

- **変更履歴:** [`CHANGELOG.md`](../CHANGELOG.md)
- **完了機能:** [`docs/COMPLETED_FEATURES.adoc`](COMPLETED_FEATURES.adoc)
- **開発ガイド:** [`CLAUDE.md`](../CLAUDE.md)
