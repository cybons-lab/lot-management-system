# 詳細実装計画：supplier_items 中心の在庫・受注管理への移行

**作成日:** 2026-01-19
**ステータス:** 📋 計画中
**担当:** システムアーキテクト

---

## エグゼクティブサマリー

本計画は、現在の `products` テーブル中心の在庫管理から、**仕入先品目（supplier_items）中心**の在庫管理へ移行するための詳細実装計画です。

### 移行の目的

1. **入荷起点の在庫管理**: 入荷時に確実に分かるキー（supplier_id + maker_part_no）で在庫を一意管理
2. **受注起点の得意先管理**: 受注時に確実に分かるキー（customer_id + customer_part_no）で得意先品番を管理
3. **命名と表示の混乱解消**: maker_part_code（実態は内部ID）と maker_part_no（仕入先品番）の区別を明確化

### 移行戦略

- **段階的導入**: Phase 1（最小リリース 4週間）→ Phase 2（フル対応 3週間）
- **破壊的変更の最小化**: 既存データは Phase 1 で保持、Phase 2 で段階的に移行
- **ロールバック可能**: 各フェーズでバックアップとロールバック手順を用意

---

## 目次

1. [現状調査結果](#1-現状調査結果)
2. [目標データモデル案](#2-目標データモデル案)
3. [変更タスク分割（順序付き）](#3-変更タスク分割順序付き)
4. [受け入れ条件（Gherkin風）](#4-受け入れ条件gherkin風)
5. [リスクと移行方針](#5-リスクと移行方針)
6. [最小リリースとフル対応の2段階プラン](#6-最小リリースとフル対応の2段階プラン)
7. [要確認リスト（不明点・推測事項）](#7-要確認リスト不明点推測事項)
8. [実装優先順位（推奨）](#8-実装優先順位推奨)
9. [まとめ](#9-まとめ)

---

## 1. 現状調査結果

### 1.1 影響を受ける主要ファイル

**バックエンド - モデル/スキーマ:**
- `backend/app/infrastructure/persistence/models/masters_models.py`
  - `Product` (368-444行) - maker_part_code中心の設計
  - `CustomerItem` (446-542行) - 複合PK (customer_id, external_product_code)
  - `ProductMapping` (544-608行) - 調達用マッピング
- `backend/app/infrastructure/persistence/models/inventory_models.py`
  - `Lot` - 現在は product_id に紐づく
  - `StockHistory` - 在庫変動履歴
- `backend/app/infrastructure/persistence/models/order_models.py`
  - `Order`, `OrderItem` - 受注・受注明細
  - `Allocation` - 引当レコード

**バックエンド - サービス層:**
- `backend/app/application/services/masters/customer_items_service.py` (1-350行)
- `backend/app/application/services/masters/products_service.py`
- `backend/app/application/services/inventory/lot_service.py`
- `backend/app/application/services/orders/allocation_service.py`

**バックエンド - API:**
- `backend/app/presentation/api/routes/masters/customer_items_router.py`
- `backend/app/presentation/api/routes/masters/products_router.py`
- `backend/app/presentation/api/routes/inventory/lots_router.py`
- `backend/app/presentation/api/routes/orders/orders_router.py`

**フロントエンド:**
- `frontend/src/features/customer-items/` (全体)
- `frontend/src/features/products/` (全体)
- `frontend/src/features/inventory/` (在庫関連)
- `frontend/src/features/orders/` (受注・引当関連)

### 1.2 現状のデータ関連図（簡略版）

```
┌─────────────────┐
│   products      │ ← 社内商品マスタ（maker_part_code = PRD-####）
│  - id (PK)      │
│  - maker_part_code (UNIQUE) ← 実態は内部ID
│  - customer_part_no ← ほぼ未使用
│  - maker_item_code  ← 検索用
└────────┬────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌─────────────────┐              ┌─────────────────┐
│ customer_items  │              │      lots       │
│ - customer_id   │              │  - id (PK)      │
│ - external_     │              │  - product_id   │ ← products.id
│   product_code  │              │  - supplier_id  │
│   (複合PK)      │              │  - lot_number   │
│ - product_id    │──────────────│  - expiry_date  │
│ - supplier_id   │              │  - quantity     │
└────────┬────────┘              └────────┬────────┘
         │                                │
         │                                │
         ▼                                ▼
┌─────────────────┐              ┌─────────────────┐
│   order_items   │              │  allocations    │
│  - order_id     │              │  - id (PK)      │
│  - product_id   │──────────────│  - order_item_id│
│  - quantity     │              │  - lot_id       │
└─────────────────┘              │  - quantity     │
                                 └─────────────────┘
```

**現状の問題点:**
1. 在庫（lots）が `product_id` に紐づくが、`product.maker_part_code` は実態が内部ID
2. `customer_items` は得意先品番マッピングだが、`product_id` 経由で在庫と紐づく（仕入先起点でない）
3. 入荷時に確実に分かるのは `supplier_id + maker_part_no` だが、それを一意管理する仕組みがない
4. 返品時に在庫ロットへ戻す際、customer に固定されてしまう可能性

---

## 2. 目標データモデル案

### 2.1 新テーブル: supplier_items（仕入先品目マスタ）

```sql
CREATE TABLE supplier_items (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    maker_part_no VARCHAR(100) NOT NULL,  -- 仕入先/メーカー品番（入荷/OCRキー）

    -- 基本情報
    product_name VARCHAR(255),
    base_unit VARCHAR(20),

    -- 単位換算（必要に応じて）
    internal_unit VARCHAR(20),
    qty_per_internal_unit DECIMAL(15, 5),

    -- 消費期限管理
    has_expiry BOOLEAN DEFAULT TRUE,
    consumption_limit_days INTEGER,

    -- メタデータ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_to DATE,  -- Soft delete用

    -- 制約
    CONSTRAINT uq_supplier_items_key UNIQUE (supplier_id, maker_part_no),
    CONSTRAINT chk_supplier_items_maker_part_no_not_empty CHECK (maker_part_no <> '')
);

CREATE INDEX idx_supplier_items_supplier ON supplier_items(supplier_id);
CREATE INDEX idx_supplier_items_maker_part_no ON supplier_items(maker_part_no);
CREATE INDEX idx_supplier_items_valid_to ON supplier_items(valid_to) WHERE valid_to IS NULL;
```

### 2.2 変更テーブル: customer_items（得意先品目マッピング）

```sql
-- 変更内容:
-- 1. product_id → supplier_item_id に変更（NULL許容）
-- 2. customer_part_no を明示的に追加（external_product_code と別管理も検討）

ALTER TABLE customer_items
    ADD COLUMN supplier_item_id BIGINT REFERENCES supplier_items(id) ON DELETE RESTRICT,
    ADD COLUMN customer_part_no VARCHAR(100);  -- 得意先が指定する品番

-- 既存の product_id は段階的に廃止（フェーズ1では残す）
-- ALTER TABLE customer_items DROP COLUMN product_id;  -- フェーズ2で実施

-- インデックス追加
CREATE INDEX idx_customer_items_supplier_item ON customer_items(supplier_item_id);
CREATE INDEX idx_customer_items_customer_part_no ON customer_items(customer_part_no);
```

**状態遷移と必須チェック:**
```
[新規登録]
  customer_id + customer_part_no は登録必須
  supplier_item_id は NULL 可（後からマッピング）
  ↓
[マッピング設定]
  supplier_item_id を設定（UI/API で仕入先品目を検索して紐付け）
  ↓
[引当可能]
  supplier_item_id が NOT NULL なら引当処理可能
  NULL なら引当時にエラー（"仕入先品目マッピングが未設定です"）
```

### 2.3 変更テーブル: lots（在庫ロット）

```sql
-- 変更内容:
-- product_id → supplier_item_id に変更

ALTER TABLE lots
    ADD COLUMN supplier_item_id BIGINT REFERENCES supplier_items(id) ON DELETE RESTRICT;

-- 既存の product_id は段階的に廃止
-- ALTER TABLE lots DROP COLUMN product_id;  -- フェーズ2で実施

-- インデックス追加
CREATE INDEX idx_lots_supplier_item ON lots(supplier_item_id);

-- ユニーク制約（同一仕入先品目・同一ロット番号は重複不可）
CREATE UNIQUE INDEX uq_lots_supplier_item_lot_number
    ON lots(supplier_item_id, lot_number)
    WHERE valid_to IS NULL;
```

### 2.4 変更テーブル: allocations（引当）

```sql
-- allocations は既存構造のまま（lot_id で紐づく）
-- ただし、引当ロジックで以下を確認:
-- 1. order_item → customer_item → supplier_item_id が NOT NULL
-- 2. lot.supplier_item_id == customer_item.supplier_item_id
```

### 2.5 ER図（目標構成）

```
┌──────────────────┐
│ supplier_items   │ ← 仕入先品目マスタ（入荷起点）
│  - id (PK)       │
│  - supplier_id   │
│  - maker_part_no │
│  UNIQUE(supplier_id, maker_part_no)
└────────┬─────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│ customer_items   │              │      lots        │
│  - customer_id   │              │  - id (PK)       │
│  - customer_part_│              │  - supplier_item_│ ← supplier_items.id
│    no            │              │    id (FK)       │
│  - supplier_item_│──────────────│  - supplier_id   │
│    id (FK, NULL可)│             │  - lot_number    │
│  UNIQUE(customer_id,            │  - expiry_date   │
│         customer_part_no)       │  - quantity      │
└────────┬─────────┘              └────────┬─────────┘
         │                                 │
         │                                 │
         ▼                                 ▼
┌──────────────────┐              ┌──────────────────┐
│   order_items    │              │  allocations     │
│  - order_id      │              │  - id (PK)       │
│  - customer_item_│──────────────│  - order_item_id │
│    id (FK)       │              │  - lot_id (FK)   │
│  - quantity      │              │  - quantity      │
└──────────────────┘              └──────────────────┘
```

---

## 3. 変更タスク分割（順序付き）

### フェーズ1: 最小リリース（在庫・引当が正しく回る構成）

#### タスク1: DBマイグレーション（Phase 1A）

**ファイル:** `backend/alembic/versions/YYYYMMDD_add_supplier_items.py`

**変更内容:**
1. `supplier_items` テーブル作成
2. `customer_items.supplier_item_id` カラム追加（NULL許容）
3. `customer_items.customer_part_no` カラム追加
4. `lots.supplier_item_id` カラム追加（NULL許容）
5. インデックス・制約追加

**DDL例:**
```python
def upgrade():
    # 1. supplier_items テーブル作成
    op.create_table(
        'supplier_items',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('supplier_id', sa.BigInteger(), nullable=False),
        sa.Column('maker_part_no', sa.String(100), nullable=False),
        sa.Column('product_name', sa.String(255)),
        sa.Column('base_unit', sa.String(20)),
        sa.Column('internal_unit', sa.String(20)),
        sa.Column('qty_per_internal_unit', sa.Numeric(15, 5)),
        sa.Column('has_expiry', sa.Boolean(), server_default='true'),
        sa.Column('consumption_limit_days', sa.Integer()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('valid_to', sa.Date()),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('supplier_id', 'maker_part_no', name='uq_supplier_items_key'),
        sa.CheckConstraint("maker_part_no <> ''", name='chk_supplier_items_maker_part_no_not_empty')
    )

    # 2. インデックス
    op.create_index('idx_supplier_items_supplier', 'supplier_items', ['supplier_id'])
    op.create_index('idx_supplier_items_maker_part_no', 'supplier_items', ['maker_part_no'])
    op.create_index('idx_supplier_items_valid_to', 'supplier_items', ['valid_to'],
                    postgresql_where=sa.text('valid_to IS NULL'))

    # 3. customer_items 拡張
    op.add_column('customer_items', sa.Column('supplier_item_id', sa.BigInteger(), nullable=True))
    op.add_column('customer_items', sa.Column('customer_part_no', sa.String(100), nullable=True))
    op.create_foreign_key('fk_customer_items_supplier_item', 'customer_items', 'supplier_items',
                          ['supplier_item_id'], ['id'], ondelete='RESTRICT')
    op.create_index('idx_customer_items_supplier_item', 'customer_items', ['supplier_item_id'])
    op.create_index('idx_customer_items_customer_part_no', 'customer_items', ['customer_part_no'])

    # 4. lots 拡張
    op.add_column('lots', sa.Column('supplier_item_id', sa.BigInteger(), nullable=True))
    op.create_foreign_key('fk_lots_supplier_item', 'lots', 'supplier_items',
                          ['supplier_item_id'], ['id'], ondelete='RESTRICT')
    op.create_index('idx_lots_supplier_item', 'lots', ['supplier_item_id'])

def downgrade():
    # 逆順で削除
    pass
```

**受け入れ条件:**
- [ ] マイグレーション実行後、既存データが破損しない（NULL許容のため既存レコードはそのまま）
- [ ] 制約違反エラーが発生しない

---

#### タスク2: バックエンドモデル定義（Phase 1B）

**ファイル:** `backend/app/infrastructure/persistence/models/masters_models.py`

**変更内容:**
```python
class SupplierItem(SoftDeleteMixin, Base):
    """仕入先品目マスタ（入荷起点の在庫管理）"""
    __tablename__ = "supplier_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("suppliers.id", ondelete="RESTRICT"))
    maker_part_no: Mapped[str] = mapped_column(String(100), nullable=False)

    # 基本情報
    product_name: Mapped[str | None] = mapped_column(String(255))
    base_unit: Mapped[str | None] = mapped_column(String(20))
    internal_unit: Mapped[str | None] = mapped_column(String(20))
    qty_per_internal_unit: Mapped[Decimal | None] = mapped_column(Numeric(15, 5))

    # 消費期限管理
    has_expiry: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    consumption_limit_days: Mapped[int | None] = mapped_column(Integer)

    # メタデータ
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    valid_to: Mapped[date | None] = mapped_column(Date)

    # リレーション
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="supplier_items")
    lots: Mapped[list["Lot"]] = relationship("Lot", back_populates="supplier_item")
    customer_items: Mapped[list["CustomerItem"]] = relationship("CustomerItem", back_populates="supplier_item")

    __table_args__ = (
        UniqueConstraint("supplier_id", "maker_part_no", name="uq_supplier_items_key"),
        CheckConstraint("maker_part_no <> ''", name="chk_supplier_items_maker_part_no_not_empty"),
        Index("idx_supplier_items_supplier", "supplier_id"),
        Index("idx_supplier_items_maker_part_no", "maker_part_no"),
    )
```

**CustomerItem 拡張:**
```python
class CustomerItem(SoftDeleteMixin, Base):
    # ... 既存フィールド ...

    # 新規フィールド
    supplier_item_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("supplier_items.id", ondelete="RESTRICT"))
    customer_part_no: Mapped[str | None] = mapped_column(String(100))

    # リレーション追加
    supplier_item: Mapped["SupplierItem | None"] = relationship("SupplierItem", back_populates="customer_items")
```

**Lot 拡張:**
```python
class Lot(Base):
    # ... 既存フィールド ...

    # 新規フィールド
    supplier_item_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("supplier_items.id", ondelete="RESTRICT"))

    # リレーション追加
    supplier_item: Mapped["SupplierItem | None"] = relationship("SupplierItem", back_populates="lots")
```

**受け入れ条件:**
- [ ] `SupplierItem` モデルが正しく定義され、マイグレーションと整合する
- [ ] リレーションが双方向で設定されている
- [ ] 型ヒントが正しい（Mapped[int | None] など）

---

#### タスク3: Pydanticスキーマ定義（Phase 1C）

**ファイル:** `backend/app/presentation/schemas/masters/supplier_items_schema.py`（新規作成）

```python
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

# Base
class SupplierItemBase(BaseModel):
    supplier_id: int = Field(..., gt=0)
    maker_part_no: str = Field(..., min_length=1, max_length=100)
    product_name: str | None = Field(None, max_length=255)
    base_unit: str | None = Field(None, max_length=20)
    internal_unit: str | None = None
    qty_per_internal_unit: Decimal | None = None
    has_expiry: bool = True
    consumption_limit_days: int | None = None

# Create
class SupplierItemCreate(SupplierItemBase):
    pass

# Update
class SupplierItemUpdate(BaseModel):
    supplier_id: int | None = None
    maker_part_no: str | None = None
    product_name: str | None = None
    base_unit: str | None = None
    internal_unit: str | None = None
    qty_per_internal_unit: Decimal | None = None
    has_expiry: bool | None = None
    consumption_limit_days: int | None = None

# Response
class SupplierItemResponse(SupplierItemBase):
    id: int
    supplier_code: str  # Enriched
    supplier_name: str  # Enriched
    created_at: datetime
    updated_at: datetime
    valid_to: date | None = None

    model_config = ConfigDict(from_attributes=True)

# List params
class SupplierItemsListParams(BaseModel):
    skip: int = Field(0, ge=0)
    limit: int = Field(100, ge=1, le=1000)
    supplier_id: int | None = None
    maker_part_no: str | None = None
    include_inactive: bool = False
```

**customer_items_schema.py 拡張:**
```python
class CustomerItemBase(BaseModel):
    # ... 既存フィールド ...
    supplier_item_id: int | None = None  # 追加
    customer_part_no: str | None = None  # 追加

class CustomerItemResponse(CustomerItemBase):
    # ... 既存フィールド ...
    supplier_item_id: int | None = None
    customer_part_no: str | None = None
    # Enriched
    supplier_item_maker_part_no: str | None = None  # 追加
    supplier_item_product_name: str | None = None   # 追加
```

**受け入れ条件:**
- [ ] スキーマがPydantic v2形式で正しく定義されている
- [ ] バリデーションが適切（min_length, gt など）
- [ ] Response型にEnrichedフィールドが含まれる

---

#### タスク4: サービス層実装（Phase 1D）

**ファイル:** `backend/app/application/services/masters/supplier_items_service.py`（新規作成）

```python
from sqlalchemy.orm import Session
from app.application.services.common.base_service import BaseService
from app.infrastructure.persistence.models.masters_models import SupplierItem, Supplier
from app.presentation.schemas.masters.supplier_items_schema import (
    SupplierItemCreate, SupplierItemUpdate
)

class SupplierItemsService(BaseService[SupplierItem, SupplierItemCreate, SupplierItemUpdate, int]):
    def __init__(self, db: Session):
        super().__init__(db=db, model=SupplierItem)

    def _enrich_item(self, item: SupplierItem) -> dict:
        """仕入先情報を含めて返却"""
        self.db.refresh(item, attribute_names=["supplier"])
        return {
            "id": item.id,
            "supplier_id": item.supplier_id,
            "supplier_code": item.supplier.supplier_code,
            "supplier_name": item.supplier.supplier_name,
            "maker_part_no": item.maker_part_no,
            "product_name": item.product_name,
            "base_unit": item.base_unit,
            "internal_unit": item.internal_unit,
            "qty_per_internal_unit": item.qty_per_internal_unit,
            "has_expiry": item.has_expiry,
            "consumption_limit_days": item.consumption_limit_days,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "valid_to": item.valid_to,
        }

    def get_by_key(self, supplier_id: int, maker_part_no: str) -> SupplierItem | None:
        """複合キーで取得"""
        return self.db.query(SupplierItem).filter(
            SupplierItem.supplier_id == supplier_id,
            SupplierItem.maker_part_no == maker_part_no
        ).first()

    def get_all(self, skip: int = 0, limit: int = 100,
                supplier_id: int | None = None,
                maker_part_no: str | None = None,
                include_inactive: bool = False) -> list[dict]:
        """一覧取得（Enriched）"""
        from sqlalchemy import select

        query = select(SupplierItem, Supplier.supplier_code, Supplier.supplier_name) \
            .join(Supplier, SupplierItem.supplier_id == Supplier.id)

        if supplier_id:
            query = query.filter(SupplierItem.supplier_id == supplier_id)
        if maker_part_no:
            query = query.filter(SupplierItem.maker_part_no.ilike(f"%{maker_part_no}%"))
        if not include_inactive:
            query = query.filter(SupplierItem.get_active_filter())

        results = self.db.execute(query.offset(skip).limit(limit)).all()

        return [
            {
                "id": r.SupplierItem.id,
                "supplier_id": r.SupplierItem.supplier_id,
                "supplier_code": r.supplier_code,
                "supplier_name": r.supplier_name,
                "maker_part_no": r.SupplierItem.maker_part_no,
                "product_name": r.SupplierItem.product_name,
                "base_unit": r.SupplierItem.base_unit,
                "internal_unit": r.SupplierItem.internal_unit,
                "qty_per_internal_unit": r.SupplierItem.qty_per_internal_unit,
                "has_expiry": r.SupplierItem.has_expiry,
                "consumption_limit_days": r.SupplierItem.consumption_limit_days,
                "created_at": r.SupplierItem.created_at,
                "updated_at": r.SupplierItem.updated_at,
                "valid_to": r.SupplierItem.valid_to,
            }
            for r in results
        ]
```

**customer_items_service.py 拡張:**
```python
def _enrich_item(self, item: CustomerItem) -> dict:
    # 既存のrefresh
    self.db.refresh(item, attribute_names=["customer", "product", "supplier", "supplier_item"])

    return {
        # ... 既存フィールド ...
        "supplier_item_id": item.supplier_item_id,
        "customer_part_no": item.customer_part_no,
        # Enriched
        "supplier_item_maker_part_no": item.supplier_item.maker_part_no if item.supplier_item else None,
        "supplier_item_product_name": item.supplier_item.product_name if item.supplier_item else None,
    }
```

**受け入れ条件:**
- [ ] `SupplierItemsService` がBaseServiceを継承し、CRUD操作可能
- [ ] `_enrich_item()` が仕入先情報を含めて返す
- [ ] `get_by_key()` で複合キー検索可能
- [ ] `customer_items_service` がsupplier_item情報を含めて返す

---

#### タスク5: API ルーター実装（Phase 1E）

**ファイル:** `backend/app/presentation/api/routes/masters/supplier_items_router.py`（新規作成）

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.application.services.masters.supplier_items_service import SupplierItemsService
from app.presentation.schemas.masters.supplier_items_schema import (
    SupplierItemCreate, SupplierItemUpdate, SupplierItemResponse, SupplierItemsListParams
)

router = APIRouter(prefix="/supplier-items", tags=["supplier-items"])

@router.get("", response_model=list[SupplierItemResponse])
def list_supplier_items(
    params: SupplierItemsListParams = Depends(),
    db: Session = Depends(get_db)
):
    """仕入先品目一覧取得"""
    service = SupplierItemsService(db)
    return service.get_all(
        skip=params.skip,
        limit=params.limit,
        supplier_id=params.supplier_id,
        maker_part_no=params.maker_part_no,
        include_inactive=params.include_inactive
    )

@router.get("/{supplier_item_id}", response_model=SupplierItemResponse)
def get_supplier_item(supplier_item_id: int, db: Session = Depends(get_db)):
    """仕入先品目詳細取得"""
    service = SupplierItemsService(db)
    item = service.get_by_id(supplier_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="SupplierItem not found")
    return service._enrich_item(item)

@router.post("", response_model=SupplierItemResponse, status_code=status.HTTP_201_CREATED)
def create_supplier_item(payload: SupplierItemCreate, db: Session = Depends(get_db)):
    """仕入先品目作成"""
    service = SupplierItemsService(db)
    # 重複チェック
    existing = service.get_by_key(payload.supplier_id, payload.maker_part_no)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"SupplierItem already exists: supplier_id={payload.supplier_id}, maker_part_no={payload.maker_part_no}"
        )
    return service.create(payload)

@router.put("/{supplier_item_id}", response_model=SupplierItemResponse)
def update_supplier_item(
    supplier_item_id: int,
    payload: SupplierItemUpdate,
    db: Session = Depends(get_db)
):
    """仕入先品目更新"""
    service = SupplierItemsService(db)
    updated = service.update(supplier_item_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="SupplierItem not found")
    return updated

@router.delete("/{supplier_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier_item(supplier_item_id: int, db: Session = Depends(get_db)):
    """仕入先品目削除（Soft Delete）"""
    service = SupplierItemsService(db)
    service.delete(supplier_item_id)
```

**ルーター登録:** `backend/app/presentation/api/routes/masters/__init__.py`
```python
from .supplier_items_router import router as supplier_items_router

# main.py で include_router(supplier_items_router)
```

**受け入れ条件:**
- [ ] `/api/masters/supplier-items` で一覧取得可能
- [ ] POST で作成時、重複チェックが機能する
- [ ] PUT/DELETE が正常動作する

---

#### タスク6: 引当ロジック拡張（Phase 1F）

**ファイル:** `backend/app/application/services/orders/allocation_service.py`

**変更内容:**
```python
class AllocationService:
    def allocate_order_item(self, order_item: OrderItem) -> list[Allocation]:
        """受注明細に対して在庫引当を実行"""

        # 1. customer_item取得
        customer_item = self.db.query(CustomerItem).filter(
            CustomerItem.customer_id == order_item.order.customer_id,
            CustomerItem.external_product_code == order_item.customer_item_external_code
        ).first()

        if not customer_item:
            raise ValueError(f"CustomerItem not found for external_code={order_item.customer_item_external_code}")

        # 2. supplier_item_id チェック（必須）
        if not customer_item.supplier_item_id:
            raise ValueError(
                f"仕入先品目マッピングが未設定です。"
                f"customer_item_id={customer_item.customer_id}/{customer_item.external_product_code}"
            )

        # 3. 該当するsupplier_itemの在庫ロットを取得（FEFO順）
        available_lots = self.db.query(Lot).filter(
            Lot.supplier_item_id == customer_item.supplier_item_id,
            Lot.quantity > 0,
            Lot.valid_to.is_(None)  # Active lots
        ).order_by(Lot.expiry_date.asc(), Lot.received_at.asc()).all()

        if not available_lots:
            raise ValueError(
                f"在庫が不足しています。supplier_item_id={customer_item.supplier_item_id}"
            )

        # 4. FEFO引当処理（既存ロジック）
        allocations = []
        remaining_qty = order_item.quantity

        for lot in available_lots:
            if remaining_qty <= 0:
                break

            allocate_qty = min(remaining_qty, lot.quantity)

            # Allocation作成
            allocation = Allocation(
                order_item_id=order_item.id,
                lot_id=lot.id,
                quantity=allocate_qty,
                allocated_at=utcnow()
            )
            self.db.add(allocation)
            allocations.append(allocation)

            # ロット在庫減算
            lot.quantity -= allocate_qty
            remaining_qty -= allocate_qty

        if remaining_qty > 0:
            raise ValueError(
                f"在庫が不足しています。不足数量={remaining_qty}"
            )

        self.db.commit()
        return allocations
```

**受け入れ条件:**
- [ ] `customer_item.supplier_item_id` がNULLの場合、明確なエラーメッセージで引当失敗
- [ ] `supplier_item_id` に紐づく在庫ロットから正しくFEFO引当される
- [ ] 在庫不足時のエラーメッセージが適切

---

#### タスク7: フロントエンド - 仕入先品目マスタ画面（Phase 1G）

**新規作成ファイル:**
- `frontend/src/features/supplier-items/api.ts`
- `frontend/src/features/supplier-items/hooks/index.ts`
- `frontend/src/features/supplier-items/components/SupplierItemsTable.tsx`
- `frontend/src/features/supplier-items/components/SupplierItemForm.tsx`
- `frontend/src/features/supplier-items/pages/SupplierItemsListPage.tsx`

**api.ts 例:**
```typescript
export interface SupplierItem {
  id: number;
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  maker_part_no: string;
  product_name: string | null;
  base_unit: string | null;
  internal_unit: string | null;
  qty_per_internal_unit: number | null;
  has_expiry: boolean;
  consumption_limit_days: number | null;
  created_at: string;
  updated_at: string;
  valid_to?: string;
}

export interface CreateSupplierItemRequest {
  supplier_id: number;
  maker_part_no: string;
  product_name?: string | null;
  base_unit?: string | null;
  // ...
}

export const getSupplierItems = async (params?: SupplierItemsListParams): Promise<SupplierItem[]> => {
  const response = await httpClient.get("/api/masters/supplier-items", { searchParams: params });
  return response.json();
};

// CRUD operations...
```

**SupplierItemsTable.tsx 例:**
```typescript
const columns = [
  { header: "仕入先コード", accessorKey: "supplier_code" },
  { header: "仕入先名", accessorKey: "supplier_name" },
  { header: "メーカー品番", accessorKey: "maker_part_no" },
  { header: "商品名", accessorKey: "product_name" },
  { header: "基本単位", accessorKey: "base_unit" },
  { header: "期限管理", accessorKey: "has_expiry", cell: ({ row }) => row.original.has_expiry ? "あり" : "なし" },
];
```

**受け入れ条件:**
- [ ] 仕入先品目一覧画面が表示される
- [ ] 仕入先選択・メーカー品番入力で新規登録可能
- [ ] 編集・削除が動作する

---

#### タスク8: フロントエンド - 得意先品番マッピング画面拡張（Phase 1H）

**変更ファイル:**
- `frontend/src/features/customer-items/api.ts`
- `frontend/src/features/customer-items/components/CustomerItemForm.tsx`
- `frontend/src/features/customer-items/components/CustomerItemDetailDialog.tsx`

**api.ts 拡張:**
```typescript
export interface CustomerItem {
  // ... 既存フィールド ...
  supplier_item_id: number | null;
  customer_part_no: string | null;
  // Enriched
  supplier_item_maker_part_no: string | null;
  supplier_item_product_name: string | null;
}

export interface CreateCustomerItemRequest {
  customer_id: number;
  customer_part_no: string;  // 必須に変更
  supplier_item_id?: number | null;
  // ...
}
```

**CustomerItemForm.tsx 拡張:**
```typescript
// 仕入先品目検索フィールド追加
<FormField
  control={control}
  name="supplier_item_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>仕入先品目</FormLabel>
      <Select
        value={field.value ? String(field.value) : ""}
        onValueChange={(value) => field.onChange(value ? Number(value) : null)}
      >
        <SelectTrigger>
          <SelectValue placeholder="仕入先品目を選択（任意）" />
        </SelectTrigger>
        <SelectContent>
          {supplierItems.map((si) => (
            <SelectItem key={si.id} value={String(si.id)}>
              {si.supplier_name} - {si.maker_part_no} ({si.product_name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormDescription>
        未設定の場合、引当処理は実行できません
      </FormDescription>
    </FormItem>
  )}
/>
```

**受け入れ条件:**
- [ ] 得意先品番マッピング画面で「仕入先品目」フィールドが表示される
- [ ] 仕入先品目は任意選択（後からマッピング可能）
- [ ] マッピング未設定の警告メッセージが表示される

---

#### タスク9: フロントエンド - 引当エラー表示（Phase 1I）

**変更ファイル:**
- `frontend/src/features/orders/components/OrderAllocationDialog.tsx`

**変更内容:**
```typescript
const handleAllocate = async () => {
  try {
    await allocateOrderItem(orderItem.id);
    toast.success("引当が完了しました");
  } catch (error) {
    if (error.message.includes("仕入先品目マッピングが未設定")) {
      toast.error(
        "仕入先品目マッピングが未設定です。得意先品番マッピング画面で設定してください。",
        { duration: 5000 }
      );
    } else if (error.message.includes("在庫が不足")) {
      toast.error("在庫が不足しています。入荷処理を実行してください。");
    } else {
      toast.error("引当処理に失敗しました");
    }
  }
};
```

**受け入れ条件:**
- [ ] マッピング未設定エラー時、適切なメッセージが表示される
- [ ] 在庫不足エラー時、適切なメッセージが表示される

---

#### タスク10: E2Eテスト（Phase 1J）

**ファイル:** `backend/tests/e2e/test_supplier_items_flow.py`（新規作成）

```python
def test_supplier_items_crud(client, db_session):
    """仕入先品目のCRUD操作テスト"""
    # 1. 作成
    create_payload = {
        "supplier_id": 1,
        "maker_part_no": "MPN-001",
        "product_name": "テスト商品",
        "base_unit": "pcs"
    }
    response = client.post("/api/masters/supplier-items", json=create_payload)
    assert response.status_code == 201
    supplier_item_id = response.json()["id"]

    # 2. 取得
    response = client.get(f"/api/masters/supplier-items/{supplier_item_id}")
    assert response.status_code == 200
    assert response.json()["maker_part_no"] == "MPN-001"

    # 3. 更新
    update_payload = {"product_name": "更新後商品名"}
    response = client.put(f"/api/masters/supplier-items/{supplier_item_id}", json=update_payload)
    assert response.status_code == 200
    assert response.json()["product_name"] == "更新後商品名"

    # 4. 削除
    response = client.delete(f"/api/masters/supplier-items/{supplier_item_id}")
    assert response.status_code == 204

def test_allocation_without_mapping(client, db_session):
    """マッピング未設定時の引当エラーテスト"""
    # customer_item作成（supplier_item_id = NULL）
    customer_item = create_test_customer_item(db_session, supplier_item_id=None)
    order_item = create_test_order_item(db_session, customer_item=customer_item)

    # 引当実行 → エラー
    response = client.post(f"/api/orders/{order_item.order_id}/allocate")
    assert response.status_code == 400
    assert "仕入先品目マッピングが未設定" in response.json()["detail"]

def test_allocation_with_mapping(client, db_session):
    """マッピング設定済みの引当成功テスト"""
    # supplier_item作成
    supplier_item = create_test_supplier_item(db_session, supplier_id=1, maker_part_no="MPN-001")
    # 在庫ロット作成
    lot = create_test_lot(db_session, supplier_item_id=supplier_item.id, quantity=100)
    # customer_item作成（マッピング設定）
    customer_item = create_test_customer_item(db_session, supplier_item_id=supplier_item.id)
    order_item = create_test_order_item(db_session, customer_item=customer_item, quantity=50)

    # 引当実行 → 成功
    response = client.post(f"/api/orders/{order_item.order_id}/allocate")
    assert response.status_code == 200

    # 引当結果確認
    allocations = db_session.query(Allocation).filter_by(order_item_id=order_item.id).all()
    assert len(allocations) == 1
    assert allocations[0].quantity == 50
    assert allocations[0].lot_id == lot.id
```

**受け入れ条件:**
- [ ] 仕入先品目のCRUD操作が正常動作する
- [ ] マッピング未設定時の引当エラーが正しく返る
- [ ] マッピング設定済み時の引当が正常動作する

---

### フェーズ2: フル対応（マッピング支援UI、検索性向上）

#### タスク11: マッピング支援UI（Phase 2A）

**新規作成ファイル:**
- `frontend/src/features/customer-items/components/SupplierItemMappingDialog.tsx`

**機能:**
- 未マッピングのcustomer_itemsを一覧表示
- 仕入先品目を検索して紐付け
- 一括マッピング機能

**受け入れ条件:**
- [ ] 未マッピング一覧が表示される
- [ ] 仕入先・メーカー品番で検索可能
- [ ] マッピング後、即座にリストから消える

---

#### タスク12: データ移行スクリプト（Phase 2B）

**ファイル:** `backend/scripts/migrate_product_to_supplier_items.py`（新規作成）

**機能:**
1. 既存 `products` から `supplier_items` へデータ移行
2. `customer_items.product_id` → `supplier_item_id` へマッピング
3. `lots.product_id` → `supplier_item_id` へマッピング

**擬似コード:**
```python
def migrate_products_to_supplier_items(db: Session):
    """既存productsをsupplier_itemsに移行"""
    products = db.query(Product).all()

    for product in products:
        # 1. supplier_item作成（supplier_idは既存のproduct.supplier_idから）
        supplier_item = SupplierItem(
            supplier_id=product.supplier_id or 1,  # デフォルト仕入先
            maker_part_no=product.maker_item_code or product.maker_part_code,
            product_name=product.product_name,
            base_unit=product.base_unit,
            # ...
        )
        db.add(supplier_item)
        db.flush()

        # 2. customer_items.supplier_item_id を設定
        customer_items = db.query(CustomerItem).filter_by(product_id=product.id).all()
        for ci in customer_items:
            ci.supplier_item_id = supplier_item.id

        # 3. lots.supplier_item_id を設定
        lots = db.query(Lot).filter_by(product_id=product.id).all()
        for lot in lots:
            lot.supplier_item_id = supplier_item.id

    db.commit()
```

**受け入れ条件:**
- [ ] 既存データが壊れない
- [ ] 移行後、引当処理が正常動作する
- [ ] ロールバック可能

---

#### タスク13: 旧テーブル廃止（Phase 2C）

**マイグレーション:** `backend/alembic/versions/YYYYMMDD_remove_product_id.py`

```python
def upgrade():
    # 1. 外部キー削除
    op.drop_constraint("fk_customer_items_product", "customer_items", type_="foreignkey")
    op.drop_constraint("fk_lots_product", "lots", type_="foreignkey")

    # 2. カラム削除
    op.drop_column("customer_items", "product_id")
    op.drop_column("lots", "product_id")

    # 3. products テーブルは残す（参照データとして）

def downgrade():
    # 逆戻し
    pass
```

**受け入れ条件:**
- [ ] 移行後、product_id参照が完全に除去される
- [ ] 既存機能が正常動作する

---

## 4. 受け入れ条件（Gherkin風）

### シナリオ1: 仕入先品目の登録と在庫管理

```gherkin
Feature: 仕入先品目マスタ管理

  Scenario: 新規仕入先品目を登録する
    Given 仕入先マスタに "仕入先A (SUP-001)" が存在する
    When 管理者が以下の情報で仕入先品目を登録する
      | 仕入先       | メーカー品番 | 商品名       | 基本単位 |
      | SUP-001      | MPN-12345    | テスト商品   | pcs      |
    Then 仕入先品目が正常に登録される
    And 仕入先品目一覧に "SUP-001 - MPN-12345" が表示される

  Scenario: 同一メーカー品番の重複登録を防ぐ
    Given 仕入先 "SUP-001" のメーカー品番 "MPN-12345" が既に登録されている
    When 管理者が同じ仕入先・メーカー品番で登録しようとする
    Then エラーメッセージ "既に登録されています" が表示される
    And 登録は失敗する
```

### シナリオ2: 得意先品番マッピングと引当

```gherkin
Feature: 得意先品番マッピングと引当処理

  Scenario: 仕入先品目マッピング未設定時の引当エラー
    Given 得意先 "得意先A" の先方品番 "CUST-001" が登録されている
    And "CUST-001" には仕入先品目がマッピングされていない
    When 管理者が受注 "ORD-001" の引当処理を実行する
    Then エラーメッセージ "仕入先品目マッピングが未設定です" が表示される
    And 引当処理は失敗する

  Scenario: 仕入先品目マッピング設定後の引当成功
    Given 仕入先品目 "SUP-001 - MPN-12345" が在庫 100個 で登録されている
    And 得意先品番 "CUST-001" が仕入先品目 "SUP-001 - MPN-12345" にマッピングされている
    And 受注 "ORD-001" に "CUST-001" が 50個 で登録されている
    When 管理者が受注 "ORD-001" の引当処理を実行する
    Then 引当が成功する
    And 在庫が 50個 減少する
    And 引当レコードが作成される
```

### シナリオ3: 入荷→在庫→引当→出荷→返品の一連フロー

```gherkin
Feature: 在庫管理フルサイクル

  Scenario: 入荷から返品までの正常フロー
    # 入荷
    Given 仕入先品目 "SUP-001 - MPN-12345" が登録されている
    When 管理者が以下の入荷を登録する
      | 仕入先品目          | ロット番号 | 数量  | 消費期限   |
      | SUP-001 - MPN-12345 | LOT-001    | 100   | 2026-12-31 |
    Then 在庫ロット "LOT-001" が 100個 で登録される

    # 引当
    Given 得意先品番 "CUST-001" が "SUP-001 - MPN-12345" にマッピングされている
    And 受注 "ORD-001" に "CUST-001" が 50個 で登録されている
    When 管理者が引当処理を実行する
    Then 引当が成功する
    And 在庫ロット "LOT-001" の残量が 50個 になる

    # 出荷
    When 管理者が出荷処理を実行する
    Then 出荷が成功する
    And 出荷履歴が記録される

    # 返品
    When 顧客が 10個 を返品する
    Then 在庫ロット "LOT-001" の残量が 60個 になる
    And 返品履歴が記録される
    And 返品在庫は特定の得意先に固定されない
```

---

## 5. リスクと移行方針

### 5.1 主要リスク

| リスク項目 | 深刻度 | 発生確率 | 対策 |
|-----------|--------|---------|------|
| 既存データとの整合性 | 高 | 中 | 段階移行（Phase 1では既存product_id残す、Phase 2で廃止） |
| 引当ロジックの破壊 | 高 | 中 | E2Eテスト強化、ステージング環境での検証 |
| マッピング作業の負荷 | 中 | 高 | マッピング支援UI提供、一括マッピング機能 |
| パフォーマンス劣化 | 中 | 低 | インデックス最適化、クエリチューニング |
| UI/UXの混乱 | 中 | 中 | 段階的リリース、ユーザーガイド提供 |

### 5.2 データ移行方針

**Phase 1 (最小リリース):**
- 既存 `products`, `customer_items.product_id`, `lots.product_id` は**残す**
- 新規作成する仕入先品目・得意先品番・在庫ロットから `supplier_item_id` を使用
- 既存データは暫定的に `product_id` で動作継続（引当は制限）

**Phase 2 (フル対応):**
- データ移行スクリプト実行（`products` → `supplier_items` へ変換）
- `customer_items.product_id` → `supplier_item_id` へマッピング
- `lots.product_id` → `supplier_item_id` へマッピング
- 移行完了後、`product_id` カラム削除

**ロールバック計画:**
- Phase 1: マイグレーション downgrade 実行（テーブル・カラム削除）
- Phase 2: 移行前のDB バックアップから復元

---

## 6. 最小リリースとフル対応の2段階プラン

### 6.1 Phase 1: 最小リリース（在庫・引当が正しく回る構成）

**目標:** 新規データから supplier_items 中心で運用開始

**含まれる機能:**
- ✅ supplier_items テーブル作成
- ✅ customer_items.supplier_item_id 追加（NULL許容）
- ✅ lots.supplier_item_id 追加（NULL許容）
- ✅ 仕入先品目マスタCRUD API/UI
- ✅ 得意先品番マッピングでsupplier_item選択可能
- ✅ 引当ロジックでマッピングチェック（未設定エラー）
- ✅ E2Eテスト（基本フロー）

**含まれない機能:**
- ❌ 既存データの移行（手動マッピングは可）
- ❌ マッピング支援UI（一括変換）
- ❌ product_id の廃止

**リリース判断基準:**
- [ ] 新規仕入先品目で入荷→在庫→引当→出荷が正常動作
- [ ] 既存データは従来通り動作（product_id経由）
- [ ] マッピング未設定時のエラーメッセージが適切
- [ ] パフォーマンス劣化なし（クエリ実行時間 < 200ms）

**想定期間:** 4週間
- Week 1: DB/モデル/スキーマ実装（タスク1-3）
- Week 2: サービス/API実装（タスク4-6）
- Week 3: フロントエンド実装（タスク7-9）
- Week 4: テスト・バグフィx（タスク10）

---

### 6.2 Phase 2: フル対応（マッピング支援、検索性向上、旧データ廃止）

**目標:** 全データを supplier_items 中心に統一

**含まれる機能:**
- ✅ マッピング支援UI（未マッピング一覧、検索、一括マッピング）
- ✅ データ移行スクリプト（products → supplier_items）
- ✅ product_id カラム削除
- ✅ 検索性向上（仕入先・メーカー品番での横断検索）
- ✅ 返品処理の最適化

**リリース判断基準:**
- [ ] 全既存データが supplier_items にマッピング済み
- [ ] product_id 参照がゼロ（コードベース検索で0件）
- [ ] 移行後の引当処理が正常動作（E2Eテスト100%通過）
- [ ] ロールバック可能（バックアップ確認済み）

**想定期間:** 3週間
- Week 1: マッピング支援UI実装（タスク11）
- Week 2: データ移行スクリプト実装・検証（タスク12）
- Week 3: 旧カラム廃止・最終テスト（タスク13）

---

## 7. 要確認リスト（不明点・推測事項）

### 7.1 ビジネスルール確認事項

1. **返品時の在庫の扱い**
   - 返品在庫は元のロットに戻すか、新ロット作成か？
   - 返品在庫の消費期限は返品日基準で再計算するか？
   - 返品在庫は特定の得意先に固定しないことは確定（自由在庫に戻す）

2. **マッピングの必須タイミング**
   - 受注登録時にマッピング必須とするか、引当時まで許容するか？
   - 現状仕様: 引当時まで許容（Phase 1）

3. **仕入先品目の重複**
   - 同一メーカー品番で複数仕入先から調達するケースはあるか？
   - 現状仕様: `UNIQUE(supplier_id, maker_part_no)` で仕入先ごとに一意

### 7.2 技術仕様確認事項

1. **既存 products テーブルの扱い**
   - Phase 2で完全削除するか、参照データとして残すか？
   - 推測: 参照データとして残す（履歴データ保護）

2. **OrderItem の外部キー**
   - `order_items.product_id` も `customer_item_id` に変更するか？
   - 推測: Phase 2で変更（現状は product_id 残す）

3. **パフォーマンス要件**
   - 引当処理の許容時間は？（現状: < 200ms 想定）
   - 一覧取得のページネーション最大件数は？（現状: 1000件想定）

4. **Soft Delete の扱い**
   - supplier_items も SoftDeleteMixin を継承するか？
   - 推測: Yes（既存マスタと同様）

---

## 8. 実装優先順位（推奨）

### 最優先（Phase 1 Week 1-2）
1. ✅ タスク1: DBマイグレーション
2. ✅ タスク2: バックエンドモデル定義
3. ✅ タスク3: Pydanticスキーマ定義
4. ✅ タスク4: サービス層実装
5. ✅ タスク5: API ルーター実装

### 高優先（Phase 1 Week 3-4）
6. ✅ タスク6: 引当ロジック拡張
7. ✅ タスク7: フロントエンド - 仕入先品目マスタ画面
8. ✅ タスク8: フロントエンド - 得意先品番マッピング画面拡張
9. ✅ タスク9: フロントエンド - 引当エラー表示
10. ✅ タスク10: E2Eテスト

### 中優先（Phase 2）
11. ⚠️ タスク11: マッピング支援UI
12. ⚠️ タスク12: データ移行スクリプト

### 低優先（Phase 2 最終）
13. ⚠️ タスク13: 旧テーブル廃止

---

## 9. まとめ

本計画は、**段階導入**により破壊的変更を最小限に抑え、既存システムを稼働させながら新アーキテクチャへ移行する戦略です。

**Phase 1 (4週間)** で最小限の機能を提供し、**Phase 2 (3週間)** で完全移行を達成します。各タスクは独立性が高く、並行開発も可能です。

リスク管理として、各フェーズで E2E テストを実施し、ロールバック可能な状態を維持します。

---

**最終更新:** 2026-01-19
**承認待ち:** ビジネスルール確認事項（セクション7.1）
