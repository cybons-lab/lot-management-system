# SAPキャッシュ自動再取得機能 設計書

**Document Version:** 1.0
**Created:** 2026-02-03
**Status:** 設計完了（実装待ち）

---

## 1. 背景と目的

### 1.1 現状の課題

SAPマテリアルキャッシュシステムでは、以下の仕様により運用上の問題が発生している:

- **キャッシュが永続的に保持される**
  - 一度取得したデータに有効期限チェックがない
  - `fetched_at` フィールドは記録されているが、判定ロジックが存在しない
  - 古いデータがいつまでも残り続け、突合精度が低下する

- **手動更新のみ**
  - ユーザーが明示的に「SAPから取得」ボタンをクリックする必要がある
  - 定期的な更新を忘れると、データが古くなる
  - 初回アクセス時にキャッシュが空でも自動取得されない

- **データの鮮度が保証されない**
  - SAPマスタが更新されても、キャッシュは古いまま
  - OCR結果の突合処理で誤ったSAPデータを参照する可能性

### 1.2 目的

本設計は、以下の要件を満たすSAPキャッシュ自動再取得機能を提供する:

1. **一日一回の自動再取得** - 24時間以上経過したキャッシュは自動的に再取得
2. **初回アクセス時の自動更新** - 古いキャッシュがあれば、突合処理の前に自動再取得
3. **手動更新の継続サポート** - 既存の手動取得ボタンはそのまま維持
4. **洗い替え方式** - 新データ取得成功時に古いデータを削除（全置換）
5. **フェイルセーフ** - 取得失敗時は古いキャッシュを保持（データが取れない場合は古いデータを残す）

---

## 2. 現状分析

### 2.1 SAPキャッシュテーブル構造

**テーブル:** `sap_material_cache`

```sql
CREATE TABLE sap_material_cache (
    id BIGSERIAL PRIMARY KEY,
    connection_id BIGINT NOT NULL REFERENCES sap_connections(id),
    zkdmat_b VARCHAR(100) NOT NULL,     -- SAP先方品番（キー）
    kunnr VARCHAR(20) NOT NULL,         -- 得意先コード（キー）
    raw_data JSONB NOT NULL,            -- SAP ET_DATA（ZMKMAT_B, MEINS, etc.）

    -- タイムスタンプ（自動再取得で利用）
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 最新取得日時
    fetch_batch_id VARCHAR(50),         -- 取得バッチID（同一取得を識別）

    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT uq_sap_material_cache_key UNIQUE (connection_id, zkdmat_b, kunnr)
);

CREATE INDEX idx_sap_material_cache_fetched_at ON sap_material_cache(fetched_at);
CREATE INDEX idx_sap_material_cache_batch_id ON sap_material_cache(fetch_batch_id);
```

### 2.2 既存の取得フロー

**現在の実装:**

```
ユーザー操作: "SAPから取得" ボタンクリック
  ↓
POST /integration/sap/materials/fetch
  ↓
SapMaterialService.fetch_and_cache_materials()
  ├─ RFC呼び出し: Z_SCM1_RFC_MATERIAL_DOWNLOAD
  ├─ DataFrameに変換
  ├─ Upsert: INSERT ON CONFLICT DO UPDATE
  │  └─ raw_data, fetched_at, fetch_batch_id, updated_at を更新
  └─ commit
```

**問題点:**
- 手動トリガーのみ
- `fetched_at` の有効性チェックなし
- 古いデータの削除なし（Upsertで上書きのみ）

### 2.3 キャッシュ利用箇所

| 機能 | ファイル | 利用方法 |
|------|----------|----------|
| OCR-SAP突合 | `sap_reconciliation_service.py:164-191` | `load_sap_cache(kunnr)` - 得意先単位でメモリロード |
| キャッシュ一覧表示 | `sap_router.py:158-243` | ページング取得（最大200件/ページ） |
| キャッシュクリア | `sap_router.py:246-273` | 接続・得意先単位で削除 |

**自動再取得のトリガーポイント:**
- **OCR突合処理** (`POST /integration/sap/reconcile`)
- **単一突合処理** (`POST /integration/sap/reconcile/single`)
- **キャッシュロード** (`load_sap_cache()`)

---

## 3. 要件定義

