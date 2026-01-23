# 在庫管理テストデータシナリオ

## 現状の問題

現在のテストデータでは、ほとんどのロットで以下の状態になっている:
- 利用可能数量: 0
- 確定引当数量: 0
- 予約数量（未確定）: 0
- ロック数量: 0

これでは以下のテストができない:
1. 確定引当がある場合の利用可能数量の計算検証
2. 出庫ボタンの有効/無効の切り替え
3. ロット選択時の優先順位（FEFO）の検証
4. 数量が不足している場合の動作確認

---

## 必要なテストパターン

### パターン1: 基本的な在庫あり
```
現在在庫: 100
確定引当: 0
予約（未確定）: 0
ロック: 0
利用可能: 100
```
**期待動作:**
- 出庫ボタン: 有効
- ステータス: 利用可能

### パターン2: 一部引当済み
```
現在在庫: 100
確定引当: 30
予約（未確定）: 0
ロック: 0
利用可能: 70
```
**期待動作:**
- 出庫ボタン: 有効
- 確定引当分を引いた数量が利用可能として表示される

### パターン3: 一部ロック中
```
現在在庫: 100
確定引当: 0
予約（未確定）: 0
ロック: 40
利用可能: 60
```
**期待動作:**
- 出庫ボタン: 有効
- ステータス: ロック中（ロックアイコン表示）
- ロック解除ボタンが表示される

### パターン4: 確定引当 + ロック
```
現在在庫: 100
確定引当: 30
予約（未確定）: 0
ロック: 20
利用可能: 50
```
**期待動作:**
- 利用可能 = 100 - 30 - 20 = 50

### パターン5: 予約（未確定）あり
```
現在在庫: 100
確定引当: 0
予約（未確定）: 25
ロック: 0
利用可能: 100
```
**期待動作:**
- 予約は利用可能数量に影響しない（まだ確定していないため）
- 予約数量が別途表示される

### パターン6: 全て引当済み
```
現在在庫: 100
確定引当: 100
予約（未確定）: 0
ロック: 0
利用可能: 0
```
**期待動作:**
- 出庫ボタン: 無効（disabled）
- 利用可能数量が0と表示される

### パターン7: 在庫枯渇
```
現在在庫: 0
確定引当: 0
予約（未確定）: 0
ロック: 0
利用可能: 0
```
**期待動作:**
- 出庫ボタン: 無効
- ステータス: 在庫なし

### パターン8: 複雑なケース
```
現在在庫: 200
確定引当: 80
予約（未確定）: 30
ロック: 40
利用可能: 80
```
**期待動作:**
- 利用可能 = 200 - 80 - 40 = 80
- 予約30は表示されるが利用可能数量には影響しない

---

## テストデータ生成方法

### 1. SQLスクリプトでの直接生成

```sql
-- 1. ロット作成（基本的な在庫あり）
INSERT INTO lot_receipts (
    product_id, warehouse_id, lot_master_id, received_quantity,
    consumed_quantity, locked_quantity, received_date, status
) VALUES
    (1, 1, 1, 100, 0, 0, CURRENT_DATE, 'active');

-- 2. ロット作成（一部引当済み）
-- まずロット作成
INSERT INTO lot_receipts (
    product_id, warehouse_id, lot_master_id, received_quantity,
    consumed_quantity, locked_quantity, received_date, status
) VALUES
    (2, 1, 2, 100, 0, 0, CURRENT_DATE, 'active')
RETURNING id;

-- 次に出庫指示を作成して引当
INSERT INTO outbound_instructions (...) VALUES (...);
INSERT INTO outbound_allocations (outbound_instruction_id, lot_id, allocated_quantity)
VALUES (1, <lot_id>, 30);

-- 3. ロック中のロット
INSERT INTO lot_receipts (
    product_id, warehouse_id, lot_master_id, received_quantity,
    consumed_quantity, locked_quantity, received_date, status, lock_reason
) VALUES
    (3, 1, 3, 100, 0, 40, CURRENT_DATE, 'active', '品質検査中');

-- 4. 予約（未確定）ありのロット
INSERT INTO lot_receipts (
    product_id, warehouse_id, lot_master_id, received_quantity,
    consumed_quantity, locked_quantity, received_date, status
) VALUES
    (4, 1, 4, 100, 0, 0, CURRENT_DATE, 'active');

INSERT INTO lot_reservations (lot_id, reserved_qty, status, source_type, source_id)
VALUES (<lot_id>, 25, 'active', 'sales_order', 1);
```

