"""add_jiku_material_code_to_ocr_result_edits

Revision ID: 5dd0b2432e9a
Revises: 5a7d8b9c0d1e
Create Date: 2026-01-22 13:28:25.434402

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "5dd0b2432e9a"
down_revision = "5a7d8b9c0d1e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add jiku_code and material_code columns to ocr_result_edits table
    op.add_column("ocr_result_edits", sa.Column("jiku_code", sa.String(length=100), nullable=True))
    op.add_column(
        "ocr_result_edits", sa.Column("material_code", sa.String(length=100), nullable=True)
    )

    # Recreate v_ocr_results view with updated logic
    op.execute("DROP VIEW IF EXISTS public.v_ocr_results;")
    op.execute(r"""
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

            -- OCR由来（contentから抽出）+ 得意先コード補間 + 手入力補間
            COALESCE(ld.content->>'得意先コード', '100427105') AS customer_code,
            COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') AS material_code,
            COALESCE(oe.jiku_code, ld.content->>'次区') AS jiku_code,
            COALESCE(ld.content->>'納期', ld.content->>'納入日') AS delivery_date,
            COALESCE(ld.content->>'納入量', ld.content->>'数量') AS delivery_quantity,
            COALESCE(ld.content->>'アイテムNo', ld.content->>'アイテム') AS item_no,
            COALESCE(ld.content->>'数量単位', ld.content->>'単位') AS order_unit,
            ld.content->>'入庫No' AS inbound_no,
            COALESCE(ld.content->>'Lot No1', ld.content->>'Lot No', ld.content->>'ロットNo') AS lot_no,

            -- 手入力結果（OCR結果編集）
            oe.lot_no_1 AS manual_lot_no_1,
            oe.quantity_1 AS manual_quantity_1,
            oe.lot_no_2 AS manual_lot_no_2,
            oe.quantity_2 AS manual_quantity_2,
            oe.inbound_no AS manual_inbound_no,
            oe.shipping_date AS manual_shipping_date,
            oe.shipping_slip_text AS manual_shipping_slip_text,
            oe.shipping_slip_text_edited AS manual_shipping_slip_text_edited,
            oe.jiku_code AS manual_jiku_code,
            oe.material_code AS manual_material_code,
            oe.updated_at AS manual_updated_at,

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
                WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL
                     AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$'
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
                WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$' THEN true
                WHEN ld.content->>'納期' IS NOT NULL AND ld.content->>'納期' !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$' THEN true
                ELSE false
            END AS has_error

        FROM public.smartread_long_data ld
        LEFT JOIN public.ocr_result_edits oe
            ON oe.smartread_long_data_id = ld.id
        LEFT JOIN public.shipping_master_curated m
            ON COALESCE(ld.content->>'得意先コード', '100427105') = m.customer_code
            AND COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') = m.material_code
            AND COALESCE(oe.jiku_code, ld.content->>'次区') = m.jiku_code;
    """)


def downgrade() -> None:
    # Recreate original view
    op.execute("DROP VIEW IF EXISTS public.v_ocr_results;")
    op.execute(r"""
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

            COALESCE(ld.content->>'得意先コード', '100427105') AS customer_code,
            COALESCE(ld.content->>'材質コード', ld.content->>'材料コード') AS material_code,
            ld.content->>'次区' AS jiku_code,
            COALESCE(ld.content->>'納期', ld.content->>'納入日') AS delivery_date,
            COALESCE(ld.content->>'納入量', ld.content->>'数量') AS delivery_quantity,
            COALESCE(ld.content->>'アイテムNo', ld.content->>'アイテム') AS item_no,
            COALESCE(ld.content->>'数量単位', ld.content->>'単位') AS order_unit,
            ld.content->>'入庫No' AS inbound_no,
            COALESCE(ld.content->>'Lot No1', ld.content->>'Lot No', ld.content->>'ロットNo') AS lot_no,

            oe.lot_no_1 AS manual_lot_no_1,
            oe.quantity_1 AS manual_quantity_1,
            oe.lot_no_2 AS manual_lot_no_2,
            oe.quantity_2 AS manual_quantity_2,
            oe.inbound_no AS manual_inbound_no,
            oe.shipping_date AS manual_shipping_date,
            oe.shipping_slip_text AS manual_shipping_slip_text,
            oe.shipping_slip_text_edited AS manual_shipping_slip_text_edited,
            oe.updated_at AS manual_updated_at,

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

            CASE WHEN m.id IS NULL THEN true ELSE false END AS master_not_found,

            CASE
                WHEN ld.content->>'次区' IS NOT NULL
                     AND ld.content->>'次区' !~ '^[A-Za-z][0-9]+$'
                THEN true
                ELSE false
            END AS jiku_format_error,

            CASE
                WHEN ld.content->>'納期' IS NOT NULL
                     AND ld.content->>'納期' !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$'
                THEN true
                ELSE false
            END AS date_format_error,

            CASE
                WHEN ld.status = 'ERROR' THEN true
                WHEN m.id IS NULL THEN true
                WHEN ld.content->>'次区' IS NOT NULL AND ld.content->>'次区' !~ '^[A-Za-z][0-9]+$' THEN true
                WHEN ld.content->>'納期' IS NOT NULL AND ld.content->>'納期' !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$' THEN true
                ELSE false
            END AS has_error

        FROM public.smartread_long_data ld
        LEFT JOIN public.ocr_result_edits oe
            ON oe.smartread_long_data_id = ld.id
        LEFT JOIN public.shipping_master_curated m
            ON COALESCE(ld.content->>'得意先コード', '100427105') = m.customer_code
            AND COALESCE(ld.content->>'材質コード', ld.content->>'材料コード') = m.material_code
            AND ld.content->>'次区' = m.jiku_code;
    """)

    # Remove columns
    op.drop_column("ocr_result_edits", "material_code")
    op.drop_column("ocr_result_edits", "jiku_code")
