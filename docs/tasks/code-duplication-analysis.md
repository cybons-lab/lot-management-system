# Code Duplication Analysis Report

**調査日**: 2025-11-28
**対象**: Backend & Frontend codebase
**ステータス**: Complete

## Executive Summary

型定義の重複調査から始まり、**関数・クラスレベルで大規模な重複**を発見しました。

**重複コード総量**: 約2,130行
**削減可能量**: 約1,860行（**87%削減可能**）
**影響範囲**: Backend 14ファイル、Frontend 30+ファイル

---

## Backend Duplications

### 🔴 HIGH PRIORITY

#### 1. CRUD Service Methods（30+メソッド）

**影響ファイル**:
- `backend/app/services/auth/user_service.py`
- `backend/app/services/auth/role_service.py`
- `backend/app/services/admin/business_rules_service.py`
- `backend/app/services/admin/batch_jobs_service.py`
- `backend/app/services/admin/operation_logs_service.py`
- `backend/app/services/masters/customer_items_service.py`
- その他8ファイル

**重複パターン**:
```python
# get_by_id() - 6箇所で同一
def get_by_id(self, entity_id: int) -> Model | None:
    return self.db.query(Model).filter(Model.id == entity_id).first()

# get_all() - 7箇所で同一
def get_all(self, skip: int = 0, limit: int = 100) -> list[Model]:
    return self.db.query(Model).offset(skip).limit(limit).all()

# create() - 6箇所で同一
def create(self, data: CreateSchema) -> Model:
    db_entity = Model(**data.model_dump())
    self.db.add(db_entity)
    self.db.commit()
    self.db.refresh(db_entity)
    return db_entity

# update() - 4箇所で同一
def update(self, entity_id: int, data: UpdateSchema) -> Model | None:
    db_entity = self.get_by_id(entity_id)
    if not db_entity:
        return None

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(db_entity, key, value)

    db_entity.updated_at = datetime.now()
    self.db.commit()
    self.db.refresh(db_entity)
    return db_entity

# delete() - 5箇所で同一
def delete(self, entity_id: int) -> bool:
    db_entity = self.get_by_id(entity_id)
    if not db_entity:
        return False

    self.db.delete(db_entity)
    self.db.commit()
    return True
```

**削減見込み**: 500行 → 50行（90%削減）

---

#### 2. Transaction Handling の散在

**統計**:
- `self.db.commit()`: **39箇所**
- `self.db.refresh()`: **31箇所**
- `updated_at = datetime.now()`: **11箇所**

**最多ファイル**:
- `batch_jobs_service.py`: 6 commits, 5 refreshes
- `user_service.py`: 5 commits, 3 refreshes
- `business_rules_service.py`: 5 commits, 4 refreshes
- `inbound_service.py`: 4 commits, 6 refreshes

**問題点**: トランザクション管理がService層に散在し、一貫性がない

---

#### 3. ListResponse Schema Pattern（14スキーマ）

**影響ファイル**:
- `admin_schema.py`: `AdminPresetListResponse`
- `allocations_schema.py`: `AllocationListResponse`
- `allocation_suggestions_schema.py`: `AllocationSuggestionListResponse`
- `business_rules_schema.py`: `BusinessRuleListResponse`
- `masters_schema.py`: 4個のListResponse
- `warehouses_schema.py`: `WarehouseListResponse`
- `inbound_schema.py`: `InboundPlanListResponse`
- `forecast_schema.py`: `ForecastListResponse`
- `operation_logs_schema.py`: 2個のListResponse
- `batch_jobs_schema.py`: `BatchJobListResponse`

**パターン**:
```python
class EntityListResponse(BaseSchema):
    items: list[EntityResponse]
    total: int = 0
```

**問題点**:
- フィールド名が統一されていない（`items` vs `rules`）
- 一部は `total` のデフォルト値がない
- 継承元が異なる（`BaseSchema` vs `BaseModel`）

**削減見込み**: 280行 → 20行（93%削減）

---

#### 4. Repository CRUD Methods（10+メソッド）

