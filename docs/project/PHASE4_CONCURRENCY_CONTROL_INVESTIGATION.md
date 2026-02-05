# Phase 4: 排他制御機能 調査レポート

**作成日:** 2025-02-05
**ステータス:** 調査完了・実装待ち

---

## エグゼクティブサマリ

**現状:** 受注テーブルのロック機能は充実しているが、SmartRead OCR編集機能で**高リスクの競合問題**が存在。

**推奨:** ハイブリッド方式（既存の悲観的ロック維持 + SmartRead用楽観的ロック追加）

**優先度:**
- **P0（最優先）:** SmartReadデータに楽観的ロック追加 - 工数: 2-3日
- **P1（次点）:** セーブポイント・ロック自動クリーンアップ - 工数: 1.5-2.5日
- **P2（検討）:** OCR結果保護 - 工数: 1-2日（詳細確認後）

**総工数:** 5-8日（テスト・ドキュメント含む）

---

## 1. 現状分析

### 1.1 既存の排他制御機構

#### A. 悲観的ロック (Pessimistic Locking)

**受注テーブル (Order) の実装:**
- **ロック方式:** `SELECT ... FOR UPDATE NOWAIT` による行ロック
- **実装場所:** `backend/app/application/services/orders/order_service.py` L488-549
- **ロック取得時:**
  ```python
  stmt = select(Order)
      .where(Order.id == order_id)
      .with_for_update(nowait=True)
  order = self.db.execute(stmt).scalar_one_or_none()
  ```
- **特徴:**
  - `nowait=True`: 他トランザクションがロック中の場合、即座にエラー（OperationalError）
  - 待機なしで競合を素早く検出
  - ロック競合時に OrderLockedError 例外を発生

**ロット (LotReceipt) テーブルの実装:**
- **ロック方式:** `SELECT ... FOR UPDATE` と `FOR UPDATE SKIP LOCKED` の2モード
- **実装場所:** `backend/app/infrastructure/persistence/repositories/lot_repository.py` L405-408
- **コード:**
  ```python
  if lock_mode == LockMode.FOR_UPDATE:
      query = query.with_for_update(of=LotReceipt)
  elif lock_mode == LockMode.FOR_UPDATE_SKIP_LOCKED:
      query = query.with_for_update(skip_locked=True, of=LotReceipt)
  ```
- **用途:**
  - `FOR_UPDATE`: 厳密なロック（デッドロックリスク）
  - `FOR_UPDATE_SKIP_LOCKED`: 競合ロットをスキップして次善のロットを選択（推奨）

**手動引当 (Manual Reservation) の実装:**
- **ロック方式:** `with_for_update()` による行ロック
- **実装場所:** `backend/app/application/services/allocations/manual.py` L73
- **目的:** 二重引当防止（複数ユーザーが同じロットを同時に引当するのを防止）

#### B. 論理的ロック (Logical Locking)

**受注テーブル (Order) のロック管理:**
- **テーブルカラム:**
  ```
  locked_by_user_id (BigInteger)    → ロック取得ユーザーID
  locked_at (DateTime)              → ロック取得日時
  lock_expires_at (DateTime)        → ロック有効期限（10分）
  ```

- **ロック有効期限の設計:**
  - デフォルト: 10分間のロック
  - 同じユーザーが再ロック取得時: 自動延長（新たに10分）
  - 期限切れロック: 他ユーザーが上書き可能

- **実装パターン:**
  ```python
  # ロック取得
  if order.lock_expires_at > now:
      if order.locked_by_user_id == user_id:
          order.lock_expires_at = now + timedelta(minutes=10)  # 延長
      else:
          raise OrderLockedError()  # 他ユーザーロック

  # ロック解除
  order.locked_by_user_id = None
  order.locked_at = None
  order.lock_expires_at = None
  ```

- **インデックス設計:**
  - Partial Index: `postgresql_where="lock_expires_at IS NOT NULL"`
  - ロック中のレコードのみインデックス化（検索最適化）

### 1.2 バージョン管理の現状

**結論: `version` カラムは存在しない**

検索結果: 6個のモデルファイルで `version` パターンを検索 → マッチなし

