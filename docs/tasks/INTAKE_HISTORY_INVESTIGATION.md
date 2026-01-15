# 入庫履歴機能 - 調査報告

## 問題
入庫履歴タブを開いても「入庫履歴はありません」と表示され、データが1件も表示されない。

## 原因分析

### データソース
入庫履歴は`stock_history`テーブルの`transaction_type = 'inbound'`レコードを取得して表示する。

### StockHistory INBOUNDレコードが作成される箇所

| 処理 | ファイル | StockHistory作成 |
|-----|---------|-----------------|
| InboundPlan入庫処理 | `inbound_receiving_service.py` | ✅ 作成される |
| adhocロット作成（ロット新規登録） | `lot_service.py` | ❌ **作成されない** |
| サンプルデータ投入 | `seed_data.py`など | ❌ **作成されない** |

### 根本原因
**`lot_service.create_lot()`でStockHistoryが作成されていない**

```python
# lot_service.py の create_lot() - L508-530
db_lot = Lot(**lot_payload)
self.db.add(db_lot)
self.db.commit()
# ← ここでStockHistoryが作成されていない！
return self._build_lot_response(db_lot.id)
```

InboundPlanを経由した入庫処理（`receive_inbound_plan`）では`StockHistory`にINBOUNDレコードが作成されるが、以下のケースでは作成されない：

1. **「ロット新規登録」画面からのadhocロット作成**
2. **サンプルデータ投入時のロット作成**
3. **直接API経由でのロット作成**

## 修正方針

### 方法1: lot_service.create_lot()でStockHistory作成（推奨）
`create_lot()`内でロット作成後に`StockHistory(transaction_type='inbound')`を作成する。

```python
# lot_service.py create_lot() に追加
from app.infrastructure.persistence.models import StockHistory, StockTransactionType

# ロット作成後
db_lot = Lot(**lot_payload)
self.db.add(db_lot)
self.db.flush()

# 入庫履歴を記録
stock_history = StockHistory(
    lot_id=db_lot.id,
    transaction_type=StockTransactionType.INBOUND,
    quantity_change=db_lot.current_quantity,
    quantity_after=db_lot.current_quantity,
    reference_type="adhoc_intake",
    reference_id=db_lot.id,
    transaction_date=db_lot.received_date or func.now(),
)
self.db.add(stock_history)
self.db.commit()
```

### 方法2: 既存データのマイグレーション
既存のロットに対してINBOUNDレコードを作成するマイグレーションスクリプトを実行。

```sql
INSERT INTO stock_history (lot_id, transaction_type, quantity_change, quantity_after, reference_type, transaction_date)
SELECT id, 'inbound', current_quantity, current_quantity, 'migration', received_date
FROM lot_receipts
WHERE id NOT IN (SELECT lot_id FROM stock_history WHERE transaction_type = 'inbound');
```

## 推奨対応

1. **即時対応**: `lot_service.create_lot()`を修正してStockHistory作成を追加
2. **データ復旧**: 既存ロットに対するマイグレーションスクリプト実行
3. **テスト**: 入庫履歴画面でデータが表示されることを確認

## 関連ファイル

- `backend/app/application/services/inventory/lot_service.py` - create_lot()
- `backend/app/application/services/inventory/inbound_receiving_service.py` - receive_inbound_plan()
- `backend/app/application/services/inventory/intake_history_service.py` - get_intake_history()
- `backend/app/infrastructure/persistence/models/inventory_models.py` - StockHistory, StockTransactionType
