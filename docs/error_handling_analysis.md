# Error Handling Analysis Report

**作成日:** 2025-12-06
**対象バージョン:** v2.1.0

---

## 1. 調査概要

### 1.1 調査範囲
- **Frontend:** `frontend/src/` 全体
- **Backend:** `backend/app/` 全体

### 1.2 調査観点
1. try-catch 使用箇所の特定
2. エラーログ記録状況
3. ユーザーへの通知状況
4. 握り潰されているエラーの検出

---

## 2. Frontend 現状分析

### 2.1 エラーハンドリング基盤（良好）

| コンポーネント | ファイル | 状態 |
|---------------|---------|------|
| Error Logger | `services/error-logger.ts` | **良好** - 集約ロギング実装済み |
| Error Boundary | `components/error/ErrorBoundary.tsx` | **良好** - App全体をラップ |
| HTTP Client | `shared/api/http-client.ts` | **良好** - beforeError hook で集約処理 |
| Custom Errors | `utils/errors/custom-errors.ts` | **良好** - 適切なエラークラス階層 |
| Global Handlers | `App.tsx` | **良好** - window.onerror, unhandledrejection |

### 2.2 問題点

#### 問題1: TanStack Query にグローバルエラーハンドラーがない
**ファイル:** `shared/libs/query-client.ts:3-11`

```typescript
// 現状
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**影響:**
- Query/Mutation エラーがコンポーネントで個別対応必須
- エラー通知の一貫性がない

#### 問題2: Mutation フックでのエラーハンドリングがオプショナル
**ファイル:** `hooks/mutations/useOrderMutations.ts`, `hooks/mutations/useLotMutations.ts` など

```typescript
// 現状 - onError は optional
export function useCreateOrder(options?: {
  onSuccess?: (data: OrderDetail) => void;
  onError?: (error: Error) => void;  // ← optional
}): UseMutationResult<OrderDetail, Error, OrderCreate> {
  return useMutation({
    mutationFn: createOrder,
    onSuccess: (data) => { ... },
    onError: options?.onError,  // ← 渡されない場合は何も起きない
  });
}
```

**影響:**
- 呼び出し側が onError を渡し忘れるとユーザーに通知されない
- 複数箇所で同じ toast.error 処理を書く必要がある

#### 問題3: Query のエラー状態未対応コンポーネント
**ファイル例:** 各種ページコンポーネント

```typescript
// 問題のあるパターン (部分的)
const { data, isLoading } = useOrders();
// isError, error を使用していない

