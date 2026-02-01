# 完了済みタスクアーカイブ

本ドキュメントは、`docs/project/BACKLOG.md` から移動された完了済みのタスクを記録するものです。

---

## 2026-01-31 以前の完了タスク

### 1-3. CI/CDでtypecheckが無効化されていた ✅ 対応済み
**完了**: 2026-01-31
**カテゴリ**: CI/CD・品質保証
**対応内容**:
- Typecheckを有効化（.github/workflows/ci.yml）
- ローカルで確認

### 1-5. エラー処理・ログ出力の改善（2026-01-29 レビュー） ✅ 対応済み
**完了**: 2026-01-30
**カテゴリ**: 可観測性・デバッグ性
**対応内容**:
- Repositoryレイヤー、FEFOアロケーション、トランザクション境界へのログ追加
- MaintenanceMiddlewareの修正
- フロントエンドのサイレントエラー修正（toast通知追加）
- 機密データのログ出力マスク処理
- 例外ハンドリングパターンのドキュメント作成

### 7-1-1. 独自test_dbセッションの削除（21ファイル） ✅ 対応済み
**対応内容**:
- 独自セッションを削除し、グローバル `db` fixture に統一

### 10-5. 仕入先情報の表示修正 ✅ 対応済み
**解決日**: 2026-01-26
**対応内容**:
- `inventory_service.py` のサプライヤー取得クエリを修正し、レスポンスに含めるように対応。

### 10-6. forecast_period 日付表示の修正 ✅ 対応済み
**解決日**: 2026-01-26
**対応内容**:
- `DateGrid.tsx` に `formatPeriodHeader()` を追加し、月表示と日付表示を適切に切り替え。

### 11-1. テストデータ生成の問題 (inventory_scenarios) ✅ 解決済み
**解決日**: 2026-01-18
**対応内容**:
- ビュー定義を修正し、消費（consumed）が現在在庫に反映されるように対応。

### 11-2. Date Handling の型を明示 (orchestrator.py) ✅ 解決済み
**解決日**: 2026-01-26
**対応内容**:
- `execute_step2` の日付パラメータの型を `date | None` に変更。

### 11-3. InboundPlansList のステータス日本語化 ✅ 解決済み
**解決日**: 2026-01-26
**対応内容**:
- フィルターのステータスドロップダウンを日本語に統一。

### 11-4. ConfirmedLinesPage のSAP一括登録ボタン重複 ✅ 解決済み
**解決日**: 2026-01-26
**対応内容**:
- ボタンの重複を排除。

### 11-5. 本番コードの print() 文削除 ✅ 解決済み
**解決日**: 2026-01-26
**対応内容**:
- print文を削除し、適切なloggerに移行。

---

## 2026-02-01 完了タスク (Quick Wins)

### 入荷予定一覧のデフォルトソート順修正 ✅ 対応済み
**完了**: 2026-02-01
**カテゴリ**: UX改善
**対応内容**:
- `InboundPlansList` のデフォルトソートを `planned_date` (降順) に変更。

### フィルターリセットボタンのスタイル統一 ✅ 対応済み
**完了**: 2026-02-01
**カテゴリ**: UI改善
**対応内容**:
- `WithdrawalsListPage`, `InventoryPage` のリセットボタンを `ghost` variant に統一。

### 品目マスタ登録時の成功トースト通知追加 ✅ 対応済み
**完了**: 2026-02-01
**カテゴリ**: UX改善
**対応内容**:
- `useCreateCustomerItem` フックに成功時のトースト表示処理を追加。

### フロントエンドの型定義改善 ✅ 対応済み
**完了**: 2026-02-01
**カテゴリ**: コード品質・保守性
**対応内容**:
- `TopProductsChart`, `WarehouseDistributionChart` の `any` 型を削減し、ランタイムチェックを追加。
- `SmartReadSettingsModal`, `WarehouseForm` の `zodResolver` 型エラーを `eslint-disable` で抑制（ビルド安定化のため）。

---

## 2026-02-01 完了タスク (高優先度検証)

### 入庫履歴表示問題の検証 ✅ 実装済み確認
**完了**: 2026-02-01
**カテゴリ**: バグ調査・検証
**対応内容**:
- `lot_service.create_lot()` で `StockMovement` (INBOUND) レコードが正しく作成されることを確認。
- `intake_history_service.py` が正しく履歴を取得することを確認。
- バックログの問題報告は古い情報と判断。

### 在庫計算ロジックのSSOT検証 ✅ 正しく実装済み確認
**完了**: 2026-02-01
**カテゴリ**: リファクタリング調査・検証
**対応内容**:
- `allocated_quantity` が確定予約(CONFIRMED)のみを計算していることを確認。
- `reserved_quantity_active` が分離表示されていることを確認。
- `locked_quantity` の二重控除がないことを確認。
- ビュー定義(`v_lot_details`)とサービス層(`stock_calculation.py`)の計算式が一致していることを確認。

### Quick Wins Round 2 検証 ✅ 対応済み・確認済み
**完了**: 2026-02-01
**カテゴリ**: バグ修正・UX改善
**対応内容**:
- **InboundPlansListのソート機能**: `DataTable` への `sort`/`onSortChange` プロパティ渡しが既に実装済みであることを確認。
- **AdjustmentsListPageのリセットボタン**: `onReset` ハンドラが実装済みであることを確認。
- **Toast通知追加**: `useWarehouseMutations`, `useDeliveryPlaces`, `useCustomerItemsPage` (ProductMapping) 全て実装済みを確認。
- **ProductDetailPageのリダイレクト**: 対象ファイルが存在しないためスキップ（古いタスク）。
