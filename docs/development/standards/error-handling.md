# Error Handling Standards

**作成日:** 2026-01-30
**最終更新:** 2026-01-30

---

## 概要

本ドキュメントは、ロット管理システムにおけるエラー処理とログ出力の標準パターンを定義します。
一貫性のあるエラー処理により、デバッグ性・可観測性を向上させ、運用トラブルシューティングを効率化します。

---

## 1. 例外階層

### 1.1 基底クラス

```python
from app.domain.errors import DomainError

class DomainError(Exception):
    """Base exception for all domain-specific errors."""
    default_code = "DOMAIN_ERROR"

    def __init__(self, message: str, code: str | None = None, details: dict | None = None):
        self.message = message
        self.code = code or self.default_code
        self.details = details or {}
        super().__init__(self.message)
```

### 1.2 ドメイン別例外クラス

| ドメイン | 例外クラス | HTTPステータス |
|---------|-----------|---------------|
| Order | `OrderNotFoundError` | 404 |
| Order | `OrderLockedError` | 409 |
| Order | `DuplicateOrderError` | 409 |
| Lot | `LotNotFoundError` | 404 |
| Lot | `InsufficientLotStockError` | 400 |
| Lot | `ExpiredLotError` | 400 |
| Allocation | `AllocationNotFoundError` | 404 |
| Allocation | `AllocationCommitError` | 400 |
| Allocation | `InsufficientStockError` | 409 |
| Common | `InsufficientStockError` | 400 |

### 1.3 新しい例外クラスの作成方法

```python
from app.domain.errors import DomainError

class MyDomainError(DomainError):
    """説明を記載."""
    default_code = "MY_DOMAIN_ERROR"

    def __init__(self, entity_id: int, *, details: dict | None = None):
        self.entity_id = entity_id

        message = f"エンティティ {entity_id} でエラーが発生しました"

        error_details: dict = details.copy() if details else {}
        error_details["entity_id"] = entity_id

        super().__init__(message, code=self.default_code, details=error_details)
```

**重要:** 新しい例外クラスを作成したら、`app/core/errors.py` の `DOMAIN_EXCEPTION_MAP` にHTTPステータスマッピングを追加してください。

---

## 2. try-except パターン

### 2.1 基本パターン（推奨）

```python
import logging

logger = logging.getLogger(__name__)

def some_operation(db: Session, entity_id: int) -> Entity:
    """操作を実行."""
    logger.info("Starting operation", extra={"entity_id": entity_id})

    try:
        result = perform_action(db, entity_id)
        logger.info("Operation completed", extra={"entity_id": entity_id, "result_id": result.id})
        return result
    except DomainError:
        # ドメイン例外はそのまま再送出（グローバルハンドラが処理）
        raise
    except SQLAlchemyError as e:
        logger.error(
            "Database error during operation",
            extra={"entity_id": entity_id, "error": str(e)},
            exc_info=True,
        )
        raise DomainError("データベースエラーが発生しました") from e
```

### 2.2 べき等（Idempotent）パターン

API再試行時の重複処理を防ぐパターン：

```python
def confirm_reservation(db: Session, reservation_id: int) -> Reservation:
    reservation = db.get(Reservation, reservation_id)
    if not reservation:
        raise AllocationNotFoundError(f"Reservation {reservation_id} not found")

    # Idempotent: 既に確定済みの場合は成功扱い
    if reservation.status == ReservationStatus.CONFIRMED:
        logger.debug(
            "Reservation already confirmed (idempotent)",
            extra={"reservation_id": reservation_id},
        )
        return reservation

    # 通常の処理...
```

### 2.3 バッチ処理パターン（部分失敗許容）

```python
def bulk_operation(db: Session, ids: list[int]) -> tuple[list[int], list[dict]]:
    """複数アイテムを一括処理（部分失敗許容）."""
    logger.info("Starting bulk operation", extra={"item_count": len(ids)})

    succeeded: list[int] = []
    failed: list[dict] = []

    for item_id in ids:
        try:
            process_item(db, item_id, commit_db=False)
            succeeded.append(item_id)
        except DomainError as e:
            logger.warning(
                "Item processing failed",
                extra={"item_id": item_id, "error": str(e)},
            )
            failed.append({"id": item_id, "error": e.code, "message": str(e)})

    if succeeded:
        db.commit()

    logger.info(
        "Bulk operation completed",
        extra={"succeeded_count": len(succeeded), "failed_count": len(failed)},
    )

    return succeeded, failed
```