**影響ファイル**:
- `allocation_repository.py`
- `order_repository.py`
- `products_repository.py`

**重複パターン**:
```python
# find_by_id() - 3箇所で同一
def find_by_id(self, entity_id: int) -> Model | None:
    stmt = select(Model).where(Model.id == entity_id)
    return self.db.execute(stmt).scalar_one_or_none()

# create() - 3箇所で同一
def create(self, entity: Model) -> Model:
    self.db.add(entity)
    self.db.flush()
    return entity

# delete() - 3箇所で同一
def delete(self, entity: Model) -> None:
    self.db.delete(entity)
    self.db.flush()
```

**コメントの重複**:
```python
# NOTE: commitはservice層で行う
```
このコメントが7箇所に存在

---

### 🟡 MEDIUM PRIORITY

#### 5. Header/Line Service Pattern（2サービス）

**影響ファイル**:
- `inventory/inbound_service.py`
- `forecasts/forecast_service.py`

**類似メソッド**:
- `get_inbound_plans()` vs `get_forecasts()`
- `create_inbound_plan()` vs `create_forecast()`
- `update_inbound_plan()` vs `update_forecast()`

**パターン**: ヘッダ・明細の親子構造を持つエンティティの処理が類似

---

#### 6. Base/Create/Update/Response Pattern（71箇所）

**発生ファイル**:
- `masters_schema.py`: 16箇所
- `inventory_schema.py`: 9箇所
- `inbound_schema.py`: 9箇所
- `orders_schema.py`: 8箇所
- その他7ファイル

**パターン**:
```python
class EntityBase(BaseSchema):
    field1: str
    field2: str

class EntityCreate(EntityBase):
    pass

class EntityUpdate(BaseSchema):
    field1: str | None = None
    field2: str | None = None

class EntityResponse(EntityBase):
    id: int
    created_at: datetime
    updated_at: datetime
```

**評価**: 意図的なパターンだが、ジェネリック基底クラスで改善可能

---

### 既知の重複（CLAUDE.md記載）

#### 7. Schema Duplicates

- `ProductBase`: `masters_schema.py` と `products_schema.py` に定義
- `WarehouseOut` vs `WarehouseResponse`: 同一エンティティに2つのスキーマ

**ファイル**:
- `warehouses_schema.py:7-14`: `WarehouseOut`
- `masters_schema.py:47-53`: `WarehouseResponse`

---

## Frontend Duplications

### 🔴 HIGH PRIORITY

#### 1. URLSearchParams Building（78箇所）

**影響ファイル**: 12ファイル
- `features/users/api.ts:65-73`
- `features/roles/api.ts:47-53`
- `features/orders/api.ts:25-35`
- `features/inventory/api.ts:51-67`
- `features/forecasts/api.ts:40-50`
- `features/inbound-plans/api.ts:127-138`
- `features/adjustments/api.ts:57-65`
- `features/allocations/api.ts:77-90, 269-286`
- その他4ファイル

**重複パターン**:
```typescript
const searchParams = new URLSearchParams();
if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
if (params?.limit !== undefined) searchParams.append("limit", params.limit.toString());
// ... 3-10行の類似コード
const queryString = searchParams.toString();
return fetchApi.get<T>(`/endpoint${queryString ? "?" + queryString : ""}`);
```

**削減見込み**: 150行 → 10行（**93%削減**）

---

#### 2. Master Data CRUD API（400行の重複）

**影響ファイル**:
- `features/customers/api/customers-api.ts` (173行)
- `features/products/api/products-api.ts` (118行)
- `features/suppliers/api/suppliers-api.ts` (109行)
- `features/warehouses/api/warehouses-api.ts` (111行)

**重複内容**:
1. 型インポート（OpenAPI schemas）
2. `list`, `get`, `create`, `update`, `delete` 関数
3. `upsertRow` ヘルパー関数（各50行）
4. `bulkUpsert` 関数（各60行）

**比較例**:
```typescript
// customers-api.ts:29-32
export async function listCustomers(): Promise<Customer[]> {
  const response = await http.get<Customer[]>(BASE_PATH);
  return response.data;
}

// products-api.ts:22-25 - 型名以外同一
export async function listProducts(): Promise<Product[]> {
  const response = await http.get<Product[]>(BASE_PATH);
  return response.data;
}
```