- Order テーブル: version カラムなし
- OrderLine テーブル: version カラムなし
- LotReceipt テーブル: version カラムなし
- SmartReadWideData: version カラムなし
- SmartReadLongData: version カラムなし

**バージョン管理の未実装:**
- 楽観的ロックは利用されていない
- 実装は悲観的ロック（行ロック）のみ

### 1.3 同時編集リスクのあるテーブル

#### A. 高リスク: 複数ユーザーが同時に編集する可能性が高い

**1. orders テーブル**
- **編集パターン:**
  - 営業担当者が受注明細の引当を手動変更（Drag & Assign）
  - 同時に別の営業が同じ受注を編集
- **競合シナリオ:**
  - ユーザーA: 受注#123の明細引当を修正
  - ユーザーB: 同時に受注#123の明細数量を変更
  → 片方の変更が上書きされる
- **現在の対策:** 論理的ロック（locked_by_user_id など）✅
- **問題:** データの部分更新時に競合可能性がある

**2. lot_reservations テーブル**
- **編集パターン:**
  - 複数ユーザーが同じロットに対して予約作成
  - 自動引当と手動引当の同時実行
- **競合シナリオ:**
  - ロットX（在庫50個）に対して：
    - ユーザーA: 30個を予約
    - ユーザーB: 同時に40個を予約
  → 合計70個が予約される（過剰引当）
- **現在の対策:**
  - `with_for_update()` によるロック ✅
  - EPSILON許容誤差による浮動小数点対応 ✅
- **状況:** 保護されている

**3. smartread_wide_data / smartread_long_data テーブル ⚠️ HIGH RISK**
- **編集パターン:**
  - フロントエンドでOCR結果を編集（手動修正）
  - 複数の編集セッションが並行
- **save_long_data エンドポイント:**
  ```python
  @router.post("/tasks/{task_id}/save-long-data")
  async def save_long_data(
      task_id: str,
      request: SmartReadSaveLongDataRequest,
      uow: UnitOfWork = Depends(get_uow),
  ):
  ```
- **競合シナリオ:**
  - ユーザーA: OCR結果を修正して保存（wide_data + long_data 全件）
  - ユーザーB: 別の行を修正して保存
  → Bの変更がAによって上書きされる
- **現在の対策:** なし ❌
- **問題:**
  - トランザクションレベルの保護のみ
  - 複数行の修正が一括上書きされるリスク
  - バージョン管理なし

**4. ocr_results テーブル**
- **編集パターン:**
  - OCR取込結果をユーザーが手動修正
  - 受注への変換処理と並行実行
- **現在の対策:** 不明確
- **問題:** 編集UIの詳細確認が必要

#### B. 中リスク: 検索・フィルタ時に古いデータ参照

**1. orders テーブル（読取時）**
- **読取パターン:**
  - 受注一覧表示時に status をフィルタ
  - ソート中に status が変更される
- **問題:** Snapshot Isolation がないと古いデータ参照の可能性
- **PostgreSQL の場合:** READ COMMITTED デフォルトで保護される

**2. lot_reservations テーブル（読取時）**
- **読取パターン:**
  - available_quantity 計算時に lot_reservations を集計
  - 計算中に新しい予約が追加される
- **実装:** `stock_calculation.get_available_quantity()` で個別計算
- **問題:** 複数ロットの集計時に不整合の可能性

---

## 2. トランザクション管理の実装状況

### 2.1 Unit of Work パターンの使用

**実装場所:** `backend/app/application/services/common/uow_service.py`

**パターン:**
```python
uow: UnitOfWork = Depends(get_uow)
# サービス層で処理
uow.session.commit()  # または自動commit
```

**使用例:**
- 受注作成: `create_order()` で UoW 使用
- 手動引当保存: `save_manual_allocations()` で UoW 使用

### 2.2 auto_commit フラグの使用

**検索結果:** 以下のファイルで `auto_commit` パターンを使用

1. `backend/app/application/services/orders/order_service.py`
   - 読取操作: `auto_commit=False` (読み取り専用)
   - 更新操作: UoW で自動commit

2. `backend/app/application/services/allocations/manual.py`
   - `commit_db` パラメータで制御
   - `commit_db=True`: 単一操作でcommit
   - `commit_db=False`: バルク処理で呼び出し側でcommit

