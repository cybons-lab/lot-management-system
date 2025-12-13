# データベーススキーマ 粗探しレポート

**作成日**: 2025-12-12
**更新日**: 2025-12-13
**対象**: lot-management-system v2.1

---

## 🔴 重大な問題 (即時対応推奨)

### 1. マイグレーションとモデルの不整合 (allocations テーブル)

**問題箇所**:
- `backend/app/infrastructure/persistence/models/orders_models.py:262-266`
- `backend/alembic/versions/000000000000_initial_schema.py:1009`

```python
# モデル (orders_models.py)
lot_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)  # lot_id FKなし

# マイグレーション (initial_schema.py)
sa.Column("lot_id", sa.BigInteger(), nullable=True),
sa.ForeignKeyConstraint(["lot_id"], ["lots.id"], ondelete="RESTRICT"),
```

**影響**: allocationsテーブルで `lot_id` (FK) と `lot_reference` (String) の二重定義。どちらが正か不明瞭。

**改善案**:
- 案A: `lot_reference` に統一するなら、マイグレーションから `lot_id` FK を削除
- 案B: `lot_id` FK に戻して参照整合性を維持（推奨：データ整合性が保証される）

#### 📋 lot_id FK復帰の影響範囲調査結果（2025-12-13追記）

**現状の設計方針**:
- `allocations` テーブル: `lot_reference` (String) でロット番号を保存
- `lot_reservations` テーブル: `lot_id` (FK) で直接参照
- API: `lot_id` で受け取り → Lotを取得 → `lot_number` を `lot_reference` に設定
- 読み込み時: `lot_reference` から Lot を検索して情報取得

**lot_reference 方式の意図（推測）**:
- ロットが削除されても引当履歴を残せる（参照整合性の緩和）
- 業務キーベースでの疎結合化

**lot_id FK に戻した場合の修正必要箇所**:

| カテゴリ | ファイル | 変更内容 |
|----------|----------|----------|
| **モデル** | `orders_models.py` | `lot_reference` → `lot_id` (FK) |
| **リポジトリ** | `allocation_repository.py` | 全メソッドで lot_number 参照を lot_id 参照に |
| **サービス** | `commit.py` | `lot_reference=lot.lot_number` → `lot_id=lot.id` |
| | `confirm.py` | lot_reference での検索 → lot_id での検索 |
| | `cancel.py` | lot_reference での検索 → lot_id での検索 |
| | `preempt.py` | lot_reference での検索 → lot_id での検索 |
| | `manual.py` | lot_reference での作成 → lot_id での作成 |
| | `inventory_service.py` | JOIN条件変更 (`l.lot_number = a.lot_reference` → `l.id = a.lot_id`) |
| **API** | `v2/allocation/router.py` | レスポンス構築の変更 |
| **マイグレーション** | 新規作成 | `lot_reference` カラム削除、`lot_id` FK 追加 |

**工数見積**: 中（約15ファイル、1-2日）

**推奨**: 案B（lot_id FK復帰）
- `lot_reservations` は既に `lot_id` FK を使用しているため、整合性が取れる
- データ整合性が保証される
- JOINが文字列マッチから整数比較に変わるためパフォーマンス向上

---

### 2. `lots.allocated_quantity` の残骸問題

**問題箇所**: 複数のビューとスクリプト

`20241210_complete_migration.py` で `allocated_quantity` カラムは削除済みだが、以下で参照が残存:

| ファイル | 行 | 状態 |
|----------|-----|------|
| `backend/sql/views/create_views.sql` | 48, 56, 150, 175, 177, 179, 205, 207 | 旧バージョン |
| `backend/scripts/update_inventory_view.py` | 38-41 | 旧参照 |
| `backend/scripts/generate_test_data.py` | 219 | 旧参照 |

```sql
-- 問題のある旧ビュー定義 (create_views.sql)
l.current_quantity - l.allocated_quantity - l.locked_quantity
```

**現在の正しい方式** (`create_views_v2.sql`):
```sql
-- lot_reservations からの集計
l.current_quantity - COALESCE(la.allocated_quantity, 0) - l.locked_quantity
```

**改善案**:
1. `backend/sql/views/create_views.sql` を削除
2. `create_views_v2.sql` を `create_views.sql` にリネーム
3. 関連スクリプトを更新

#### 📋 ビューファイルマージ調査結果（2025-12-13追記）