if (isLoading) return <Loading />;
return <Table data={data} />;  // data が undefined の可能性
```

**影響:**
- エラー時に意味のある UI が表示されない
- 空画面やクラッシュの可能性

#### 問題4: console.error のみでユーザー通知がない箇所
**ファイル:** `features/forecasts/pages/ForecastListPage.tsx:98-101`

```typescript
onError: (error) => {
  console.error("Generation failed:", error);  // ← 開発者向けのみ
  toast.error("引当推奨の生成に失敗しました");  // ← OK
},
```

これは良い例だが、以下のような箇所も存在:

```typescript
// shared/utils/date.ts:30
catch (error) {
  console.warn("Invalid date passed to formatDate:", date, error);
  return fallback;  // ← ユーザーに通知されない（意図的かもしれない）
}
```

### 2.3 Frontend 改善が必要な箇所一覧

| 優先度 | 問題 | ファイル |
|--------|------|---------|
| **高** | QueryClient グローバルエラーハンドラー未設定 | `shared/libs/query-client.ts` |
| **高** | Mutation hooks でデフォルトエラー処理がない | `hooks/mutations/*.ts` |
| **中** | 一部コンポーネントでエラー状態未対応 | 各ページコンポーネント |
| **低** | 日付フォーマットエラーのサイレント処理 | `shared/utils/date.ts` |

---

## 3. Backend 現状分析

### 3.1 エラーハンドリング基盤（良好）

| コンポーネント | ファイル | 状態 |
|---------------|---------|------|
| Global Exception Handlers | `core/errors.py` | **良好** - Problem+JSON 形式で統一 |
| Domain Errors | `domain/errors.py`, `domain/order.py` | **良好** - 適切なエラークラス |
| Logging | 各 handler | **良好** - 適切なログレベル分け |

**登録されている例外ハンドラー:**
```python
# main.py:90-93
app.add_exception_handler(StarletteHTTPException, errors.http_exception_handler)
app.add_exception_handler(RequestValidationError, errors.validation_exception_handler)
app.add_exception_handler(DomainError, errors.domain_exception_handler)
app.add_exception_handler(Exception, errors.generic_exception_handler)
```

### 3.2 問題点

#### 問題1: サービス層で HTTPException を直接 raise している
**ファイル:** `services/inventory/lot_service.py`

```python
# 問題のあるパターン
def create_lot(self, lot_create: LotCreate) -> LotResponse:
    if not lot_create.product_id:
        raise HTTPException(status_code=400, detail="product_id は必須です")

    product = self.db.query(Product).filter(...).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"製品ID '{lot_create.product_id}' が見つかりません")
```

**影響:**
- サービス層が HTTP の概念を持つ（レイヤー違反）
- ドメイン例外との混在で一貫性がない
- テストが難しくなる

**正しいパターン:**
```python
# domain/lot.py
class ProductNotFoundError(DomainError):
    def __init__(self, product_id: int):
        super().__init__(f"製品ID '{product_id}' が見つかりません")

# core/errors.py に追加
DOMAIN_EXCEPTION_MAP: dict[type[DomainError], int] = {
    ...
    ProductNotFoundError: status.HTTP_404_NOT_FOUND,
}
```

#### 問題2: Router 層のエラーハンドリングが不統一
**パターンA:** グローバルハンドラに委譲（推奨）
```python
# orders_router.py:64-68
@router.get("/{order_id}", response_model=OrderWithLinesResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    service = OrderService(db)
    return service.get_order_detail(order_id)  # ← 例外はグローバルハンドラへ
```

**パターンB:** 個別 try-catch（非推奨だが存在）
```python
# orders_router.py:107-152
@router.post("/{order_line_id}/allocations", status_code=200)
def save_manual_allocations(...):
    try:
        ...
    except ValueError as e:
        logger.error(f"Validation error during allocation save: {e}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"System error during allocation save: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save allocations: {str(e)}")
```

**影響:**
- 一貫性のない開発者体験
- 同じエラー処理コードの重複
- ログフォーマットの不統一

#### 問題3: 一部のエラーがサイレントに握り潰されている
**ファイル:** `services/orders/order_service.py:267-275`

```python
# Auto-allocate KANBAN/SPOT lines (Soft allocation)
if lines_for_auto_alloc:
    for line_id in lines_for_auto_alloc:
        try:
            auto_allocate_line(self.db, line_id)
        except Exception as e:
            # Log but don't fail order creation ← 意図的だが要検討
            logging.getLogger(__name__).warning(
                f"Auto-allocation failed for line {line_id}: {e}"
            )
```

**影響:**
- ユーザーが自動引当失敗に気付かない
- デバッグが困難

#### 問題4: Domain エラーマッピングの不完全さ
**ファイル:** `core/errors.py:30-38`

```python
DOMAIN_EXCEPTION_MAP: dict[type[DomainError], int] = {
    DomainError: status.HTTP_400_BAD_REQUEST,
    OrderNotFoundError: status.HTTP_404_NOT_FOUND,
    ProductNotFoundError: status.HTTP_404_NOT_FOUND,
    DuplicateOrderError: status.HTTP_409_CONFLICT,
    InvalidOrderStatusError: status.HTTP_400_BAD_REQUEST,
    OrderValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    OrderDomainError: status.HTTP_400_BAD_REQUEST,
}
```

**不足している例外:**
- `LotNotFoundError` (domain/lot.py)
- `InsufficientStockError` (domain/errors.py)

### 3.3 Backend 改善が必要な箇所一覧

| 優先度 | 問題 | ファイル |
|--------|------|---------|
| **高** | サービス層で HTTPException を直接 raise | `services/inventory/lot_service.py` |
| **高** | Domain エラーマッピングの不足 | `core/errors.py` |
| **中** | Router 層のエラーハンドリング不統一 | `api/routes/orders/orders_router.py` |
| **中** | 自動引当失敗のサイレント処理 | `services/orders/order_service.py` |
| **低** | 不要な重複 try-catch | 複数ルーター |

---

## 4. 改善設計案

### 4.1 Frontend 改善

#### 改善1: TanStack Query グローバルエラーハンドラー追加
**ファイル:** `shared/libs/query-client.ts`

```typescript
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { logError } from "@/services/error-logger";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "予期しないエラーが発生しました";
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only show toast for queries that have data (refetch failures)
      // Initial load failures should be handled by component UI
      if (query.state.data !== undefined) {
        toast.error(`データ更新に失敗しました: ${getErrorMessage(error)}`);
      }
      logError("QueryCache", error instanceof Error ? error : new Error(String(error)), {
        queryKey: JSON.stringify(query.queryKey),
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Always show toast for mutation failures unless explicitly suppressed
      if (!mutation.meta?.suppressErrorToast) {
        toast.error(`操作に失敗しました: ${getErrorMessage(error)}`);
      }
      logError("MutationCache", error instanceof Error ? error : new Error(String(error)), {
        mutationKey: mutation.options.mutationKey ? JSON.stringify(mutation.options.mutationKey) : undefined,
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

#### 改善2: Mutation hooks のデフォルトエラーハンドリング
**新規ファイル:** `shared/hooks/useMutationWithToast.ts`

```typescript
import { useMutation, UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

interface MutationWithToastOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn"> {
  successMessage?: string;
  errorMessage?: string;
}

export function useMutationWithToast<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: MutationWithToastOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Default error handling - can be overridden
      const message = options?.errorMessage ||
        (error instanceof Error ? error.message : "操作に失敗しました");
      toast.error(message);
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
}
```

#### 改善3: Query エラー表示コンポーネント
**新規ファイル:** `shared/components/QueryErrorFallback.tsx`

```typescript
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

interface QueryErrorFallbackProps {
  error: Error;
  resetError?: () => void;
  title?: string;
}

export function QueryErrorFallback({
  error,
  resetError,
  title = "データの取得に失敗しました"
}: QueryErrorFallbackProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-600">{error.message}</p>
          {resetError && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetError}
              className="mt-3"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              再試行
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 4.2 Backend 改善

#### 改善1: サービス層のエラー処理統一
**新規/更新ファイル:** `domain/inventory.py`

```python
from app.domain.errors import DomainError

class LotDomainError(DomainError):
    """Base class for lot-related domain errors."""
    default_code = "LOT_ERROR"

class LotNotFoundError(LotDomainError):
    """Raised when a lot is not found."""
    default_code = "LOT_NOT_FOUND"

    def __init__(self, lot_id: int):
        super().__init__(f"ロットが見つかりません: ID={lot_id}")

class WarehouseNotFoundError(LotDomainError):
    """Raised when a warehouse is not found."""
    default_code = "WAREHOUSE_NOT_FOUND"

    def __init__(self, identifier: str | int):
        super().__init__(f"倉庫が見つかりません: {identifier}")

class ProductNotFoundForLotError(LotDomainError):
    """Raised when a product is not found during lot operations."""
    default_code = "PRODUCT_NOT_FOUND"

    def __init__(self, product_id: int):
        super().__init__(f"製品が見つかりません: ID={product_id}")

class InsufficientStockForAdjustmentError(LotDomainError):
    """Raised when stock is insufficient for adjustment."""
    default_code = "INSUFFICIENT_STOCK"

    def __init__(self, current: float, requested: float):
        super().__init__(
            f"在庫不足: 現在在庫={current}, 要求数量={requested}"
        )
```

**更新ファイル:** `core/errors.py`

```python
from app.domain.inventory import (
    LotNotFoundError,
    WarehouseNotFoundError,
    ProductNotFoundForLotError,
    InsufficientStockForAdjustmentError,
)

DOMAIN_EXCEPTION_MAP: dict[type[DomainError], int] = {
    # Existing
    DomainError: status.HTTP_400_BAD_REQUEST,
    OrderNotFoundError: status.HTTP_404_NOT_FOUND,
    ProductNotFoundError: status.HTTP_404_NOT_FOUND,
    DuplicateOrderError: status.HTTP_409_CONFLICT,
    InvalidOrderStatusError: status.HTTP_400_BAD_REQUEST,
    OrderValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    OrderDomainError: status.HTTP_400_BAD_REQUEST,

    # New - Inventory Domain
    LotNotFoundError: status.HTTP_404_NOT_FOUND,
    WarehouseNotFoundError: status.HTTP_404_NOT_FOUND,
    ProductNotFoundForLotError: status.HTTP_404_NOT_FOUND,
    InsufficientStockForAdjustmentError: status.HTTP_400_BAD_REQUEST,
}
```

**更新ファイル:** `services/inventory/lot_service.py` (例)

```python
# Before (HTTPException)
def create_lot(self, lot_create: LotCreate) -> LotResponse:
    if not lot_create.product_id:
        raise HTTPException(status_code=400, detail="product_id は必須です")

    product = self.db.query(Product).filter(...).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"製品ID '{lot_create.product_id}' が見つかりません")

# After (Domain Exception)
from app.domain.inventory import ProductNotFoundForLotError, WarehouseNotFoundError

def create_lot(self, lot_create: LotCreate) -> LotResponse:
    if not lot_create.product_id:
        raise OrderValidationError("product_id は必須です")

    product = self.db.query(Product).filter(...).first()
    if not product:
        raise ProductNotFoundForLotError(lot_create.product_id)
```

#### 改善2: 自動引当失敗の通知改善
**更新ファイル:** `services/orders/order_service.py`

```python
from dataclasses import dataclass

@dataclass
class OrderCreateResult:
    """Order creation result with allocation warnings."""
    order: OrderWithLinesResponse
    allocation_warnings: list[str]

def create_order(self, order_data: OrderCreate) -> OrderCreateResult:
    # ... existing order creation logic ...

    allocation_warnings: list[str] = []

    if lines_for_auto_alloc:
        for line_id in lines_for_auto_alloc:
            try:
                auto_allocate_line(self.db, line_id)
            except Exception as e:
                warning_msg = f"明細 {line_id} の自動引当に失敗: {e}"
                logging.getLogger(__name__).warning(warning_msg)
                allocation_warnings.append(warning_msg)

    return OrderCreateResult(
        order=OrderWithLinesResponse.model_validate(order),
        allocation_warnings=allocation_warnings,
    )
```

**更新ファイル:** Router 側でレスポンスに警告を含める

```python
@router.post("", response_model=OrderWithLinesResponse, status_code=201)
def create_order(order: OrderCreate, uow: UnitOfWork = Depends(get_uow)):
    service = OrderService(uow.session)
    result = service.create_order(order)

    # Add warnings to response headers or body
    response = result.order
    if result.allocation_warnings:
        response.warnings = result.allocation_warnings  # Schema に追加

    return response
```

#### 改善3: Router 層の統一ガイドライン

**推奨パターン:**

```python
# ✅ 推奨: グローバルハンドラに委譲
@router.get("/{order_id}", response_model=OrderWithLinesResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    service = OrderService(db)
    return service.get_order_detail(order_id)  # DomainError → Global Handler

# ✅ 許容: トランザクション制御が必要な場合のみ明示的 try-catch
@router.post("/{order_line_id}/allocations", status_code=200)
def save_manual_allocations(..., db: Session = Depends(get_db)):
    try:
        # Multiple DB operations
        ...
        db.commit()
        return result
    except DomainError:
        db.rollback()
        raise  # Re-raise for global handler
    except Exception as e:
        db.rollback()
        logging.exception("Unexpected error in allocation")
        raise  # Re-raise for generic handler
```

---

## 5. 実装優先度と進捗

### Phase 1: 高優先度 ✅ 完了
1. ✅ **Frontend:** `query-client.ts` にグローバルエラーハンドラー追加
   - `QueryCache.onError`: リフェッチ失敗時のtoast + ログ
   - `MutationCache.onError`: 全ミューテーションエラーのtoast + ログ
2. ✅ **Backend:** `core/errors.py` に不足している Domain Exception マッピング追加
   - Lot, Allocation, Warehouse, Forecast ドメインの例外を追加

### Phase 2: 中優先度 ✅ 完了
1. ✅ **Frontend:** `QueryErrorFallback` コンポーネント作成
   - `shared/components/feedback/QueryErrorFallback.tsx`
   - 通常モードとコンパクトモードをサポート
2. ✅ **Backend:** `lot_service.py` の HTTPException を Domain Exception に置換
   - 新規例外: `LotValidationError`, `LotProductNotFoundError`, `LotSupplierNotFoundError`, `LotWarehouseNotFoundError`, `LotDatabaseError`
   - 34箇所の HTTPException を置換

### Phase 3: 低優先度 🔲 未着手
1. 🔲 **Backend:** 全 Router の try-catch パターン統一
   - 対象: `orders_router.py`, その他のルーター
   - 推奨パターン: グローバルハンドラに委譲
2. 🔲 **Frontend:** 全 Mutation hooks のデフォルトエラー処理統一
   - 対象: `hooks/mutations/*.ts`
   - 推奨: `useMutationWithToast` パターンの適用

---

## 6. 参考資料

- 既存標準: `docs/standards/error-handling.md`
- RFC 7807 Problem+JSON: https://tools.ietf.org/html/rfc7807
- TanStack Query Error Handling: https://tanstack.com/query/latest/docs/react/guides/query-functions#usage-with-fetch-and-other-clients-that-do-not-throw-by-default