### 2.3 begin_nested() の使用

**検索結果:** セーブポイント (`begin_nested()`) は見当たらない ❌

- 部分的失敗の処理は実装されていない
- エラー時の全トランザクション・ロールバックのみ

---

## 3. 推奨実装方式

### 3.1 実装方式の選定

#### 方針: **ハイブリッド方式** (既存の悲観的ロック + SmartRead用楽観的ロック)

**理由:**
1. **受注 (Order) テーブル:** 既存の悲観的ロック ✅
   - ロック期間: 10分（有効）
   - NOWAIT で競合を素早く検出
   - ユーザーUXへの影響少

2. **ロット (LotReceipt) テーブル:** 既存の FOR UPDATE SKIP LOCKED ✅
   - 競合ロットをスキップして次善のロットを選択
   - デッドロック回避

3. **SmartRead データ (wide_data, long_data):** 楽観的ロック導入 ⭐
   - 理由:
     - 複数セッションの長時間編集が前提
     - 悲観的ロックではロック競合時のユーザー体験が悪い
     - バージョン管理で効率的な競合検出可能
   - 実装:
     - `version` カラム追加 (INTEGER)
     - 更新時にバージョンチェック
     - 競合時は 409 Conflict を返す

### 3.2 SmartRead 編集機能での楽観的ロック実装

**実装対象:**
- `smartread_wide_data` テーブル
- `smartread_long_data` テーブル

**スキーマ変更:**
```sql
-- wide_data 用
ALTER TABLE smartread_wide_data ADD COLUMN version INTEGER DEFAULT 1;

-- long_data 用
ALTER TABLE smartread_long_data ADD COLUMN version INTEGER DEFAULT 1;
```

**API エンドポイント変更:**
```python
# 現在
@router.post("/tasks/{task_id}/save-long-data")
async def save_long_data(request: SmartReadSaveLongDataRequest):
    # 全行を一括上書き

# 改善案
class SmartReadLongDataUpdateRequest(BaseModel):
    id: int
    version: int  # 楽観的ロック用
    content: dict  # 変更内容

@router.patch("/long-data/{id}")
async def update_long_data(
    id: int,
    request: SmartReadLongDataUpdateRequest,
):
    # バージョンチェック -> 競合検出 -> 更新
    long_data = db.get(SmartReadLongData, id)
    if long_data.version != request.version:
        raise HTTPException(
            status_code=409,
            detail="Data was modified by another user. Please reload."
        )
    long_data.content = request.content
    long_data.version += 1
    db.commit()
```

### 3.3 OCR 結果編集機能での保護

**現在:** 編集機能の詳細が不明

**推奨:**
1. **読取時に version を含める**
   - フロントエンドで version を保持

2. **更新時にバージョンチェック**
   - 競合時は 409 Conflict

3. **ロック UI の追加**（オプション）
   - 編集中に他のユーザーが読取できるよう表示

---

## 4. 実装対象と優先順位

### 優先度: 最優先 (P0)

#### 1. SmartRead データの楽観的ロック導入
- **対象:** `smartread_wide_data`, `smartread_long_data` テーブル
- **工数:** 2-3 日
- **リスク:** 高（現在 P1 リスク状態）
- **実装内容:**
  1. マイグレーション: `version` カラム追加
  2. モデル更新: ORM に version 追加
  3. エンドポイント: バージョンチェック追加
  4. エラーハンドリング: 409 Conflict 処理
  5. フロントエンド: version 管理・競合表示

#### 2. OCR 結果編集機能の競合対策
- **対象:** ocr_results テーブル（詳細確認後）
- **工数:** 1-2 日（内容確認後）
- **リスク:** 不明
- **実装内容:** SmartRead と同様

### 優先度: 次点 (P1)

#### 3. 部分的失敗時のセーブポイント導入
- **対象:** 複数エンティティ更新が必要な処理
- **例:** 受注キャンセル時に lot_reservations を一括削除
- **工数:** 1-2 日
- **実装:**
  ```python
  with db.begin_nested():  # savepoint 開始
      try:
          # 予約削除
      except:
          # savepoint ロールバック
          # 他の処理は継続
  ```

