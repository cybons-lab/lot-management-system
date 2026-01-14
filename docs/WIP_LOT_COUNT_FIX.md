# ロット数表示バグ修正 - 作業引き継ぎドキュメント

## 現在のブランチ
`feature/ui-improvements-and-test-data` (PR #404)

---

## 完了済みの作業

### 1. バックエンド: `lot_count` を Inventory API に追加
- **ファイル**: `backend/app/presentation/schemas/inventory/inventory_schema.py`
- **ファイル**: `backend/app/application/services/inventory/inventory_service.py`
- `InventoryItemResponse` に `lot_count: int = 0` を追加
- クエリ: `current_quantity > 0 AND status = 'active'` でカウント

### 2. フロントエンド: カラムで `row.lot_count` を使用
- **ファイル**: `frontend/src/features/inventory/components/InventoryTable.tsx`
- accessor を `getLotsForItem(...).length` から `row.lot_count` に変更

### 3. バックエンド: Lots API に `warehouse_id` を追加
- **ファイル**: `backend/app/presentation/api/v2/lot/router.py`
- **ファイル**: `backend/app/application/services/inventory/lot_service.py`
- `warehouse_id` パラメータを追加（IDで直接フィルタ可能に）

### 4. UI改善
- アコーディオン展開（1行のみ）
- 展開行に青い背景
- 受注テーブルのフォント太さ軽減

---

## 残りのタスク

### タスク1: フロントエンド - オンデマンドでロットを取得

#### 問題
```
現在の実装:
- useLotActions.ts の useLotsQuery({}) が全ロットを最大100件取得
- getLotsForItem() がクライアント側でフィルタ
- 対象ロットが100件内にないと表示されない
```

#### 修正対象ファイル
- `frontend/src/features/inventory/hooks/useInventoryTableLogic.ts`
- `frontend/src/features/inventory/components/InventoryTable.tsx`

#### 実装方針
展開時にAPIを個別に呼ぶ方式に変更:

```typescript
// useInventoryTableLogic.ts
import { getLots } from "@/features/inventory/api";

const [lotsCache, setLotsCache] = useState<Map<string, LotUI[]>>(new Map());
const [loadingLots, setLoadingLots] = useState<Set<string>>(new Set());

const fetchLotsForItem = useCallback(async (productId: number, warehouseId: number) => {
  const key = `${productId}-${warehouseId}`;
  
  // キャッシュがあれば返す
  if (lotsCache.has(key)) return lotsCache.get(key)!;
  
  // ローディング中なら待機
  if (loadingLots.has(key)) return [];
  
  setLoadingLots(prev => new Set(prev).add(key));
  
  try {
    const lots = await getLots({ 
      product_id: productId, 
      warehouse_id: warehouseId,
      with_stock: false  // available_quantity=0 のロットも表示
    });
    setLotsCache(prev => new Map(prev).set(key, lots));
    return lots;
  } finally {
    setLoadingLots(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }
}, [lotsCache, loadingLots]);
```

#### InventoryTable.tsx の修正
`renderExpandedRow` を非同期対応に変更するか、展開時にuseEffectでfetch

---

### タスク2: テストデータ不整合の修正（オプション）

#### 問題
一部ロットで `allocated_quantity > current_quantity` となっている

#### 確認SQL
```sql
SELECT lot_id, current_quantity, allocated_quantity, available_quantity
FROM v_lot_details 
WHERE allocated_quantity > current_quantity;
```

#### 修正方法
- オプションA: UIの「データを更新」ボタンでテストデータ再生成
- オプションB: 不正な予約をクリーンアップ
  ```sql
  DELETE FROM lot_reservations 
  WHERE reserved_qty > (
    SELECT current_quantity FROM lots WHERE id = lot_reservations.lot_id
  );
  ```

---

## API動作確認済み

```bash
# warehouse_id フィルタが動作することを確認
curl "http://localhost:8000/api/v2/lot/?product_id=1&warehouse_id=4&with_stock=false" | jq

# 結果: warehouse_id=4, warehouse_code="WH-6379" のロットが返る
```

---

## テスト結果（データ不整合発見前）
- Backend: 301 passed
- Frontend: 481 passed
- CI: 5/5 checks passed

---

## 参照すべきファイル
| ファイル | 用途 |
|---------|------|
| `frontend/src/features/inventory/hooks/useInventoryTableLogic.ts` | ロット取得ロジック（要修正） |
| `frontend/src/features/inventory/hooks/useLotActions.ts` | 現在の全件取得実装 |
| `frontend/src/features/inventory/api.ts` | `getLots()` 関数 |
| `frontend/src/features/inventory/components/InventoryTable.tsx` | 展開行の表示 |