### 3.1 機能要件

#### FR-1: キャッシュ有効期限判定
- **優先度:** P0 (必須)
- **説明:** `fetched_at` を基準に、キャッシュの新鮮さを判定する
- **有効期限:** 24時間
- **判定ロジック:**
  ```python
  is_stale = (datetime.utcnow() - fetched_at) > timedelta(hours=24)
  ```
- **適用範囲:** 得意先コード単位（kunnr）で判定

#### FR-2: 初回アクセス時の自動再取得
- **優先度:** P0 (必須)
- **説明:** OCR突合処理時、古いキャッシュがあれば自動的に再取得する
- **トリガーポイント:**
  - `POST /integration/sap/reconcile` - 一括突合処理
  - `POST /integration/sap/reconcile/single` - 単一突合処理
- **動作:**
  1. 得意先コード（kunnr）でキャッシュの最新 `fetched_at` を取得
  2. 24時間以上経過していれば、自動的に `fetch_and_cache_materials()` を呼び出し
  3. 取得成功後、突合処理を実行
  4. 取得失敗時は、古いキャッシュを使用（ログに警告を記録）

#### FR-3: 手動更新の継続サポート
- **優先度:** P0 (必須)
- **説明:** 既存の手動取得ボタンはそのまま維持
- **変更なし:** `POST /integration/sap/materials/fetch` エンドポイント
- **UI:** 「SAPから取得」ボタン（`DataFetchTab.tsx`）

#### FR-4: 洗い替え方式（古いデータの削除）
- **優先度:** P1 (推奨)
- **説明:** 新データ取得成功後、古い `fetch_batch_id` のデータを削除
- **処理フロー:**
  1. 新データを取得し、新しい `fetch_batch_id` を生成
  2. Upsertで新データを保存
  3. **古い `fetch_batch_id` のレコードを削除**
  4. commit
- **メリット:**
  - SAPから削除されたデータがキャッシュに残らない
  - ストレージの無駄を削減

#### FR-5: フェイルセーフ（取得失敗時の保護）
- **優先度:** P0 (必須)
- **説明:** SAP取得に失敗した場合、古いキャッシュを保持する
- **動作:**
  - RFC接続エラー、タイムアウト、データ形式エラー時
  - 古いデータを削除しない
  - ログに警告を記録
  - ユーザーに通知（トースト）

#### FR-6: バックグラウンド再取得（オプション）
- **優先度:** P2 (将来拡張)
- **説明:** バックグラウンドジョブで定期的にキャッシュを更新
- **実装方式:**
  - Celeryなどのタスクキューを導入
  - 毎朝0時に全得意先のキャッシュを更新
  - 初回アクセス時の遅延を回避

### 3.2 非機能要件

#### NFR-1: パフォーマンス
- **自動再取得:** 初回アクセス時のレイテンシを最小化
  - RFC呼び出し: 平均3-10秒
  - 大量データ（1000件以上）: 15秒以内
- **キャッシュ判定:** O(1) - インデックスを活用
- **タイムアウト:** RFC呼び出しは30秒でタイムアウト

#### NFR-2: 信頼性
- **フェイルセーフ:** 取得失敗時は古いデータを使用
- **トランザクション:** 新データ保存と古いデータ削除を単一トランザクションで実行
- **ロールバック:** エラー時は全処理をロールバック

#### NFR-3: 監視・ログ
- **自動再取得ログ:** すべての自動再取得を記録
  - トリガー（auto/manual）
  - 得意先コード
  - 取得件数
  - 処理時間
  - 成功/失敗
- **警告ログ:** 取得失敗時は WARNING レベルでログに記録

#### NFR-4: ユーザー体験
- **透明性:** 自動再取得中はローディング表示
- **通知:** 取得成功/失敗をトーストで通知
- **キャンセル不可:** 自動再取得中はキャンセルできない（データ整合性保護）

---

## 4. 設計詳細

### 4.1 有効期限判定ロジック

**ファイル:** `backend/app/application/services/sap/sap_cache_manager.py`（新規作成）

