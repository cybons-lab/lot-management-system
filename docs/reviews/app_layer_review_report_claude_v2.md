# アプリ層 あら探しレポート v2（修正後検証 + シナリオベース攻撃）

**作成日**: 2025-12-14
**レビュー方式**: 修正後検証（案A）+ シナリオベース攻撃（案B）のミックス
**対象**: 前回のP0/P1/P2対応後のコードベース

---

## エグゼクティブサマリー

前回の統合アクションプラン対応後に、**新たに22件の問題**を検出しました。

| 優先度 | 件数 | 主な影響 |
|--------|------|---------|
| **P0** | 4件 | 本番障害・方針違反 |
| **P1** | 11件 | 近い将来の事故・データ不整合 |
| **P2** | 7件 | 技術的負債・保守性低下 |

---

## P0 - 本番障害レベル（即時対応必須）

### P0-1: ステータス属性アクセスエラー（本番クラッシュ）

- **ファイル**: `backend/app/presentation/api/routes/allocations/allocations_router.py:179-180`
- **症状**: `confirmed_res.status.value` にアクセスすると `AttributeError: 'str' object has no attribute 'value'` が発生し、API が 500 エラーを返す
- **再現条件**: 予約を confirm して API から確認結果を取得する
- **原因**: `status` は DB 内で `String(20)` として保存されるが、コードが Enum の `.value` をアクセスしようとしている
- **影響範囲**: 引当確定 API 全体
- **修正案（最小）**:
  ```python
  # 修正前
  allocation_type="hard" if confirmed_res.status.value == "confirmed" else "soft",
  status=confirmed_res.status.value,

  # 修正後
  allocation_type="hard" if confirmed_res.status == "confirmed" else "soft",
  status=confirmed_res.status,
  ```
- **修正時の注意**: 他の `.value` アクセス箇所も同様に確認が必要

---

### P0-2: RELEASED → CONFIRMED 状態遷移違反（状態機械破壊）

- **ファイル**: `backend/app/application/services/allocations/confirm.py:66-74`
- **症状**: 一度 `RELEASED` 状態になった予約を confirm できてしまう
- **再現条件**:
  ```
  1. 予約を作成（ACTIVE）
  2. 予約を cancel（RELEASED）
  3. 同じ reservation_id で confirm API 呼び出し
  → confirm が成功してしまう
  ```
- **原因**: RELEASED 状態のガードがない
- **影響範囲**: 引当状態管理全体、在庫整合性
- **修正案（最小）**:
  ```python
  if reservation.status == ReservationStatus.RELEASED:
      raise AllocationCommitError(
          "ALREADY_RELEASED",
          f"Released reservation {reservation_id} cannot be confirmed"
      )
  ```
- **修正時の注意**: テストケース追加必須

---

### P0-3: 存在しない API エンドポイント呼び出し（機能停止）

- **ファイル**: `frontend/src/features/orders/hooks/useOrderLineAllocation.ts:272`
- **症状**: 引当キャンセル操作が 404 エラーで失敗する
- **再現条件**: 受注明細の全引当をキャンセルしようとする
- **原因**: `cancelAllocationsByLine()` が `POST /allocations/cancel-by-order-line` を呼ぶが、バックエンドにこのエンドポイントが存在しない
- **影響範囲**: 引当キャンセル機能全般
- **修正案**:
  - A) バックエンドで `/api/allocations/cancel-by-order-line` POST を実装
  - B) フロントエンドで各 allocation ID を取得して個別に DELETE 呼び出しに変更
- **修正時の注意**: テストで定義されている仕様を確認

---

### P0-4: ロット物理削除メソッドの実装残存（方針違反）

- **ファイル**: `backend/app/application/services/inventory/lot_service.py:543-550`
- **症状**: `delete_lot(lot_id)` メソッドが `self.db.delete(db_lot)` で物理削除を実行
- **再現条件**: `LotService.delete_lot()` を直接呼び出す（API は 403 でシール済み）
- **原因**: API エンドポイントは封印したが、サービスメソッドは残存
- **影響範囲**: 直接呼び出し元があれば在庫管理全体
- **修正案（最小）**:
  ```python
  def delete_lot(self, lot_id: int) -> None:
      raise NotImplementedError("Lot physical deletion is forbidden. Use stock adjustment instead.")
  ```