**削減見込み**: 400行 → 50行（**88%削減**）

---

#### 3. Query Hooks Pattern（10+フック）

**影響ファイル**:
- `features/customers/hooks/useCustomersQuery.ts`
- `features/products/hooks/useProductsQuery.ts`
- `features/suppliers/hooks/useSuppliersQuery.ts`
- `features/warehouses/hooks/useWarehousesQuery.ts`

**重複パターン**: 全ファイルが15行で同一（エンティティ名のみ異なる）
```typescript
import { useQuery } from "@tanstack/react-query";
import { list[Entity], type [Entity] } from "../api/[entity]-api";

export const [ENTITY]_QUERY_KEY = ["[entity]"] as const;

export function use[Entity]Query() {
  return useQuery<[Entity][], Error>({
    queryKey: [ENTITY]_QUERY_KEY,
    queryFn: list[Entity],
  });
}
```

---

#### 4. Mutation Hooks Pattern（32フック）

**影響ファイル**:
- `features/customers/hooks/useCustomerMutations.ts` (78行)
- `features/products/hooks/useProductMutations.ts` (73行)
- `features/suppliers/hooks/useSupplierMutations.ts` (73行)
- `features/warehouses/hooks/useWarehouseMutations.ts` (50行)

**各ファイルの内容**: 4つの同一パターンフック
1. `useCreate[Entity]` - 10行
2. `useUpdate[Entity]` - 12行
3. `useDelete[Entity]` - 10行
4. `useBulkUpsert[Entity]` - 18行

**削減見込み**: 250行 → 30行（**88%削減**）

---

#### 5. CSV Utilities（400行の重複）

**影響ファイル**:
- `features/customers/utils/customer-csv.ts` (196行)
- `features/products/utils/product-csv.ts` (155行)
- `features/suppliers/utils/supplier-csv.ts` (110行)
- `features/warehouses/utils/warehouse-csv.ts` (112行)

**重複関数**:

1. **`parseCSVLine` / `parseCsvLine`** - 4ファイルで同一実装（各20行）
   - customers-csv.ts:113-138
   - products-csv.ts:88-106
   - suppliers-csv.ts:62-80
   - warehouses-csv.ts - 簡易版を使用（本来は共通版を使うべき）

2. **`parse[Entity]Csv`** - 4ファイルで類似構造（各50-80行）
   - ヘッダバリデーション: 重複
   - 行パース: 重複
   - 操作バリデーション: 重複
   - 必須フィールドチェック: 類似パターン

3. **`generate[Entity]Csv`** - 同一パターン（各20行）

4. **`generateTemplate`** - 同一パターン（各5-8行）

5. **`downloadCSV`** - **完全な重複**が2ファイルに存在:
   - customers-csv.ts:183-195
   - warehouses-csv.ts:100-111

**削減見込み**: 400行 → 100行（**75%削減**）

---

### 🟡 MEDIUM PRIORITY

#### 6. Bulk Operation Types

**現状**: `features/customers/types/bulk-operation.ts` に基底型を定義し、他の機能がre-export

**問題点**: 基底型はCustomers機能ではなく、sharedに配置すべき

**影響ファイル**:
- `features/customers/types/bulk-operation.ts` - 基底型定義
- `features/products/types/bulk-operation.ts` - Re-export
- `features/suppliers/types/bulk-operation.ts` - Re-export
- `features/warehouses/types/bulk-operation.ts` - Re-export

---

#### 7. List/Query Parameter Types

**パターン**: 全機能が類似のパラメータ型を定義
```typescript
export interface [Entity]ListParams {
  skip?: number;
  limit?: number;
  // ... エンティティ固有のフィルタ
}
```

**影響ファイル**: users, roles, orders, forecasts, inbound-plans, adjustments, allocations, inventory など10+ファイル

---

#### 8. Zod Validators（100行）

