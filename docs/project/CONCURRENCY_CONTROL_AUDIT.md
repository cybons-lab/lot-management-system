# 排他制御・競合リスク調査 (全テーブル)

**作成日:** 2026-02-05  
**対象:** `backend/app/infrastructure/persistence/models` 定義の全テーブル + 主要ビュー

## 概要
SmartRead/OCR系は同時編集リスクが高く、今回の対応でバージョン管理を導入した。その他テーブルは更新頻度・用途に応じて「悲観的ロック」「楽観的ロック」「追記のみ」を使い分ける方針とする。

## 高リスク (同時編集の可能性が高い)
| Table | 更新パターン | 現状の制御 | 推奨 |
| --- | --- | --- | --- |
| `smartread_wide_data` | バッチ再保存 / 上書き | なし | `version` + `data_version` (実装済み) |
| `smartread_long_data` | バッチ再保存 / 上書き | なし | `version` + `data_version` (実装済み) |
| `ocr_result_edits` | ユーザー手入力編集 | なし | `version` による競合検出 (実装済み) |
| `smartread_tasks` | データセット管理 | なし | `data_version` で競合検出 (実装済み) |
| `orders` | 複数ユーザー編集 | 論理ロック + 行ロック | 維持 (悲観的ロック優先) |
| `order_lines` | 受注編集に追随 | 受注ロックに依存 | 維持 |

## トランザクション系 (在庫/引当)
| Table | 更新パターン | 現状の制御 | 推奨 |
| --- | --- | --- | --- |
| `lot_receipts` | 在庫受入 | 行ロック (`FOR UPDATE`) | 維持 |
| `lot_reservations` | 引当・解除 | 行ロック (`FOR UPDATE`) | 維持 |
| `lot_reservation_history` | 追記のみ | なし | 追記専用 |
| `lot_master` | ロット基礎 | 低頻度 | 低頻度のため必要時のみ楽観 |
| `stock_history` | 追記のみ | なし | 追記専用 |
| `adjustments` | 追記のみ | なし | 追記専用 |
| `allocation_suggestions` | バッチ生成 | なし | `data_version` (将来) |
| `allocation_traces` | 追記のみ | なし | 追記専用 |
| `withdrawals` | 登録/取消 | なし | 楽観的ロック検討 |
| `withdrawal_lines` | 追記/更新 | なし | 楽観的ロック検討 |

## マスタ系 (低頻度更新)
| Table | 更新パターン | 現状の制御 | 推奨 |
| --- | --- | --- | --- |
| `warehouses` | 管理者更新 | `version` (実装済み) | 対応済み |
| `suppliers` | 管理者更新 | `version` (実装済み) | 対応済み |
| `customers` | 管理者更新 | `version` (実装済み) | 対応済み |
| `delivery_places` | 管理者更新 | `version` (実装済み) | 対応済み |
| `makers` | 管理者更新 | `version` (実装済み) | 対応済み |
| `supplier_items` | 管理者更新 | `version` (実装済み) | 対応済み |
| `customer_items` | 管理者更新 | `version` (実装済み) | 対応済み |
| `product_mappings` | 管理者更新 | `version` (実装済み) | 対応済み |
| `product_uom_conversions` | 管理者更新 | `version` (実装済み) | 対応済み |
| `product_warehouse` | 管理者更新 | なし | `version` 追加 |
| `customer_item_jiku_mappings` | 管理者更新 | `version` (実装済み) | 対応済み |
| `customer_item_delivery_settings` | 管理者更新 | `version` (実装済み) | 対応済み |
| `warehouse_delivery_routes` | 管理者更新 | `version` (実装済み) | 対応済み |
| `layer_code_mappings` | 管理者更新 | なし | `version` 追加 |
| `shipping_master_raw` | 取込更新 | `version` (実装済み) | 対応済み |
| `shipping_master_curated` | 手動/バッチ | `version` (実装済み) | 対応済み |

## 予測/入荷系
| Table | 更新パターン | 現状の制御 | 推奨 |
| --- | --- | --- | --- |
| `forecast_current` | 一括取込 | なし | `data_version` (将来) |
| `forecast_history` | 追記のみ | なし | 追記専用 |
| `material_order_forecasts` | 一括取込 | なし | `data_version` (将来) |
| `inbound_plans` | 作成/更新 | なし | `version` 追加 |
| `inbound_plan_lines` | 作成/更新 | なし | `version` 追加 |
| `expected_lots` | 作成/更新 | なし | `version` 追加 |

