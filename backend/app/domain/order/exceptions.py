# backend/app/domain/order/exceptions.py
"""受注ドメインの例外定義.

【設計意図】ドメイン例外設計の設計判断:

1. なぜドメイン固有の例外を定義するのか
   理由: エラーの文脈を明確にする
   階層:
   - Exception（Python標準）
   → DomainError（アプリケーション共通）
   → OrderDomainError（受注ドメイン固有）
   → OrderNotFoundError, InvalidOrderStatusError 等（具体的なエラー）
   メリット:
   - 呼び出し側でエラーの種類を特定可能
   - エラーハンドリングが明確（except OrderNotFoundError:）
   - ドメイン知識をエラーに反映

2. 基底クラス OrderDomainError の設計（L9-23）
   理由: 受注ドメイン全体で共通の処理を集約
   共通処理:
   - default_code: エラーコード（"ORDER_ERROR"）
   - details: 詳細情報（dict）
   メリット:
   - 全ての受注エラーを catch OrderDomainError でキャッチ可能
   - APIレスポンスで統一されたエラー形式を返せる
   使用例:
   ```python
   try:
       order_service.create_order(...)
   except OrderDomainError as e:
       return {"error": e.code, "message": str(e), "details": e.details}
   ```

3. details パラメータの設計（L20, L35）
   理由: エラーの詳細情報を構造化
   例: OrderNotFoundError
   - message: "Order not found: 123"（人間向け）
   - details: {"order_id": 123}（機械向け）
   業務的意義:
   - APIレスポンスで詳細情報をJSON形式で返せる
   → フロントエンドで適切なエラーメッセージを表示
   使用例:
   ```json
   {
     "error": "ORDER_NOT_FOUND",
     "message": "Order not found: 123",
     "details": {"order_id": 123}
   }
   ```

4. OrderNotFoundError の設計（L25-35）
   理由: 受注が存在しないエラーを明確に表現
   業務シナリオ:
   - ユーザーが削除済み受注を開こうとした
   - URLに存在しないIDが指定された
   → 404 Not Found を返す根拠
   エラーコード:
   - "ORDER_NOT_FOUND" → フロントエンドで「受注が見つかりません」と表示

5. InvalidOrderStatusError の設計（L55-70）
   理由: 状態遷移違反を検出
   業務ロジック:
   - draft → open → allocated → shipped → closed
   - 例: shipped 状態の受注を削除しようとした
   → InvalidOrderStatusError("shipped", "delete")
   メリット:
   - 不正な操作を事前に防止
   - エラーメッセージに現在の状態と操作を含める
   → ユーザーに「出荷済みの受注は削除できません」と明示

6. DuplicateOrderError の設計（L73-87）
   理由: 受注番号の重複を検出
   業務ルール:
   - 受注番号は一意（UNIQUE制約）
   - 例: 同じ受注番号で2回登録しようとした
   → DuplicateOrderError("ORD-2024-001")
   データベースエラーとの関係:
   - DB: IntegrityError（技術的エラー）
   → Service層で DuplicateOrderError に変換（業務的エラー）
   → ユーザーに「受注番号が重複しています」と表示

7. OrderValidationError の設計（L90-100）
   理由: 汎用的なバリデーションエラー
   用途:
   - 数量が負数
   - 納期が過去
   - 必須項目が未入力
   → 具体的なエラークラスを作るほどではない場合
   使用例:
   ```python
   if quantity <= 0:
       raise OrderValidationError(
           "Quantity must be positive",
           details={"quantity": quantity}
       )
   ```

8. ProductNotFoundError の設計（L103-117）
   理由: 受注明細で指定された製品が存在しない
   業務シナリオ:
   - ユーザーが存在しない製品コードを入力
   - マスタから製品が削除された後、古いデータを参照
   → ProductNotFoundError("PROD-9999")
   エラーコード:
   - "PRODUCT_NOT_FOUND" → フロントエンドで「製品が見つかりません」

9. OrderLockedError の設計（L120-136）
   理由: 排他制御（楽観的ロック）のエラー
   業務シナリオ:
   - ユーザーAが受注を編集中
   - ユーザーBも同じ受注を開こうとした
   → OrderLockedError(123, "ユーザーA", "2024-12-01 10:30")
   メリット:
   - データの整合性保証
   - ユーザーに「別のユーザーが編集中です」と明示
   詳細情報:
   - locked_by: 誰がロックしているか
   - locked_at: いつロックしたか
   → フロントエンドで「ユーザーAが10:30からロック中」と表示

10. OrderLockOwnershipError の設計（L139-153）
    理由: ロック解放権限のチェック
    業務ルール:
    - ロックを解放できるのは、ロックした本人のみ
    - 管理者は強制解放可能（将来実装）
    エラーシナリオ:
    - ユーザーBがユーザーAのロックを解放しようとした
    → OrderLockOwnershipError(123, user_id=2, locked_by=1)
    メリット:
    - セキュリティ: 他人のロックを勝手に解放できない
    - 監査: 誰が解放しようとしたか記録
"""

