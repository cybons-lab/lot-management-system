"""Database error parser for user-friendly messages.

Parses database exceptions (IntegrityError, etc.) and converts them into
user-friendly Japanese messages.

【設計意図】データベースエラーパーサーの設計判断:

1. なぜデータベースエラーを日本語に変換するのか
   理由: エンドユーザーは技術的なエラーメッセージを理解できない
   技術的エラー例:
   - "UNIQUE constraint failed: products.product_code"
   → ユーザーにとって意味不明、対処方法が分からない
   ユーザーフレンドリーなメッセージ:
   - "製品コード 'P-001' は既に登録されています"
   → 何が問題か明確、別のコードを入力すれば良いと理解できる

2. CONSTRAINT_MESSAGES 辞書の設計（L17-45）
   理由: 制約名からエラーメッセージへの静的マッピング
   メリット:
   - 制約名が変わっても、辞書を更新するだけ
   - 新しい制約追加時に、ここに登録するだけでエラーメッセージが表示される
   - 多言語化も容易（辞書を切り替えるだけ）
   設計:
   - キー: データベースの制約名（uq_*, fk_*）
   - 値: 日本語のエラーメッセージテンプレート

3. なぜ正規表現で制約名を抽出するのか（L63）
   理由: データベースごとにエラーメッセージ形式が異なる
   PostgreSQL:
   - 'constraint "uq_products_maker_part_code" violated'
   SQLite:
   - 'UNIQUE constraint failed: products.maker_part_code'
   → re.search(r'constraint ["\']?(\w+)["\']?') で両方に対応
   メリット: データベース移行時もコード変更不要

4. _extract_value() の二段階抽出戦略（L83-106）
   理由: 重複値をユーザーに表示して対処を支援
   第1段階: エラーメッセージから抽出（L94-97）
   - PostgreSQL: "Key (product_code)=(P-001) already exists."
   → 正規表現で "(P-001)" を抽出
   第2段階: context から抽出（L100-104）
   - エラーメッセージに値がない場合（SQLite等）
   → API リクエストの入力データ（context）から推測
   メリット: どのデータベースでも、できる限り具体的な値を表示

5. _get_generic_message() のフォールバック設計（L109-129）
   理由: 未知の制約エラーでも最低限のガイダンスを提供
   方針:
   - 制約名が辞書に登録されていない場合
   → エラーメッセージの文字列から種類を推測
   判定ロジック:
   - "unique" or "duplicate" → 重複エラー
   - "foreign key" → 参照先データが存在しない
   - "not null" → 必須項目未入力
   - "check constraint" → 条件違反
   メリット: 新しい制約を追加しても、最低限のエラーメッセージは表示される

6. parse_db_error() の利便性関数設計（L132-150）
   理由: エラーハンドラーでの使用を簡潔にする
   使用例:
   ```python
   try:
       db.commit()
   except IntegrityError as e:
       # 簡潔に日本語エラーメッセージを取得
       user_message = parse_db_error(e, context={"product_code": "P-001"})
       raise HTTPException(status_code=409, detail=user_message)
   ```
   メリット:
   - クラスメソッドを直接呼ばなくて良い
   - 将来的に他のエラー型（DataError等）にも対応可能

7. context パラメータの用途（L49）
   理由: エラーメッセージに具体的な値を埋め込む
   例:
   ```python
   context = {"product_code": "P-001", "product_name": "ブレーキパッド"}
   parse_db_error(exc, context)
   # → "製品コード 'P-001' は既に登録されています"
   ```
   メリット:
   - ユーザーが「どの値が重複しているか」を即座に理解
   - 別の値を試すという対処方法が明確になる

8. なぜ日本語メッセージなのか
   理由: ターゲットユーザーは日本の自動車部品商社
   業務背景:
   - 営業担当者、倉庫作業員が主要ユーザー
   - 英語の技術用語は理解困難
   → 母国語（日本語）でのエラーメッセージが必須
   多言語化:
   - 将来的に海外展開する場合は、CONSTRAINT_MESSAGES を多言語対応
   → 辞書を言語ごとに分離し、設定で切り替え可能にする
"""

import re
from typing import Any

from sqlalchemy.exc import IntegrityError