- **修正時の注意**: 内部で呼び出している箇所がないか grep で確認

---

## P1 - 近い将来の事故（早期対応推奨）

### P1-1: LotReservation 行ロック欠落による二重 confirm

- **ファイル**: `backend/app/application/services/allocations/confirm.py:66-72`
- **症状**: 2 スレッドが同一 reservation に対して同時に `confirm_reservation()` を呼ぶと、両方が確定される可能性
- **再現条件**: 同一 reservation_id に対する並行 confirm リクエスト
- **原因**: `db.get(LotReservation, reservation_id)` でロックを取得していない
- **影響範囲**: 引当確定処理の整合性
- **修正案**:
  ```python
  res_stmt = select(LotReservation).where(
      LotReservation.id == reservation_id
  ).with_for_update()
  reservation = db.execute(res_stmt).scalar_one_or_none()
  ```

---

### P1-2: OrderLine ロック欠落による競合

- **ファイル**: `backend/app/application/services/allocations/commit.py:73-79`
- **症状**: OrderLine の `next_div` フィールド更新時、ロック未取得で上書きリスク
- **再現条件**: 同一 order_line に対する並行 commit 処理
- **原因**: `select(OrderLine)` でロックを取得していない
- **影響範囲**: 配分情報の喪失
- **修正案**: `.with_for_update()` を追加

---

### P1-3: LotReservation 在庫チェックと確定の非アトミック性

- **ファイル**: `backend/app/application/services/allocations/confirm.py:79-108`
- **症状**: Lot はロックするが LotReservation の読取がロックされていない
- **再現条件**:
  ```
  Thread-A: reserved_qty = 10 読込
  Thread-B: 予約 5 を追加
  Thread-A: available = 5 で確定（負の在庫リスク）
  ```
- **原因**: `get_reserved_quantity()` が FOR UPDATE なしで読み取り
- **影響範囲**: 負の在庫の発生
- **修正案**: 予約合計の集計クエリにも `.with_for_update()` を追加

---

### P1-4: ステータス値設定の型不一致

- **ファイル**: 複数箇所
  - `backend/app/application/services/inventory/lot_reservation_service.py:196`
  - `backend/app/application/services/allocations/confirm.py:123`
  - `backend/app/application/services/allocations/manual.py:98`
  - `backend/app/application/services/allocations/preempt.py:123`
- **症状**: Enum 値を文字列型の `status` カラムに直接設定
- **再現条件**: 予約確定時のステータス更新
- **原因**: `reservation.status = ReservationStatus.CONFIRMED` と Enum を直接設定
- **影響範囲**: SQLAlchemy の型変換に依存した不安定なコード
- **修正案**: `reservation.status = ReservationStatus.CONFIRMED.value` と `.value` を使用

---

### P1-5: 在庫利用可能性の計算矛盾

- **ファイル**:
  - `backend/app/application/services/inventory/stock_calculation.py:63`
  - `backend/app/application/services/allocations/utils.py:100-112`
- **症状**: FEFO 計算時に異なる利用可能数量が計算される
- **再現条件**:
  ```
  stock_calculation.get_available_quantity() → CONFIRMED のみカウント
  utils._lot_candidates() → ACTIVE + CONFIRMED をカウント
  ```
- **原因**: 2 つの実装で ACTIVE の扱いが異なる
- **影響範囲**: 引当計算全体の整合性
- **修正案**: ACTIVE と CONFIRMED の定義を明確化し、1 箇所に統一

---

### P1-6: デュプリケート予約の防止なし

- **ファイル**: `backend/app/infrastructure/persistence/models/lot_reservations_model.py:158-181`
- **症状**: 同じ order_line_id, lot_id に対して複数の LotReservation が作成される可能性
- **再現条件**: 同じパラメータで `auto_reserve_line()` を再度実行
- **原因**: `(lot_id, source_type, source_id)` の複合キーに UNIQUE 制約がない
- **影響範囲**: 在庫二重引当
- **修正案**:
  - A) DDL に UNIQUE 制約を追加
  - B) INSERT 前に EXISTS チェック

