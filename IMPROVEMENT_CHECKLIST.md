# 改善項目チェックリスト

このチェックリストは `PROJECT_REVIEW_REPORT.md` に基づく実装進捗を追跡するためのものです。

## 使い方

- [ ] 未着手
- [x] 完了
- [~] 進行中

---

## 📊 最新進捗サマリー（2025-12-02更新）

### ✅ 完了済み
- **PostgreSQL test環境構築**: ✅ 完了
  - docker-compose.test.yml 作成
  - setup-test-db.sh 自動セットアップスクリプト
  - conftest.py PostgreSQL対応
  - backend/tests/README.md 完全ガイド

- **テスト作成（Phase 2）**: API endpoint tests 作成完了
  - ✅ test_orders.py（13件）
  - ✅ test_allocations.py（11件）
  - ✅ test_allocation_suggestions.py（10件）
  - ✅ test_users.py（15件）
  - ✅ test_roles.py（11件）
  - **合計: 60テストケース作成**

### 🎯 テスト実行状況
- **実装済み**: 60テストケース
- **実行確認**: 夜に一括実行予定
- **PostgreSQL test DB**: セットアップ完了（./setup-test-db.sh で起動可能）

### 📝 次のステップ候補
1. **テスト実行**: 夜に60テスト一括実行＆バグ修正
2. **サービス層テスト**: order_service, inbound_service等（Phase 2継続）
3. **Phase 1実装**: セキュリティ対応（認証・認可）
4. **フロントエンド改善**: 300行超過ファイルのリファクタ

---

## 🔴 Phase 1: セキュリティ対応（本番デプロイ前必須） - 推定10日

### Week 1 (7日)

#### 認証実装（3日）
- [ ] Day 1: `AuthService.get_current_user()` 実装
- [ ] Day 1: `/login` エンドポイント動作確認
- [ ] Day 2: 全routersに `Depends(get_current_user)` 追加（143エンドポイント）
  - [ ] masters/ (warehouses, products, suppliers, customers)
  - [ ] orders/ (orders, order_lines)
  - [ ] allocations/ (allocations, allocation_suggestions, allocation_candidates)
  - [ ] inventory/ (lots, inventory_items, adjustments)
  - [ ] forecasts/
  - [ ] inbound-plans/
  - [ ] admin/ (users, roles, operation_logs, batch_jobs)
- [ ] Day 3: 認証テスト実装（401エラーテスト）

#### 認可（RBAC）実装（2日）
- [ ] Day 4: `require_role()` 依存関数実装 (`app/api/deps.py`)
- [ ] Day 4: admin操作に `require_role("admin")` 適用
  - [ ] DELETE /users/{id}
  - [ ] POST /roles
  - [ ] POST /admin/reset-database
  - [ ] DELETE /products/{code}
  - [ ] DELETE /customers/{id}
  - [ ] DELETE /suppliers/{id}
  - [ ] DELETE /warehouses/{code}
- [ ] Day 5: manager操作に `require_role("manager", "admin")` 適用
  - [ ] POST /orders
  - [ ] POST /allocations/commit
  - [ ] POST /adjustments
- [ ] Day 5: 認可テスト実装（403エラーテスト）

#### レート制限・HTTPS（2日）
- [ ] Day 6: slowapi インストール (`pip install slowapi`)
- [ ] Day 6: `/login` に `@limiter.limit("5/minute")` 適用
- [ ] Day 6: 重要操作に制限適用
  - [ ] POST /users (100/hour)
  - [ ] POST /orders (100/hour)
  - [ ] POST /allocations/commit (100/hour)
- [ ] Day 7: `HTTPSRedirectMiddleware` 追加（本番環境のみ）
- [ ] Day 7: `TrustedHostMiddleware` 設定
- [ ] Day 7: 強力なSECRET_KEY生成、環境変数検証追加

### Week 2 (3日)

#### データベース整合性（3日）
- [ ] Day 1-2: トランザクション境界修正
  - [ ] `lots_router.py` の `db.commit()` をサービス層に移動（6箇所）
  - [ ] `orders_router.py` の `db.commit()` を移動（2箇所）
  - [ ] `admin_router.py` の `db.commit()` を移動（2箇所）
  - [ ] 各サービスで一貫したトランザクション管理実装
