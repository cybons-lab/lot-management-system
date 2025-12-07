# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Python 3.12 → 3.13 へ更新
- ドキュメント構造を整理（アーカイブ削除、CLAUDE.md簡素化）
- タスク管理ドキュメントを統一：`remaining_issues.adoc`を削除し、`ACTIVE_TASKS.md`に一元化

### Fixed
- **[Test Data] 全製品に最低1ロット確保**: `generate_test_data.py`を修正し、depletedシナリオでもロットを生成するよう変更
- **[Test Data] エッジケーステスト用データパターン追加**: 3種類のエッジケースシナリオを導入
  - `mixed_expiry`: 1製品に有効/期限切れ/枯渇ロットを混在させる
  - `single_expiring_soon`: 7日以内に期限切れとなるロット
  - `multi_lot_fefo`: 4ロット（10/30/60/90日後期限）でFEFOアルゴリズムのテスト用

### Added
- **[Feature] User Lock (P3-3)**: 担当者ロック表示（排他制御）機能
  - Backend: `locked_by_user_id`カラム追加、`/lock` API実装
  - Frontend: `useOrderLock`フック、受注詳細画面へのアラート表示
- **[Feature] Auto Allocation (P4-1)**: 自動引当機能のFrontend有効化
  - Backendの`/api/allocations/auto-allocate`と連携
- **[Feature] Bulk Cancel (P4-2)**: 受注明細単位の一括取消機能
  - Backend: `/cancel-by-order-line` API追加
  - Frontend: `useCancelAllAllocationsForLine` 実装

## [2025-12-06]

### Added
- **[Schema] Product Suppliers Table**: `product_suppliers`テーブルを追加し、製品と仕入先のN:N関係を管理
  - `is_primary`フラグで主要仕入先を識別
  - 既存lotsデータから初期データ投入（在庫数量ベースで主要仕入先を決定）
- **[Backend] Primary Supplier Priority Sort**: 受注一覧で主担当仕入先の製品を優先表示
  - `OrderService.get_orders`にprimary_supplier_ids引数追加
  - `orders_router`に`prioritize_primary`クエリパラメータ追加
  - `assignment_service`に`get_primary_supplier_ids`メソッド追加
- **[Backend] Product Suppliers API**: `GET /products/{code}/suppliers`エンドポイント追加
- **[Frontend] Inventory Allocation Split**: 在庫一覧に「仮引当 (Soft)」と「確定引当 (Hard)」を分割表示
- **[Backend] Allocation Aggregation**: `InventoryService`の集計ロジックを更新し、引当種別ごとの数量を計算
- **[Frontend] UI Layout**: 各種テーブル(製品別、仕入先別、倉庫別、確定明細)での長い文字列の省略表示とツールチップ対応
- **[Code Quality] Backend Services**: `WarehouseService`, `CustomerService`の継承型定義を修正し、無理な型無視(`type: ignore`)を解消
- **[Code Quality] Frontend Types**: `ForecastSummaryCards`, `ForecastGroupList`での`any`型使用を廃止し、正しい型定義(`ForecastListResponse`)を適用
- **[Code Quality] React Hooks**: `useLotColumns`での`exhaustive-deps`警告を`useCallback`で正しく解消

### Fixed
- **[Backend] Mypy Errors**: 17件あったMypyエラーを解決 (レガシーコード削除、Import整理、ロジック修正)

### Changed
- `generate_test_data.py`を更新し、`product_suppliers`テーブルのクリアと生成を追加
- `docs/schema.adoc`を更新し、`product_suppliers`テーブルのドキュメント追加

## [2025-12-05]

### Fixed
- ESLint Critical: `useMultipleDialogs` 削除（Rules of Hooks違反）
- ESLint Critical: `WarehouseSelector` のuseEffect修正済み確認

### Changed
- HTTPクライアントを `shared/api/http-client.ts` に統合済み確認
- ドキュメント整理: ACTIVE_TASKS.md, remaining_issues.adoc 更新
- 実装済み/不要なドキュメントの削除 (forecast-order-integration-plan.md, forecast_allocation_actions.md, spec-allocation.md)
- **[Backend] Refactoring**: `lots_router.py`, `inbound_service.py` の責務分割と整理
- **[Feature] Order Auto-Allocation**: `fefo.py` のロジック刷新 (Single Lot Fit), Batch API 実装, Frontend 連携(LineService分離)

### Added
- Forecast Auto-Allocation実装 (v0: Single Lot Fit + FEFO)
- Frontend: Order Lineでのマルチロット引当内訳表示
- Backend: `allocator.py` (共通引当ロジック)

### Verified (以前に実装済みと確認)
- Template download API - 全マスタ（products, customers, warehouses, suppliers）
- 受注明細一括取消API (`POST /allocations/bulk-cancel`)
- 自動引当API FEFO適用 (`POST /allocations/auto-allocate`)
- UOM変換 更新/削除対応 (`PUT/DELETE /{conversion_id}`)
- エラートースト表示 (InboundReceiveDialog)

## [2025-12-04]

### Fixed
- Mypyエラーを113件→17件に削減 (#245)
- 受注関連の修正 (#244)
- UIテキスト切り詰め問題の修正 (#242)

### Changed
- Hard Allocation設計レビュー (#243)
- SQLファイルのクリーンアップ (#241)
- 大規模コンポーネントの分割 (#240)
- API品質向上 (#239)

### Added
- CI/CD設定完了 (#237, #238)
- サービスレイヤーテスト (#236)
- OpenAPI型統一（`typegen:curl`修正、`api.d.ts`統一）

## [2025-12-02]

### Added
- RPA材料配送文書発行機能 (#234)
- Bulk import/upsert API実装 (#232)

### Changed
- クイックウィンクリーンアップ (#233)
- ドキュメント構造再編成 (#231)

## [2025-11-30]

### Fixed
- API URLプレフィックスエラー修正 (#230)

### Added
- 監査レポート検証 (#229)
- コード品質レポート (#228)

### Changed
- 受注管理ページリファクタリング (#227)
- 引当アクションのモジュール分割 (#226)
