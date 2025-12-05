"""Order service layer aligned with SQLAlchemy 2.0 models."""

from __future__ import annotations

from datetime import date
from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.domain.order import (
    DuplicateOrderError,
    InvalidOrderStatusError,
    OrderNotFoundError,
    OrderValidationError,
    ProductNotFoundError,
)
from app.models import (
    Allocation,
    Customer,
    Order,
    OrderLine,
    Product,
)
from app.schemas.orders.orders_schema import (
    OrderCreate,
    OrderLineResponse,
    OrderResponse,
    OrderWithLinesResponse,
)


class OrderService:
    """Encapsulates order-related business logic."""

    def __init__(self, db: Session):
        self.db = db

    def get_orders(
        self,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        customer_code: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[OrderResponse]:
        stmt = select(Order).options(  # type: ignore[assignment]
            selectinload(Order.order_lines)
            .selectinload(OrderLine.allocations)
            .joinedload(Allocation.lot)
        )

        if customer_code:
            # JOIN Customer table to filter by customer_code
            stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
                Customer.customer_code == customer_code
            )
        if status:
            stmt = stmt.where(Order.status == status)
        if status:
            stmt = stmt.where(Order.status == status)
        if date_from:
            stmt = stmt.where(Order.order_date >= date_from)
        if date_to:
            stmt = stmt.where(Order.order_date <= date_to)

        stmt = stmt.order_by(Order.order_date.desc()).offset(skip).limit(limit)
        orders = self.db.execute(stmt).scalars().all()

        # Convert to Pydantic models
        response_orders = [OrderWithLinesResponse.model_validate(order) for order in orders]

        # Populate additional info
        self._populate_additional_info(response_orders)

        return response_orders

    def get_order_lines(
        self,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        customer_code: str | None = None,
        product_code: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[OrderLineResponse]:
        """Get flattened order lines with filtering."""
        stmt = (
            select(OrderLine)
            .join(Order, OrderLine.order_id == Order.id)
            .options(
                selectinload(OrderLine.order).selectinload(Order.customer),
                selectinload(OrderLine.allocations).joinedload(Allocation.lot),
                selectinload(OrderLine.product),
            )
        )

        if customer_code:
            stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
                Customer.customer_code == customer_code
            )

        if product_code:
            stmt = stmt.join(Product, OrderLine.product_id == Product.id).where(
                Product.maker_part_code == product_code
            )

        if status:
            stmt = stmt.where(OrderLine.status == status)

        if date_from:
            stmt = stmt.where(OrderLine.delivery_date >= date_from)
        if date_to:
            stmt = stmt.where(OrderLine.delivery_date <= date_to)

        stmt = stmt.order_by(OrderLine.delivery_date.asc()).offset(skip).limit(limit)
        lines = self.db.execute(stmt).scalars().all()

        # Convert to Pydantic models
        response_lines = []
        for line in lines:
            resp = OrderLineResponse.model_validate(line)
            # Manually populate flattened fields from relations
            if line.order:
                resp.order_number = line.order.order_number
                resp.customer_id = line.order.customer_id
                resp.order_date = line.order.order_date
                if line.order.customer:
                    resp.customer_name = line.order.customer.customer_name
                    resp.customer_code = line.order.customer.customer_code

            # Populate lot info in allocations
            for i, alloc in enumerate(line.allocations):
                if i < len(resp.allocations):
                    if alloc.lot:
                        resp.allocations[i].lot_number = alloc.lot.lot_number

            response_lines.append(resp)

        # Populate additional info (product details, etc.)
        self._populate_line_additional_info(response_lines)

        return response_lines

    def get_order_detail(self, order_id: int) -> OrderWithLinesResponse:
        # Load order with related data (DDL v2.2 compliant)
        stmt = (  # type: ignore[assignment]
            select(Order)
            .options(
                selectinload(Order.order_lines).selectinload(OrderLine.product),
                selectinload(Order.order_lines)
                .selectinload(OrderLine.allocations)
                .joinedload(Allocation.lot),
                selectinload(Order.customer),
            )
            .where(Order.id == order_id)
        )
        order = self.db.execute(stmt).scalar_one_or_none()
        if not order:
            raise OrderNotFoundError(order_id)

        response_order = cast(OrderWithLinesResponse, OrderWithLinesResponse.model_validate(order))
        self._populate_additional_info([response_order])
        return response_order

    def create_order(self, order_data: OrderCreate) -> OrderWithLinesResponse:
        # Validate order_number uniqueness
        existing_stmt = select(Order).where(Order.order_number == order_data.order_number)
        existing = self.db.execute(existing_stmt).scalar_one_or_none()
        if existing:
            raise DuplicateOrderError(order_data.order_number)

        # Validate customer_id exists
        customer_stmt = select(Customer).where(Customer.id == order_data.customer_id)
        customer = self.db.execute(customer_stmt).scalar_one_or_none()
        if not customer:
            raise OrderValidationError(f"Customer not found for ID {order_data.customer_id}")

        # Create order (DDL v2.2 compliant - no legacy fields)
        order = Order(
            order_number=order_data.order_number,
            customer_id=order_data.customer_id,
            order_date=order_data.order_date,
        )
        self.db.add(order)
        self.db.flush()

        # Create order lines
        for line_data in order_data.lines:
            # Validate product_id exists
            product_stmt = select(Product).where(Product.id == line_data.product_id)
            product = self.db.execute(product_stmt).scalar_one_or_none()
            if not product:
                raise ProductNotFoundError(str(line_data.product_id))

            # Calculate converted_quantity
            converted_qty = line_data.order_quantity
            if product.internal_unit and product.qty_per_internal_unit:
                if line_data.unit == product.internal_unit:
                    converted_qty = line_data.order_quantity
                elif line_data.unit == product.external_unit:
                    # external -> internal (e.g. KG -> CAN)
                    # 1 CAN = 20 KG => 40 KG = 2 CAN
                    # qty = 40 / 20 = 2
                    converted_qty = line_data.order_quantity / product.qty_per_internal_unit
                else:
                    # Unknown unit, fallback to order_quantity or handle as error?
                    # For now, fallback to order_quantity (assuming 1:1 if unknown)
                    converted_qty = line_data.order_quantity

            # Create order line (DDL v2.2 compliant)
            line = OrderLine(
                order_id=order.id,
                product_id=line_data.product_id,
                delivery_date=line_data.delivery_date,
                order_quantity=line_data.order_quantity,
                unit=line_data.unit,
                converted_quantity=converted_qty,
                delivery_place_id=line_data.delivery_place_id,
            )
            self.db.add(line)

        self.db.flush()
        self.db.refresh(order)

        return cast(OrderWithLinesResponse, OrderWithLinesResponse.model_validate(order))

    def cancel_order(self, order_id: int) -> None:
        # Load order with lines
        stmt = select(Order).options(selectinload(Order.order_lines)).where(Order.id == order_id)
        order = self.db.execute(stmt).scalar_one_or_none()
        if not order:
            raise OrderNotFoundError(order_id)

        # Cancel all lines
        for line in order.order_lines:
            if line.status in {"shipped", "completed"}:
                raise InvalidOrderStatusError(line.status, "cancel")
            line.status = "cancelled"

        order.status = "cancelled"

        self.db.flush()
        self.db.flush()

    def _populate_additional_info(self, orders: list[OrderWithLinesResponse]) -> None:
        """Populate additional display info using v_order_line_details view."""
        if not orders:
            return

        order_ids = [order.id for order in orders]
        if not order_ids:
            return

        # Fetch details from view
        query = """
            SELECT 
                order_id, line_id, 
                supplier_name, 
                product_code, product_name, product_internal_unit, product_external_unit, product_qty_per_internal_unit,
                delivery_place_name
            FROM v_order_line_details
            WHERE order_id IN :order_ids
        """

        from sqlalchemy import text

        rows = self.db.execute(text(query), {"order_ids": tuple(order_ids)}).fetchall()

        # Map details by line_id
        details_map = {row.line_id: row for row in rows}

        # Update lines
        for order in orders:
            for line in order.lines:
                detail = details_map.get(line.id)
                if detail:
                    line.supplier_name = detail.supplier_name
                    line.product_code = detail.product_code
                    line.product_name = detail.product_name
                    line.product_internal_unit = detail.product_internal_unit
                    line.product_external_unit = detail.product_external_unit
                    line.product_qty_per_internal_unit = float(
                        detail.product_qty_per_internal_unit or 1.0
                    )
                    line.delivery_place_name = detail.delivery_place_name

    def _populate_line_additional_info(self, lines: list[OrderLineResponse]) -> None:
        """Populate additional display info for a list of OrderLineResponse."""
        if not lines:
            return

        line_ids = [line.id for line in lines]
        if not line_ids:
            return

        # Fetch details from view
        query = """
            SELECT 
                line_id, 
                supplier_name, 
                product_code, product_name, product_internal_unit, product_external_unit, product_qty_per_internal_unit,
                delivery_place_name
            FROM v_order_line_details
            WHERE line_id IN :line_ids
        """

        from sqlalchemy import text

        rows = self.db.execute(text(query), {"line_ids": tuple(line_ids)}).fetchall()

        # Map details by line_id
        details_map = {row.line_id: row for row in rows}

        # Update lines
        for line in lines:
            detail = details_map.get(line.id)
            if detail:
                line.supplier_name = detail.supplier_name
                line.product_code = detail.product_code
                line.product_name = detail.product_name
                line.product_internal_unit = detail.product_internal_unit
                line.product_external_unit = detail.product_external_unit
                line.product_qty_per_internal_unit = float(
                    detail.product_qty_per_internal_unit or 1.0
                )
                line.delivery_place_name = detail.delivery_place_name
