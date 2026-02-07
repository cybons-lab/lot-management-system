# backend/app/domain/allocation/exceptions.py
"""引当ドメインの例外定義.

【設計意図】引当例外設計の設計判断:

1. なぜドメイン固有の例外を定義するのか
   理由: 引当処理のエラーを明確に分類
   階層:
   - DomainError（基底）
   → ValidationError, NotFoundError, ConflictError 等（具体的なエラー）
   メリット:
   - 呼び出し側でエラーの種類を特定可能
   - HTTPステータスコードへのマッピングが明確
   - エラーハンドリングが統一される

2. ValidationError の設計（L11-15）
   理由: 引当パラメータの検証エラー
   用途:
   - 数量が負数
   - 必須パラメータ欠如
   - 不正な引当タイプ
   エラーコード: "VALIDATION_ERROR"
   HTTPマッピング: 422 Unprocessable Entity
   使用例:
   ```python
   if quantity <= 0:
       raise ValidationError("Quantity must be positive")
   ```

3. NotFoundError の設計（L18-23）
   理由: リソースが存在しないエラー
   パラメータ:
   - resource: リソース名（"Allocation", "Lot" 等）
   - identifier: ID or コード
   メッセージ例: "Allocation not found: 123"
   エラーコード: "NOT_FOUND"
   HTTPマッピング: 404 Not Found
   汎用性:
   - 引当、ロット、受注など様々なリソースに対応
   → 1つのクラスで複数のユースケースをカバー

4. ConflictError の設計（L26-30）
   理由: リソースの競合状態を表現
   用途:
   - 同時実行での競合
   - 既に処理済みのリソースへの操作
   - 在庫不足（別のユーザーが先に引当）
   エラーコード: "CONFLICT"
   HTTPマッピング: 409 Conflict
   業務シナリオ:
   - ユーザーAが在庫を引当中
   - ユーザーBも同じ在庫を引当しようとする
   → ConflictError("Stock already allocated")

5. InvalidTransitionError の設計（L33-38）
   理由: 状態遷移違反を検出
   パラメータ:
   - from_state: 現在の状態
   - to_state: 遷移先の状態
   メッセージ例: "Invalid transition: confirmed -> draft"
   エラーコード: "INVALID_TRANSITION"
   業務ルール:
   - draft → reserved → confirmed（正常）
   - confirmed → draft（不正）
   → InvalidTransitionError("confirmed", "draft")
   メリット:
   - 状態遷移ルール違反を明示的にエラー化
   - デバッグが容易（どの遷移が不正か明確）

6. AlreadyAllocatedError の設計（L41-46）
   理由: 二重処理の防止
   用途:
   - 既に確定済みの引当を再度確定しようとした
   - 既にキャンセル済みの引当を変更しようとした
   エラーコード: "ALREADY_ALLOCATED"
   HTTPマッピング: 409 Conflict
   業務保護:
   - 同じ引当を2回確定 → 在庫が二重に減る
   → AlreadyAllocatedError でブロック
   使用例:
   ```python
   if allocation.status == "confirmed":
       raise AlreadyAllocatedError(allocation.id)
   ```

7. InsufficientStockError の再エクスポート（L5-8）
   理由: 後方互換性の維持
   背景:
   - 以前: allocation/exceptions.py で定義
   - 現在: domain/errors.py に統合（共通エラー）
   → 既存コードが動作するよう再エクスポート
   将来的な改善:
   - 段階的に domain/errors.py からのインポートに移行
   - この再エクスポートは deprecated として削除予定

8. エラーコードの命名規則
   理由: フロントエンドでの識別を容易にする
   規則:
   - UPPER_SNAKE_CASE
   - 具体的な名前（"NOT_FOUND" vs "ERROR"）
   用途:
   - フロントエンドでエラーコードを判定
   ```typescript
   if (error.code === "ALREADY_ALLOCATED") {
       showMessage("この引当は既に処理済みです");
   }
   ```

9. なぜメッセージを英語にするのか
   理由: ログ・監査の標準化
   設計:
   - メッセージ: 英語（開発者向け、ログ用）
   - エラーコード: UPPER_SNAKE_CASE（システム用）
   - UI表示: 日本語（フロントエンドで変換）
   メリット:
   - ログ分析が容易（英語で統一）
   - 多言語対応が可能（エラーコードベース）

10. DomainError 継承の意義
    理由: 引当エラーの一括ハンドリング
    階層:
    - Exception（Python標準）
    → DomainError（アプリ共通）
    → ValidationError, NotFoundError 等（引当固有）
    一括キャッチ:
    ```python
    try:
        allocation_service.confirm(allocation_id)
    except DomainError as e:
        # 全てのドメインエラーをキャッチ
        logger.error(f"Domain error: {e.code}")
        return JSONResponse(status_code=400, content={"error": e.code})
    ```
"""

# Re-export consolidated InsufficientStockError for backward compatibility
from app.domain.errors import (
    DomainError,
    InsufficientStockError,
)


__all__ = [
    "AlreadyAllocatedError",
    "ConflictError",
    "DomainError",
    "InsufficientStockError",
    "InvalidTransitionError",
    "NotFoundError",
    "ValidationError",
]


class ValidationError(DomainError):
    """バリデーションエラー."""

    def __init__(self, message: str):
        super().__init__(message, code="VALIDATION_ERROR")


class NotFoundError(DomainError):
    """リソース不在エラー."""

    def __init__(self, resource: str, identifier: str | int):
        message = f"{resource} not found: {identifier}"
        super().__init__(message, code="NOT_FOUND")


class ConflictError(DomainError):
    """競合エラー."""

    def __init__(self, message: str):
        super().__init__(message, code="CONFLICT")


class InvalidTransitionError(DomainError):
    """不正な状態遷移エラー."""

    def __init__(self, from_state: str, to_state: str):
        message = f"Invalid transition: {from_state} -> {to_state}"
        super().__init__(message, code="INVALID_TRANSITION")


class AlreadyAllocatedError(DomainError):
    """既に引当済みエラー."""

    def __init__(self, allocation_id: int):
        message = f"Allocation {allocation_id} is already processed"
        super().__init__(message, code="ALREADY_ALLOCATED")
