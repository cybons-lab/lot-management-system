"""Forecast service layer with header/line structure support."""

from datetime import datetime

from sqlalchemy.orm import Session, joinedload

from app.models.forecast_models import ForecastHeader, ForecastLine
from app.schemas.forecasts.forecast_schema import (
    ForecastHeaderCreate,
    ForecastHeaderDetailResponse,
    ForecastHeaderResponse,
    ForecastHeaderUpdate,
    ForecastLineCreate,
    ForecastLineResponse,
    ForecastLineUpdate,
)


class ForecastService:
    """Business logic for forecast headers and lines."""

    def __init__(self, db: Session):
        """
        Initialize forecast service.

        Args:
            db: Database session
        """
        self.db = db

    # ===== Forecast Header Operations =====

    def get_headers(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: int | None = None,
        delivery_place_id: int | None = None,
        status: str | None = None,
    ) -> list[ForecastHeader]:
        """
        Get forecast headers with optional filtering.

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return
            customer_id: Filter by customer ID
            delivery_place_id: Filter by delivery place ID
            status: Filter by status (active/completed/cancelled)

        Returns:
            List of forecast headers
        """
        query = self.db.query(ForecastHeader)

        if customer_id is not None:
            query = query.filter(ForecastHeader.customer_id == customer_id)

        if delivery_place_id is not None:
            query = query.filter(ForecastHeader.delivery_place_id == delivery_place_id)

        if status is not None:
            query = query.filter(ForecastHeader.status == status)

        query = query.order_by(ForecastHeader.created_at.desc())

        return query.offset(skip).limit(limit).all()

    def get_header_by_id(self, header_id: int) -> ForecastHeaderDetailResponse | None:
        """
        Get forecast header by ID with associated lines.

        Args:
            header_id: Forecast header ID

        Returns:
            Forecast header with lines, or None if not found
        """
        header = (
            self.db.query(ForecastHeader)
            .options(joinedload(ForecastHeader.lines))
            .filter(ForecastHeader.id == header_id)
            .first()
        )

        if not header:
            return None

        # Convert to response schema
        return ForecastHeaderDetailResponse(
            id=header.id,
            customer_id=header.customer_id,
            delivery_place_id=header.delivery_place_id,
            forecast_number=header.forecast_number,
            forecast_start_date=header.forecast_start_date,
            forecast_end_date=header.forecast_end_date,
            status=header.status,
            created_at=header.created_at,
            updated_at=header.updated_at,
            lines=[
                ForecastLineResponse(
                    id=line.id,
                    forecast_id=line.forecast_id,
                    product_id=line.product_id,
                    delivery_date=line.delivery_date,
                    forecast_quantity=line.forecast_quantity,
                    unit=line.unit,
                    created_at=line.created_at,
                    updated_at=line.updated_at,
                )
                for line in header.lines
            ],
        )

    def create_header(self, header: ForecastHeaderCreate) -> ForecastHeaderDetailResponse:
        """
        Create forecast header (with optional lines).

        Args:
            header: Forecast header creation data

        Returns:
            Created forecast header with lines
        """
        # Create header
        db_header = ForecastHeader(
            customer_id=header.customer_id,
            delivery_place_id=header.delivery_place_id,
            forecast_number=header.forecast_number,
            forecast_start_date=header.forecast_start_date,
            forecast_end_date=header.forecast_end_date,
            status=header.status,
        )

        self.db.add(db_header)
        self.db.flush()  # Get header ID

        # Create lines if provided
        created_lines = []
        if header.lines:
            for line_data in header.lines:
                db_line = ForecastLine(
                    forecast_id=db_header.id,
                    product_id=line_data.product_id,
                    delivery_date=line_data.delivery_date,
                    forecast_quantity=line_data.forecast_quantity,
                    unit=line_data.unit,
                )
                self.db.add(db_line)
                created_lines.append(db_line)

        self.db.commit()
        self.db.refresh(db_header)

        # Refresh lines to get IDs
        for line in created_lines:
            self.db.refresh(line)

        return ForecastHeaderDetailResponse(
            id=db_header.id,
            customer_id=db_header.customer_id,
            delivery_place_id=db_header.delivery_place_id,
            forecast_number=db_header.forecast_number,
            forecast_start_date=db_header.forecast_start_date,
            forecast_end_date=db_header.forecast_end_date,
            status=db_header.status,
            created_at=db_header.created_at,
            updated_at=db_header.updated_at,
            lines=[
                ForecastLineResponse(
                    id=line.id,
                    forecast_id=line.forecast_id,
                    product_id=line.product_id,
                    delivery_date=line.delivery_date,
                    forecast_quantity=line.forecast_quantity,
                    unit=line.unit,
                    created_at=line.created_at,
                    updated_at=line.updated_at,
                )
                for line in created_lines
            ],
        )

    def update_header(
        self, header_id: int, header: ForecastHeaderUpdate
    ) -> ForecastHeaderResponse | None:
        """
        Update forecast header.

        Args:
            header_id: Forecast header ID
            header: Update data

        Returns:
            Updated forecast header, or None if not found
        """
        db_header = self.db.query(ForecastHeader).filter(ForecastHeader.id == header_id).first()

        if not db_header:
            return None

        # Update fields
        update_data = header.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_header, key, value)

        db_header.updated_at = datetime.now()

        self.db.commit()
        self.db.refresh(db_header)

        return ForecastHeaderResponse(
            id=db_header.id,
            customer_id=db_header.customer_id,
            delivery_place_id=db_header.delivery_place_id,
            forecast_number=db_header.forecast_number,
            forecast_start_date=db_header.forecast_start_date,
            forecast_end_date=db_header.forecast_end_date,
            status=db_header.status,
            created_at=db_header.created_at,
            updated_at=db_header.updated_at,
        )

    def delete_header(self, header_id: int) -> bool:
        """
        Delete forecast header (cascade delete lines).

        Args:
            header_id: Forecast header ID

        Returns:
            True if deleted, False if not found
        """
        db_header = self.db.query(ForecastHeader).filter(ForecastHeader.id == header_id).first()

        if not db_header:
            return False

        self.db.delete(db_header)
        self.db.commit()

        return True

    # ===== Forecast Line Operations =====

    def get_lines_by_header(self, header_id: int) -> list[ForecastLineResponse]:
        """
        Get all forecast lines for a header.

        Args:
            header_id: Forecast header ID

        Returns:
            List of forecast lines
        """
        lines = (
            self.db.query(ForecastLine)
            .filter(ForecastLine.forecast_id == header_id)
            .order_by(ForecastLine.delivery_date)
            .all()
        )

        return [
            ForecastLineResponse(
                id=line.id,
                forecast_id=line.forecast_id,
                product_id=line.product_id,
                delivery_date=line.delivery_date,
                forecast_quantity=line.forecast_quantity,
                unit=line.unit,
                created_at=line.created_at,
                updated_at=line.updated_at,
            )
            for line in lines
        ]

    def create_line(self, header_id: int, line: ForecastLineCreate) -> ForecastLineResponse:
        """
        Create forecast line.

        Args:
            header_id: Forecast header ID
            line: Line creation data

        Returns:
            Created forecast line

        Raises:
            ValueError: If header not found
        """
        # Verify header exists
        header = self.db.query(ForecastHeader).filter(ForecastHeader.id == header_id).first()

        if not header:
            raise ValueError(f"Forecast header with id={header_id} not found")

        db_line = ForecastLine(
            forecast_id=header_id,
            product_id=line.product_id,
            delivery_date=line.delivery_date,
            forecast_quantity=line.forecast_quantity,
            unit=line.unit,
        )

        self.db.add(db_line)
        self.db.commit()
        self.db.refresh(db_line)

        return ForecastLineResponse(
            id=db_line.id,
            forecast_id=db_line.forecast_id,
            product_id=db_line.product_id,
            delivery_date=db_line.delivery_date,
            forecast_quantity=db_line.forecast_quantity,
            unit=db_line.unit,
            created_at=db_line.created_at,
            updated_at=db_line.updated_at,
        )

    def update_line(self, line_id: int, line: ForecastLineUpdate) -> ForecastLineResponse | None:
        """
        Update forecast line.

        Args:
            line_id: Forecast line ID
            line: Update data

        Returns:
            Updated forecast line, or None if not found
        """
        db_line = self.db.query(ForecastLine).filter(ForecastLine.id == line_id).first()

        if not db_line:
            return None

        # Update fields
        update_data = line.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_line, key, value)

        db_line.updated_at = datetime.now()

        self.db.commit()
        self.db.refresh(db_line)

        return ForecastLineResponse(
            id=db_line.id,
            forecast_id=db_line.forecast_id,
            product_id=db_line.product_id,
            delivery_date=db_line.delivery_date,
            forecast_quantity=db_line.forecast_quantity,
            unit=db_line.unit,
            created_at=db_line.created_at,
            updated_at=db_line.updated_at,
        )

    def delete_line(self, line_id: int) -> bool:
        """
        Delete forecast line.

        Args:
            line_id: Forecast line ID

        Returns:
            True if deleted, False if not found
        """
        db_line = self.db.query(ForecastLine).filter(ForecastLine.id == line_id).first()

        if not db_line:
            return False

        self.db.delete(db_line)
        self.db.commit()

        return True

    # ===== Bulk Operations =====

    def bulk_import_headers(
        self, headers: list[ForecastHeaderCreate]
    ) -> list[ForecastHeaderDetailResponse]:
        """
        Bulk import forecast headers with lines.

        Args:
            headers: List of forecast header creation data

        Returns:
            List of created forecast headers with lines

        Note:
            All operations are performed in a single transaction.
            If any error occurs, all changes are rolled back.
        """
        created_headers = []

        try:
            for header_data in headers:
                created_header = self.create_header(header_data)
                created_headers.append(created_header)

            return created_headers

        except Exception as e:
            self.db.rollback()
            raise e


def assign_auto_forecast_identifier(*args, **kwargs):
    """Backward compatible stub for old assign_auto_forecast_identifier.

    Todo:
        forecast_router 側を ForecastService ベースの新実装に
        リファクタしたら、この関数は削除する。
    """
    raise NotImplementedError(
        "assign_auto_forecast_identifier is deprecated. "
        "Use ForecastService-based implementation instead."
    )
