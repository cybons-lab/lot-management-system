"""Order service layer aligned with SQLAlchemy 2.0 models."""

from __future__ import annotations

from datetime import date

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.domain.order import (
    DuplicateOrderError,
    InvalidOrderStatusError,
    OrderNotFoundError,
    OrderValidationError,
    ProductNotFoundError,
)
from app.models import Customer, Order, OrderLine, Product
from app.schemas.orders.orders_schema import (
    OrderCreate,
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
        stmt: Select[Order] = select(Order).options(selectinload(Order.order_lines))

        if customer_code:
            # JOIN Customer table to filter by customer_code
            stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
                Customer.customer_code == customer_code
            )
        if date_from:
            stmt = stmt.where(Order.order_date >= date_from)
        if date_to:
            stmt = stmt.where(Order.order_date <= date_to)

        stmt = stmt.order_by(Order.order_date.desc()).offset(skip).limit(limit)
        orders = self.db.execute(stmt).scalars().all()
        return [OrderWithLinesResponse.model_validate(order) for order in orders]

    def get_order_detail(self, order_id: int) -> OrderWithLinesResponse:
        # Load order with related data (DDL v2.2 compliant)
        stmt: Select[Order] = (
            select(Order)
            .options(
                selectinload(Order.order_lines).selectinload(OrderLine.product),
                selectinload(Order.customer),
            )
            .where(Order.id == order_id)
        )
        order = self.db.execute(stmt).scalar_one_or_none()
        if not order:
            raise OrderNotFoundError(order_id)

        return OrderWithLinesResponse.model_validate(order)

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
                raise ProductNotFoundError(line_data.product_id)

            # Create order line (DDL v2.2 compliant)
            line = OrderLine(
                order_id=order.id,
                product_id=line_data.product_id,
                delivery_date=line_data.delivery_date,
                order_quantity=line_data.order_quantity,
                unit=line_data.unit,
            )
            self.db.add(line)

        self.db.flush()
        self.db.refresh(order)

        return OrderWithLinesResponse.model_validate(order)

    def cancel_order(self, order_id: int) -> None:
        # Load order with lines
        stmt = select(Order).options(selectinload(Order.order_lines)).where(Order.id == order_id)
        order = self.db.execute(stmt).scalar_one_or_none()
        if not order:
            raise OrderNotFoundError(order_id)

        # Cancel all lines
        for line in order.order_lines:
            if line.status in {"shipped", "completed"}:
                raise InvalidOrderStatusError(
                    f"Line {line.id} status is '{line.status}' and cannot be cancelled"
                )
            line.status = "cancelled"

        self.db.flush()
