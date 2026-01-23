# Any型削減タスク

**区分:** タスク  
**最終更新:** 2026-01-18

## 概要
TypeScriptフロントエンドとPythonバックエンドで使用されている`Any`型を段階的に削減し、型安全性を向上させる。

## 対応状況

### 未対応

### タスク一覧

#### Phase 1: 高優先度 (即座に対応)
- [ ] バックエンド: Date Handlingの型を明示 (2箇所)
- [ ] フロントエンド: Chart Event Handlersに適切な型を定義 (4箇所)

#### Phase 2: 中優先度 (次のリファクタリング時)
- [ ] バックエンド: Soft Delete Utilsにプロトコルを導入 (17箇所)
- [ ] フロントエンド: Zod Resolverの型問題を解決 (6箇所)

#### Phase 3: 低優先度 (時間がある時)
- [ ] フロントエンド: 外部モジュール型定義を改善 (16箇所)
- [ ] バックエンド: Repository Methodsにジェネリクスを導入 (3箇所)
- [ ] バックエンド: Export Serviceの型を改善 (2箇所)

### 対応済み

- なし

## 詳細

### 現状 (2026-01-18時点)

#### フロントエンド (TypeScript)
**31箇所**で`any`型を使用 (テストコード除く)

##### 1. 型定義ファイル (16箇所) - 優先度: 低
**場所**: `src/types/external-modules.d.ts`
```typescript
export const Root: React.FC<any>;
export const Trigger: React.FC<any>;
// ... 他14箇所
```
**理由**: 外部モジュール(@radix-ui)の型定義が不完全
**対応**: Radix UIの型定義を正確に記述するか、コミュニティ型定義を利用

##### 2. Zod Resolver (6箇所) - 優先度: 中
**場所**: 
- `features/warehouses/components/WarehouseForm.tsx`
- `features/rpa/smartread/components/SmartReadSettingsModal.tsx`
- `features/uom-conversions/components/UomConversionForm.tsx`
- `features/warehouse-delivery-routes/components/WarehouseDeliveryRouteForm.tsx`
- `features/product-mappings/components/ProductMappingForm.tsx`
- `features/delivery-places/components/DeliveryPlaceForm.tsx`

```typescript
resolver: zodResolver(warehouseFormSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
```
**理由**: react-hook-formとZodの型の不一致
**対応**: 
```typescript
// Before
resolver: zodResolver(schema) as any,

// After
resolver: zodResolver(schema) as Resolver<WarehouseFormData>,
```

##### 3. Chart Event Handlers (4箇所) - 優先度: 中
**場所**:
- `features/dashboard/components/WarehouseDistributionChart.tsx`
- `features/dashboard/components/TopProductsChart.tsx`

```typescript
const handlePieClick = (data: any) => {
  if (data && data.id) {
    navigate(`/inventory?warehouse_id=${data.id}`);
  }
}
```
**理由**: Rechartsのイベントハンドラの型定義が不完全
**対応**:
```typescript
interface PieClickData {
  id?: number;
  payload?: {
    id?: number;
  };
}

const handlePieClick = (data: PieClickData) => {
  const warehouseId = data?.id ?? data?.payload?.id;
  if (warehouseId) {
    navigate(`/inventory?warehouse_id=${warehouseId}`);
  }
}
```

##### 4. その他 (5箇所) - 優先度: 低〜中
**場所**:
- `features/supplier-products/components/SupplierProductForm.tsx`: `const control = form.control as any;`
- `features/operation-logs/pages/OperationLogsPage.tsx`: `const params: any = {...}`
- `shared/libs/allocations.test.ts`: テストコードでの意図的な使用

#### バックエンド (Python)
**Any型の主な使用箇所**

##### 1. Soft Delete Utils (17箇所) - 優先度: 中
**場所**: `app/application/services/common/soft_delete_utils.py`

```python
def get_product_name(product: Any, default: str = "") -> str:
    """製品名を安全に取得 (論理削除対応)"""
    if product is None:
        return default
    return getattr(product, "product_name", default)
```
**対応**:
```python
from typing import Protocol, Optional

class HasProductName(Protocol):
    product_name: str

def get_product_name(product: Optional[HasProductName], default: str = "") -> str:
    """製品名を安全に取得 (論理削除対応)"""
    if product is None:
        return default
    return product.product_name
```

##### 2. Repository Methods (3箇所) - 優先度: 低
**場所**: `app/infrastructure/persistence/repositories/rpa_repository.py`

```python
def add(self, entity: Any) -> None:
    self.db.add(entity)

def refresh(self, entity: Any) -> None:
    self.db.refresh(entity)
```
**対応**: ジェネリクスを使用
```python
from typing import TypeVar
T = TypeVar('T')

def add(self, entity: T) -> None:
    self.db.add(entity)
```

##### 3. Export Service (2箇所) - 優先度: 低
**場所**: `app/application/services/common/export_service.py`

```python
def export_to_csv(data: list[Any], filename: str = "export") -> StreamingResponse:
    # ...
```
**対応**: TypedDictまたはプロトコルを使用

##### 4. Date Handling (2箇所) - 優先度: 高
**場所**: `app/application/services/rpa/orchestrator.py`

```python
def __init__(self, uow: Any):
    self.uow = uow

def execute(
    self,
    start_date: Any,
    end_date: Any,
) -> dict:
    # ...
```
**対応**:
```python
from datetime import date
from typing import Optional

def __init__(self, uow: UnitOfWork):
    self.uow = uow

def execute(
    self,
    start_date: date,
    end_date: date,
) -> dict:
    # ...
```

### 実装例

#### フロントエンド: Chart Event Handler
```typescript
// features/dashboard/types.ts
export interface ChartClickData {
  id?: number;
  name?: string;
  value?: number;
  payload?: {
    id?: number;
    name?: string;
    value?: number;
  };
}

// features/dashboard/components/WarehouseDistributionChart.tsx
import type { ChartClickData } from '../types';

const handlePieClick = (data: ChartClickData) => {
  const warehouseId = data?.id ?? data?.payload?.id;
  if (warehouseId) {
    navigate(`/inventory?warehouse_id=${warehouseId}`);
  }
};
```

#### バックエンド: Protocol for Soft Delete
```python
# app/domain/protocols.py
from typing import Protocol, Optional

class HasProductAttributes(Protocol):
    product_name: str
    maker_part_code: str

class HasCustomerAttributes(Protocol):
    customer_name: str
    customer_code: str

# app/application/services/common/soft_delete_utils.py
from app.domain.protocols import HasProductAttributes

def get_product_name(
    product: Optional[HasProductAttributes], 
    default: str = ""
) -> str:
    if product is None:
        return default
    return product.product_name
```

### 進捗管理
- 開始日: 2026-01-18
- 目標完了日: Phase 1は1週間以内、Phase 2は1ヶ月以内
- 担当: 開発チーム

### 参考資料
- [TypeScript: Protocols via Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- [Python: Protocols (PEP 544)](https://peps.python.org/pep-0544/)
- [React Hook Form: TypeScript Support](https://react-hook-form.com/ts)