class DBErrorParser:
    """Parse database errors into user-friendly messages."""

    # Constraint name to user message mapping
    CONSTRAINT_MESSAGES = {
        # Products
        "uq_products_maker_part_code": "製品コード '{value}' は既に登録されています",
        "uq_products_our_part_code": "社内品番 '{value}' は既に登録されています",
        # Warehouses
        "uq_warehouses_warehouse_code": "倉庫コード '{value}' は既に登録されています",
        # Suppliers
        "uq_suppliers_supplier_code": "仕入先コード '{value}' は既に登録されています",
        # Customers
        "uq_customers_customer_code": "顧客コード '{value}' は既に登録されています",
        # Lots
        "uq_lots_lot_number": "ロット番号 '{value}' は既に登録されています",
        # Users
        "uq_users_username": "ユーザー名 '{value}' は既に使用されています",
        "uq_users_email": "メールアドレス '{value}' は既に登録されています",
        # User-Supplier Assignments
        "uq_user_supplier_assignments_user_supplier": (
            "このユーザーは既にこの仕入先の担当として登録されています"
        ),
        "uq_user_supplier_primary_per_supplier": ("この仕入先には既に主担当が割り当てられています"),
        # Foreign Key Violations
        "fk_lots_product_id": "指定された製品が見つかりません",
        "fk_lots_warehouse_id": "指定された倉庫が見つかりません",
        "fk_lots_supplier_id": "指定された仕入先が見つかりません",
        "fk_order_lines_product_id": "指定された製品が見つかりません",
        "fk_order_lines_order_id": "指定された受注が見つかりません",
        "fk_allocations_order_line_id": "指定された受注明細が見つかりません",
        "fk_allocations_lot_id": "指定されたロットが見つかりません",
    }

    @classmethod
    def parse_integrity_error(
        cls, exc: IntegrityError, context: dict[str, Any] | None = None
    ) -> str:
        """Parse IntegrityError into user-friendly message.

        Args:
            exc: SQLAlchemy IntegrityError
            context: Additional context (e.g., input data)

        Returns:
            User-friendly error message in Japanese
        """
        error_msg = str(exc.orig)

        # Extract constraint name
        constraint_match = re.search(r'constraint ["\']?(\w+)["\']?', error_msg)
        if not constraint_match:
            return cls._get_generic_message(error_msg)

        constraint_name = constraint_match.group(1)

        # Get template message
        template = cls.CONSTRAINT_MESSAGES.get(constraint_name)
        if not template:
            return cls._get_generic_message(error_msg)

        # Extract value if available
        value = cls._extract_value(error_msg, context)

        # Format message
        if "{value}" in template and value:
            return template.format(value=value)
        return template

    @classmethod
    def _extract_value(cls, error_msg: str, context: dict[str, Any] | None) -> str | None:
        """Extract the duplicate value from error message or context.

        Args:
            error_msg: Original database error message
            context: Additional context data

        Returns:
            Extracted value or None
        """
        # Try to extract from error message
        # PostgreSQL: DETAIL:  Key (column_name)=(value) already exists.
        detail_match = re.search(r"\(([^)]+)\)=\(([^)]+)\)", error_msg)
        if detail_match:
            return detail_match.group(2)

        # Try to extract from context (if provided)
        if context and isinstance(context, dict):
            # Simple heuristic: return first string value that looks like a code
            for value in context.values():
                if isinstance(value, str) and value:
                    return value

        return None

    @classmethod
    def _get_generic_message(cls, error_msg: str) -> str:
        """Generate generic error message based on error type.

        Args:
            error_msg: Original database error message

        Returns:
            Generic user-friendly error message
        """
        error_lower = error_msg.lower()

        if "unique" in error_lower or "duplicate" in error_lower:
            return "データが重複しています。別の値を入力してください。"
        if "foreign key" in error_lower:
            return "関連するデータが見つかりません。"
        if "not null" in error_lower or "not-null" in error_lower:
            return "必須項目が入力されていません。"
        if "check constraint" in error_lower:
            return "入力値が条件を満たしていません。"

        return "データベースエラーが発生しました。入力内容を確認してください。"


def parse_db_error(exc: Exception, context: dict[str, Any] | None = None) -> str:
    """Parse database error into user-friendly message.

    Convenience function for error handlers.

    Args:
        exc: Database exception
        context: Additional context (input data, etc.)

    Returns:
        User-friendly error message in Japanese
    """
    if isinstance(exc, IntegrityError):
        return DBErrorParser.parse_integrity_error(exc, context)

    # Other database errors can be added here
    # e.g., DataError, OperationalError, etc.

    return "データベースエラーが発生しました。"
