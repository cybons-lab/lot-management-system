"""Cleanup: Archive legacy migration files

This migration moves legacy migration files to the archive/ directory.
Files are moved (not deleted) so they can be restored if needed.

Revision ID: cleanup_20260119
Revises: f30373801237
Create Date: 2026-01-19
"""

import shutil
from pathlib import Path


# revision identifiers, used by Alembic.
revision = "cleanup_20260119"
down_revision = "f30373801237"
branch_labels = None
depends_on = None

# Files to archive (all legacy migrations before baseline)
# Keep: baseline_20260119.py, f30373801237_*.py, cleanup_20260119.py
LEGACY_FILES = [
    "000000000000_initial_schema.py",
    "1234567890ab_add_lot_master_aggregation_trigger.py",
    "17625625c5fb_add_customer_part_no_and_maker_item_.py",
    "24ab8ce1395d_rename_rpa_status_values.py",
    "26bb6924c845_merge_stock_history_backfill.py",
    "29360a34fdee_add_product_warehouse_table.py",
    "2a9b62dd46a0_add_reserved_quantity_active_to_v_lot_.py",
    "348d4e9f7602_add_confirmed_by_to_lot_reservations.py",
    "36386d722bab_merge_calendar_and_test_data_heads.py",
    "3762f908f9df_fix_v_lot_details_received_quantity_.py",
    "3ee7b8597d75_add_cancel_reason_column_to_orders.py",
    "52d19845846f_update_v_lot_details_view_phase1.py",
    "561b887c8e22_merge_heads_for_clean_branch.py",
    "58a60869c7e1_add_rpa_run_date_range.py",
    "5de742979df0_merge_heads.py",
    "6acff7fc6740_add_layer_code_mapping_and_result_status.py",
    "6ea7f2902c6a_merge_heads_for_zod_upgrade.py",
    "783df7fbb1a5_fix_v_inventory_summary_lot_count.py",
    "7a50c98d743e_merge_step4_columns_head.py",
    "981e944594b8_fix_timestamp_timezone.py",
    "9decff574dcb_add_system_client_logs_table.py",
    "a1b2c3d4e5f6_add_sap_markers_to_lot_reservations.py",
    "a1b2c3d4e5f7_add_consumed_quantity.py",
    "a548454f01a1_add_cloud_flow_tables.py",
    "aa1b2c3d4e5f_add_calendar_tables.py",
    "ae0c76e46488_add_qty_scale_to_products.py",
    "b1_prep_short_names.py",
    "b2_lot_master_tables.py",
    "b2c3d4e5f6g7_drop_allocations_table.py",
    "b3_lot_receipts_rename.py",
    "b4_data_migration.py",
    "b5_refresh_views.py",
    "b77dcffc2d98_fix_inventory_views_consistency.py",
    "b7c8d9e0f1g2_update_rpa_runs_status_constraint.py",
    "bd41467bfaf6_p2_schema_improvements_safe_updates.py",
    "c1bde3065827_fix_v_inventory_summary_status.py",
    "c77cd9420d29_p2_schema_improvements_naming.py",
    "d2aec7a236f4_update_rparun_step3_step4_fields.py",
    "d4e5f6g7h8i9_add_default_accounts.py",
    "d6977674c857_merge_heads.py",
    "d8f000e7240b_merge_heads.py",
    "dfd667b4da21_add_archived_status_to_lot_receipts.py",
    "e1f2g3h4i5j6_add_rpa_run_tables.py",
    "e69e24e713cc_add_lot_details_shipping_cost_sales_tax.py",
    "f0b8334e2d44_merge_rpa_heads.py",
    "f1e2d3c4b5a6_refresh_views.py",
    "fb04bac1471c_merge_heads.py",
    "fe8a7a830d22_remove_smartread_request_type.py",
    "g2h3i4j5k6l7_add_step3_step4_columns.py",
    "h3i4j5k6l7m8_add_cloud_flow_url_settings.py",
    "i4j5k6l7m8n9_add_customer_id_rename_rpa_columns.py",
    "l8m9n0o1p2q3_add_lot_reservation_history.py",
    "m1n2o3p4q5r6_add_warehouse_delivery_routes.py",
    "n1o2p3q4r5s6_add_ocr_sap_complement_columns.py",
    "o2p3q4r5s6t7_add_ocr_import_columns_to_orders.py",
    "p1q2r3s4t5u6_add_on_hold_status.py",
    "phase1_db_refactor.py",
    "sr1a2b3c4d5e6_add_smartread_configs_table.py",
    "w1x2y3z4a5b6_add_withdrawal_cancellation_fields.py",
    "x2y3z4a5b6c7_add_reservation_cancellation_fields.py",
    "y3z4a5b6c7d8_recreate_views.py",
    "z4a5b6c7d8e9_backfill_stock_history_inbound.py",
]


def upgrade() -> None:
    """Archive legacy migration files to archive/ directory."""
    versions_dir = Path(__file__).parent
    archive_dir = versions_dir / "archive"

    # Create archive directory if it doesn't exist
    archive_dir.mkdir(exist_ok=True)

    archived_count = 0
    for filename in LEGACY_FILES:
        src = versions_dir / filename
        if src.exists():
            dst = archive_dir / filename
            try:
                shutil.move(str(src), str(dst))
                print(f"[cleanup_20260119] Archived: {filename}")
                archived_count += 1
            except Exception as e:
                print(f"[cleanup_20260119] Warning: Could not archive {filename}: {e}")

    print(f"[cleanup_20260119] Archived {archived_count} legacy migration files.")


def downgrade() -> None:
    """Restore legacy migration files from archive/ directory."""
    versions_dir = Path(__file__).parent
    archive_dir = versions_dir / "archive"

    if not archive_dir.exists():
        print("[cleanup_20260119] Archive directory does not exist, nothing to restore.")
        return

    restored_count = 0
    for filename in LEGACY_FILES:
        src = archive_dir / filename
        if src.exists():
            dst = versions_dir / filename
            try:
                shutil.move(str(src), str(dst))
                print(f"[cleanup_20260119] Restored: {filename}")
                restored_count += 1
            except Exception as e:
                print(f"[cleanup_20260119] Warning: Could not restore {filename}: {e}")

    print(f"[cleanup_20260119] Restored {restored_count} legacy migration files.")
