"""add_smartread_data_versions

Revision ID: 8c2f3e1a9d4b
Revises: b5945cb23f8d
Create Date: 2026-02-05 18:20:00

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "8c2f3e1a9d4b"
down_revision = "b5945cb23f8d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "smartread_tasks",
        sa.Column("data_version", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )
    op.add_column(
        "smartread_wide_data",
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )
    op.add_column(
        "smartread_long_data",
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )
    op.add_column(
        "ocr_result_edits",
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
    )

    # Drop view before recreating (column order changed)
    op.execute("DROP VIEW IF EXISTS public.v_ocr_results CASCADE")

    op.execute(
        """
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
            COALESCE(oe.delivery_date, ld.content->>'納期', ld.content->>'納入日') AS delivery_date,
            COALESCE(oe.delivery_quantity, ld.content->>'納入量') AS delivery_quantity,
            COALESCE(ld.content->>'アイテムNo', ld.content->>'アイテム') AS item_no,
            COALESCE(ld.content->>'数量単位', ld.content->>'単位') AS order_unit,
            ld.content->>'入庫No' AS inbound_no,
            COALESCE(ld.content->>'Lot No1', ld.content->>'Lot No', ld.content->>'ロットNo') AS lot_no,
            
            -- ロット・数量別（OCR由来、手入力優先）
            COALESCE(oe.lot_no_1, ld.content->>'Lot No1', ld.content->>'Lot No') AS lot_no_1,
            COALESCE(oe.quantity_1, ld.content->>'数量1', ld.content->>'数量') AS quantity_1,
            COALESCE(oe.lot_no_2, ld.content->>'Lot No2') AS lot_no_2,
            COALESCE(oe.quantity_2, ld.content->>'数量2') AS quantity_2,

            -- 手入力結果（OCR結果編集）
            oe.lot_no_1 AS manual_lot_no_1,
            oe.quantity_1 AS manual_quantity_1,
            oe.lot_no_2 AS manual_lot_no_2,
            oe.quantity_2 AS manual_quantity_2,
            oe.inbound_no AS manual_inbound_no,
            oe.inbound_no_2 AS manual_inbound_no_2,
            oe.shipping_date AS manual_shipping_date,
            oe.shipping_slip_text AS manual_shipping_slip_text,
            oe.shipping_slip_text_edited AS manual_shipping_slip_text_edited,
            oe.jiku_code AS manual_jiku_code,
            oe.material_code AS manual_material_code,
            oe.delivery_quantity AS manual_delivery_quantity,
            oe.delivery_date AS manual_delivery_date,
            oe.updated_at AS manual_updated_at,
            COALESCE(oe.version, 0) AS manual_version,
            -- 処理ステータス: pending/downloaded/sap_linked/completed
            COALESCE(oe.process_status, 'pending') AS process_status,
            -- バリデーションエラーフラグ（DB保存分）
            COALESCE(oe.error_flags, '{}'::jsonb) AS error_flags,

            -- マスタ由来（LEFT JOIN）
            m.id AS master_id,
            m.customer_name,
            m.supplier_code,
            -- 仕入先名称はmaker_name（メーカー名）から取得
            m.maker_name AS supplier_name,
            m.delivery_place_code,
            m.delivery_place_name,
            m.warehouse_code AS shipping_warehouse_code,
            m.shipping_warehouse AS shipping_warehouse_name,
            m.shipping_slip_text,
            m.transport_lt_days,
            m.customer_part_no,
            m.maker_part_no,
            m.has_order,

            -- SAP突合ステータス
            CASE
                WHEN sap_exact.id IS NOT NULL THEN 'exact'
                WHEN sap_prefix.id IS NOT NULL THEN 'prefix'
                ELSE 'not_found'
            END AS sap_match_type,

            COALESCE(sap_exact.zkdmat_b, sap_prefix.zkdmat_b) AS sap_matched_zkdmat_b,

            COALESCE(sap_exact.raw_data, sap_prefix.raw_data) AS sap_raw_data,

            -- エラーフラグ: マスタ未登録
            CASE WHEN m.id IS NULL THEN true ELSE false END AS master_not_found,

            -- エラーフラグ: SAP未登録
            CASE
                WHEN sap_exact.id IS NULL AND sap_prefix.id IS NULL THEN true
                ELSE false
            END AS sap_not_found,

            -- バリデーションエラー: 次区フォーマット（アルファベット+数字）
            CASE
                WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL
                     AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$'
                THEN true
                ELSE false
            END AS jiku_format_error,

            -- バリデーションエラー: 日付フォーマット（YYYY-MM-DD or YYYY/MM/DD）
            CASE 
                WHEN COALESCE(oe.delivery_date, ld.content->>'納期') IS NOT NULL 
                     AND COALESCE(oe.delivery_date, ld.content->>'納期') !~ '^\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}$' 
                THEN true 
                ELSE false 
            END AS date_format_error,
            
            -- 総合エラーフラグ（従来互換）
            CASE
                WHEN ld.status = 'ERROR' THEN true
                WHEN m.id IS NULL THEN true
                WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$' THEN true
                WHEN COALESCE(oe.delivery_date, ld.content->>'納期') IS NOT NULL AND COALESCE(oe.delivery_date, ld.content->>'納期') !~ '^\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}$' THEN true
                ELSE false
            END AS has_error,

            -- 総合突合ステータス（SAP + マスタ）
            CASE
                WHEN ld.status = 'ERROR' THEN 'error'
                WHEN m.id IS NULL THEN 'error'
                WHEN sap_exact.id IS NULL AND sap_prefix.id IS NULL THEN 'error'
                WHEN sap_prefix.id IS NOT NULL AND sap_exact.id IS NULL THEN 'warning'
                WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL
                     AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$' THEN 'error'
                WHEN COALESCE(oe.delivery_date, ld.content->>'納期') IS NOT NULL
                     AND COALESCE(oe.delivery_date, ld.content->>'納期') !~ '^\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}$' THEN 'warning'
                ELSE 'ok'
            END AS overall_reconcile_status

        FROM public.smartread_long_data ld
        LEFT JOIN public.ocr_result_edits oe
            ON oe.smartread_long_data_id = ld.id
        LEFT JOIN public.shipping_master_curated m
            ON COALESCE(ld.content->>'得意先コード', '100427105') = m.customer_code
            AND COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') = m.material_code
            AND COALESCE(oe.jiku_code, ld.content->>'次区') = m.jiku_code
        -- SAP完全一致: 材質コード == ZKDMAT_B
        LEFT JOIN public.sap_material_cache sap_exact
            ON sap_exact.kunnr = COALESCE(ld.content->>'得意先コード', '100427105')
            AND sap_exact.zkdmat_b = COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード')
        -- SAP前方一致: 材質コードでZKDMAT_Bが始まる（一意の場合のみ）
        LEFT JOIN LATERAL (
            SELECT sc.id, sc.zkdmat_b, sc.raw_data
            FROM (
                SELECT id, zkdmat_b, raw_data,
                       COUNT(*) OVER () as cnt
                FROM public.sap_material_cache
                WHERE kunnr = COALESCE(ld.content->>'得意先コード', '100427105')
                  AND zkdmat_b LIKE COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') || '%'
            ) sc
            WHERE sc.cnt = 1
              AND sap_exact.id IS NULL  -- 完全一致がない場合のみ
            LIMIT 1
        ) sap_prefix ON true;

        COMMENT ON VIEW public.v_ocr_results IS 'OCR結果ビュー（SmartRead縦持ちデータ + 出荷用マスタJOIN、エラー検出含む）';
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS public.v_ocr_results CASCADE")

    op.execute(
        """
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
            COALESCE(oe.delivery_date, ld.content->>'納期', ld.content->>'納入日') AS delivery_date,
            COALESCE(oe.delivery_quantity, ld.content->>'納入量') AS delivery_quantity,
            COALESCE(ld.content->>'アイテムNo', ld.content->>'アイテム') AS item_no,
            COALESCE(ld.content->>'数量単位', ld.content->>'単位') AS order_unit,
            ld.content->>'入庫No' AS inbound_no,
            COALESCE(ld.content->>'Lot No1', ld.content->>'Lot No', ld.content->>'ロットNo') AS lot_no,
            
            -- ロット・数量別（OCR由来、手入力優先）
            COALESCE(oe.lot_no_1, ld.content->>'Lot No1', ld.content->>'Lot No') AS lot_no_1,
            COALESCE(oe.quantity_1, ld.content->>'数量1', ld.content->>'数量') AS quantity_1,
            COALESCE(oe.lot_no_2, ld.content->>'Lot No2') AS lot_no_2,
            COALESCE(oe.quantity_2, ld.content->>'数量2') AS quantity_2,

            -- 手入力結果（OCR結果編集）
            oe.lot_no_1 AS manual_lot_no_1,
            oe.quantity_1 AS manual_quantity_1,
            oe.lot_no_2 AS manual_lot_no_2,
            oe.quantity_2 AS manual_quantity_2,
            oe.inbound_no AS manual_inbound_no,
            oe.inbound_no_2 AS manual_inbound_no_2,
            oe.shipping_date AS manual_shipping_date,
            oe.shipping_slip_text AS manual_shipping_slip_text,
            oe.shipping_slip_text_edited AS manual_shipping_slip_text_edited,
            oe.jiku_code AS manual_jiku_code,
            oe.material_code AS manual_material_code,
            oe.delivery_quantity AS manual_delivery_quantity,
            oe.delivery_date AS manual_delivery_date,
            oe.updated_at AS manual_updated_at,
            -- 処理ステータス: pending/downloaded/sap_linked/completed
            COALESCE(oe.process_status, 'pending') AS process_status,
            -- バリデーションエラーフラグ（DB保存分）
            COALESCE(oe.error_flags, '{}'::jsonb) AS error_flags,

            -- マスタ由来（LEFT JOIN）
            m.id AS master_id,
            m.customer_name,
            m.supplier_code,
            -- 仕入先名称はmaker_name（メーカー名）から取得
            m.maker_name AS supplier_name,
            m.delivery_place_code,
            m.delivery_place_name,
            m.warehouse_code AS shipping_warehouse_code,
            m.shipping_warehouse AS shipping_warehouse_name,
            m.shipping_slip_text,
            m.transport_lt_days,
            m.customer_part_no,
            m.maker_part_no,
            m.has_order,

            -- SAP突合ステータス
            CASE
                WHEN sap_exact.id IS NOT NULL THEN 'exact'
                WHEN sap_prefix.id IS NOT NULL THEN 'prefix'
                ELSE 'not_found'
            END AS sap_match_type,

            COALESCE(sap_exact.zkdmat_b, sap_prefix.zkdmat_b) AS sap_matched_zkdmat_b,

            COALESCE(sap_exact.raw_data, sap_prefix.raw_data) AS sap_raw_data,

            -- エラーフラグ: マスタ未登録
            CASE WHEN m.id IS NULL THEN true ELSE false END AS master_not_found,

            -- エラーフラグ: SAP未登録
            CASE
                WHEN sap_exact.id IS NULL AND sap_prefix.id IS NULL THEN true
                ELSE false
            END AS sap_not_found,

            -- バリデーションエラー: 次区フォーマット（アルファベット+数字）
            CASE
                WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL
                     AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$'
                THEN true
                ELSE false
            END AS jiku_format_error,

            -- バリデーションエラー: 日付フォーマット（YYYY-MM-DD or YYYY/MM/DD）
            CASE 
                WHEN COALESCE(oe.delivery_date, ld.content->>'納期') IS NOT NULL 
                     AND COALESCE(oe.delivery_date, ld.content->>'納期') !~ '^\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}$' 
                THEN true 
                ELSE false 
            END AS date_format_error,
            
            -- 総合エラーフラグ（従来互換）
            CASE
                WHEN ld.status = 'ERROR' THEN true
                WHEN m.id IS NULL THEN true
                WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$' THEN true
                WHEN COALESCE(oe.delivery_date, ld.content->>'納期') IS NOT NULL AND COALESCE(oe.delivery_date, ld.content->>'納期') !~ '^\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}$' THEN true
                ELSE false
            END AS has_error,

            -- 総合突合ステータス（SAP + マスタ）
            CASE
                WHEN ld.status = 'ERROR' THEN 'error'
                WHEN m.id IS NULL THEN 'error'
                WHEN sap_exact.id IS NULL AND sap_prefix.id IS NULL THEN 'error'
                WHEN sap_prefix.id IS NOT NULL AND sap_exact.id IS NULL THEN 'warning'
                WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL
                     AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$' THEN 'error'
                WHEN COALESCE(oe.delivery_date, ld.content->>'納期') IS NOT NULL
                     AND COALESCE(oe.delivery_date, ld.content->>'納期') !~ '^\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}$' THEN 'warning'
                ELSE 'ok'
            END AS overall_reconcile_status

        FROM public.smartread_long_data ld
        LEFT JOIN public.ocr_result_edits oe
            ON oe.smartread_long_data_id = ld.id
        LEFT JOIN public.shipping_master_curated m
            ON COALESCE(ld.content->>'得意先コード', '100427105') = m.customer_code
            AND COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') = m.material_code
            AND COALESCE(oe.jiku_code, ld.content->>'次区') = m.jiku_code
        -- SAP完全一致: 材質コード == ZKDMAT_B
        LEFT JOIN public.sap_material_cache sap_exact
            ON sap_exact.kunnr = COALESCE(ld.content->>'得意先コード', '100427105')
            AND sap_exact.zkdmat_b = COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード')
        -- SAP前方一致: 材質コードでZKDMAT_Bが始まる（一意の場合のみ）
        LEFT JOIN LATERAL (
            SELECT sc.id, sc.zkdmat_b, sc.raw_data
            FROM (
                SELECT id, zkdmat_b, raw_data,
                       COUNT(*) OVER () as cnt
                FROM public.sap_material_cache
                WHERE kunnr = COALESCE(ld.content->>'得意先コード', '100427105')
                  AND zkdmat_b LIKE COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') || '%'
            ) sc
            WHERE sc.cnt = 1
              AND sap_exact.id IS NULL  -- 完全一致がない場合のみ
            LIMIT 1
        ) sap_prefix ON true;

        COMMENT ON VIEW public.v_ocr_results IS 'OCR結果ビュー（SmartRead縦持ちデータ + 出荷用マスタJOIN、エラー検出含む）';
        """
    )

    op.drop_column("ocr_result_edits", "version")
    op.drop_column("smartread_long_data", "version")
    op.drop_column("smartread_wide_data", "version")
    op.drop_column("smartread_tasks", "data_version")
