# supplier_items / customer_items 統合移行計画 v2.1

## 📌 v2.1 最終決定事項（変更不可）

本計画書は以下の最終決定に基づき作成されています。代替案提案は不要です。

### 1. 主キー設計
- ✅ **customer_items の主キーは現状維持**（複合PK: `customer_id, external_product_code`）
- ❌ surrogate key (id) 追加・PK移行は今回一切行わない
- 理由: 既存 FK 参照への影響を回避、段階的導入を優先

### 2. 引当検証戦略
- ✅ **Phase 1 から未マッピング時は即座にブロック**（警告のみで継続しない）
- ✅ 例外運用が必要な場合は、管理者 override を明示的に別ボタン/別 API で設ける
- 理由: 運用破綻リスクの回避、データ整合性の確保

### 3. supplier_item_id の Single Source of Truth
- ✅ **lot_receipts.supplier_item_id が真実**
- ❌ lot_master.supplier_item_id は追加しない（または派生 read-only 扱いで更新禁止）
- 理由: データの二重管理を避け、lot_receipts を SSOT とする

### 4. external_product_code の定義
- ✅ **external_product_code は「得意先品番」として扱う**
- order_lines.external_product_code: OCR取込時の「得意先品番」
- customer_items.external_product_code: 主キーの一部（同じ意味）
- 【要確認】: 実装時に意味が異なる場合のみ別途提案

---

## 概要

本計画は、ロット管理システムを **product_id 中心** から **supplier_items + customer_items 二重キー** モデルに移行します。

### 目的

- **入荷・在庫**: `(supplier_id, maker_part_no)` → supplier_items でキー管理
- **受注・出荷**: `(customer_id, external_product_code)` → customer_items でキー管理
- **橋渡し**: `customer_items.supplier_item_id` (nullable) で両者を接続
- **制約**: 在庫操作時に `supplier_item_id` が NULL なら **Phase 1 から即座にブロック**

### 後方互換性

Phase 1/2 では `products` テーブルと `product_id` を残し、段階的に移行します。

---

## 現状分析

### 重要な発見

1. **customer_items テーブルは既に存在** (v2.1から)
   - PK: `(customer_id, external_product_code)`（**v2.1: 変更しない**）
   - FK: `product_id` → products(id)
   - **不足**: `supplier_item_id` FK がない

2. **external_product_code が得意先品番**（**v2.1: 確定**）
   - order_lines.external_product_code: OCR取込時の「得意先品番」
   - customer_items.external_product_code: 主キーの一部（同じ意味）

3. **lot_receipts に maker_part_no 列がない**
   - lot_master + lot_receipts 構造
   - lot_master: UNIQUE(lot_number, product_id)
   - フォールバック: products.maker_part_code を使用

4. **product_id 依存が広範囲**
   - Backend: FEFO allocation, 在庫照会, RPA
   - Frontend: 受注詳細, 在庫一覧, マスタ管理

### Gap Analysis

| 項目 | 現状 | 要求 | 対応 |
|------|------|------|------|
| 入荷キー | lot_number + product_id | supplier_id + maker_part_no | supplier_items 新規作成 |
| 受注キー | customer_id + external_product_code | 同じ | customer_items 既存 ✓ |
| マッピング | customer_items → product_id | customer_items → supplier_item_id | FK列追加 |
| ロット保存 | lot_receipts.product_id | lot_receipts.supplier_item_id (SSOT) | FK列追加 |
| 引当検証 | なし | supplier_item_id NULL なら Phase 1 からブロック | サービス層ロジック |

---

## Phase 0: DDL準備（データベーススキーマ変更）

### 目標

既存コードを壊さずにスキーマを拡張（全列 NULL = 動作変更なし）

### 0-1: supplier_items テーブル作成

**Migration**: `backend/alembic/versions/004_create_supplier_items.py`

```sql
CREATE TABLE supplier_items (
    id                  BIGSERIAL PRIMARY KEY,
    supplier_id         BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    maker_part_no       VARCHAR(100) NOT NULL,

    -- 後方互換用（将来的に廃止予定）
    product_id          BIGINT NULL REFERENCES products(id) ON DELETE SET NULL,

    display_name        VARCHAR(200) NULL,
    base_unit           VARCHAR(20) NULL,
    notes               TEXT NULL,

    valid_to            DATE NOT NULL DEFAULT '9999-12-31',
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_supplier_items_supplier_maker UNIQUE (supplier_id, maker_part_no),
    CONSTRAINT chk_supplier_items_maker_part_no CHECK (maker_part_no <> '')
);

CREATE INDEX idx_supplier_items_supplier ON supplier_items (supplier_id);
CREATE INDEX idx_supplier_items_product ON supplier_items (product_id);
CREATE INDEX idx_supplier_items_maker_part ON supplier_items (maker_part_no);
CREATE INDEX idx_supplier_items_valid_to ON supplier_items (valid_to);
```

**完了条件**:
- Migration 実行成功
- UNIQUE 制約が機能（重複挿入でエラー）

---

### 0-2: 既存テーブルへの FK 列追加

**Migration**: `backend/alembic/versions/005_add_supplier_item_refs.py`

```sql
-- customer_items に supplier_item_id 追加
-- v2.1 決定: PK は複合PK (customer_id, external_product_code) のまま維持
ALTER TABLE customer_items
    ADD COLUMN supplier_item_id BIGINT NULL
    REFERENCES supplier_items(id) ON DELETE SET NULL;
CREATE INDEX idx_customer_items_supplier_item ON customer_items (supplier_item_id);

-- lot_receipts に supplier_item_id 追加（v2.1: SSOT）
ALTER TABLE lot_receipts
    ADD COLUMN supplier_item_id BIGINT NULL
    REFERENCES supplier_items(id) ON DELETE SET NULL;
CREATE INDEX idx_lot_receipts_supplier_item ON lot_receipts (supplier_item_id);

-- v2.1 決定: lot_master には supplier_item_id を追加しない
-- 理由: lot_receipts が SSOT、lot_master は派生的に参照のみ
```

**完了条件**:
- customer_items, lot_receipts に列追加成功
- 既存テスト全てパス（NULL のため影響なし）
- **lot_master.supplier_item_id は存在しない**（v2.1 確定）

