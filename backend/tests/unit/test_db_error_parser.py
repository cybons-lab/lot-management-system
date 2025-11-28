"""Tests for database error parser."""

from sqlalchemy.exc import IntegrityError

from app.core.db_error_parser import DBErrorParser, parse_db_error


class TestDBErrorParser:
    """Test cases for DBErrorParser."""

    def test_parse_unique_constraint_with_value(self):
        """Test parsing unique constraint error with value extraction."""
        # Simulate PostgreSQL error message
        error_msg = (
            'duplicate key value violates unique constraint "uq_products_maker_part_code" '
            "DETAIL: Key (maker_part_code)=(ABC-123) already exists."
        )

        # Create mock IntegrityError
        mock_exc = IntegrityError(
            statement="INSERT INTO products ...",
            params={},
            orig=Exception(error_msg),
        )

        result = DBErrorParser.parse_integrity_error(mock_exc)

        assert "製品コード 'ABC-123' は既に登録されています" == result

    def test_parse_unique_constraint_without_value(self):
        """Test parsing unique constraint error without value in message."""
        error_msg = (
            "duplicate key value violates unique constraint "
            '"uq_user_supplier_assignments_user_supplier"'
        )

        mock_exc = IntegrityError(
            statement="INSERT INTO user_supplier_assignments ...",
            params={},
            orig=Exception(error_msg),
        )

        result = DBErrorParser.parse_integrity_error(mock_exc)

        assert "このユーザーは既にこの仕入先の担当として登録されています" == result

    def test_parse_foreign_key_violation(self):
        """Test parsing foreign key constraint error."""
        error_msg = (
            'insert or update on table "lots" violates foreign key constraint "fk_lots_product_id"'
        )

        mock_exc = IntegrityError(
            statement="INSERT INTO lots ...",
            params={},
            orig=Exception(error_msg),
        )

        result = DBErrorParser.parse_integrity_error(mock_exc)

        assert "指定された製品が見つかりません" == result

    def test_parse_unknown_constraint(self):
        """Test parsing unknown constraint error."""
        error_msg = 'duplicate key value violates unique constraint "uq_unknown_table_field"'

        mock_exc = IntegrityError(
            statement="INSERT INTO unknown_table ...",
            params={},
            orig=Exception(error_msg),
        )

        result = DBErrorParser.parse_integrity_error(mock_exc)

        assert "データが重複しています。別の値を入力してください。" == result

    def test_parse_not_null_constraint(self):
        """Test parsing not null constraint error."""
        error_msg = 'null value in column "product_name" violates not-null constraint'

        mock_exc = IntegrityError(
            statement="INSERT INTO products ...",
            params={},
            orig=Exception(error_msg),
        )

        result = DBErrorParser.parse_integrity_error(mock_exc)

        assert "必須項目が入力されていません。" == result

    def test_parse_check_constraint(self):
        """Test parsing check constraint error."""
        error_msg = 'new row for relation "orders" violates check constraint "ck_order_status"'

        mock_exc = IntegrityError(
            statement="INSERT INTO orders ...",
            params={},
            orig=Exception(error_msg),
        )

        result = DBErrorParser.parse_integrity_error(mock_exc)

        assert "入力値が条件を満たしていません。" == result

    def test_parse_db_error_convenience_function(self):
        """Test convenience function parse_db_error."""
        error_msg = (
            'duplicate key value violates unique constraint "uq_warehouses_warehouse_code" '
            "DETAIL: Key (warehouse_code)=(WH001) already exists."
        )

        mock_exc = IntegrityError(
            statement="INSERT INTO warehouses ...",
            params={},
            orig=Exception(error_msg),
        )

        result = parse_db_error(mock_exc)

        assert "倉庫コード 'WH001' は既に登録されています" == result

    def test_parse_db_error_with_context(self):
        """Test parsing with context data."""
        error_msg = 'duplicate key value violates unique constraint "uq_users_username"'

        mock_exc = IntegrityError(
            statement="INSERT INTO users ...",
            params={},
            orig=Exception(error_msg),
        )

        context = {"username": "john_doe", "email": "john@example.com"}
        result = parse_db_error(mock_exc, context)

        # Should extract username from context
        assert "ユーザー名 'john_doe' は既に使用されています" == result

    def test_parse_non_integrity_error(self):
        """Test parsing non-IntegrityError exception."""
        generic_exc = Exception("Some other database error")

        result = parse_db_error(generic_exc)

        assert "データベースエラーが発生しました。" == result
