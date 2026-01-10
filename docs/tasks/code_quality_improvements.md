# コード品質改善タスク計画

**作成日:** 2026-01-10
**ステータス:** Phase 1完了、Phase 2完了、Phase 3未着手

---

## 概要

プロジェクト全体のコード品質調査を実施し、以下の問題を特定しました。
Phase 1（レースコンディションとエラー処理の緊急修正）は完了済みです。

---

## ✅ Phase 1: 完了（コミット済み）

### レースコンディション修正（4ファイル）

| ファイル | 修正内容 |
|---------|---------|
| `frontend/src/features/withdrawals/hooks/useWithdrawalForm.ts` | AbortController + useRef追加 |
| `frontend/src/features/withdrawals/hooks/useWithdrawalFormState.ts` | 同上 |
| `frontend/src/features/orders/hooks/useOrderLineAllocation.ts` | isCancelled + useRef追加 |
| `frontend/src/features/assignments/hooks/usePrimaryAssignments.ts` | AbortController + useRef追加 |

### エラー処理追加（5ファイル）

| ファイル | 修正内容 |
|---------|---------|
| `frontend/src/features/auth/pages/LoginPage.tsx` | toast.error追加（2箇所） |
| `frontend/src/features/dashboard/components/AlertsWidget.tsx` | isError処理 + エラーUI追加 |
| `frontend/src/features/dashboard/components/MasterChangeLogWidget.tsx` | 同上 |
| `frontend/src/features/forecasts/components/ForecastDetailCard/OrderAllocationInline.tsx` | toast.error追加 |
| `frontend/src/features/inbound-plans/components/InboundPlanEditDialog.tsx` | toast.error追加 |

---

## 🟡 Phase 2: useQueryエラー処理追加（未着手）

### 対象ファイル（5箇所）

#### 1. AllocationDialog.tsx
**ファイル:** `frontend/src/features/orders/components/AllocationDialog.tsx`
**行番号:** 34

**現在のコード:**
```typescript
const { data: order } = useQuery({
  queryKey: ["order", orderId],
  queryFn: () => getOrder(orderId),
});
```

**修正後:**
```typescript
const { data: order, isLoading, isError, refetch } = useQuery({
  queryKey: ["order", orderId],
  queryFn: () => getOrder(orderId),
});

// 呼び出し元でisErrorとisLoadingを処理
if (isError) {
  return <ErrorState error="受注データの取得に失敗しました" onRetry={refetch} />;
}
```

---

#### 2. ForecastsTab.tsx
**ファイル:** `frontend/src/features/inventory/components/ForecastsTab.tsx`
**行番号:** 15

**現在のコード:**
```typescript
const { data: forecastData, isLoading } = useQuery({
  queryKey: ["forecasts", productId],
  queryFn: () => getForecasts({ product_id: productId }),
});
```

**修正後:**
```typescript
const { data: forecastData, isLoading, isError, refetch } = useQuery({
  queryKey: ["forecasts", productId],
  queryFn: () => getForecasts({ product_id: productId }),
});

if (isError) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
      <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
      <p className="mb-2 text-sm">予測データの取得に失敗しました</p>
      <Button variant="outline" size="sm" onClick={() => refetch()}>
        <RefreshCw className="mr-1 h-3 w-3" />
        再試行
      </Button>
    </div>
  );
}
```

---

#### 3. InboundPlansTab.tsx
**ファイル:** `frontend/src/features/inventory/components/InboundPlansTab.tsx`
**行番号:** 15

**修正方法:** ForecastsTab.tsxと同様のパターン

---

#### 4. WithdrawalCalendar.tsx
**ファイル:** `frontend/src/features/withdrawals/components/WithdrawalCalendar.tsx`
**行番号:** 303（useWithdrawalCalendarData内）

**現在のコード:**
```typescript
function useWithdrawalCalendarData(lotId: number, currentMonth: Date) {
  const { data, isLoading } = useQuery({
    queryKey: ["withdrawals", "calendar", lotId, format(currentMonth, "yyyy-MM")],
    queryFn: () => getWithdrawals({...}),
    enabled: !!lotId,
  });
  // ...
}
```

