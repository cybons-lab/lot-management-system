# Phase1 根本対策 - 引き継ぎドキュメント

## 🎯 目的

現在のPhase1対応は**暫定対応**であり、後方互換性を保つために無理矢理動かしている状態。
**根本対策**として、Phase1の設計意図に沿った正しい実装に修正する。

---

## 📋 現状の問題点（暫定対応の限界）

### 1. ビュー定義の後方互換性対応

**現在のコード（暫定）:**
```sql
-- v_lot_receipt_stock ビュー
COALESCE(lr.supplier_item_id, lr.product_group_id) AS supplier_item_id
COALESCE(lr.supplier_item_id, lr.product_group_id) AS product_group_id
```

**問題点:**
- `product_group_id` と `supplier_item_id` の両方を返している
- 同じ値を2つの名前で公開している（冗長）
- Phase0の名残（`product_group_id`）を引きずっている

**根本対策:**
- `supplier_item_id` のみを使用
- `product_group_id` は完全に廃止
- ビュー定義から `product_group_id` を削除

---

### 2. テーブル定義の後方互換性対応

**現在のテーブル構造（`lot_receipts`）:**
```sql
product_group_id bigint NOT NULL  -- Phase0の名残（NOT NULL制約）
supplier_item_id bigint            -- Phase1で追加（NULL許容）
```

**問題点:**
- 両方の列が存在している
- `product_group_id` がNOT NULL制約を持っている
- データ移行が完了していない

**根本対策:**
1. 全ての `product_group_id` データを `supplier_item_id` に移行
2. `product_group_id` 列を削除
3. `supplier_item_id` にNOT NULL制約を追加

---

### 3. スキーマ定義の後方互換性対応

**現在のコード（`backend/app/presentation/schemas/masters/customer_items_schema.py`）:**
```python
class CustomerItemBase(BaseModel):
    supplier_item_id: int = Field(
        validation_alias="product_group_id",  # フロントから product_group_id を受け取る
        serialization_alias="product_group_id",  # フロントへ product_group_id を返す
    )
```

**問題点:**
- フロントエンドは `product_group_id` を送受信している
- バックエンドは内部で `supplier_item_id` として扱う
- 2つの名前が混在している

**根本対策:**
1. フロントエンドを `supplier_item_id` に統一
2. `validation_alias` と `serialization_alias` を削除
3. API契約を `supplier_item_id` に変更

---

## 🔍 影響範囲の調査が必要な箇所

### バックエンド

1. **モデル定義（`backend/app/infrastructure/persistence/models/`）**
   - `lot_receipts` テーブル
   - `customer_items` テーブル
   - `orders` テーブル（関連する場合）

2. **ビュー定義**
   - `v_lot_receipt_stock`（既知）
   - `v_lot_details`（要確認）
   - `v_lot_allocations`（要確認）
   - `v_lot_active_reservations`（要確認）
   - その他、`product_group_id` を参照するビュー

3. **サービス層（`backend/app/application/services/`）**
   - `inventory_service.py`（既知: 876行目で `v.supplier_item_id` を使用）
   - `order_service.py`（要確認）
   - `allocation_service.py`（要確認）

4. **APIエンドポイント（`backend/app/presentation/api/routes/`）**
   - `/api/v2/inventory/` 系
   - `/api/v2/lot/` 系
   - `/api/v2/customer-items/` 系

5. **スキーマ定義（`backend/app/presentation/schemas/`）**
   - `customer_items_schema.py`（既知）
   - `lot_schema.py`（要確認）
   - `order_schema.py`（要確認）

### フロントエンド

1. **API型定義（`frontend/src/types/`）**
   - OpenAPI生成型
   - 手動定義型

2. **フィーチャーモジュール（`frontend/src/features/`）**
   - `inventory/`
   - `lot-receipts/`
   - `customer-items/`
   - `orders/`

3. **APIクライアント（`frontend/src/features/*/api.ts`）**
   - `product_group_id` を送信している箇所
   - `product_group_id` を受信している箇所

### データベース

1. **マイグレーション履歴**
   - `products_to_product_groups.py`（既知: Phase0→Phase1移行）
   - 後続のマイグレーションファイル

2. **制約・インデックス**
   - `lot_receipts.product_group_id` の外部キー制約
   - `lot_receipts.supplier_item_id` のインデックス

---

## 📂 関連ファイル・ドキュメント

### このブランチの初期ドキュメント（重要）

1. **`docs/project/CODE_SYSTEM_DEFINITION.md`**
   - Phase1の設計意図
   - コード体系の定義

2. **このブランチのコミット履歴**
   - ブランチ名: `fix/migration-boolean-comparison-error`
   - 初期コミット〜現在までの変更履歴

3. **マイグレーションファイル**
   - `backend/alembic/versions/products_to_product_groups.py`
   - 201行目あたりにビュー定義がある

### 暫定対応で追加したファイル（削除対象）

- `backend/PHASE1_VIEW_FIX_GUIDE.md`
- `backend/PRODUCTION_VIEW_FIX.md`
- `backend/VIEW_FIX_README.md`
- `backend/dump_view_definition.py`
- `backend/check_and_fix_view.py`
- `backend/verify_view_fix.py`
- `backend/fix_view_direct.sql`
- `scripts/fix_phase1_views.py`
- `scripts/fix_phase1_views.sh`

**理由:** 根本対策後は不要になる。

---

## 🛠️ 根本対策の実装手順（案）

### Phase 1: 調査フェーズ