#### 4. ロック期限切れの自動クリーンアップ
- **対象:** orders テーブルの lock_expires_at
- **工数:** 0.5 日
- **実装:** バッチジョブで期限切れロックを削除

### 優先度: 検討項目 (P2)

#### 5. lot_reservations の楽観的ロック検討
- **現在:** 悲観的ロック (`FOR_UPDATE SKIP_LOCKED`)
- **検討:** 楽観的ロック導入で処理スループット向上の可能性
- **リスク:** 高（金銭的影響あり）
- **推奨:** 性能測定後に判断

---

## 5. 実装工数見積もり

### 全体工数: 5-8 日

| 項目 | 工数 | 依存関係 |
|------|------|--------|
| 1. SmartRead 楽観的ロック | 2-3 日 | - |
| 2. OCR 結果保護 | 1-2 日 | 1 の経験 |
| 3. セーブポイント導入 | 1-2 日 | - |
| 4. ロック自動クリーンアップ | 0.5 日 | - |
| 5. テスト・ドキュメント | 1-2 日 | 1-4 完了後 |

**フェーズ分割:**
- **Phase 4-A (P0):** SmartRead 楽観的ロック (2-3 日)
- **Phase 4-B (P1):** セーブポイント・クリーンアップ (1.5-2.5 日)
- **Phase 4-C (P2):** OCR 結果保護 (1-2 日) ※詳細確認後

---

## 6. リスクと懸念事項

### 6.1 技術的リスク

#### A. SmartRead 複数行編集の不整合リスク（HIGH）

**問題:**
```python
# 現在の実装
def save_long_data(request):
    # wide_data 50行 + long_data 500行を一括上書き
    service._save_wide_and_long_data(
        wide_data=request.wide_data,  # [50行]
        long_data=request.long_data,  # [500行]
    )
```

**リスク:**
- 50行の wide_data 保存中に別ユーザーが 1行だけ修正
- その後 500行の long_data が上書きされる
→ 別ユーザーの修正が消える

**対策:** 行単位のバージョン管理 + トランザクション
```python
# 改善案: 各行にversion
for row in long_data:
    db_row = db.get(SmartReadLongData, row.id)
    if db_row.version != row.version:
        raise ConflictError(f"Row {row.id} was modified")
    db_row.content = row.content
    db_row.version += 1
db.commit()
```

#### B. ロック競合時のユーザー体験（MEDIUM）

**現在:**
- Order ロック競合時: OrderLockedError → 409 Conflict
- SmartRead 楽観的ロック導入後: 409 Conflict

**改善案:**
1. **フロントエンド:**
   - 競合検出時にダイアログ表示
   - 「リロード」「上書き」「キャンセル」の選択肢

2. **バックエンド:**
   - リトライ用のタイムスタンプ情報を提供
   - lock_expires_at を API レスポンスに含める

#### C. デッドロック リスク（MEDIUM）

**現在の状況:**
- `FOR_UPDATE SKIP_LOCKED` で回避
- `FOR_UPDATE NOWAIT` で即座に検出

**検討:**
- 複数テーブルのロック順序を統一（アルファベット順など）
- ロック保持時間を最小化

### 6.2 業務的リスク

#### A. SmartRead 編集セッションの中断（MEDIUM）

**シナリオ:**
```
ユーザーA: OCR データ編集開始（wide/long データ読込）
          ↓
          [5分間、修正作業中]
          ↓
          保存をクリック
          ↓
          バージョン不一致エラー
          → 修正内容が消える？
```

**対策:**
1. **オプティミスティック・ロック + Manual Merge UI**
   - 競合時に「どちらを採用するか」を選択させる

2. **セッションタイムアウト延長**
   - 編集セッションを明示的に開始・終了
   - セッション中は他ユーザーが読取不可（オプション）

#### B. 営業のロック競合経験（MEDIUM）

**シナリオ:**
```
営業A: 受注#123 のロックを取得
営業B: 同じ受注を編集しようとする
       → "営業A が編集中" というメッセージ
       → 営業B は待つか、キャンセルするか
```

**現在の対策:**
- 10分でロック自動解除 ✅
- ロック所有者の表示 ✅

**改善案:**
- ロック取得時に「ロック中」状態をリアルタイム通知
- ロック解除時に通知

### 6.3 運用的リスク

