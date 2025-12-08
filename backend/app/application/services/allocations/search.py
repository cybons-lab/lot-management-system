"""
Allocation candidates service - unified lot candidate query logic.

Refactored: Uses database views (v2.5) for simplified logic and better performance.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any, cast

from sqlalchemy.orm import Query, Session

from app.infrastructure.persistence.models.views_models import (
    VDeliveryPlaceCodeToId,
    VLotAvailableQty,
    VOrderLineContext,
)
from app.presentation.schemas.allocations.allocations_schema import CandidateLotItem


logger = logging.getLogger(__name__)


def build_candidate_lot_filter(
    product_id: int | None = None,
    warehouse_id: int | None = None,
    order_line_id: int | None = None,
) -> dict:
    """Build filter parameters for candidate lot query.

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


def _apply_fefo_ordering(query: Query) -> Query:
    """Apply FEFO (First Expiry First Out) ordering to query.

    Args:
        query: SQLAlchemy query to order

    Returns:
        Query with FEFO ordering applied
    """
    return query.order_by(
        VLotAvailableQty.expiry_date.asc().nulls_last(),
        VLotAvailableQty.receipt_date.asc(),
        VLotAvailableQty.lot_id.asc(),
    )


def _get_delivery_place_name(db: Session, delivery_place_id: int | None) -> str | None:
    """Get delivery place name by ID.

    Args:
        db: Database session
        delivery_place_id: Delivery place ID

    Returns:
        Delivery place name or None
    """
    if not delivery_place_id:
        return None

    dp = (
        db.query(VDeliveryPlaceCodeToId)
        .filter(VDeliveryPlaceCodeToId.delivery_place_id == delivery_place_id)
        .first()
    )
    return dp.delivery_place_name if dp else None


def _query_lots_from_view(db: Session, product_id: int, strategy: str, limit: int) -> list[Any]:
    """Query lots from VLotAvailableQty view.

    Args:
        db: Database session
        product_id: Product ID to filter
        strategy: Allocation strategy
        limit: Maximum results

    Returns:
        List of lot view results
    """
    query = db.query(VLotAvailableQty).filter(
        VLotAvailableQty.product_id == product_id,
        VLotAvailableQty.available_qty > 0,
    )

    if strategy == "fefo":
        query = _apply_fefo_ordering(query)

    return cast(list[Any], query.limit(limit).all())


def _query_lots_with_fallback(db: Session, product_id: int, strategy: str, limit: int) -> list[Any]:
    """Query lots with fallback to Lot model if view returns no results.

    Args:
        db: Database session
        product_id: Product ID to filter
        strategy: Allocation strategy
        limit: Maximum results

    Returns:
        List of lot results (from view or model)
    """
    results = _query_lots_from_view(db, product_id, strategy, limit)

    if not results:
        from app.infrastructure.persistence.models import Lot

        lot_query = db.query(Lot).filter(
            Lot.product_id == product_id,
            (Lot.current_quantity - Lot.allocated_quantity) > 0,
        )
        if strategy == "fefo":
            lot_query = lot_query.order_by(
                Lot.expiry_date.asc().nulls_last(),
                Lot.received_date.asc(),
                Lot.id.asc(),
            )
        results = lot_query.limit(limit).all()

    return results


def _convert_to_candidate_item(
    lot_view: Any,
    delivery_place_id: int | None = None,
    delivery_place_name: str | None = None,
) -> CandidateLotItem:
    """Convert lot view or model to CandidateLotItem.

    Args:
        lot_view: Lot from view or Lot model
        delivery_place_id: Delivery place ID (optional)
        delivery_place_name: Delivery place name (optional)

    Returns:
        CandidateLotItem with basic info
    """
    # Determine source and extract fields
    if hasattr(lot_view, "available_qty"):
        # From VLotAvailableQty view
        available_qty = float(lot_view.available_qty or 0)
        lot_id = lot_view.lot_id
        received_date = lot_view.receipt_date
        status = lot_view.lot_status
    else:
        # From Lot model
        available_qty = float(lot_view.current_quantity - lot_view.allocated_quantity)
        lot_id = lot_view.id
        received_date = lot_view.received_date
        status = lot_view.status

    return CandidateLotItem(
        lot_id=lot_id,
        lot_number="",  # Will be enriched later
        product_id=lot_view.product_id,
        warehouse_id=lot_view.warehouse_id,
        received_date=received_date,
        expiry_date=lot_view.expiry_date,
        current_quantity=Decimal("0"),  # Will be enriched later
        allocated_quantity=Decimal("0"),  # Will be enriched later
        available_quantity=Decimal(str(available_qty)),
        delivery_place_id=delivery_place_id,
        delivery_place_name=delivery_place_name,
        status=status,
    )