---

### P1-7: SQLビュー内の allocations テーブル参照残存

- **ファイル**: `backend/sql/views/create_views.sql:270-275`
- **症状**: `v_order_line_details` ビューが allocations テーブルを参照
- **再現条件**: ビューを使用する全ての画面・API
- **原因**: lot_reservations 一本化後にビューが未更新
- **影響範囲**: 受注検索・集計
- **修正案**:
  ```sql
  -- 現在（問題あり）
  LEFT JOIN (
      SELECT order_line_id, SUM(allocated_quantity) as allocated_qty
      FROM public.allocations
      GROUP BY order_line_id
  ) alloc_sum ON alloc_sum.order_line_id = ol.id;

  -- 修正後
  LEFT JOIN (
      SELECT source_id, SUM(reserved_qty) as allocated_qty
      FROM public.lot_reservations
      WHERE source_type = 'ORDER' AND status IN ('ACTIVE', 'CONFIRMED')
      GROUP BY source_id
  ) res_sum ON res_sum.source_id = ol.id;
  ```

---

### P1-8: フォーキャスト/Order/InboundPlan の物理削除

- **ファイル**:
  - `backend/app/application/services/forecasts/forecast_service.py:290, 471, 481`
  - `backend/app/application/services/inventory/inbound_service.py:217-234`
- **症状**: `db.delete()` による物理削除が実行される
- **再現条件**: 各削除 API の呼び出し
- **原因**: ロット以外のテーブルに物理削除禁止ポリシーが適用されていない
- **影響範囲**: 履歴管理・lot_reservations 整合性
- **修正案**: soft delete（ステータス更新）に変更

---

### P1-9: エラーハンドリング - 在庫不足エラーの検出が不確実

- **ファイル**: `frontend/src/utils/errors/api-error-handler.ts:134-140`
- **症状**: 在庫不足時のエラーハンドリングが失敗する可能性
- **再現条件**: 在庫不足で 409 エラーが返された時
- **原因**: メッセージ文字列（"在庫"）で判定しているが、バックエンドはエラーコード `INSUFFICIENT_STOCK` を返す
- **影響範囲**: 在庫不足時の UX
- **修正案**:
  ```typescript
  export async function isInsufficientStockError(error: HTTPError): boolean {
    const problem = await extractProblemJSON(error);
    return problem?.error_code === "INSUFFICIENT_STOCK" ||
           error.response?.status === 409;
  }
  ```

---

### P1-10: API v1/v2 混在

- **ファイル**: `frontend/src/features/allocations/api.ts:146`
- **症状**: レガシー v1 エンドポイントと v2 が混在
- **再現条件**: `createAllocations()` 呼び出し時
- **原因**: マイグレーション不完全
- **影響範囲**: 動作の一貫性
- **修正案**: v1 呼び出しを全廃し、v2 に統一

---

### P1-11: confirm_reservations_batch での部分更新リスク

- **ファイル**: `backend/app/application/services/allocations/confirm.py:155-214`
- **症状**: batch 処理中に他プロセスが同じ lot_id の reservation を更新する可能性
- **再現条件**: 複数ユーザーが同時に batch confirm を実行
- **原因**: ループで個別処理、reservation 行の事前ロックなし
- **影響範囲**: 在庫チェック漏れ
- **修正案**: 全 reservation を事前にロック取得
  ```python
  res_stmts = select(LotReservation).where(
      LotReservation.id.in_(reservation_ids)
  ).with_for_update()
  reservations = db.execute(res_stmts).scalars().all()
  ```

---

## P2 - 技術的負債（計画的に対応）

### P2-1: 楽観ロック（version）機構が未使用

- **ファイル**: `backend/app/infrastructure/persistence/models/inventory_models.py:116,186`
- **症状**: Lot モデルに `version` フィールドがあるが活用されていない
- **修正案**: `StaleDataError` をキャッチして再試行ロジックを実装

---

### P2-2: preempt_soft_reservations_for_hard での部分更新リスク