**v1 (`create_views.sql`) と v2 (`create_views_v2.sql`) の差分**:

| 観点 | v1 (旧) | v2 (新・正) |
|------|---------|-------------|
| **allocated_quantity の算出** | `lots.allocated_quantity` カラム直接参照（削除済み） | `lot_reservations` からの集計 |
| **論理削除対応** | なし | `COALESCE` で対応、`is_deleted` フラグ追加 |
| **ヘルパービュー** | なし | `v_lot_allocations` 追加 |
| **コメント** | 最小限 | 各ビューに説明追加 |

**v2 で追加されたビュー**:
- `v_lot_allocations`: ロットごとの引当数量集計（lot_reservationsから）
- `v_product_code_to_id`: 製品コード→IDマッピング（論理削除対応）

**v1 のみに存在するビュー**: なし（v2は上位互換）

**推奨対応**:
1. `create_views.sql` を削除
2. `create_views_v2.sql` を `create_views.sql` にリネーム
3. `update_inventory_view.py`, `generate_test_data.py` を v2 方式に更新

---

### 3. withdrawals テーブルの nullable 不整合

**問題箇所**:
- `backend/app/infrastructure/persistence/models/withdrawal_models.py:65-82`
- `backend/alembic/versions/20241209_add_withdrawals.py:29-34`

```python
# モデル (nullable=True)
customer_id: Mapped[int | None] = mapped_column(..., nullable=True)
delivery_place_id: Mapped[int | None] = mapped_column(..., nullable=True)
withdrawn_by: Mapped[int | None] = mapped_column(..., nullable=True)

# マイグレーション (nullable=False)
sa.Column("customer_id", sa.BigInteger(), nullable=False),
sa.Column("delivery_place_id", sa.BigInteger(), nullable=False),
sa.Column("withdrawn_by", sa.BigInteger(), nullable=False),
```

**影響**: モデルとDBスキーマで nullable 定義が異なる。
- モデルは `None` を許容
- DBは NOT NULL 制約
- INSERT時に予期せぬエラーの可能性

**改善案**:
- 案A: マイグレーションを修正して nullable=True に変更（柔軟性重視）
- 案B: モデルを修正して nullable=False に変更（データ品質重視）

#### 📋 withdrawals ユースケース調査結果（2025-12-13追記）

**ユースケース分析**:

| 質問 | 回答 |
|------|------|
| **出庫確定だけ？ドラフトも作る？** | 出庫確定のみ。`create_withdrawal` は即座にDBコミット。ドラフト機能なし。 |
| **customer_id/delivery_place_id は常に分かる前提？** | **タイプによって異なる**。下記参照。 |
| **withdrawn_by は「操作者ユーザー」か「作業者」か** | **操作者ユーザー**（`users.id` を参照）。任意入力。 |

**出庫タイプ別の必須項目**:

| タイプ | customer_id | delivery_place_id | withdrawn_by |
|--------|-------------|-------------------|--------------|
| `order_manual` (受注手動) | **必須** | 任意 | 任意 |
| `internal_use` (社内使用) | 任意 | 任意 | 任意 |
| `disposal` (廃棄処理) | 任意 | 任意 | 任意 |
| `return` (返品対応) | 任意 | 任意 | 任意 |
| `sample` (サンプル出荷) | 任意 | 任意 | 任意 |
| `other` (その他) | 任意 | 任意 | 任意 |

**結論**: **モデルの `nullable=True` が正解**

マイグレーションを修正して DB も `nullable=True` にすべき。

**推奨対応**:
```sql
-- 修正マイグレーション
ALTER TABLE withdrawals ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE withdrawals ALTER COLUMN delivery_place_id DROP NOT NULL;
ALTER TABLE withdrawals ALTER COLUMN withdrawn_by DROP NOT NULL;
```

---

## 🟠 中程度の問題

### 4. customer_items と product_mappings の重複

両テーブルが類似の役割を持つ:

| テーブル | 主キー | 目的 | カラム |
|---------|--------|------|--------|
| customer_items | (customer_id, external_product_code) | 得意先品番マッピング | customer_id, external_product_code, product_id, supplier_id, base_unit, pack_unit, etc. |
| product_mappings | id (BIGSERIAL) | 4者関係 | customer_id, customer_part_code, supplier_id, product_id, base_unit, pack_unit, etc. |

