# アクティブタスクリスト

**最終更新:** 2025-12-04
**ソース:** 全ドキュメント統合（todo-priorities, code-quality-report, audit-report, remaining_issues.adoc）
**前回クリーンアップ:** 2025-12-04（CI/CD設定完了を反映）
**CI/CD:** ✅ 設定完了（2025-12-04）

このドキュメントは、プロジェクト全体の未完了タスクを優先度別に統合したマスタータスクリストです。

---

## 📊 サマリー

| 優先度 | 件数 | 合計工数見積 | ステータス |
|--------|------|------------|----------|
| **🔴 P0（緊急）** | 2 | 1.5時間 | ⚠️ ブロッカーあり |
| **🟠 P1（高）** | 10 | 約3.5日 | ✅ 実施可能 |
| **🟡 P2（中）** | 14 | 約4.5日 | ✅ 実施可能 |
| **🔵 P3（低）** | 7 | 1週間+ | 将来対応 |
| **合計** | **33件** | **約9.5日** | - |

> **✅ 2025-12-02更新:** P1-7, P1-10, P1-11, P2-28 は既に完了済みのため削除しました。

---

## 🔴 P0 - 緊急（セキュリティ/本番前必須）

### 1. 認証機能の実装

**ソース:** remaining_issues.adoc
**ステータス:** 未実装
**工数:** 要設計
**ブロッカー:** 検証環境のユーザー管理機能が未整備

**背景:**
- 現在は認証なしで動作
- ユーザー識別、排他制御、操作ログに必要

**サブタスク:**
1. 認証方式の決定（JWT? Session?）
2. ユーザー管理機能の実装
3. Auth context の実装
4. 認証トークン発行フローの確立
5. 検証環境での動作確認

**ブロックされている機能:**
- P0-2: Auth context統合（adjusted_by）
- 排他制御（誰が編集中か識別不可）
- 操作ログのユーザー追跡

---

### 2. Auth context統合（adjusted_by フィールド）

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `frontend/src/features/adjustments/components/AdjustmentForm.tsx:26`
**工数:** 1時間（認証実装後）

**問題:**
- `adjusted_by` フィールドがハードコード（userId = 1）
- セキュリティ上の問題

**前提条件:**
- P0-1: 認証機能の実装が必須

**対応:**
```typescript
// Before
const userId = 1; // ❌ ハードコード

// After
const { user } = useAuth();
const userId = user.id; // ✅ 認証コンテキストから取得
```

---

## 🟠 P1 - 高（機能ブロック/データ整合性）

### Backend API実装（5件）

#### 4. Template download API実装

**ソース:** todo-priorities-2025-11-30.md
**工数:** 2時間
**優先度:** 高（UX改善）

**対象エンドポイント:**
- `GET /api/masters/products/template`
- `GET /api/masters/customers/template`
- `GET /api/masters/warehouses/template`
- `GET /api/masters/suppliers/template`

**影響:**
- ユーザーがCSVテンプレートを手動作成する手間

**関連ファイル:**
- `frontend/src/features/products/components/ProductBulkImportDialog.tsx:83`
- `frontend/src/features/customers/components/CustomerBulkImportDialog.tsx:102`

---

#### 5. 受注明細単位の一括取消API

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `frontend/src/hooks/mutations/useAllocationMutations.ts:175`
**工数:** 3時間

**問題:**
- 現在は個別削除を繰り返し実行（パフォーマンス低下）

**対応:**
```typescript
// 新規エンドポイント
POST /api/allocations/bulk-cancel
{
  "allocation_ids": [1, 2, 3, ...]
}
```

---

#### 6. 自動引当API（FEFO適用）

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `frontend/src/hooks/mutations/useAllocationMutations.ts:234`
**工数:** 4時間

**問題:**
- 現在は代替実装でFEFOが適用されていない

**対応:**
- バックエンドのFEFOアルゴリズムを使用
- `POST /api/allocations/auto-allocate` の実装

---



### Backend コード品質（4件）

#### 8. lots_router.py の分割（531行）

**ソース:** code-quality-report-2025-11-30.md
**ファイル:** `backend/app/api/routes/inventory/lots_router.py`
**工数:** 3時間
**基準違反:** 300行制限

**対応:**
- `lots_basic_router.py`: 基本CRUD
- `lots_movement_router.py`: 在庫移動
- `lots_lock_router.py`: ロック/アンロック