def _enrich_lot_details(db: Session, candidates: list[CandidateLotItem]) -> None:
    """Enrich candidates with lot details (lot_number, quantities, status).

    Args:
        db: Database session
        candidates: List of candidate items to enrich
    """
    if not candidates:
        return

    lot_ids = [c.lot_id for c in candidates]
    from app.infrastructure.persistence.models import Lot

    lots = db.query(Lot).filter(Lot.id.in_(lot_ids)).all()
    lot_map = {lot.id: lot for lot in lots}

    for candidate in candidates:
        lot = lot_map.get(candidate.lot_id)
        if lot:
            candidate.lot_number = lot.lot_number
            candidate.current_quantity = lot.current_quantity
            candidate.allocated_quantity = lot.allocated_quantity
            candidate.status = lot.status
            candidate.lock_reason = lot.lock_reason


def _enrich_warehouse_names(db: Session, candidates: list[CandidateLotItem]) -> None:
    """Enrich candidates with warehouse names.

    Args:
        db: Database session
        candidates: List of candidate items to enrich
    """
    warehouse_ids = {c.warehouse_id for c in candidates if c.warehouse_id}
    if not warehouse_ids:
        return

    from app.infrastructure.persistence.models import Warehouse

    warehouses = db.query(Warehouse).filter(Warehouse.id.in_(warehouse_ids)).all()
    warehouse_map = {w.id: w.warehouse_name for w in warehouses}

    for candidate in candidates:
        if candidate.warehouse_id:
            candidate.warehouse_name = warehouse_map.get(candidate.warehouse_id)


def _enrich_product_units(db: Session, candidates: list[CandidateLotItem]) -> None:
    """Enrich candidates with product unit information.

    Args:
        db: Database session
        candidates: List of candidate items to enrich
    """
    product_ids = {c.product_id for c in candidates if c.product_id}
    if not product_ids:
        return

    from app.infrastructure.persistence.models import Product

    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p for p in products}

    for candidate in candidates:
        if candidate.product_id:
            product = product_map.get(candidate.product_id)
            if product:
                candidate.internal_unit = product.internal_unit
                candidate.external_unit = product.external_unit
                candidate.qty_per_internal_unit = float(product.qty_per_internal_unit or 1.0)


def _enrich_candidate_details(db: Session, candidates: list[CandidateLotItem]) -> None:
    """Enrich candidates with missing details from Lot, Warehouse, and Product
    models.

    Modifies candidates in place.

    Args:
        db: Database session
        candidates: List of candidate items to enrich
    """
    if not candidates:
        return

    _enrich_lot_details(db, candidates)
    _enrich_warehouse_names(db, candidates)
    _enrich_product_units(db, candidates)


def execute_candidate_lot_query(
    db: Session,
    product_id: int | None = None,
    warehouse_id: int | None = None,
    order_line_id: int | None = None,
    strategy: str = "fefo",
    limit: int = 200,
) -> list[CandidateLotItem]:
    """Execute candidate lot query with FEFO ordering.

    v2.6 Refactored: Simplified using extracted helper functions.
    Uses v_lot_available_qty as the main source with fallback to Lot model.

    Args:
        db: Database session
        product_id: Filter by product ID (optional if order_line_id provided)
        warehouse_id: NOT USED for filtering (kept for API compatibility)
        order_line_id: Filter by order line ID (takes precedence)
        strategy: Allocation strategy (currently only "fefo" supported)
        limit: Maximum number of candidates to return

    Returns:
        List of candidate lot items with complete details
    """
    candidates: list[CandidateLotItem] = []

    if order_line_id is not None:
        # Get order line context
        context = (
            db.query(VOrderLineContext)
            .filter(VOrderLineContext.order_line_id == order_line_id)
            .first()
        )

        if not context:
            return candidates

        logger.info(
            f"Context found - product_id={context.product_id}, "
            f"delivery_place_id={context.delivery_place_id}, "
            f"order_line_id={order_line_id}"
        )

        if context.product_id is None:
            return candidates

        # Query lots with fallback
        results = _query_lots_with_fallback(db, context.product_id, strategy, limit)

        # Get delivery place name
        delivery_place_name = _get_delivery_place_name(db, context.delivery_place_id)

        # Convert to candidates
        candidates = [
            _convert_to_candidate_item(
                lot_view,
                delivery_place_id=context.delivery_place_id,
                delivery_place_name=delivery_place_name,
            )
            for lot_view in results
        ]

    else:
        # Query without order line context
        if product_id is None:
            return candidates

        results = _query_lots_from_view(db, product_id, strategy, limit)

        # Convert to candidates (no delivery place info)
        candidates = [_convert_to_candidate_item(row) for row in results]

    # Enrich candidates with missing details
    _enrich_candidate_details(db, candidates)

    return candidates