```python
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from app.infrastructure.persistence.models.sap_models import SapMaterialCache

class SapCacheManager:
    """SAPキャッシュの有効期限管理"""

    CACHE_TTL_HOURS = 24  # キャッシュ有効期限（時間）

    def __init__(self, db: Session):
        self.db = db

    def is_cache_stale(self, kunnr: str, connection_id: int | None = None) -> bool:
        """
        キャッシュが古いかどうか判定

        Args:
            kunnr: 得意先コード
            connection_id: SAP接続ID（Noneの場合はデフォルト接続）

        Returns:
            True: キャッシュが古い（24時間以上経過 or 存在しない）
            False: キャッシュが新鮮（24時間以内）
        """
        # 最新のfetched_atを取得
        stmt = (
            select(func.max(SapMaterialCache.fetched_at))
            .where(SapMaterialCache.kunnr == kunnr)
        )
        if connection_id:
            stmt = stmt.where(SapMaterialCache.connection_id == connection_id)

        latest_fetched_at = self.db.execute(stmt).scalar()

        # キャッシュが存在しない場合は古いとみなす
        if not latest_fetched_at:
            logger.info(
                "SAP cache not found (considered stale)",
                extra={"kunnr": kunnr, "connection_id": connection_id}
            )
            return True

        # 24時間以上経過していれば古い
        now = datetime.now(timezone.utc)
        age = now - latest_fetched_at
        is_stale = age > timedelta(hours=self.CACHE_TTL_HOURS)

        logger.info(
            "SAP cache staleness check",
            extra={
                "kunnr": kunnr,
                "connection_id": connection_id,
                "latest_fetched_at": latest_fetched_at.isoformat(),
                "age_hours": age.total_seconds() / 3600,
                "is_stale": is_stale,
            },
        )

        return is_stale
```

### 4.2 自動再取得トリガー

**ファイル:** `backend/app/application/services/sap/sap_reconciliation_service.py`（拡張）

```python
from app.application.services.sap.sap_cache_manager import SapCacheManager
from app.application.services.sap.sap_material_service import SapMaterialService

class SapReconciliationService:
    def __init__(self, db: Session):
        self.db = db
        self.cache_manager = SapCacheManager(db)
        self.material_service = SapMaterialService(db)

    def reconcile_with_auto_refresh(
        self,
        task_ids: list[str],
        kunnr: str,
        connection_id: int | None = None,
    ) -> dict:
        """
        OCR結果をSAP・マスタと突合（自動キャッシュ更新付き）

        Args:
            task_ids: OCRタスクIDリスト
            kunnr: 得意先コード
            connection_id: SAP接続ID

        Returns:
            突合結果
        """
        # 1. キャッシュ鮮度チェック
        if self.cache_manager.is_cache_stale(kunnr, connection_id):
            logger.info(
                "SAP cache is stale, triggering auto-refresh",
                extra={"kunnr": kunnr, "connection_id": connection_id, "trigger": "auto"}
            )

            try:
                # 2. 自動再取得
                fetch_result = self.material_service.fetch_and_cache_materials(
                    kunnr_f=kunnr,
                    kunnr_t=kunnr,
                    connection_id=connection_id,
                    trigger="auto",  # トリガー種別を記録
                )
                logger.info(
                    "SAP cache auto-refresh completed",
                    extra={
                        "kunnr": kunnr,
                        "record_count": fetch_result.get("record_count", 0),
                        "duration_ms": fetch_result.get("duration_ms", 0),
                    },
                )
            except Exception as exc:
                # 3. 取得失敗時は古いキャッシュを使用（フェイルセーフ）
                logger.warning(
                    "SAP cache auto-refresh failed, using stale cache",
                    extra={
                        "kunnr": kunnr,
                        "error": str(exc)[:500],
                    },
                )
                # エラーを無視して続行（古いキャッシュで突合）

        # 4. 突合処理を実行
        return self.reconcile(task_ids, kunnr, connection_id)
```

### 4.3 洗い替えロジック（古いデータ削除）

**ファイル:** `backend/app/application/services/sap/sap_material_service.py`（拡張）

