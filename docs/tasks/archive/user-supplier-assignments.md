# ユーザー-仕入先担当割り当て機能 実装計画

## 要件

### ビジネス要件
- **目的**: ユーザーごとに担当する仕入先を管理
- **用途**: 
  - 「○○から仕入れた商品を○○に納める → この人が担当」
  - 画面での優先表示（自分の担当仕入先を上位表示）
  - フィルタリング（自分の担当のみ表示）

### 機能要件
1. ユーザーは複数の仕入先を担当可能
2. 仕入先には複数の担当者が割り当て可能
3. 主担当（メイン担当）を識別可能
4. 担当の追加・削除・変更が可能

---

## データベース設計

### 新規テーブル: `user_supplier_assignments`

**概要**: ユーザーと仕入先の担当関係を管理する中間テーブル

```sql
CREATE TABLE user_supplier_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,  -- 主担当フラグ
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_user_supplier_assignments_user
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_user_supplier_assignments_supplier
        FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(id) 
        ON DELETE CASCADE,
    
    -- 同じuser_id, supplier_idの組み合わせは1つだけ
    CONSTRAINT uq_user_supplier_assignments_user_supplier
        UNIQUE (user_id, supplier_id)
);

-- インデックス
CREATE INDEX idx_user_supplier_assignments_user 
    ON user_supplier_assignments(user_id);

CREATE INDEX idx_user_supplier_assignments_supplier 
    ON user_supplier_assignments(supplier_id);

CREATE INDEX idx_user_supplier_assignments_primary 
    ON user_supplier_assignments(is_primary)
    WHERE is_primary = TRUE;

COMMENT ON TABLE user_supplier_assignments IS 'ユーザー-仕入先担当割り当て';
COMMENT ON COLUMN user_supplier_assignments.is_primary IS '主担当フラグ（仕入先ごとに1人）';
```

---

### ビジネスルール

#### 1. 主担当の一意性

**ルール**: 1つの仕入先に対して主担当は1人まで

**実装方法**:
```sql
-- 部分的ユニークインデックス（PostgreSQL 15+）
CREATE UNIQUE INDEX uq_user_supplier_primary_per_supplier
    ON user_supplier_assignments(supplier_id)
    WHERE is_primary = TRUE;
```

**アプリケーション層でのバリデーション**:
```python
# 主担当を設定する前に、既存の主担当を解除
async def set_primary_assignment(user_id: int, supplier_id: int, db: Session):
    # 既存の主担当を解除
    db.query(UserSupplierAssignment).filter(
        UserSupplierAssignment.supplier_id == supplier_id,
        UserSupplierAssignment.is_primary == True
    ).update({"is_primary": False})
    
    # 新しい主担当を設定
    assignment = db.query(UserSupplierAssignment).filter(
        UserSupplierAssignment.user_id == user_id,
        UserSupplierAssignment.supplier_id == supplier_id
    ).first()
    
    if assignment:
        assignment.is_primary = True
    else:
        assignment = UserSupplierAssignment(
            user_id=user_id,
            supplier_id=supplier_id,
            is_primary=True
        )
        db.add(assignment)
    
    db.commit()
```

---

## ビュー設計

### 新規ビュー: `v_user_supplier_assignments`

**用途**: ユーザー名、仕入先名を含む担当一覧

```sql
CREATE VIEW v_user_supplier_assignments AS
SELECT
    usa.id,
    usa.user_id,
    u.username,
    u.display_name,
    usa.supplier_id,
    s.supplier_code,
    s.supplier_name,
    usa.is_primary,
    usa.assigned_at,
    usa.created_at,
    usa.updated_at
FROM user_supplier_assignments usa
JOIN users u ON usa.user_id = u.id
JOIN suppliers s ON usa.supplier_id = s.id;

COMMENT ON VIEW v_user_supplier_assignments IS 'ユーザー-仕入先担当割り当てビュー';
```

---

### ビュー拡張: `v_lot_details`

**追加情報**: 担当者情報を含める

