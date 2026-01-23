# supplier_items / customer_items 統合移行計画

## 概要

本計画は、ロット管理システムを **product_id 中心** から **supplier_items + customer_items 二重キー** モデルに移行します。

### 目的

- **入荷・在庫**: `(supplier_id, maker_part_no)` → supplier_items でキー管理
- **受注・出荷**: `(customer_id, external_product_code)` → customer_items でキー管理
- **橋渡し**: `customer_items.supplier_item_id` (nullable) で両者を接続
- **制約**: 在庫操作時に `supplier_item_id` が NULL なら引当をブロック

### 後方互換性

Phase 1/2 では `products` テーブルと `product_id` を残し、段階的に移行します。

---

## 現状分析

### 重要な発見

1. **customer_items テーブルは既に存在** (v2.1から)
   - PK: `(customer_id, external_product_code)`
   - FK: `product_id` → products(id)
   - **不足**: `supplier_item_id` FK がない

2. **external_product_code が customer_part_no 相当**
   - order_lines.external_product_code: OCR取込時の「先方品番」
   - customer_items.external_product_code: 主キーの一部

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
| ロット保存 | lot_receipts.product_id | lot_receipts.supplier_item_id | FK列追加 |
| 引当検証 | なし | supplier_item_id NULL ならブロック | サービス層ロジック |

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
-- 注意: PK は複合PK (customer_id, external_product_code) のまま維持
ALTER TABLE customer_items
    ADD COLUMN supplier_item_id BIGINT NULL
    REFERENCES supplier_items(id) ON DELETE SET NULL;
CREATE INDEX idx_customer_items_supplier_item ON customer_items (supplier_item_id);

-- lot_receipts に supplier_item_id 追加
ALTER TABLE lot_receipts
    ADD COLUMN supplier_item_id BIGINT NULL
    REFERENCES supplier_items(id) ON DELETE SET NULL;
CREATE INDEX idx_lot_receipts_supplier_item ON lot_receipts (supplier_item_id);

-- lot_master に supplier_item_id 追加
ALTER TABLE lot_master
    ADD COLUMN supplier_item_id BIGINT NULL
    REFERENCES supplier_items(id) ON DELETE SET NULL;
CREATE INDEX idx_lot_master_supplier_item ON lot_master (supplier_item_id);
```

**完了条件**:
- 全テーブルに列追加成功
- 既存テスト全てパス（NULL のため影響なし）

**決定事項**:
- customer_items の PK は**変更しない**（複合 PK のまま維持）
- surrogate key (id 列) は**追加しない**（既存 FK 参照への影響を回避）
- order_lines.customer_item_id は**追加しない**（複合PK参照が複雑になるため）

---

## Phase 1: 新規データから supplier_items 起点で動作

### 目標

新規入荷データが supplier_items 経由で保存される状態にする

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

    # lot_master 取得（既存）
    lm = self._get_or_create_lot_master(
        lot_number, line.product_id, plan.supplier_id, supplier_item.id
    )

    # lot_receipt 作成（supplier_item_id を追加）
    db_lot = LotReceipt(
        lot_master_id=lm.id,
        supplier_item_id=supplier_item.id,  # 【追加】
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
- `lot_receipts.supplier_item_id` に値が入る
- 既存の `product_id` も並行して保存される

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

### 1-5: 引当時の検証追加（Phase 1: 警告のみ）

**対象ファイル**: `backend/app/application/services/orders/order_service.py`

**修正箇所**: 引当処理の開始時

**段階的導入戦略**:
- **Phase 1**: 警告ログのみ（引当処理は継続）
- **Phase 1.5**: マッピングスプリント実施
- **Phase 2**: ブロック化（未マッピング時にエラー）

```python
def allocate_order_lines(self, order_id: int):
    """受注明細の引当処理"""
    order = self.order_repo.get_by_id(order_id)

    for line in order.order_lines:
        # 【Phase 1: 警告のみ】supplier_item_id チェック
        validation_result = self._validate_line_for_allocation(line)
        if not validation_result.is_valid:
            logger.warning(
                f"Order line {line.id} cannot be allocated: {validation_result.reason}"
            )
            # Phase 1 では処理を続行（Phase 2 でエラーにする）

        # 既存の引当処理
        self._allocate_line(line)