```python
def fetch_and_cache_materials(
    self,
    kunnr_f: str,
    kunnr_t: str | None = None,
    connection_id: int | None = None,
    trigger: str = "manual",  # "manual" or "auto"
) -> dict:
    """
    SAPからマテリアルデータを取得してキャッシュに保存（洗い替え）

    Args:
        kunnr_f: 得意先コードFrom
        kunnr_t: 得意先コードTo（Noneの場合はkunnr_fと同じ）
        connection_id: SAP接続ID（Noneの場合はデフォルト）
        trigger: トリガー種別（"manual" or "auto"）

    Returns:
        取得結果（record_count, duration_ms, fetch_batch_id）
    """
    # ... 既存の処理（RFC呼び出し、DataFrame変換）...

    # 新しいバッチIDを生成
    fetch_batch_id = str(uuid.uuid4())[:8]
    fetched_at = datetime.now(timezone.utc)

    # トランザクション開始
    try:
        # 1. 新データをUpsert
        for _, row in df.iterrows():
            stmt = insert(SapMaterialCache).values(
                connection_id=connection_id,
                zkdmat_b=row["ZKDMAT_B"],
                kunnr=row["ZKUNNR_H"],
                raw_data={...},
                fetched_at=fetched_at,
                fetch_batch_id=fetch_batch_id,
                created_at=fetched_at,
                updated_at=fetched_at,
            )
            stmt = stmt.on_conflict_do_update(
                constraint="uq_sap_material_cache_key",
                set_={
                    "raw_data": stmt.excluded.raw_data,
                    "fetched_at": stmt.excluded.fetched_at,
                    "fetch_batch_id": stmt.excluded.fetch_batch_id,
                    "updated_at": stmt.excluded.updated_at,
                },
            )
            self.db.execute(stmt)

        # 2. 古いバッチIDのデータを削除（洗い替え）
        delete_stmt = (
            delete(SapMaterialCache)
            .where(SapMaterialCache.connection_id == connection_id)
            .where(SapMaterialCache.kunnr.in_(affected_kunnr_list))  # 今回取得した得意先のみ
            .where(SapMaterialCache.fetch_batch_id != fetch_batch_id)  # 新バッチID以外
        )
        deleted_count = self.db.execute(delete_stmt).rowcount

        # 3. コミット
        self.db.commit()

        logger.info(
            "SAP cache refresh completed",
            extra={
                "trigger": trigger,
                "connection_id": connection_id,
                "kunnr_range": f"{kunnr_f}-{kunnr_t}",
                "new_record_count": len(df),
                "deleted_count": deleted_count,
                "fetch_batch_id": fetch_batch_id,
            },
        )

        return {
            "record_count": len(df),
            "deleted_count": deleted_count,
            "fetch_batch_id": fetch_batch_id,
            "duration_ms": duration_ms,
        }

    except Exception as exc:
        self.db.rollback()
        logger.exception(
            "SAP cache refresh failed",
            extra={
                "trigger": trigger,
                "kunnr_range": f"{kunnr_f}-{kunnr_t}",
                "error": str(exc)[:500],
            },
        )
        raise
```

### 4.4 エラーハンドリング

#### 4.4.1 取得失敗時の保護

```python
try:
    fetch_result = material_service.fetch_and_cache_materials(...)
except pyrfc.CommunicationError as exc:
    logger.warning(
        "SAP RFC connection failed, using stale cache",
        extra={"error": str(exc)[:500]}
    )
    # 古いキャッシュで続行
except pyrfc.ABAPApplicationError as exc:
    logger.warning(
        "SAP RFC application error, using stale cache",
        extra={"error": str(exc)[:500]}
    )
    # 古いキャッシュで続行
except Exception as exc:
    logger.exception(
        "Unexpected error during SAP cache refresh",
        extra={"error": str(exc)[:500]}
    )
    # 古いキャッシュで続行
```

#### 4.4.2 トランザクション保護

```python
try:
    # 新データUpsert
    for row in df.iterrows():
        db.execute(insert(...))

    # 古いデータ削除
    db.execute(delete(...))

    # コミット
    db.commit()
except Exception:
    # ロールバック（新データも古いデータも変更されない）
    db.rollback()
    raise
```

---

## 5. API設計

### 5.1 既存エンドポイントの拡張

#### POST /integration/sap/reconcile（拡張）

**概要:** OCR結果をSAP・マスタと突合（自動キャッシュ更新付き）

**変更点:**
- 突合前にキャッシュの鮮度をチェック
- 古ければ自動的に再取得
- 取得失敗時は古いキャッシュで続行

