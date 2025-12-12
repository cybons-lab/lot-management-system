# P2-4: フォーキャスト詳細 - 他グループ引当の表示

## 概要

フォーキャスト詳細画面（PlanningAllocationPanel）において、同じロットが他のフォーキャストグループ（別顧客・別納入先）で引当されている場合、その消費量を表示する機能を追加する。

**現状の問題:**
- ロット内訳には当該グループの引当数量のみ表示
- 同一ロットの他グループでの消費量が不明
- 在庫状況の正確な把握が困難

---

## 設計方針

### アプローチ

`lot_breakdown`の各ロットに対して、他グループ（同じ`product_id`かつ異なる`customer_id`または`delivery_place_id`）での引当数量を追加取得する。

---

## Proposed Changes

### Backend

#### [MODIFY] [router.py](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/presentation/api/v2/forecast/router.py)

`get_allocation_suggestions_by_group`エンドポイントを拡張:

```diff
 lot_breakdown = []
 for lot_id, qty in sorted(lot_totals.items(), key=lambda x: x[0]):
     lot = lot_map.get(lot_id)
+    
+    # Query allocations of this lot by OTHER groups
+    other_allocated = db.query(func.sum(AllocationSuggestion.quantity)).filter(
+        AllocationSuggestion.lot_id == lot_id,
+        AllocationSuggestion.product_id == product_id,
+        ~(
+            (AllocationSuggestion.customer_id == customer_id) &
+            (AllocationSuggestion.delivery_place_id == delivery_place_id)
+        ),
+    ).scalar() or Decimal("0")
+    
     lot_breakdown.append(
         {
             "lot_id": lot_id,
             "lot_number": lot.lot_number if lot else None,
             "expiry_date": lot.expiry_date.isoformat() if lot and lot.expiry_date else None,
             "planned_quantity": qty,
+            "other_group_allocated": other_allocated,
         }
     )
```

---

### Frontend

#### [MODIFY] [api.ts](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/features/allocations/api.ts)

型定義に`other_group_allocated`を追加:

```diff
 export interface PlanningAllocationLotBreakdown {
   lot_id: number;
   lot_number: string | null;
   expiry_date: string | null;
   planned_quantity: number;
+  other_group_allocated: number;
 }
```

---

#### [MODIFY] [PlanningAllocationPanel.tsx](file:///Users/kazuya/dev/projects/lot-management-system/frontend/src/features/forecasts/components/ForecastDetailCard/PlanningAllocationPanel.tsx)

ロット内訳テーブルに「他グループ」列を追加:

```diff
 <TableHead>ロット番号</TableHead>
 <TableHead>賞味期限</TableHead>
 <TableHead className="text-right">引当数量</TableHead>
+<TableHead className="text-right">他グループ</TableHead>

 {summary.lot_breakdown.map((lot) => (
   <TableRow key={lot.lot_id}>
     <TableCell>{lot.lot_number || "-"}</TableCell>
     <TableCell>{lot.expiry_date ? formatDate(lot.expiry_date) : "-"}</TableCell>
     <TableCell className="text-right">{formatNumber(lot.planned_quantity)}</TableCell>
+    <TableCell className="text-right text-muted-foreground">
+      {lot.other_group_allocated > 0 ? formatNumber(lot.other_group_allocated) : "-"}
+    </TableCell>
   </TableRow>
 ))}
```

---

## Verification Plan

### Automated Tests

1. **Backend単体テスト**
   ```bash
   cd backend && python -m pytest tests/unit/test_forecast_router.py -v
   ```

2. **Frontend型チェック**
   ```bash
   cd frontend && npm run typecheck
   ```

3. **ESLint**
   ```bash
   cd frontend && npm run lint
   ```

### Manual Verification

1. フォーキャスト詳細画面を開く
2. ロット内訳パネルに「他グループ」列が表示されることを確認
3. 同一ロットを別グループでも引当している場合、その数量が表示されることを確認
4. 他グループでの引当がない場合は「-」と表示されることを確認

---

## 工数見積もり

| 作業 | 見積もり |
|------|---------|
| Backend API拡張 | 15分 |
| Frontend型定義更新 | 5分 |
| UI表示更新 | 10分 |
| テスト・検証 | 15分 |
| **合計** | **45分** |
