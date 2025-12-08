"""Database error parser for user-friendly messages.

Parses database exceptions (IntegrityError, etc.) and converts them into
user-friendly Japanese messages.
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
