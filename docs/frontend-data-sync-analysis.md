# フロントエンド データ同期 問題分析レポート

## 調査日時
2025-12-09

## 概要
バックエンドの仕様変更に対し、フロントエンドの挙動が追随できていない問題を調査・特定・修正する。

---

## 問題1: フォーキャスト編集の画面反映が不完全

### 依存関係マップ

```
User Action (編集)
  ↓
ForecastDayCell (double-click edit)
  ↓
ForecastDetailCard.handleUpdateQuantity / handleCreateForecast
  ↓
updateForecastMutation / createForecastMutation
  ↓
API: updateForecast() / createForecast() / deleteForecast()
  ↓
queryClient.invalidateQueries({ queryKey: ["forecasts"] })
  ↓
useForecastCalculations (recalculate)
  ↓
ForecastDailyGrid (re-render)
```

### 現状のフロー

1. **編集操作:**
   - `ForecastDayCell.tsx` - ダブルクリックで編集モード
   - Enter で保存 → `handleUpdateQuantity()` または `handleCreateForecast()` 呼び出し

2. **データ保存:**
   - `ForecastDetailCard.tsx:80-131` - Mutation 実行
   - 成功時: `queryClient.invalidateQueries({ queryKey: ["forecasts"] })` (line 95, 117)

3. **画面更新:**
   - `useForecastCalculations.ts` - フォーキャストデータを再計算
   - `ForecastDailyGrid` / `ForecastAggregations` - 再レンダリング

### 特定された問題点

#### 問題1-A: フォールバック計算がデータを上書きする可能性

**ファイル:** `use-forecast-calculations.ts:135-185`

```typescript
const dekadData = useMemo(() => {
  if (jyunForecasts.length === 0) {
    // Fallback: calculate from daily data if no jyun forecasts available
    return calculateDekadAggregations(dailyData, dekadMonth);
  }
  // ... jyun forecast data
}, [jyunForecasts, dailyData, dekadMonth]);

const monthlyData = useMemo(() => {
  if (monthlyForecasts.length === 0) {
    // Fallback: calculate from daily data if no monthly forecasts available
    return calculateMonthlyAggregation(dailyData, monthlyMonth);
  }
  // ... monthly forecast data
}, [monthlyForecasts, dailyData, monthlyMonth]);
```

**影響:**
- 旬別・月別フォーキャストが存在しない場合、日別データから自動計算される
- ユーザーが編集した値が保存されても、計算値が表示される可能性がある
- 実際のDB値と表示値が乖離する

#### 問題1-B: 過度に広範なキャッシュ無効化

**ファイル:** `ForecastDetailCard.tsx:95, 117`

```typescript
queryClient.invalidateQueries({ queryKey: ["forecasts"] });
```

**影響:**
- すべてのフォーキャストクエリを無効化 → パフォーマンス低下
- 他のフォーキャストグループも再取得される

**推奨:**
```typescript
queryClient.invalidateQueries({ queryKey: ["forecasts", "list"] });
queryClient.invalidateQueries({ queryKey: ["forecasts", "detail", groupKey] });
```

#### 問題1-C: 開発用console.logが残存

**ファイル:** `use-forecast-calculations.ts:96-98`

```typescript
console.log("[dailyForecastIds] Added:", forecast.forecast_date, "->", forecast.id);
console.log("[dailyForecastIds] Total entries:", idMap.size);
```

**影響:** 本番環境でログが出力され続ける

### 改善案

1. **フォールバック計算の分離:**
   - 実データと計算値を明示的に区別
   - UIで計算値であることを表示（グレーアウト、アイコンなど）
   - または、フォールバック計算を完全に削除し、データがない場合は空表示

2. **キャッシュ無効化の最適化:**
   - より具体的なクエリキーを使用
   - 影響範囲を最小限に

3. **デバッグログの削除:**
   - console.log を削除

---

## 問題2: 主担当（primary owner）の表示・フィルタが未実装

### 依存関係マップ

```
User Login
  ↓
AuthContext (ログインユーザー情報)
  ↓
useMySuppliers() ← GET /api/assignments/my-suppliers
  ↓
primary_supplier_ids: number[]
  ↓
[現在は使用されていない]
  ↓
API呼び出し時に prioritize_primary パラメータを渡すべき
  ↓
Backend: Lots/Orders/InventoryItems クエリ
  ↓
is_primary_supplier フラグ付きデータ返却
  ↓
UI: PrimaryBadge 表示 + フィルタ機能（未実装）
```

### 現状のフロー

1. **ユーザー認証:**
   - `AuthContext.tsx` - ログインユーザー情報保持
   - `useAuth()` hook で user 情報取得可能

2. **主担当データ取得:**
   - `useMySuppliers()` hook が利用可能
   - `GET /api/assignments/my-suppliers` → `{ primary_supplier_ids: [...] }` 返却

3. **バックエンド対応状況:**
   - ✅ `/api/lots` - `prioritize_primary` パラメータ対応
   - ✅ `/api/inventory-items/by-supplier` - `is_primary_supplier` フラグ付与
   - ✅ `/api/orders/lines` - `prioritize_primary` パラメータ対応
   - ✅ `/api/inbound-plans` - `is_primary_supplier` フラグ付与

