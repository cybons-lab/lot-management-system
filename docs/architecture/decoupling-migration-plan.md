# モノリシックシステム疎結合化 作業計画書

> **Version:** 2.0.0
> **作成日:** 2025-12-10
> **ステータス:** Draft - レビュー待ち

---

## 目次

1. [概要](#1-概要)
2. [前提条件](#2-前提条件)
3. [Step 1: データモデル刷新](#step-1-データモデル刷新db--model層)
4. [Step 2: サービス層の書き換え](#step-2-サービス層の書き換え)
5. [Step 3: API v2 導入](#step-3-api-v2-導入)
6. [マイルストーン総括](#マイルストーン総括)
7. [リスクマトリクス](#リスクマトリクス)

---

## 1. 概要

### 1.1 目的

本計画書は、現在同一DB内で動作しているモノリシックなロット管理システムを、**効率的に疎結合化**するための作業計画を定義する。

### 1.2 関連ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [bounded-contexts-separation.md](./bounded-contexts-separation.md) | 最終的なアーキテクチャのゴール |
| [system_invariants.md](./system_invariants.md) | 絶対に壊してはいけない不変条件 |

### 1.3 スコープ

- **対象**: バックエンドのAPI・サービス層・データモデル、フロントエンドのAPI呼び出し
- **前提**: 物理DB分割やマイクロサービス化は行わない（論理分離のみ）

### 1.4 作業前提

| 条件 | 状態 |
|------|------|
| 作業中の他開発者 | なし（単独作業） |
| 既存データ | **全削除可能** |
| 破壊的変更 | **許容** |
| 後方互換性 | **不要** |
| 並行運用期間 | **不要** |

この前提により、9 Step → 3 Step に効率化。

---

## 2. 前提条件

### 2.1 現状分析

| 項目 | 状態 |
|-----|------|
| `lot_reservations` テーブル | **存在しない**（新規作成必要） |
| `allocations.lot_id` | 直接FK参照（→ `lot_reference` に置換） |
| `order_lines.forecast_id` | 直接FK参照（→ `forecast_reference` に置換） |
| `lots.allocated_quantity` | サービス層で直接更新（→ 削除） |
| サービス層 | Feature-based で14パッケージに分離済み（良好な基盤） |

### 2.2 不変条件（絶対に壊さない）

以下は `system_invariants.md` で定義された不変条件であり、全Stepで遵守する：

1. **トランザクション整合性**: 引当確定時は `lot残量` / `lot_reservations` / `allocations` を**同一トランザクション**で更新
2. **動的計算**: 在庫はスナップショットを持たず**動的計算**で求める
3. **非負制約**: ロット残量は **0未満禁止**（DB制約 + ロジック両方で担保）
4. **予約統一**: すべてのロット押さえは **`lot_reservations` を通じて表現**
5. **並行制御**: 同一ロットへの同時引当は「早い者勝ち」（DBトランザクションで整合性担保）

---

## Step 1: データモデル刷新（DB + Model層）

### 目的

- `lot_reservations` テーブルを新設
- 旧構造（`allocated_quantity`, FK参照）を一括削除・置換
- 既存データは全削除し、クリーンな状態から開始

### 変更対象レイヤー

- **DB**: テーブル作成・カラム削除・FK削除
- **Model層**: SQLAlchemy モデル更新

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 1-1 | `lot_reservations` テーブル作成 | 新規テーブル、CHECK制約、インデックス |
| 1-2 | `lots.allocated_quantity` 削除 | カラム削除 |
| 1-3 | `allocations.lot_id` → `lot_reference` 置換 | FK削除、VARCHAR カラムに置換 |
| 1-4 | `order_lines.forecast_id` → `forecast_reference` 置換 | FK削除、VARCHAR カラムに置換 |
| 1-5 | SQLAlchemy モデル更新 | 各モデルクラスを新スキーマに対応 |
| 1-6 | 既存データ全削除 | マイグレーションでクリーン状態に |
| 1-7 | DB制約追加 | 利用可能数量の非負制約（トリガー or CHECK） |

### テーブル定義

#### lot_reservations（新規）

```sql
CREATE TABLE lot_reservations (
    id BIGSERIAL PRIMARY KEY,
    lot_id BIGINT NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,
    source_type VARCHAR(20) NOT NULL,  -- 'forecast' | 'order' | 'manual'
    source_id BIGINT,                   -- order_line_id or forecast_group_id など
    reserved_qty NUMERIC(15, 3) NOT NULL CHECK (reserved_qty > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'temporary' | 'active' | 'confirmed' | 'released'
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,               -- temporary 予約の有効期限
    confirmed_at TIMESTAMP,
    released_at TIMESTAMP,

    CONSTRAINT unique_active_reservation
        UNIQUE (lot_id, source_type, source_id)
        WHERE status IN ('active', 'confirmed')
);

CREATE INDEX idx_lot_reservations_lot_status ON lot_reservations(lot_id, status);
CREATE INDEX idx_lot_reservations_source ON lot_reservations(source_type, source_id);
```

#### allocations（変更）

```sql
-- 変更前
lot_id BIGINT REFERENCES lots(id)

-- 変更後
lot_reference VARCHAR(50) NOT NULL  -- lot_number（ビジネスキー）
-- FK削除
```

#### order_lines（変更）

```sql
-- 変更前
forecast_id BIGINT REFERENCES forecast_current(id)

-- 変更後
forecast_reference VARCHAR(100)  -- ビジネスキー形式
-- FK削除
```

#### lots（変更）

```sql
-- 削除
allocated_quantity  -- このカラムを削除
```

### マイグレーション方針

```python
# 単一マイグレーションで実行
def upgrade():
    # 1. 既存データ削除（破壊的変更OK）
    op.execute("TRUNCATE allocations, order_lines, orders, lots CASCADE")

    # 2. lot_reservations 作成
    op.create_table('lot_reservations', ...)

    # 3. lots.allocated_quantity 削除
    op.drop_column('lots', 'allocated_quantity')

    # 4. allocations.lot_id → lot_reference
    op.drop_constraint('allocations_lot_id_fkey', 'allocations')
    op.drop_column('allocations', 'lot_id')
    op.add_column('allocations', sa.Column('lot_reference', sa.String(50), nullable=False))

    # 5. order_lines.forecast_id → forecast_reference
    op.drop_constraint('order_lines_forecast_id_fkey', 'order_lines')
    op.drop_column('order_lines', 'forecast_id')
    op.add_column('order_lines', sa.Column('forecast_reference', sa.String(100)))
```

### 影響範囲とリスク

- **影響**: データモデル全体の構造変更
- **リスク**: 高（ただし既存データ削除OKなので復旧不要）

### 完了判定条件

- [ ] マイグレーションが正常に適用される
- [ ] `lot_reservations` テーブルが存在する
- [ ] `lots.allocated_quantity` が削除されている
- [ ] `allocations.lot_reference` が存在し、`lot_id` FK が削除されている
- [ ] `order_lines.forecast_reference` が存在し、`forecast_id` FK が削除されている
- [ ] SQLAlchemy モデルが新スキーマに対応している

---

## Step 2: サービス層の書き換え

### 目的

- 新データモデルに合わせたビジネスロジックの実装
- `lot_reservations` を中心とした在庫管理の実現
- 不変条件（トランザクション整合性、動的計算、非負制約）の遵守

### 変更対象レイヤー

- **Service層**: 引当・在庫・ロット関連サービス
- **Repository層**: 新テーブル対応
- **Domain層**: ビジネスルール

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 2-1 | `LotReservation` モデル作成 | `app/infrastructure/persistence/models/` |
| 2-2 | `LotReservationRepository` 作成 | CRUD + `get_active_by_lot()`, `get_by_source()`, `sum_active_qty()` |
| 2-3 | `LotReservationService` 作成 | `create()`, `release()`, `confirm()`, `transfer()` |
| 2-4 | 在庫計算ロジック書き換え | `available_qty = current_qty - SUM(active reservations)` |
| 2-5 | FEFO引当ロジック書き換え | `lot_reservations` 作成 + `allocations` 作成を同一トランザクションで |
| 2-6 | 手動引当ロジック書き換え | 同上 |
| 2-7 | Forecast引当ロジック書き換え | `source_type='forecast'` での予約作成 |
| 2-8 | 引当振替ロジック実装 | Forecast → Order 振替時の `source_type` 更新 |
| 2-9 | `lot_reference` ルックアップ実装 | `lot_number` からロット情報を取得 |
| 2-10 | `forecast_reference` ルックアップ実装 | ビジネスキーから予測情報を取得 |
| 2-11 | 旧ロジック削除 | `allocated_quantity` 関連のコード削除 |
| 2-12 | 単体テスト作成 | 各サービスのテスト |
| 2-13 | 結合テスト作成 | 引当フロー全体のテスト |

### 実装イメージ

#### LotReservationService

```python
# app/application/services/lot_reservations/lot_reservation_service.py

class LotReservationService:
    def __init__(self, db: Session):
        self.db = db

    def create_reservation(
        self,
        lot_id: int,
        source_type: str,  # 'forecast' | 'order' | 'manual'
        source_id: int | None,
        quantity: Decimal,
        status: str = 'active',
    ) -> LotReservation:
        """予約を作成（在庫チェック込み）"""
        lot = self.db.query(Lot).filter(Lot.id == lot_id).with_for_update().one()

        # 利用可能数量チェック（動的計算）
        available = self._calculate_available(lot_id)
        if available < quantity:
            raise InsufficientStockError(f"Available: {available}, Requested: {quantity}")

        reservation = LotReservation(
            lot_id=lot_id,
            source_type=source_type,
            source_id=source_id,
            reserved_qty=quantity,
            status=status,
            created_at=datetime.utcnow(),
        )
        self.db.add(reservation)
        return reservation

    def release_reservation(self, reservation_id: int) -> None:
        """予約を解放"""
        reservation = self.db.query(LotReservation).filter(
            LotReservation.id == reservation_id
        ).one()
        reservation.status = 'released'
        reservation.released_at = datetime.utcnow()

    def confirm_reservation(self, reservation_id: int) -> None:
        """予約を確定"""
        reservation = self.db.query(LotReservation).filter(
            LotReservation.id == reservation_id
        ).one()
        reservation.status = 'confirmed'
        reservation.confirmed_at = datetime.utcnow()

    def transfer_reservation(
        self,
        reservation_id: int,
        new_source_type: str,
        new_source_id: int,
    ) -> None:
        """予約を振替（Forecast → Order など）"""
        reservation = self.db.query(LotReservation).filter(
            LotReservation.id == reservation_id
        ).one()
        reservation.source_type = new_source_type
        reservation.source_id = new_source_id

    def _calculate_available(self, lot_id: int) -> Decimal:
        """利用可能数量を動的計算"""
        lot = self.db.query(Lot).filter(Lot.id == lot_id).one()

        reserved_sum = self.db.query(
            func.coalesce(func.sum(LotReservation.reserved_qty), 0)
        ).filter(
            LotReservation.lot_id == lot_id,
            LotReservation.status.in_(['active', 'confirmed']),
        ).scalar()

        return lot.current_quantity - reserved_sum
```

#### 引当確定ロジック

```python
# app/application/services/allocations/actions.py

async def commit_fefo_allocation(
    db: Session,
    order_line_id: int,
    allocation_plans: list[AllocationPlan],
) -> list[Allocation]:
    """FEFO引当を確定（単一トランザクション）"""

    allocations = []

    for plan in allocation_plans:
        lot = db.query(Lot).filter(Lot.id == plan.lot_id).with_for_update().one()

        # 1. lot_reservations 作成
        reservation = LotReservation(
            lot_id=lot.id,
            source_type='order',
            source_id=order_line_id,
            reserved_qty=plan.quantity,
            status='confirmed',
            confirmed_at=datetime.utcnow(),
        )
        db.add(reservation)

        # 2. allocations 作成（lot_reference で参照）
        allocation = Allocation(
            order_line_id=order_line_id,
            lot_reference=lot.lot_number,  # ビジネスキー
            allocated_quantity=plan.quantity,
            status='allocated',
            created_at=datetime.utcnow(),
        )
        db.add(allocation)

        allocations.append(allocation)

    # 3. 整合性チェック（コミット前）
    for plan in allocation_plans:
        available = calculate_available_qty(db, plan.lot_id)
        if available < 0:
            raise InsufficientStockError(...)

    return allocations
```

### 影響範囲とリスク

- **影響**: 引当・在庫管理のコアロジック全体
- **リスク**: 高
  - **対策**: 十分なテストカバレッジ、段階的な動作確認

### 完了判定条件

- [ ] `LotReservationService` が動作する
- [ ] 在庫計算が `lot_reservations` ベースで正しく動作する
- [ ] FEFO引当が新ロジックで動作する
- [ ] 手動引当が新ロジックで動作する
- [ ] Forecast引当が新ロジックで動作する
- [ ] Forecast → Order 振替が動作する
- [ ] すべてのテストがパス
- [ ] 不変条件（トランザクション整合性、非負制約）が遵守されている

---

## Step 3: API v2 導入

### 目的

- Context ごとのAPI プレフィックス分離
- 旧 v1 API の削除
- フロントエンドのAPI呼び出し更新

### 変更対象レイヤー

- **API層**: v2 ルーター作成、v1 削除
- **Frontend**: API呼び出し先の更新

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 3-1 | API v2 ルーター設計 | Context ごとのプレフィックス定義 |
| 3-2 | `/api/v2/lot/*` ルーター作成 | Lot Context API |
| 3-3 | `/api/v2/order/*` ルーター作成 | Order Context API |
| 3-4 | `/api/v2/allocation/*` ルーター作成 | Allocation Context API |
| 3-5 | `/api/v2/forecast/*` ルーター作成 | Forecast Context API |
| 3-6 | `/api/v2/inventory/*` ルーター作成 | Inventory Context API |
| 3-7 | Context Client インターフェース定義 | `LotContextClient`, `ForecastContextClient` |
| 3-8 | v1 API 削除 | 旧ルーター削除（後方互換不要） |
| 3-9 | フロントエンド API 更新 | 各 feature の `api.ts` を v2 エンドポイントに更新 |
| 3-10 | OpenAPI スキーマ更新 | `npm run typegen` で型再生成 |
| 3-11 | E2E テスト更新 | 新エンドポイントでのテスト |

### API 構造

```
/api/v2/
├── lot/
│   ├── GET    /                    # ロット一覧
│   ├── GET    /{id}                # ロット詳細
│   ├── POST   /                    # ロット登録
│   ├── GET    /available           # 利用可能ロット（FEFO順）
│   └── POST   /{id}/adjust         # 数量調整
│
├── order/
│   ├── GET    /                    # 受注一覧
│   ├── GET    /{id}                # 受注詳細
│   ├── POST   /                    # 受注登録
│   └── POST   /import              # 受注インポート
│
├── allocation/
│   ├── POST   /preview             # FEFO引当プレビュー
│   ├── POST   /commit              # 引当確定
│   ├── POST   /manual              # 手動引当
│   ├── DELETE /{id}                # 引当キャンセル
│   └── GET    /by-order/{order_id} # 受注の引当状況
│
├── forecast/
│   ├── GET    /                    # 予測一覧
│   ├── GET    /{id}                # 予測詳細
│   ├── POST   /import              # 予測インポート
│   └── GET    /grouped             # グループ化予測
│
├── inventory/
│   ├── GET    /                    # 在庫サマリ
│   ├── GET    /{product_id}/{warehouse_id}  # 特定在庫
│   └── GET    /stats               # 統計情報
│
└── reservation/                    # lot_reservations 専用（内部/デバッグ用）
    ├── GET    /                    # 予約一覧
    ├── GET    /by-lot/{lot_id}     # ロットの予約状況
    └── GET    /by-source/{type}/{id}  # ソース別予約
```

### Context Client インターフェース

```python
# app/infrastructure/clients/lot_client.py

from abc import ABC, abstractmethod

class LotContextClient(ABC):
    """Lot Context へのアクセスインターフェース"""

    @abstractmethod
    async def get_available_lots(
        self,
        product_id: int,
        warehouse_id: int,
        min_quantity: Decimal,
    ) -> list[LotCandidate]:
        """利用可能ロットを FEFO 順で取得"""
        pass

    @abstractmethod
    async def get_lot_by_reference(self, lot_reference: str) -> LotInfo:
        """lot_number からロット情報を取得"""
        pass


class InProcessLotClient(LotContextClient):
    """同一プロセス内での実装（現時点）"""

    def __init__(self, lot_service: LotService):
        self.lot_service = lot_service

    async def get_available_lots(self, ...):
        return await self.lot_service.get_available_lots(...)


# 将来的には HttpLotClient に置き換え可能
class HttpLotClient(LotContextClient):
    """HTTP 経由での実装（マイクロサービス化時）"""

    def __init__(self, base_url: str):
        self.base_url = base_url

    async def get_available_lots(self, ...):
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/available", ...)
            return [LotCandidate.from_dict(lot) for lot in response.json()]
```

### フロントエンド更新

```typescript
// frontend/src/features/allocation/api.ts

// 変更前
const BASE_URL = '/api/allocations';

// 変更後
const BASE_URL = '/api/v2/allocation';

export const allocationApi = {
  preview: (params: PreviewParams) =>
    httpClient.post(`${BASE_URL}/preview`, { json: params }),

  commit: (params: CommitParams) =>
    httpClient.post(`${BASE_URL}/commit`, { json: params }),

  // ...
};
```

### 影響範囲とリスク

- **影響**: API 構造全体、フロントエンド全体
- **リスク**: 中
  - **対策**: OpenAPI スキーマからの型生成で整合性担保

### 完了判定条件

- [ ] v2 API エンドポイントが全て動作する
- [ ] v1 API が削除されている
- [ ] フロントエンドが v2 API を使用している
- [ ] OpenAPI スキーマが更新されている
- [ ] E2E テストがパスする
- [ ] Context Client インターフェースが定義されている

---

## マイルストーン総括

### Step 完了時の状態

| Step | 完了時の状態 |
|------|-------------|
| **Step 1** | データモデルが新構造に移行完了。FK依存が排除。 |
| **Step 2** | ビジネスロジックが `lot_reservations` ベースで動作。不変条件が遵守されている。 |
| **Step 3** | Context 分離されたAPI構造。将来のマイクロサービス化への準備完了。 |

### 「ロットと受注が疎結合になった」と言えるタイミング

**Step 1 完了時点**

- `allocations.lot_id` FK が削除され、`lot_reference`（ビジネスキー）に移行
- Order & Allocation Context が Lot Context の内部IDに依存しなくなる

### 「Forecast/Inventory/Lot/Order&Allocation の境界が実質的に分離できた」と言えるタイミング

**Step 3 完了時点**

- 各 Context が独自の API プレフィックスを持つ
- Context 間は ビジネスキー参照 + Context Client で統合
- FK による直接参照が全て排除されている
- 物理的なサービス分離は行っていないが、論理的な境界が明確

### 将来の物理分離への道筋

Step 3 完了後、以下が可能になる：

1. `InProcessLotClient` → `HttpLotClient` に置き換え
2. 各 Context を独立したサービスとしてデプロイ
3. DB スキーマの物理分離

---

## リスクマトリクス

| Step | リスク | 影響度 | 対策 |
|------|--------|--------|------|
| 1 | **高** | データモデル全体変更 | 既存データ削除で単純化 |
| 2 | **高** | コアロジック変更 | 十分なテストカバレッジ |
| 3 | 中 | API構造変更 | OpenAPI型生成で整合性担保 |

---

## 付録: Step 間の依存関係

```
Step 1 ──→ Step 2 ──→ Step 3
  │           │
  │           └── 不変条件の遵守確認
  │
  └── DB構造が確定
```

**クリティカルパス**: Step 1（データモデル）→ Step 2（ロジック）

Step 1 と Step 2 は順序依存が強い。Step 3 は Step 2 完了後に独立して実行可能。

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2025-12-10 | 1.0.0 | 初版作成（9 Step 計画） |
| 2025-12-10 | 2.0.0 | 効率化版に改訂（3 Step 計画）。破壊的変更・データ削除を許容する前提で統合。 |
