"""Test database utilities for view-aware setup and teardown."""

from __future__ import annotations

import warnings
from collections.abc import Iterable
from pathlib import Path

from sqlalchemy.engine import Engine

from app.infrastructure.persistence.models.base_model import Base


# Views defined in backend/sql/views/create_views.sql
VIEW_NAMES: list[str] = [
    "v_inventory_summary",
    "v_lot_details",
    "v_order_line_details",
    "v_lot_allocations",
    "v_lot_active_reservations",
    "v_lot_current_stock",
    "v_customer_daily_products",
    "v_order_line_context",
    "v_customer_code_to_id",
    "v_delivery_place_code_to_id",
    "v_product_code_to_id",
    "v_supplier_code_to_id",
    "v_forecast_order_pairs",
    "v_lot_available_qty",
    "v_candidate_lots_by_order_line",
    "v_warehouse_code_to_id",
    "v_user_supplier_assignments",
    "v_customer_item_jiku_mappings",
    "v_lot_receipt_stock",
    "v_ocr_results",
]


def get_non_view_tables() -> list:
    """Return metadata tables excluding view declarations."""

    return [table for table in Base.metadata.tables.values() if not table.info.get("is_view")]


def create_core_tables(engine: Engine) -> None:
    """Create only real tables, skipping view models defined in SQLAlchemy."""

    Base.metadata.create_all(bind=engine, tables=get_non_view_tables())


def drop_known_view_relations(engine: Engine) -> None:
    """Drop any relation (table/view) that shares a view name.

    This prevents "wrong object type" errors when applying the view SQL.
    """

    raw_conn = engine.raw_connection()
    try:
        cursor = raw_conn.cursor()
        _drop_conflicting_relations(cursor, VIEW_NAMES)
        raw_conn.commit()
    finally:
        raw_conn.close()


def apply_views_sql(engine: Engine) -> None:
    """Apply the canonical view definitions from create_views.sql."""

    views_sql_path = Path(__file__).resolve().parent.parent / "sql" / "views" / "create_views.sql"
    if not views_sql_path.exists():
        warnings.warn(f"Views SQL file not found: {views_sql_path}", stacklevel=2)
        return

    sql_content = views_sql_path.read_text(encoding="utf-8")
    raw_conn = engine.raw_connection()
    try:
        cursor = raw_conn.cursor()
        _drop_conflicting_relations(cursor, VIEW_NAMES)
        raw_conn.commit()

        cursor.execute(sql_content)
        raw_conn.commit()
    finally:
        raw_conn.close()


def _drop_conflicting_relations(cursor, view_names: Iterable[str]) -> None:
    """Drop objects that block view creation (tables or existing views)."""

    for view_name in view_names:
        cursor.execute(
            """
            SELECT c.relkind
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = %s
            """,
            (view_name,),
        )
        row = cursor.fetchone()
        if not row:
            continue

        relkind = row[0]
        if relkind in ("v", "m"):
            cursor.execute(f'DROP VIEW IF EXISTS "{view_name}" CASCADE')
        else:
            cursor.execute(f'DROP TABLE IF EXISTS "{view_name}" CASCADE')