**v2.1 決定事項**:
- customer_items の PK は**変更しない**（複合 PK のまま維持）
- surrogate key (id 列) は**追加しない**（既存 FK 参照への影響を回避）
- lot_master.supplier_item_id は**追加しない**（lot_receipts が SSOT）

---

## Phase 0.5: Pre-deployment Preparation（新規追加）

### 目標

Phase 1 デプロイ前にマッピング率 80%+ を達成し、引当ブロックの影響を最小化

### 0.5-1: Backfill Script 実行

**対象**: 既存の lot_receipts から supplier_items を逆生成

**実行手順**:
```bash
# 1. Dry-run で確認
docker compose exec backend python -m alembic.manual_scripts.backfill_supplier_items --dry-run

# 2. 本番実行
docker compose exec backend python -m alembic.manual_scripts.backfill_supplier_items

# 3. 結果確認
docker compose exec backend python -m scripts.check_backfill_result
```

**完了条件**:
- lot_receipts の 95%+ に supplier_item_id が付与される
- エラーなく完了

---

### 0.5-2: 自動マッピング実行

**対象**: customer_items.maker_part_no と supplier_items.maker_part_no が完全一致する場合

**実行手順**:
```bash
# 自動マッピング実行
curl -X POST http://localhost:8000/api/v2/customer-items/auto-map \
  -H "Content-Type: application/json" \
  -d '{"match_by": "maker_part_no", "confidence": "high"}'

# 結果確認
curl http://localhost:8000/api/v2/customer-items/mapping-stats
```

**完了条件**:
- マッピング率 >= 60%（自動マッピングのみで達成）

---

### 0.5-3: 手動マッピングスプリント

**対象**: 自動マッピングで対応できなかった customer_items

**実行手順**:
```bash
# 1. 未マッピング一覧を出力
curl http://localhost:8000/api/v2/customer-items/unmapped > unmapped.json

# 2. 業務担当者に共有し、手動マッピングを依頼
# マッピング管理 UI: http://localhost:3000/masters/customer-items/mapping

# 3. マッピング率を監視
watch -n 60 'curl -s http://localhost:8000/api/v2/customer-items/mapping-stats | jq .mapping_rate'
```

**完了条件**:
- マッピング率 >= 80%
- 直近30日の受注で未マッピングが 0 件
- 業務担当者の承認取得

---

### 0.5-4: Phase 1 デプロイ可否判断

**チェックリスト**:
- [ ] マッピング率 >= 80%
- [ ] 直近30日の受注で未マッピングが 0 件
- [ ] 未マッピング一覧 API が動作
- [ ] マッピング管理 UI が動作
- [ ] 業務担当者の承認取得
- [ ] ロールバック手順の確認

**Phase 1 デプロイ GO/NO-GO 判断**:
- GO: 上記チェックリスト全て ✓
- NO-GO: Phase 0.5-3 に戻り、手動マッピングを継続

---

## Phase 1: 新規データから supplier_items 起点で動作

### 目標

新規入荷データが supplier_items 経由で保存され、**未マッピング時は Phase 1 から即座にブロック**

### 1-1: Backend Models 追加

**新規ファイル**:
- `backend/app/infrastructure/persistence/models/supplier_item_model.py`
- `backend/app/presentation/schemas/masters/supplier_items_schema.py`

**Model 実装**:
```python
from sqlalchemy import BigInteger, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base_model import Base
from .soft_delete_mixin import SoftDeleteMixin

class SupplierItem(SoftDeleteMixin, Base):
    """仕入先品目マスタ"""
    __tablename__ = "supplier_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    supplier_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False
    )
    maker_part_no: Mapped[str] = mapped_column(String(100), nullable=False)
    product_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    base_unit: Mapped[str | None] = mapped_column(String(20), nullable=True)

    __table_args__ = (
        UniqueConstraint("supplier_id", "maker_part_no", name="uq_supplier_items_supplier_maker"),
    )

    # Relationships
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="supplier_items")
    product: Mapped["Product | None"] = relationship("Product", back_populates="supplier_items")
    customer_items: Mapped[list["CustomerItem"]] = relationship("CustomerItem", back_populates="supplier_item")
    lot_receipts: Mapped[list["LotReceipt"]] = relationship("LotReceipt", back_populates="supplier_item")
    # lot_master への relationship は追加しない（v2.1 決定）
```

**完了条件**: SQLAlchemy model として動作、型エラー 0 件

---

### 1-2: Repository 追加

**新規ファイル**: `backend/app/infrastructure/persistence/repositories/supplier_item_repository.py`

```python
class SupplierItemRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_supplier_and_part_no(
        self, supplier_id: int, maker_part_no: str
    ) -> SupplierItem | None:
        """既存の supplier_item を取得（有効なもののみ）"""
        return self.db.query(SupplierItem).filter(
            SupplierItem.supplier_id == supplier_id,
            SupplierItem.maker_part_no == maker_part_no,
            SupplierItem.is_active()  # SoftDeleteMixin
        ).first()

    def get_or_create(
        self, supplier_id: int, maker_part_no: str, product_id: int | None = None
    ) -> SupplierItem:
        """既存取得 or 新規作成（冪等性保証）"""
        existing = self.get_by_supplier_and_part_no(supplier_id, maker_part_no)
        if existing:
            return existing

        new_item = SupplierItem(
            supplier_id=supplier_id,
            maker_part_no=maker_part_no,
            product_id=product_id
        )
        self.db.add(new_item)
        self.db.flush()
        return new_item
```

**完了条件**:
- `get_or_create` が冪等（2回呼んでも同じ結果）
- UNIQUE 制約違反を防ぐ

---

### 1-3: 入荷サービス修正

**対象ファイル**: `backend/app/application/services/inventory/inbound_receiving_service.py`

**修正箇所**: L94-97 付近の `_get_or_create_lot_master()` 呼び出し前

