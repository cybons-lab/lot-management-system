# Error Handling Standards

## Philosophy

**Core Principles:**
1. **Fail Gracefully** - Always provide user-friendly feedback
2. **Log Everything** - All errors logged with context for debugging
3. **Consistent UX** - Unified error display patterns
4. **Clear Ownership** - Each layer knows what errors to handle

---

## Backend Error Handling

### Exception Hierarchy

```python
Exception
├── DomainError (app.domain.errors)
│   ├── OrderNotFoundError
│   ├── ProductNotFoundError
│   ├── DuplicateOrderError
│   └── InvalidOrderStatusError
├── HTTPException (FastAPI)
└── SQLAlchemy Exceptions
    ├── IntegrityError
    └── DataError
```

### Layer Responsibilities

| Layer | Responsibility |
|-------|----------------|
| **API** | Input validation, HTTP status mapping |
| **Service** | Catch DB errors, raise domain errors |
| **Domain** | Pure business rule violations |
| **Global Handlers** | Convert to Problem+JSON |

### Best Practices

```python
# ✅ DO: Catch DB errors, raise domain errors (Service Layer)
from app.domain.errors import DuplicateOrderError
from sqlalchemy.exc import IntegrityError

async def create_order(self, data: OrderCreate) -> Order:
    try:
        order = Order(**data.model_dump())
        self.db.add(order)
        await self.db.flush()
        return order
    except IntegrityError:
        raise DuplicateOrderError(f"注文コード {data.order_code} は既に存在します")

# ❌ DON'T: Swallow errors
try:
    result = await service.do_something()
except Exception:
    pass  # Silent failure
```

### Router Layer Guidelines

**推奨パターン: グローバルハンドラに委譲**

```python
# ✅ 推奨: シンプルなエンドポイント - try-catch不要
@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    service = OrderService(db)
    return service.get_order_detail(order_id)  # DomainError → Global Handler

# ✅ 許容: トランザクション制御が必要な場合のみ明示的try-catch
@router.post("/{order_line_id}/allocations", status_code=200)
def save_manual_allocations(..., db: Session = Depends(get_db)):
    try:
        # 複数のDB操作
        ...
        db.commit()
        return result
    except DomainError:
        db.rollback()
        raise  # Re-raise for global handler
    except Exception as e:
        db.rollback()
        logging.exception("Unexpected error")
        raise  # Re-raise for generic handler

# ❌ 非推奨: HTTPException を直接 raise（サービス層で）
def create_lot(self, lot_create: LotCreate) -> LotResponse:
    if not product:
        raise HTTPException(status_code=404, detail="製品が見つかりません")  # NG
    # 代わりに:
    if not product:
        raise ProductNotFoundError(lot_create.product_id)  # OK
```

**例外の変換ルール:**
| Service層の例外 | 変換先 |
|----------------|--------|
| `ValueError` | `DomainError` subclass |
| `IntegrityError` | `DuplicateXxxError` |
| 一般 `Exception` | re-raise（グローバルハンドラへ）|

### Problem+JSON Format (RFC 7807)

```json
{
  "type": "about:blank",
  "title": "OrderNotFoundError",
  "status": 404,
  "detail": "注文が見つかりません: ORD-001",
  "instance": "/api/orders/ORD-001"
}
```

---

## Frontend Error Handling

### Error Flow

```
HTTP Request
    ↓
ky client (beforeError hook)
    ↓
Custom Error Classes (ApiError, NetworkError)
    ↓
React Query global onError
    ↓
Component error state
    ↓
User sees error UI
```

### Best Practices

```typescript
// ✅ DO: Use React Query error states
export function ProductsPage() {
  const { data, isLoading, isError, error } = useProducts();
  
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <QueryError error={error} />;
  
  return <ProductTable products={data} />;
}

// ✅ DO: Handle mutation errors
const { mutate } = useMutation({
  mutationFn: createProduct,
  onError: (error) => {
    toast.error(`作成に失敗しました: ${getErrorMessage(error)}`);
  },
});

// ❌ DON'T: Ignore error states
const { data } = useProducts();
return <ProductTable products={data} />;  // Crashes if undefined
```

### Error Display Components

```typescript
// Query errors with retry
<QueryError error={error} retry={() => refetch()} />

// Toast notifications
toast.error(getErrorMessage(error));
```

---

## Error Messages

**Guidelines:**
- All user-facing messages in Japanese
- Include: What went wrong, Why, What user can do

**Examples:**
- ✅ "製品コード PROD-001 は既に登録されています"
- ❌ "エラーが発生しました" (too vague)

---

## Reference

- Backend: `app/core/errors.py`
- Frontend: `shared/api/http-client.ts`
