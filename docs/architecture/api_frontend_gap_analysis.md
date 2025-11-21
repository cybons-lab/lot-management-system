# バックエンドAPI vs フロントエンド対応状況分析

作成日: 2025-11-21

## 概要

FastAPIバックエンドのAPIエンドポイントと、React/TypeScriptフロントエンドの画面・機能の対応状況を分析した結果です。

---

## 完全一覧表

| Domain | Endpoint | Purpose | Frontend | Notes |
|--------|----------|---------|----------|-------|
| **Masters - Warehouses** |||||
| Warehouses | `GET /warehouses` | 一覧 | Implemented | `features/warehouses` |
| Warehouses | `GET /warehouses/{code}` | 詳細 | Missing | 詳細画面なし |
| Warehouses | `POST /warehouses` | 登録 | Missing | |
| Warehouses | `PUT /warehouses/{code}` | 更新 | Missing | |
| Warehouses | `DELETE /warehouses/{code}` | 削除 | Missing | |
| **Masters - Products** |||||
| Products | `GET /products` | 一覧 | Implemented | `features/products` |
| Products | `GET /products/{code}` | 詳細 | Missing | |
| Products | `POST /products` | 登録 | Missing | |
| Products | `PUT /products/{code}` | 更新 | Missing | |
| Products | `DELETE /products/{code}` | 削除 | Missing | |
| **Masters - Suppliers** |||||
| Suppliers | `GET /suppliers` | 一覧 | Implemented | `features/suppliers` |
| Suppliers | `GET /suppliers/{code}` | 詳細 | Missing | |
| Suppliers | `POST /suppliers` | 登録 | Missing | |
| Suppliers | `PUT /suppliers/{code}` | 更新 | Missing | |
| Suppliers | `DELETE /suppliers/{code}` | 削除 | Missing | |
| **Masters - Customers** |||||
| Customers | `GET /customers` | 一覧 | Missing | スケルトンページのみ |
| Customers | `GET /customers/{code}` | 詳細 | Missing | |
| Customers | `POST /customers` | 登録 | Missing | |
| Customers | `PUT /customers/{code}` | 更新 | Missing | |
| Customers | `DELETE /customers/{code}` | 削除 | Missing | |
| **Masters - Customer Items** |||||
| Customer Items | `GET /customer-items` | 一覧 | Implemented | `features/customer-items` |
| Customer Items | `GET /customer-items/{id}` | 顧客別 | Implemented | |
| Customer Items | `POST /customer-items` | 登録 | Implemented | |
| Customer Items | `PUT /customer-items/{id}/{code}` | 更新 | Implemented | |
| Customer Items | `DELETE /customer-items/{id}/{code}` | 削除 | Implemented | |
| **Orders** |||||
| Orders | `GET /orders` | 一覧 | Implemented | `features/orders` |
| Orders | `GET /orders/{id}` | 詳細 | Implemented | |
| Orders | `POST /orders` | 登録 | Implemented | |
| Orders | `DELETE /orders/{id}/cancel` | キャンセル | Implemented | |
| Orders | `POST /orders/{line_id}/allocations` | 手動引当 | Partial | stub実装 |
| Orders | `POST /orders/validate` | 在庫検証 | Missing | ルータ無効 |
| **Allocations** |||||
| Allocations | `POST /allocations/commit` | 引当確定 | Implemented | `features/allocations` |
| Allocations | `DELETE /allocations/{id}` | 引当取消 | Implemented | |
| Allocations | `GET /allocation-candidates` | 候補取得 | Implemented | |
| Allocations | `GET /allocation-suggestions` | 提案一覧 | Implemented | |
| Allocations | `GET /allocation-suggestions/{id}` | 提案詳細 | Implemented | |
| Allocations | `POST /allocation-suggestions/generate` | 提案生成 | Missing | |
| Allocations | `POST /allocation-suggestions/manual` | 手動引当 | Implemented | |
| Allocations | `POST /allocation-suggestions/fefo` | FEFO引当 | Implemented | |
| Allocations | `DELETE /allocation-suggestions/{id}` | 提案削除 | Missing | |
| **Inventory - Lots** |||||
| Lots | `GET /lots` | 一覧 | Implemented | `features/inventory` |
| Lots | `GET /lots/{id}` | 詳細 | Implemented | |
| Lots | `POST /lots` | 登録 | Implemented | |
| Lots | `PUT /lots/{id}` | 更新 | Implemented | |
| Lots | `DELETE /lots/{id}` | 削除 | Implemented | |
| Lots | `GET /lots/{id}/movements` | 移動履歴 | Implemented | |
| Lots | `POST /lots/movements` | 移動登録 | Implemented | |
| **Inventory - Items** |||||
| Inventory | `GET /inventory-items` | サマリ一覧 | Implemented | |
| Inventory | `GET /inventory-items/{pid}/{wid}` | サマリ詳細 | Implemented | |
| **Inventory - Adjustments** |||||
| Adjustments | `GET /adjustments` | 一覧 | Implemented | `features/adjustments` |
| Adjustments | `GET /adjustments/{id}` | 詳細 | Implemented | |
| Adjustments | `POST /adjustments` | 登録 | Implemented | |
| **Inventory - Inbound Plans** |||||
| Inbound | `GET /inbound-plans` | 一覧 | Implemented | `features/inbound-plans` |
| Inbound | `GET /inbound-plans/{id}` | 詳細 | Implemented | |
| Inbound | `POST /inbound-plans` | 登録 | Implemented | |
| Inbound | `PUT /inbound-plans/{id}` | 更新 | Implemented | |
| Inbound | `DELETE /inbound-plans/{id}` | 削除 | Implemented | |
| Inbound | `GET /inbound-plans/{id}/lines` | 明細一覧 | Implemented | |
| Inbound | `POST /inbound-plans/{id}/lines` | 明細追加 | Implemented | |
| Inbound | `POST /inbound-plans/{id}/receive` | 入荷処理 | Implemented | |
| **Forecasts** |||||
| Forecasts | `GET /forecasts` | 一覧 | Implemented | `features/forecasts` |
| Forecasts | `GET /forecasts/{id}` | 詳細 | Implemented | |
| Forecasts | `POST /forecasts` | 登録 | Implemented | |
| Forecasts | `PUT /forecasts/{id}` | 更新 | Implemented | |
| Forecasts | `DELETE /forecasts/{id}` | 削除 | Implemented | |
| Forecasts | `GET /forecasts/history` | 履歴 | Implemented | |
| Forecasts | `POST /forecasts/bulk-import` | 一括取込 | Implemented | |
| **Admin - Users** |||||
| Users | `GET /users` | 一覧 | Implemented | `features/users` |
| Users | `GET /users/{id}` | 詳細 | Implemented | |
| Users | `POST /users` | 登録 | Implemented | |
| Users | `PUT /users/{id}` | 更新 | Implemented | |
| Users | `DELETE /users/{id}` | 削除 | Implemented | |
| Users | `PATCH /users/{id}/roles` | ロール割当 | Implemented | |
| **Admin - Roles** |||||
| Roles | `GET /roles` | 一覧 | Implemented | `features/roles` |
| Roles | `GET /roles/{id}` | 詳細 | Implemented | |
| Roles | `POST /roles` | 登録 | Implemented | |
| Roles | `PUT /roles/{id}` | 更新 | Implemented | |
| Roles | `DELETE /roles/{id}` | 削除 | Implemented | |
| **Admin - Operation Logs** |||||
| Logs | `GET /operation-logs` | 一覧 | Implemented | `features/operation-logs` |
| Logs | `GET /operation-logs/{id}` | 詳細 | Implemented | |
| Logs | `GET /master-change-logs` | 変更履歴 | Missing | |
| Logs | `GET /master-change-logs/{id}` | 変更詳細 | Missing | |
| Logs | `GET /master-change-logs/record/{t}/{id}` | レコード別 | Missing | |
| **Admin - Business Rules** |||||
| Rules | `GET /business-rules` | 一覧 | Implemented | `features/business-rules` |
| Rules | `GET /business-rules/{id}` | 詳細 | Implemented | |
| Rules | `GET /business-rules/code/{code}` | コード検索 | Implemented | |
| Rules | `POST /business-rules` | 登録 | Implemented | |
| Rules | `PUT /business-rules/{id}` | 更新 | Implemented | |
| Rules | `PUT /business-rules/code/{code}` | コード更新 | Implemented | |
| Rules | `DELETE /business-rules/{id}` | 削除 | Implemented | |
| Rules | `PATCH /business-rules/{id}/toggle` | 有効/無効切替 | Implemented | |
| **Admin - Batch Jobs** |||||
| Batch | `GET /batch-jobs` | 一覧 | Implemented | `features/batch-jobs` |
| Batch | `GET /batch-jobs/{id}` | 詳細 | Implemented | |
| Batch | `POST /batch-jobs` | 登録 | Implemented | |
| Batch | `POST /batch-jobs/{id}/execute` | 実行 | Implemented | |
| Batch | `POST /batch-jobs/{id}/cancel` | キャンセル | Implemented | |
| Batch | `DELETE /batch-jobs/{id}` | 削除 | Implemented | |
| **Admin - System** |||||
| Admin | `GET /admin/stats` | ダッシュボード統計 | Missing | Dashboardは未実装 |
| Admin | `POST /admin/reset-database` | DBリセット | Missing | 開発用 |
| Admin | `POST /admin/seeds` | シードデータ | Missing | 開発用 |
| Admin | `GET /admin/diagnostics/*` | 診断 | Missing | |
| Admin | `GET /admin/healthcheck/*` | ヘルスチェック | Missing | |
| Admin | `POST /admin/simulate-seed-data` | シミュレーション | Missing | |
| Admin | `GET /admin/simulate-progress/{id}` | 進捗取得 | Missing | |
| Admin | `GET /admin/simulate-result/{id}` | 結果取得 | Missing | |
| Admin | `GET /admin/seed-snapshots` | スナップショット一覧 | Missing | |
| Admin | `POST /admin/seed-snapshots` | スナップショット作成 | Missing | |
| Admin | `DELETE /admin/seed-snapshots/{id}` | スナップショット削除 | Missing | |
| Admin | `POST /admin/seed-snapshots/{id}/restore` | 復元 | Missing | |
| Health | `GET /healthz`, `/readyz`, `/health` | ヘルスチェック | Missing | インフラ用 |

