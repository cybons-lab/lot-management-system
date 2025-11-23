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
from app.models import Allocation, Customer, CustomerItem, DeliveryPlace, Order, OrderLine, Product, Supplier
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
        stmt: Select[Order] = select(Order).options(
            selectinload(Order.order_lines)
            .selectinload(OrderLine.allocations)
            .joinedload(Allocation.lot)
        )

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

        # Convert to Pydantic models
        response_orders = [OrderWithLinesResponse.model_validate(order) for order in orders]

        # Populate additional info
        self._populate_additional_info(response_orders)

        return response_orders

    def get_order_detail(self, order_id: int) -> OrderWithLinesResponse:
        # Load order with related data (DDL v2.2 compliant)
        stmt: Select[Order] = (
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

        response_order = OrderWithLinesResponse.model_validate(order)
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
                raise ProductNotFoundError(line_data.product_id)

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
        self.db.flush()

    def _populate_additional_info(self, orders: list[OrderWithLinesResponse]) -> None:
        """Populate additional display info (supplier, product, delivery place) for order lines."""
        if not orders:
            return

        # Collect IDs
        pairs = set()
        product_ids = set()
        delivery_place_ids = set()
        
        for order in orders:
            for line in order.lines:
                pairs.add((order.customer_id, line.product_id))
                product_ids.add(line.product_id)
                if line.delivery_place_id:
                    delivery_place_ids.add(line.delivery_place_id)

        if not pairs and not product_ids and not delivery_place_ids:
            return

        # 1. Populate Supplier Names
        supplier_map = {}
        if pairs:
            customer_ids = {p[0] for p in pairs}
            cust_prod_ids = {p[1] for p in pairs}

            stmt = (
                select(CustomerItem.customer_id, CustomerItem.product_id, Supplier.supplier_name)
                .join(Supplier, CustomerItem.supplier_id == Supplier.id)
                .where(CustomerItem.customer_id.in_(customer_ids))
                .where(CustomerItem.product_id.in_(cust_prod_ids))
            )

            rows = self.db.execute(stmt).all()
            supplier_map = {(row.customer_id, row.product_id): row.supplier_name for row in rows}

        # 2. Populate Product Info
        product_map = {}
        if product_ids:
            product_stmt = select(Product).where(Product.id.in_(product_ids))
            products = self.db.execute(product_stmt).scalars().all()
            product_map = {p.id: p for p in products}

        # 3. Populate Delivery Place Info
        delivery_place_map = {}
        if delivery_place_ids:
            dp_stmt = select(DeliveryPlace).where(DeliveryPlace.id.in_(delivery_place_ids))
            dps = self.db.execute(dp_stmt).scalars().all()
            delivery_place_map = {dp.id: dp.delivery_place_name for dp in dps}

        # Update lines
        for order in orders:
            for line in order.lines:
                # Supplier Name
                line.supplier_name = supplier_map.get((order.customer_id, line.product_id))

                # Product Info
                product = product_map.get(line.product_id)
                if product:
                    line.product_code = product.maker_part_code
                    line.product_name = product.product_name
                    line.product_internal_unit = product.internal_unit
                    line.product_external_unit = product.external_unit
                    line.product_qty_per_internal_unit = float(product.qty_per_internal_unit or 1.0)

                # Delivery Place Name
                if line.delivery_place_id:
                    line.delivery_place_name = delivery_place_map.get(line.delivery_place_id)