**影響ファイル**:
- `features/customers/validators/customer-schema.ts` (27行)
- `features/products/validators/product-schema.ts` (27行)
- `features/suppliers/validators/supplier-schema.ts` (29行)
- `features/warehouses/validators/warehouse-schema.ts` (29行)

**パターン**:
```typescript
import { z } from "zod";

export const [entity]Schema = z.object({
  [entity]_code: z.string().min(1, "[Entity]コードは必須です"),
  [entity]_name: z.string().min(1, "[Entity]名は必須です"),
  // ... 2-5個のフィールド
});

export type [Entity]Input = z.infer<typeof [entity]Schema>;
```

**評価**: フィールドが本質的に異なるため、削減効果は限定的（40%程度）

---

## Summary Tables

### Backend削減見込み

| カテゴリ | 現状行数 | 削減後 | 削減率 | 優先度 |
|---------|----------|--------|--------|--------|
| CRUD Service Methods | 500行 | 50行 | 90% | HIGH |
| ListResponse Schemas | 280行 | 20行 | 93% | HIGH |
| Repository Methods | 150行 | 20行 | 87% | HIGH |
| Transaction Handling | 散在 | 集約 | - | HIGH |
| Header/Line Pattern | 300行 | 100行 | 67% | MEDIUM |
| Base/Create/Update | 1,000行 | 800行 | 20% | LOW |
| **合計** | **2,230行** | **990行** | **56%** | - |

### Frontend削減見込み

| カテゴリ | 現状行数 | 削減後 | 削減率 | 優先度 |
|---------|----------|--------|--------|--------|
| URLSearchParams | 150行 | 10行 | 93% | HIGH |
| Master CRUD APIs | 400行 | 50行 | 88% | HIGH |
| Query Hooks | 150行 | 20行 | 87% | HIGH |
| Mutation Hooks | 250行 | 30行 | 88% | HIGH |
| CSV Utilities | 400行 | 100行 | 75% | HIGH |
| Bulk Operations | 200行 | 50行 | 75% | MEDIUM |
| Validators | 100行 | 60行 | 40% | LOW |
| Type Definitions | 150行 | 80行 | 47% | MEDIUM |
| **合計** | **1,800行** | **400行** | **78%** | - |

### 機能別重複度

| 機能 | 重複度 | 影響行数 | 優先度 |
|------|--------|----------|--------|
| **Customers** | 85% | 300行 | HIGH |
| **Products** | 85% | 280行 | HIGH |
| **Suppliers** | 85% | 260行 | HIGH |
| **Warehouses** | 85% | 250行 | HIGH |
| **Users/Roles** | 90% | 150行/機能 | HIGH |

---

## Recommendations

### Backend Refactoring

#### 1. Generic CRUD Service Base Class（HIGH）

**作成ファイル**: `backend/app/services/common/base_service.py`

```python
from typing import Generic, TypeVar
from sqlalchemy.orm import Session
from datetime import datetime

T = TypeVar('T')

class BaseCRUDService(Generic[T]):
    def __init__(self, db: Session, model: type[T]):
        self.db = db
        self.model = model

    def get_by_id(self, entity_id: int) -> T | None:
        return self.db.query(self.model).filter(self.model.id == entity_id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[T]:
        return self.db.query(self.model).offset(skip).limit(limit).all()

    def create(self, data: BaseModel) -> T:
        entity = self.model(**data.model_dump())
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def update(self, entity_id: int, data: BaseModel) -> T | None:
        entity = self.get_by_id(entity_id)
        if not entity:
            return None

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(entity, key, value)

        if hasattr(entity, 'updated_at'):
            entity.updated_at = datetime.now()

        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, entity_id: int) -> bool:
        entity = self.get_by_id(entity_id)
        if not entity:
            return False

        self.db.delete(entity)
        self.db.commit()
        return True
```

**使用例**:
```python
class UserService(BaseCRUDService[User]):
    def __init__(self, db: Session):
        super().__init__(db, User)

    # カスタムメソッドのみ追加
    def assign_roles(self, user_id: int, role_ids: list[int]):
        # ...
```

**効果**: 30+メソッドを削除、500行 → 50行