---

#### 9. inbound_service.py の分割（399行）

**ソース:** code-quality-report-2025-11-30.md
**ファイル:** `backend/app/services/inventory/inbound_service.py`
**工数:** 2時間
**基準違反:** 300行制限

**対応:**
- `inbound_planning_service.py`: 計画管理
- `inbound_receipt_service.py`: 受入処理

---





### Frontend 構造化（3件）

#### 12. HTTPクライアント統合

**ソース:** COMPLETED_CODE_CLEANUP_20251130.md
**工数:** 1-2時間
**影響:** コード重複、設定の不一致

**ファイル:**
- `frontend/src/services/http.ts` (legacy, axios)
- `frontend/src/shared/libs/http.ts` (modern, axios)

**対応:**
1. 両方の機能を `shared/libs/http.ts` に統合
2. `services/http.ts` を削除
3. インポートを更新（5ファイル）

---

#### 13. エラー処理の構造化

**ソース:** COMPLETED_CODE_CLEANUP_20251130.md
**工数:** 2時間
**影響:** ユーザー体験の劣化

**問題:**
- 複数の features で `alert()` による原始的なエラー表示

**対応:**
1. 共有コンポーネント作成
   - `shared/components/error/ErrorToast.tsx`
   - `shared/components/error/ErrorDialog.tsx`
2. エラーハンドラフック
   - `shared/hooks/useErrorHandler.ts`
3. TanStack Query の `onError` ハンドラ統一

---

## 🟡 P2 - 中（機能追加・品質改善）

### Backend コード品質（7件）

#### 14. 高複雑度関数のリファクタリング（CC 18-20）

**ソース:** code-quality-report-2025-11-30.md
**工数:** 4時間
**基準違反:** CC > 10

| CC | 関数 | ファイル |
|----|------|---------|
| 20 | `generate_orders` | `services/test_data/orders.py` |
| 20 | `_validate_profile` | `services/common/profile_loader.py` |
| 18 | `calculate_line_allocations` | `services/allocations/fefo.py` |

**対応:**
- 検証ロジックの分離
- Strategyパターンの適用
- FEFOアルゴリズムのステップ分割

---

#### 15-20. Backend 300行超過ファイル（6件）

**ソース:** code-quality-report-2025-11-30.md
**工数:** 1日
**基準違反:** 300行制限

| 行数 | ファイル |
|------|---------|
| 379 | `app/models/inventory_models.py` |
| 374 | `app/models/masters_models.py` |
| 366 | `app/api/routes/admin/admin_router.py` |
| 342 | `app/services/common/operation_log_service.py` |
| 326 | `app/services/orders/order_service.py` |
| 324 | `app/api/routes/inventory/inbound_plans_router.py` |

**対応:**
- Models: ドメインごとに分割
- Routers: 機能ごとに分割
- Services: 責務ごとに分割

---

### Frontend 機能追加（4件）

#### 21. 予測グループの自動引当実装

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `features/forecasts/components/ForecastDetailCard/ForecastDetailCard.tsx:71`
**工数:** 4時間
**現状:** console.log出力のみ

---

#### 22. 全受注の自動引当実装

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `features/forecasts/components/ForecastDetailCard/RelatedOrdersSection.tsx:28`
**工数:** 4時間
**現状:** console.log出力のみ

---

#### 23. 入荷予定を倉庫別に集約する処理実装

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `features/forecasts/components/ForecastDetailCard/useWarehouseData.ts:54`
**工数:** 3時間
**現状:** 空実装

---

#### 24. 入荷予定の数量取得

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `features/forecasts/components/ForecastDetailCard/useWarehouseData.ts:59`
**工数:** 1時間
**現状:** 0固定

---

### Frontend UI/UX改善（2件）

#### 25. エラートースト表示追加

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `features/inbound-plans/components/InboundReceiveDialog.tsx:82`
**工数:** 30分
**影響:** エラーが見えない

---

#### 26. 顧客の追加フィールド実装

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `features/customers/components/CustomerForm.tsx:104`
**工数:** 2時間
**追加項目:** contact_name, phone, email

---

### Frontend データ管理（2件）

#### 27. UOM変換のUPD/DEL対応

**ソース:** todo-priorities-2025-11-30.md
**ファイル:** `features/uom-conversions/api.ts:92`
**工数:** 2時間
**現状:** 編集・削除不可（conversion_id追加が必要）