**問題点**:
- ほぼ同じカラム構成
- どちらを使うべきか不明確
- データの重複・不整合リスク
- customer_itemsには関連テーブル（jiku_mappings, delivery_settings）があるが、product_mappingsにはない

**改善案**:
- 案A: `product_mappings` に統合し、`customer_items` を廃止
- 案B: 役割を明確に分離して文書化
  - customer_items: 得意先固有の品番変換
  - product_mappings: 仕入先を含む4者関係

---

### 5. 論理削除方式の不統一

| テーブル群 | 方式 | 実装 |
|-----------|------|------|
| マスタ系 (suppliers, customers, warehouses, products, etc.) | `valid_to` (Date) | SoftDeleteMixin |
| users | `is_active` (Boolean) | 直接カラム |
| lots | `status` (String) | Enum値 |
| business_rules | `is_active` (Boolean) | 直接カラム |

**問題点**:
- クエリ条件が統一されない
- 開発者が混乱しやすい

**改善案**:
- マスタ系は `valid_to` で統一済み（OK）
- トランザクション系（lots）は `status` で継続（OK：業務状態を表す）
- `users`, `business_rules` は `valid_to` 方式への移行を検討

---

### 6. stock_history のチェック制約とEnum不一致

**問題箇所**: `backend/app/infrastructure/persistence/models/inventory_models.py:41-52`

```python
# モデルのEnum
class StockTransactionType(str, PyEnum):
    INBOUND = "inbound"
    ALLOCATION = "allocation"
    ALLOCATION_HOLD = "allocation_hold"       # ← DB制約に存在しない
    ALLOCATION_RELEASE = "allocation_release"  # ← DB制約に存在しない
    SHIPMENT = "shipment"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    WITHDRAWAL = "withdrawal"

# DB制約 (chk_stock_history_type)
"transaction_type IN ('inbound','allocation','shipment','adjustment','return','withdrawal')"
```

**影響**: `ALLOCATION_HOLD`, `ALLOCATION_RELEASE` をDBに挿入するとチェック制約違反

**改善案**:
- 案A: Enumから未使用の値を削除
- 案B: DB制約を更新して新しい値を追加
- 案C: これらの値が将来使用予定なら、DB制約を先行して更新

---

### 7. インデックス命名規則の不統一

現状の命名パターン:
```
idx_xxx_yyy     # 大多数 (例: idx_orders_customer)
ix_xxx_yyy      # forecast_current (例: ix_forecast_current_key)
ux_xxx_yyy      # forecast_current unique (例: ux_forecast_current_unique)
uq_xxx_yyy      # 制約名 (例: uq_customers_customer_code)
```

**改善案**: 命名規則を統一
```
idx_{table}_{columns}    # 通常インデックス
ux_{table}_{columns}     # ユニークインデックス
uq_{table}_{columns}     # ユニーク制約
pk_{table}               # プライマリキー制約
fk_{table}_{ref_table}   # 外部キー制約
chk_{table}_{rule}       # チェック制約
```

---

### 8. プライマリキー命名の不統一

```python
# 大多数のテーブル
id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

# product_uom_conversions (例外)
conversion_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
```

**改善案**: 全テーブルで `id` に統一。関連コードの修正が必要。

---

## 🟡 軽微な問題

### 9. forecast_current の precision 未指定

**問題箇所**: `backend/app/infrastructure/persistence/models/forecast_models.py:48`

```python
# 現状
forecast_quantity: Mapped[Decimal] = mapped_column(Numeric, nullable=False)

# 他のテーブル（統一されている）
quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
```

**改善案**: `Numeric(15, 3)` を明示的に指定

---

### 10. updated_at の onupdate 設定不統一

**あり**:
- lots
- forecast_current
- forecast_history
- inbound_plans, inbound_plan_lines, expected_lots
- lot_reservations

**なし**:
- orders, order_lines
- allocations
- customers, suppliers, warehouses, products
- その他多数

**改善案**:
- トランザクションテーブル: `onupdate=func.current_timestamp()` を設定
- マスタテーブル: アプリケーション層で明示的に更新（監査証跡の観点から）

---

### 11. order_lines の forecast_id と forecast_reference の併存

**問題箇所**: `backend/app/infrastructure/persistence/models/orders_models.py:169-179`

```python
# FK参照（マイグレーションには存在）
forecast_id: Mapped[int | None]  # → forecast_current.id

# 業務キー参照（モデルで定義）
forecast_reference: Mapped[str | None]  # 文字列での参照
```

