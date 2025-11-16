"""Order service layer aligned with SQLAlchemy 2.0 models."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.domain.order import (
    DuplicateOrderError,
    InvalidOrderStatusError,
    OrderBusinessRules,
    OrderNotFoundError,
    OrderStateMachine,
    OrderValidationError,
    ProductNotFoundError,
)
from app.models import Customer, Order, OrderLine, Product
from app.schemas.orders.orders_schema import (
    OrderCreate,
    OrderResponse,
    OrderWithLinesResponse,
)
from app.services.common.quantity_service import QuantityConversionError, to_internal_qty


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

        if status:
            stmt = stmt.where(Order.status == status)
        if customer_code:
            stmt = stmt.where(Order.customer_code == customer_code)
        if date_from:
            stmt = stmt.where(Order.order_date >= date_from)
        if date_to:
            stmt = stmt.where(Order.order_date <= date_to)

        stmt = stmt.order_by(Order.order_date.desc()).offset(skip).limit(limit)
        orders = self.db.execute(stmt).scalars().all()
        return [OrderWithLinesResponse.model_validate(order) for order in orders]

    def get_order_detail(self, order_id: int) -> OrderWithLinesResponse:
        from app.schemas.orders.orders_schema import OrderLineOut

        stmt: Select[Order] = (
            select(Order)
            .options(
                selectinload(Order.order_lines)
                .selectinload(OrderLine.product)
                .selectinload(Product.delivery_place),
                selectinload(Order.order_lines)
                .selectinload(OrderLine.product)
                .selectinload(Product.supplier),
            )
            .where(Order.id == order_id)
        )
        order = self.db.execute(stmt).scalar_one_or_none()
        if not order:
            raise OrderNotFoundError(order_id)

        # Build OrderLineOut manually to include product and delivery_place data
        lines_out = []
        for line in order.order_lines:
            line_dict = {
                "id": line.id,
                "line_no": line.line_no,
                "product_id": line.product_id,
                "warehouse_id": line.warehouse_id,
                "quantity": float(line.quantity),
                "unit": line.unit,
                "allocated_qty": 0.0,  # Will be calculated from allocations
            }

            # Add product information
            if line.product:
                line_dict["product_code"] = line.product.product_code
                line_dict["product_name"] = line.product.product_name
                line_dict["supplier_id"] = line.product.supplier_id

                # Add supplier information
                if line.product.supplier:
                    line_dict["supplier_code"] = line.product.supplier.supplier_code

                # Add delivery_place information
                if line.product.delivery_place:
                    line_dict["delivery_place_id"] = line.product.delivery_place.id
                    line_dict["delivery_place_code"] = (
                        line.product.delivery_place.delivery_place_code
                    )
                    line_dict["delivery_place_name"] = (
                        line.product.delivery_place.delivery_place_name
                    )

            lines_out.append(OrderLineOut(**line_dict))

        # Build OrderWithLinesResponse
        order_dict = OrderResponse.model_validate(order).model_dump()
        order_dict["lines"] = lines_out
        return OrderWithLinesResponse(**order_dict)

    def create_order(self, order_data: OrderCreate) -> OrderWithLinesResponse:
        OrderBusinessRules.validate_order_no(order_data.order_no)

        existing_stmt = select(Order).where(Order.order_no == order_data.order_no)
        existing = self.db.execute(existing_stmt).scalar_one_or_none()
        if existing:
            raise DuplicateOrderError(order_data.order_no)

        customer_stmt = select(Customer).where(Customer.customer_code == order_data.customer_code)
        customer = self.db.execute(customer_stmt).scalar_one_or_none()
        if not customer:
            raise OrderValidationError(f"Customer not found for code {order_data.customer_code}")

        order = Order(
            order_no=order_data.order_no,
            customer_id=customer.id,
            customer_code=customer.customer_code,
            order_date=order_data.order_date,
            status=order_data.status or "open",
            customer_order_no=order_data.customer_order_no,
            delivery_mode=order_data.delivery_mode,
            sap_order_id=order_data.sap_order_id,
            sap_status=order_data.sap_status,
            sap_sent_at=order_data.sap_sent_at,
            sap_error_msg=order_data.sap_error_msg,
        )
        self.db.add(order)
        self.db.flush()

        for line_data in order_data.lines:
            OrderBusinessRules.validate_quantity(line_data.quantity, line_data.product_code)
            if line_data.due_date:
                OrderBusinessRules.validate_due_date(line_data.due_date, order.order_date)

            product_stmt = select(Product).where(Product.product_code == line_data.product_code)
            product = self.db.execute(product_stmt).scalar_one_or_none()
            if not product:
                raise ProductNotFoundError(line_data.product_code)

            try:
                if line_data.external_unit:
                    internal_qty = to_internal_qty(
                        product=product,
                        qty_external=line_data.quantity,
                        external_unit=line_data.external_unit,
                    )
                else:
                    internal_qty = Decimal(str(line_data.quantity))
            except QuantityConversionError as exc:
                raise OrderValidationError(str(exc)) from exc

            line = OrderLine(
                order_id=order.id,
                line_no=line_data.line_no,
                product_id=product.id,
                product_code=product.product_code,
                quantity=internal_qty,
                unit=product.internal_unit,
            )
            if hasattr(line, "due_date"):
                line.due_date = line_data.due_date
            self.db.add(line)

        self.db.flush()
        self.db.refresh(order)
        order.lines = list(order.order_lines)

        return OrderWithLinesResponse.model_validate(order)

    def update_order_status(self, order_id: int, new_status: str) -> OrderResponse:
        stmt = select(Order).where(Order.id == order_id)
        order = self.db.execute(stmt).scalar_one_or_none()
        if not order:
            raise OrderNotFoundError(order_id)

        # 冪等化: 同一状態の場合は変更しない
        if order.status == new_status:
            return OrderResponse.model_validate(order)

        OrderStateMachine.validate_transition(order.status, new_status)
        order.status = new_status

        self.db.flush()
        return OrderResponse.model_validate(order)

    def cancel_order(self, order_id: int) -> None:
        stmt = select(Order).where(Order.id == order_id)
        order = self.db.execute(stmt).scalar_one_or_none()
        if not order:
            raise OrderNotFoundError(order_id)

        if order.status in {"shipped", "closed"}:
            raise InvalidOrderStatusError(
                f"Status が '{order.status}' の受注はキャンセルできません"
            )

        order.status = "cancelled"
        self.db.flush()