**リクエスト（変更なし）:**
```json
{
  "task_ids": ["task_001", "task_002"],
  "kunnr": "100427105",
  "connection_id": 1
}
```

**レスポンス（拡張）:**
```json
{
  "results": [...],
  "cache_status": {
    "was_stale": true,              // キャッシュが古かったか
    "auto_refreshed": true,         // 自動再取得したか
    "refresh_failed": false,        // 再取得に失敗したか
    "record_count": 150,            // 取得件数
    "latest_fetched_at": "2026-02-03T10:30:00Z"  // 最新取得日時
  }
}
```

#### POST /integration/sap/materials/fetch（軽微な拡張）

**概要:** SAPからマテリアルデータを手動取得

**変更点:**
- `trigger` パラメータを追加（内部的に "manual" を設定）
- 古いデータの削除を実行（洗い替え）
- 削除件数をレスポンスに含める

**リクエスト（変更なし）:**
```json
{
  "kunnr_f": "100427105",
  "kunnr_t": "100427105",
  "connection_id": 1
}
```

**レスポンス（拡張）:**
```json
{
  "record_count": 150,
  "deleted_count": 120,           // 削除された古いレコード数（NEW）
  "fetch_batch_id": "a1b2c3d4",
  "duration_ms": 3500,
  "latest_fetched_at": "2026-02-03T10:30:00Z"
}
```

### 5.2 新規エンドポイント（オプション）

#### GET /integration/sap/cache/status

**概要:** キャッシュの鮮度ステータスを取得

**リクエスト:**
```
GET /integration/sap/cache/status?kunnr=100427105&connection_id=1
```

**レスポンス:**
```json
{
  "kunnr": "100427105",
  "connection_id": 1,
  "exists": true,
  "record_count": 150,
  "latest_fetched_at": "2026-02-03T10:30:00Z",
  "age_hours": 2.5,
  "is_stale": false
}
```

---

## 6. フロントエンド設計

### 6.1 自動再取得の通知

**ファイル:** `frontend/src/features/sap-integration/hooks/useSapReconciliation.ts`（拡張）

```typescript
export function useSapReconciliation() {
  const reconcileMutation = useMutation({
    mutationFn: reconcileOcrResults,
    onSuccess: (data) => {
      // 自動再取得の通知
      if (data.cache_status?.auto_refreshed) {
        toast.info(
          `SAPキャッシュを自動更新しました（${data.cache_status.record_count}件）`,
          { duration: 3000 }
        );
      }

      // 再取得失敗の警告
      if (data.cache_status?.refresh_failed) {
        toast.warning(
          "SAPキャッシュの更新に失敗しました。古いデータで突合を実行しました。",
          { duration: 5000 }
        );
      }

      // 突合完了の通知
      toast.success("突合処理が完了しました");
    },
    onError: (error) => {
      toast.error("突合処理に失敗しました");
    },
  });

  return {
    reconcile: reconcileMutation.mutate,
    isLoading: reconcileMutation.isPending,
  };
}
```

### 6.2 手動取得ボタンの拡張

**ファイル:** `frontend/src/features/sap-integration/components/DataFetchTab.tsx`（軽微な拡張）

```typescript
const handleFetch = async () => {
  try {
    const result = await fetchMaterials({
      kunnr_f: kunnrFrom,
      kunnr_t: kunnrTo,
      connection_id: selectedConnectionId,
    });

    // 削除件数の表示（NEW）
    if (result.deleted_count > 0) {
      toast.success(
        `SAPデータを取得しました（取得: ${result.record_count}件、削除: ${result.deleted_count}件）`,
        { duration: 5000 }
      );
    } else {
      toast.success(`SAPデータを取得しました（${result.record_count}件）`);
    }

    // キャッシュ一覧を更新
    refetchCache();
  } catch (error) {
    toast.error("SAPデータの取得に失敗しました");
  }
};
```

### 6.3 キャッシュステータス表示（オプション）

**ファイル:** `frontend/src/features/sap-integration/components/CacheStatusBadge.tsx`（新規作成）