#### A. 期限切れロックの残存（LOW）

**問題:** ロック期限切れ後も locked_by_user_id が NULL にならない

**現在の対策:** Partial Index で検索最適化

**改善:** バッチジョブで期限切れロックを削除
```sql
-- 日次バッチ
UPDATE orders
SET locked_by_user_id = NULL, locked_at = NULL, lock_expires_at = NULL
WHERE lock_expires_at < NOW() AND locked_by_user_id IS NOT NULL;
```

#### B. バージョン管理への移行リスク（MEDIUM）

**問題:** 既存データに version がない状態から始まる

**対策:**
1. **マイグレーション時に version = 1 を設定**
   ```sql
   ALTER TABLE smartread_wide_data ADD COLUMN version INTEGER DEFAULT 1;
   ```

2. **アプリケーション側でバージョンチェック**
   ```python
   if record.version is None:
       record.version = 1  # 互換性対応
   ```

3. **テストで古いデータの扱いを検証**

---

## 7. 実装ロードマップ（推奨）

### Week 1: SmartRead 楽観的ロック (P0)

**Day 1-2: 設計・マイグレーション**
- スキーマ: `version` カラム追加（Alembic）
- ORM モデル更新
- API スキーマ設計

**Day 3: 実装**
- バックエンド: バージョンチェック処理
- 409 Conflict エラーハンドリング
- テスト作成

**Day 4: フロントエンド**
- version を読込・保持
- 競合時のエラー表示
- リロード・リトライ UI

### Week 2: セーブポイント・クリーンアップ (P1)

**Day 1: セーブポイント導入**
- `begin_nested()` をパターン化
- テスト

**Day 2: ロック自動クリーンアップ**
- バッチジョブ実装
- スケジュール設定

### Week 3: OCR 結果保護 (P2)

**Day 1-2: OCR 機能詳細調査**
- 編集フロー確認
- リスク評価

**Day 3: 実装**
- SmartRead と同様のパターン

---

## 8. 参考コード

### SmartRead 楽観的ロック実装例

```python
# models/smartread_models.py
class SmartReadLongData(Base):
    __tablename__ = "smartread_long_data"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # ★ 追加
    created_at: Mapped[datetime] = mapped_column(DateTime, ...)
    updated_at: Mapped[datetime] = mapped_column(DateTime, ...)

# services/smartread_service.py
def update_long_data(self, data_id: int, version: int, content: dict):
    record = self.db.get(SmartReadLongData, data_id)
    if not record:
        raise SmartReadLongDataNotFoundError(data_id)

    if record.version != version:  # バージョンチェック ★
        raise HTTPException(
            status_code=409,
            detail={
                "error": "OPTIMISTIC_LOCK_CONFLICT",
                "current_version": record.version,
                "expected_version": version,
                "message": "Data was modified by another user"
            }
        )

    record.content = content
    record.version += 1  # バージョン递增 ★
    record.updated_at = utcnow()
    self.db.flush()
    return record

# api/smartread_router.py
class SmartReadLongDataUpdateRequest(BaseModel):
    version: int  # 必須
    content: dict

@router.patch("/long-data/{data_id}")
def update_long_data(
    data_id: int,
    request: SmartReadLongDataUpdateRequest,
    uow: UnitOfWork = Depends(get_uow),
):
    service = SmartReadService(uow.session)
    try:
        record = service.update_long_data(
            data_id=data_id,
            version=request.version,
            content=request.content
        )
        uow.session.commit()
        return SmartReadLongDataResponse.model_validate(record)
    except HTTPException as e:
        uow.session.rollback()
        raise
```

---

## 結論

**現状:** 受注のロック機能は充実しているが、SmartRead OCR 編集機能で競合リスクが高い

**推奨:** ハイブリッド方式で段階的に改善
1. **P0:** SmartRead に楽観的ロック導入 (2-3 日)
2. **P1:** セーブポイント・クリーンアップ (1.5-2.5 日)
3. **P2:** OCR 結果保護 (詳細確認後)

**全体工数:** 5-8 日（テスト・ドキュメント含む）

**次のステップ:** 全体のテーブル構造を把握した上で、Phase 4-A（SmartRead楽観的ロック）の実装を開始