- **ファイル**: `backend/app/application/services/allocations/preempt.py:98-110`
- **症状**: 部分リリース時に reservation を更新するが、ロック未取得
- **修正案**: soft_reservations を `.with_for_update()` で取得

---

### P2-3: ステータス比較の型不整合（コードスタイル）

- **ファイル**: 複数箇所
- **症状**: `.value` を使う箇所と使わない箇所が混在
- **修正案**: 全ての比較を統一（`.value` を使うか使わないか）

---

### P2-4: EPSILON 値の型不一貫

- **ファイル**:
  - `backend/app/application/services/allocations/commit.py:68`
  - `backend/app/application/services/allocations/manual.py:59`
  - `backend/app/application/services/allocations/utils.py:147, 187`
- **症状**: float と Decimal が混在
- **修正案**: 全て Decimal で統一

---

### P2-5: 日付フィールド名の不一致（FE/BE）

- **ファイル**: `frontend/src/features/allocations/components/orders/AllocationOrderLineCard.tsx:147`
- **症状**: FE が `due_date` を期待、BE は `delivery_date` を返す
- **修正案**: フォールバック対応 `line.delivery_date || line.due_date`

---

### P2-6: datetime.now() 残存

- **ファイル**: `backend/app/middleware/metrics.py:49`
- **症状**: タイムゾーン非対応の datetime を使用
- **修正案**: `utcnow()` に変更

---

### P2-7: 有効期限切れロット判定の境界条件

- **ファイル**: `backend/app/domain/allocation/calculator.py:40`
- **症状**: 当日が有効期限のロットの扱いが不明確（`<` vs `<=`）
- **修正案**: ビジネス要件を明確化し、コードとコメントを整合

---

## 上位5件のまとめ

| 順位 | 問題ID | タイトル | 影響 |
|------|--------|----------|------|
| 1 | P0-1 | ステータス属性アクセスエラー | API 500エラー（本番障害） |
| 2 | P0-2 | RELEASED→CONFIRMED 遷移 | 状態機械破壊 |
| 3 | P0-3 | 存在しないAPI呼び出し | 機能停止 |
| 4 | P1-5 | 在庫計算矛盾 | 引当計算の不整合 |
| 5 | P1-7 | SQLビューのallocations参照 | データ不整合 |

---

## 推奨実行順

### Phase 1: 即時対応（今日〜明日）
1. **P0-1**: ステータス属性アクセスエラー修正（5分）
2. **P0-2**: RELEASED ガード追加（10分）
3. **P0-3**: 存在しないAPI対応（BE実装 or FE修正）
4. **P0-4**: ロット物理削除メソッド禁止化（5分）

### Phase 2: 今週中
1. **P1-1〜P1-3**: 行ロック追加（同時実行対策）
2. **P1-5**: 在庫計算の統一
3. **P1-7**: SQLビュー更新

### Phase 3: 来週
1. **P1-4**: ステータス設定の型統一
2. **P1-6**: UNIQUE制約追加
3. **P1-8〜P1-11**: 残りのP1対応

### Phase 4: スプリント内
1. **P2-1〜P2-7**: 技術的負債の解消

---

## 検証チェックリスト

### 追加すべきテスト
- [ ] 並行 confirm テスト（2スレッド × 同一 reservation）
- [ ] RELEASED 状態からの confirm 拒否テスト
- [ ] 同一 order_line への重複予約防止テスト
- [ ] 在庫計算の整合性テスト（stock_calculation vs utils）
- [ ] エラーコードによるエラー判定テスト（FE）

### 手動スモークテスト
- [ ] 引当確定 → レスポンス正常確認
- [ ] cancel → 再confirm → 拒否確認
- [ ] 大量データ（1000+ reservations）での性能確認

---

## 備考

- 前回の P0/P1/P2 対応で多くの問題は解消されているが、**修正の副作用**と**エッジケース**に問題が残っている
- 特に**同時実行制御**は体系的に不足しており、ロック戦略の統一が必要
- フロントエンド-バックエンド間の**契約の齟齬**も複数発見され、API 仕様の同期が課題