---

## 🔵 P3 - 低（将来対応）

### 28. SAP API統合の本番化

**ソース:** todo-priorities-2025-11-30.md, remaining_issues.adoc
**工数:** 1週間
**タイミング:** 本番導入時

**現状:**
- SAP在庫チェック: ✅ モック実装済み
- SAP受注登録: ✅ モック実装済み
- 本番SAP API接続: ❌ 未実装

**対応タスク:**
1. 本番SAP API仕様の確認
2. `SAPMockClient` → 本番クライアントへの置き換え
3. 認証・接続設定の環境変数化

**関連ファイル:**
- `backend/app/external/sap_mock_client.py`
- `backend/app/services/batch/inventory_sync_service.py`
- `backend/app/services/sap/sap_service.py:60`

---

### 29. 定期バッチジョブのスケジューラ設定

**ソース:** remaining_issues.adoc
**工数:** 1-2日

**現状:**
- SAP在庫チェック: 手動実行ボタンあり
- 定期実行（日次バッチ）: ❌ 未設定

**対応タスク:**
1. APScheduler または Celery Beat の導入
2. 日次バッチスケジュールの設定
3. 実行ログ・監視の実装

---

### 30. 担当者ロック表示（排他制御）

**ソース:** remaining_issues.adoc
**工数:** 1-2日
**ブロッカー:** 認証機能の実装（P0-1）

**要件:**
- 別ユーザーが編集中の場合、「🔒 田中太郎さんが編集中」と表示
- 操作をブロックまたは警告

**対応タスク:**
1. 編集中ユーザー記録テーブルの作成
2. WebSocket または ポーリングによる状態同期
3. フロントエンドでのロック表示UI実装

---

### 31. UIレイアウト（文字数超過）の総点検

**ソース:** remaining_issues.adoc
**工数:** 1日

**対応タスク:**
1. 各一覧画面での長い文字列の表示確認
2. 必要に応じた `max-width` と `truncate` の適用
3. ツールチップ (`title` 属性) の付与確認

---

### 32. 入荷予定手動作成機能

**ソース:** remaining_issues.adoc
**優先度:** 低（SAP連携が主のため不要の可能性）

**判断ポイント:**
- SAPの発注残から確認するため、手動作成は不要の可能性が高い
- 業務要件の再確認が必要

---

### 33. ForecastDetailCard の肥大化監視

**ソース:** remaining_issues.adoc
**現状:** 26ファイル（コロケーション済み）

**対応基準:**
- ファイル数が30を超えた場合に分割検討
- 機能追加で複雑度が増した場合

---

### 34. Hard Allocation の本格運用

**ソース:** remaining_issues.adoc
**タイミング:** v3.0予定

**現状:**
- Soft Allocation（推奨）: ✅ 実装済み
- Hard Allocation（確定）: `allocation_type = 'hard'` のみ準備

**v3.0での対応予定:**
- 実在庫のロック機能
- 他オーダーからの利用制限

---

## 🛠️ コード品質改善（継続監視）

### 35. Frontend 300行超過ファイル（6件）

**ソース:** code-quality-report-2025-11-30.md
**工数:** 2日
**優先度:** MEDIUM

| 行数 | ファイル |
|------|---------|
| 341 | `features/allocations/components/lots/LotAllocationHeaderView.tsx` |
| 322 | `features/allocations/components/lots/LotListCard.tsx` |
| 318 | `shared/utils/csv-parser.ts` |
| 309 | `shared/components/form/FormField.tsx` |
| 308 | `features/inbound-plans/pages/InboundPlanDetailPage.tsx` |
| 301 | `features/supplier-products/components/SupplierProductBulkImportDialog.tsx` |

---

### 36. ESLint 違反の修正

**ソース:** remaining_issues.adoc
**優先度:** 参考（機能には影響なし）

**Critical（修正必須）:**
- `WarehouseSelector.tsx:24`: useEffect が条件付きで呼ばれている
- `useDialog.ts:204`: コールバック内で useDialog が呼ばれている（Rules of Hooks 違反）

**High（推奨修正）:**
- アクセシビリティ（ラベル関連付け）: 6件
- 関数長さ違反（80行超過）: 17件
- 複雑度違反: 15件

---