- [ ] Day 3: インデックス追加マイグレーション作成
  - [ ] `idx_forecast_current_customer` on `forecast_current.customer_id`
  - [ ] `idx_forecast_current_delivery_place` on `forecast_current.delivery_place_id`
  - [ ] `idx_forecast_current_product` on `forecast_current.product_id`
  - [ ] `idx_allocations_lot_status` on `allocations(lot_id, status)`
- [ ] Day 3: マイグレーション実行、動作確認

### Phase 1完了基準チェック

- [ ] 全APIエンドポイントに認証実装（143/143）
- [ ] 管理者操作に認可チェック実装
- [ ] レート制限実装（/login, 重要操作）
- [ ] HTTPS強制（本番環境）
- [ ] セキュリティチェックリスト100%完了
- [ ] データベーストランザクション修正完了
- [ ] インデックス追加完了
- [ ] セキュリティテスト全パス

---

## 🟠 Phase 2: テストカバレッジ改善 - 推定22日

### Week 3-4: バックエンドテスト（14日）

#### 重要APIエンドポイントテスト（8日）
- [x] Day 1-2: **orders_router.py** テスト（13件作成済） ✅
  - [x] POST /orders（作成、バリデーション）
  - [x] GET /orders（一覧、フィルター: status, customer_code, date_range）
  - [x] GET /orders/{id}（詳細）
  - [x] DELETE /orders/{id}/cancel（キャンセル）
  - [x] エラーケース（無効な顧客404、重複注文番号409、空の明細）
  - ⚠️ 注: 一部テストはPostgreSQL view依存のため完全な実行にはPG必要
- [x] Day 3-4: **allocations_router.py** テスト（11件作成済） ✅
  - [x] POST /allocations/drag-assign（手動割当）
  - [x] POST /allocations/commit（割当確定）
  - [x] POST /allocations/preview（FEFOプレビュー）
  - [x] DELETE /allocations/{id}（割当キャンセル）
  - [x] エラーケース（在庫不足400/409、not found 404）
  - ⚠️ 注: サービス層のID自動生成パターンによりSQLite互換性に制限あり
- [x] Day 5: **allocation_suggestions_router.py** テスト（10件作成済） ✅
  - [x] POST /allocation-suggestions/preview（forecast/orderモード）
  - [x] GET /allocation-suggestions（一覧、フィルター: forecast_period, product_id）
  - [x] エラーケース（パラメータ不足400、無効なモード400）
  - ⚠️ 注: サービス層のID自動生成パターンによりSQLite互換性に制限あり
- [x] Day 6-7: **users_router.py + roles_router.py** テスト（26件作成済） ✅
  - [x] test_users.py（15件）: List, Get, Create, Update, Delete, Assign roles
  - [x] test_roles.py（11件）: List, Get, Create, Update, Delete
  - [x] エラーケース（重複username/email 409、重複role_code 409、404、422）
  - [x] ユーザー・ロール関係テスト（UserRole assignment）

#### サービス層テスト（6日）
- [ ] Day 8-9: **order_service.py** テスト（6件）
  - [ ] create_order()
  - [ ] update_order_status() with state machine
  - [ ] エラーケース（無効な遷移、バリデーション失敗）
- [ ] Day 10-11: **inbound_service.py** テスト（4件）
  - [ ] receive_inbound() with lot generation
  - [ ] エラーケース（重複ロット、無効な数量）
- [ ] Day 12-13: **inventory_service.py** テスト（5件）
  - [ ] Real-time aggregation from lots
  - [ ] Multi-warehouse queries
  - [ ] エラーケース（無効な製品/倉庫）
- [ ] Day 14: **adjustment_service.py** テスト（4件）
  - [ ] Stock adjustments
  - [ ] Stock movement creation
  - [ ] エラーケース（無効な数量、理由不足）

