"""Inventory adjustment service layer."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.inventory_models import Adjustment, Lot, StockHistory, StockTransactionType
from app.schemas.inventory.inventory_schema import AdjustmentCreate, AdjustmentResponse


class AdjustmentService:
    """Business logic for inventory adjustments."""

    def __init__(self, db: Session):
        """
        Initialize adjustment service.

        Args:
            db: Database session
        """
        self.db = db

    def get_adjustments(
        self,
        skip: int = 0,
        limit: int = 100,
        lot_id: int | None = None,
        adjustment_type: str | None = None,
    ) -> list[AdjustmentResponse]:
        """
        Get adjustment records with optional filtering.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            lot_id: Filter by lot ID
            adjustment_type: Filter by adjustment type

        Returns:
            List of adjustment records
        """
        query = self.db.query(Adjustment)

        if lot_id is not None:
            query = query.filter(Adjustment.lot_id == lot_id)

        if adjustment_type is not None:
            query = query.filter(Adjustment.adjustment_type == adjustment_type)

        query = query.order_by(Adjustment.adjusted_at.desc())

        adjustments = query.offset(skip).limit(limit).all()

        return [
            AdjustmentResponse(
                id=adj.id,
                lot_id=adj.lot_id,
                adjustment_type=adj.adjustment_type,
                adjusted_quantity=adj.adjusted_quantity,
                reason=adj.reason,
                adjusted_by=adj.adjusted_by,
                adjusted_at=adj.adjusted_at,
            )
            for adj in adjustments
        ]

    def get_adjustment_by_id(self, adjustment_id: int) -> AdjustmentResponse | None:
        """
        Get adjustment by ID.

        Args:
            adjustment_id: Adjustment ID

        Returns:
            Adjustment record, or None if not found
        """
        adjustment = self.db.query(Adjustment).filter(Adjustment.id == adjustment_id).first()

        if not adjustment:
            return None

        return AdjustmentResponse(
            id=adjustment.id,
            lot_id=adjustment.lot_id,
            adjustment_type=adjustment.adjustment_type,
            adjusted_quantity=adjustment.adjusted_quantity,
            reason=adjustment.reason,
            adjusted_by=adjustment.adjusted_by,
            adjusted_at=adjustment.adjusted_at,
        )

    def create_adjustment(self, adjustment: AdjustmentCreate) -> AdjustmentResponse:
        """
        Create inventory adjustment.

        Args:
            adjustment: Adjustment creation data

        Returns:
            Created adjustment record

        Raises:
            ValueError: If lot not found or adjustment would result in negative quantity

        Note:
            - Updates lot's current_quantity
            - Creates stock_history record
        """
        # Get lot
        lot = self.db.query(Lot).filter(Lot.id == adjustment.lot_id).first()

        if not lot:
            raise ValueError(f"Lot with id={adjustment.lot_id} not found")

        # Calculate new quantity
        new_quantity = lot.current_quantity + adjustment.adjusted_quantity

        if new_quantity < Decimal("0"):
            raise ValueError(
                f"Adjustment would result in negative quantity. "
                f"Current: {lot.current_quantity}, Adjustment: {adjustment.adjusted_quantity}"
            )

        # Create adjustment record
        db_adjustment = Adjustment(
            lot_id=adjustment.lot_id,
            adjustment_type=adjustment.adjustment_type,
            adjusted_quantity=adjustment.adjusted_quantity,
            reason=adjustment.reason,
            adjusted_by=adjustment.adjusted_by,
        )

        self.db.add(db_adjustment)
        self.db.flush()

        # Update lot quantity
        lot.current_quantity = new_quantity
        lot.updated_at = datetime.now()

        # Update lot status if necessary
        if new_quantity == Decimal("0"):
            lot.status = "depleted"

        # Create stock history record
        stock_history = StockHistory(
            lot_id=lot.id,
            transaction_type=StockTransactionType.ADJUSTMENT,
            quantity_change=adjustment.adjusted_quantity,
            quantity_after=new_quantity,
            reference_type="adjustment",
            reference_id=db_adjustment.id,
            transaction_date=datetime.now(),
        )

        self.db.add(stock_history)

        self.db.commit()
        self.db.refresh(db_adjustment)

        return AdjustmentResponse(
            id=db_adjustment.id,
            lot_id=db_adjustment.lot_id,
            adjustment_type=db_adjustment.adjustment_type,
            adjusted_quantity=db_adjustment.adjusted_quantity,
            reason=db_adjustment.reason,
            adjusted_by=db_adjustment.adjusted_by,
            adjusted_at=db_adjustment.adjusted_at,
        )