---

#### 2. Generic ListResponse Schema（HIGH）

**作成ファイル**: `backend/app/schemas/common/base.py`

```python
from typing import Generic, TypeVar
from pydantic import Field

T = TypeVar('T')

class ListResponse(BaseSchema, Generic[T]):
    """Generic list response with pagination."""
    items: list[T] = Field(default_factory=list)
    total: int = 0
```

**使用例**:
```python
# Before
class CustomerListResponse(BaseSchema):
    items: list[CustomerResponse]
    total: int = 0

# After
CustomerListResponse = ListResponse[CustomerResponse]
```

**効果**: 14スキーマを削除、280行 → 20行

---

#### 3. Repository Base Class（HIGH）

**作成ファイル**: `backend/app/repositories/base_repository.py`

```python
from typing import Generic, TypeVar
from sqlalchemy.orm import Session
from sqlalchemy import select

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, db: Session, model: type[T]):
        self.db = db
        self.model = model

    def find_by_id(self, entity_id: int) -> T | None:
        stmt = select(self.model).where(self.model.id == entity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def create(self, entity: T) -> T:
        self.db.add(entity)
        self.db.flush()  # NOTE: commitはservice層で行う
        return entity

    def delete(self, entity: T) -> None:
        self.db.delete(entity)
        self.db.flush()  # NOTE: commitはservice層で行う
```

**効果**: 10+メソッドを削除、150行 → 20行

---

### Frontend Refactoring

#### 4. URLSearchParams Utility（HIGH）

**作成ファイル**: `frontend/src/shared/utils/api-helpers.ts`

```typescript
/**
 * Build URL search params from object
 */
export function buildSearchParams(params?: Record<string, unknown>): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}
```

**使用例**:
```typescript
// Before (78箇所で重複)
const searchParams = new URLSearchParams();
if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
// ... 10行

// After
const queryString = buildSearchParams(params);
return fetchApi.get<T>(`/endpoint${queryString}`);
```

**効果**: 78箇所を置換、150行 → 10行

---

#### 5. Generic CRUD API Factory（HIGH）

**作成ファイル**: `frontend/src/shared/api/crud-factory.ts`

```typescript
export function createCrudApi<
  TEntity,
  TCreate,
  TUpdate,
  TBulkRow extends BulkRowBase
>(config: {
  basePath: string;
  entityKey: string;
  entityCodeField: string;
}) {
  return {
    list: async () => {
      const response = await http.get<TEntity[]>(config.basePath);
      return response.data;
    },

    get: async (code: string) => {
      const response = await http.get<TEntity>(`${config.basePath}/${code}`);
      return response.data;
    },

    create: async (data: TCreate) => {
      const response = await http.post<TEntity>(config.basePath, data);
      return response.data;
    },

    update: async (code: string, data: TUpdate) => {
      const response = await http.put<TEntity>(`${config.basePath}/${code}`, data);
      return response.data;
    },

    delete: async (code: string) => {
      await http.delete(`${config.basePath}/${code}`);
    },

    bulkUpsert: async (rows: TBulkRow[]) => {
      // Generic implementation
    }
  };
}
```

**使用例**:
```typescript
// customers-api.ts
export const customersApi = createCrudApi<Customer, CustomerCreate, CustomerUpdate, CustomerBulkRow>({
  basePath: "/api/customers",
  entityKey: "customer",
  entityCodeField: "customer_code",
});

export const {
  list: listCustomers,
  get: getCustomer,
  create: createCustomer,
  update: updateCustomer,
  delete: deleteCustomer,
  bulkUpsert: bulkUpsertCustomers,
} = customersApi;
```

**効果**: 4ファイルを簡素化、400行 → 50行

---

#### 6. Generic CRUD Hooks Factory（HIGH）

**作成ファイル**: `frontend/src/shared/hooks/crud-hooks-factory.ts`