### 2.4 アンチパターン（禁止）

#### 2.4.1 サイレント例外（絶対禁止）

```python
# ❌ 禁止: 例外を完全に無視
try:
    do_something()
except Exception:
    pass

# ✅ 正しい: 最低限ログを出力
try:
    do_something()
except ExpectedError:
    logger.debug("Expected error occurred, continuing", exc_info=True)
```

#### 2.4.2 広すぎる例外キャッチ

```python
# ❌ 禁止: 全ての例外をキャッチしてログのみ
try:
    critical_operation()
except Exception as e:
    logger.error(f"Error: {e}")
    # 処理を続行...

# ✅ 正しい: 特定の例外のみキャッチ、または再送出
try:
    critical_operation()
except ValueError as e:
    logger.error("Validation failed", extra={"error": str(e)})
    raise DomainError("入力値が不正です") from e
```

---

## 3. ログ出力パターン

### 3.1 ログレベルの使い分け

| レベル | 用途 | 例 |
|--------|------|-----|
| `DEBUG` | 開発時のデバッグ情報 | 変数値、処理ステップ |
| `INFO` | 正常な業務イベント | 引当完了、予約作成 |
| `WARNING` | 軽微な問題、期待どおりでない状態 | リトライ、スキップ |
| `ERROR` | エラー（処理継続可能） | 外部API失敗、部分失敗 |
| `CRITICAL` | 致命的エラー（システム停止レベル） | DB接続不可 |

### 3.2 構造化ログの書き方

```python
# ✅ 推奨: extra引数でコンテキスト情報を渡す
logger.info(
    "Reservation created",
    extra={
        "reservation_id": reservation.id,
        "lot_id": lot.id,
        "quantity": float(quantity),
        "order_line_id": order_line_id,
    },
)

# ❌ 非推奨: f-stringで情報を埋め込む
logger.info(f"Reservation {reservation.id} created for lot {lot.id}, qty={quantity}")
```

### 3.3 レイヤー別ログ指針

#### Repository層

```python
class LotRepository:
    def find_by_id(self, lot_id: int) -> LotReceipt | None:
        logger.debug("Finding lot by ID", extra={"lot_id": lot_id})
        lot = self.db.get(LotReceipt, lot_id)
        if lot:
            logger.debug("Lot found", extra={"lot_id": lot_id, "lot_number": lot.lot_number})
        else:
            logger.debug("Lot not found", extra={"lot_id": lot_id})
        return lot

    def create(self, lot: LotReceipt) -> LotReceipt:
        logger.info(
            "Creating lot",
            extra={"lot_number": lot.lot_number, "product_group_id": lot.product_group_id},
        )
        self.db.add(lot)
        self.db.flush()
        logger.info("Lot created", extra={"lot_id": lot.id, "lot_number": lot.lot_number})
        return lot
```

#### Service層

```python
class AllocationService:
    def allocate(self, order_line_id: int) -> list[Reservation]:
        logger.info("Starting allocation", extra={"order_line_id": order_line_id})

        # 候補取得
        candidates = self.get_candidates(order_line_id)
        logger.debug(
            "Candidates retrieved",
            extra={"order_line_id": order_line_id, "candidate_count": len(candidates)},
        )

        # 引当実行
        for candidate in candidates:
            if self.can_allocate(candidate):
                reservation = self.create_reservation(candidate)
                logger.info(
                    "Lot allocated",
                    extra={
                        "order_line_id": order_line_id,
                        "lot_id": candidate.lot_id,
                        "quantity": float(reservation.reserved_qty),
                    },
                )

        logger.info(
            "Allocation completed",
            extra={"order_line_id": order_line_id, "reservation_count": len(reservations)},
        )
        return reservations
```

