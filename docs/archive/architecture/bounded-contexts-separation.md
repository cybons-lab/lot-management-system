# Bounded Context 分離アーキテクチャ設計書

> **Version:** 1.0.0
> **作成日:** 2025-12-09
> **ステータス:** Draft

---

## 目次

1. [概要](#1-概要)
2. [現状分析](#2-現状分析)
3. [Bounded Context 定義](#3-bounded-context-定義)
4. [Context 間の関係性](#4-context-間の関係性)
5. [データベース設計](#5-データベース設計)
6. [API 設計](#6-api-設計)
7. [フロントエンド設計](#7-フロントエンド設計)
8. [移行戦略](#8-移行戦略)
9. [リスクと対策](#9-リスクと対策)

---

## 1. 概要

### 1.1 目的

システムを4つの Bounded Context に分離し、以下を実現する：

- **疎結合化**: Context 間の直接参照を排除し、変更影響を局所化
- **独立性**: 各 Context が単独で動作可能な構造
- **明確な責務**: 各ドメインの境界と責任範囲を明確化

### 1.2 スコープ

| Context | 責務 |
|---------|------|
| **Forecast** | 需要予測データの管理（事実のみ） |
| **Inventory** | 倉庫×製品単位の在庫集計（ロット詳細を含まない） |
| **Lot** | ロット固有情報（入荷、期限、数量） |
| **Order & Allocation** | 受注管理と引当ロジック |

### 1.3 設計原則

1. **Context 間は REST API のみで統合** - 直接の import/FK 参照禁止
2. **UI は Context 単体で完結** - 他 Context のデータは API 経由で取得
3. **引当ロジックは Allocation Service に一元化**
4. **各 Context は独自のデータストアを持つ**（論理分離）
5. **共有データは Shared Kernel として最小限に定義**

---

## 2. 現状分析

### 2.1 現在のドメイン構造

```
┌─────────────────────────────────────────────────────────────────┐
│                         現在のアーキテクチャ                      │
├─────────────────────────────────────────────────────────────────┤
│  Forecast ←──FK──→ OrderLine ←──FK──→ Allocation ←──FK──→ Lot  │
│     ↓                   ↓                  ↓             ↓      │
│  forecast_id        order_line_id       lot_id      warehouse  │
│     │                   │                  │             │      │
│     └───────────────────┴──────────────────┴─────────────┘      │
│                    すべて同一 DB 内で結合                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 問題点（結合度の高い箇所）

| 箇所 | 現状 | 問題 |
|------|------|------|
| `OrderLine.forecast_id` | Forecast への直接 FK | Order と Forecast が密結合 |
| `Allocation.lot_id` | Lot への直接 FK | 引当と在庫が密結合 |
| `AllocationSuggestion.forecast_id` | Forecast への FK | 引当提案が Forecast 依存 |
| `InventoryService` | Allocation テーブルを JOIN | 在庫集計が引当ロジックに依存 |
| フォーキャスト画面 | 在庫・ロット情報を埋め込み表示 | UI が複数ドメインを横断 |
| 受注画面 | 引当状況を同時表示 | 受注と引当が UI レベルで混在 |

---

## 3. Bounded Context 定義

### 3.1 Forecast Context（需要予測）

**責務**: 需要予測データの CRUD と履歴管理のみ

```
forecast/
├── domain/
│   └── forecast.py          # ForecastEntry, ForecastSnapshot
├── application/
│   └── forecast_service.py  # Import, Archive, Query
├── infrastructure/
│   ├── models/
│   │   ├── forecast_current.py
│   │   └── forecast_history.py
│   └── repositories/
│       └── forecast_repository.py
└── presentation/
    ├── routes/
    │   └── forecast_router.py
    └── schemas/
        └── forecast_schemas.py
```

**所有データ**:
- `forecast_current` - 現在有効な予測
- `forecast_history` - 過去の予測スナップショット

**提供 API**:
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/forecasts` | 予測一覧（フィルタ可） |
| GET | `/forecasts/{id}` | 予測詳細 |
| POST | `/forecasts/import` | 一括インポート |
| GET | `/forecasts/grouped` | 顧客×製品×納入先でグループ化 |

**UI**: フォーキャスト一覧画面（予測データのみ表示、在庫情報なし）

### 3.2 Inventory Context（倉庫在庫）

**責務**: 倉庫×製品単位の在庫集計（ロット詳細は含まない）

```
inventory/
├── domain/
│   └── inventory.py         # InventorySummary, StockLevel
├── application/
│   └── inventory_service.py # 集計クエリ、在庫サマリ
├── infrastructure/
│   ├── models/
│   │   └── inventory_summary.py  # 集計ビュー/マテビュー
│   └── repositories/
│       └── inventory_repository.py
└── presentation/
    ├── routes/
    │   └── inventory_router.py
    └── schemas/
        └── inventory_schemas.py
```

**所有データ**:
- `v_inventory_summary` - 製品×倉庫の在庫集計ビュー
- 集計元は Lot Context から API 経由で取得

**提供 API**:
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/inventory` | 在庫サマリ一覧 |
| GET | `/inventory/{product_id}/{warehouse_id}` | 特定在庫詳細 |
| GET | `/inventory/stats` | 統計情報 |

**UI**: 在庫管理画面（集計のみ、ロット詳細は Lot 画面へリンク）

### 3.3 Lot Context（ロット管理）

**責務**: ロット固有情報の管理（入荷、期限、数量、履歴）

```
lot/
├── domain/
│   ├── lot.py               # Lot エンティティ、FEFO ロジック
│   ├── stock_event.py       # 在庫イベント（入荷/出荷/調整）
│   └── inbound.py           # 入荷計画
├── application/
│   ├── lot_service.py       # ロット CRUD
│   ├── inbound_service.py   # 入荷計画管理
│   └── adjustment_service.py # 数量調整
├── infrastructure/
│   ├── models/
│   │   ├── lot.py
│   │   ├── stock_history.py
│   │   ├── inbound_plan.py
│   │   └── adjustment.py
│   └── repositories/
│       ├── lot_repository.py
│       └── inbound_repository.py
└── presentation/
    ├── routes/
    │   ├── lot_router.py
    │   └── inbound_router.py
    └── schemas/
        └── lot_schemas.py
```

**所有データ**:
- `lots` - ロットマスタ
- `stock_history` - 在庫変動履歴（イミュータブル）
- `inbound_plans` / `inbound_plan_lines` - 入荷計画
- `adjustments` - 数量調整記録

**提供 API**:
| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/lots` | ロット一覧 |
| GET | `/lots/{id}` | ロット詳細 |
| POST | `/lots` | ロット登録 |
| GET | `/lots/available` | 利用可能ロット（FEFO順） |
| GET | `/inbound-plans` | 入荷計画一覧 |
| POST | `/lots/{id}/adjust` | 数量調整 |

**UI**: ロット管理画面（ロット詳細、履歴、入荷計画）

### 3.4 Order & Allocation Context（受注・引当）

**責務**: 受注管理と引当ロジックの一元化

```
order_allocation/
├── domain/
│   ├── order.py             # Order, OrderLine エンティティ
│   ├── allocation.py        # Allocation, AllocationResult
│   └── state_machine.py     # 受注/引当ステート管理
├── application/
│   ├── order_service.py     # 受注 CRUD
│   ├── allocation_service.py # 引当エンジン（FEFO）
│   └── import_service.py    # 受注インポート
├── infrastructure/
│   ├── models/
│   │   ├── order.py
│   │   ├── order_line.py
│   │   └── allocation.py
│   └── repositories/
│       ├── order_repository.py
│       └── allocation_repository.py
└── presentation/
    ├── routes/
    │   ├── order_router.py
    │   └── allocation_router.py
    └── schemas/
        ├── order_schemas.py
        └── allocation_schemas.py
```

**所有データ**:
- `orders` / `order_lines` - 受注データ
- `allocations` - 引当結果
- `allocation_traces` - 引当履歴

**提供 API**:

| カテゴリ | Method | Endpoint | 説明 |
|----------|--------|----------|------|
| 受注 | GET | `/orders` | 受注一覧（引当状況なし） |
| 受注 | GET | `/orders/{id}` | 受注詳細（事実のみ） |
| 受注 | POST | `/orders` | 受注登録 |
| 引当 | POST | `/allocations/preview` | FEFO 引当プレビュー |
| 引当 | POST | `/allocations/commit` | 引当確定 |
| 引当 | GET | `/allocations/by-order/{order_id}` | 受注の引当状況 |
| 引当 | POST | `/allocations/manual` | 手動引当 |

**UI**:
- 受注管理画面（受注データのみ、引当は別画面へ）
- 引当管理画面（引当操作専用）

---

## 4. Context 間の関係性

### 4.1 Context Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Context Map                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐                           ┌──────────────────┐       │
│   │   Forecast   │                           │   Lot Context    │       │
│   │   Context    │                           │                  │       │
│   │              │                           │  - lots          │       │
│   │  - forecasts │                           │  - stock_history │       │
│   └──────┬───────┘                           │  - inbound_plans │       │
│          │                                   └────────┬─────────┘       │
│          │ [OHS]                                      │                 │
│          │ 予測データ提供                              │ [OHS]           │
│          ▼                                            │ 利用可能ロット   │
│   ┌──────────────────────────────────────────────────▼──────────┐       │
│   │                Order & Allocation Context                    │       │
│   │                                                              │       │
│   │   - orders / order_lines                                     │       │
│   │   - allocations (← Lot への参照は lot_number で解決)          │       │
│   │                                                              │       │
│   │   [ACL] 外部データを内部モデルに変換                           │       │
│   └──────────────────────────────────────────────────────────────┘       │
│          │                                                               │
│          │ [PUB]                                                         │
│          │ 引当結果イベント                                               │
│          ▼                                                               │
│   ┌──────────────┐                                                       │
│   │  Inventory   │ ← Lot Context から集計データを購読                    │
│   │   Context    │                                                       │
│   │              │                                                       │
│   │  - 集計ビュー │                                                       │
│   └──────────────┘                                                       │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────┐       │
│   │                    Shared Kernel                             │       │
│   │   - products, customers, warehouses, delivery_places         │       │
│   │   - suppliers（マスタデータ）                                  │       │
│   └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘

凡例:
  [OHS] Open Host Service - 公開 API で他 Context にサービス提供
  [ACL] Anti-Corruption Layer - 外部データを内部モデルに変換
  [PUB] Published Language - 標準化されたイベント/メッセージ形式
```

### 4.2 統合パターン

| 呼び出し元 | 呼び出し先 | パターン | 方式 |
|-----------|-----------|---------|------|
| Order & Allocation | Forecast | OHS + ACL | REST API `/forecasts` |
| Order & Allocation | Lot | OHS + ACL | REST API `/lots/available` |
| Inventory | Lot | OHS | REST API `/lots` で集計 |
| Inventory | Order & Allocation | PUB/SUB | 引当イベント購読（将来） |

**統合ルール**:

1. **同期呼び出し（REST API）**
   - 引当処理時に Lot Context から利用可能ロットを取得
   - フォーキャスト紐づけ時に Forecast Context から予測を取得

2. **ID 参照の扱い**
   - Context 間では `lot_number`（ビジネスキー）で参照
   - 内部 FK（`lot_id`）は使用しない
   - 外部参照は ACL で変換

3. **データ整合性**
   - 結果整合性（Eventual Consistency）を許容
   - 引当確定時のみ強整合性（2PC は使わず Saga パターン）

---

## 5. データベース設計

### 5.1 スキーマ分離

論理的なスキーマ分離（同一 DB 内でプレフィックス or スキーマ名で分離）

```sql
-- 各 Context のスキーマ
CREATE SCHEMA forecast;
CREATE SCHEMA lot;
CREATE SCHEMA order_allocation;
CREATE SCHEMA inventory;
CREATE SCHEMA shared;  -- マスタデータ
```

### 5.2 共有カーネル（Shared Kernel）

全 Context が参照可能なマスタデータ：

| テーブル | 説明 |
|----------|------|
| `shared.products` | 製品マスタ |
| `shared.customers` | 顧客マスタ |
| `shared.warehouses` | 倉庫マスタ |
| `shared.delivery_places` | 納入先マスタ |
| `shared.suppliers` | 仕入先マスタ |

### 5.3 各 Context のテーブル

**Forecast Context** (`forecast.*`)
```sql
forecast.forecast_current (
  id, customer_id, delivery_place_id, product_id,
  forecast_date, forecast_period, quantity,
  created_at, updated_at
)

forecast.forecast_history (
  id, snapshot_id, customer_id, delivery_place_id, product_id,
  forecast_date, quantity, archived_at
)
```

**Lot Context** (`lot.*`)
```sql
lot.lots (
  id, lot_number, product_id, warehouse_id, supplier_id,
  current_qty, expiry_date, receipt_date, status,
  origin_type, created_at
)

lot.stock_history (
  id, lot_id, transaction_type, quantity, reference_type,
  reference_id, created_at  -- イミュータブル
)

lot.inbound_plans (id, supplier_id, expected_date, status, ...)
lot.inbound_plan_lines (id, plan_id, product_id, quantity, ...)
lot.adjustments (id, lot_id, quantity_change, reason, ...)
```

**Order & Allocation Context** (`order_allocation.*`)
```sql
order_allocation.orders (
  id, order_number, customer_id, order_date, status, ...
)

order_allocation.order_lines (
  id, order_id, product_id, delivery_place_id,
  quantity, delivery_date, status,
  -- forecast_id は削除、代わりに forecast_reference を使用
  forecast_reference VARCHAR  -- "FCST-2025-001" 形式
)

order_allocation.allocations (
  id, order_line_id,
  lot_reference VARCHAR,  -- lot_number（FK ではない）
  quantity, status, allocated_at
)

order_allocation.allocation_traces (
  id, order_line_id, lot_reference, quantity, action, created_at
)
```

**Inventory Context** (`inventory.*`)
```sql
-- マテリアライズドビューまたは集計テーブル
inventory.inventory_summary (
  product_id, warehouse_id,
  total_qty, allocated_qty, available_qty,
  lot_count, last_updated
)
```

---

## 6. API 設計

### 6.1 Context 内 API

各 Context は独自の API プレフィックスを持つ：

```
/api/v2/forecast/*     → Forecast Context
/api/v2/lot/*          → Lot Context
/api/v2/order/*        → Order & Allocation Context
/api/v2/allocation/*   → Order & Allocation Context（引当専用）
/api/v2/inventory/*    → Inventory Context
```

### 6.2 Context 間統合 API

**Allocation が Lot を呼び出す例**:

```python
# order_allocation/application/allocation_service.py

class AllocationService:
    def __init__(self, lot_client: LotContextClient):
        self.lot_client = lot_client

    async def allocate_fefo(self, order_line_id: int, quantity: int):
        # Lot Context から利用可能ロットを取得
        available_lots = await self.lot_client.get_available_lots(
            product_id=order_line.product_id,
            warehouse_id=order_line.warehouse_id,
            min_quantity=quantity
        )

        # FEFO で選択
        selected = self._select_fefo(available_lots, quantity)

        # 引当を記録（lot_reference で参照）
        for lot in selected:
            allocation = Allocation(
                order_line_id=order_line_id,
                lot_reference=lot.lot_number,  # FK ではなくビジネスキー
                quantity=lot.allocated_qty
            )
            ...

        # Lot Context に引当を通知
        await self.lot_client.reserve_quantity(
            lot_number=lot.lot_number,
            quantity=lot.allocated_qty,
            reference=f"ORDER-{order_line_id}"
        )
```

**Lot Context Client（ACL）**:

```python
# order_allocation/infrastructure/clients/lot_client.py

class LotContextClient:
    def __init__(self, base_url: str = "http://localhost:8000/api/v2/lot"):
        self.base_url = base_url

    async def get_available_lots(
        self, product_id: int, warehouse_id: int, min_quantity: int
    ) -> list[LotCandidate]:
        response = await httpx.get(
            f"{self.base_url}/available",
            params={
                "product_id": product_id,
                "warehouse_id": warehouse_id,
                "min_qty": min_quantity
            }
        )
        # ACL: 外部レスポンスを内部モデルに変換
        return [LotCandidate.from_external(lot) for lot in response.json()]

    async def reserve_quantity(
        self, lot_number: str, quantity: int, reference: str
    ) -> bool:
        response = await httpx.post(
            f"{self.base_url}/reserve",
            json={
                "lot_number": lot_number,
                "quantity": quantity,
                "reference": reference
            }
        )
        return response.status_code == 200
```

---

## 7. フロントエンド設計

### 7.1 Feature 分離

```
frontend/src/
├── features/
│   ├── forecast/              # Forecast Context
│   │   ├── api.ts             # /api/v2/forecast/* のみ
│   │   ├── components/
│   │   │   ├── ForecastList.tsx
│   │   │   └── ForecastGroupCard.tsx
│   │   ├── hooks/
│   │   └── types.ts
│   │
│   ├── inventory/             # Inventory Context
│   │   ├── api.ts             # /api/v2/inventory/* のみ
│   │   ├── components/
│   │   │   ├── InventorySummary.tsx
│   │   │   └── InventoryStats.tsx
│   │   └── ...
│   │
│   ├── lot/                   # Lot Context（新規分離）
│   │   ├── api.ts             # /api/v2/lot/* のみ
│   │   ├── components/
│   │   │   ├── LotList.tsx
│   │   │   ├── LotDetail.tsx
│   │   │   └── InboundPlanList.tsx
│   │   └── ...
│   │
│   ├── order/                 # Order Context（受注のみ）
│   │   ├── api.ts             # /api/v2/order/* のみ
│   │   ├── components/
│   │   │   ├── OrderList.tsx
│   │   │   └── OrderDetail.tsx
│   │   └── ...
│   │
│   └── allocation/            # Allocation Context（引当専用）
│       ├── api.ts             # /api/v2/allocation/* のみ
│       ├── components/
│       │   ├── AllocationBoard.tsx
│       │   ├── FefoPreview.tsx
│       │   └── ManualAllocation.tsx
│       └── ...
│
└── shared/                    # 共有（マスタデータのみ）
    ├── api/
    │   └── masters.ts         # 製品、顧客、倉庫など
    └── types/
```

### 7.2 各画面の責務

| 画面 | Context | 責務 | 他 Context との連携 |
|------|---------|------|---------------------|
| **フォーキャスト一覧** | Forecast | 予測データの表示・インポート | なし（在庫表示削除） |
| **在庫サマリ** | Inventory | 製品×倉庫の集計表示 | Lot 詳細へのリンクのみ |
| **ロット管理** | Lot | ロット詳細・履歴・入荷計画 | なし |
| **受注一覧** | Order | 受注データの表示・登録 | 引当画面へのリンクのみ |
| **引当管理** | Allocation | 引当操作（FEFO、手動） | Lot/Order を API 経由で取得 |

**UI 連携パターン**:

```tsx
// 受注画面から引当画面へ遷移
const OrderDetail = ({ orderId }: Props) => {
  return (
    <div>
      <OrderInfo orderId={orderId} />
      {/* 引当状況は表示せず、リンクのみ */}
      <Link to={`/allocation?order_id=${orderId}`}>
        引当を確認・操作する →
      </Link>
    </div>
  );
};

// 引当画面で必要なデータを API 経由で取得
const AllocationBoard = ({ orderId }: Props) => {
  // Order Context から受注情報を取得
  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getOrder(orderId)
  });

  // Lot Context から利用可能ロットを取得
  const { data: lots } = useQuery({
    queryKey: ['available-lots', order?.product_id],
    queryFn: () => lotApi.getAvailableLots(order.product_id)
  });

  return <AllocationView order={order} lots={lots} />;
};
```

---

## 8. 移行戦略

### 8.1 フェーズ計画

```
Phase 1: 準備（基盤整備）
├── スキーマ分離の設計確定
├── Context Client インターフェース定義
├── API v2 エンドポイント設計
└── マイグレーションスクリプト準備

Phase 2: バックエンド分離
├── Step 2.1: Shared Kernel 抽出（マスタデータ）
├── Step 2.2: Lot Context 分離
├── Step 2.3: Forecast Context 分離
├── Step 2.4: Order & Allocation Context 分離
└── Step 2.5: Inventory Context 分離（集計ビュー）

Phase 3: フロントエンド分離
├── Step 3.1: API クライアント v2 対応
├── Step 3.2: Feature 分離（lot, forecast, order, allocation, inventory）
├── Step 3.3: UI コンポーネント整理（埋め込み表示削除）
└── Step 3.4: ルーティング更新

Phase 4: 移行完了
├── v1 API 廃止
├── 旧 FK 参照の削除
└── ドキュメント更新
```

### 8.2 後方互換性

**v1 → v2 並行運用期間**:

```python
# main.py
app.include_router(v1_router, prefix="/api")      # 既存
app.include_router(v2_router, prefix="/api/v2")   # 新規

# v1 は v2 へのプロキシとして動作（段階的移行）
@v1_router.get("/orders/{order_id}")
async def get_order_v1(order_id: int):
    # v2 を呼び出し、v1 形式にマッピング
    order = await order_service.get(order_id)
    allocations = await allocation_service.get_by_order(order_id)
    return V1OrderResponse.from_v2(order, allocations)
```

**データマイグレーション**:

```sql
-- Step 1: lot_reference カラム追加
ALTER TABLE allocations ADD COLUMN lot_reference VARCHAR(50);

-- Step 2: 既存データ移行
UPDATE allocations a
SET lot_reference = (SELECT lot_number FROM lots WHERE id = a.lot_id);

-- Step 3: 並行運用期間後に lot_id FK 削除
ALTER TABLE allocations DROP CONSTRAINT allocations_lot_id_fkey;
ALTER TABLE allocations DROP COLUMN lot_id;
```

---

## 9. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| **パフォーマンス低下** | 高 | Context 間 API 呼び出しが増加 → キャッシュ層導入、バッチ API 設計 |
| **データ整合性** | 高 | FK 削除により参照整合性が失われる → Saga パターン、補償トランザクション |
| **移行中の障害** | 中 | v1/v2 並行運用中の不整合 → Feature Flag で段階的切替、ロールバック計画 |
| **開発工数** | 中 | 大規模リファクタリング → 段階的移行、自動テスト拡充 |
| **運用複雑化** | 低 | Context 間の監視が複雑に → 分散トレーシング（OpenTelemetry）導入 |

---

## 付録: 用語集

| 用語 | 説明 |
|------|------|
| **Bounded Context** | ドメイン駆動設計における境界づけられたコンテキスト |
| **OHS (Open Host Service)** | 公開 API で他システムにサービスを提供するパターン |
| **ACL (Anti-Corruption Layer)** | 外部システムのモデルを内部モデルに変換する層 |
| **Shared Kernel** | 複数 Context で共有する最小限のドメインモデル |
| **FEFO** | First Expiry First Out（先期限先出し）アルゴリズム |
| **Saga パターン** | 分散トランザクションを補償アクションで管理するパターン |
