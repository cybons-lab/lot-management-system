from datetime import date, timedelta

from app.api.routes.allocations import allocate_order, preview_allocations
from app.api.routes.masters_customers import create_customer
from app.api.routes.masters_products import create_product
from app.api.routes.masters_suppliers import create_supplier
from app.api.routes.masters_warehouses import create_warehouse
from app.api.routes.orders import create_order
from app.models import Lot, LotCurrentStock, NextDivMap, Order, Warehouse
from app.schemas import (
    FefoPreviewRequest,
    OrderCreate,
    OrderLineCreate,
    ProductCreate,
    SupplierCreate,
    CustomerCreate,
    WarehouseCreate,
)


def test_order_to_fefo_allocation_flow(db_session):
    create_product(
        ProductCreate(
            product_code="PROD-A",
            product_name="製品A",
            packaging_qty=1,
            packaging_unit="EA",
            internal_unit="EA",
            base_unit="EA",
            requires_lot_number=True,
        ),
        db=db_session,
    )
    create_product(
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
    create_customer(
        CustomerCreate(customer_code="CUS-A", customer_name="得意先A"),
        db=db_session,
    )
    create_supplier(
        SupplierCreate(supplier_code="SUP-A", supplier_name="仕入先A"),
        db=db_session,
    )
    create_warehouse(
        WarehouseCreate(
            warehouse_code="WH-A", warehouse_name="倉庫A", is_active=1
        ),
        db=db_session,
    )

    # Register next division map for product A
    next_div = NextDivMap(
        customer_code="CUS-A",
        ship_to_code="CUS-A",
        product_code="PROD-A",
        next_div="ND-A",
    )
    db_session.add(next_div)
    db_session.commit()

    order = create_order(
        OrderCreate(
            order_no="ORD-1001",
            customer_code="CUS-A",
            order_date=date.today(),
            delivery_mode="SHIP-1",
            customer_order_no="PO-2024001234",
            lines=[
                OrderLineCreate(
                    line_no=1,
                    product_code="PROD-A",
                    quantity=5,
                    external_unit="EA",
                    due_date=date.today() + timedelta(days=7),
                ),
                OrderLineCreate(
                    line_no=2,
                    product_code="PROD-B",
                    quantity=3,
                    external_unit="EA",
                    due_date=date.today() + timedelta(days=10),
                ),
            ],
        ),
        db=db_session,
    )
    order_id = order.id
    order = db_session.get(Order, order_id)
    assert order.customer_order_no_last6 == "001234"

    warehouse = (
        db_session.query(Warehouse)
        .filter(Warehouse.warehouse_code == "WH-A")
        .first()
    )

    def _create_lot(code_suffix, product_code, quantity, expiry_offset, locked=False):
        lot = Lot(
            supplier_code="SUP-A",
            product_code=product_code,
            lot_number=f"LOT-{code_suffix}",
            receipt_date=date.today() - timedelta(days=1),
            expiry_date=date.today() + timedelta(days=expiry_offset),
            warehouse_id=warehouse.id if warehouse else None,
            lot_unit="EA",
        )
        db_session.add(lot)
        db_session.flush()
        stock = LotCurrentStock(lot_id=lot.id, current_quantity=float(quantity))
        db_session.add(stock)
        lot.is_locked = locked
        db_session.commit()
        return lot.id

    # Product A lots (one locked, two usable)
    locked_lot = _create_lot("A-LOCK", "PROD-A", 10, 2, locked=True)
    usable_lot_early = _create_lot("A-1", "PROD-A", 4, 5)
    usable_lot_late = _create_lot("A-2", "PROD-A", 2, 10)
    assert locked_lot != usable_lot_early

    # Product B lots (no next_div map to trigger warning)
    lot_b1 = _create_lot("B-1", "PROD-B", 2, 3)
    lot_b2 = _create_lot("B-2", "PROD-B", 5, 8)

    preview_result = preview_allocations(
        FefoPreviewRequest(order_id=order_id), db=db_session
    )
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

    commit_response = allocate_order(order_id=order_id, db=db_session)
    commit_data = commit_response.model_dump()
    assert len(commit_data["created_allocation_ids"]) == 4

    db_session.expire_all()

    lot_a1 = db_session.get(Lot, usable_lot_early)
    lot_a2 = db_session.get(Lot, usable_lot_late)
    lot_b1_ref = db_session.get(Lot, lot_b1)
    lot_b2_ref = db_session.get(Lot, lot_b2)

    assert lot_a1.current_stock.current_quantity == 0
    assert lot_a2.current_stock.current_quantity == 1
    assert lot_b1_ref.current_stock.current_quantity == 0
    assert lot_b2_ref.current_stock.current_quantity == 4

    refreshed_order = db_session.get(Order, order_id)
    db_status = (
        db_session.query(Order.status).filter(Order.id == order_id).scalar()
    )
    assert db_status in {"allocated", "part_allocated"}
    line_next_divs = {line.product_code: line.next_div for line in refreshed_order.lines}
    assert line_next_divs["PROD-A"] == "ND-A"
    assert line_next_divs["PROD-B"] is None