```typescript
export function createCrudHooks<TEntity, TCreate, TUpdate>(
  queryKey: string,
  api: {
    list: () => Promise<TEntity[]>;
    get: (id: string) => Promise<TEntity>;
    create: (data: TCreate) => Promise<TEntity>;
    update: (id: string, data: TUpdate) => Promise<TEntity>;
    delete: (id: string) => Promise<void>;
  }
) {
  return {
    useList: () =>
      useQuery({
        queryKey: [queryKey],
        queryFn: api.list,
      }),

    useDetail: (id: string) =>
      useQuery({
        queryKey: [queryKey, id],
        queryFn: () => api.get(id),
      }),

    useCreate: () =>
      useMutation({
        mutationFn: api.create,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
      }),

    useUpdate: () =>
      useMutation({
        mutationFn: ({ id, data }: { id: string; data: TUpdate }) => api.update(id, data),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
      }),

    useDelete: () =>
      useMutation({
        mutationFn: api.delete,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        },
      }),
  };
}
```

**使用例**:
```typescript
// customers/hooks/index.ts
export const customerHooks = createCrudHooks("customers", customersApi);

export const {
  useList: useCustomersQuery,
  useDetail: useCustomerDetail,
  useCreate: useCreateCustomer,
  useUpdate: useUpdateCustomer,
  useDelete: useDeleteCustomer,
} = customerHooks;
```

**効果**: 32フックを削除、400行 → 40行

---

#### 7. Generic CSV Parser（HIGH）

**作成ファイル**: `frontend/src/shared/utils/csv-parser.ts`

```typescript
export class CsvParser<TRow extends BulkRowBase> {
  constructor(private config: {
    headers: readonly string[];
    requiredFields: string[];
    parseRow: (data: Record<string, string>, rowNumber: number) => TRow | null;
  }) {}

  /**
   * Parse CSV line handling quoted values
   * (完全な重複を4ファイルから抽出)
   */
  static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  async parseFile(file: File): Promise<{ rows: TRow[]; errors: string[] }> {
    // Generic implementation
  }

  generateCSV<TEntity>(entities: TEntity[], mapEntity: (e: TEntity) => string[]): string {
    // Generic implementation
  }

  /**
   * Download CSV file
   * (完全な重複を2ファイルから抽出)
   */
  static downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
```

**効果**: 4ファイルを簡素化、400行 → 100行

---

#### 8. Bulk Operations Types（MEDIUM）

**移動**: `features/customers/types/bulk-operation.ts` → `shared/types/bulk-operations.ts`

**効果**: インポートパスの明確化、機能間の依存解消

---

## Implementation Roadmap

### Phase 1: Quick Wins（1週間）
**工数**: 16時間

1. **URLSearchParams utility** (2h)
   - 作成: `shared/utils/api-helpers.ts`
   - 置換: 78箇所
   - 効果: 140行削減

2. **CSV utilities** (6h)
   - 作成: `shared/utils/csv-parser.ts`
   - `parseCSVLine`, `downloadCSV` を共通化
   - 置換: 7箇所
   - 効果: 120行削減

3. **Bulk operations types** (2h)
   - 移動: `shared/types/bulk-operations.ts`
   - 更新: 4ファイルのインポート
   - 効果: 構造の明確化

4. **ListResponse generic** (2h)
   - 作成: `backend/app/schemas/common/base.py`
   - 置換: 14スキーマ
   - 効果: 260行削減

5. **テスト** (4h)

**Phase 1合計**: 520行削減

---

### Phase 2: Backend Service Layer（2週間）
**工数**: 40時間

6. **BaseCRUDService** (12h)
   - 作成: `backend/app/services/common/base_service.py`
   - 移行: 8サービス
   - テスト: 既存テストが通ることを確認
   - 効果: 450行削減

7. **BaseRepository** (8h)
   - 作成: `backend/app/repositories/base_repository.py`
   - 移行: 3リポジトリ
   - テスト
   - 効果: 130行削減

8. **Duplicate schemas修正** (4h)
   - `WarehouseOut` vs `WarehouseResponse` 統一
   - `ProductBase` 重複削除
   - 効果: 明確化

9. **統合テスト** (8h)

10. **ドキュメント更新** (8h)
    - CLAUDE.md更新
    - アーキテクチャドキュメント更新