```python
def _process_inbound_line(self, plan, line):
    # 【新規追加】supplier_item を取得 or 作成
    maker_part_no = self._extract_maker_part_no(line, plan.supplier_id)
    supplier_item = self._get_or_create_supplier_item(
        supplier_id=plan.supplier_id,
        maker_part_no=maker_part_no,
        product_id=line.product_id
    )

    # lot_master 取得（既存、supplier_item_id は渡さない - v2.1 決定）
    lm = self._get_or_create_lot_master(
        lot_number=line.lot_number,
        product_id=line.product_id,
        supplier_id=plan.supplier_id
        # supplier_item_id は渡さない（lot_receipts が SSOT）
    )

    # lot_receipt 作成（supplier_item_id を設定 = SSOT）
    db_lot = LotReceipt(
        lot_master_id=lm.id,
        supplier_item_id=supplier_item.id,  # 【v2.1: ここが真実】
        product_id=line.product_id,
        supplier_id=plan.supplier_id,
        # ... その他の列
    )
```

**新規メソッド**:
```python
def _extract_maker_part_no(self, line, supplier_id: int) -> str:
    """
    maker_part_no を抽出（フォールバック戦略: product.maker_part_code を使用）

    優先順位:
    1. line.maker_part_no（もし入荷データに含まれていれば）
    2. product.maker_part_code（フォールバック、推奨）
    3. エラー（どちらも取得できない場合）
    """
    if hasattr(line, 'maker_part_no') and line.maker_part_no:
        return line.maker_part_no

    # フォールバック: product.maker_part_code を使用
    if line.product_id:
        product = self.db.query(Product).get(line.product_id)
        if product and product.maker_part_code:
            return product.maker_part_code

    raise ValueError(
        f"Cannot determine maker_part_no for line {line}: "
        "No maker_part_no in line data and product.maker_part_code is NULL"
    )

def _get_or_create_supplier_item(
    self, supplier_id: int, maker_part_no: str, product_id: int | None
) -> SupplierItem:
    """入荷時の supplier_item 取得・作成"""
    repo = SupplierItemRepository(self.db)
    return repo.get_or_create(supplier_id, maker_part_no, product_id)
```

**完了条件**:
- 新規入荷時に `supplier_items` レコードが自動作成される
- `lot_receipts.supplier_item_id` に値が入る（SSOT）
- `lot_master.supplier_item_id` は更新されない（v2.1 決定）

---

### 1-4: API Endpoints 追加

**新規ファイル**: `backend/app/presentation/routers/masters/supplier_items_router.py`

```python
from fastapi import APIRouter, Depends
from app.application.services.masters.supplier_item_service import SupplierItemService

router = APIRouter(prefix="/api/v2/supplier-items", tags=["supplier-items"])

@router.get("/")
def list_supplier_items(
    supplier_id: int | None = None,
    maker_part_no: str | None = None,
    service: SupplierItemService = Depends()
):
    """supplier_items 一覧取得"""
    return service.list_items(supplier_id=supplier_id, maker_part_no=maker_part_no)

@router.post("/")
def create_supplier_item(
    data: SupplierItemCreate,
    service: SupplierItemService = Depends()
):
    """supplier_item 新規作成"""
    return service.create(data)

@router.get("/{item_id}")
def get_supplier_item(item_id: int, service: SupplierItemService = Depends()):
    """supplier_item 詳細取得"""
    return service.get_by_id(item_id)
```

**完了条件**:
- OpenAPI docs で確認可能
- GET/POST 動作確認

---

### 1-5: 引当時の検証追加（v2.1: Phase 1 から即座にブロック）

**対象ファイル**: `backend/app/application/services/orders/order_service.py`

**v2.1 決定**: 警告のみで継続せず、Phase 1 から即座にブロック

```python
def allocate_order_lines(self, order_id: int):
    """
    受注明細の引当処理（v2.1: Phase 1 から未マッピング時にブロック）

    Raises:
        AllocationBlockedError: supplier_item_id が未マッピングの場合
    """
    order = self.order_repo.get_by_id(order_id)

    for line in order.order_lines:
        # 【v2.1: Phase 1 から即座にブロック】
        validation_result = self._validate_line_for_allocation(line)
        if not validation_result.is_valid:
            raise AllocationBlockedError(
                f"Order line {line.id} (external_product_code: {line.external_product_code}) "
                f"cannot be allocated: {validation_result.reason}. "
                f"Please map this customer item to a supplier item at /masters/customer-items/mapping"
            )

        # supplier_item_id を取得
        customer_item = self._get_customer_item_for_line(line)
        if not customer_item or not customer_item.supplier_item_id:
            raise AllocationBlockedError(
                f"Order line {line.id}: customer_item not found or supplier_item_id is NULL"
            )

        # Phase 1 から supplier_item_id ベースで引当
        self._allocate_line_by_supplier_item(line, customer_item.supplier_item_id)
```

**新規メソッド**:
```python
def _validate_line_for_allocation(self, line: OrderLine) -> ValidationResult:
    """引当可能かチェック（v2.1: Phase 1 から必須）"""
    if not line.product_id:
        return ValidationResult(False, "product_id not resolved")

    # customer_item からマッピング確認（v2.1: external_product_code = 得意先品番）
    customer_item = self.customer_item_repo.find_by_customer_and_part_no(
        customer_id=line.order.customer_id,
        external_product_code=line.external_product_code
    )

    if not customer_item:
        return ValidationResult(False, "customer_item not found")

    if not customer_item.supplier_item_id:
        return ValidationResult(False, "supplier_item_id not mapped")

    return ValidationResult(True, None)

def _get_customer_item_for_line(self, line: OrderLine) -> CustomerItem | None:
    """受注明細から customer_item を取得"""
    return self.customer_item_repo.find_by_customer_and_part_no(
        customer_id=line.order.customer_id,
        external_product_code=line.external_product_code
    )
```

**完了条件**:
- 未マッピング時に `AllocationBlockedError` が発生（Phase 1 から）
- エラーメッセージに導線 URL (`/masters/customer-items/mapping`) を含む

---

### 1-6: 未マッピング一覧 API（Phase 1.5 から前倒し）

**理由**: Phase 1 で引当をブロックするため、ブロック直後にマッピング手段が必要

**新規ファイル**: `backend/app/presentation/routers/masters/customer_items_router.py`（拡張）