**修正後:**
```typescript
function useWithdrawalCalendarData(lotId: number, currentMonth: Date) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["withdrawals", "calendar", lotId, format(currentMonth, "yyyy-MM")],
    queryFn: () => getWithdrawals({...}),
    enabled: !!lotId,
  });

  return { data, isLoading, isError, refetch };
}

// 呼び出し元（WithdrawalCalendar関数内）で:
if (isError) {
  return (
    <Card className="...">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
        <p className="mb-2 text-sm">出庫履歴の取得に失敗しました</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          再試行
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

#### 5. WithdrawalHistoryList.tsx
**ファイル:** `frontend/src/features/withdrawals/components/WithdrawalHistoryList.tsx`
**行番号:** 16

**修正方法:** WithdrawalCalendar.tsxと同様のパターン

---

## 🟡 Phase 2: サイレント.catch()修正（未着手）

### 対象ファイル（3箇所）

これらは**Phase 1で既に修正済み**です（toast通知追加）。
再確認は不要です。

---

## 🔵 Phase 3: ファイルサイズ超過の分割（計画のみ）

### 高優先度（400行以上）

#### バックエンド

| ファイル | 行数 | 分割案 |
|---------|------|--------|
| `backend/app/application/services/inventory/lot_service.py` | 834 | `lot_allocation_service.py`, `lot_validation_service.py`, `lot_query_service.py` |
| `backend/app/application/services/orders/order_service.py` | 616 | `order_allocation_service.py`, `order_query_service.py` |
| `backend/app/application/services/forecasts/forecast_service.py` | 612 | `forecast_generation_service.py`, `forecast_query_service.py` |
| `backend/app/presentation/api/routes/rpa/material_delivery_note_router.py` | 585 | 機能別にルーターを分割 |
| `backend/app/application/services/inventory/inventory_service.py` | 526 | `inventory_summary_service.py`, `inventory_query_service.py` |

#### フロントエンド

| ファイル | 行数 | 分割案 |
|---------|------|--------|
| `frontend/src/shared/components/data/DataTable.tsx` | 568 | `DataTableHeader.tsx`, `DataTableBody.tsx`, `DataTablePagination.tsx`, `useDataTable.ts` |
| `frontend/src/features/customers/pages/CustomersListPage.tsx` | 507 | `CustomerFilters.tsx`, `CustomerTable.tsx`, `CustomerDialogs.tsx` |
| `frontend/src/features/allocations/api.ts` | 498 | `allocation-queries.ts`, `allocation-mutations.ts`, `allocation-types.ts` |
| `frontend/src/features/suppliers/pages/SuppliersListPage.tsx` | 476 | CustomersListPage.tsxと同様のパターン |
| `frontend/src/features/inventory/components/InventoryTable.tsx` | 456 | `InventoryTableRow.tsx`, `InventoryTableActions.tsx` |

---

## 実装手順

### Phase 2 実装手順

```bash
# 1. 対象ファイルの修正
# 各ファイルで以下を実施:
# - useQueryからisError, refetchを取得
# - エラー時のUI追加（AlertCircle, Button使用）
# - 必要なインポート追加

# 2. 型チェック
cd frontend && npm run typecheck

# 3. Lint
npm run lint

# 4. フォーマット
npm run format

# 5. コミット
git add -A && git commit -m "fix: useQueryエラー処理追加"
```

### Phase 3 実装手順

各分割は個別のPRで実施することを推奨。

```bash
# 例: DataTable.tsx分割

# 1. 新しいファイルを作成
# - DataTableHeader.tsx
# - DataTableBody.tsx
# - DataTablePagination.tsx
# - useDataTable.ts (ロジック抽出)

# 2. DataTable.tsxを書き換え（サブコンポーネントを使用）

# 3. テスト実行
npm run test

# 4. 型チェック & Lint
npm run typecheck && npm run lint

# 5. コミット
git commit -m "refactor: DataTableをサブコンポーネントに分割"
```

---

## 参考: エラーUI共通パターン

```tsx
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function QueryErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
      <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
      <p className="mb-2 text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1 h-3 w-3" />
        再試行
      </Button>
    </div>
  );
}
```

このコンポーネントを `frontend/src/components/common/QueryErrorState.tsx` として作成し、
各ファイルで再利用することを推奨。

---

## チェックリスト

### Phase 2
- [x] AllocationDialog.tsx - isError処理追加
- [x] ForecastsTab.tsx - isError処理追加
- [x] InboundPlansTab.tsx - isError処理追加
- [x] WithdrawalCalendar.tsx - isError処理追加
- [x] WithdrawalHistoryList.tsx - isError処理追加
- [x] QueryErrorState共通コンポーネント作成（オプション）→ 既存の`QueryErrorFallback`を使用
- [x] 型チェック通過
- [x] Lint通過
- [ ] コミット・プッシュ

### Phase 3（個別PR推奨）
- [ ] DataTable.tsx分割
- [ ] lot_service.py分割
- [ ] order_service.py分割
- [ ] CustomersListPage.tsx分割
- [ ] その他巨大ファイルの分割

---

## 関連ドキュメント

- `docs/tasks/filter_components_standardization.md` - フィルターコンポーネント標準化（完了）
- `docs/tasks/delete_dialog_refactoring.md` - 削除ダイアログリファクタリング（完了）
- `docs/tasks/date_utils_consolidation.md` - 日付ユーティリティ統合（完了）
- `docs/standards/error-handling.md` - エラー処理標準
