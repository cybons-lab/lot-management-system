"""Add SAP reconciliation status to v_ocr_results view

Revision ID: d2e3f4g5h6i7
Revises: c1d2e3f4g5h6
Create Date: 2026-01-22

Phase 1: SAP突合ステータス列をv_ocr_resultsビューに追加
- sap_match_type: exact/prefix/not_found
- sap_matched_zkdmat_b: マッチした先方品番
- overall_reconcile_status: ok/warning/error
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "d2e3f4g5h6i7"
down_revision = "c1d2e3f4g5h6"
branch_labels = None
depends_on = None


# 新しいビュー定義（SAP突合ステータス追加）
NEW_VIEW = """
CREATE OR REPLACE VIEW public.v_ocr_results AS
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
        WHEN ld.content->>'納期' IS NOT NULL
             AND ld.content->>'納期' !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$'
        THEN true
        ELSE false
    END AS date_format_error,

    -- 総合エラーフラグ（従来互換）
    CASE
        WHEN ld.status = 'ERROR' THEN true
        WHEN m.id IS NULL THEN true
        WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL
             AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$' THEN true
        WHEN ld.content->>'納期' IS NOT NULL
             AND ld.content->>'納期' !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$' THEN true
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
        WHEN ld.content->>'納期' IS NOT NULL
             AND ld.content->>'納期' !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$' THEN 'warning'
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
    FROM public.sap_material_cache sc
    WHERE sc.kunnr = COALESCE(ld.content->>'得意先コード', '100427105')
      AND sc.zkdmat_b LIKE COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') || '%'
      AND sap_exact.id IS NULL  -- 完全一致がない場合のみ
    GROUP BY sc.id, sc.zkdmat_b, sc.raw_data
    HAVING COUNT(*) OVER () = 1  -- 一意に絞れる場合のみ
    LIMIT 1
) sap_prefix ON true;

COMMENT ON VIEW public.v_ocr_results IS 'OCR結果ビュー（SmartRead縦持ちデータ + 出荷用マスタJOIN + SAP突合ステータス）';
"""

# 元のビュー定義（ダウングレード用）
OLD_VIEW = """
CREATE OR REPLACE VIEW public.v_ocr_results AS
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
        WHEN COALESCE(oe.jiku_code, ld.content->>'次区') IS NOT NULL
             AND COALESCE(oe.jiku_code, ld.content->>'次区') !~ '^[A-Za-z][0-9]+$' THEN true
        WHEN ld.content->>'納期' IS NOT NULL
             AND ld.content->>'納期' !~ '^\d{4}[-/]\d{1,2}[-/]\d{1,2}$' THEN true
        ELSE false
    END AS has_error

FROM public.smartread_long_data ld
LEFT JOIN public.ocr_result_edits oe
    ON oe.smartread_long_data_id = ld.id
LEFT JOIN public.shipping_master_curated m
    ON COALESCE(ld.content->>'得意先コード', '100427105') = m.customer_code
    AND COALESCE(oe.material_code, ld.content->>'材質コード', ld.content->>'材料コード') = m.material_code
    AND COALESCE(oe.jiku_code, ld.content->>'次区') = m.jiku_code;

COMMENT ON VIEW public.v_ocr_results IS 'OCR結果ビュー（SmartRead縦持ちデータ + 出荷用マスタJOIN、エラー検出含む）';
"""


def upgrade() -> None:
    """Update v_ocr_results view with SAP reconciliation status."""
    op.execute(NEW_VIEW)


def downgrade() -> None:
    """Restore original v_ocr_results view."""
    op.execute(OLD_VIEW)