```python
@router.get("/api/v2/customer-items/unmapped")
def get_unmapped_customer_items(
    customer_id: int | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    未マッピングの customer_items を取得（Phase 1 必須）

    Returns:
        {
            "items": [
                {
                    "customer_id": 1,
                    "customer_name": "得意先A",
                    "external_product_code": "CUST-001",  # v2.1: 得意先品番
                    "description": "商品名",
                    "product_id": 123,
                    "supplier_item_id": null,  # ← NULL が問題
                    "maker_part_no": "MAKER-001"
                }
            ],
            "total": 50,
            "unmapped_count": 50
        }
    """
    query = db.query(CustomerItem).filter(
        CustomerItem.supplier_item_id.is_(None),
        CustomerItem.valid_to == date(9999, 12, 31)
    )

    if customer_id:
        query = query.filter(CustomerItem.customer_id == customer_id)

    total = query.count()
    items = query.offset(offset).limit(limit).all()

    return {
        "items": [serialize_customer_item(item) for item in items],
        "total": total,
        "unmapped_count": total
    }

@router.post("/api/v2/customer-items/suggest-mappings")
def suggest_mappings(
    request: SuggestMappingRequest,
    db: Session = Depends(get_db)
):
    """
    マッピング候補を提案（maker_part_no で一致検索）
    """
    customer_item = db.query(CustomerItem).filter(
        CustomerItem.customer_id == request.customer_id,
        CustomerItem.external_product_code == request.external_product_code
    ).first()

    if not customer_item:
        return {"suggestions": []}

    # maker_part_no で supplier_items を検索
    candidates = db.query(SupplierItem).filter(
        SupplierItem.maker_part_no == customer_item.maker_part_no,
        SupplierItem.valid_to == date(9999, 12, 31)
    ).all()

    return {
        "suggestions": [
            {
                "supplier_item_id": si.id,
                "supplier_id": si.supplier_id,
                "supplier_name": si.supplier.supplier_name,
                "maker_part_no": si.maker_part_no,
                "confidence": "high"  # 完全一致なので高信頼
            }
            for si in candidates
        ]
    }

@router.patch("/api/v2/customer-items/{customer_id}/{external_product_code}/map")
def update_mapping(
    customer_id: int,
    external_product_code: str,
    request: UpdateMappingRequest,
    db: Session = Depends(get_db)
):
    """customer_item の supplier_item_id を更新"""
    customer_item = db.query(CustomerItem).filter(
        CustomerItem.customer_id == customer_id,
        CustomerItem.external_product_code == external_product_code
    ).first()

    if not customer_item:
        raise HTTPException(404, "Customer item not found")

    supplier_item = db.query(SupplierItem).get(request.supplier_item_id)
    if not supplier_item:
        raise HTTPException(404, "Supplier item not found")

    customer_item.supplier_item_id = request.supplier_item_id
    db.commit()

    return {"message": "Mapping updated successfully"}

@router.get("/api/v2/customer-items/mapping-stats")
def get_mapping_stats(db: Session = Depends(get_db)):
    """マッピング率統計取得"""
    total = db.query(CustomerItem).filter(
        CustomerItem.valid_to == date(9999, 12, 31)
    ).count()

    mapped = db.query(CustomerItem).filter(
        CustomerItem.supplier_item_id.isnot(None),
        CustomerItem.valid_to == date(9999, 12, 31)
    ).count()

    return {
        "total": total,
        "mapped": mapped,
        "unmapped": total - mapped,
        "mapping_rate": round(mapped / total * 100, 2) if total > 0 else 0
    }
```

**完了条件**:
- Phase 1 デプロイ時に API が利用可能
- `/api/v2/customer-items/unmapped` が未マッピング一覧を返す
- マッピング更新 API が動作

---

### 1-7: Frontend 型定義更新

**対象ファイル**: `frontend/src/types/generated.ts`

**実行手順**:
1. Backend で OpenAPI schema 更新
2. `cd frontend && npm run typegen`
3. 新しい型（SupplierItem）が生成されることを確認

**完了条件**: TypeScript エラー 0 件

---

### 1-8: マッピング管理 UI（Phase 1.5 から前倒し）

**理由**: Phase 1 で引当ブロックするため、UI も Phase 1 で必須

**新規ファイル**: `frontend/src/features/customer-items/components/MappingManagerPage.tsx`

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/http-client';
import { Table, Select, Button, Badge, Alert, AlertCircle } from '@/components/ui';

export function MappingManagerPage() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 50;

  // 未マッピング一覧取得
  const { data: unmappedData, isLoading } = useQuery({
    queryKey: ['unmapped-customer-items', currentPage],
    queryFn: () => api.get('/api/v2/customer-items/unmapped', {
      searchParams: { limit, offset: (currentPage - 1) * limit }
    }).json()
  });

  // マッピング率取得
  const { data: stats } = useQuery({
    queryKey: ['mapping-stats'],
    queryFn: () => api.get('/api/v2/customer-items/mapping-stats').json()
  });

  if (isLoading) return <div>読み込み中...</div>;

  const totalPages = Math.ceil((unmappedData?.total || 0) / limit);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">得意先品番マッピング管理</h1>
        <div className="flex gap-2">
          <Badge variant="warning">
            未マッピング: {unmappedData?.unmapped_count || 0} 件
          </Badge>
          <Badge variant="info">
            マッピング率: {stats?.mapping_rate || 0}%
          </Badge>
        </div>
      </div>

      <Alert variant="info" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <p>
          仕入先品目がマッピングされていない得意先品番は引当できません（Phase 1 から即座にブロック）。
          各行で候補を選択して保存してください。
        </p>
      </Alert>

      <Table>
        <thead>
          <tr>
            <th>得意先</th>
            <th>得意先品番</th>
            <th>品名</th>
            <th>メーカー品番</th>
            <th>仕入先品目候補</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {unmappedData?.items.map(item => (
            <MappingRow
              key={`${item.customer_id}-${item.external_product_code}`}
              item={item}
            />
          ))}
        </tbody>
      </Table>

      {/* ページネーション */}
      <div className="flex justify-center gap-2 mt-4">
        <Button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => p - 1)}
        >
          前へ
        </Button>
        <span>{currentPage} / {totalPages}</span>
        <Button
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(p => p + 1)}
        >
          次へ
        </Button>
      </div>
    </div>
  );
}

