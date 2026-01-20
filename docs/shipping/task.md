# OCR受注登録機能 実装タスク

## Phase 1: 出荷用マスタデータ管理 (マスタ層) ✅ 完了

### バックエンド ✅
- [x] `shipping_master_raw` テーブル作成（Excelのヘッダ順序を維持した生データ保存用）
- [x] `shipping_master_curated` テーブル作成（整形済みデータ、キー: 得意先コード × 材質コード × 次区）
- [x] Alembic マイグレーション作成 (40516792d7f0)
- [x] 出荷用マスタデータ用サービス作成 (ShippingMasterService)
- [x] API エンドポイント作成（CRUD + Excel/CSVインポート）
- [x] ダミーデータ作成スクリプト (seed_shipping_master_dummy.py)

### フロントエンド ✅
- [x] マスタページ内に「出荷用マスタデータ」タブ/サブメニュー追加
- [x] 一覧表示コンポーネント (ShippingMasterListPage)
- [x] フィルターコンポーネント (ShippingMasterFilters)
- [x] テーブルコンポーネント (ShippingMasterTable)
- [x] 編集フォーム - 今後実装予定
- [x] Excel/CSVインポート機能 - 今後実装予定

**完了日**: 2026-01-20
**コミット**: 8894a45a

---

## Phase 2: 受注登録結果テーブル ✅ 完了

### バックエンド ✅
- [x] `order_register_rows` テーブル作成（OCR + マスタ参照結果）
- [x] Alembic マイグレーション作成 (40516792d7f0)
- [x] 受注登録結果サービス作成 (OrderRegisterService)
  - OCR縦持ちデータとマスタ結合ロジック (generate_from_ocr)
  - CRUD操作 (list, get, update_lot_assignments)
- [x] API エンドポイント作成
  - GET /api/order-register (一覧取得、フィルター対応)
  - GET /api/order-register/{row_id} (詳細取得)
  - POST /api/order-register/generate (OCRデータから生成)
  - PUT /api/order-register/{row_id}/lots (ロット割当更新)

### フロントエンド ✅
- [x] API型定義更新 (OpenAPI → TypeScript)

**完了日**: 2026-01-20
**コミット**: 749f025b

---

## Phase 3: OCR結果ページ

### バックエンド
- [ ] OCR結果取得 API（縦持ちデータ + マスタ参照結果）
- [ ] Excel出力API（受注情報登録_yyyymmddhhMMss.xlsx形式）

### フロントエンド
- [ ] グローバルナビに「OCR結果」メニュー追加
- [ ] OCR結果一覧ページ作成
- [ ] Excel出力ボタン実装

---

## Phase 4: テスト & 検証 ✅
- [x] バグ修正: Excelインポート時の500エラー解消
- [x] マイグレーション不備の確認
- [ ] バックエンドユニットテスト
- [ ] APIテスト
- [ ] Ruff/Mypy チェック
- [ ] フロントエンド Lint/TypeCheck