```

**新規メソッド**:
```python
def _validate_line_for_allocation(self, line: OrderLine) -> ValidationResult:
    """引当可能かチェック"""
    if not line.product_id:
        return ValidationResult(False, "product_id not resolved")

    # customer_item からマッピング確認
    customer_item = self.customer_item_repo.find_by_customer_and_part_no(
        customer_id=line.order.customer_id,
        external_product_code=line.external_product_code
    )

    if not customer_item:
        return ValidationResult(False, "customer_item not found")

    if not customer_item.supplier_item_id:
        return ValidationResult(False, "supplier_item_id not mapped")

    return ValidationResult(True, None)
```

**完了条件**:
- 未マッピング時にログ出力される
- 引当処理は継続（Phase 2 でブロック化）

---

### 1-6: Frontend 型定義更新

**対象ファイル**: `frontend/src/types/generated.ts`

**実行手順**:
1. Backend で OpenAPI schema 更新
2. `cd frontend && npm run typegen`
3. 新しい型（SupplierItem）が生成されることを確認

**完了条件**: TypeScript エラー 0 件

---

## Phase 1.5: 既存データ Backfill & マッピング支援

### 目標

既存の lot_receipts から supplier_items を逆生成し、マッピング率 80%+ を達成

### 1.5-1: Backfill Script 実装

**新規ファイル**: `backend/alembic/manual_scripts/backfill_supplier_items.py`

```python
#!/usr/bin/env python3
"""
既存データから supplier_items を逆生成し、FK を更新する。

実行方法:
    docker compose exec backend python -m alembic.manual_scripts.backfill_supplier_items
"""

from sqlalchemy.orm import Session
from app.infrastructure.persistence.models import SupplierItem, LotReceipt, Product
from app.core.database import SessionLocal

def backfill_supplier_items(db: Session, dry_run: bool = False):
    """lot_receipts から supplier_items を生成"""

    # Step 1: lot_receipts から (supplier_id, maker_part_no) を抽出
    query = """
        SELECT DISTINCT
            lr.supplier_id,
            p.maker_part_code AS maker_part_no,
            lr.product_id
        FROM lot_receipts lr
        INNER JOIN products p ON lr.product_id = p.id
        WHERE lr.supplier_id IS NOT NULL
          AND p.maker_part_code IS NOT NULL
          AND lr.supplier_item_id IS NULL
    """

    results = db.execute(query).fetchall()
    print(f"Found {len(results)} unique (supplier_id, maker_part_no) combinations")

    if dry_run:
        print("DRY RUN: No changes will be made")
        return

    # Step 2: supplier_items を作成
    created_count = 0
    for supplier_id, maker_part_no, product_id in results:
        # UNIQUE 制約で重複を防ぐ
        existing = db.query(SupplierItem).filter(
            SupplierItem.supplier_id == supplier_id,
            SupplierItem.maker_part_no == maker_part_no
        ).first()

        if not existing:
            si = SupplierItem(
                supplier_id=supplier_id,
                maker_part_no=maker_part_no,
                product_id=product_id
            )
            db.add(si)
            created_count += 1

    db.flush()
    print(f"Created {created_count} supplier_items")

    # Step 3: lot_receipts.supplier_item_id を更新
    update_query = """
        UPDATE lot_receipts lr
        SET supplier_item_id = si.id
        FROM supplier_items si
        INNER JOIN products p ON si.product_id = p.id
        WHERE lr.supplier_id = si.supplier_id
          AND lr.product_id = si.product_id
          AND lr.supplier_item_id IS NULL
    """

    result = db.execute(update_query)
    print(f"Updated {result.rowcount} lot_receipts")

    db.commit()
    print("Backfill completed successfully")

if __name__ == "__main__":
    import sys
    dry_run = "--dry-run" in sys.argv

    db = SessionLocal()
    try:
        backfill_supplier_items(db, dry_run=dry_run)
    finally:
        db.close()
```

**実行手順**:
```bash
# Dry-run で確認
docker compose exec backend python -m alembic.manual_scripts.backfill_supplier_items --dry-run

# 本番実行
docker compose exec backend python -m alembic.manual_scripts.backfill_supplier_items
```

**完了条件**:
- lot_receipts の 95%+ に supplier_item_id が付与される
- エラーなく完了

---

### 1.5-2: customer_items マッピング支援 API

**新規ファイル**: `backend/app/presentation/routers/masters/mapping_assistant_router.py`

```python
@router.get("/unmapped-customer-items")
def get_unmapped_customer_items(
    customer_id: int | None = None,
    limit: int = 100,
    service: MappingAssistantService = Depends()
):
    """未マッピングの customer_items を取得"""
    return service.get_unmapped_items(customer_id=customer_id, limit=limit)

