"""Allocation suggestions service (引当推奨サービス)."""

from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.models.forecast_models import ForecastLine
from app.models.inventory_models import AllocationSuggestion, Lot
from app.schemas.allocations.allocation_suggestions_schema import AllocationSuggestionCreate


class AllocationSuggestionService:
    """Service for allocation suggestions (引当推奨)."""

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        forecast_line_id: int | None = None,
        lot_id: int | None = None,
    ) -> tuple[list[AllocationSuggestion], int]:
        """
        Get all allocation suggestions with filtering and pagination.

        Returns:
            tuple: (list of suggestions, total count)
        """
        query = self.db.query(AllocationSuggestion).options(
            joinedload(AllocationSuggestion.lot), joinedload(AllocationSuggestion.forecast_line)
        )

        # Apply filters
        if forecast_line_id is not None:
            query = query.filter(AllocationSuggestion.forecast_line_id == forecast_line_id)

        if lot_id is not None:
            query = query.filter(AllocationSuggestion.lot_id == lot_id)

        # Get total count
        total = query.count()

        # Apply pagination and order
        suggestions = (
            query.order_by(AllocationSuggestion.created_at.desc()).offset(skip).limit(limit).all()
        )

        return suggestions, total

    def get_by_id(self, suggestion_id: int) -> AllocationSuggestion | None:
        """Get allocation suggestion by ID."""
        return (
            self.db.query(AllocationSuggestion)
            .options(
                joinedload(AllocationSuggestion.lot), joinedload(AllocationSuggestion.forecast_line)
            )
            .filter(AllocationSuggestion.suggestion_id == suggestion_id)
            .first()
        )

    def get_by_forecast_line(self, forecast_line_id: int) -> list[AllocationSuggestion]:
        """Get all suggestions for a forecast line."""
        return (
            self.db.query(AllocationSuggestion)
            .options(joinedload(AllocationSuggestion.lot))
            .filter(AllocationSuggestion.forecast_line_id == forecast_line_id)
            .order_by(AllocationSuggestion.suggested_quantity.desc())
            .all()
        )

    def create(self, suggestion: AllocationSuggestionCreate) -> AllocationSuggestion:
        """Create a new allocation suggestion."""
        db_suggestion = AllocationSuggestion(**suggestion.model_dump())
        self.db.add(db_suggestion)
        self.db.commit()
        self.db.refresh(db_suggestion)
        return db_suggestion

    def create_bulk(
        self, suggestions: list[AllocationSuggestionCreate]
    ) -> list[AllocationSuggestion]:
        """Create multiple allocation suggestions at once."""
        db_suggestions = [AllocationSuggestion(**s.model_dump()) for s in suggestions]
        self.db.add_all(db_suggestions)
        self.db.commit()
        for s in db_suggestions:
            self.db.refresh(s)
        return db_suggestions

    def delete(self, suggestion_id: int) -> bool:
        """Delete an allocation suggestion."""
        db_suggestion = self.get_by_id(suggestion_id)
        if not db_suggestion:
            return False

        self.db.delete(db_suggestion)
        self.db.commit()
        return True

    def delete_by_forecast_line(self, forecast_line_id: int) -> int:
        """Delete all suggestions for a forecast line. Returns number of deleted suggestions."""
        deleted = (
            self.db.query(AllocationSuggestion)
            .filter(AllocationSuggestion.forecast_line_id == forecast_line_id)
            .delete()
        )
        self.db.commit()
        return deleted

    def generate_suggestions(
        self, forecast_line_id: int, logic: str = "FEFO", max_suggestions: int = 5
    ) -> list[AllocationSuggestion]:
        """
        Generate allocation suggestions for a forecast line using specified logic.

        This is a stub implementation that generates FEFO-based suggestions.
        In production, this would integrate with the actual FEFO allocation algorithm.

        Args:
            forecast_line_id: Forecast line ID
            logic: Allocation logic (FEFO/FIFO/MANUAL)
            max_suggestions: Maximum number of suggestions to generate

        Returns:
            List of created allocation suggestions
        """
        # Get forecast line
        forecast_line = (
            self.db.query(ForecastLine)
            .filter(ForecastLine.forecast_line_id == forecast_line_id)
            .first()
        )

        if not forecast_line:
            return []

        # Delete existing suggestions for this forecast line
        self.delete_by_forecast_line(forecast_line_id)

        # Get candidate lots (FEFO logic: earliest expiry first)
        # TODO: This is a simplified version - in production, add more filters
        # (e.g., warehouse, product, available quantity, etc.)
        candidate_lots = (
            self.db.query(Lot)
            .filter(
                Lot.product_id == forecast_line.product_id,
                Lot.status == "active",
                Lot.current_quantity > Lot.allocated_quantity,
            )
            .order_by(Lot.expiry_date.asc().nullslast())
            .limit(max_suggestions)
            .all()
        )

        # Generate suggestions
        suggestions = []
        remaining_quantity = forecast_line.forecast_quantity

        for lot in candidate_lots:
            if remaining_quantity <= 0:
                break

            available_quantity = lot.current_quantity - lot.allocated_quantity
            suggested_quantity = min(available_quantity, remaining_quantity)

            suggestion = AllocationSuggestion(
                forecast_line_id=forecast_line_id,
                lot_id=lot.id,
                suggested_quantity=Decimal(str(suggested_quantity)),
                allocation_logic=logic,
            )

            self.db.add(suggestion)
            suggestions.append(suggestion)

            remaining_quantity -= suggested_quantity

        self.db.commit()

        # Refresh all suggestions
        for s in suggestions:
            self.db.refresh(s)

        return suggestions
