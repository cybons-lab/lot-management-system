# ER図 (Entity Relationship Diagram)

主要なエンティティ間のリレーションを示す。

```mermaid
erDiagram
    %% Master Data
    Products ||--o{ LotMaster : "master_of"
    Products ||--o{ OrderLines : "ordered"
    Warehouses ||--o{ LotReceipts : "stored_in"
    Suppliers ||--o{ LotMaster : "mastered_by (optional)"
    Suppliers ||--o{ LotReceipts : "supplied"
    Customers ||--o{ Orders : "places"
    DeliveryPlaces ||--o{ Orders : "ships_to"

    %% Inventory
    LotMaster ||--o{ LotReceipts : "aggregates"
    LotReceipts ||--o{ StockHistory : "history"
    LotReceipts ||--o{ Adjustments : "adjusted"
    LotReceipts ||--o{ LotReservations : "reserved"

    %% Orders
    Orders ||--o{ OrderLines : "contains"
    
    %% Reservation / Allocation
    OrderLines ||--o{ LotReservations : "reserves (source_id)"
    OrderLines ||--o{ AllocationTraces : "traced_in"
    LotReceipts ||--o{ AllocationTraces : "candidate_for"
    
    %% Inbound
    ExpectedLots ||--o| LotReceipts : "becomes"

    lot_master {
        bigint id PK
        string lot_number
        bigint product_id FK
    }
    
    lot_receipts {
        bigint id PK
        bigint lot_master_id FK
        decimal received_quantity
        decimal consumed_quantity
        string status
    }
    
    lot_reservations {
        bigint id PK
        bigint lot_id FK
        string source_type
        decimal reserved_qty
        string status
    }
    
    order_lines {
        bigint id PK
        decimal order_quantity
        date delivery_date
    }
```