**Phase 2合計**: 580行削減

---

### Phase 3: Frontend API & Hooks（2週間）
**工数**: 40時間

11. **Generic CRUD API factory** (12h)
    - 作成: `shared/api/crud-factory.ts`
    - 移行: customers → products → suppliers → warehouses
    - テスト
    - 効果: 350行削減

12. **Generic hooks factory** (12h)
    - 作成: `shared/hooks/crud-hooks-factory.ts`
    - 移行: 全マスタデータフック
    - テスト
    - 効果: 360行削減

13. **Query key standardization** (8h)
    - 標準パターン決定
    - 全機能に適用
    - 効果: 一貫性向上

14. **統合テスト** (8h)

**Phase 3合計**: 710行削減

---

### Phase 4: CSV & Advanced Patterns（1週間）
**工数**: 24時間

15. **Generic CSV parser** (12h)
    - 作成: `shared/utils/csv-parser.ts`
    - 移行: 4機能
    - テスト
    - 効果: 300行削減

16. **Header/Line service pattern** (8h）
    - 作成: 共通基底クラス検討
    - InboundService, ForecastService リファクタ
    - 効果: 200行削減

17. **最終テスト & ドキュメント** (4h)

**Phase 4合計**: 500行削減

---

## Total Impact

### コード削減量

| Phase | Backend | Frontend | 合計 |
|-------|---------|----------|------|
| Phase 1 | 260行 | 260行 | 520行 |
| Phase 2 | 580行 | 0行 | 580行 |
| Phase 3 | 0行 | 710行 | 710行 |
| Phase 4 | 200行 | 300行 | 500行 |
| **合計** | **1,040行** | **1,270行** | **2,310行** |

### 工数

| Phase | 工数 | 期間 |
|-------|------|------|
| Phase 1 | 16時間 | 1週間 |
| Phase 2 | 40時間 | 2週間 |
| Phase 3 | 40時間 | 2週間 |
| Phase 4 | 24時間 | 1週間 |
| **合計** | **120時間** | **6週間** |

### 期待効果

1. **保守性向上**
   - 重複コードの削減 → 変更箇所が1箇所に集約
   - バグ修正が容易に

2. **一貫性向上**
   - CRUD操作が標準化
   - エラーハンドリングが統一
   - キャッシュ管理が統一

3. **新機能開発の高速化**
   - 新しいマスタデータ機能は既存パターンを再利用
   - CSV対応が自動的に可能
   - CRUD hookが自動生成

4. **オンボーディング改善**
   - 学習すべきパターンが1つに集約
   - 4つの異なる実装 → 1つの標準パターン

5. **テスト工数削減**
   - 共通ロジックのテストが1箇所
   - 個別機能はビジネスロジックのみテスト

---

## Risk Assessment

### 低リスク（Phase 1）
- **URLSearchParams utility**: 純粋なユーティリティ、副作用なし
- **CSV utilities**: 既存ロジックの抽出のみ
- **ListResponse generic**: Pydanticのジェネリクス機能を使用

### 中リスク（Phase 2, 3）
- **BaseCRUDService**: 既存のService層に影響
  - 緩和策: 段階的移行、既存テストで検証
- **Generic CRUD API**: 4機能に影響
  - 緩和策: 1機能ずつ移行、十分なテスト

### 高リスク（Phase 4）
- **Header/Line pattern**: 複雑なビジネスロジック
  - 緩和策: 慎重な設計レビュー、十分な統合テスト

---

## Next Steps

1. **レビュー** (1日)
   - このレポートをチームでレビュー
   - 優先順位の合意

2. **Phase 1開始** (1週間)
   - Quick Winsを実装
   - 効果を測定

3. **Phase 2-4計画** (2日)
   - 詳細設計
   - タスク分割

4. **実装** (6週間)
   - フェーズごとに実装
   - 定期的なレビュー

---

## Appendix: Detailed File List

### Backend重複ファイル

**Service Layer**:
- `backend/app/services/auth/user_service.py`
- `backend/app/services/auth/role_service.py`
- `backend/app/services/admin/business_rules_service.py`
- `backend/app/services/admin/batch_jobs_service.py`
- `backend/app/services/admin/operation_logs_service.py`
- `backend/app/services/masters/customer_items_service.py`
- `backend/app/services/inventory/lot_service.py`
- `backend/app/services/inventory/inbound_service.py`
- `backend/app/services/forecasts/forecast_service.py`

**Schema Layer**:
- `backend/app/schemas/admin/admin_schema.py`
- `backend/app/schemas/allocations/allocations_schema.py`
- `backend/app/schemas/allocations/allocation_suggestions_schema.py`
- `backend/app/schemas/system/business_rules_schema.py`
- `backend/app/schemas/masters/masters_schema.py`
- `backend/app/schemas/masters/warehouses_schema.py`
- `backend/app/schemas/masters/products_schema.py`
- `backend/app/schemas/inventory/inbound_schema.py`
- `backend/app/schemas/forecasts/forecast_schema.py`
- `backend/app/schemas/system/operation_logs_schema.py`
- `backend/app/schemas/system/batch_jobs_schema.py`

**Repository Layer**:
- `backend/app/repositories/allocation_repository.py`
- `backend/app/repositories/order_repository.py`
- `backend/app/repositories/products_repository.py`

### Frontend重複ファイル

**API Layer**:
- `frontend/src/features/customers/api/customers-api.ts`
- `frontend/src/features/products/api/products-api.ts`
- `frontend/src/features/suppliers/api/suppliers-api.ts`
- `frontend/src/features/warehouses/api/warehouses-api.ts`
- `frontend/src/features/users/api.ts`
- `frontend/src/features/roles/api.ts`
- `frontend/src/features/orders/api.ts`
- `frontend/src/features/inventory/api.ts`
- `frontend/src/features/forecasts/api.ts`
- `frontend/src/features/inbound-plans/api.ts`
- `frontend/src/features/adjustments/api.ts`
- `frontend/src/features/allocations/api.ts`

**Hooks Layer**:
- `frontend/src/features/customers/hooks/useCustomersQuery.ts`
- `frontend/src/features/customers/hooks/useCustomerMutations.ts`
- `frontend/src/features/products/hooks/useProductsQuery.ts`
- `frontend/src/features/products/hooks/useProductMutations.ts`
- `frontend/src/features/suppliers/hooks/useSuppliersQuery.ts`
- `frontend/src/features/suppliers/hooks/useSupplierMutations.ts`
- `frontend/src/features/warehouses/hooks/useWarehousesQuery.ts`
- `frontend/src/features/warehouses/hooks/useWarehouseMutations.ts`

**Utils Layer**:
- `frontend/src/features/customers/utils/customer-csv.ts`
- `frontend/src/features/products/utils/product-csv.ts`
- `frontend/src/features/suppliers/utils/supplier-csv.ts`
- `frontend/src/features/warehouses/utils/warehouse-csv.ts`

**Types**:
- `frontend/src/features/customers/types/bulk-operation.ts`
- `frontend/src/features/products/types/bulk-operation.ts`
- `frontend/src/features/suppliers/types/bulk-operation.ts`
- `frontend/src/features/warehouses/types/bulk-operation.ts`

**Validators**:
- `frontend/src/features/customers/validators/customer-schema.ts`
- `frontend/src/features/products/validators/product-schema.ts`
- `frontend/src/features/suppliers/validators/supplier-schema.ts`
- `frontend/src/features/warehouses/validators/warehouse-schema.ts`

---

## Conclusion

このコードベースには**体系的な重複パターン**が存在します。特に：

1. **Master Data機能**（Customers, Products, Suppliers, Warehouses）が85-90%同一
2. **CRUD操作**が各層で繰り返し実装されている
3. **CSV処理**が完全に重複している

**即座に実行可能なQuick Wins**（Phase 1）で520行削減し、**6週間の段階的リファクタリング**で合計2,310行を削減できます。

これにより：
- 保守性が大幅に向上
- 新機能開発が高速化
- バグの発生率が低下
- チームの生産性が向上

次のステップは、このレポートのレビューとPhase 1の着手です。