```typescript
interface CacheStatusBadgeProps {
  kunnr: string;
  connectionId?: number;
}

export function CacheStatusBadge({ kunnr, connectionId }: CacheStatusBadgeProps) {
  const { data: status } = useQuery({
    queryKey: ["sapCacheStatus", kunnr, connectionId],
    queryFn: () => getSapCacheStatus(kunnr, connectionId),
    refetchInterval: 60000, // 1分ごとに更新
  });

  if (!status?.exists) {
    return (
      <Badge variant="destructive">
        キャッシュなし
      </Badge>
    );
  }

  if (status.is_stale) {
    return (
      <Badge variant="warning">
        古いキャッシュ（{status.age_hours.toFixed(1)}時間前）
      </Badge>
    );
  }

  return (
    <Badge variant="success">
      最新（{status.age_hours.toFixed(1)}時間前）
    </Badge>
  );
}
```

---

## 7. テスト計画

### 7.1 単体テスト（Backend）

#### テストケース1: キャッシュが新鮮な場合、再取得しない

```python
def test_cache_fresh_no_refresh(db_session):
    """24時間以内のキャッシュは再取得されない"""
    # Setup: 2時間前のキャッシュを作成
    create_sap_cache(
        db_session,
        kunnr="100427105",
        fetched_at=datetime.utcnow() - timedelta(hours=2)
    )

    cache_manager = SapCacheManager(db_session)

    # Execute
    is_stale = cache_manager.is_cache_stale("100427105")

    # Assert
    assert is_stale is False
```

#### テストケース2: キャッシュが古い場合、再取得する

```python
def test_cache_stale_triggers_refresh(db_session):
    """25時間前のキャッシュは再取得される"""
    # Setup: 25時間前のキャッシュを作成
    create_sap_cache(
        db_session,
        kunnr="100427105",
        fetched_at=datetime.utcnow() - timedelta(hours=25)
    )

    cache_manager = SapCacheManager(db_session)

    # Execute
    is_stale = cache_manager.is_cache_stale("100427105")

    # Assert
    assert is_stale is True
```

#### テストケース3: 洗い替え（古いデータ削除）

```python
def test_fetch_replaces_old_cache(db_session):
    """新データ取得時に古いデータが削除される"""
    # Setup: 古いキャッシュを作成
    old_cache = create_sap_cache(
        db_session,
        kunnr="100427105",
        zkdmat_b="OLD-001",
        fetch_batch_id="old_batch"
    )

    material_service = SapMaterialService(db_session)

    # Execute: 新データを取得（OLD-001は含まれない）
    result = material_service.fetch_and_cache_materials(
        kunnr_f="100427105",
        kunnr_t="100427105"
    )

    # Assert: 古いデータが削除されている
    assert result["deleted_count"] > 0
    old_data = db_session.query(SapMaterialCache).filter_by(
        zkdmat_b="OLD-001"
    ).first()
    assert old_data is None
```

#### テストケース4: 取得失敗時は古いキャッシュを保持

```python
def test_fetch_failure_preserves_old_cache(db_session, monkeypatch):
    """取得失敗時は古いキャッシュを削除しない"""
    # Setup: 古いキャッシュを作成
    old_cache = create_sap_cache(
        db_session,
        kunnr="100427105",
        fetched_at=datetime.utcnow() - timedelta(hours=25)
    )

    # RFC呼び出しを失敗させる
    def mock_rfc_error(*args, **kwargs):
        raise pyrfc.CommunicationError("Connection failed")

    monkeypatch.setattr("app.services.sap.sap_material_service._call_rfc", mock_rfc_error)

    reconciliation_service = SapReconciliationService(db_session)

    # Execute: 自動再取得（失敗するはず）
    result = reconciliation_service.reconcile_with_auto_refresh(
        task_ids=["task_001"],
        kunnr="100427105"
    )

    # Assert: 古いキャッシュが残っている
    assert db_session.query(SapMaterialCache).filter_by(
        kunnr="100427105"
    ).count() > 0
```

### 7.2 統合テスト

#### シナリオ1: 初回アクセス時の自動再取得フロー

1. キャッシュが存在しない状態で突合処理を開始
2. `is_cache_stale()` が `True` を返す
3. 自動的に `fetch_and_cache_materials()` が呼ばれる
4. SAPからデータ取得（RFC呼び出し）
5. キャッシュに保存
6. 突合処理を実行
7. レスポンスに `cache_status.auto_refreshed: true` が含まれる

