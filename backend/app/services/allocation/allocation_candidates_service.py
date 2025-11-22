"""
Allocation candidates service - unified lot candidate query logic.

Refactored: Uses database views (v2.5) for simplified logic and better performance.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.views_models import (
    VDeliveryPlaceCodeToId,
    VLotAvailableQty,
    VOrderLineContext,
)
from app.schemas.allocations.allocations_schema import CandidateLotItem


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
) -> list[CandidateLotItem]:
    """
    Execute candidate lot query with FEFO ordering.

    v2.5 Refactor: Uses v_lot_available_qty as the main source.
    forecast is NOT used as a filter - lots are returned based on inventory only.
    This ensures that products not in forecast (kanban, spot orders) still get candidates.

    warehouse_id is NOT used as a filter - lots from any warehouse are returned as candidates.
    Users can manually select lots from specific warehouses via UI.

    When order_line_id is provided:
    - Uses v_order_line_context to get product_id, customer_id, delivery_place_id
    - Queries v_lot_available_qty filtered by product_id only
    - forecast could be LEFT JOINed for metadata (in_forecast flag) in the future

    When only product_id provided:
    - Directly queries v_lot_available_qty filtered by product_id

    Args:
        db: Database session
        product_id: Filter by product ID (optional if order_line_id provided)
        warehouse_id: NOT USED for filtering (kept for API compatibility)
        order_line_id: Filter by order line ID (takes precedence, extracts product from context)
        strategy: Allocation strategy (currently only "fefo" supported)
        limit: Maximum number of candidates to return

    Returns:
        List of candidate lot items with allocation info
    """
    candidates = []

    if order_line_id is not None:
        # ✅ v2.5 Refactor: Use v_lot_available_qty as main source
        # forecast is joined as LEFT JOIN for metadata only (in_forecast flag)
        # This ensures lots are returned even if product is not in forecast

        # Step 1: Get order line context
        context = (
            db.query(VOrderLineContext)
            .filter(VOrderLineContext.order_line_id == order_line_id)
            .first()
        )

        if not context:
            # No order line found, return empty
            return candidates

        # DEBUG: context情報をログ出力
        import logging

        logger = logging.getLogger(__name__)
        logger.info(
            f"DEBUG: context found - product_id={context.product_id}, delivery_place_id={context.delivery_place_id}, order_line_id={order_line_id}"
        )

        # Step 2: Query available lots based on product_id from context
        # contextから既にproduct_id, delivery_place_idを取得済み
        query = db.query(VLotAvailableQty).filter(
            VLotAvailableQty.product_id == context.product_id,
            VLotAvailableQty.available_qty > 0,
        )

        # warehouse_id フィルタは使用しない（倉庫が異なっていても候補として扱う）

        # FEFO ordering
        if strategy == "fefo":
            query = query.order_by(
                VLotAvailableQty.expiry_date.asc().nulls_last(),
                VLotAvailableQty.receipt_date.asc(),
                VLotAvailableQty.lot_id.asc(),
            )

        results = query.limit(limit).all()
        # Fallback to Lot model if view returns no results (e.g., recent inserts not visible)
        if not results:
            from app.models import Lot

            lot_query = db.query(Lot).filter(
                Lot.product_id == context.product_id,
                (Lot.current_quantity - Lot.allocated_quantity) > 0,
            )
            if strategy == "fefo":
                lot_query = lot_query.order_by(
                    Lot.expiry_date.asc().nulls_last(), Lot.received_date.asc(), Lot.id.asc()
                )
            results = lot_query.limit(limit).all()

        # delivery_place情報をcontextから取得
        delivery_place_name = None
        if context.delivery_place_id:
            dp = (
                db.query(VDeliveryPlaceCodeToId)
                .filter(VDeliveryPlaceCodeToId.delivery_place_id == context.delivery_place_id)
                .first()
            )
            if dp:
                delivery_place_name = dp.delivery_place_name

        for lot_view in results:
            # Determine available_quantity based on the source (VLotAvailableQty or Lot model)
            if hasattr(lot_view, "available_qty"):
                available_qty = float(lot_view.available_qty or 0)
                lot_id = lot_view.lot_id
                received_date = lot_view.receipt_date
            else:  # Assume it's a Lot model instance
                available_qty = float(lot_view.current_quantity - lot_view.allocated_quantity)
                lot_id = lot_view.id
                received_date = lot_view.received_date

            candidates.append(
                CandidateLotItem(
                    lot_id=lot_id,
                    lot_number="",  # Will be populated later
                    product_id=lot_view.product_id,
                    warehouse_id=lot_view.warehouse_id,
                    received_date=received_date,
                    expiry_date=lot_view.expiry_date,
                    current_quantity=0.0,  # Will be populated later
                    allocated_quantity=0.0,  # Will be populated later
                    available_quantity=float(lot_view.available_qty or 0),
                    delivery_place_id=context.delivery_place_id,
                    delivery_place_name=delivery_place_name,
                )
            )

    else:
        # Use general available quantity view
        query = db.query(VLotAvailableQty).filter(VLotAvailableQty.available_qty > 0)

        if product_id is not None:
            query = query.filter(VLotAvailableQty.product_id == product_id)

        # warehouse_id フィルタは使用しない（倉庫が異なっていても候補として扱う）

        if strategy == "fefo":
            query = query.order_by(
                VLotAvailableQty.expiry_date.asc().nulls_last(),
                VLotAvailableQty.receipt_date.asc(),
                VLotAvailableQty.lot_id.asc(),
            )

        results = query.limit(limit).all()

        for row in results:
            candidates.append(
                CandidateLotItem(
                    lot_id=row.lot_id,
                    lot_number="",  # Missing in view
                    product_id=row.product_id,
                    warehouse_id=row.warehouse_id,
                    received_date=row.receipt_date,
                    expiry_date=row.expiry_date,
                    current_quantity=0.0,  # Missing
                    allocated_quantity=0.0,  # Missing
                    available_quantity=float(row.available_qty or 0),
                    # Delivery place info not available when not filtering by order line
                    delivery_place_id=None,
                    delivery_place_name=None,
                )
            )

    # Post-processing to fetch missing details (lot_number, current_quantity) if they are missing from views
    if candidates:
        lot_ids = [c.lot_id for c in candidates]
        # Avoid circular import if possible, or import Lot model
        from app.models import Lot

        lots = db.query(Lot).filter(Lot.id.in_(lot_ids)).all()
        lot_map = {l.id: l for l in lots}

        for c in candidates:
            lot = lot_map.get(c.lot_id)
            if lot:
                c.lot_number = lot.lot_number
                c.current_quantity = float(lot.current_quantity)
                c.allocated_quantity = float(lot.allocated_quantity)
                # available is already from view, which is correct

        # Populate warehouse_name
        warehouse_ids = {c.warehouse_id for c in candidates if c.warehouse_id}
        if warehouse_ids:
            from app.models import Warehouse

            warehouses = db.query(Warehouse).filter(Warehouse.id.in_(warehouse_ids)).all()
            warehouse_map = {w.id: w.warehouse_name for w in warehouses}

            for c in candidates:
                if c.warehouse_id:
                    c.warehouse_name = warehouse_map.get(c.warehouse_id)

    return candidates
