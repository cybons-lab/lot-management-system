"""Domain-level shared exception definitions.

【設計意図】ドメインエラー階層の設計判断:

1. カスタム例外階層を作る理由
   理由: 標準のExceptionでは、ビジネスロジック固有のエラー情報を構造化できない
   メリット:
   - code: エラーコードを付与し、APIレスポンスで統一的なエラー識別子を提供
   - details: 任意のメタデータを格納し、フロントエンドでエラー詳細を表示
   例: {"code": "INSUFFICIENT_STOCK", "details": {"required": 100, "available": 50}}

2. DomainError を基底クラスとする理由
   理由: すべてのドメイン層エラーを catch したい場合に便利
   用途:
   - try/except DomainError でドメイン層のエラーをまとめて処理
   - アプリケーション層で、ドメインエラーをHTTPステータスコードに変換
   例: DomainError → 400 Bad Request、InfrastructureError → 500 Internal Server Error

3. InsufficientStockError の詳細フィールド
   理由: エラーコンテキストに応じた適切なメッセージを生成
   - lot_number 指定時: 「ロット ABC123 の在庫が不足」
   - product_code 指定時: 「製品 P-001 の在庫が不足」
   - 指定なし: 「在庫が不足しています」
   → ユーザーに具体的な情報を伝える

4. details への自動格納（L72-80）
   理由: APIレスポンスで構造化されたエラー詳細を返す
   用途:
   - フロントエンドで「必要: 100個、利用可能: 50個」と表示
   - ロギング時に詳細情報を記録
   → トラブルシューティングが容易

5. keyword-only arguments（*, lot_id=None, ...）
   理由: 可読性向上と誤用防止
   → InsufficientStockError(100, 50, lot_id=123) と明示的に指定
   → 引数順序の間違いを防ぐ
"""

from __future__ import annotations


class DomainError(Exception):
    """Base exception for all domain-specific errors."""

    default_code = "DOMAIN_ERROR"

    def __init__(
        self,
        message: str,
        code: str | None = None,
        details: dict | None = None,
    ):
        """ドメインエラーの初期化.

        Args:
            message: エラーメッセージ
            code: エラーコード（省略時はdefault_codeを使用）
            details: 詳細情報（任意のメタデータ）
        """
        self.message = message
        self.code = code or self.default_code
        self.details = details or {}
        super().__init__(self.message)


class InsufficientStockError(DomainError):
    """在庫不足エラー（統合版）.

    Attributes:
        lot_id: 在庫不足のロットID（オプショナル）
        lot_number: 表示用ロット番号（オプショナル）
        product_code: 製品コード（オプショナル）
        required: 必要数量
        available: 利用可能数量
    """

    default_code = "INSUFFICIENT_STOCK"

    def __init__(
        self,
        required: float,
        available: float,
        *,
        lot_id: int | None = None,
        lot_number: str | None = None,
        product_code: str | None = None,
        details: dict | None = None,
    ):
        self.lot_id = lot_id
        self.lot_number = lot_number
        self.product_code = product_code
        self.required = required
        self.available = available

        # 【設計】コンテキストに応じた適切なメッセージを自動生成
        if lot_number:
            message = (
                f"ロット {self.lot_number} の在庫が不足しています "
                f"(必要: {self.required}, 利用可能: {self.available})"
            )
        elif product_code:
            message = (
                f"製品 {self.product_code} の在庫が不足しています "
                f"(必要: {self.required}, 利用可能: {self.available})"
            )
        else:
            message = f"在庫が不足しています (必要: {self.required}, 利用可能: {self.available})"

        # 【設計】details に全情報を格納し、API レスポンスで構造化データとして返す
        error_details: dict = details.copy() if details else {}
        if lot_id:
            error_details["lot_id"] = lot_id
        if lot_number:
            error_details["lot_number"] = lot_number
        if product_code:
            error_details["product_code"] = product_code
        error_details["required"] = required
        error_details["available"] = available

        super().__init__(
            message,
            code=self.default_code,
            details=error_details,
        )