---

## Missing サマリ表

### マスタ系 (CRUD未実装)

| Domain | Missing Endpoints | 優先度 | 備考 |
|--------|------------------|--------|------|
| **Customers** | 全5エンドポイント (一覧/詳細/登録/更新/削除) | 高 | スケルトンページあり、API未連携 |
| **Warehouses** | 4 (詳細/登録/更新/削除) | 中 | 一覧のみ実装済 |
| **Products** | 4 (詳細/登録/更新/削除) | 中 | 一覧のみ実装済 |
| **Suppliers** | 4 (詳細/登録/更新/削除) | 中 | 一覧のみ実装済 |

### 業務処理系

| Domain | Missing Endpoints | 優先度 | 備考 |
|--------|------------------|--------|------|
| **Allocations** | `POST /allocation-suggestions/generate`, `DELETE /allocation-suggestions/{id}` | 中 | 提案自動生成機能 |
| **Operation Logs** | `GET /master-change-logs/*` (3エンドポイント) | 低 | マスタ変更履歴表示 |
| **Admin/Dashboard** | `GET /admin/stats` | 中 | ダッシュボード統計表示 |
| **Admin/Simulation** | シミュレーション関連 (6エンドポイント) | 低 | 開発/テスト用機能 |
| **Admin/Snapshot** | スナップショット関連 (4エンドポイント) | 低 | 開発/テスト用機能 |
| **Health** | `/healthz`, `/readyz`, `/health` | - | インフラ監視用（フロント不要） |

