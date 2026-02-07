# アーカイブドキュメント

このディレクトリには、実装済み・統合済み・陳腐化した設計書や計画書を保管しています。

## アーカイブ日

2026-02-08（最終更新）

## アーカイブ理由

以下の基準に該当するドキュメントをアーカイブしました:

1. **実装済み・仕様統合済み**: 実装が完了し、API仕様書や運用ドキュメントに統合済みの設計書
2. **実装方針が変更され陳腐化**: 実装時に別の方針を採用したため、内容が現実装と乖離している計画書
3. **重複ドキュメント**: 他のドキュメントと内容が重複し、統合可能な運用ガイド

## アーカイブ一覧

### design/ (4件) - RPA/在庫改善/マスタ移行の設計書

| ファイル | 推定作成年 | アーカイブ理由 |
|---------|----------|--------------|
| `supplier_customer_items_implementation_plan_v2.1.md` | 2026-01 | 仕入先・得意先品目移行の主計画書。実装完了 (2026-01-25)。 |
| `rpa_material_delivery_cloud_flow_spec.md` | 2026-01 | Cloud Flow仕様の計画書。実装済み (#470)、APIドキュメントに統合済み |
| `rpa_material_delivery_run_control_plan.md` | 2026-01 | Run制御の設計書。実装済み (#470)、API仕様とworkflow.mdに統合済み |
| `inventory_view_strategy.md` | 2026-01-16 | パフォーマンス改善計画。方針レベルで実装方針が未確定のまま放置 |

### features/rpa/ (2件) - RPA素材納品書関連

| ファイル | 推定作成年 | アーカイブ理由 |
|---------|----------|--------------|
| `pad_minimization_material_delivery_note.md` | 不明 | PADループ設計の詳細。overview.mdとapi.mdに統合済み |
| `material_delivery_note_step_db_api.md` | 不明 | Step/DB API詳細。material_delivery_note_api.mdに統合済み |

### features/smartread/ (5件) - SmartRead関連

| ファイル | 推定作成年 | アーカイブ理由 |
|---------|----------|--------------|
| `pad_runner_implementation_plan.md` | 2026-01-22 | 37KB超の詳細実装計画。実装完了 (#471, #473)、一部は現実装と乖離 |
| `smartread_data_management_plan.md` | 不明 | データ保存計画。実装済み (#465, #466, #471) |
| `pad_compatibility_review.md` | 2026-01-22 | PAD互換性調査レポート。調査結果は実装に反映済み、現在は不要 |
| `smartread_watchdir_handoff.md` | 不明 | Watch dirハンドオフ仕様。実装済み (#461, #483) |
| `smartread_prompt_requestid_autorun.md` | 不明 | Request ID自動実行仕様。現行実装では別方式を採用 |

### features/shipping/ (1件) - OCR受注登録関連

| ファイル | 推定作成年 | アーカイブ理由 |
|---------|----------|--------------|
| `ocr_order_register_ai_handoff.md` | 不明 | OCR受注登録のAI向け設計メモ。実装完了 (#488)、仕様書に統合済み |

### features/ocr/ (1件) - OCR結果カスタマイズ

| ファイル | 推定作成年 | アーカイブ理由 |
|---------|----------|--------------|
| `ocr-results-column-customization.md` | 不明 | 列順カスタマイズのメモ。実装済み (#459)、現状仕様に反映済み |

### backlog/ (2件追加) - 堅牢性強化関連

| ファイル | 作成年 | アーカイブ理由 |
|---------|--------|--------------|
| `strictness-robustness-plan.md` | 2026-02 | 設定ファイル厳密化計画。全項目完了（asyncpg移行のみBACKLOG 3-0に残存） |
| `SUPPRESSION_RESOLUTION_ROUND3.md` | 2026-02 | 警告抑制解消計画。TSC 0 errors / ESLint 0 errors/warnings 達成。残存 eslint-disable は構造的理由で許容 |

### operations/ (3件) - 運用ドキュメント

| ファイル | 推定作成年 | アーカイブ理由 |
|---------|----------|--------------|
| `FRONTEND_DB_CONNECTION_CHECK.md` | 不明 | トラブルシューティング診断フロー。#462/#464で修正済み、PRに集約可能 |
| `PRODUCTION_DEPLOYMENT.md` | 不明 | デプロイガイド。PRODUCTION_SETUP.mdと内容重複 |
| `MIGRATION_BASELINE.md` | 不明 | マイグレーションベースライン化手順。現在ベースライン不使用、実運用で不要 |

## 参照方法

アーカイブされたドキュメントは以下の場合に参照可能です:

- 過去の設計意図や調査結果の確認
- 実装時の意思決定の背景調査
- 類似機能の設計時の参考資料

## 関連PR

- #470: RPA素材納品書発行機能実装
- #471, #473: SmartRead PADランナー実装
- #465, #466: SmartReadデータ保存実装
- #461, #483: SmartRead Watch dir実装
- #488: OCR受注登録実装
- #459: OCR結果列順カスタマイズ実装
- #462, #464: フロントエンドDB接続問題修正