```sql
CREATE OR REPLACE VIEW public.v_lot_details AS
SELECT
    l.id AS lot_id,
    l.lot_number,
    l.product_id,
    p.maker_part_code,
    p.product_name,
    l.warehouse_id,
    w.warehouse_code,
    w.warehouse_name,
    l.supplier_id,
    s.supplier_code,
    s.supplier_name,
    l.received_date,
    l.expiry_date,
    l.current_quantity,
    l.allocated_quantity,
    (l.current_quantity - l.allocated_quantity) AS available_quantity,
    l.unit,
    l.status,
    CASE 
        WHEN l.expiry_date IS NOT NULL 
        THEN CAST((l.expiry_date - CURRENT_DATE) AS INTEGER) 
        ELSE NULL 
    END AS days_to_expiry,
    -- ✅ 担当者情報を追加
    usa_primary.user_id AS primary_user_id,
    u_primary.username AS primary_username,
    u_primary.display_name AS primary_user_display_name,
    l.created_at,
    l.updated_at
FROM public.lots l
LEFT JOIN public.products p ON l.product_id = p.id
LEFT JOIN public.warehouses w ON l.warehouse_id = w.id
LEFT JOIN public.suppliers s ON l.supplier_id = s.id
-- ✅ 主担当者を結合
LEFT JOIN public.user_supplier_assignments usa_primary 
    ON usa_primary.supplier_id = l.supplier_id 
    AND usa_primary.is_primary = TRUE
LEFT JOIN public.users u_primary 
    ON u_primary.id = usa_primary.user_id;
```

---

## SQLAlchemyモデル

### `UserSupplierAssignment`

```python
# app/models/auth_models.py または app/models/assignment_models.py

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base

if TYPE_CHECKING:
    from .auth_models import User
    from .masters_models import Supplier


class UserSupplierAssignment(Base):
    """ユーザー-仕入先担当割り当て (User-Supplier assignments).
    
    ビジネスルール:
    - 1ユーザーは複数の仕入先を担当可能
    - 1仕入先には複数の担当者を割り当て可能
    - is_primary=True の担当者は仕入先ごとに1人まで（主担当）
    """

    __tablename__ = "user_supplier_assignments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    supplier_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_primary: Mapped[bool] = mapped_column(
        Boolean, 
        nullable=False, 
        server_default=text("FALSE"),
        comment="主担当フラグ（仕入先ごとに1人）"
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id", "supplier_id", 
            name="uq_user_supplier_assignments_user_supplier"
        ),
        Index("idx_user_supplier_assignments_user", "user_id"),
        Index("idx_user_supplier_assignments_supplier", "supplier_id"),
        Index(
            "idx_user_supplier_assignments_primary", 
            "is_primary",
            postgresql_where=text("is_primary = TRUE")
        ),
        # 仕入先ごとに主担当は1人まで
        Index(
            "uq_user_supplier_primary_per_supplier",
            "supplier_id",
            unique=True,
            postgresql_where=text("is_primary = TRUE")
        ),
    )

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="supplier_assignments")
    supplier: Mapped[Supplier] = relationship("Supplier", back_populates="user_assignments")
```

### `User`モデルの更新

```python
# app/models/auth_models.py

class User(Base):
    # ... 既存のフィールド ...
    
    # Relationships
    supplier_assignments: Mapped[list[UserSupplierAssignment]] = relationship(
        "UserSupplierAssignment",
        back_populates="user",
        cascade="all, delete-orphan"
    )
```

### `Supplier`モデルの更新

```python
# app/models/masters_models.py

class Supplier(Base):
    # ... 既存のフィールド ...
    
    # Relationships
    user_assignments: Mapped[list[UserSupplierAssignment]] = relationship(
        "UserSupplierAssignment",
        back_populates="supplier",
        cascade="all, delete-orphan"
    )
```

---

## API設計

### エンドポイント

```python
# app/api/routes/assignments_router.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.assignment_schema import (
    UserSupplierAssignmentCreate,
    UserSupplierAssignmentResponse,
    UserSupplierAssignmentUpdate,
)
from app.services.assignment_service import AssignmentService

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("/user/{user_id}/suppliers")
def get_user_suppliers(
    user_id: int,
    db: Session = Depends(get_db)
) -> list[UserSupplierAssignmentResponse]:
    """ユーザーの担当仕入先一覧を取得"""
    service = AssignmentService(db)
    return service.get_user_suppliers(user_id)


@router.get("/supplier/{supplier_id}/users")
def get_supplier_users(
    supplier_id: int,
    db: Session = Depends(get_db)
) -> list[UserSupplierAssignmentResponse]:
    """仕入先の担当者一覧を取得"""
    service = AssignmentService(db)
    return service.get_supplier_users(supplier_id)


@router.post("/")
def create_assignment(
    data: UserSupplierAssignmentCreate,
    db: Session = Depends(get_db)
) -> UserSupplierAssignmentResponse:
    """担当割り当てを作成"""
    service = AssignmentService(db)
    return service.create_assignment(data)


@router.put("/{assignment_id}")
def update_assignment(
    assignment_id: int,
    data: UserSupplierAssignmentUpdate,
    db: Session = Depends(get_db)
) -> UserSupplierAssignmentResponse:
    """担当割り当てを更新（主担当の変更など）"""
    service = AssignmentService(db)
    return service.update_assignment(assignment_id, data)


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db)
):
    """担当割り当てを削除"""
    service = AssignmentService(db)
    service.delete_assignment(assignment_id)
    return {"message": "Assignment deleted"}


@router.post("/supplier/{supplier_id}/set-primary/{user_id}")
def set_primary_user(
    supplier_id: int,
    user_id: int,
    db: Session = Depends(get_db)
) -> UserSupplierAssignmentResponse:
    """仕入先の主担当者を設定"""
    service = AssignmentService(db)
    return service.set_primary_assignment(user_id, supplier_id)
```