## RPA/バッチ/外部連携
| Table | 更新パターン | 現状の制御 | 推奨 |
| --- | --- | --- | --- |
| `rpa_jobs` | 状態更新 | 単一ワーカー | 現状維持 |
| `rpa_run_groups` | バッチ更新 | なし | 現状維持 |
| `rpa_runs` | バッチ更新 | なし | 現状維持 |
| `rpa_run_items` | バッチ更新 | なし | 現状維持 |
| `rpa_run_events` | 追記のみ | なし | 追記専用 |
| `rpa_run_item_attempts` | 追記のみ | なし | 追記専用 |
| `rpa_run_fetches` | 追記のみ | なし | 追記専用 |
| `cloud_flow_configs` | 管理者更新 | なし | `version` 追加 |
| `cloud_flow_jobs` | 追記/更新 | なし | 現状維持 |

## 認証/システム設定
| Table | 更新パターン | 現状の制御 | 推奨 |
| --- | --- | --- | --- |
| `users` | 管理者更新 | なし | `version` 追加 |
| `roles` | 管理者更新 | なし | `version` 追加 |
| `user_roles` | 割当更新 | なし | `version` 追加 |
| `user_supplier_assignments` | 割当更新 | `version` (実装済み) | 対応済み |
| `system_configs` | 管理者更新 | なし | `version` 追加 |
| `notifications` | 既読更新 | なし | 低頻度のため任意 |
| `holiday_calendars` | 管理者更新 | なし | `version` 追加 |
| `company_calendars` | 管理者更新 | なし | `version` 追加 |
| `original_delivery_calendars` | 管理者更新 | なし | `version` 追加 |
| `missing_mapping_events` | 追記/完了 | なし | `version` 追加 |
| `seed_snapshots` | 追記のみ | なし | 追記専用 |
| `sap_connections` | 管理者更新 | なし | `version` 追加 |
| `sap_material_cache` | バッチ更新 | なし | `data_version` (将来) |
| `sap_fetch_logs` | 追記のみ | なし | 追記専用 |
| `system_client_logs` | 追記のみ | なし | 追記専用 |
| `operation_logs` | 追記のみ | なし | 追記専用 |
| `master_change_logs` | 追記のみ | なし | 追記専用 |
| `business_rules` | 管理者更新 | なし | `version` 追加 |
| `batch_jobs` | 状態更新 | なし | 現状維持 |
| `server_logs` | 追記のみ | なし | 追記専用 |

## ビュー (読み取り専用)
| View | 用途 | 推奨 |
| --- | --- | --- |
| `v_ocr_results` | OCR結果統合 | 変更なし (手入力バージョンを追加) |
| `v_lot_current_stock` | 在庫集計 | 変更なし |
| `v_customer_daily_products` | 顧客日次集計 | 変更なし |
| `v_lot_available_qty` | 有効在庫 | 変更なし |
| `v_order_line_context` | 受注明細文脈 | 変更なし |
| `v_customer_code_to_id` | コード変換 | 変更なし |
| `v_delivery_place_code_to_id` | コード変換 | 変更なし |
| `v_forecast_order_pairs` | 予測/受注 | 変更なし |
| `v_product_code_to_id` | コード変換 | 変更なし |
| `v_candidate_lots_by_order_line` | 引当候補 | 変更なし |
| `v_lot_details` | ロット詳細 | 変更なし |
| `v_order_line_details` | 受注明細詳細 | 変更なし |
| `v_inventory_summary` | 在庫集計 | 変更なし |
| `v_lot_active_reservations` | 予約集計 | 変更なし |
| `v_lot_allocations` | 引当集計 | 変更なし |

## 実施済み対応 (この改修)
| 対象 | 対応内容 |
| --- | --- |
| SmartRead/OCR | `version` / `data_version` 追加、競合時409 |
| OCRビュー | `manual_version` 追加 |
| マスタ系/担当割当 | 主要マスタ + `user_supplier_assignments` に `version` 追加、更新/削除で409 |

## 追加対応の候補
未対応のマスタ/設定系（例: `product_warehouse`, `layer_code_mappings` など）に `version` を追加し、管理画面の同時更新に備える。
