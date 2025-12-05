# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Python 3.12 → 3.13 へ更新
- ドキュメント構造を整理（アーカイブ削除、CLAUDE.md簡素化）

## [2025-12-05]

### Fixed
- ESLint Critical: `useMultipleDialogs` 削除（Rules of Hooks違反）
- ESLint Critical: `WarehouseSelector` のuseEffect修正済み確認

### Changed
- HTTPクライアントを `shared/api/http-client.ts` に統合済み確認
- ドキュメント整理: ACTIVE_TASKS.md, remaining_issues.adoc 更新
- 実装済み/不要なドキュメントの削除 (forecast-order-integration-plan.md, forecast_allocation_actions.md, spec-allocation.md)

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