---

## UI設計

### 1. ロット一覧画面での活用

```tsx
// LotsListPage.tsx

// 自分の担当仕入先のロットを優先表示
const { data: myAssignments } = useUserSupplierAssignments(currentUser.id);
const mySupplierIds = myAssignments?.map(a => a.supplier_id) || [];

const sortedLots = lots.sort((a, b) => {
  // 自分の担当仕入先を上位に
  const aIsMine = mySupplierIds.includes(a.supplier_id);
  const bIsMine = mySupplierIds.includes(b.supplier_id);
  
  if (aIsMine && !bIsMine) return -1;
  if (!aIsMine && bIsMine) return 1;
  
  // その他の条件でソート
  return a.expiry_date - b.expiry_date;
});
```

### 2. フィルタ機能

```tsx
// LotsFilterBar.tsx

<Checkbox
  label="自分の担当仕入先のみ"
  checked={showOnlyMySuppliers}
  onChange={(e) => setShowOnlyMySuppliers(e.target.checked)}
/>
```

### 3. 担当管理画面

```tsx
// UserSupplierAssignmentsPage.tsx

function UserSupplierAssignmentsPage() {
  const { data: assignments } = useUserSupplierAssignments(userId);
  
  return (
    <div>
      <h2>担当仕入先</h2>
      <Table>
        {assignments?.map(a => (
          <TableRow key={a.id}>
            <TableCell>{a.supplier_name}</TableCell>
            <TableCell>
              {a.is_primary && <Badge>主担当</Badge>}
            </TableCell>
            <TableCell>
              <Button onClick={() => setPrimary(a.id)}>
                主担当にする
              </Button>
              <Button onClick={() => deleteAssignment(a.id)}>
                削除
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
```

---

## 統合改善計画（今回一括実施）

### Phase A: スキーマ変更

1. **`version_id` → `version`**
2. **`user_supplier_assignments` テーブル追加**

### Phase B: ビュー修正

1. **`v_lots_with_master`**: LEFT JOIN、version修正
2. **`v_order_line_details`**: jiku_code, external_product_code追加
3. **`v_supplier_code_to_id`**: 新規作成
4. **`v_warehouse_code_to_id`**: 新規作成
5. **`v_user_supplier_assignments`**: 新規作成
6. **`v_lot_details`**: 担当者情報追加
7. **`v_candidate_lots_by_order_line`**: 予測データJOINを削除（要確認後）

### Phase C: モデル更新

1. Allocationモデル: version_id → version
2. Lotモデル: version_id → version
3. OrderLineモデル: version_id → version
4. UserSupplierAssignmentモデル: 新規作成
5. User, Supplierモデル: relationshipsに追加

### Phase D: API・サービス

1. AssignmentService: 新規作成
2. assignments_router: 新規作成

### Phase E: フロントエンド

1. 型生成
2. API hooks追加
3. フィルタ機能追加
4. 担当管理画面追加

---

## マ イグレーション順序

```sql
-- 1. version_id → version
ALTER TABLE lots RENAME COLUMN version_id TO version;
ALTER TABLE order_lines RENAME COLUMN version_id TO version;

-- 2. user_supplier_assignments テーブル作成
CREATE TABLE user_supplier_assignments (
    -- 上記の定義
);

-- 3. ビュー再作成
-- create_views.sql を実行
```

---

## 推定作業時間

- スキーマ変更: 1時間
- ビュー修正: 2時間
- モデル更新: 1時間
- API実装: 2時間
- フロントエンド: 3時間

**合計**: 9時間（1-2日）

---

## 次のステップ

1. この計画をレビュー・承認
2. マイグレーションとモデル実装
3. ビュー修正
4. API実装
5. フロントエンド実装
