# モノリシックシステム疎結合化 作業計画書

> **Version:** 1.0.0
> **作成日:** 2025-12-10
> **ステータス:** Draft - レビュー待ち

---

## 目次

1. [概要](#1-概要)
2. [前提条件](#2-前提条件)
3. [Step 1: lot_reservations テーブルの導入](#step-1-lot_reservations-テーブルの導入基盤整備)
4. [Step 2: 在庫計算の lot_reservations 対応](#step-2-在庫計算の-lot_reservations-対応)
5. [Step 3: 引当確定ロジックの lot_reservations 統合](#step-3-引当確定ロジックの-lot_reservations-統合)
6. [Step 4: Forecast/手動引当の lot_reservations 統合](#step-4-forecast手動引当の-lot_reservations-統合)
7. [Step 5: lots.allocated_quantity の廃止](#step-5-lotsallocated_quantity-の廃止)
8. [Step 6: FK参照のビジネスキー化（Order & Allocation Context分離準備）](#step-6-fk参照のビジネスキー化order--allocation-context分離準備)
9. [Step 7: Forecast参照のビジネスキー化](#step-7-forecast参照のビジネスキー化)
10. [Step 8: API v2 導入とContext分離](#step-8-api-v2-導入とcontext分離)
11. [Step 9: 旧構造のクリーンアップ](#step-9-旧構造のクリーンアップ)
12. [マイルストーン総括](#マイルストーン総括)
13. [リスクマトリクス](#リスクマトリクス)

---

## 1. 概要

### 1.1 目的

本計画書は、現在同一DB内で動作しているモノリシックなロット管理システムを、**最小限のリスクで疎結合化**していくための段階的な作業計画を定義する。

### 1.2 関連ドキュメント

| ドキュメント | 説明 |
|-------------|------|
| [bounded-contexts-separation.md](./bounded-contexts-separation.md) | 最終的なアーキテクチャのゴール |
| [system_invariants.md](./system_invariants.md) | 絶対に壊してはいけない不変条件 |

### 1.3 スコープ

- **対象**: バックエンドのAPI・サービス層・データモデル
- **対象外**: フロントエンドの大幅な変更（APIは後方互換を維持）
- **前提**: 物理DB分割やマイクロサービス化は行わない（論理分離のみ）

---

## 2. 前提条件

### 2.1 現状分析

| 項目 | 状態 |
|-----|------|
| `lot_reservations` テーブル | **存在しない**（新規作成必要） |
| `allocations.lot_id` | 直接FK参照（→ `lot_reference` に移行必要） |
| `order_lines.forecast_id` | 直接FK参照（→ `forecast_reference` に移行必要） |
| `lots.allocated_quantity` | サービス層で直接更新（→ `lot_reservations` 経由に変更必要） |
| サービス層 | Feature-based で14パッケージに分離済み（良好な基盤） |

### 2.2 不変条件（絶対に壊さない）

以下は `system_invariants.md` で定義された不変条件であり、全Stepで遵守する：

1. **トランザクション整合性**: 引当確定時は `lot残量` / `lot_reservations` / `allocations` を**同一トランザクション**で更新
2. **動的計算**: 在庫はスナップショットを持たず**動的計算**で求める
3. **非負制約**: ロット残量は **0未満禁止**（DB制約 + ロジック両方で担保）
4. **予約統一**: すべてのロット押さえは **`lot_reservations` を通じて表現**
5. **並行制御**: 同一ロットへの同時引当は「早い者勝ち」（DBトランザクションで整合性担保）

---

## Step 1: lot_reservations テーブルの導入（基盤整備）

### 目的

- `lot_reservations` テーブルを新設し、ロット予約の統一モデルを確立する
- 既存フローには**まだ手を出さない**（並行運用可能な状態を作る）

### 変更対象レイヤー

- **DB**: 新規テーブル作成
- **Model層**: 新規モデル定義
- **Repository層**: 新規リポジトリ作成
- **Service層**: 新規 `LotReservationService` 作成（既存サービスは変更しない）

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 1-1 | `lot_reservations` テーブル設計 | `id`, `lot_id`, `source_type`, `source_id`, `reserved_qty`, `status`, `created_at`, `expires_at` |
| 1-2 | Alembic マイグレーション作成 | テーブル作成、CHECK制約（`reserved_qty > 0`）、インデックス |
| 1-3 | `LotReservation` モデル定義 | `app/infrastructure/persistence/models/lot_reservation_models.py` |
| 1-4 | `LotReservationRepository` 作成 | CRUD + `get_active_by_lot()`, `get_by_source()` |
| 1-5 | `LotReservationService` 作成 | `create_reservation()`, `release_reservation()`, `confirm_reservation()` |
| 1-6 | DB制約追加 | `lots` テーブルに `available_qty >= 0` の CHECK制約（トリガー or Generated Column） |
| 1-7 | 単体テスト作成 | Service/Repository のテスト |

### テーブル定義案

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

### 影響範囲とリスク

- **影響**: 新規追加のみ、既存コードへの影響なし
- **リスク**: 低（既存フローは一切変更しない）

### このStepで絶対に手を出さないもの

- 既存の `allocations` テーブル構造
- 既存の引当ロジック（`actions.py`, `allocator.py`）
- 既存の `lots.allocated_quantity` 更新処理
- フロントエンド

### 完了判定条件

- [ ] `lot_reservations` テーブルが作成され、マイグレーションが適用済み
- [ ] `LotReservationService` で予約の作成・解放・確定ができる
- [ ] 単体テストが全てパス
- [ ] 既存の引当フロー（`POST /allocations/commit` など）が**変わらず動作する**

---

## Step 2: 在庫計算の lot_reservations 対応

### 目的

- 在庫の「利用可能数量」計算を `lot_reservations` ベースに移行
- `lots.allocated_quantity` への直接更新を段階的に廃止する準備

### 変更対象レイヤー

- **Service層**: `InventoryService`, `LotService` の在庫計算ロジック
- **Domain層**: 在庫計算ドメインロジック
- **API層**: 在庫取得APIのレスポンス拡張

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 2-1 | 在庫計算ロジック抽出 | 現在の `lots.current_quantity - allocated_quantity` 計算箇所を特定 |
| 2-2 | 動的計算関数作成 | `calculate_available_qty(lot_id)` = `current_qty - SUM(active reservations)` |
| 2-3 | `LotService` 更新 | 利用可能数量を動的計算で返すように変更 |
| 2-4 | FEFO候補取得の更新 | `search.py` の候補ロット取得を動的計算ベースに |
| 2-5 | APIレスポンス拡張 | `GET /lots` で `available_qty`（動的計算）と `reserved_qty` を返す |
| 2-6 | 並行運用対応 | 旧方式（`allocated_quantity`）と新方式（`lot_reservations`）の両方で計算し、差分をログ出力 |
| 2-7 | 結合テスト作成 | 在庫計算の整合性テスト |

### 影響範囲とリスク

- **影響**: 在庫計算ロジックの内部実装変更
- **リスク**: 中（計算結果が変わる可能性）
  - **対策**: 並行運用期間を設け、旧/新の計算結果を比較ログ出力

### このStepで絶対に手を出さないもの

- 既存の引当確定ロジック（まだ `lots.allocated_quantity` を更新する）
- `allocations` テーブル構造
- フロントエンド

### 完了判定条件

- [ ] `GET /lots` で `available_qty` が動的計算で返される
- [ ] FEFO候補取得が動的計算ベースで動作する
- [ ] 並行運用ログで旧/新の計算結果が一致することを確認
- [ ] 既存の引当フローが変わらず動作する

---

## Step 3: 引当確定ロジックの lot_reservations 統合

### 目的

- 引当確定時に `lot_reservations` を同時に作成/更新する
- **不変条件1**（同一トランザクション）を維持しつつ移行

### 変更対象レイヤー

- **Service層**: `allocations/actions.py` の引当確定ロジック
- **Domain層**: 引当ドメインロジック

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 3-1 | `commit_fefo_allocation` 改修 | 引当確定時に `lot_reservations` を `status='confirmed'` で作成 |
| 3-2 | `allocate_manually` 改修 | 手動引当時も `lot_reservations` を作成 |
| 3-3 | トランザクション境界確認 | `lot`, `lot_reservations`, `allocations` が同一トランザクション内であることを確認 |
| 3-4 | 解放ロジック追加 | `cancel_allocation` 時に `lot_reservations.status = 'released'` に更新 |
| 3-5 | 二重引当防止 | `lot_reservations` の合計が `current_qty` を超えないようチェック |
| 3-6 | エラーハンドリング | ロット残量が負になる場合は例外を投げてロールバック |
| 3-7 | 結合テスト | 引当確定→在庫計算の整合性テスト |

### 実装イメージ

```python
# allocations/actions.py
async def commit_fefo_allocation(db: Session, order_line_id: int, ...):
    async with db.begin():  # 単一トランザクション
        # 1. lot_reservations 作成（source_type='order'）
        reservation = LotReservation(
            lot_id=lot.id,
            source_type='order',
            source_id=order_line_id,
            reserved_qty=allocated_qty,
            status='confirmed',
            confirmed_at=datetime.utcnow(),
        )
        db.add(reservation)

        # 2. lots.allocated_quantity 更新（並行運用期間中は両方更新）
        lot.allocated_quantity += allocated_qty

        # 3. allocations 作成
        allocation = Allocation(
            order_line_id=order_line_id,
            lot_id=lot.id,
            allocated_quantity=allocated_qty,
            status='allocated',
        )
        db.add(allocation)

        # 4. 整合性チェック（available_qty >= 0）
        available = lot.current_quantity - sum_active_reservations(lot.id)
        if available < 0:
            raise InsufficientStockError(...)
```

### 影響範囲とリスク

- **影響**: 引当確定の中核ロジック変更
- **リスク**: 高
  - **対策**:
    - 並行運用（`lots.allocated_quantity` も引き続き更新）
    - 詳細なログ出力
    - ロールバック可能なマイグレーション

### このStepで絶対に手を出さないもの

- `allocations.lot_id` のFK構造（まだ変更しない）
- `order_lines.forecast_id` のFK構造
- フロントエンド
- Forecast由来の引当（次Stepで対応）

### 完了判定条件

- [ ] 引当確定時に `lot_reservations` レコードが作成される
- [ ] 引当キャンセル時に `lot_reservations.status = 'released'` になる
- [ ] 同一トランザクション内で `lots`, `lot_reservations`, `allocations` が更新される
- [ ] ロット残量が負になる引当はエラーで拒否される
- [ ] 既存のAPIコントラクトが維持される

---

## Step 4: Forecast/手動引当の lot_reservations 統合

### 目的

- Forecast由来・手動引当でも `lot_reservations` を使用
- **不変条件4**（すべてのロット押さえは lot_reservations を通す）を達成

### 変更対象レイヤー

- **Service層**: `allocations/allocator.py`, `suggestion.py`
- **DB**: `allocation_suggestions` テーブルの扱い見直し

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 4-1 | Forecast引当の調査 | 現在の `allocate_soft_for_forecast` の動作確認 |
| 4-2 | Forecast引当改修 | `source_type='forecast'` で `lot_reservations` を作成 |
| 4-3 | 手動引当改修 | `source_type='manual'` で `lot_reservations` を作成 |
| 4-4 | 引当振替ロジック | Forecast→Order への振替時に `lot_reservations.source_type` を更新 |
| 4-5 | `allocation_suggestions` 統合検討 | `lot_reservations` で代替可能か評価 |
| 4-6 | 結合テスト | Forecast→Order振替の整合性テスト |

### 影響範囲とリスク

- **影響**: Forecast引当フロー全体
- **リスク**: 中
  - **対策**: Forecast引当は「提案」として表示されることが多いため、まず `status='temporary'` で作成し、確定時に `status='active'` に変更

### このStepで絶対に手を出さないもの

- `allocations.lot_id` のFK構造
- `order_lines.forecast_id` のFK構造
- フロントエンド

### 完了判定条件

- [ ] Forecast引当時に `lot_reservations(source_type='forecast')` が作成される
- [ ] 手動引当時に `lot_reservations(source_type='manual')` が作成される
- [ ] Forecast→Order振替で `source_type` と `source_id` が正しく更新される
- [ ] すべてのロット押さえが `lot_reservations` で表現されている

---

## Step 5: lots.allocated_quantity の廃止

### 目的

- `lots.allocated_quantity` の直接更新を完全に廃止
- 在庫計算を `lot_reservations` ベースに一本化

### 変更対象レイヤー

- **Service層**: 全ての `lots.allocated_quantity` 更新箇所
- **DB**: カラム削除（または deprecation）

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 5-1 | 更新箇所の全数調査 | `lots.allocated_quantity` を更新している全箇所を特定 |
| 5-2 | 更新処理の削除 | 各箇所から `allocated_quantity` 更新を削除 |
| 5-3 | 整合性検証 | 旧/新の計算結果が一致することを本番相当データで確認 |
| 5-4 | カラム deprecation | `allocated_quantity` カラムを nullable に変更（削除は次Step） |
| 5-5 | 回帰テスト | 全引当フローの結合テスト |

### 影響範囲とリスク

- **影響**: 在庫計算の根本的な変更
- **リスク**: 高
  - **対策**:
    - Step 2-4 で並行運用期間を十分に設ける
    - 本番データでの検証
    - ロールバック手順の準備

### このStepで絶対に手を出さないもの

- `allocations.lot_id` のFK構造
- `order_lines.forecast_id` のFK構造
- フロントエンド

### 完了判定条件

- [ ] `lots.allocated_quantity` への更新処理が全て削除されている
- [ ] 在庫計算が `lot_reservations` ベースで正しく動作する
- [ ] 全引当フローのテストがパス
- [ ] 本番相当データでの検証が完了

---

## Step 6: FK参照のビジネスキー化（Order & Allocation Context分離準備）

### 目的

- `allocations.lot_id` → `allocations.lot_reference`（ビジネスキー）への移行
- Context間の直接FK参照を排除する準備

### 変更対象レイヤー

- **DB**: `allocations` テーブル構造変更
- **Model層**: `Allocation` モデル更新
- **Service層**: 引当ロジックの参照方法変更
- **API層**: レスポンス形式の調整

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 6-1 | `lot_reference` カラム追加 | `allocations.lot_reference VARCHAR(50)` 追加 |
| 6-2 | 既存データ移行 | `UPDATE allocations SET lot_reference = (SELECT lot_number FROM lots WHERE id = lot_id)` |
| 6-3 | 引当ロジック更新 | `lot_id` ではなく `lot_reference` で参照するように変更 |
| 6-4 | API更新 | `lot_id` と `lot_reference` の両方を返す（並行運用） |
| 6-5 | FK削除 | `allocations.lot_id` FK制約を削除、カラムを nullable に |
| 6-6 | 結合テスト | 引当→ロット参照の整合性テスト |

### 影響範囲とリスク

- **影響**: `allocations` テーブルの参照方法変更
- **リスク**: 中
  - **対策**:
    - `lot_id` と `lot_reference` の並行運用期間を設ける
    - ACL（Anti-Corruption Layer）で `lot_reference` → `lot_id` の変換を提供

### このStepで絶対に手を出さないもの

- `order_lines.forecast_id` のFK構造（次Stepで対応）
- フロントエンドの大幅変更
- Context間のAPI分離（まだ同一アプリ内）

### 完了判定条件

- [ ] `allocations.lot_reference` が全レコードに設定されている
- [ ] 引当ロジックが `lot_reference` で動作する
- [ ] `allocations.lot_id` FKが削除されている
- [ ] APIが `lot_reference` を返す

---

## Step 7: Forecast参照のビジネスキー化

### 目的

- `order_lines.forecast_id` → `order_lines.forecast_reference` への移行
- Order Context と Forecast Context の疎結合化

### 変更対象レイヤー

- **DB**: `order_lines` テーブル構造変更
- **Model層**: `OrderLine` モデル更新
- **Service層**: 受注-予測紐づけロジック変更
- **API層**: レスポンス形式の調整

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 7-1 | Forecast のビジネスキー設計 | `forecast_reference` の形式決定（例: `FCST-{customer}-{product}-{period}`） |
| 7-2 | `forecast_reference` カラム追加 | `order_lines.forecast_reference VARCHAR(100)` 追加 |
| 7-3 | 既存データ移行 | 既存の `forecast_id` から `forecast_reference` を生成 |
| 7-4 | 紐づけロジック更新 | `forecast_id` ではなく `forecast_reference` で紐づけ |
| 7-5 | API更新 | `forecast_id` と `forecast_reference` の両方を返す |
| 7-6 | FK削除 | `order_lines.forecast_id` FK制約を削除 |

### 影響範囲とリスク

- **影響**: 受注-予測紐づけの参照方法変更
- **リスク**: 中
  - **対策**: 並行運用期間を設ける

### このStepで絶対に手を出さないもの

- フロントエンドの大幅変更
- Context間のAPI分離（まだ同一アプリ内）

### 完了判定条件

- [ ] `order_lines.forecast_reference` が全レコードに設定されている
- [ ] 紐づけロジックが `forecast_reference` で動作する
- [ ] `order_lines.forecast_id` FKが削除されている

---

## Step 8: API v2 導入とContext分離

### 目的

- Context ごとのAPI プレフィックス分離
- 将来のマイクロサービス化への準備

### 変更対象レイヤー

- **API層**: v2 エンドポイント追加
- **Service層**: Context Client インターフェース導入

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 8-1 | API v2 ルーター設計 | `/api/v2/forecast/*`, `/api/v2/lot/*`, `/api/v2/order/*`, `/api/v2/allocation/*`, `/api/v2/inventory/*` |
| 8-2 | Context Client インターフェース | `LotContextClient`, `ForecastContextClient` の抽象定義 |
| 8-3 | 同一プロセス実装 | 現時点では HTTP 呼び出しではなく直接呼び出し |
| 8-4 | v1 → v2 プロキシ | v1 API を v2 経由で動作させる |
| 8-5 | APIドキュメント更新 | OpenAPI 定義の更新 |

### 影響範囲とリスク

- **影響**: API構造の変更
- **リスク**: 低（v1 は並行運用で維持）

### このStepで絶対に手を出さないもの

- フロントエンドの大幅変更（v1 API を引き続き使用可）
- 物理的なサービス分離

### 完了判定条件

- [ ] v2 API エンドポイントが動作する
- [ ] v1 API が v2 経由で動作する
- [ ] Context Client インターフェースが定義されている

---

## Step 9: 旧構造のクリーンアップ

### 目的

- 不要になったカラム・FK・コードの削除
- コードベースの整理

### 変更対象レイヤー

- **DB**: 不要カラム削除
- **Model層**: 不要フィールド削除
- **Service層**: 旧ロジック削除
- **API層**: v1 API の deprecation

### タスク一覧

| # | タスク | 詳細 |
|---|--------|------|
| 9-1 | `lots.allocated_quantity` カラム削除 | マイグレーションで完全削除 |
| 9-2 | `allocations.lot_id` カラム削除 | マイグレーションで完全削除 |
| 9-3 | `order_lines.forecast_id` カラム削除 | マイグレーションで完全削除 |
| 9-4 | 旧ロジック削除 | `allocated_quantity` 関連のコード削除 |
| 9-5 | v1 API deprecation 警告 | v1 API にdeprecation ヘッダー追加 |
| 9-6 | ドキュメント更新 | 新構造のドキュメント整備 |

### 影響範囲とリスク

- **影響**: 旧構造に依存するコードが動作しなくなる
- **リスク**: 中
  - **対策**: Step 1-8 で十分な並行運用期間を設ける

### このStepで絶対に手を出さないもの

- v1 API の完全削除（deprecation のみ）

### 完了判定条件

- [ ] 不要カラムが全て削除されている
- [ ] 旧ロジックが全て削除されている
- [ ] 全テストがパス
- [ ] ドキュメントが更新されている

---

## マイルストーン総括

### 「ロットと受注が疎結合になった」と言えるタイミング

**Step 6 完了時点**

- `allocations.lot_id` FK が削除され、`lot_reference`（ビジネスキー）での参照に移行
- ロットの押さえが `lot_reservations` で統一管理される
- Order & Allocation Context が Lot Context の内部IDに依存しなくなる

### 「Forecast/Inventory/Lot/Order&Allocation の境界が実質的に分離できた」と言えるタイミング

**Step 8 完了時点**

- 各 Context が独自の API プレフィックスを持つ
- Context 間は ビジネスキー参照 + Context Client で統合
- FK による直接参照が全て排除されている
- 物理的なサービス分離は行っていないが、論理的な境界が明確

### 将来の物理分離への道筋

Step 8 完了後、以下が可能になる：

1. Context Client を HTTP クライアントに置き換え
2. 各 Context を独立したサービスとしてデプロイ
3. DB スキーマの物理分離

---

## リスクマトリクス

| Step | リスク | 影響度 | 対策 |
|------|--------|--------|------|
| 1 | 低 | 新規追加のみ | - |
| 2 | 中 | 在庫計算変更 | 並行運用・比較ログ |
| 3 | **高** | 引当確定ロジック変更 | 詳細ログ・ロールバック準備 |
| 4 | 中 | Forecast引当変更 | temporary status で段階移行 |
| 5 | **高** | allocated_quantity 廃止 | 十分な並行運用期間 |
| 6 | 中 | FK構造変更 | 並行運用・ACL |
| 7 | 中 | FK構造変更 | 並行運用 |
| 8 | 低 | API追加 | v1 並行運用 |
| 9 | 中 | 旧構造削除 | 段階的 deprecation |

---

## 付録: Step間の依存関係

```
Step 1 ──→ Step 2 ──→ Step 3 ──→ Step 4 ──→ Step 5
  │                      │                      │
  │                      │                      ▼
  │                      │                   Step 6 ──→ Step 7 ──→ Step 8 ──→ Step 9
  │                      │
  └──────────────────────┴─── 不変条件の遵守を確認しながら進行
```

**クリティカルパス**: Step 1 → Step 3 → Step 5（lot_reservations の導入と統合）

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2025-12-10 | 1.0.0 | 初版作成 |