#### シナリオ2: 24時間経過後の自動再取得フロー

1. 25時間前のキャッシュが存在する
2. 突合処理を開始
3. `is_cache_stale()` が `True` を返す
4. 自動的に `fetch_and_cache_materials()` が呼ばれる
5. 新データを取得してUpsert
6. **古い `fetch_batch_id` のデータを削除**
7. 突合処理を実行

#### シナリオ3: 取得失敗時のフェイルセーフ

1. 25時間前のキャッシュが存在する
2. 突合処理を開始
3. `is_cache_stale()` が `True` を返す
4. 自動的に `fetch_and_cache_materials()` が呼ばれる
5. RFC接続エラーが発生
6. **古いキャッシュは削除されない**
7. 古いキャッシュを使用して突合処理を実行
8. レスポンスに `cache_status.refresh_failed: true` が含まれる
9. ユーザーに警告トーストを表示

### 7.3 E2Eテスト（Frontend）

#### シナリオ1: 手動取得ボタンで洗い替え

1. SAP連携ページの「データ取得」タブを開く
2. 得意先コードを入力
3. 「SAPから取得」ボタンをクリック
4. 成功トーストに「取得: 150件、削除: 120件」と表示
5. キャッシュ一覧が更新される
6. `fetched_at` が現在時刻になっている

#### シナリオ2: 突合処理での自動再取得通知

1. OCR結果ページで「SAP連携」ボタンをクリック
2. ローディング表示（自動再取得中）
3. 情報トースト「SAPキャッシュを自動更新しました（150件）」
4. 成功トースト「突合処理が完了しました」
5. 突合結果が表示される

---

## 8. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| RFC呼び出しタイムアウト | High | タイムアウト設定（30秒）、フェイルセーフ（古いキャッシュ使用） |
| 初回アクセスの遅延 | Medium | ローディング表示、バックグラウンドジョブの導入（将来） |
| 洗い替え時のデータ損失 | High | トランザクション保護、取得成功後のみ削除 |
| キャッシュ判定の誤動作 | Medium | タイムゾーン統一（UTC）、インデックス最適化 |
| 並行アクセス時の競合 | Low | 楽観的ロック（`fetch_batch_id`による一意性保証） |

---

## 9. 実装チェックリスト

### 9.1 バックエンド

- [ ] **SapCacheManager実装** (`sap_cache_manager.py`)
  - [ ] `is_cache_stale()` メソッド
  - [ ] 有効期限判定ロジック（24時間）
  - [ ] タイムゾーン統一（UTC）

- [ ] **SapMaterialService拡張** (`sap_material_service.py`)
  - [ ] `trigger` パラメータ追加（"manual"/"auto"）
  - [ ] 洗い替えロジック（古い `fetch_batch_id` の削除）
  - [ ] トランザクション保護
  - [ ] ロギング強化（削除件数、トリガー種別）

- [ ] **SapReconciliationService拡張** (`sap_reconciliation_service.py`)
  - [ ] `reconcile_with_auto_refresh()` メソッド
  - [ ] 突合前のキャッシュ鮮度チェック
  - [ ] 自動再取得トリガー
  - [ ] フェイルセーフ（取得失敗時の処理）

- [ ] **APIルーター拡張** (`sap_router.py`)
  - [ ] `POST /reconcile` の内部ロジックを `reconcile_with_auto_refresh()` に変更
  - [ ] レスポンスに `cache_status` フィールドを追加
  - [ ] `POST /materials/fetch` のレスポンスに `deleted_count` を追加
  - [ ] （オプション）`GET /cache/status` エンドポイント追加

- [ ] **スキーマ拡張** (`sap_schema.py`)
  - [ ] `SapReconcileResponse` に `cache_status` フィールド追加
  - [ ] `SapMaterialFetchResponse` に `deleted_count` フィールド追加
  - [ ] （オプション）`SapCacheStatusResponse` 作成

- [ ] **テスト** (`test_sap_cache_manager.py`, `test_sap_material_service.py`)
  - [ ] キャッシュ鮮度判定テスト
  - [ ] 洗い替えテスト
  - [ ] フェイルセーフテスト
  - [ ] 自動再取得トリガーテスト

### 9.2 フロントエンド