@router.post("/suggest-mappings")
def suggest_mappings(
    customer_id: int,
    external_product_code: str,
    service: MappingAssistantService = Depends()
):
    """マッピング候補を提案（maker_part_no で一致検索）"""
    return service.suggest_supplier_items(customer_id, external_product_code)

@router.post("/batch-map")
def batch_map(
    mappings: list[MappingRequest],
    service: MappingAssistantService = Depends()
):
    """一括マッピング実行"""
    return service.batch_update_mappings(mappings)
```

**完了条件**: API 動作確認

---

### 1.5-3: マッピング管理 UI

**新規ファイル**: `frontend/src/features/customer-items/components/MappingManagerPage.tsx`

```tsx
export function MappingManagerPage() {
  const { data: unmappedItems } = useQuery({
    queryKey: ['unmapped-customer-items'],
    queryFn: () => api.get('/api/v2/mapping-assistant/unmapped-customer-items')
  });

  return (
    <div>
      <h1>得意先品番マッピング管理</h1>
      <Table>
        <thead>
          <tr>
            <th>得意先</th>
            <th>先方品番</th>
            <th>品名</th>
            <th>仕入先品目候補</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {unmappedItems?.map(item => (
            <MappingRow key={item.id} item={item} />
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function MappingRow({ item }) {
  const [selectedSupplierItemId, setSelectedSupplierItemId] = useState(null);

  const { data: suggestions } = useQuery({
    queryKey: ['mapping-suggestions', item.id],
    queryFn: () => api.post('/api/v2/mapping-assistant/suggest-mappings', {
      customer_id: item.customer_id,
      external_product_code: item.external_product_code
    })
  });

  return (
    <tr>
      <td>{item.customer_name}</td>
      <td>{item.external_product_code}</td>
      <td>{item.description}</td>
      <td>
        <Select onValueChange={setSelectedSupplierItemId}>
          {suggestions?.map(si => (
            <SelectItem key={si.id} value={si.id}>
              {si.maker_part_no} ({si.supplier_name})
            </SelectItem>
          ))}
        </Select>
      </td>
      <td>
        <Button onClick={() => saveMapping(item.id, selectedSupplierItemId)}>
          保存
        </Button>
      </td>
    </tr>
  );
}
```

**完了条件**:
- 未マッピング一覧表示
- 候補選択・保存可能
- マッピング率を監視（目標 80%+）

---

## Phase 2: 引当を supplier_item_id ベースに変更

### 目標

引当処理を `supplier_item_id` ベースに切り替え、未マッピング時にブロック

### 2-1: Allocation Candidate Service 修正

**対象ファイル**: `backend/app/application/services/allocations/candidate_service.py`

**修正箇所**: L66-79 の `get_candidates()` シグネチャ変更

```python
def get_candidates(
    self,
    supplier_item_id: int | None = None,  # 【新規】Phase 2 優先
    product_id: int | None = None,        # 【既存】Phase 1 フォールバック
    *,
    policy: AllocationPolicy,
    warehouse_id: int | None = None,
    lock_mode: LockMode = LockMode.NONE,
    exclude_expired: bool = True,
    safety_days: int = 0,
) -> list[LotCandidate]:
    """
    割当候補を取得（Phase 2: supplier_item_id 優先）

    Args:
        supplier_item_id: 仕入先品目ID（Phase 2 推奨）
        product_id: 製品ID（Phase 1 後方互換）

    Raises:
        ValueError: 両方 None の場合
    """
    if supplier_item_id is None and product_id is None:
        raise ValueError("Either supplier_item_id or product_id required")

    if supplier_item_id:
        # Phase 2: supplier_item_id ベースで検索
        return self._repo.get_allocatable_by_supplier_item(
            supplier_item_id=supplier_item_id,
            policy=policy,
            warehouse_id=warehouse_id,
            lock_mode=lock_mode,
            exclude_expired=exclude_expired,
            safety_days=safety_days,
        )
    else:
        # Phase 1 フォールバック: product_id ベース
        return self._repo.get_allocatable_by_product(
            product_id=product_id,
            policy=policy,
            # ... 既存パラメータ
        )
```

**完了条件**:
- `supplier_item_id` 指定時に正しくロットが取得される
- FEFO 順序が維持される

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
    supplier_item_id で引当可能ロットを取得（Phase 2）

    FEFO: expiry_date ASC, received_date ASC, id ASC
    FIFO: received_date ASC, id ASC
    """
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

**完了条件**: FEFO/FIFO 順序が正しい

---

### 2-3: 引当時の検証を強化（Phase 2: ブロック化）

**対象ファイル**: `backend/app/application/services/orders/order_service.py`

**修正**: Phase 1 の警告をエラーに変更（マッピング率 80%+ 達成後に実施）

```python
def allocate_order_lines(self, order_id: int):
    """受注明細の引当処理（Phase 2: 未マッピング時にブロック）"""
    order = self.order_repo.get_by_id(order_id)

    for line in order.order_lines:
        # 【Phase 2: ブロック化】
        validation_result = self._validate_line_for_allocation(line)
        if not validation_result.is_valid:
            raise AllocationBlockedError(
                f"Order line {line.id} (customer_part_no: {line.external_product_code}) "
                f"cannot be allocated: {validation_result.reason}"
            )

        # supplier_item_id を取得
        supplier_item_id = self._get_supplier_item_id_for_line(line)

        # Phase 2: supplier_item_id ベースで引当
        self._allocate_line_by_supplier_item(line, supplier_item_id)
```

**完了条件**:
- 未マッピング時にエラーが返る
- エラーメッセージが日本語で明確

---

### 2-4: API レスポンス拡張

**対象ファイル**: `backend/app/presentation/schemas/orders/orders_schema.py`

```python
class OrderLineDetailResponse(BaseModel):
    # ... 既存フィールド ...

    # Phase 2 追加
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

### 2-5: Frontend 引当エラー表示

**対象ファイル**: `frontend/src/features/orders/components/OrderLineCard.tsx`

```tsx
export function OrderLineCard({ orderLine }: { orderLine: OrderLine }) {
  return (
    <Card>
      {/* 既存の表示 */}

      {/* Phase 2: 引当可否の表示 */}
      {!orderLine.allocation_ready && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>引当不可</AlertTitle>
          <AlertDescription>
            {orderLine.allocation_block_reason === 'supplier_item_not_mapped' ? (
              <>
                仕入先品目がマッピングされていません。
                <Link href="/masters/customer-items">マスタ管理画面</Link>で設定してください。
              </>
            ) : (
              orderLine.allocation_block_reason
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
- マッピング管理画面へのリンク動作

---

## 検証・テスト

### E2E テストケース（必須）

#### Test 1: 新規入荷 → supplier_item 自動作成

```python
def test_inbound_creates_supplier_item(db: Session):
    """新規入荷時に supplier_items が自動作成される"""

    # 入荷実行
    plan = create_inbound_plan(supplier_id=1)
    service.process_inbound(plan)

    # Assert: supplier_items が作成された
    si = db.query(SupplierItem).filter(
        SupplierItem.supplier_id == 1,
        SupplierItem.maker_part_no == "TEST-001"
    ).first()
    assert si is not None

    # Assert: lot_receipts に FK が設定された
    lot = db.query(LotReceipt).filter(
        LotReceipt.supplier_item_id == si.id
    ).first()
    assert lot is not None
```

#### Test 2: 未マッピング時の引当ブロック

```python
def test_allocation_blocked_without_mapping(db: Session):
    """supplier_item_id が NULL の場合、引当がブロックされる"""

    # Setup: customer_item with NULL supplier_item_id
    customer_item = CustomerItem(
        customer_id=1,
        external_product_code="CUST-001",
        product_id=1,
        supplier_item_id=None  # 未マッピング
    )
    db.add(customer_item)

    # Setup: Order
    order = create_order(customer_id=1, lines=[
        {"external_product_code": "CUST-001", "quantity": 10}
    ])

    # Act & Assert
    with pytest.raises(AllocationBlockedError, match="supplier_item_id not mapped"):
        order_service.allocate_order_lines(order.id)
```

#### Test 3: マッピング後の引当成功

```python
def test_allocation_succeeds_after_mapping(db: Session):
    """マッピング後は引当が成功する"""

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
def test_fefo_allocation_by_supplier_item(db: Session):
    """supplier_item_id ベースで FEFO 引当が動作する"""

    # Setup: 2 lots with different expiry
    si = create_supplier_item(supplier_id=1, maker_part_no="MAKER-001")
    lot1 = create_lot(supplier_item_id=si.id, expiry_date="2026-01-31", quantity=50)
    lot2 = create_lot(supplier_item_id=si.id, expiry_date="2026-06-30", quantity=50)

    # Act: 引当（60個）
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
```

---

## リスク管理

### Risk 1: maker_part_no が既存データに不足

**影響**: Backfill 時にエラー
**確率**: 中

**対応策**:
1. 事前監査: `SELECT COUNT(*) FROM products WHERE maker_part_code IS NULL`
2. 手動データ補完
3. フォールバック: product_id を一時的に使用（"migration_pending" フラグ）

### Risk 2: マッピング率が低い

**影響**: 引当不可の受注が多発
**確率**: 高

**対応策**:
1. Phase 1.5 でマッピングスプリント（2-3日）
2. 自動マッピング機能強化（maker_part_no 完全一致）
3. ソフトロールアウト: 警告モード → ブロックモード

### Risk 3: 引当パフォーマンス劣化

**影響**: ロット検索が遅くなる
**確率**: 低

**対応策**:
1. Index 事前作成（Phase 0）
2. Query plan 分析
3. 負荷テスト実行

---

## Rollback Plan

### Phase 0 Rollback
- 列削除: `ALTER TABLE ... DROP COLUMN supplier_item_id`
- テーブル削除: `DROP TABLE supplier_items`

### Phase 1 Rollback
- Backend コードを revert
- DDL はそのまま（NULL = 影響なし）

### Phase 2 Rollback
- 引当ロジックを product_id ベースに戻す
- 検証を無効化

---

## 実装順序（Critical Path）

```
1. Phase 0 DDL (4h)
   ↓
2. Deploy (動作確認)
   ↓
3. Phase 1.1 Models (8h)
   ↓
4. Phase 1.2 Inbound Service (6h)
   ↓
5. Phase 1.3 API (6h)
   ↓
6. Deploy (新規入荷で supplier_items 使用開始)
   ↓
7. Phase 1.5 Backfill (8h)
   ↓
8. Execute Backfill Script
   ↓
9. Phase 1.5 Mapping UI (16h)
   ↓
10. マッピングスプリント（2-3日）
   ↓
11. Phase 2.1 Allocation (12h)
   ↓
12. Phase 2.2 Validation (4h)
   ↓
13. Deploy (引当が supplier_item_id ベース)
   ↓
14. Phase 2.5 Frontend (16h)
   ↓
15. Deploy (完全移行)
```

**総工数**: 約 68 時間 ≈ 2 週間

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
   - `backend/app/application/services/orders/order_service.py` (検証追加)
   - `backend/app/application/services/allocations/candidate_service.py` (シグネチャ変更)

4. **API Routers**
   - `backend/app/presentation/routers/masters/supplier_items_router.py` (新規)
   - `backend/app/presentation/routers/masters/mapping_assistant_router.py` (新規)

5. **Migrations**
   - `backend/alembic/versions/004_create_supplier_items.py` (新規)
   - `backend/alembic/versions/005_add_supplier_item_refs.py` (新規)

6. **Scripts**
   - `backend/alembic/manual_scripts/backfill_supplier_items.py` (新規)

### Frontend (実装必須)

1. **Customer Items**
   - `frontend/src/features/customer-items/components/MappingManagerPage.tsx` (新規)
   - `frontend/src/features/customer-items/components/MappingRow.tsx` (新規)

2. **Orders**
   - `frontend/src/features/orders/components/OrderLineCard.tsx` (警告追加)

3. **Supplier Items**
   - `frontend/src/features/supplier-items/` (新規ディレクトリ)
   - `frontend/src/features/supplier-items/api.ts` (新規)

4. **Types**
   - `frontend/src/types/generated.ts` (npm run typegen で自動生成)

---

## ドキュメント出力先

本計画書を以下の場所に保存します:

**保存先**: `docs/plan/supplier_customer_items_implementation_plan_v2.md`

関連ドキュメント:
- `docs/plan/supplier_customer_item_migration_plan.md` (既存)
- `docs/plan/SUPPLIER_ITEMS_MIGRATION_PLAN.md` (既存)