### 2. APIエンドポイント経由

```bash
# 簡易入庫APIを使用
curl -X POST http://localhost:8000/api/inventory/quick-intake \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "warehouse_id": 1,
    "supplier_id": 1,
    "quantity": 100,
    "received_date": "2026-01-17",
    "expiry_date": "2027-01-17"
  }'

# 出庫指示作成（引当を作るため）
curl -X POST http://localhost:8000/api/outbound/instructions \
  -H "Content-Type: application/json" \
  -d '{
    "lines": [{
      "product_id": 1,
      "warehouse_id": 1,
      "quantity": 30
    }]
  }'

# ロック
curl -X POST http://localhost:8000/api/inventory/lots/{lot_id}/lock \
  -H "Content-Type: application/json" \
  -d '{
    "lock_quantity": 40,
    "lock_reason": "品質検査中"
  }'
```

### 3. 管理画面でのデータ生成スクリプト

`backend/scripts/generate_test_inventory.py` を作成:

```python
"""Generate comprehensive test inventory data for all scenarios."""
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models import (
    LotReceipt, OutboundInstruction, OutboundAllocation,
    LotReservation, Product, Warehouse, Supplier
)

def generate_test_scenarios(db: Session):
    """Generate test data covering all scenarios."""

    # パターン1: 基本的な在庫あり
    lot1 = LotReceipt(
        product_id=1, warehouse_id=1, lot_master_id=1,
        received_quantity=Decimal("100"),
        consumed_quantity=Decimal("0"),
        locked_quantity=Decimal("0"),
        received_date=date.today(),
        status="active"
    )
    db.add(lot1)

    # パターン2: 一部引当済み
    lot2 = LotReceipt(
        product_id=2, warehouse_id=1, lot_master_id=2,
        received_quantity=Decimal("100"),
        consumed_quantity=Decimal("0"),
        locked_quantity=Decimal("0"),
        received_date=date.today(),
        status="active"
    )
    db.add(lot2)
    db.flush()

    # 出庫指示と引当を作成
    instruction = OutboundInstruction(
        shipping_date=date.today(),
        status="allocated"
    )
    db.add(instruction)
    db.flush()

    allocation = OutboundAllocation(
        outbound_instruction_id=instruction.id,
        lot_id=lot2.id,
        allocated_quantity=Decimal("30")
    )
    db.add(allocation)

    # パターン3: 一部ロック中
    lot3 = LotReceipt(
        product_id=3, warehouse_id=1, lot_master_id=3,
        received_quantity=Decimal("100"),
        consumed_quantity=Decimal("0"),
        locked_quantity=Decimal("40"),
        received_date=date.today(),
        status="active",
        lock_reason="品質検査中"
    )
    db.add(lot3)

    # パターン4: 確定引当 + ロック
    lot4 = LotReceipt(
        product_id=4, warehouse_id=1, lot_master_id=4,
        received_quantity=Decimal("100"),
        consumed_quantity=Decimal("0"),
        locked_quantity=Decimal("20"),
        received_date=date.today(),
        status="active"
    )
    db.add(lot4)
    db.flush()

    instruction2 = OutboundInstruction(
        shipping_date=date.today(),
        status="allocated"
    )
    db.add(instruction2)
    db.flush()

    allocation2 = OutboundAllocation(
        outbound_instruction_id=instruction2.id,
        lot_id=lot4.id,
        allocated_quantity=Decimal("30")
    )
    db.add(allocation2)

    # パターン5: 予約（未確定）あり
    lot5 = LotReceipt(
        product_id=5, warehouse_id=1, lot_master_id=5,
        received_quantity=Decimal("100"),
        consumed_quantity=Decimal("0"),
        locked_quantity=Decimal("0"),
        received_date=date.today(),
        status="active"
    )
    db.add(lot5)
    db.flush()

    reservation = LotReservation(
        lot_id=lot5.id,
        reserved_qty=Decimal("25"),
        status="active",
        source_type="sales_order",
        source_id=1
    )
    db.add(reservation)

    # パターン6: 全て引当済み
    lot6 = LotReceipt(
        product_id=6, warehouse_id=1, lot_master_id=6,
        received_quantity=Decimal("100"),
        consumed_quantity=Decimal("0"),
        locked_quantity=Decimal("0"),
        received_date=date.today(),
        status="active"
    )
    db.add(lot6)
    db.flush()

    instruction3 = OutboundInstruction(
        shipping_date=date.today(),
        status="allocated"
    )
    db.add(instruction3)
    db.flush()

    allocation3 = OutboundAllocation(
        outbound_instruction_id=instruction3.id,
        lot_id=lot6.id,
        allocated_quantity=Decimal("100")
    )
    db.add(allocation3)

    # パターン7: 在庫枯渇
    lot7 = LotReceipt(
        product_id=7, warehouse_id=1, lot_master_id=7,
        received_quantity=Decimal("100"),
        consumed_quantity=Decimal("100"),  # 全て消費済み
        locked_quantity=Decimal("0"),
        received_date=date.today() - timedelta(days=30),
        status="depleted"
    )
    db.add(lot7)

    # パターン8: 複雑なケース
    lot8 = LotReceipt(
        product_id=8, warehouse_id=1, lot_master_id=8,
        received_quantity=Decimal("200"),
        consumed_quantity=Decimal("0"),
        locked_quantity=Decimal("40"),
        received_date=date.today(),
        status="active"
    )
    db.add(lot8)
    db.flush()

    instruction4 = OutboundInstruction(
        shipping_date=date.today(),
        status="allocated"
    )
    db.add(instruction4)
    db.flush()

    allocation4 = OutboundAllocation(
        outbound_instruction_id=instruction4.id,
        lot_id=lot8.id,
        allocated_quantity=Decimal("80")
    )
    db.add(allocation4)

    reservation2 = LotReservation(
        lot_id=lot8.id,
        reserved_qty=Decimal("30"),
        status="active",
        source_type="sales_order",
        source_id=2
    )
    db.add(reservation2)

    db.commit()
    print("✅ Test data generation completed!")

if __name__ == "__main__":
    db = next(get_db())
    try:
        generate_test_scenarios(db)
    finally:
        db.close()
```