- [ ] **API Client拡張** (`api.ts`)
  - [ ] `reconcileOcrResults` のレスポンス型に `cache_status` 追加
  - [ ] `fetchMaterials` のレスポンス型に `deleted_count` 追加
  - [ ] （オプション）`getSapCacheStatus` 関数追加

- [ ] **React Query Hook拡張** (`useSapReconciliation.ts`)
  - [ ] 自動再取得の通知トースト
  - [ ] 再取得失敗の警告トースト

- [ ] **UI コンポーネント拡張**
  - [ ] `DataFetchTab.tsx` - 削除件数の表示
  - [ ] （オプション）`CacheStatusBadge.tsx` - キャッシュステータス表示

- [ ] **型定義更新**
  - [ ] `make frontend-typegen` 実行（OpenAPI型再生成）

### 9.3 品質チェック

- [ ] **Backend**
  - [ ] `make backend-lint-fix` 実行
  - [ ] `make backend-format` 実行
  - [ ] `make backend-test` 実行（全テストパス）

- [ ] **Frontend**
  - [ ] `make frontend-lint-fix` 実行
  - [ ] `make frontend-format` 実行
  - [ ] `make frontend-typecheck` 実行（0 errors）

- [ ] **統合テスト**
  - [ ] 初回アクセス時の自動再取得確認
  - [ ] 24時間経過後の自動再取得確認
  - [ ] 取得失敗時のフェイルセーフ確認
  - [ ] 洗い替えの動作確認

---

## 10. 今後の拡張案

### 10.1 バックグラウンドジョブによる定期更新

**概要:** 夜間バッチで全得意先のキャッシュを更新

**実装方式:**
- **Celeryタスク:** `/backend/app/tasks/sap_cache_refresh_task.py`
- **スケジュール:** 毎日AM 0:00に実行（Celery Beat）
- **処理内容:**
  ```python
  # 全得意先コードを取得
  kunnr_list = db.query(distinct(ShippingMasterCurated.jiku_code)).all()

  # 各得意先のキャッシュを更新
  for kunnr in kunnr_list:
      try:
          material_service.fetch_and_cache_materials(
              kunnr_f=kunnr,
              kunnr_t=kunnr,
              trigger="scheduled"
          )
      except Exception as exc:
          logger.error(f"Failed to refresh cache for {kunnr}: {exc}")
  ```

**メリット:**
- 初回アクセス時の遅延がなくなる
- 常に最新のキャッシュを保証

### 10.2 差分更新モード

**概要:** 洗い替えではなく、変更されたデータのみ更新

**実装方式:**
- SAPレスポンスにタイムスタンプフィールドがあれば、それを基準に差分更新
- 現在のRFCインターフェース `Z_SCM1_RFC_MATERIAL_DOWNLOAD` がタイムスタンプを返すか確認が必要

**メリット:**
- データ転送量の削減
- 更新処理の高速化

### 10.3 キャッシュウォーミング

**概要:** システム起動時に主要な得意先のキャッシュをプリロード

**実装方式:**
- アプリ起動時に、過去1週間でアクセス頻度の高い得意先コードを取得
- バックグラウンドでキャッシュを更新

**メリット:**
- 初回アクセスの遅延を最小化

---

## 11. 参考資料

- **現行コード:**
  - `backend/app/infrastructure/persistence/models/sap_models.py:1-150`
  - `backend/app/application/services/sap/sap_material_service.py:1-487`
  - `backend/app/application/services/sap/sap_reconciliation_service.py:164-191`
  - `backend/app/presentation/api/routes/integration/sap_router.py:158-273`
  - `frontend/src/features/sap-integration/components/DataFetchTab.tsx`

- **関連ドキュメント:**
  - `CLAUDE.md` - Logging Guidelines
  - `CLAUDE.md` - Error Handling Guidelines
  - `docs/standards/security.md`

- **関連機能:**
  - OCR-SAP突合機能（実装済み）
  - SAPキャッシュ手動取得（実装済み）
  - SAPキャッシュクリア（実装済み）

---

## 12. 変更履歴

| バージョン | 日付 | 著者 | 変更内容 |
|------------|------|------|----------|
| 1.0 | 2026-02-03 | Claude | 初版作成 |

---

**End of Document**