function MappingRow({ item }) {
  const queryClient = useQueryClient();
  const [selectedSupplierItemId, setSelectedSupplierItemId] = useState(null);

  // マッピング候補取得
  const { data: suggestions } = useQuery({
    queryKey: ['mapping-suggestions', item.customer_id, item.external_product_code],
    queryFn: () => api.post('/api/v2/customer-items/suggest-mappings', {
      json: {
        customer_id: item.customer_id,
        external_product_code: item.external_product_code
      }
    }).json()
  });

  // マッピング更新
  const updateMutation = useMutation({
    mutationFn: (supplierItemId) =>
      api.patch(
        `/api/v2/customer-items/${item.customer_id}/${item.external_product_code}/map`,
        { json: { supplier_item_id: supplierItemId } }
      ).json(),
    onSuccess: () => {
      queryClient.invalidateQueries(['unmapped-customer-items']);
      queryClient.invalidateQueries(['mapping-stats']);
      alert('マッピングを保存しました');
    },
    onError: (error) => {
      alert(`エラー: ${error.message}`);
    }
  });

  return (
    <tr>
      <td>{item.customer_name}</td>
      <td>
        <code className="text-sm">{item.external_product_code}</code>
      </td>
      <td>{item.description}</td>
      <td>{item.maker_part_no || '-'}</td>
      <td>
        <Select
          value={selectedSupplierItemId}
          onValueChange={setSelectedSupplierItemId}
        >
          <option value="">候補を選択...</option>
          {suggestions?.suggestions.map(si => (
            <option key={si.supplier_item_id} value={si.supplier_item_id}>
              {si.maker_part_no} ({si.supplier_name}) [{si.confidence}]
            </option>
          ))}
        </Select>
      </td>
      <td>
        <Button
          disabled={!selectedSupplierItemId || updateMutation.isLoading}
          onClick={() => updateMutation.mutate(selectedSupplierItemId)}
        >
          保存
        </Button>
      </td>
    </tr>
  );
}
```

**完了条件**:
- Phase 1 デプロイ時に UI が利用可能
- 未マッピング一覧が表示される
- 候補選択・保存が動作
- マッピング率がリアルタイムで表示される

---

### 1-9: 引当エラー表示（Phase 2.5 から前倒し）

**理由**: Phase 1 で引当ブロックするため、エラー表示も Phase 1 で必要

**対象ファイル**: `frontend/src/features/orders/components/OrderLineCard.tsx`

```tsx
import { Alert, AlertCircle, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

export function OrderLineCard({ orderLine }: { orderLine: OrderLine }) {
  // 引当可否の判定（Phase 1 から）
  const isAllocationReady = orderLine.supplier_item_id !== null;
  const blockReason = !isAllocationReady ? 'supplier_item_not_mapped' : null;

  return (
    <Card>
      {/* 既存の表示 */}
      <div className="p-4">
        <p>得意先品番: {orderLine.external_product_code}</p>
        <p>数量: {orderLine.order_quantity}</p>
        {/* ... その他の情報 */}
      </div>

      {/* Phase 1 から引当可否の表示 */}
      {!isAllocationReady && (
        <Alert variant="warning" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>引当不可（Phase 1 からブロック）</AlertTitle>
          <AlertDescription>
            {blockReason === 'supplier_item_not_mapped' ? (
              <>
                この明細は仕入先品目がマッピングされていないため、引当できません。
                <Link
                  href="/masters/customer-items/mapping"
                  className="underline ml-1"
                >
                  マッピング管理画面
                </Link>
                で設定してください。
              </>
            ) : (
              blockReason
            )}
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}
```

**完了条件**:
- 未マッピング時に警告表示
- マッピング管理画面へのリンクが動作
- Phase 1 デプロイ時に利用可能

---

## Phase 1.5: 既存データ Backfill（工数削減）

### 目標

Phase 0.5 で実施済みの Backfill を検証し、マッピング率を維持

### 1.5-1: Backfill 結果検証

**実行手順**:
```bash
# Backfill 結果確認
docker compose exec backend python -m scripts.check_backfill_result

# マッピング率確認
curl http://localhost:8000/api/v2/customer-items/mapping-stats
```

**完了条件**:
- lot_receipts の 95%+ に supplier_item_id が付与されている
- マッピング率が 80%+ を維持

---

### 1.5-2: マッピング率監視

**対象**: マッピング率が 80% を下回った場合の対応

**実行手順**:
```bash
# マッピング率を定期監視
watch -n 300 'curl -s http://localhost:8000/api/v2/customer-items/mapping-stats | jq .mapping_rate'

# 閾値を下回った場合、未マッピング一覧を確認
if [ $(curl -s http://localhost:8000/api/v2/customer-items/mapping-stats | jq .mapping_rate) -lt 80 ]; then
  curl http://localhost:8000/api/v2/customer-items/unmapped > unmapped_$(date +%Y%m%d).json
  echo "マッピング率が 80% を下回りました。手動マッピングを実施してください。"
fi
```

**完了条件**: マッピング率が常に 80%+ を維持

---

## Phase 2: Allocation を supplier_item_id ベースに最適化

### 目標

引当処理を完全に `supplier_item_id` ベースに切り替え、パフォーマンスを最適化

### 2-1: Allocation Candidate Service 最適化

**対象ファイル**: `backend/app/application/services/allocations/candidate_service.py`

**v2.1 変更**: `product_id` パラメータを削除、`supplier_item_id` 必須化

```python
def get_candidates(
    self,
    supplier_item_id: int,  # v2.1: 必須（product_id は削除）
    *,
    policy: AllocationPolicy,
    warehouse_id: int | None = None,
    lock_mode: LockMode = LockMode.NONE,
    exclude_expired: bool = True,
    safety_days: int = 0,
) -> list[LotCandidate]:
    """
    割当候補を取得（v2.1: supplier_item_id 必須）

    Args:
        supplier_item_id: 仕入先品目ID（必須）

    Raises:
        ValueError: supplier_item_id が None の場合
    """
    if supplier_item_id is None:
        raise ValueError("supplier_item_id is required (v2.1)")

    # supplier_item_id ベースで検索（product_id フォールバックなし）
    return self._repo.get_allocatable_by_supplier_item(
        supplier_item_id=supplier_item_id,
        policy=policy,
        warehouse_id=warehouse_id,
        lock_mode=lock_mode,
        exclude_expired=exclude_expired,
        safety_days=safety_days,
    )
```

**完了条件**:
- `product_id` パラメータが削除されている
- `supplier_item_id` が必須
- Phase 1 から動作

---

### 2-2: Lot Repository に新規メソッド追加

**対象ファイル**: `backend/app/infrastructure/persistence/repositories/lot_repository.py`

```python
def get_allocatable_by_supplier_item(
    self,
    supplier_item_id: int,
    policy: AllocationPolicy,
    warehouse_id: int | None = None,
    exclude_expired: bool = True,
    safety_days: int = 0,
    lock_mode: LockMode = LockMode.NONE,
) -> list[LotReceipt]:
    """
    supplier_item_id で引当可能ロットを取得（v2.1: SSOT）

    FEFO: expiry_date ASC, received_date ASC, id ASC
    FIFO: received_date ASC, id ASC
    """
    # v2.1: lot_receipts.supplier_item_id が SSOT
    query = self.db.query(LotReceipt).filter(
        LotReceipt.supplier_item_id == supplier_item_id,
        LotReceipt.status == 'active',
        LotReceipt.current_quantity > 0,
    )

    if warehouse_id:
        query = query.filter(LotReceipt.warehouse_id == warehouse_id)

    if exclude_expired:
        from datetime import date, timedelta
        cutoff_date = date.today() + timedelta(days=safety_days)
        query = query.filter(
            (LotReceipt.expiry_date == None) | (LotReceipt.expiry_date >= cutoff_date)
        )

    # ポリシー適用
    if policy == AllocationPolicy.FEFO:
        query = query.order_by(
            LotReceipt.expiry_date.asc().nullslast(),
            LotReceipt.received_date.asc(),
            LotReceipt.id.asc()
        )
    else:  # FIFO
        query = query.order_by(
            LotReceipt.received_date.asc(),
            LotReceipt.id.asc()
        )

    if lock_mode == LockMode.PESSIMISTIC:
        query = query.with_for_update()

    return query.all()
```

**完了条件**: FEFO/FIFO 順序が正しい、lot_receipts から直接取得

---

### 2-3: API レスポンス拡張

**対象ファイル**: `backend/app/presentation/schemas/orders/orders_schema.py`

```python
class OrderLineDetailResponse(BaseModel):
    # ... 既存フィールド ...

    # Phase 2 追加（v2.1 では Phase 1 から追加済み）
    supplier_item_id: int | None = None
    allocation_ready: bool = Field(
        description="引当可能かどうか（supplier_item マッピング済み）"
    )
    allocation_block_reason: str | None = Field(
        description="引当不可の理由（allocation_ready=False の場合）"
    )
```

**完了条件**: OpenAPI docs に反映

---

## 検証・テスト

### E2E テストケース（P0 必須）

#### Test 1: 新規入荷 → supplier_item 自動作成

```python
def test_inbound_creates_supplier_item(db: Session):
    """新規入荷時に supplier_items が自動作成される（v2.1）"""

    # 入荷実行
    plan = create_inbound_plan(supplier_id=1, maker_part_no="MAKER-001")
    service.process_inbound(plan)

    # Assert: supplier_items が作成された
    si = db.query(SupplierItem).filter(
        SupplierItem.supplier_id == 1,
        SupplierItem.maker_part_no == "MAKER-001"
    ).first()
    assert si is not None

    # Assert: lot_receipts に FK が設定された（SSOT）
    lot = db.query(LotReceipt).filter(
        LotReceipt.supplier_item_id == si.id
    ).first()
    assert lot is not None

    # v2.1: lot_master.supplier_item_id は存在しない
    lm = db.query(LotMaster).filter(LotMaster.id == lot.lot_master_id).first()
    assert not hasattr(lm, 'supplier_item_id')
```

#### Test 2: 未マッピング時の引当ブロック（Phase 1 から）

```python
def test_allocation_blocked_without_mapping_phase1(db: Session):
    """supplier_item_id が NULL の場合、Phase 1 から引当がブロックされる（v2.1）"""

    # Setup: customer_item with NULL supplier_item_id
    customer_item = CustomerItem(
        customer_id=1,
        external_product_code="CUST-001",  # v2.1: 得意先品番
        product_id=1,
        supplier_item_id=None  # 未マッピング
    )
    db.add(customer_item)

    # Setup: Order
    order = create_order(customer_id=1, lines=[
        {"external_product_code": "CUST-001", "quantity": 10}
    ])

    # Act & Assert: Phase 1 から即座にブロック
    with pytest.raises(AllocationBlockedError) as exc_info:
        order_service.allocate_order_lines(order.id)

    # エラーメッセージに導線 URL が含まれる
    assert "supplier_item_id not mapped" in str(exc_info.value)
    assert "/masters/customer-items/mapping" in str(exc_info.value)
```

#### Test 3: マッピング後の引当成功

```python
def test_allocation_succeeds_after_mapping(db: Session):
    """マッピング後は引当が成功する（v2.1）"""

    # Setup: supplier_item + lot
    si = SupplierItem(supplier_id=1, maker_part_no="MAKER-001")
    db.add(si)
    db.flush()

    lot = create_lot(supplier_item_id=si.id, quantity=100)

    # Setup: customer_item with mapping
    customer_item = CustomerItem(
        customer_id=1,
        external_product_code="CUST-001",
        product_id=1,
        supplier_item_id=si.id  # マッピング済み
    )
    db.add(customer_item)

    # Act
    order = create_order(customer_id=1, lines=[
        {"external_product_code": "CUST-001", "quantity": 10}
    ])
    order_service.allocate_order_lines(order.id)

    # Assert
    db.refresh(order)
    assert order.status == "allocated"
    assert lot.current_quantity == 90
```

#### Test 4: FEFO allocation with supplier_item_id

```python
def test_fefo_allocation_by_supplier_item_v21(db: Session):
    """supplier_item_id ベースで FEFO 引当が動作する（v2.1: product_id なし）"""

    # Setup: 2 lots with different expiry
    si = create_supplier_item(supplier_id=1, maker_part_no="MAKER-001")
    lot1 = create_lot(supplier_item_id=si.id, expiry_date="2026-01-31", quantity=50)
    lot2 = create_lot(supplier_item_id=si.id, expiry_date="2026-06-30", quantity=50)

    # Act: 引当（60個）- v2.1: supplier_item_id 必須
    candidates = allocation_service.get_candidates(
        supplier_item_id=si.id,
        policy=AllocationPolicy.FEFO
    )
    result = allocation_calculator.allocate(candidates, required_qty=60)

    # Assert: 先に期限が近い lot1 から引当
    assert result.allocations[0].lot_id == lot1.id
    assert result.allocations[0].quantity == 50
    assert result.allocations[1].lot_id == lot2.id
    assert result.allocations[1].quantity == 10

    # v2.1: product_id パラメータは存在しない
    with pytest.raises(TypeError):
        allocation_service.get_candidates(product_id=123, policy=AllocationPolicy.FEFO)
```

#### Test 5: E2E - 引当ブロック → マッピング → 引当成功（v2.1 追加）

```python
def test_e2e_allocation_blocked_then_mapped(db: Session, client: TestClient):
    """
    E2E: 未マッピング時の引当ブロック → マッピング → 引当成功（v2.1）
    """
    # Setup: supplier_item + lot
    supplier_item = create_supplier_item(supplier_id=1, maker_part_no="MAKER-001")
    lot = create_lot(supplier_item_id=supplier_item.id, quantity=100)

    # Setup: customer_item (未マッピング)
    customer_item = create_customer_item(
        customer_id=1,
        external_product_code="CUST-001",
        supplier_item_id=None
    )

    # Setup: Order
    order = create_order(
        customer_id=1,
        lines=[{"external_product_code": "CUST-001", "quantity": 10}]
    )

    # Step 1: 引当を試みる → Phase 1 からブロックされる
    response = client.post(f"/api/v2/orders/{order.id}/allocate")
    assert response.status_code == 400
    assert "supplier_item_id not mapped" in response.json()["detail"]
    assert "/masters/customer-items/mapping" in response.json()["detail"]

    # Step 2: 未マッピング一覧を取得
    response = client.get("/api/v2/customer-items/unmapped")
    assert response.status_code == 200
    unmapped = response.json()
    assert unmapped["unmapped_count"] >= 1

    # Step 3: マッピング候補を取得
    response = client.post("/api/v2/customer-items/suggest-mappings", json={
        "customer_id": 1,
        "external_product_code": "CUST-001"
    })
    suggestions = response.json()["suggestions"]
    assert len(suggestions) >= 1
    assert suggestions[0]["supplier_item_id"] == supplier_item.id

    # Step 4: マッピングを保存
    response = client.patch(
        f"/api/v2/customer-items/1/CUST-001/map",
        json={"supplier_item_id": supplier_item.id}
    )
    assert response.status_code == 200

    # Step 5: 引当を再実行 → 成功
    response = client.post(f"/api/v2/orders/{order.id}/allocate")
    assert response.status_code == 200

    # Verify: lot が引当済み
    db.refresh(lot)
    assert lot.current_quantity == 90
```

---

## リスク管理

### Risk 1: Phase 1 デプロイ直後に全受注が引当不可（v2.1 最大リスク）

**影響**: **Critical**
**確率**: High（マッピング率が 80% 未満の場合）

**対応策**:
1. **Phase 0.5 で事前マッピング完了**（必須）
2. Phase 1 デプロイ前にマッピング率 80%+ を確認
3. 緊急ロールバック手順を準備（Option A/B/C）

**緊急ロールバック手順**:

**Option A: コード変更（推奨）**:
```python
# order_service.py の検証を一時的に無効化
ENABLE_SUPPLIER_ITEM_VALIDATION = os.getenv("ENABLE_SUPPLIER_ITEM_VALIDATION", "true") == "true"

def allocate_order_lines(self, order_id: int):
    if ENABLE_SUPPLIER_ITEM_VALIDATION:
        validation_result = self._validate_line_for_allocation(line)
        if not validation_result.is_valid:
            raise AllocationBlockedError(...)
    else:
        logger.warning("Supplier item validation is disabled (emergency mode)")
```

**Option B: データ変更（非推奨）**:
```sql
-- 全 customer_items に仮マッピング設定
UPDATE customer_items ci
SET supplier_item_id = (
    SELECT si.id
    FROM supplier_items si
    WHERE si.product_id = ci.product_id
    LIMIT 1
)
WHERE ci.supplier_item_id IS NULL;
```

**Option C: 管理者 override API（推奨）**:
```python
@router.post("/api/v2/orders/{order_id}/allocate-override")
@require_admin
def allocate_with_override(order_id: int, admin: Admin = Depends(get_current_admin)):
    """管理者権限で引当検証をスキップ（緊急対応用）"""
    logger.warning(f"Admin {admin.email} bypassed supplier_item validation for order {order_id}")
    return order_service.allocate_order_lines_without_validation(order_id)
```

---

### Risk 2: lot_master の集計トリガーが supplier_item_id に未対応

**影響**: Medium
**確率**: Medium

**【要確認】**: 既存の `update_lot_master_aggregates()` トリガーが supplier_item_id の集約に対応しているか？

**対応策**:
```sql
-- lot_master で supplier_item_id を派生的に取得する VIEW を追加
CREATE OR REPLACE VIEW v_lot_master_with_supplier_item AS
SELECT
    lm.*,
    (
        SELECT lr.supplier_item_id
        FROM lot_receipts lr
        WHERE lr.lot_master_id = lm.id
        LIMIT 1
    ) AS supplier_item_id
FROM lot_master lm;
```

---

### Risk 3: external_product_code の意味が異なる

**影響**: High
**確率**: Low

**【要確認】**: `order_lines.external_product_code` と `customer_items.external_product_code` が同じ意味か？

**v2.1 前提**: 両者とも「得意先品番」として扱う

**確認方法**:
```sql
-- 一致率を確認
SELECT
    COUNT(DISTINCT oi.external_product_code) AS order_codes,
    COUNT(DISTINCT ci.external_product_code) AS customer_codes,
    COUNT(DISTINCT CASE WHEN oi.external_product_code = ci.external_product_code THEN oi.external_product_code END) AS matched_codes
FROM order_lines oi
LEFT JOIN customer_items ci ON oi.external_product_code = ci.external_product_code;
```

---

## Rollback Plan

### Phase 0 Rollback
```sql
ALTER TABLE customer_items DROP COLUMN supplier_item_id;
ALTER TABLE lot_receipts DROP COLUMN supplier_item_id;
DROP TABLE supplier_items CASCADE;
```

### Phase 1 Rollback（v2.1: 影響大）
1. **緊急**: 環境変数で検証無効化 (`ENABLE_SUPPLIER_ITEM_VALIDATION=false`)
2. **コード revert**: Backend コードを Phase 0 に戻す
3. **データ保持**: DDL はそのまま（supplier_items は削除しない）

### Phase 2 Rollback
- 影響なし（Phase 1 で既に supplier_item_id ベース）

---

## 実装順序（Critical Path v2.1）

```
Phase 0: DDL (4h)
  ↓
Phase 0.5: Pre-deployment Preparation (16h) ← v2.1 追加
  - Backfill Script 実行
  - 自動マッピング実装・実行
  - 手動マッピング完了
  - マッピング率 80%+ 達成
  ↓
Phase 1: Deployment with Blocking (32h) ← v2.1 工数増加
  - Models/Repositories (8h)
  - Inbound Service (6h)
  - Allocation Service (supplier_item_id 必須化) (4h)
  - API Endpoints (6h)
  - 未マッピング一覧 API (3h) ← Phase 1.5 から前倒し
  - マッピング管理 UI (18h) ← Phase 1.5 から前倒し
  - 引当エラー表示 UI (3h) ← Phase 2.5 から前倒し
  ↓
Phase 1.5: Monitoring & Improvement (4h) ← v2.1 工数減少
  - Backfill 結果検証
  - マッピング率監視
  ↓
Phase 2: Optimization (12h) ← v2.1 工数減少
  - Allocation Candidate Service 最適化
  - Lot Repository 最適化
  - Frontend 最適化
```

**総工数（v2.1）**: 約 **68 時間** ≈ **2 週間**

---

## 重要ファイル一覧

### Backend (実装必須)

1. **Models**
   - `backend/app/infrastructure/persistence/models/supplier_item_model.py` (新規)
   - `backend/app/infrastructure/persistence/models/masters_models.py` (CustomerItem 修正)
   - `backend/app/infrastructure/persistence/models/lot_receipt_models.py` (LotReceipt 修正)

2. **Repositories**
   - `backend/app/infrastructure/persistence/repositories/supplier_item_repository.py` (新規)
   - `backend/app/infrastructure/persistence/repositories/lot_repository.py` (メソッド追加)

3. **Services**
   - `backend/app/application/services/inventory/inbound_receiving_service.py` (修正)
   - `backend/app/application/services/orders/order_service.py` (v2.1: Phase 1 からブロック)
   - `backend/app/application/services/allocations/candidate_service.py` (v2.1: supplier_item_id 必須)

4. **API Routers**
   - `backend/app/presentation/routers/masters/supplier_items_router.py` (新規)
   - `backend/app/presentation/routers/masters/customer_items_router.py` (v2.1: Phase 1 で拡張)

5. **Migrations**
   - `backend/alembic/versions/004_create_supplier_items.py` (新規)
   - `backend/alembic/versions/005_add_supplier_item_refs.py` (新規、v2.1: lot_master 除外)

6. **Scripts**
   - `backend/alembic/manual_scripts/backfill_supplier_items.py` (新規、Phase 0.5 で実行)
   - `backend/scripts/check_backfill_result.py` (新規)
   - `backend/scripts/check_mapping_rate.py` (新規)

### Frontend (実装必須)

1. **Customer Items**
   - `frontend/src/features/customer-items/components/MappingManagerPage.tsx` (新規、Phase 1 必須)
   - `frontend/src/features/customer-items/components/MappingRow.tsx` (新規)

2. **Orders**
   - `frontend/src/features/orders/components/OrderLineCard.tsx` (警告追加、Phase 1 必須)

3. **Supplier Items**
   - `frontend/src/features/supplier-items/` (新規ディレクトリ)
   - `frontend/src/features/supplier-items/api.ts` (新規)

4. **Types**
   - `frontend/src/types/generated.ts` (npm run typegen で自動生成)

---

## ドキュメント出力先

**本計画書（v2.1）**: `docs/plan/supplier_customer_items_implementation_plan_v2.1.md`

関連ドキュメント:
- `docs/plan/supplier_customer_item_migration_plan.md` (既存)
- `docs/plan/SUPPLIER_ITEMS_MIGRATION_PLAN.md` (既存)
- `docs/plan/supplier_customer_items_implementation_plan_v2.md` (v2.0、本計画書で置き換え)

---

## v2 → v2.1 変更サマリー

| 項目 | v2 | v2.1 | 理由 |
|------|----|----|------|
| **引当検証** | Phase 1: 警告のみ | **Phase 1 から即座にブロック** | 運用破綻リスク回避 |
| **lot_master.supplier_item_id** | 列追加 | **列追加しない** | lot_receipts が SSOT |
| **未マッピング一覧 API** | Phase 1.5 | **Phase 1 必須** | ブロック時の導線確保 |
| **マッピング管理 UI** | Phase 1.5 | **Phase 1 必須** | ブロック時の導線確保 |
| **Phase 0.5** | なし | **新規追加** | Phase 1 前にマッピング完了 |
| **product_id フォールバック** | Phase 2 まで残す | **Phase 1 で削除** | 一貫性確保 |
| **customer_items PK** | 検討 | **現状維持（複合PK）** | 既存 FK 参照への影響回避 |
| **external_product_code** | 検討 | **得意先品番として扱う** | 定義明確化 |

---

**v2.1 最終更新**: 2026-01-20
