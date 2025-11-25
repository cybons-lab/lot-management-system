import sys
import os
from datetime import date, datetime
from decimal import Decimal

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.database import SessionLocal
from app.models import Product, Order, OrderLine, Lot, Customer, DeliveryPlace, Warehouse
from app.services.orders.order_service import OrderService
from app.schemas.orders.orders_schema import OrderCreate, OrderLineCreate
from app.services.allocation.allocations_service import preview_fefo_allocation

def verify_unit_conversion():
    db = SessionLocal()
    try:
        print("Starting verification...")

        # 0. Reset Sequences (just in case)
        from sqlalchemy import text
        try:
            tables = ["products", "orders", "order_lines", "lots", "customers", "delivery_places", "warehouses"]
            for table in tables:
                db.execute(text(f"SELECT setval('{table}_id_seq', (SELECT MAX(id) FROM {table}));"))
            
            # Ensure status column exists in orders (fix for missing column)
            try:
                db.execute(text("ALTER TABLE orders ADD COLUMN status VARCHAR(20) DEFAULT 'open' NOT NULL;"))
            except Exception:
                pass # Column likely exists or other error (ignore for now)

            db.commit()
        except Exception as e:
            print(f"Sequence reset failed: {e}")
            db.rollback()

        # 1. Setup Product with Unit Info
        product = db.query(Product).filter(Product.maker_part_code == "UNIT_TEST_PROD").first()
        if not product:
            product = Product(
                maker_part_code="UNIT_TEST_PROD",
                product_name="Unit Test Product",
                base_unit="CAN",
                internal_unit="CAN",
                external_unit="KG",
                qty_per_internal_unit=20.0, # 1 CAN = 20 KG
                consumption_limit_days=30
            )
            db.add(product)
            db.commit()
            db.refresh(product)
        print(f"Product created: {product.product_name} (1 {product.internal_unit} = {product.qty_per_internal_unit} {product.external_unit})")

        # 2. Setup Customer & Delivery Place (if needed)
        customer = db.query(Customer).first()
        if not customer:
            customer = Customer(customer_code="CUST001", customer_name="Test Customer")
            db.add(customer)
            db.commit()
        
        delivery_place = db.query(DeliveryPlace).filter(DeliveryPlace.customer_id == customer.id).first()
        if not delivery_place:
            delivery_place = DeliveryPlace(
                customer_id=customer.id,
                delivery_place_code="DP001",
                delivery_place_name="Test Place"
            )
            db.add(delivery_place)
            db.commit()

        # 3. Create Order with External Unit (KG)
        # Order 40 KG -> Should be 2 CANs
        service = OrderService(db)
        order_data = OrderCreate(
            order_number=f"ORD_UNIT_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            customer_id=customer.id,
            order_date=date.today(),
            lines=[
                OrderLineCreate(
                    product_id=product.id,
                    delivery_date=date.today(),
                    order_quantity=Decimal("40.0"),
                    unit="KG", # External Unit
                    delivery_place_id=delivery_place.id
                )
            ]
        )
        
        order_response = service.create_order(order_data)
        order_id = order_response.id
        print(f"Order created: {order_response.order_number}")

        # 4. Verify Converted Quantity
        line = db.query(OrderLine).filter(OrderLine.order_id == order_id).first()
        print(f"Order Line: {line.order_quantity} {line.unit}")
        print(f"Converted Qty: {line.converted_quantity} (Expected: 2.0)")
        
        assert line.converted_quantity == Decimal("2.000"), f"Conversion failed: {line.converted_quantity} != 2.0"
        print("✅ Conversion Logic Verified")

        # 5. Setup Lot (Internal Unit)
        # Create a lot with 5 CANs
        warehouse = db.query(Warehouse).first() or Warehouse(warehouse_code="WH1", warehouse_name="WH1", warehouse_type="internal")
        if not warehouse.id:
            db.add(warehouse)
            db.commit()

        lot = Lot(
            lot_number=f"LOT_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            product_id=product.id,
            warehouse_id=warehouse.id,
            received_date=date.today(),
            current_quantity=Decimal("5.0"), # 5 CANs
            unit="CAN",
            status="active"
        )
        db.add(lot)
        db.commit()
        print(f"Lot created: {lot.lot_number} (Qty: {lot.current_quantity} CAN)")

        # 6. Verify Allocation Preview uses Converted Quantity
        # Required: 2 CANs (from 40 KG)
        # Available: 5 CANs
        # Should allocate 2 CANs
        
        preview = preview_fefo_allocation(db, order_id)
        line_plan = preview.lines[0]
        
        print(f"Allocation Plan Required Qty: {line_plan.required_qty}")
        assert line_plan.required_qty == 2.0, f"Allocation required qty mismatch: {line_plan.required_qty} != 2.0"
        
        allocated_qty = sum(a.allocate_qty for a in line_plan.allocations)
        print(f"Allocated Qty: {allocated_qty}")
        assert allocated_qty == 2.0, f"Allocated qty mismatch: {allocated_qty} != 2.0"
        
        print("✅ Allocation Logic Verified")

    except Exception as e:
        print(f"❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_unit_conversion()
