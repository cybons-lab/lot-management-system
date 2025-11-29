# 単位変換ロジック - Unit Conversion Logic

## 概要

ロット管理システムでは、異なる単位(PCS、ML、KG等)で受注された製品を、内部管理単位に統一して管理します。このドキュメントでは、単位変換の仕組みと重要な注意点を説明します。

## 単位の種類

システムで扱う3つの単位:

| 単位タイプ | 説明 | 例 | 使用場所 |
|-----------|------|-----|---------|
| **発注単位** | 顧客が注文時に使用する単位 | PCS(個), ML(ミリリットル), KG(キログラム) | OrderLine.unit, OrderLine.order_quantity |
| **内部管理単位** | システム内部で統一して使う単位 | ケース, 箱, パレット | Product.internal_unit, Lot.unit |
| **変換後数量** | 発注数量を内部単位に換算した値 | - | OrderLine.converted_quantity |

## データベーススキーマ

### OrderLine (受注明細)

```sql
CREATE TABLE order_lines (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    
    -- 発注時の情報
    order_quantity NUMERIC(15,3) NOT NULL,  -- 発注数量 (例: 996)
    unit VARCHAR(10) NOT NULL,              -- 発注単位 (例: "PCS")
    
    -- 内部管理用に変換された数量
    converted_quantity NUMERIC(15,3) NOT NULL,  -- 内部単位換算 (例: 83.000)
    
    -- その他のカラム...
);
```

### Allocation (引当)

```sql
CREATE TABLE allocations (
    id SERIAL PRIMARY KEY,
    order_line_id INTEGER NOT NULL,
    lot_id INTEGER NOT NULL,
    
    -- 引当数量は常に内部管理単位
    allocated_quantity NUMERIC(15,3) NOT NULL,  -- 内部単位 (例: 83.000)
    
    -- その他のカラム...
);
```

### Product (製品マスタ)

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    maker_part_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    
    -- 単位変換の設定
    internal_unit VARCHAR(10) NOT NULL,           -- 内部管理単位 (例: "ケース")
    qty_per_internal_unit NUMERIC(15,3) NOT NULL, -- 内部単位あたりの製品数 (例: 12.0)
    
    -- その他のカラム...
);
```

## 変換の計算式

### 発注数量 → 内部管理数量

```
converted_quantity = order_quantity ÷ qty_per_internal_unit
```

### 実例

**製品情報**:
- 製品: 飲料ボトル
- 内部管理単位: ケース
- 1ケースあたり: 12本 (`qty_per_internal_unit = 12.0`)

**受注**:
- 発注数量: 996本 (`order_quantity = 996`)
- 発注単位: PCS (`unit = "PCS"`)

**変換後**:
```
converted_quantity = 996 ÷ 12 = 83.000 (ケース)
```

**引当**:
- ロットから 83ケース を引当
- `allocated_quantity = 83.000`

## 重要な比較ルール

### ❌ 間違い: 異なる単位を比較

```python
# 間違い! 単位が違う
allocated_quantity >= order_quantity
# 83.000 (ケース) >= 996.000 (PCS) → False (誤判定!)
```

### ✅ 正しい: 同じ単位で比較

```python
# 正しい! 両方とも内部管理単位
allocated_quantity >= converted_quantity
# 83.000 (ケース) >= 83.000 (ケース) → True (正しい!)
```

## よくある落とし穴

### 1. order_quantity との直接比較

**間違い**:
```python
WHERE allocated_quantity >= order_quantity
```

**問題**: 
- `allocated_quantity` は内部単位(ケース)
- `order_quantity` は発注単位(PCS)
- 単位が異なるため、正しく判定できない

**正解**:
```python
WHERE allocated_quantity >= converted_quantity
```

### 2. フロントエンドでの表示

ユーザーには発注単位で表示するが、内部計算は内部単位で行う:

```typescript
// 表示用
const displayQuantity = orderLine.order_quantity; // 996 PCS
const displayUnit = orderLine.unit; // "PCS"

// 計算用 (引当判定など)
const convertedQty = orderLine.converted_quantity; // 83.000
const allocatedQty = orderLine.allocated_quantity; // 83.000
const isFullyAllocated = allocatedQty >= convertedQty; // true
```

### 3. APIレスポンスでの注意

API応答には両方の数量が含まれる:

```json
{
  "order_quantity": "996.000",      // 発注単位 (PCS)
  "unit": "PCS",
  "converted_quantity": "83.000",   // 内部単位 (ケース)
  "allocated_quantity": "83.000"    // 内部単位 (ケース)
}
```

**判定時は必ず `converted_quantity` を使用**:
```javascript
const isFullyAllocated = 
  parseFloat(data.allocated_quantity) >= parseFloat(data.converted_quantity);
```

## 実装例

### バックエンド: 引当確定済み判定

```python
# confirmed_lines_router.py
@router.get("/confirmed-order-lines")
def get_confirmed_order_lines(db: Session = Depends(get_db)):
    # 引当数量の集計
    alloc_subq = (
        select(
            Allocation.order_line_id,
            func.sum(Allocation.allocated_quantity).label("allocated_qty")
        )
        .group_by(Allocation.order_line_id)
        .subquery()
    )
    
    # 引当完了の判定 (内部単位で比較!)
    query = (
        select(OrderLine)
        .outerjoin(alloc_subq, OrderLine.id == alloc_subq.c.order_line_id)
        .where(OrderLine.sap_order_no.is_(None))
        .where(
            func.coalesce(alloc_subq.c.allocated_qty, 0) 
            >= OrderLine.converted_quantity  # ← 重要!
        )
    )
    
    return db.execute(query).scalars().all()
```

### フロントエンド: 引当率の計算

```typescript
function calculateAllocationRate(orderLine: OrderLine): number {
  // 内部単位で計算
  const allocated = parseFloat(orderLine.allocated_quantity);
  const required = parseFloat(orderLine.converted_quantity);
  
  if (required === 0) return 0;
  return (allocated / required) * 100;
}

// 使用例
const rate = calculateAllocationRate(line); // 100% (83/83)
```

## まとめ

### 重要ポイント

1. **発注単位と内部単位を混同しない**
   - `order_quantity` + `unit`: 発注時の単位
   - `converted_quantity`: 内部管理単位
   - `allocated_quantity`: 内部管理単位

2. **比較は常に同じ単位で**
   - ✅ `allocated_quantity >= converted_quantity`
   - ❌ `allocated_quantity >= order_quantity`

3. **表示とビジネスロジックを分ける**
   - 表示: 発注単位 (`order_quantity` + `unit`)
   - ロジック: 内部単位 (`converted_quantity`, `allocated_quantity`)

### チェックリスト

新しい機能を実装する際は以下を確認:

- [ ] 数量の比較は同じ単位で行っているか?
- [ ] `order_quantity`を計算に使っていないか?
- [ ] API応答の単位を正しく理解しているか?
- [ ] フロントエンドの表示は発注単位を使っているか?
- [ ] バックエンドのビジネスロジックは内部単位を使っているか?

## 参考資料

- [OrderLine Model](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/models/orders_models.py)
- [Product Model](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/models/master_models.py)
- [Allocation Model](file:///Users/kazuya/dev/projects/lot-management-system/backend/app/models/orders_models.py)
