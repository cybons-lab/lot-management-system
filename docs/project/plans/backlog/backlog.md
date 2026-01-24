# タスクバックログ

**区分:** タスク  
**最終更新:** 2026-01-18

## 概要

本ファイルは、未完了のタスク・調査事項を集約したバックログです。完了済みのタスクは別途残さず、本バックログに最新の状態のみを記載します。

## 対応状況

### 未対応

### 1. 重要調査・障害対応

#### 1-1. 入庫履歴が表示されない問題（調査済み）

**症状:** 入庫履歴タブで「入庫履歴はありません」と表示される。  
**原因:** `lot_service.create_lot()` で `StockHistory` の INBOUND レコードが作成されていない。  
**影響:** 画面からのロット新規登録・API経由のロット作成で入庫履歴が欠落する。

**推奨対応:**
1. `lot_service.create_lot()` に INBOUND の `StockHistory` 生成を追加
2. 既存データ用のマイグレーションを用意
3. 入庫履歴画面で再確認

**関連ファイル:**
- `backend/app/application/services/inventory/lot_service.py`
- `backend/app/application/services/inventory/intake_history_service.py`

---

### 2. 優先度高（UI/UX・不整合修正）

#### 2-1. InboundPlansList のテーブルソート機能が動かない

- `sortable: true` なのに `DataTable` へ `sort` / `onSortChange` を渡していない。
- 対象: `frontend/src/features/inbound-plans/components/InboundPlansList.tsx`

#### 2-2. InboundPlansList のステータス日本語化

- `planned`, `received` など英語表記のまま。表示用マッピング追加が必要。
- 対象: `frontend/src/features/inbound-plans/components/InboundPlansList.tsx`

#### 2-3. フィルターリセットボタンの欠如

- `AdjustmentsListPage`, `WithdrawalsListPage` にリセット操作がない。
- 対象:
  - `frontend/src/features/adjustments/pages/AdjustmentsListPage.tsx`
  - `frontend/src/features/withdrawals/pages/WithdrawalsListPage.tsx`

#### 2-4. ConfirmedLinesPage のSAP一括登録ボタンが重複

- 上下に同じボタンが表示される。
- 対象: `frontend/src/features/orders/pages/ConfirmedLinesPage.tsx`

#### 2-5. Toast通知の不足

- 保存成功時にフィードバックが出ない。
- 対象:
  - `frontend/src/features/warehouses/hooks/useWarehouseMutations.ts`
  - `frontend/src/features/product-mappings/hooks/useProductMappings.ts`
  - `frontend/src/features/delivery-places/hooks/useDeliveryPlaces.ts`

#### 2-6. ProductDetailPage のコード変更後リダイレクト

- 商品コード変更時にURLが更新されず表示が残る。
- 対象: `frontend/src/features/products/pages/ProductDetailPage.tsx`

---

### 3. DB/UI整合性・データ表示改善

#### 3-1. Lots のステータス系フィールドがUI未表示

- `status`, `inspection_status`, `inspection_date`, `inspection_cert_number`, `origin_reference`
- 対象: 在庫一覧・ロット詳細の表示コンポーネント

#### 3-2. Orders の一部フィールドがUI未表示

- `ocr_source_filename`, `cancel_reason`, `external_product_code`, `shipping_document_text`
- 対象: 受注詳細画面

---

### 4. アーキテクチャ/品質改善

#### 4-1. useQuery のエラー処理追加（Phase 2）

- `AllocationDialog.tsx`, `ForecastsTab.tsx`, `InboundPlansTab.tsx`, `WithdrawalCalendar.tsx` など。

#### 4-2. 日付ユーティリティの統合

- `shared/utils/date.ts`, `shared/libs/utils/date.ts`, `features/forecasts/.../date-utils.ts` の重複整理。

#### 4-3. 削除ダイアログの統合

- `SoftDeleteDialog`, `PermanentDeleteDialog`, `BulkSoftDeleteDialog`, `BulkPermanentDeleteDialog` を統合。

---

### 5. テスト・自動化

#### 5-1. テスト基盤拡張（低優先度）

- **C3: Data Factory (Backend) 拡張**: `factory_boy` 等を使用したバックエンドテストデータ生成ファクトリの整備。現在は `services/test_data_generator.py` で代用中。
- **C4: Test Matrix 定義**: テストケースの組み合わせ表（マトリクス）のドキュメント化と管理。
- **Phase D: API統合テスト拡張**: 以下の観点でのバックエンド統合テスト拡充。
  - 主要エンティティCRUD（正常系/異常系）
  - データ整合性テスト（トランザクション境界など）
  - 権限テスト（RBACの徹底確認）

---

### 6. 機能改善・中長期タスク

#### 6-1. DB/UI整合性修正に伴うエクスポート機能

- Forecasts / Orders / Inventory/Lots の Excel エクスポート実装。

#### 6-2. ダッシュボードの可視化（recharts）

- KPIのみのダッシュボードにグラフを追加。

#### 6-3. SAP連携タスク

- 本番API接続、二重計上防止のべき等性対応、在庫同期。

#### 6-4. フォーキャスト単位の引当推奨生成

- 既存は全期間一括のみ。フォーキャストグループ単位での生成が必要。

#### 6-5. 入荷予定の倉庫データ取得改善

- `InboundPlan`ヘッダーに倉庫情報がなく「未指定」に集約される問題。

#### 6-6. OpenAPI型定義の導入

- `openapi-typescript` を利用した型生成でフロント/バックの整合性を確保。

---

### 7. 保留（再現確認・調査待ち）

#### 7-1. フォーキャスト編集後の更新問題

- フォーキャスト編集後、計画引当サマリ・関連受注が更新されない。
- 手動リフレッシュでは回避可能。バックエンド再計算の確認が必要。

---

### 8. ユーザーフィードバック・機能改善 (2026-01-18追加)

#### 8-1. 過去データの可視性向上

- **入荷予定一覧**: 過去データの表示確認と「過去/未来」タブまたはフィルタの実装。
- **受注管理**: 過去の受注データの表示確認とステータス/日付フィルタの強化。
- **フォーキャスト一覧**: 「履歴」タブの機能確認とフロントエンド実装（`/history`エンドポイント活用）。

#### 8-2. アーカイブ済みロットの表示バグ

- **症状**: 在庫ロット一覧で「アーカイブ済みを表示」にチェックを入れても、アーカイブ済みロットが表示されない（または期待通りに機能しない）。
- **タスク**: フィルタリングロジック（バックエンド/フロントエンド）の調査と修正。

#### 8-3. フロントエンド・コンソールエラー

- **症状**: React Key重複エラー（"Encountered two children with the same key"）などがコンソールに出力されている。
- **タスク**: リストレンダリング時のkey生成ロジック修正。

#### 8-4. 在庫詳細の仕入先固定

- **要望**: 在庫詳細画面において、仕入先が固定（または明確化）されるべき。
- **タスク**: 製品×倉庫のコンテキストにおける仕入先特定ロジックの実装とUI反映。

### 対応済み

- なし
