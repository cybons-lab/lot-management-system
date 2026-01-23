# ロット管理ルール (Lot Management Rules)

## 1. ロットの定義 (Lot Definition)
ロットは「製品」「倉庫」「ロット番号」の組み合わせで一意に識別される。

- **一意性制約**: `(lot_number, product_id, warehouse_id)`
    - 根拠: `backend/app/infrastructure/persistence/models/inventory_models.py` (UniqueConstraint `uq_lots_number_product_warehouse`)
- **仮ロット (Temporary Lot)**:
    - 入庫時にロット番号が未確定の場合、システムが `TMP-YYYYMMDD-XXXX` (XXXXはUUID先頭8桁) の形式で暫定番号を発行する。
    - 内部管理用に `temporary_lot_key` (UUID) を保持し、正式ロット番号確定時の突合に使用する。
    - 根拠: `backend/app/application/services/inventory/lot_service.py` (`_generate_temporary_lot_info`)

## 2. ロットステータス (Lot Status)
以下のステータスを持ち、在庫の引き当て可否や状態を制御する。
根拠: `backend/app/infrastructure/persistence/models/inventory_models.py` (CheckConstraint `chk_lots_status`)

| ステータス | 意味 | 引当可否 | 備考 |
| :--- | :--- | :--- | :--- |
| **active** | 有効 | ○ | 通常の状態 |
| **depleted** | 枯渇 | × | 在庫数量0になった場合（想定） |
| **expired** | 期限切れ | × | 有効期限を超過 |
| **quarantine** | 検疫中 | × | 品質確認待ちなど |
| **locked** | ロック | × | 手動ロック中（全量ロック扱い） |

> [!NOTE]
> `locked` ステータスはロット全体を使用不可にするが、`active` 状態のまま一部数量のみをロックする `locked_quantity` も存在する。

## 3. 在庫数量の定義と計算式 (Inventory Calculation)
在庫には以下の概念が存在する。
根拠: `backend/app/application/services/inventory/stock_calculation.py`

### 3.1. 計算式
- **現在在庫 (Current Quantity)**: 物理的な在庫総数。
- **ロック済み数量 (Locked Quantity)**: 品質不良や調査などの理由で保留されている数量。
- **予約済み数量 (Reserved Quantity)**: 出庫などが **確定(CONFIRMED)** している数量。
    - **重要**: `ACTIVE` (仮予約/引当済み未確定) の予約は、ここには**含まれない**。これにより、仮引当段階では在庫を拘束せず、オーバーブッキングを許容する運用となっている。
    - 根拠: `get_reserved_quantity` ("Only confirmed reservations affect Available Qty... Provisional reservations do NOT reduce Available Qty.")


#### 有効在庫 (Available Quantity)
```math
Available = Current - Locked - Reserved(Confirmed Only)
```
- 引当計算や在庫確認で使用される値。
- **重要**: 仮引当 (`active`) 分は引かれていない。
    - **ビジネスルール**: 仮引当段階でのオーバーブッキング（在庫数以上の仮押さえ）を**許容する**。
    - 確定（Confirmed）処理のタイミングで在庫チェックが行われ、そこではじめて「早い者勝ち」で在庫が確保される。
    - UI上は、有効在庫とは別に「仮引当中の数量」も可視化される（予定）。

## 4. 引当ロジック (Allocation Logic)
**FEFO (First Expiry First Out / 期限優先先出し)** を採用している。
根拠: `backend/app/domain/allocation/calculator.py` (`calculate_allocation`, `_sort_by_fefo`)

### 4.1. 引当候補の選定
以下の条件でフィルタリングを行う:
1. **有効期限切れの除外**: 基準日 < 有効期限 であること。
2. **ステータスチェック**: `active` であること。
3. **在庫あり**: `available_quantity > 0` であること。

### 4.2. 優先順位 (Sorting)
以下の順序で引き当てる:
1. **有効期限が近い順** (Ascending)
2. **有効期限設定なし (NULL)** は**最後**に回す

### 4.3. 引当判定 (Decision)
- **完全充足**: 要求数量 <= 利用可能数量 ならば即採用 (`adopted`)。
- **部分引当**: 要求数量 > 利用可能数量 の場合
    - `allow_partial=True` (分納許可) なら、あるだけ引き当てる (`partial`)。
    - `allow_partial=False` なら、そのロットは不採用 (`rejected`)。

## 5. ロットのライフサイクル・操作
### 5.1. 入庫 (Inbound)
- **計画入庫**: 入荷予定 (`InboundPlan`) に基づく入庫。
    - `received_date` (入庫日) は必須。
    - 入庫時点で `StockHistory` (区分: `inbound`) が作成される。
    - 根拠: `backend/app/application/services/inventory/inbound_receiving_service.py`
- **予定なし入庫 (Adhoc Inbound)**:
    - 入荷予定を経由せず、ロット管理画面等から直接ロットを登録する。
    - 原則として手動登録扱いとなる。

### 5.2. 在庫調整 (Adjustment)
- 棚卸、破損、紛失などで在庫数を修正する機能。
- 区分: `physical_count`, `damage`, `loss`, `found`, `other`。
- 根拠: `backend/app/infrastructure/persistence/models/inventory_models.py` (`Adjustment` model)

### 5.3. 予約管理 (Reservation)
従来の `Allocations` テーブルから `LotReservation` テーブルへの移行が進んでいる（P3移行）。
- ソース: `forecast`, `order`, `manual`
- ステータス遷移:
    - `temporary` (一時) → `active` (有効) → `confirmed` (確定/SAP連携済)
    - `released` (解放/キャンセル)
- 根拠: `backend/app/infrastructure/persistence/models/lot_reservations_model.py` (`ReservationStateMachine`)