## 📋 推奨アクションプラン

### フェーズ1: 認証基盤の整備（今週〜来週）

**最優先:**
1. **P0-1: 認証機能の実装**（要設計）
   - 認証方式の決定
   - ユーザー管理機能
   - Auth context 実装

**認証完了後:**
2. **P0-2: Auth context統合**（1時間）

---

### フェーズ2: Backend API実装（P1）- 今月中

**クイックウィン（合計2時間）:**
1. **P1-7: default_warehouse_id 設定化**（1時間）
2. **P1-11: ProductService 重複削除**（15分）
3. **P1-10: トランザクション境界追加**（30分）

**高価値タスク（合計2日）:**
4. **P1-3: Bulk import/upsert API**（1日）
5. **P1-4: Template download API**（2時間）
6. **P1-5: 受注明細一括取消API**（3時間）
7. **P1-6: 自動引当API**（4時間）

---

### フェーズ3: コード品質改善（P1）- 今月中

**ファイル分割（合計5時間）:**
8. **P1-8: lots_router.py 分割**（3時間）
9. **P1-9: inbound_service.py 分割**（2時間）

**構造化（合計3-4時間）:**
10. **P1-12: HTTPクライアント統合**（1-2時間）
11. **P1-13: エラー処理の構造化**（2時間）

---

### フェーズ4: P2機能追加・改善 - 来月

**クイックウィン（合計3.5時間）:**
- P2-25: エラートースト表示（30分）
- P2-24: 入荷予定数量取得（1時間）
- P2-26: 顧客追加フィールド（2時間）

**機能実装（合計12時間）:**
- P2-21: 予測グループ自動引当（4時間）
- P2-22: 全受注自動引当（4時間）
- P2-23: 入荷予定集約処理（3時間）
- P2-27: UOM変換UPD/DEL対応（2時間）

**リファクタリング（合計1日）:**
- P2-14:# ACTIVE_TASKS - 現在のタスク一覧

**最終更新日**: 2025-12-02
**クリーンアップ実施**: 2025-12-02 (P1-7, P1-10, P1-11, P2-28削除)
**※ 完了済みタスクを繰り返さないよう、このファイルから削除済み**

## サマリー

- **総タスク数**: 32件（P1-3削除）
- **推定工数合計**: 約9日
- **最優先タスク**: P1-4, P1-5, P1-6（高価値タスク）

### 優先度別内訳
- P0: 1件（認証）
- P1: 9件（機能追加・性能改善）
- P2: 6件（コード品質改善）
- P3: 16件（長期改善・監視項目）
- P2-14: 高複雑度関数（4時間）
- P2-15-20: Backend 300行超過（4時間）

**クリーンアップ（30分）:**
- P2-28: 孤立ファイル削除（30分）

---

### フェーズ5: P3将来対応

**本番導入時:**
- P3-29: SAP API統合（1週間）
- P3-30: 定期バッチスケジューラ（1-2日）

**v3.0予定:**
- P3-31: 排他制御（1-2日、認証実装後）
- P3-35: Hard Allocation（要設計）

**継続監視:**
- P3-32: UIレイアウト総点検
- P3-33: 入荷予定手動作成（要件再確認）
- P3-34: ForecastDetailCard 肥大化監視

---

## 📊 進捗トラッキング

このタスクリストの進捗は以下で管理してください:

- [ ] 週次レビューで進捗確認
- [ ] 完了したタスクに ✅ マークを追加
- [ ] 新規タスクが発生した場合は適切な優先度で追加
- [ ] 四半期ごとに全体を見直し

---

## 🔗 関連ドキュメント

**ソースドキュメント:**
- `docs/todo-priorities-2025-11-30.md` - TODOコメント分析
- `docs/code-quality-report-2025-11-30.md` - コード品質レポート
- `docs/audit-report-2025-11-30.md` - 孤立ファイル検出
- `docs/remaining_issues.adoc` - 残課題リスト

**アーカイブ:**
- `docs/archive/COMPLETED_CODE_CLEANUP_20251130.md` - 完了済みタスク
- `docs/archive/changes/` - 過去の変更履歴

**ガイドライン:**
- `CLAUDE.md` - プロジェクトガイドライン
- `docs/DOCUMENT_GUIDELINES.adoc` - ドキュメントガイドライン

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-01 | 初版作成（全ドキュメント統合） |
