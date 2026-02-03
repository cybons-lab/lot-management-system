from datetime import date, timedelta

import pytest

from app.infrastructure.persistence.models import (
    LotMaster,
    LotReceipt,
    Order,
    OrderLine,
    Supplier,
    SupplierItem,
    User,
    UserSupplierAssignment,
)


@pytest.fixture
def priority_test_data(db_session):
    # 1. Setup User and Assignments
    # Create distinct user for this test
    from app.infrastructure.persistence.models import Role, UserRole

    user = User(
        username="priority_tester",
        email="priority@example.com",
        password_hash="hash",
        display_name="Priority Tester",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()

    # Add user role
    role = db_session.query(Role).filter(Role.role_code == "user").first()
    if not role:
        role = Role(role_code="user", role_name="一般ユーザー", description="一般ユーザー")
        db_session.add(role)
        db_session.flush()

    user_role = UserRole(user_id=user.id, role_id=role.id)
    db_session.add(user_role)
    db_session.flush()

    # 2. Setup Suppliers
    # Supplier A: Assigned to User
    # Supplier B: Not Assigned
    sup_a = Supplier(supplier_code="SUP-A", supplier_name="Assigned Supplier")
    sup_b = Supplier(supplier_code="SUP-B", supplier_name="Unassigned Supplier")
    db_session.add(sup_a)
    db_session.add(sup_b)
    db_session.flush()

    # Assign A to User
    assignment = UserSupplierAssignment(user_id=user.id, supplier_id=sup_a.id)
    db_session.add(assignment)

    # 3. Setup Products
    # Product A (Assigned): "ZZZ-PROD" -> Should come LAST in normal sort
    # Product B (Unassigned): "AAA-PROD" -> Should come FIRST in normal sort
    prod_a = SupplierItem(
        supplier_id=sup_a.id,
        maker_part_no="ZZZ-PROD",
        display_name="Product assigned",
        base_unit="EA",
    )
    prod_b = SupplierItem(
        supplier_id=sup_b.id,
        maker_part_no="AAA-PROD",
        display_name="Product unassigned",
        base_unit="EA",
    )
    db_session.add(prod_a)
    db_session.add(prod_b)
    db_session.flush()

    # 4. Setup Orders
    # Order 1: Contains Product B (AAA - Unassigned) - Date: Today
    # Order 2: Contains Product A (ZZZ - Assigned)   - Date: Yesterday (Older)
    #
    # Normal Sort (Date Desc): Order 1 (Today) -> Order 2 (Yesterday)
    # Priority Sort: Order 2 (Assigned) -> Order 1

    # Needs a customer and delivery place
    from app.infrastructure.persistence.models import Customer, DeliveryPlace

    cust = Customer(customer_code="CUST-P", customer_name="Priority Cust")
    db_session.add(cust)
    db_session.flush()

    dp = DeliveryPlace(
        customer_id=cust.id,
        delivery_place_code="DP-P",
        delivery_place_name="Pri DP",
        jiku_code="JK-P",
    )
    db_session.add(dp)
    db_session.flush()

    order_1 = Order(customer_id=cust.id, order_date=date.today(), status="open")
    order_2 = Order(customer_id=cust.id, order_date=date.today() - timedelta(days=1), status="open")
    db_session.add(order_1)
    db_session.add(order_2)
    db_session.flush()

    line_1 = OrderLine(
        order_id=order_1.id,
        supplier_item_id=prod_b.id,
        order_quantity=10,
        delivery_date=date.today(),
        delivery_place_id=dp.id,
        unit="EA",
        converted_quantity=10,
        status="pending",
    )
    line_2 = OrderLine(
        order_id=order_2.id,
        supplier_item_id=prod_a.id,
        order_quantity=10,
        delivery_date=date.today(),
        delivery_place_id=dp.id,
        unit="EA",
        converted_quantity=10,
        status="pending",
    )
    db_session.add(line_1)
    db_session.add(line_2)

    # 5. Setup Lots
    # Lot A: From Supplier A (Assigned - ZZZ)
    # Lot B: From Supplier B (Unassigned - AAA)
    # Normal Sort (Product Code ASC): Lot B (AAA) -> Lot A (ZZZ)
    # Priority Sort: Lot A (Assigned) -> Lot B

    from app.infrastructure.persistence.models import Warehouse

    wh = Warehouse(warehouse_code="WH-P", warehouse_name="Pri WH", warehouse_type="internal")
    db_session.add(wh)
    db_session.flush()

    lot_master_a = LotMaster(lot_number="LOT-ZZZ", supplier_item_id=prod_a.id, supplier_id=sup_a.id)
    lot_master_b = LotMaster(lot_number="LOT-AAA", supplier_item_id=prod_b.id, supplier_id=sup_b.id)
    db_session.add(lot_master_a)
    db_session.add(lot_master_b)
    db_session.flush()

    lot_a = LotReceipt(
        lot_master_id=lot_master_a.id,
        supplier_item_id=prod_a.id,
        warehouse_id=wh.id,
        supplier_id=sup_a.id,
        received_quantity=100,
        received_date=date.today(),
        expiry_date=date.today(),
        origin_type="order",
        unit="EA",
    )
    lot_b = LotReceipt(
        lot_master_id=lot_master_b.id,
        supplier_item_id=prod_b.id,
        warehouse_id=wh.id,
        supplier_id=sup_b.id,
        received_quantity=100,
        received_date=date.today(),
        expiry_date=date.today(),
        origin_type="order",
        unit="EA",
    )
    db_session.add(lot_a)
    db_session.add(lot_b)

    db_session.commit()

    return {
        "user": user,
        "order_assigned": order_2,
        "order_unassigned": order_1,
        "lot_assigned": lot_a,
        "lot_unassigned": lot_b,
    }


def test_order_priority_sorting(client, priority_test_data):
    user = priority_test_data["user"]
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": str(user.id), "username": user.username})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test with prioritize_assigned=True (Default)
    # Expect Assigned Order (Order 2) first
    response = client.get("/api/orders?prioritize_assigned=true", headers=headers)
    assert response.status_code == 200
    data = response.json()

    if not isinstance(data, list):
        print(f"DEBUG: Response data is not a list: {data}")
    assert isinstance(data, list), f"Expected list, got {type(data)}"

    target_ids = [
        priority_test_data["order_assigned"].id,
        priority_test_data["order_unassigned"].id,
    ]
    test_orders = [o for o in data if o["id"] in target_ids]

    assert len(test_orders) == 2
    assert test_orders[0]["id"] == priority_test_data["order_assigned"].id
    assert test_orders[1]["id"] == priority_test_data["order_unassigned"].id

    # 2. Test with prioritize_assigned=False
    # Expect Normal Sort (Date Desc) -> Order 1 (Today) then Order 2 (Yesterday)
    response = client.get("/api/orders?prioritize_assigned=false", headers=headers)
    data = response.json()
    test_orders = [o for o in data if o["id"] in target_ids]

    assert len(test_orders) == 2
    assert test_orders[0]["id"] == priority_test_data["order_unassigned"].id
    assert test_orders[1]["id"] == priority_test_data["order_assigned"].id


def test_lot_priority_sorting(client, priority_test_data):
    user = priority_test_data["user"]
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": str(user.id), "username": user.username})
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test with prioritize_assigned=True
    # Expect Assigned Lot (A - ZZZ) first, despite ZZZ typically being last
    response = client.get("/api/v2/lot/?prioritize_assigned=true", headers=headers)
    assert response.status_code == 200
    data = response.json()

    target_ids = [priority_test_data["lot_assigned"].id, priority_test_data["lot_unassigned"].id]
    test_lots = [l for l in data if l["lot_id"] in target_ids]

    assert len(test_lots) == 2
    assert test_lots[0]["lot_id"] == priority_test_data["lot_assigned"].id
    assert test_lots[1]["lot_id"] == priority_test_data["lot_unassigned"].id

    # 2. Test with prioritize_assigned=False
    # Expect Normal Sort (Product Code ASC) -> B (AAA) then A (ZZZ)
    response = client.get("/api/v2/lot/?prioritize_assigned=false", headers=headers)
    data = response.json()
    test_lots = [l for l in data if l["lot_id"] in target_ids]

    assert len(test_lots) == 2
    assert test_lots[0]["lot_id"] == priority_test_data["lot_unassigned"].id
    assert test_lots[1]["lot_id"] == priority_test_data["lot_assigned"].id
