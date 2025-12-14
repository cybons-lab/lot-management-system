# アプリ層 あら探しレポート

**作成日**: 2025-12-13
**対象**: lot-management-system v2.1 アプリケーション層
**前提**: 既決方針（FK正、lot削除しない、案C採用）を遵守

---

## 目次

1. [P0: 本番事故リスク](#p0-本番事故リスク)
2. [P1: 近い将来事故リスク](#p1-近い将来事故リスク)
3. [P2: 技術的負債](#p2-技術的負債)
4. [P3: 改善推奨](#p3-改善推奨)
5. [上位5件のまとめ](#上位5件のまとめ)
6. [推奨実行順](#推奨実行順)

---

## P0: 本番事故リスク

### 1. ロット物理削除の実装（既決方針違反）

**優先度**: P0
**影響範囲**: `backend/app/application/services/inventory/lot_service.py:542-549`

#### 症状
`LotService.delete_lot()` がロットを物理削除している。既決方針「lot は物理削除しない。誤りはマイナス/プラス調整で対応」に違反。

#### 再現/条件
`DELETE /api/inventory/lots/{lot_id}` APIを呼び出した場合。

#### 原因
```python
# lot_service.py:542-549
def delete_lot(self, lot_id: int) -> None:
    """Delete a lot."""
    db_lot = self.db.query(Lot).filter(Lot.id == lot_id).first()
    if not db_lot:
        raise LotNotFoundError(lot_id)

    self.db.delete(db_lot)  # ← 物理削除
    self.db.commit()
```

#### 修正案

**最小案**: APIルーターでエンドポイントを無効化
```python
# lots_router.py
@router.delete("/{lot_id}")
async def delete_lot(lot_id: int, ...):
    raise HTTPException(
        status_code=403,
        detail="ロットの削除は許可されていません。在庫調整を使用してください。"
    )
```

**理想案**: `delete_lot` メソッドを廃止し、代わりに `archive_lot` または `deactivate_lot` を実装。ステータスを `depleted` または `archived` に変更する。

#### 修正時の注意
- 既存のテストで `delete_lot` を呼び出しているものがあれば修正が必要
- API仕様変更となるため、フロントエンドの対応確認

---

### 2. トランザクション二重コミット

**優先度**: P0
**影響範囲**: `backend/app/application/services/allocations/cancel.py:133-138`

#### 症状
`cancel_allocations_for_order_line` で `db.commit()` が2回呼ばれている。2回目のコミット前に例外が発生した場合、1回目のコミット内容だけが反映され、データ不整合が発生する。

#### 再現/条件
受注明細の引当キャンセル中に、2回目のコミット前に例外が発生した場合。

#### 原因
```python
# cancel.py:127-138
if cancelled_ids:
    db.commit()  # ← 1回目のコミット

    line = db.get(OrderLine, order_line_id)
    if line:
        update_order_allocation_status(db, line.order_id)
        update_order_line_status(db, line.id)
        db.commit()  # ← 2回目のコミット（ここで失敗するとデータ不整合）
```

#### 修正案

**最小案**: 単一トランザクションに統合
```python
if cancelled_ids:
    line = db.get(OrderLine, order_line_id)
    if line:
        update_order_allocation_status(db, line.order_id)
        update_order_line_status(db, line.id)
    db.commit()  # 1回だけコミット
```

**理想案**: `flush()` を使用し、最終的な `commit()` は1回のみ

#### 修正時の注意
- 部分コミットに依存しているロジックがないか確認

---

### 3. order_service のステータスフィルタ二重適用

**優先度**: P0
**影響範囲**: `backend/app/application/services/orders/order_service.py:62-63`

#### 症状
同じステータスフィルタが2回適用されており、コピペミスと推測される。現時点では実害はないが、将来の修正で片方だけ変更した場合にバグになる。

#### 再現/条件
`OrderService.get_orders()` でステータスフィルタを使用した場合。

#### 原因
```python
# order_service.py:61-64
if status:
    stmt = stmt.where(Order.status == status)
if status:  # ← 同じ条件が2回
    stmt = stmt.where(Order.status == status)
```

#### 修正案
重複行を削除。

#### 修正時の注意
- なし

---

### 4. order_service の flush 二重呼び出し

**優先度**: P0（潜在的）
**影響範囲**: `backend/app/application/services/orders/order_service.py:288-289`

#### 症状
`cancel_order` メソッドで `db.flush()` が2回連続で呼ばれている。これも明らかなコピペミス。

#### 再現/条件
```python
# order_service.py:288-289
self.db.flush()
self.db.flush()  # ← 冗長
```

#### 修正案
重複行を削除。

---

## P1: 近い将来事故リスク

### 5. プレビュー/確定間の在庫競合

**優先度**: P1
**影響範囲**:
- `backend/app/application/services/allocations/fefo.py`
- `backend/app/application/services/allocations/commit.py`

#### 症状
FEFO引当のプレビュー（`preview_fefo_allocation`）と確定（`commit_fefo_allocation`）が別トランザクションで実行される。プレビュー後、確定前に別ユーザーが同じロットから引当/出庫すると、確定時に在庫不足エラーが発生する。

#### 再現/条件
1. ユーザーAが受注に対してFEFOプレビューを実行
2. ユーザーBが同じロットから出庫を実行
3. ユーザーAがプレビュー結果を確定しようとすると失敗

#### 原因
- プレビュー時点でロットをロックしていない
- 確定時に再計算せず、プレビュー結果をそのまま使用

```python
# commit.py:139-144
def commit_fefo_allocation(db: Session, order_id: int) -> FefoCommitResult:
    # ...
    preview = preview_fefo_allocation(db, order_id)  # ← プレビューを再実行
    # ↑ 問題: previewにはロックがないため、確定前に在庫が変わる可能性
```

#### 修正案

**最小案**: 確定時の在庫不足をユーザーに分かりやすくエラー表示
```python
except AllocationCommitError as e:
    if "Insufficient stock" in str(e):
        raise HTTPException(
            status_code=409,
            detail="在庫状況が変更されました。プレビューを再実行してください。"
        )
```

**理想案**: Optimistic Locking を実装。プレビュー時にロットの `updated_at` を記録し、確定時にバージョンチェック。

#### 修正時の注意
- UXへの影響を考慮（エラー時の再試行フロー）

---

### 6. イベント発行のタイミング問題

**優先度**: P1
**影響範囲**:
- `backend/app/application/services/allocations/confirm.py:160-167`
- `backend/app/application/services/inventory/lot_service.py:673-682`
- `backend/app/application/services/inventory/withdrawal_service.py:221-229`

#### 症状
ドメインイベント（`AllocationConfirmedEvent`, `StockChangedEvent`）がDBコミット後に発行される。イベントハンドラーでの処理失敗がDBにロールバックされない。

#### 再現/条件
コミット成功後、イベントハンドラーでエラーが発生した場合。

#### 原因
```python
# confirm.py:154-167
if commit_db:
    db.commit()
    db.refresh(allocation)
    # ...
    event = AllocationConfirmedEvent(...)
    EventDispatcher.queue(event)  # ← コミット後に発行
```

#### 修正案

**最小案**: イベントハンドラーは冪等（idempotent）に実装し、失敗しても再試行可能に

**理想案**: Outbox Pattern を実装。イベントをDBに保存してから非同期で処理。

```python
# Transaction内でイベントをDBに記録
db.add(DomainEventLog(event_type="AllocationConfirmed", payload={...}))
db.commit()
# 別プロセスでイベントを処理
```

#### 修正時の注意
- 現時点でイベントハンドラーが何をしているか確認が必要
- 推測: `EventDispatcher._handlers` が空の可能性あり（影響は限定的）

---

### 7. 非推奨 datetime.utcnow() の使用

**優先度**: P1
**影響範囲**: 複数ファイル（commit.py, confirm.py, cancel.py, manual.py, preempt.py, withdrawal_service.py, lot_service.py）

#### 症状
Python 3.12+では `datetime.utcnow()` が非推奨。タイムゾーン情報がなく、将来的にエラーになる可能性。

#### 再現/条件
Python 3.12以降でDeprecation Warningが発生。Python 3.14（予定）で削除される可能性。

#### 原因
```python
# 複数箇所で使用
reservation.created_at = datetime.utcnow()
lot.updated_at = datetime.utcnow()
```

#### 修正案
```python
from datetime import datetime, timezone

# Before
datetime.utcnow()

# After
datetime.now(timezone.utc)
```

#### 修正時の注意
- `datetime.now()` との混在がある箇所も注意（withdrawal_service.py:200, 214）

---

### 8. 楽観的ロック未実装

**優先度**: P1
**影響範囲**:
- `backend/app/application/services/allocations/preempt.py`
- `backend/app/infrastructure/persistence/models/orders_models.py`

#### 症状
同時に複数ユーザーが同じデータを更新した場合、「後勝ち」となり、先に更新したユーザーの変更が失われる。

#### 再現/条件
1. ユーザーAが受注明細を表示
2. ユーザーBが同じ明細を編集・保存
3. ユーザーAが古いデータを元に編集・保存 → Bの変更が失われる

#### 原因
モデルに `version` カラムや `updated_at` チェックがない。

#### 修正案

**理想案**: SQLAlchemy の `version_id_col` を使用
```python
class Order(Base):
    __tablename__ = "orders"

    version = Column(Integer, nullable=False, default=1)
    __mapper_args__ = {"version_id_col": version}
```

#### 修正時の注意
- マイグレーションが必要
- APIリクエストで `version` を受け取る必要

---

## P2: 技術的負債

### 9. Raw SQLクエリの使用

**優先度**: P2
**影響範囲**: `backend/app/application/services/orders/order_service.py:301-314, 343-355`

#### 症状
ビュー（`v_order_line_details`）を直接 raw SQL で叩いている。SQLインジェクションのリスクは低い（パラメータ化されている）が、保守性が悪い。

#### 原因
```python
# order_service.py:301-308
query = """
    SELECT
        order_id, line_id,
        supplier_name,
        ...
    FROM v_order_line_details
    WHERE order_id IN :order_ids
"""
rows = self.db.execute(text(query), {"order_ids": tuple(order_ids)}).fetchall()
```

#### 修正案
SQLAlchemy モデル（VOrderLineDetails）を使用してORM経由でクエリ。

---

### 10. 非推奨メソッドの残存

**優先度**: P2
**影響範囲**: `backend/app/infrastructure/persistence/repositories/allocation_repository.py:165-183`

#### 症状
`update_lot_allocated_quantity` が `DEPRECATED` としてマークされているが、コード内に残っている。

#### 原因
```python
# allocation_repository.py:165-183
def update_lot_allocated_quantity(self, lot_id: int, allocated_delta: float) -> None:
    """...
    DEPRECATED: This method is deprecated. Use LotReservation instead.
    """
    warnings.warn(...)
    pass  # No-op
```

#### 修正案
呼び出し元を確認し、使用されていなければ削除。

---

### 11. フロントエンドのv1/v2 API混在

**優先度**: P2
**影響範囲**: `frontend/src/features/allocations/api.ts`

#### 症状
v1 API（`allocations`）とv2 API（`v2/allocation`）が混在。レガシーコードが残っている。

#### 原因
```typescript
// api.ts:140-148 (v1 Legacy)
export async function createAllocations(payload: CreateAllocationPayload): Promise<AllocationResult> {
  await http.post("allocations", payload);
  return { order_id: payload.order_line_id };
}

// api.ts:338-340 (v2)
export const createManualAllocationSuggestion = (data: ManualAllocationRequest) => {
  return http.post<ManualAllocationResponse>("v2/allocation/manual", data);
};
```

#### 修正案
v1 APIを使用している箇所を特定し、v2に移行後、レガシーコードを削除。

---

### 12. Allocation Repositoryのステータス不一致

**優先度**: P2
**影響範囲**: `backend/app/infrastructure/persistence/repositories/allocation_repository.py:65`

#### 症状
`find_active_by_lot_id` で `status == "reserved"` を検索しているが、他の箇所（services）では `status == "allocated"` を使用。

#### 原因
```python
# allocation_repository.py:63-68
def find_active_by_lot_id(self, lot_id: int) -> list[Allocation]:
    stmt = (
        select(Allocation)
        .where(Allocation.lot_id == lot_id, Allocation.status == "reserved")  # ← "reserved"
        ...
    )
```

```python
# manual.py:104
allocation = Allocation(
    ...
    status="allocated",  # ← "allocated"
)
```

#### 修正案
ステータス値をEnumで統一し、一貫性を確保。

---

### 13. N+1クエリのリスク

**優先度**: P2
**影響範囲**: `backend/app/application/services/inventory/lot_service.py:117-120`

#### 症状
`find_available_lots` で取得したロットに対して、ループ内で `get_available_quantity` を呼び出している。ロット数が多い場合、N+1問題が発生する可能性。

#### 原因
```python
# lot_service.py:117-120
available_lots = [
    lot for lot in lots if float(get_available_quantity(self.db, lot)) > min_quantity
]
```

#### 修正案
バルクで予約数量を取得するクエリを実装。

```python
# 一括で lot_reservations を集計
reservation_sums = (
    db.query(LotReservation.lot_id, func.sum(LotReservation.reserved_qty))
    .filter(LotReservation.lot_id.in_([l.id for l in lots]))
    .filter(LotReservation.status == 'active')
    .group_by(LotReservation.lot_id)
    .all()
)
```

---

### 14. テスト不足エリア

**優先度**: P2
**影響範囲**: 複数

#### 症状
以下のシナリオのテストが不足している可能性：
- 同時実行（競合）テスト
- 境界条件（0数量、負数、最大値）
- ソフト引当→ハード引当の部分確定
- プリエンプション（横取り）のエッジケース

#### 検証手順
```bash
# テストカバレッジを確認
docker compose exec backend pytest --cov=app --cov-report=html
```

---

## P3: 改善推奨

### 15. EventDispatcherのシングルトン問題

**優先度**: P3
**影響範囲**: `backend/app/domain/events/dispatcher.py`

#### 症状
`EventDispatcher` がクラス変数でハンドラーとイベントキューを管理。テスト間での状態共有が発生する可能性。

#### 原因
```python
class EventDispatcher:
    _handlers: dict[type[DomainEvent], list[EventHandler]] = defaultdict(list)  # クラス変数
    _pending_events: list[DomainEvent] = []  # クラス変数
```

#### 修正案
テスト時に `clear_handlers()` と `clear_pending()` を確実に呼び出すフィクスチャを追加。

---

### 16. ロギング一貫性

**優先度**: P3
**影響範囲**: 複数サービス

#### 症状
一部のサービスで例外発生時のログ出力が不足。トラブルシューティング時に情報が足りない可能性。

#### 修正案
各サービスメソッドの入口/出口でログ出力を追加。

---

### 17. 型ヒントの不完全性

**優先度**: P3
**影響範囲**: 複数ファイル

#### 症状
一部の関数で戻り値の型ヒントが `Any` または未指定。

#### 修正案
mypy/pyrightでチェックし、型ヒントを追加。

---

### 18. フロントエンドのエラーハンドリング

**優先度**: P3
**影響範囲**: `frontend/src/features/allocations/api.ts`

#### 症状
`saveManualAllocations` で `Promise.all` を使用しているが、1つでも失敗すると全体が失敗扱いになる。部分成功の扱いが不明確。

#### 原因
```typescript
// api.ts:377-385
const promises = data.allocations.map((a) =>
  createManualAllocationSuggestion({...})
);
const results = await Promise.all(promises);  // ← 1つでも失敗すると全体失敗
```

#### 修正案
`Promise.allSettled` を使用し、部分成功/失敗を処理。

---

## 上位5件のまとめ

| 順位 | 問題 | 優先度 | 概要 |
|------|------|--------|------|
| 1 | ロット物理削除 | P0 | 既決方針違反。本番でロット削除されると履歴追跡不可 |
| 2 | トランザクション二重コミット | P0 | データ不整合リスク |
| 3 | ステータスフィルタ二重適用 | P0 | 明らかなバグ（現時点では実害なし） |
| 4 | プレビュー/確定間の競合 | P1 | マルチユーザー環境で在庫不足エラー発生 |
| 5 | datetime.utcnow() | P1 | Python 3.12+で非推奨警告、将来的にエラー |

---

## 推奨実行順

### フェーズ1: 緊急対応（1-2日）

1. **ロット削除APIの無効化**（P0-1）
   - `lots_router.py` で DELETE エンドポイントを 403 返却に変更
   - 工数: 0.5日

2. **トランザクション二重コミット修正**（P0-2）
   - `cancel.py` のコミット統合
   - 工数: 0.5日

3. **コピペミス修正**（P0-3, P0-4）
   - `order_service.py` の重複行削除
   - 工数: 0.25日

### フェーズ2: 短期対応（1週間）

4. **datetime.utcnow() 置換**（P1-7）
   - 全ファイルで `datetime.now(timezone.utc)` に置換
   - 工数: 1日

5. **プレビュー/確定エラーハンドリング改善**（P1-5）
   - ユーザーフレンドリーなエラーメッセージ追加
   - 工数: 1日

6. **ステータス値の統一**（P2-12）
   - Enum 定義と使用箇所の整合性確認
   - 工数: 1日

### フェーズ3: 中期対応（2-4週間）

7. **N+1クエリ最適化**（P2-13）
   - バルククエリの実装
   - 工数: 2日

8. **フロントエンドv1 API廃止**（P2-11）
   - v2への移行とレガシーコード削除
   - 工数: 3日

9. **楽観的ロック実装**（P1-8）
   - マイグレーション + API修正
   - 工数: 5日

---

## 参考: 確認したファイル一覧

### バックエンド

- `backend/app/application/services/allocations/` (全ファイル)
- `backend/app/application/services/inventory/lot_service.py`
- `backend/app/application/services/inventory/withdrawal_service.py`
- `backend/app/application/services/orders/order_service.py`
- `backend/app/domain/events/dispatcher.py`
- `backend/app/domain/allocation/exceptions.py`
- `backend/app/presentation/api/v2/allocation/router.py`
- `backend/app/infrastructure/persistence/repositories/allocation_repository.py`
- `backend/app/core/errors.py`
- `backend/sql/views/create_views.sql`

### フロントエンド

- `frontend/src/features/allocations/api.ts`
- `frontend/src/shared/api/http-client.ts`

### テスト

- `backend/tests/` (ディレクトリ構造確認)
