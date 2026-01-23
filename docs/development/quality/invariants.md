# 不変条件・整合性ルール (System Invariants)

システムが常に維持すべき整合性ルール。

## 1. 在庫数量の整合性

### 1.1. 正の値の維持
- `lots.current_quantity >= 0`: 物理在庫は負にならない。
    - 根拠: DB Check Constraint `chk_lots_current_quantity`
- `lots.locked_quantity >= 0`: ロック数量は負にならない。
    - 根拠: DB Check Constraint `chk_lots_locked_quantity`
- `lot_reservations.reserved_qty > 0`: 予約数量は常に正の値である（0の予約は作らない）。
    - 根拠: DB Check Constraint `chk_lot_reservations_qty_positive`

### 1.2. 有効在庫の計算整合性
- `active`（仮引当）の予約は、有効在庫（Available Quantity）を減らさない。
    - 理由: 仮引当段階でのオーバーブッキングを許容するため。
- `confirmed`（確定）の予約のみが、有効在庫を減らす。
- **数式**:
  ```math
  Available = Current - Locked - \sum(Confirmed Reservations)
  ```
- **制約**: システムは `Available >= 0` を維持するように予約作成時にチェックを行う。
    - 根拠: `LotReservationService.reserve()` 内のチェックロジック。
    - 検証用SQL (以下が常に0以上であること):
      ```sql
      SELECT 
        l.id AS lot_id,
        l.current_quantity - COALESCE(l.locked_quantity, 0) - COALESCE(SUM(r.reserved_qty), 0) AS available_check
      FROM lots l
      LEFT JOIN lot_reservations r ON l.id = r.lot_id AND r.status = 'confirmed'
      GROUP BY l.id;
      ```

## 2. ロットの一意性
- 同一倉庫、同一製品において、同じ `lot_number` は存在できない。
    - 根拠: Unique Constraint `uq_lots_number_product_warehouse`

## 3. ステータス遷移の整合性
- 予約 (`LotReservation`) の状態遷移は不可逆な順序がある。
- `released` (解放済み) になった予約は、再度 `active` や `confirmed` に戻ることはできない（終端状態）。
    - 根拠: `ReservationStateMachine` in `lot_reservations_model.py`