---

## 統計

| カテゴリ | 総エンドポイント数 | Implemented | Partial | Missing |
|---------|-------------------|-------------|---------|---------|
| Masters | 25 | 8 | 0 | 17 |
| Orders | 6 | 4 | 1 | 1 |
| Allocations | 13 | 9 | 0 | 4 |
| Inventory | 18 | 18 | 0 | 0 |
| Forecasts | 7 | 7 | 0 | 0 |
| Admin | 46 | 27 | 0 | 19 |
| **合計** | **115** | **73 (63%)** | **1 (1%)** | **41 (36%)** |

---

## 実装推奨順序

### Phase 1: マスタCRUD完成 (高優先度)

1. **Customers** - スケルトンページが既にあるため最優先
2. **Warehouses/Products/Suppliers** - 詳細・登録・更新・削除画面の追加

### Phase 2: 業務機能強化 (中優先度)

1. **Dashboard** - `GET /admin/stats` を使った統計表示
2. **Allocation Suggestions** - 自動生成・削除機能

### Phase 3: 管理機能 (低優先度)

1. **Master Change Logs** - マスタ変更履歴の表示
2. **Simulation/Snapshot** - 開発・テスト用機能（必要に応じて）

---

## 非対象エンドポイント

以下はフロントエンド実装不要と判断：

- `GET /healthz`, `/readyz`, `/health` - インフラ監視用（Kubernetes等から呼び出し）
- `POST /admin/reset-database` - 開発専用、UIからの操作は危険
- `POST /admin/seeds` - 開発専用