from datetime import datetime

from app.domain.errors import DomainError


class OrderDomainError(DomainError):
    """受注ドメイン層の基底例外."""

    default_code = "ORDER_ERROR"

    def __init__(self, message: str, code: str | None = None, details: dict | None = None):
        """初期化.

        Args:
            message: エラーメッセージ
            code: エラーコード
            details: 詳細情報
        """
        super().__init__(message, code=code or self.default_code, details=details)


class OrderNotFoundError(OrderDomainError):
    """受注不在エラー."""

    def __init__(self, order_id: int):
        """初期化.

        Args:
            order_id: 見つからなかった受注ID
        """
        message = f"Order not found: {order_id}"
        super().__init__(message, code="ORDER_NOT_FOUND", details={"order_id": order_id})


class OrderLineNotFoundError(OrderDomainError):
    """受注明細不在エラー."""

    def __init__(self, order_line_id: int):
        """初期化.

        Args:
            order_line_id: 見つからなかった受注明細ID
        """
        message = f"OrderLine not found: {order_line_id}"
        super().__init__(
            message,
            code="ORDER_LINE_NOT_FOUND",
            details={"order_line_id": order_line_id},
        )


class InvalidOrderStatusError(OrderDomainError):
    """不正な受注ステータスエラー."""

    def __init__(self, current_status: str, operation: str):
        """初期化.

        Args:
            current_status: 現在のステータス
            operation: 実行しようとした操作
        """
        message = f"Cannot {operation} order with status: {current_status}"
        super().__init__(
            message,
            code="INVALID_ORDER_STATUS",
            details={"current_status": current_status, "operation": operation},
        )


class DuplicateOrderError(OrderDomainError):
    """重複受注エラー."""

    def __init__(self, order_no: str):
        """初期化.

        Args:
            order_no: 重複した受注番号
        """
        message = f"Order already exists: {order_no}"
        super().__init__(
            message,
            code="DUPLICATE_ORDER",
            details={"order_no": order_no},
        )


class OrderValidationError(OrderDomainError):
    """受注バリデーションエラー."""

    def __init__(self, message: str, details: dict | None = None):
        """初期化.

        Args:
            message: エラーメッセージ
            details: 詳細情報
        """
        super().__init__(message, code="ORDER_VALIDATION_ERROR", details=details)


class ProductNotFoundError(OrderDomainError):
    """製品が存在しない場合のエラー."""

    def __init__(self, product_code: str):
        """初期化.

        Args:
            product_code: 見つからなかった製品コード
        """
        message = f"Product not found: {product_code}"
        super().__init__(
            message,
            code="PRODUCT_NOT_FOUND",
            details={"product_code": product_code},
        )


class OrderLockedError(OrderDomainError):
    """受注が別ユーザーによってロックされている場合のエラー."""

    def __init__(self, order_id: int, locked_by_user_name: str, locked_at: datetime | None):
        """初期化."""
        formatted_locked_at = locked_at.isoformat() if locked_at else None

        message = f"Order {order_id} is locked by {locked_by_user_name}"
        super().__init__(
            message,
            code="LOCKED_BY_ANOTHER_USER",
            details={
                "order_id": order_id,
                "locked_by": locked_by_user_name,
                "locked_at": formatted_locked_at,
            },
        )


class OrderLockOwnershipError(OrderDomainError):
    """ロック解放権限がない場合のエラー."""

    def __init__(self, order_id: int, current_user_id: int, locked_by_user_id: int | None):
        """初期化."""
        message = f"User {current_user_id} cannot release lock owned by {locked_by_user_id}"
        super().__init__(
            message,
            code="LOCK_OWNERSHIP_ERROR",
            details={
                "order_id": order_id,
                "current_user_id": current_user_id,
                "locked_by_user_id": locked_by_user_id,
            },
        )
