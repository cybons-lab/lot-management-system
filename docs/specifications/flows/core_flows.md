# 主要フロー (Core Flows)

## 1. 入庫〜在庫化フロー (Inbound Process)
入庫予定 (`InboundPlan`) の受け入れから、ロット在庫 (`Lots`) の生成まで。

```mermaid
sequenceDiagram
    participant User
    participant API
    participant InboundService
    participant DB

    User->>API: 入庫実績登録 (POST /inbound-plans/{id}/receive)
    API->>InboundService: receive_inbound_plan()
    InboundService->>DB: 入庫予定取得 (InboundPlan)
    
    loop 各明細行 (InboundPlanLine)
        alt 予定ロットあり
            InboundService->>InboundService: ロット番号決定 (指定値 or 仮番発行)
        else 予定なし
            InboundService->>InboundService: 自動採番 (PlanNo + ProductID)
        end
        
        InboundService->>DB: Lot作成 (INSERT lots)
        Note right of DB: status='active', current_qty=受入数
        
        InboundService->>DB: 在庫履歴作成 (INSERT stock_history)
        Note right of DB: type='inbound'
    end

    InboundService->>DB: ステータス更新 (received)
    InboundService-->>API: 完了応答 (Created Lot IDs)
```

## 2. 引当・予約フロー (Allocation Process)
受注明細 (`OrderLine`) に対する在庫の引き当て。

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant LotService
    participant Calculator as AllocationDomain
    participant ReservationService
    participant DB

    Client->>API: 引当実行 (POST /allocations/calculate)
    API->>LotService: 引当候補検索 (get_fefo_candidates)
    LotService->>DB: Lot検索 (Available > 0, Active, Not Expired)
    DB-->>LotService: Lots
    
    LotService->>Calculator: calculate_allocation(Request, Lots)
    Note right of Calculator: FEFO順ソート<br/>期限切れ除外<br/>数量配分
    Calculator-->>LotService: AllocationResult (Adopted/Rejected)
    
    loop Adopted Lots
        LotService->>ReservationService: reserve(lot_id, qty, status='active')
        ReservationService->>DB: 有効在庫チェック (Current - Locked - Confirmed)
        Note right of ReservationService: Active予約は在庫を減らさない<br/>(Overbooking許容)
        ReservationService->>DB: INSERT lot_reservations
    end
    
    LotService-->>API: Response
```

## 3. 予約確定フロー (Reservation Confirmation)
仮予約 (`Active`) を確定 (`Confirmed`) させ、有効在庫を減らす。
通常、SAP連携や出庫指示のタイミングで行われる。

```mermaid
sequenceDiagram
    participant System
    participant ReservationService
    participant DB

    System->>ReservationService: confirm(reservation_id)
    ReservationService->>DB: UPDATE lot_reservations SET status='confirmed'
    Note right of DB: これにより有効在庫が減少する
```
