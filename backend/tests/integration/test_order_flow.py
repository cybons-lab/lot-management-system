from datetime import date, timedelta

import pytest

from app.api.routes.allocations.allocations_router import commit_allocation, preview_allocations
from app.api.routes.masters.customers_router import create_customer
from app.api.routes.masters.products_router import create_product
from app.api.routes.masters.suppliers_router import create_supplier
from app.api.routes.masters.warehouses_router import create_warehouse
from app.api.routes.orders.orders_router import create_order
from app.models import Lot, Order, Warehouse
from app.schemas.allocations.allocations_schema import AllocationCommitRequest, FefoPreviewRequest
from app.schemas.masters.masters_schema import (
    CustomerCreate,
    SupplierCreate,
    WarehouseCreate,
)
from app.schemas.masters.products_schema import ProductCreate
from app.schemas.orders.orders_schema import OrderCreate, OrderLineCreate


@pytest.mark.xfail(reason="Test uses deprecated schema/view patterns, needs refactoring")
def test_order_to_fefo_allocation_flow(db_session):
    prod_a = create_product(
        ProductCreate(
            product_code="PROD-A",
            product_name="製品A",
            packaging_qty=1,
            packaging_unit="EA",
            internal_unit="EA",
            base_unit="EA",
            requires_lot_number=True,
            next_div="ND-A",
        ),
        db=db_session,
    )
    prod_b = create_product(
        ProductCreate(
            product_code="PROD-B",
            product_name="製品B",
            packaging_qty=1,
            packaging_unit="EA",
            internal_unit="EA",
            base_unit="EA",
            requires_lot_number=True,
        ),
        db=db_session,
    )
    customer = create_customer(
        CustomerCreate(customer_code="CUS-A", customer_name="得意先A"),
        db=db_session,
    )
    create_supplier(
        SupplierCreate(supplier_code="SUP-A", supplier_name="仕入先A"),
        db=db_session,
    )
    # Create delivery place for customer
    from app.models import DeliveryPlace

    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-A",
        delivery_place_name="納入先A",
    )
    db_session.add(delivery_place)
    db_session.flush()

    create_warehouse(
        WarehouseCreate(
            warehouse_code="WH-A", warehouse_name="倉庫A", is_active=1, warehouse_type="internal"
        ),
        db=db_session,
    )

    # Mock UOW
    class MockUOW:
        def __init__(self, session):
            self.session = session

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def commit(self):
            self.session.commit()

        def rollback(self):
            self.session.rollback()

    order = create_order(
        OrderCreate(
            order_number="ORD-1001",
            customer_id=customer.id,
            order_date=date.today(),
            lines=[
                OrderLineCreate(
                    product_id=prod_a.id,
                    order_quantity=5,
                    unit="EA",
                    delivery_date=date.today() + timedelta(days=7),
                    delivery_place_id=delivery_place.id,
                ),
                OrderLineCreate(
                    product_id=prod_b.id,
                    order_quantity=3,
                    unit="EA",
                    delivery_date=date.today() + timedelta(days=10),
                    delivery_place_id=delivery_place.id,
                ),
            ],
        ),
        uow=MockUOW(db_session),
    )
    order_id = order.id
    order = db_session.get(Order, order_id)
    # assert order.customer_order_no_last6 == "001234" # Removed in DDL v2.2

    warehouse = db_session.query(Warehouse).filter(Warehouse.warehouse_code == "WH-A").first()

    # Get supplier for lots
    from app.models import Product, Supplier

    supplier = db_session.query(Supplier).filter(Supplier.supplier_code == "SUP-A").first()
    product_a_db = db_session.query(Product).filter(Product.maker_part_code == "PROD-A").first()
    product_b_db = db_session.query(Product).filter(Product.maker_part_code == "PROD-B").first()

    def _create_lot(code_suffix, product, quantity, expiry_offset):
        lot = Lot(
            supplier_id=supplier.id,
            product_id=product.id,
            lot_number=f"LOT-{code_suffix}",
            received_date=date.today() - timedelta(days=1),
            expiry_date=date.today() + timedelta(days=expiry_offset),
            warehouse_id=warehouse.id if warehouse else None,
            current_quantity=float(quantity),
            allocated_quantity=0.0,
            unit="EA",
            status="active",
        )
        db_session.add(lot)
        db_session.commit()
        return lot.id

    # Product A lots
    usable_lot_early = _create_lot("A-1", product_a_db, 4, 5)
    usable_lot_late = _create_lot("A-2", product_a_db, 2, 10)

    # Product B lots (no next_div configured to trigger warning)
    lot_b1 = _create_lot("B-1", product_b_db, 2, 3)
    lot_b2 = _create_lot("B-2", product_b_db, 5, 8)

    preview_result = preview_allocations(FefoPreviewRequest(order_id=order_id), db=db_session)
    preview_data = preview_result.model_dump()
    assert preview_data["order_id"] == order_id

    line_map = {line["product_code"]: line for line in preview_data["lines"]}
    assert "PROD-A" in line_map and "PROD-B" in line_map

    prod_a_line = line_map["PROD-A"]
    allocated_lots_a = [alloc["lot_number"] for alloc in prod_a_line["allocations"]]
    assert "LOT-A-1" in allocated_lots_a and "LOT-A-2" in allocated_lots_a
    assert prod_a_line["next_div"] == "ND-A"

    prod_b_line = line_map["PROD-B"]
    allocated_lots_b = [alloc["lot_number"] for alloc in prod_b_line["allocations"]]
    assert allocated_lots_b == ["LOT-B-1", "LOT-B-2"]
    assert any("次区が未設定" in warning for warning in prod_b_line["warnings"])
    assert any("次区が未設定" in warning for warning in preview_data["warnings"])

    commit_response = commit_allocation(AllocationCommitRequest(order_id=order_id), db=db_session)
    commit_data = commit_response.model_dump()
    assert len(commit_data["created_allocation_ids"]) == 4

    db_session.expire_all()

    lot_a1 = db_session.get(Lot, usable_lot_early)
    lot_a2 = db_session.get(Lot, usable_lot_late)
    lot_b1_ref = db_session.get(Lot, lot_b1)
    lot_b2_ref = db_session.get(Lot, lot_b2)

    # After allocation, check remaining quantities
    # Note: In current model, allocated quantities are tracked in allocated_quantity
    # But for commit workflow, the current_quantity might be reduced or we check allocated_quantity
    # Let's check the allocated_quantity values instead
    assert lot_a1.allocated_quantity == 4.0  # 4 was allocated (full lot)
    assert lot_a2.allocated_quantity == 1.0  # 1 was allocated (only needed 5 total, 4 from A1)
    assert lot_b1_ref.allocated_quantity == 2.0  # 2 was allocated (full lot)
    assert lot_b2_ref.allocated_quantity == 1.0  # 1 was allocated (needed 3 total, 2 from B1)

    db_status = db_session.query(Order.status).filter(Order.id == order_id).scalar()
    assert db_status in {"allocated", "part_allocated"}
    commit_preview_lines = {
        line["product_code"]: line["next_div"] for line in commit_data["preview"]["lines"]
    }
    assert commit_preview_lines["PROD-A"] == "ND-A"
    assert commit_preview_lines["PROD-B"] is None