**改善案**:
- `forecast_reference` (業務キー) を採用し、`forecast_id` FK を削除
- 理由: 疎結合化の方針と整合性がある

---

### 12. 重複インデックスの存在

**例**: customers テーブル
```python
UniqueConstraint("customer_code", name="uq_customers_customer_code"),
Index("idx_customers_code", "customer_code"),  # ← 重複（不要）
```

UniqueConstraintは暗黙的にインデックスを作成するため、明示的なIndexは不要。

**該当テーブル**:
- customers (customer_code)
- suppliers (supplier_code)
- warehouses (warehouse_code)
- products (maker_part_code)
- delivery_places (delivery_place_code)
- roles (role_code)
- business_rules (rule_code)

**改善案**: 重複する明示的インデックスを削除

---

## 📊 テーブル依存関係の分析

### 受注・引当フロー
```
orders
  └→ order_lines
       ├→ allocations → lots (lot_reference: String)
       ├→ order_groups
       └→ allocation_traces → lots (lot_id: FK)

forecast_current
  └→ allocation_suggestions → lots (lot_id: FK)
```

### 在庫管理フロー
```
lots
  ├← lot_reservations (新方式: source_type で予約元を管理)
  ├← allocations (旧方式: lot_reference で参照)
  ├← stock_history (履歴)
  ├← adjustments (調整)
  └← withdrawals (出庫)
```

**問題**: `allocations` と `lot_reservations` の役割が重複。移行途中の状態が残っている。

**改善案**:
1. `allocations` は受注明細への引当記録として維持
2. `lot_reservations` はロット側の予約管理として維持
3. 両者の関係を明確に文書化
4. または `lot_reservations` に統合して `allocations` を廃止

---

## 📋 推奨対応優先度

| 優先度 | 項目 | 工数 | 影響範囲 |
|--------|------|------|----------|
| **P0** | withdrawals nullable修正 | 低 | 出庫機能 |
| **P0** | 旧ビュー参照の削除 | 中 | ビルド・テスト |
| **P1** | allocations lot_id/lot_reference 統一 | 中 | 引当機能全体 |
| **P1** | stock_history Enum整合 | 低 | 在庫履歴 |
| **P2** | customer_items/product_mappings 統合検討 | 高 | マスタ管理全体 |
| **P2** | インデックス命名統一 | 中 | なし（リファクタ） |
| **P2** | 重複インデックス削除 | 低 | パフォーマンス |
| **P3** | forecast_current precision指定 | 低 | なし |
| **P3** | PK命名統一 | 中 | API互換性 |
| **P3** | updated_at onupdate統一 | 低 | 監査ログ |

---

## 次のステップ

1. P0項目の修正マイグレーション作成
2. 既存データへの影響調査
3. 関連コードの修正
4. テストの更新・実行

---

## 参考: 確認したファイル一覧

### モデルファイル
- `backend/app/infrastructure/persistence/models/base_model.py`
- `backend/app/infrastructure/persistence/models/soft_delete_mixin.py`
- `backend/app/infrastructure/persistence/models/masters_models.py`
- `backend/app/infrastructure/persistence/models/inventory_models.py`
- `backend/app/infrastructure/persistence/models/orders_models.py`
- `backend/app/infrastructure/persistence/models/forecast_models.py`
- `backend/app/infrastructure/persistence/models/inbound_models.py`
- `backend/app/infrastructure/persistence/models/withdrawal_models.py`
- `backend/app/infrastructure/persistence/models/auth_models.py`
- `backend/app/infrastructure/persistence/models/lot_reservations_model.py`
- `backend/app/infrastructure/persistence/models/order_groups_models.py`
- `backend/app/infrastructure/persistence/models/logs_models.py`
- `backend/app/infrastructure/persistence/models/system_models.py`
- `backend/app/infrastructure/persistence/models/product_supplier_models.py`
- `backend/app/infrastructure/persistence/models/views_models.py`
- `backend/app/infrastructure/persistence/models/assignments/assignment_models.py`

### マイグレーションファイル
- `backend/alembic/versions/000000000000_initial_schema.py`
- `backend/alembic/versions/20241209_add_withdrawals.py`
- `backend/alembic/versions/20241210_add_lot_reservations.py`
- `backend/alembic/versions/20241210_complete_migration.py`
- `backend/alembic/versions/d5a1f6b2c3e4_add_valid_to_to_masters.py`