#### トランザクション境界

```python
class UnitOfWork:
    def commit(self) -> None:
        logger.debug("Transaction committing")
        try:
            self.session.commit()
            logger.debug("Transaction committed")
        except SQLAlchemyError as e:
            logger.warning(
                "Transaction rolled back due to exception",
                extra={"error": str(e)},
                exc_info=True,
            )
            self.session.rollback()
            raise
```

### 3.4 機密情報のマスキング

```python
# ✅ 正しい: 機密情報をマスク
def _mask_database_url(db_url: str) -> str:
    if "@" in db_url:
        protocol, rest = db_url.split("://", 1)
        auth, location = rest.split("@", 1)
        user, _ = auth.split(":", 1)
        return f"{protocol}://{user}:****@{location}"
    return db_url

logger.info(f"Database: {_mask_database_url(settings.DATABASE_URL)}")

# ❌ 禁止: 機密情報を平文でログ出力
logger.info(f"Database: {settings.DATABASE_URL}")  # パスワードが漏洩
```

---

## 4. HTTPレスポンス形式

### 4.1 Problem+JSON (RFC 7807)

全てのエラーレスポンスはRFC 7807 Problem+JSON形式を使用：

```json
{
  "type": "about:blank",
  "title": "InsufficientStockError",
  "status": 400,
  "detail": "ロット ABC123 の在庫が不足しています (必要: 100, 利用可能: 50)",
  "instance": "/api/allocations/123",
  "error_code": "INSUFFICIENT_STOCK",
  "details": {
    "lot_id": 456,
    "lot_number": "ABC123",
    "required": 100,
    "available": 50
  }
}
```

### 4.2 グローバル例外ハンドラ

`app/core/errors.py` で定義されたグローバルハンドラが全例外を処理：

1. **DomainError**: `DOMAIN_EXCEPTION_MAP` に基づきHTTPステータスを決定
2. **HTTPException**: Starlette標準の処理
3. **RequestValidationError**: 422 Unprocessable Entity
4. **Exception**: 500 Internal Server Error（詳細はログのみ）

---

## 5. フロントエンドエラー処理

### 5.1 集中エラー処理（http-client）

```typescript
// shared/api/http-client.ts
const http = ky.create({
  hooks: {
    afterResponse: [
      async (request, options, response) => {
        if (!response.ok) {
          const error = await response.json();
          // Problem+JSON形式のエラーを処理
          if (error.error_code === "INSUFFICIENT_STOCK") {
            toast.error(`在庫不足: ${error.detail}`);
          }
        }
      },
    ],
  },
});
```

### 5.2 ユーザー通知

```typescript
// ✅ 推奨: エラー時にユーザーに通知
try {
  await api.createOrder(data);
  toast.success("受注を作成しました");
} catch (error) {
  console.error("Order creation failed:", error);
  toast.error("受注の作成に失敗しました");
}

// ❌ 禁止: console.errorのみでユーザーに通知なし
try {
  await api.createOrder(data);
} catch (error) {
  console.error("Order creation failed:", error);
  // ユーザーには何も表示されない
}
```

---

## 6. チェックリスト

新しいコードを書く際は以下を確認：

- [ ] 適切な例外クラスを使用しているか（DomainError派生）
- [ ] 例外にはerror_codeとdetailsを設定しているか
- [ ] try-exceptで特定の例外のみキャッチしているか
- [ ] サイレント例外（except: pass）がないか
- [ ] 重要な操作にINFOレベルのログがあるか
- [ ] エラー時にWARNING/ERRORレベルのログがあるか
- [ ] ログにextra引数でコンテキスト情報を渡しているか
- [ ] 機密情報がログに平文で出力されていないか
- [ ] フロントエンドでエラー時にユーザー通知があるか

---

## 関連ファイル

- `backend/app/domain/errors.py` - 基底例外クラス
- `backend/app/core/errors.py` - グローバル例外ハンドラ
- `backend/app/core/logging.py` - 構造化ログ設定
- `frontend/src/shared/api/http-client.ts` - HTTP クライアント
