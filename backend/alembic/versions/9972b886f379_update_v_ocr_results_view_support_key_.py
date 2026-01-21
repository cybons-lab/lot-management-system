"""update_v_ocr_results_view_support_key_variations

Update v_ocr_results view to support multiple JSON key variations in content field.
Handles different field name patterns from OCR sources:
- 材質コード / 材料コード
- 納期 / 納入日
- 納入量 / 数量
- アイテムNo / アイテム
- 数量単位 / 単位
- Lot No1 / Lot No / ロットNo

Revision ID: 9972b886f379
Revises: add_v_ocr_results_view
Create Date: 2026-01-21 10:09:01.908309

"""

from pathlib import Path

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "9972b886f379"
down_revision = "add_v_ocr_results_view"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Recreate v_ocr_results view with COALESCE for key variations."""
    conn = op.get_bind()

    # Drop existing view
    conn.execute(sa.text("DROP VIEW IF EXISTS public.v_ocr_results CASCADE"))

    # Apply views from canonical source
    views_path = Path(__file__).parent.parent.parent / "sql" / "views" / "create_views.sql"
    if not views_path.exists():
        raise FileNotFoundError(f"Views file not found: {views_path}")

    print("[update_v_ocr_results_view] Recreating views from create_views.sql...")
    views_sql = views_path.read_text(encoding="utf-8")

    # Split by semicolon and execute each statement
    statements = []
    current_stmt = []

    for line in views_sql.splitlines():
        stripped = line.strip()
        # Skip empty lines and comments
        if not stripped or stripped.startswith("--"):
            continue

        current_stmt.append(line)

        if stripped.endswith(";"):
            stmt = "\n".join(current_stmt).strip()
            if stmt and stmt != ";":
                statements.append(stmt)
            current_stmt = []

    # Execute each statement individually
    success_count = 0
    error_count = 0

    for stmt in statements:
        # Remove trailing semicolon for execution
        stmt_clean = stmt.rstrip(";").strip()
        if not stmt_clean:
            continue

        try:
            conn.execute(sa.text(stmt_clean))
            success_count += 1
        except Exception as e:
            # Log but continue - some statements may fail on fresh DB
            error_count += 1
            # Only show error for non-trivial issues
            if "does not exist" not in str(e):
                print(f"[update_v_ocr_results_view] Warning: {e}")

    print(
        f"[update_v_ocr_results_view] Views recreated. Success: {success_count}, Skipped: {error_count}"
    )


def downgrade() -> None:
    """Revert to previous v_ocr_results definition without key variations support."""
    conn = op.get_bind()

    # Drop current view
    conn.execute(sa.text("DROP VIEW IF EXISTS public.v_ocr_results CASCADE"))

    # Recreate old version without COALESCE
    old_view_sql = r"""
    CREATE VIEW public.v_ocr_results AS
    SELECT
        ld.id,
        ld.wide_data_id,
        ld.config_id,
        ld.task_id,
        ld.task_date,
        ld.request_id_ref,
        ld.row_index,
        ld.status,
        ld.error_reason,
        ld.content,
        ld.created_at,

        -- OCR由来（contentから抽出）+ 得意先コード補間
        COALESCE(ld.content->>'得意先コード', '100427105') AS customer_code,
        ld.content->>'材質コード' AS material_code,
        ld.content->>'次区' AS jiku_code,
        ld.content->>'納期' AS delivery_date,
        ld.content->>'納入量' AS delivery_quantity,
        ld.content->>'アイテム' AS item_no,
        ld.content->>'単位' AS order_unit,
        ld.content->>'入庫No' AS inbound_no,
        ld.content->>'Lot No' AS lot_no,

        -- マスタ由来（LEFT JOIN）
        m.id AS master_id,
        m.customer_name,
        m.supplier_code,
        m.supplier_name,
        m.delivery_place_code,
        m.delivery_place_name,
        m.shipping_warehouse_code,
        m.shipping_warehouse_name,
        m.shipping_slip_text,
        m.transport_lt_days,
        m.customer_part_no,
        m.maker_part_no,
        m.has_order,

        -- エラーフラグ: マスタ未登録
        CASE WHEN m.id IS NULL THEN true ELSE false END AS master_not_found,

        -- バリデーションエラー: 次区フォーマット（アルファベット+数字）
        CASE
            WHEN ld.content->>'次区' IS NOT NULL
                 AND ld.content->>'次区' !~ '^[A-Za-z][0-9]+$'
            THEN true
            ELSE false
        END AS jiku_format_error,

        -- バリデーションエラー: 日付フォーマット（YYYY-MM-DD or YYYY/MM/DD）
        CASE
            WHEN ld.content->>'納期' IS NOT NULL
                 AND ld.content->>'納期' !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$'
            THEN true
            ELSE false
        END AS date_format_error,

        -- 総合エラーフラグ
        CASE
            WHEN ld.status = 'ERROR' THEN true
            WHEN m.id IS NULL THEN true
            WHEN ld.content->>'次区' IS NOT NULL AND ld.content->>'次区' !~ '^[A-Za-z][0-9]+$' THEN true
            WHEN ld.content->>'納期' IS NOT NULL AND ld.content->>'納期' !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$' THEN true
            ELSE false
        END AS has_error

    FROM public.smartread_long_data ld
    LEFT JOIN public.shipping_master_curated m
        ON COALESCE(ld.content->>'得意先コード', '100427105') = m.customer_code
        AND ld.content->>'材質コード' = m.material_code
        AND ld.content->>'次区' = m.jiku_code
    """

    conn.execute(sa.text(old_view_sql))
    print("[update_v_ocr_results_view] Reverted to old v_ocr_results definition.")