#### エラーシナリオテスト（3日）
- [ ] Day 15: **tests/error_scenarios/** ディレクトリ作成
- [ ] Day 15-16: バリデーションエラーテスト（422）
  - [ ] 空の必須フィールド
  - [ ] 無効な型
  - [ ] 範囲外の値
- [ ] Day 16-17: ビジネスルール違反テスト（400）
  - [ ] 期限切れロットへの割当
  - [ ] 利用可能在庫超過
  - [ ] 無効なステータス遷移
- [ ] Day 17: 制約違反テスト（409）
  - [ ] 重複キー
  - [ ] 外部キー違反
- [ ] Day 17: 並行性テスト
  - [ ] 同一ロットへの同時割当
  - [ ] 二重割当防止
  - [ ] 楽観的ロック

### Week 5-6: フロントエンドテスト（8日）

#### テスト基盤構築（1日）
- [ ] Day 1: Vitestセットアップ
  - [ ] `npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitest/ui`
  - [ ] `vitest.config.ts` 作成
  - [ ] `package.json` にテストスクリプト追加

#### コンポーネントテスト（3日）
- [ ] Day 2: **OrderCard.test.tsx**
  - [ ] 表示内容確認
  - [ ] ボタンクリックイベント
- [ ] Day 3: **ProductForm.test.tsx**
  - [ ] フォーム入力
  - [ ] バリデーション
  - [ ] 送信
- [ ] Day 4: **AllocationTable.test.tsx**
  - [ ] データ表示
  - [ ] ソート
  - [ ] フィルター

#### フックテスト（2日）
- [ ] Day 5: **useOrders.test.ts**
  - [ ] useQuery
  - [ ] useMutation
  - [ ] MSWモック
- [ ] Day 6: **useAuth.test.ts**
  - [ ] ログイン
  - [ ] ログアウト
  - [ ] トークン管理

#### MSWハンドラー拡充（2日）
- [ ] Day 7-8: 不足しているエンドポイントのモック追加
  - [ ] Users API
  - [ ] Roles API
  - [ ] Forecasts API
  - [ ] Inbound Plans API

### Phase 2完了基準チェック

- [ ] APIテストカバレッジ >= 80%
- [ ] サービステストカバレッジ >= 85%
- [ ] エラーシナリオテストカバレッジ >= 70%
- [ ] フロントエンドテスト基盤構築完了
- [ ] コンポーネントテスト 3件以上
- [ ] フックテスト 2件以上
- [ ] CI/CDでテスト自動実行

---

## 🟡 Phase 3: コード品質向上 - 推定16日

### Week 7-8: バックエンドリファクタリング（10日）

#### ファイルサイズ削減（4日）
- [ ] Day 1: **lots_router.py** (531行 → 250行以下)
  - [ ] フィルタリングロジックを `lot_filters.py` に抽出
  - [ ] バリデーションを `lot_validators.py` に抽出
  - [ ] 複雑な関数を分割
- [ ] Day 2: **inbound_service.py** (399行 → 250行以下)
  - [ ] ヘルパー関数を `inbound_helpers.py` に抽出
  - [ ] ロット生成ロジックを独立関数に
- [ ] Day 3: **search.py** (356行 → 250行以下)
  - [ ] クエリビルダーを分割
  - [ ] フィルター処理を独立関数に
- [ ] Day 4: **order_service.py** (326行 → 250行以下)
  - [ ] バリデーションロジック抽出
  - [ ] ステータス更新ロジック分離

#### 循環的複雑度削減（3日）
- [ ] Day 5: **list_lots()** (複雑度11 → 7以下)
  - [ ] フィルター適用を独立関数に
  - [ ] Early return 導入
- [ ] Day 6: **create_lot()** (複雑度13 → 7以下)
  - [ ] バリデーションステップを独立関数に
  - [ ] ロット作成ロジックを簡素化
- [ ] Day 6: **update_lot()** (複雑度13 → 7以下)
  - [ ] 更新ロジックを段階的に分割
- [ ] Day 7: 残り7関数のリファクタリング

#### 関数サイズ削減（3日）
- [ ] Day 8: lots_router.py の大きな関数（5関数）
- [ ] Day 9: inbound_service.py の大きな関数（3関数）
- [ ] Day 10: その他の大きな関数（3関数）

### Week 9-10: フロントエンド改善（6日）

#### ファイルサイズ削減（3日）
- [ ] Day 1: **LotAllocationHeaderView.tsx** (341行 → 250行以下)
  - [ ] サブコンポーネントに分割
- [ ] Day 1: **LotListCard.tsx** (322行 → 250行以下)
  - [ ] カード要素をコンポーネント化
- [ ] Day 2: **CustomerItemsListPage.tsx** (319行 → 250行以下)
  - [ ] フックにロジック抽出
- [ ] Day 2: **FormField.tsx** (309行 → 250行以下)
  - [ ] フィールドタイプ別コンポーネントに分割
- [ ] Day 3: **InboundPlanDetailPage.tsx** (308行 → 250行以下)
- [ ] Day 3: **ConfirmedLinesPage.tsx** (301行 → 250行以下)

#### 型安全性改善（1日）
- [ ] Day 4: **ForecastGroupList.tsx** の `any` 型削除
  - [ ] `ForecastGroup` インターフェース定義
  - [ ] `ForecastData` インターフェース定義
- [ ] Day 4: **ForecastSummaryCards.tsx** の `any` 型削除
- [ ] Day 4: **InboundReceiveDialog.tsx** の `any` 型削除
  - [ ] OpenAPI生成型を使用

#### クリーンアップ（2日）
- [ ] Day 5: console.log 削除（57箇所）
  - [ ] デバッグログ削除
  - [ ] 必要なログはloggerユーティリティに置換
- [ ] Day 5: 空のcatchブロック修正（18ファイル）
  - [ ] `logError()` 追加
  - [ ] `toast.error()` 追加
- [ ] Day 6: TODOコメント整理（20件）
  - [ ] GitHub issue作成
  - [ ] コメントに issue番号追加
  - [ ] 優先度・期限追記

### Phase 3完了基準チェック

- [ ] 全ファイルが300行以下
- [ ] 全関数の循環的複雑度が10以下
- [ ] `any` 型使用ゼロ
- [ ] console.log使用ゼロ（意図的なログを除く）
- [ ] ESLint/Ruff警告ゼロ
- [ ] CIの `continue-on-error` 削除

---

## 🔵 Phase 4: 長期改善（バックログ） - 推定36日

### セキュリティ強化（4日）
- [ ] リフレッシュトークン実装（2日）
- [ ] パスワードポリシー実装（1日）
- [ ] セキュリティヘッダー追加（1日）

### ドキュメント改善（4日）
- [ ] README.md 重複削除（0.1日）
- [ ] SETUP_GUIDE.md 更新（0.5日）
- [ ] 非推奨エンドポイント警告（1日）
- [ ] トラブルシューティングガイド（2日）

### データベース最適化（4日）
- [ ] レガシーquery() API移行（2日）
- [ ] ORDER status CHECK制約（0.5日）
- [ ] 悲観的ロック拡充（1日）

### テスト拡充（26日）
- [ ] マスターデータAPIテスト（6日）
- [ ] ドメインロジックテスト（4日）
- [ ] E2Eテスト（10日）
- [ ] フロントエンド統合テスト（6日）

### コード改善（10日）
- [ ] ESLint disable コメント削減（4日）
- [ ] 命名規則違反修正（1日）
- [ ] アクセシビリティ改善（3日）
- [ ] 大きなモデルファイル分割（2日）

---

## 進捗追跡

### Phase 1: セキュリティ対応
- **開始日**: ____________
- **完了予定**: ____________
- **実際の完了日**: ____________
- **進捗**: ____ / 10日

### Phase 2: テストカバレッジ
- **開始日**: ____________
- **完了予定**: ____________
- **実際の完了日**: ____________
- **進捗**: ____ / 22日

### Phase 3: コード品質
- **開始日**: ____________
- **完了予定**: ____________
- **実際の完了日**: ____________
- **進捗**: ____ / 16日

### Phase 4: 長期改善
- **開始日**: ____________
- **完了予定**: ____________
- **実際の完了日**: ____________
- **進捗**: ____ / 36日

---

## メトリクス追跡

### セキュリティ
- 認証済エンドポイント: ____ / 143
- 認可チェック実装: ____ / 10
- レート制限実装: ____ / 5

### テストカバレッジ
- APIカバレッジ: ____% (目標: 80%)
- サービスカバレッジ: ____% (目標: 85%)
- フロントエンドカバレッジ: ____% (目標: 60%)
- E2Eテスト: ____ / 5

### コード品質
- 300行超過ファイル: ____ / 9 (目標: 0)
- 複雑度10超過関数: ____ / 10 (目標: 0)
- `any` 型使用: ____ / 10 (目標: 0)
- console.log: ____ / 57 (目標: 0)

---

## 注意事項

1. **Phase 1は本番デプロイ前に必須完了**
2. **各Phase完了時に完了基準を確認**
3. **テストを伴わないリファクタリングは禁止**
4. **変更後は必ずCIを通すこと**
5. **ドキュメントも同時に更新すること**

---

最終更新日: 2025-12-02