実行方法:
```bash
docker compose exec backend python scripts/generate_test_inventory.py
```

---

## 検証項目チェックリスト

### UI表示の検証
- [ ] 現在在庫が正しく表示される
- [ ] 利用可能数量が正しく計算・表示される（現在在庫 - 確定引当 - ロック）
- [ ] 確定引当数量が正しく表示される
- [ ] 予約（未確定）数量が正しく表示される
- [ ] ロック数量が正しく表示される

### ボタン制御の検証
- [ ] 利用可能 > 0: 出庫ボタンが有効
- [ ] 利用可能 = 0: 出庫ボタンが無効（disabled）
- [ ] ロック > 0: ロック解除ボタンが表示される
- [ ] ロック = 0: ロックボタンが表示される

### 機能動作の検証
- [ ] 出庫時に利用可能数量以上は選択できない
- [ ] FEFO（期限が近い順）で自動引当される
- [ ] 引当後、確定引当数量が増加し、利用可能数量が減少する
- [ ] ロック後、利用可能数量が減少し、出庫ボタンが無効になる（全ロックの場合）

---

## 今後の改善提案

1. **テストデータ生成コマンドの追加**
   - `docker compose exec backend python scripts/generate_test_inventory.py`
   - 管理画面に「テストデータ生成」ボタンを追加

2. **E2Eテストの追加**
   - Playwright/Cypressで各パターンのUI表示を自動テスト
   - 出庫ボタンの有効/無効の自動検証

3. **データ整合性チェック**
   - `available_quantity` の計算式が正しいか定期的に検証
   - フロントエンドとバックエンドで計算結果が一致するか確認

4. **ドキュメント化**
   - 各数量の定義と計算式を明確に文書化
   - 新メンバーのオンボーディング資料として活用

---

## 参考: 数量の定義

```
現在在庫 (current_quantity)
  = 入庫数量 (received_quantity)
  - 消費数量 (consumed_quantity)
  - ロック数量 (locked_quantity)

利用可能数量 (available_quantity)
  = 現在在庫 (current_quantity)
  - 確定引当数量 (allocated_quantity)

  OR

  = 入庫数量 (received_quantity)
  - 消費数量 (consumed_quantity)
  - ロック数量 (locked_quantity)
  - 確定引当数量 (allocated_quantity)
```

**重要:** 予約数量（未確定）は利用可能数量の計算に含めない。予約が確定した時点で確定引当に変換される。