1. **全ての `product_group_id` 参照箇所を洗い出す**
   ```bash
   # バックエンド
   grep -r "product_group_id" backend/app/ --include="*.py"

   # フロントエンド
   grep -r "product_group_id" frontend/src/ --include="*.ts" --include="*.tsx"

   # SQL
   grep -r "product_group_id" backend/alembic/versions/ --include="*.py"
   ```

2. **全てのビュー定義をダンプ**
   ```sql
   SELECT table_name
   FROM information_schema.views
   WHERE table_schema = 'public';

   -- 各ビューの定義を確認
   SELECT pg_get_viewdef('v_lot_receipt_stock');
   SELECT pg_get_viewdef('v_lot_details');
   -- ... 他のビューも
   ```

3. **影響範囲をドキュメント化**
   - 変更が必要なファイルリスト
   - テストが必要な機能リスト
   - リスクのある変更箇所

### Phase 2: データ移行フェーズ（マイグレーション）

1. **マイグレーションファイル作成**
   ```bash
   alembic revision -m "phase1_complete_migration"
   ```

2. **マイグレーション内容**
   ```python
   def upgrade():
       # 1. supplier_item_id にデータをコピー（NULL の場合のみ）
       op.execute("""
           UPDATE lot_receipts
           SET supplier_item_id = product_group_id
           WHERE supplier_item_id IS NULL
       """)

       # 2. supplier_item_id に NOT NULL 制約を追加
       op.alter_column('lot_receipts', 'supplier_item_id', nullable=False)

       # 3. product_group_id 列を削除
       op.drop_column('lot_receipts', 'product_group_id')

       # 4. 全てのビューを正しい定義で再作成
       # v_lot_receipt_stock
       # v_lot_details
       # ... 他のビューも

   def downgrade():
       # ロールバック手順（必要に応じて）
       pass
   ```

### Phase 3: バックエンド修正フェーズ

1. **スキーマ定義の修正**
   - `validation_alias` と `serialization_alias` を削除
   - `product_group_id` → `supplier_item_id` に統一

2. **サービス層の修正**
   - `product_group_id` を使っている箇所を `supplier_item_id` に変更

3. **テスト修正**
   - 全てのテストケースを `supplier_item_id` に更新

### Phase 4: フロントエンド修正フェーズ

1. **型定義の更新**
   ```bash
   cd frontend && npm run typegen
   ```

2. **API呼び出しの修正**
   - `product_group_id` → `supplier_item_id` に変更

3. **UI表示の修正**
   - ラベル・ヘッダーの文言を確認

### Phase 5: テスト & デプロイフェーズ

1. **ローカルテスト**
   - 全機能の動作確認
   - E2Eテスト実行

2. **テスト環境デプロイ**
   - マイグレーション実行
   - 動作確認

3. **本番環境デプロイ**
   - バックアップ取得
   - マイグレーション実行
   - 動作確認
   - ロールバック手順の準備

---

## ⚠️ リスクと注意事項

### 高リスク箇所

1. **`product_group_id` 列の削除**
   - 既存データが失われる可能性
   - ロールバックが困難

2. **ビュー定義の変更**
   - 依存するビューが連鎖的に壊れる可能性
   - `CASCADE` で削除される副作用

3. **API契約の変更**
   - フロントエンドとバックエンドの互換性が失われる
   - 同時デプロイが必要

### 推奨事項

1. **段階的なデプロイ**
   - まずバックエンドのみをデプロイ（後方互換性維持）
   - 次にフロントエンドをデプロイ
   - 最後にマイグレーション実行

2. **フィーチャーフラグの活用**
   - 新旧APIを並行稼働
   - 段階的に切り替え

3. **ロールバック手順の準備**
   - マイグレーションのロールバック
   - バックエンドのロールバック
   - フロントエンドのロールバック

---

## 📊 成功基準

根本対策が完了した状態:

- [ ] `product_group_id` 列が全テーブルから削除されている
- [ ] 全てのビュー定義が `supplier_item_id` のみを使用している
- [ ] バックエンドのコードに `product_group_id` が存在しない（コメント・ドキュメント除く）
- [ ] フロントエンドのコードに `product_group_id` が存在しない
- [ ] 全てのテストがパスする
- [ ] 本番環境で正常に動作する
- [ ] 暫定対応ファイルが削除されている

---

## 🤖 Gemini への指示

このドキュメントを読んだ上で、以下を実施してください:

1. **影響範囲の完全な洗い出し**
   - 全ての `product_group_id` 参照箇所をリストアップ
   - 変更が必要なファイルを特定
   - リスク評価

2. **実装計画の作成**
   - 詳細な手順書
   - テストケースリスト
   - ロールバック手順

3. **マイグレーションスクリプトの作成**
   - データ移行SQL
   - ビュー再作成SQL
   - ロールバックSQL

4. **コード修正の実施**
   - バックエンド修正
   - フロントエンド修正
   - テスト修正

5. **動作確認**
   - ローカル環境での完全なテスト
   - 全機能の動作確認

---

## 📞 連絡先・質問

不明点があれば、以下を確認してください:

- `docs/project/CODE_SYSTEM_DEFINITION.md` - Phase1の設計意図
- `backend/alembic/versions/products_to_product_groups.py` - 現在のマイグレーション
- このブランチのコミット履歴 - 暫定対応の経緯

---

**最終更新:** 2026-02-02
**作成者:** Claude Sonnet 4.5
**対象ブランチ:** `fix/migration-boolean-comparison-error`
