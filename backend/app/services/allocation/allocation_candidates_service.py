"""
Allocation candidates service - unified lot candidate query logic.

Refactored: Consolidates duplicate candidate lot queries from 3 routers.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.allocations_schema import CandidateLotRow


def build_candidate_lot_filter(
    product_id: int | None = None,
    warehouse_id: int | None = None,
    order_line_id: int | None = None,
) -> dict:
    """
    Build filter parameters for candidate lot query.

    Args:
        product_id: Filter by product ID
        warehouse_id: Filter by warehouse ID
        order_line_id: Filter by order line ID (extracts product/warehouse from line)

    Returns:
        Dictionary with filter parameters
    """
    return {
        "product_id": product_id,
        "warehouse_id": warehouse_id,
        "order_line_id": order_line_id,
    }


def execute_candidate_lot_query(
    db: Session,
    product_id: int | None = None,
    warehouse_id: int | None = None,
    order_line_id: int | None = None,
    strategy: str = "fefo",
    limit: int = 200,
) -> list[CandidateLotRow]:
    """
    Execute candidate lot query with FEFO ordering.

    Unified logic from:
    - admin_router.get_allocatable_lots
    - allocations_router.get_candidate_lots
    - allocation_candidates_router.get_allocation_candidates

    Args:
        db: Database session
        product_id: Filter by product ID
        warehouse_id: Filter by warehouse ID
        order_line_id: Filter by order line ID (takes precedence)
        strategy: Allocation strategy (currently only "fefo" supported)
        limit: Maximum number of candidates to return

    Returns:
        List of candidate lot rows with allocation info
    """
    # Build SQL query with dynamic filters
    sql_parts = []
    params = {}

    # Base query
    base_sql = """
        SELECT
            l.id AS lot_id,
            l.lot_number,
            l.product_id,
            p.product_code,
            p.product_name,
            l.warehouse_id,
            w.warehouse_code,
            w.warehouse_name,
            l.supplier_id,
            s.supplier_code,
            s.supplier_name,
            l.received_date,
            l.expiry_date,
            l.current_quantity,
            l.allocated_quantity,
            (l.current_quantity - l.allocated_quantity) AS available_quantity,
            l.unit,
            l.status
        FROM lots l
        LEFT JOIN products p ON l.product_id = p.id
        LEFT JOIN warehouses w ON l.warehouse_id = w.id
        LEFT JOIN suppliers s ON l.supplier_id = s.id
        WHERE l.status = 'active'
            AND (l.current_quantity - l.allocated_quantity) > 0
    """
    sql_parts.append(base_sql)

    # Dynamic filters
    if order_line_id is not None:
        # Extract product and warehouse from order line
        sql_parts.append("""
            AND l.product_id = (
                SELECT product_id FROM order_lines WHERE id = :order_line_id
            )
        """)
        params["order_line_id"] = order_line_id

        # Optional: also filter by warehouse if line has one
        sql_parts.append("""
            AND (l.warehouse_id = (
                SELECT warehouse_id FROM order_lines WHERE id = :order_line_id
            ) OR (SELECT warehouse_id FROM order_lines WHERE id = :order_line_id) IS NULL)
        """)
    else:
        if product_id is not None:
            sql_parts.append(" AND l.product_id = :product_id")
            params["product_id"] = product_id

        if warehouse_id is not None:
            sql_parts.append(" AND l.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id

    # FEFO ordering
    if strategy == "fefo":
        sql_parts.append("""
            ORDER BY
                l.expiry_date ASC NULLS LAST,
                l.received_date ASC,
                l.id ASC
        """)
    else:
        # Default: FIFO
        sql_parts.append("""
            ORDER BY
                l.received_date ASC,
                l.id ASC
        """)

    # Limit
    sql_parts.append(" LIMIT :limit")
    params["limit"] = limit

    # Execute query
    full_sql = "".join(sql_parts)
    result = db.execute(text(full_sql), params).fetchall()

    # Convert to schema objects
    candidates = []
    for row in result:
        candidates.append(
            CandidateLotRow(
                lot_id=row.lot_id,
                lot_number=row.lot_number,
                product_id=row.product_id,
                product_code=row.product_code,
                product_name=row.product_name,
                warehouse_id=row.warehouse_id,
                warehouse_code=row.warehouse_code,
                warehouse_name=row.warehouse_name,
                supplier_id=row.supplier_id,
                supplier_code=row.supplier_code,
                supplier_name=row.supplier_name,
                received_date=row.received_date,
                expiry_date=row.expiry_date,
                current_quantity=float(row.current_quantity or 0),
                allocated_quantity=float(row.allocated_quantity or 0),
                available_quantity=float(row.available_quantity or 0),
                unit=row.unit,
                status=row.status,
            )
        )

    return candidates