4. **フロントエンド対応状況:**
   - ❌ `getLots()` - `prioritize_primary` パラメータ **未実装**
   - ❌ `getOrderLines()` - `prioritize_primary` パラメータ **未実装**
   - ⚠️ `getInventoryBySupplier()` - パラメータなし（Backend default: true に依存）
   - ✅ `PrimaryBadge` コンポーネント実装済み
   - ❌ 主担当フィルタUI **未実装**

### 特定された問題点

#### 問題2-A: API呼び出しでprioritize_primaryパラメータが未設定

**ファイル:** `inventory/api.ts:59-76` (getLots)

```typescript
export const getLots = (params?: LotsGetParams) => {
  const searchParams = new URLSearchParams();

  if (params?.skip !== undefined) searchParams.append("skip", params.skip.toString());
  // ... other params ...
  if (params?.with_stock !== undefined)
    searchParams.append("with_stock", params.with_stock.toString());

  // ❌ MISSING: prioritize_primary parameter

  return http.get<LotsGetResponse>(`lots${queryString ? "?" + queryString : ""}`);
};
```

**ファイル:** `orders/api.ts:39-53` (getOrderLines)

```typescript
export const getOrderLines = (params?: OrdersListParams & { product_code?: string }) => {
  const searchParams = new URLSearchParams();
  // ... various filters ...

  // ❌ MISSING: prioritize_primary parameter

  return http.get<OrderLine[]>(`orders/lines${queryString ? "?" + queryString : ""}`);
};
```

#### 問題2-B: 主担当フィルタUIが存在しない

**必要な箇所:**
- `OrdersFilters.tsx` - 主担当のみ表示するチェックボックス
- `InventoryPage.tsx` - 主担当仕入先フィルタ
- `ForecastListPage.tsx` - 主担当仕入先フィルタ

**現状:** フィルタUIなし、ユーザーが主担当データのみ表示できない

#### 問題2-C: デフォルトフィルタが適用されない

**期待動作:**
- ログインユーザーの主担当データをデフォルト表示
- 「すべて表示」トグルで全データ表示に切替

**現状:** すべてのデータがデフォルト表示される

### 改善案

1. **API関数の拡張:**
   - `LotsGetParams` に `prioritize_primary?: boolean` を追加
   - `OrdersListParams` に `prioritize_primary?: boolean` を追加
   - API呼び出し時にパラメータを渡す

2. **フィルタUIの追加:**
   ```tsx
   <div className="flex items-center space-x-2">
     <input
       type="checkbox"
       id="showOnlyMySuppliers"
       checked={filters.showOnlyMySuppliers}
       onChange={(e) => handleFilterChange("showOnlyMySuppliers", e.target.checked)}
     />
     <label htmlFor="showOnlyMySuppliers" className="flex items-center gap-1">
       <Crown className="h-4 w-4" />
       主担当の仕入先のみ表示
     </label>
   </div>
   ```

3. **デフォルト値の設定:**
   - ページ初期表示時に `showOnlyMySuppliers: true` をデフォルト
   - `useMySuppliers()` でprimary_supplier_idsを取得
   - フィルタ状態に応じてAPI呼び出しパラメータを切り替え

---

## 問題3: ロット引当の即時反映が複数の画面で行われていない

### 依存関係マップ

```
User Action (引当実行)
  ↓
LotAllocationPanel / OrderLineAllocation
  ↓
useOrderLineAllocation.saveAllocations()
  ↓
createLotAllocations() API
  ↓
SUCCESS
  ↓
Query Invalidation (現状)
  ├─ ["orders"]
  ├─ ["lots"]
  └─ ["allocations"]

  ↓ (不足)

  ❌ ["inventoryItems"] / ["inventory-items"]
  ❌ ["dashboard"]
  ❌ ["planning-allocation-summary"]
  ❌ ["inventory-by-supplier"]
  ❌ ["inventory-by-warehouse"]
```

### 現状のフロー

1. **引当操作:**
   - `LotAllocationPanel.tsx` - 引当数量入力
   - 「仮引当」ボタン → `saveAllocations()` (soft allocation)
   - 「確定」ボタン → `confirmAllocations()` (soft → hard)

2. **API呼び出し:**
   - `createLotAllocations(orderLineId, payload)`
   - レスポンス: `{ success: true, message: "...", allocated_ids: [...] }`

3. **現在の無効化パターン:**
   - ✅ `useCommitAllocation` (lines 44-51 in useAllocationSuggestions.ts):
     ```typescript
     queryClient.invalidateQueries({ queryKey: ["allocations"] });
     queryClient.invalidateQueries({ queryKey: ["allocationCandidates"] });
     queryClient.invalidateQueries({ queryKey: ["orders"] });
     queryClient.invalidateQueries({ queryKey: ["lots"] });
     queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
     ```

4. **不足している無効化:**
   - ❌ `["inventory-items"]` (ダッシュ区切り - 別クエリキー)
   - ❌ `["inventory-by-supplier"]`
   - ❌ `["inventory-by-warehouse"]`
   - ❌ `["inventory-by-product"]`
   - ❌ `["dashboard"]`
   - ❌ `["planning-allocation-summary"]`

