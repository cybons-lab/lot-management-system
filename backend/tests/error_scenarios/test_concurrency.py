import concurrent.futures
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Lot, Order, OrderLine


def create_order_line_for_concurrency(db: Session, master_data, qty=10):
    """Helper to create an order line."""
    # customer = master_data["customer"]
    delivery_place = master_data["delivery_place"]
    product = master_data["product1"]

    order = Order(
        customer_id=master_data["customer"].id,
        order_date=date.today(),
        status="open",
        created_at=datetime.utcnow(),
    )
    db.add(order)
    db.flush()

    line = OrderLine(
        order_id=order.id,
        product_id=product.id,
        order_quantity=qty,
        delivery_date=date.today() + timedelta(days=7),
        delivery_place_id=delivery_place.id,
        unit="EA",
    )
    db.add(line)
    db.commit()
    db.refresh(line)
    return line


def test_concurrent_allocation(db_engine):
    """Test concurrent allocation requests for the same lot using Service directly."""
    # Use explicit session management to ensure thread safety and transaction isolation
    # independent of the `db` fixture which uses a single transaction.
    from sqlalchemy.orm import sessionmaker

    from app.application.services.allocations.actions import allocate_manually
    from app.application.services.inventory.stock_calculation import get_reserved_quantity
    from app.infrastructure.persistence.models import (
        Customer,
        DeliveryPlace,
        Product,
        Supplier,
        Warehouse,
    )

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    setup_session = SessionLocal()

    # Generate unique codes to avoid collision with other tests
    uid = str(uuid.uuid4())[:8]

    try:
        # 1. Setup Data
        warehouse = Warehouse(
            warehouse_code=f"WH-{uid}", warehouse_name="Test Warehouse", warehouse_type="internal"
        )
        supplier = Supplier(supplier_code=f"SUP-{uid}", supplier_name="Test Supplier")
        product = Product(
            maker_part_code=f"PRD-{uid}",
            product_name="Test Product",
            base_unit="EA",
            internal_unit="BOX",
            external_unit="PLT",
            qty_per_internal_unit=10,
        )
        customer = Customer(customer_code=f"CUST-{uid}", customer_name="Test Customer")
        setup_session.add_all([warehouse, supplier, product, customer])
        setup_session.flush()

        delivery_place = DeliveryPlace(
            customer_id=customer.id,
            delivery_place_code=f"DP-{uid}",
            delivery_place_name="Test DP",
        )
        setup_session.add(delivery_place)
        setup_session.flush()

        # Create lot with limited quantity (10)
        lot = Lot(
            lot_number=f"LOT-{uid}",
            product_id=product.id,
            warehouse_id=warehouse.id,
            supplier_id=supplier.id,
            current_quantity=10,
            received_date=date.today(),
            status="active",
            unit="EA",
        )
        setup_session.add(lot)
        setup_session.flush()

        # Create two orders/lines
        # Order 1
        order1 = Order(
            customer_id=customer.id,
            order_date=date.today(),
            status="open",
            created_at=datetime.utcnow(),
        )
        setup_session.add(order1)
        setup_session.flush()

        line1 = OrderLine(
            order_id=order1.id,
            product_id=product.id,
            order_quantity=10,
            delivery_date=date.today() + timedelta(days=7),
            delivery_place_id=delivery_place.id,
            unit="EA",
        )
        setup_session.add(line1)

        # Order 2
        order2 = Order(
            customer_id=customer.id,
            order_date=date.today(),
            status="open",
            created_at=datetime.utcnow(),
        )
        setup_session.add(order2)
        setup_session.flush()

        line2 = OrderLine(
            order_id=order2.id,
            product_id=product.id,
            order_quantity=10,
            delivery_date=date.today() + timedelta(days=7),
            delivery_place_id=delivery_place.id,
            unit="EA",
        )
        setup_session.add(line2)

        setup_session.commit()

        # ID retention for threads
        lot_id = lot.id
        line1_id = line1.id
        line2_id = line2.id

        # 2. Define Concurrent Task
        def allocate_task(line_id):
            # Create a NEW session for each thread
            t_session = SessionLocal()
            try:
                # Service call (includes transaction logic)
                # allocate_manually commits by default if commit_db=True
                result = allocate_manually(
                    t_session, order_line_id=line_id, lot_id=lot_id, quantity=10, commit_db=True
                )
                return "success", result
            except Exception as e:
                t_session.rollback()
                return "error", e
            finally:
                t_session.close()

        # 3. Execute Concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(allocate_task, line1_id)
            future2 = executor.submit(allocate_task, line2_id)

            result1 = future1.result()
            result2 = future2.result()

        # 4. Verify Results
        results = [result1, result2]
        statuses = [r[0] for r in results]

        # One success, one failure
        assert "success" in statuses
        assert "error" in statuses

        # Verify the error is indeed Insufficient Stock or Commit Error
        errors = [r[1] for r in results if r[0] == "error"]
        assert len(errors) == 1
        # The error might be wrapped or specific, typically AllocationCommitError or ValueError(insufficient)
        # allocate_manually raises AllocationCommitError for insufficient stock logic inside

        # 5. Verify Database State
        verify_session = SessionLocal()
        try:
            current_reserved = get_reserved_quantity(verify_session, lot_id)
            assert current_reserved == 10

            # Additional check: only one allocation exists for these lines
            # allocations table check (via relationship or direct query)
            # Since relationship was removed, check via LotReservation
            from app.infrastructure.persistence.models.lot_reservations_model import LotReservation

            res_count = (
                verify_session.query(LotReservation)
                .filter(LotReservation.lot_id == lot_id, LotReservation.status == "active")
                .count()
            )
            assert res_count == 1

        finally:
            verify_session.close()

    finally:
        # Cleanup
        cleanup_session = SessionLocal()
        try:
            # Delete created data to avoid pollution
            # First delete reservations (FK constraint)
            from app.infrastructure.persistence.models.lot_reservations_model import LotReservation

            if "lot_id" in locals():
                cleanup_session.query(LotReservation).filter(
                    LotReservation.lot_id == lot_id
                ).delete(synchronize_session=False)

            # Order deletion should cascade lines
            if "order1" in locals() and order1.id:
                cleanup_session.query(Order).filter(Order.id.in_([order1.id, order2.id])).delete(
                    synchronize_session=False
                )
            if "lot" in locals() and lot.id:
                cleanup_session.query(Lot).filter(Lot.id == lot.id).delete(
                    synchronize_session=False
                )
            if "delivery_place" in locals() and delivery_place.id:
                cleanup_session.query(DeliveryPlace).filter(
                    DeliveryPlace.id == delivery_place.id
                ).delete(synchronize_session=False)
            if "customer" in locals() and customer.id:
                cleanup_session.query(Customer).filter(Customer.id == customer.id).delete(
                    synchronize_session=False
                )
            if "product" in locals() and product.id:
                cleanup_session.query(Product).filter(Product.id == product.id).delete(
                    synchronize_session=False
                )
            if "supplier" in locals() and supplier.id:
                cleanup_session.query(Supplier).filter(Supplier.id == supplier.id).delete(
                    synchronize_session=False
                )
            if "warehouse" in locals() and warehouse.id:
                cleanup_session.query(Warehouse).filter(Warehouse.id == warehouse.id).delete(
                    synchronize_session=False
                )

            cleanup_session.commit()
        except Exception:
            cleanup_session.rollback()
        finally:
            cleanup_session.close()
            setup_session.close()