### 特定された問題点

#### 問題3-A: クエリキーの不統一

**2つの異なるキーが使われている:**
- `["inventoryItems"]` (camelCase)
- `["inventory-items"]` (kebab-case)

**影響:** どちらか一方しか無効化されない → データが古いまま

#### 問題3-B: 在庫サマリーのクエリが無効化されない

**影響を受けるコンポーネント:**
- `InventoryPage.tsx` - 統計カード（総在庫数、利用可能数、**引当済数**）
- `InventoryTable.tsx` - テーブルの仮引当/確定引当列
- `InventoryBySupplierTable.tsx` - 仕入先別在庫
- `DashboardStats.tsx` - ダッシュボードの引当率・未引当受注数

**原因:**
- `useInventoryStats()` や集計クエリが無効化されていない
- 引当後もキャッシュされた古い値が表示される

#### 問題3-C: 仮引当（Soft Allocation）のUI状態が更新されない

**期待動作:**
1. 仮引当保存 → バッジが「仮引当完了」（Indigo色）に変化
2. 確定 → バッジが「引当確定」（Green色）に変化
3. プログレスバーの Amber/Green 色分けが更新される

**現状:** 手動リフレッシュが必要な場合がある

#### 問題3-D: 引当一覧の行が増えない

**影響を受ける画面:**
- `/allocations` ページ - LineBasedAllocationList
- OrderDetailPage - allocations テーブル

**原因:** `["allocations"]` クエリは無効化されているが、フィルタ状態によっては再取得されない

### 改善案

1. **統一的なクエリキー管理:**
   ```typescript
   // shared/constants/query-keys.ts
   export const QUERY_KEYS = {
     inventoryItems: ["inventory-items"] as const,
     inventoryBySupplier: ["inventory-by-supplier"] as const,
     inventoryByWarehouse: ["inventory-by-warehouse"] as const,
     inventoryByProduct: ["inventory-by-product"] as const,
     lots: ["lots"] as const,
     orders: ["orders"] as const,
     allocations: ["allocations"] as const,
     dashboard: ["dashboard"] as const,
     planningAllocation: ["planning-allocation-summary"] as const,
   };
   ```

2. **包括的な無効化処理:**
   ```typescript
   const invalidateInventoryQueries = () => {
     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryItems });
     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryBySupplier });
     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryByWarehouse });
     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventoryByProduct });
     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lots });
   };

   const invalidateAllocationQueries = () => {
     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allocations });
     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders });
     queryClient.invalidateQueries({ queryKey: QUERY_KEYS.planningAllocation });
     invalidateInventoryQueries();
   };
   ```

3. **楽観的更新の強化:**
   - 引当実行時に即座にUI更新（optimistic update）
   - エラー時のロールバック処理

4. **Dashboard クエリの無効化:**
   - 引当操作後にダッシュボード統計も更新

---

## 修正優先順位

### 🔴 High Priority (即修正必須)

1. **問題2-A:** API呼び出しに `prioritize_primary` パラメータを追加
   - `inventory/api.ts:getLots()`
   - `orders/api.ts:getOrderLines()`

2. **問題3-A/B:** クエリキー統一 + 包括的な無効化
   - すべての引当 mutation で inventory/dashboard クエリを無効化

3. **問題1-C:** console.log 削除

### 🟡 Medium Priority (機能改善)

4. **問題2-B/C:** 主担当フィルタUIの実装
   - OrdersFilters コンポーネント拡張
   - InventoryPage フィルタ追加

5. **問題1-B:** フォーキャストクエリ無効化の最適化

### 🟢 Low Priority (UX改善)

6. **問題1-A:** フォールバック計算の分離・明示化
7. **問題3-C/D:** 楽観的更新の強化

---

## 影響範囲のまとめ

### 修正対象ファイル

#### Problem 1 (Forecast)
- `frontend/src/features/forecasts/components/ForecastDetailCard/hooks/use-forecast-calculations.ts`
- `frontend/src/features/forecasts/components/ForecastDetailCard/ForecastDetailCard.tsx`

#### Problem 2 (Primary Owner)
- `frontend/src/features/inventory/api.ts`
- `frontend/src/features/orders/api.ts`
- `frontend/src/features/orders/components/OrdersFilters.tsx`
- `frontend/src/features/inventory/pages/InventoryPage.tsx` (フィルタUI追加)
- `frontend/src/features/orders/hooks/useOrdersListLogic.ts`

#### Problem 3 (Allocation)
- `frontend/src/features/allocations/hooks/api/useAllocationSuggestions.ts`
- `frontend/src/features/allocations/hooks/state/useAllocations.ts`
- `frontend/src/features/orders/hooks/useOrderLineAllocation.ts`
- `frontend/src/shared/constants/query-keys.ts` (新規作成)

---

## 次のステップ

1. High Priority 修正の実装
2. 型定義の更新（OpenAPI types 再生成が必要な場合）
3. 既存テストの確認・修正
4. マニュアルテストチェックリスト実施
5. コミット＆プッシュ
