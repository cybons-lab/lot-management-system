#!/usr/bin/env python3
"""
Property-based test data generator using Hypothesis strategies.

This script generates realistic test data covering various allocation scenarios
by leveraging the same Hypothesis strategies used in property-based tests.

Scenarios covered:
1. Normal allocation (sufficient inventory)
2. Partial allocation (shortage)
3. FEFO priority (expiring soon)
4. Expired lots (should be excluded)
5. Multiple lots per product
6. Zero inventory (depleted)
"""

import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

# Ensure app module is importable
import os
from dotenv import load_dotenv
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
# sys.path.insert(0, '/app')

from hypothesis import given, settings, strategies as st
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import SessionLocal
from app.models import (
    Customer,
    DeliveryPlace,
    ForecastCurrent,
    Lot,
    Order,
    OrderLine,
    Product,
    Supplier,
    Warehouse,
)


def clear_database(db: Session):
    """Clear all data from database."""
    print("🗑️  Clearing database...")
    
    # Delete in correct order (foreign key constraints)
    db.execute(text("DELETE FROM allocations"))
    db.execute(text("DELETE FROM allocation_traces"))
    db.execute(text("DELETE FROM order_lines"))
    db.execute(text("DELETE FROM orders"))
    db.execute(text("DELETE FROM lots"))
    db.execute(text("DELETE FROM forecast_current"))
    db.execute(text("DELETE FROM customer_items"))
    db.execute(text("DELETE FROM products"))
    db.execute(text("DELETE FROM delivery_places"))
    db.execute(text("DELETE FROM warehouses"))
    db.execute(text("DELETE FROM suppliers"))
    db.execute(text("DELETE FROM customers"))
    
    db.commit()
    print("✅ Database cleared successfully")


# Unit type detection
COUNTABLE_UNITS = {"PCS", "BOX", "CAN", "EA", "CARTON", "PACK"}
MEASURABLE_UNITS = {"L", "ML", "KG", "G", "TON"}


def is_countable_unit(unit: str) -> bool:
    """Check if a unit is countable (must be integer)."""
    return unit.upper() in COUNTABLE_UNITS


def is_measurable_unit(unit: str) -> bool:
    """Check if a unit is measurable (decimal allowed)."""
    return unit.upper() in MEASURABLE_UNITS


# Hypothesis strategies for master data
@st.composite
def customer_strategy(draw, customer_id: int):
    """Generate a customer."""
    from faker import Faker
    faker = Faker("ja_JP")
    
    return Customer(
        id=customer_id,
        customer_code=f"C{1000 + customer_id}",
        customer_name=faker.company(),
        created_at=datetime.utcnow(),
    )


@st.composite
def product_strategy(draw, product_id: int):
    """Generate a product."""
    from faker import Faker
    faker = Faker("ja_JP")
    
    unit_config = draw(st.sampled_from([
        {"internal": "CAN", "external": "KG", "factor": 20.0},
        {"internal": "PCS", "external": "PCS", "factor": 1.0},
        {"internal": "BOX", "external": "PCS", "factor": 12.0},
        {"internal": "L", "external": "ML", "factor": 1000.0},
    ]))

    return Product(
        id=product_id,
        maker_part_code=f"PROD-{5000 + product_id:04d}",
        product_name=faker.bs().title(),
        base_unit=unit_config["internal"], # Legacy field, maybe keep as internal
        internal_unit=unit_config["internal"],
        external_unit=unit_config["external"],
        qty_per_internal_unit=unit_config["factor"],
        consumption_limit_days=draw(st.integers(min_value=30, max_value=180)),
        created_at=datetime.utcnow(),
    )


@st.composite
def warehouse_strategy(draw, warehouse_id: int):
    """Generate a warehouse."""
    from faker import Faker
    faker = Faker("ja_JP")
    
    return Warehouse(
        id=warehouse_id,
        warehouse_code=f"W{10 + warehouse_id}",
        warehouse_name=f"{faker.city()}倉庫",
        warehouse_type=draw(st.sampled_from(["internal", "external", "supplier"])),
        created_at=datetime.utcnow(),
    )


@st.composite
def forecast_strategy(draw, product_id: int, customer_id: int, delivery_place_id: int):
    """Generate a forecast."""
    forecast_date = date.today() + timedelta(days=draw(st.integers(min_value=0, max_value=60)))
    # Simple period generation (using monthly for simplicity or daily)
    forecast_period = forecast_date.strftime("%Y-%m")
    
    return ForecastCurrent(
        product_id=product_id,
        customer_id=customer_id,
        delivery_place_id=delivery_place_id,
        forecast_date=forecast_date,
        forecast_quantity=Decimal(str(draw(st.integers(min_value=10, max_value=500)))),
        unit="PCS",  # Simplified
        forecast_period=forecast_period,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@st.composite
def scenario_lot_strategy(draw, lot_id: int, product_id: int, warehouse_id: int, 
                          supplier_id: int, scenario: str):
    """Generate a lot based on scenario type.
    
    Scenarios:
    - 'normal': Sufficient inventory, good expiry
    - 'shortage': Low inventory  
    - 'expiring': Expiring soon (FEFO priority)
    - 'expired': Already expired
    - 'depleted': Zero inventory
    - 'large': Large inventory
    """
    from faker import Faker
    faker = Faker("ja_JP")
    
    # Scenario-specific parameters
    if scenario == 'normal':
        qty_range = (100, 500)
        expiry_days = (60, 365)
        allocated_pct = 0.2
        status = 'active'
    elif scenario == 'shortage':
        qty_range = (5, 30)
        expiry_days = (30, 180)
        allocated_pct = 0.1
        status = 'active'
    elif scenario == 'expiring':
        qty_range = (50, 200)
        expiry_days = (1, 29)
        allocated_pct = 0.15
        status = 'active'
    elif scenario == 'expired':
        qty_range = (100, 300)
        expiry_days = (-30, -1)
        allocated_pct = 0.0
        status = 'expired'
    elif scenario == 'depleted':
        qty_range = (0, 0)
        expiry_days = (30, 180)
        allocated_pct = 0.0
        status = 'depleted'
    elif scenario == 'large':
        qty_range = (500, 1000)
        expiry_days = (90, 365)
        allocated_pct = 0.25
        status = 'active'
    else:
        raise ValueError(f"Unknown scenario: {scenario}")
    
    # Generate quantities
    current_qty = Decimal(str(draw(st.integers(min_value=qty_range[0], max_value=qty_range[1]))))
    allocated_qty = Decimal(str(int(current_qty * Decimal(str(allocated_pct)))))
    
    # Generate expiry date
    expiry_days_val = draw(st.integers(min_value=expiry_days[0], max_value=expiry_days[1]))
    expiry_date = date.today() + timedelta(days=expiry_days_val)
    
    return Lot(
        id=lot_id,
        lot_number=f"LOT-{lot_id:08d}",
        product_id=product_id,
        warehouse_id=warehouse_id,
        supplier_id=supplier_id,
        received_date=date.today() - timedelta(days=draw(st.integers(min_value=1, max_value=90))),
        expiry_date=expiry_date,
        current_quantity=current_qty,
        allocated_quantity=allocated_qty,
        unit=draw(st.sampled_from(["PCS", "BOX", "SET"])),
        status=status,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


def generate_test_data():
    """Main function to generate test data."""
    print("=" * 60)
    print("Property-Based Test Data Generator")
    print("=" * 60)
    
    db = SessionLocal()
    
    try:
        # Clear existing data
        clear_database(db)
        
        # Create master data
        print("\n📦 Creating master data...")
        
        # Customers (3)
        customers = [customer_strategy(customer_id=i+1).example() for i in range(3)]
        for customer in customers:
            db.add(customer)
        db.flush()
        
        # Suppliers (2)
        suppliers = []
        for i in range(2):
            supplier = Supplier(
                id=i+1,
                supplier_code=f"S{1000+i}",
                supplier_name=f"サプライヤー{i+1}商事",
                created_at=datetime.utcnow(),
            )
            db.add(supplier)
            suppliers.append(supplier)
        db.flush()
        
        # Delivery Places (5)
        delivery_places = []
        for i in range(5):
            dp = DeliveryPlace(
                id=i+1,
                delivery_place_code=f"D{100+i}",
                delivery_place_name=f"配送センター{i+1}",
                customer_id=customers[i % len(customers)].id,
                created_at=datetime.utcnow(),
            )
            db.add(dp)
            delivery_places.append(dp)
        db.flush()
        
        # Warehouses (4)
        warehouses = [warehouse_strategy(warehouse_id=i+1).example() for i in range(4)]
        for warehouse in warehouses:
            db.add(warehouse)
        db.flush()
        
        # Products (20)
        products = [product_strategy(product_id=i+1).example() for i in range(20)]
        for product in products:
            db.add(product)
        db.flush()
        
        print(f"✓ Created {len(customers)} customers, {len(suppliers)} suppliers, "
              f"{len(products)} products, {len(warehouses)} warehouses")
        
        # Generate Forecasts
        print("\n📈 Generating forecasts...")
        forecast_count = 0
        generated_keys = set()
        
        for product in products:
            # Generate 5-10 forecasts per product
            import random
            num_forecasts = random.randint(5, 10)
            attempts = 0
            created = 0
            
            while created < num_forecasts and attempts < 20:
                attempts += 1
                dp = random.choice(delivery_places)
                
                # Generate a potential forecast
                forecast = forecast_strategy(
                    product_id=product.id,
                    customer_id=dp.customer_id,
                    delivery_place_id=dp.id
                ).example()
                
                key = (forecast.product_id, forecast.delivery_place_id, forecast.forecast_date)
                if key in generated_keys:
                    continue
                
                generated_keys.add(key)
                db.add(forecast)
                forecast_count += 1
                created += 1
                
        db.flush()
        print(f"✓ Generated {forecast_count} forecasts")
        
        # Create scenario-based lots per product
        print("\n🎯 Generating lots per product...")
        
        lot_id = 1
        for product in products:
            # Decide scenario for this product
            # 70% Normal, 10% Shortage, 10% Expiring, 5% Expired, 5% Depleted
            import random
            scenario = random.choices(
                ['normal', 'shortage', 'expiring', 'expired', 'depleted'],
                weights=[70, 10, 10, 5, 5],
                k=1
            )[0]
            
            # Decide number of lots (1-3)
            if scenario == 'depleted':
                num_lots = 0
            else:
                num_lots = random.choices([1, 2, 3], weights=[40, 40, 20], k=1)[0]
            
            for _ in range(num_lots):
                warehouse = random.choice(warehouses)
                supplier = random.choice(suppliers)
                
                # Generate lot
                lot = scenario_lot_strategy(
                    lot_id=lot_id,
                    product_id=product.id,
                    warehouse_id=warehouse.id,
                    supplier_id=supplier.id,
                    scenario=scenario,
                ).example()
                
                # Ensure unit matches product
                lot.unit = product.internal_unit
                
                db.add(lot)
                lot_id += 1
        
        db.flush()
        print(f"✓ Generated {lot_id - 1} lots (Strategy: Max 3 lots per product)")
        
        # Create orders with various quantities
        print("\n📋 Generating orders...")
        
        order_scenarios = [
            ('small', 20, 5, 30),      # Small orders (easy to fulfill)
            ('medium', 15, 30, 100),   # Medium orders (may need partial)
            ('large', 10, 100, 500),   # Large orders (may cause shortage)
        ]
        
        order_id = 1
        line_id = 1
        
        for scenario_name, order_count, qty_min, qty_max in order_scenarios:
            print(f"  - {scenario_name}: {order_count} orders")
            for _ in range(order_count):
                import random
                customer = random.choice(customers)
                
                order = Order(
                    id=order_id,
                    customer_id=customer.id,
                    order_number=f"ORD-{order_id:08d}",
                    order_date=date.today() - timedelta(days=random.randint(0, 30)),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db.add(order)
                
                # 1-3 lines per order
                num_lines = random.randint(1, 3)
                for _ in range(num_lines):
                    product = random.choice(products)
                    
                    # Choose delivery place belonging to the customer
                    customer_dps = [dp for dp in delivery_places if dp.customer_id == customer.id]
                    if customer_dps:
                        delivery_place = random.choice(customer_dps)
                    else:
                        # Fallback if no specific DP for customer (shouldn't happen with current logic)
                        delivery_place = random.choice(delivery_places)
                    
                    # Retry logic to ensure clean quantities (no fractional values for countable units)
                    max_retries = 100
                    qty = None
                    converted_qty = None
                    unit = None
                    
                    for attempt in range(max_retries):
                        # Determine unit (70% external, 30% internal)
                        use_external = random.random() < 0.7
                        if use_external and product.external_unit:
                            unit = product.external_unit
                            # Generate quantity in external unit
                            qty_candidate = random.randint(qty_min, qty_max)
                            
                            # Calculate converted quantity
                            factor = Decimal(str(product.qty_per_internal_unit))
                            converted_candidate = Decimal(str(qty_candidate)) * factor
                            
                            # For countable internal units, ensure integer result
                            if is_countable_unit(product.internal_unit):
                                if converted_candidate == int(converted_candidate):
                                    # Clean integer result
                                    qty = qty_candidate
                                    converted_qty = Decimal(str(int(converted_candidate)))
                                    break
                                # else: retry with different quantity
                            else:
                                # Measurable unit: round to 2 decimal places
                                qty = qty_candidate
                                converted_qty = round(converted_candidate, 2)
                                break
                        else:
                            # Use internal unit directly
                            unit = product.internal_unit
                            
                            if is_countable_unit(product.internal_unit):
                                # For countable units, generate integer directly
                                qty_candidate = random.randint(1, max(1, qty_max // int(product.qty_per_internal_unit or 1)))
                                qty = qty_candidate
                                converted_qty = Decimal(str(qty_candidate))
                                break
                            else:
                                # For measurable units, allow decimals but round
                                qty_candidate = round(random.uniform(1, qty_max / float(product.qty_per_internal_unit or 1)), 2)
                                qty = qty_candidate
                                converted_qty = Decimal(str(qty_candidate))
                                break
                    
                    # Fallback if retry fails (shouldn't happen)
                    if qty is None:
                        print(f"⚠️  Warning: Could not generate clean quantity for product {product.id}, using fallback")
                        unit = product.internal_unit
                        qty = 1
                        converted_qty = Decimal("1")

                    line = OrderLine(
                        id=line_id,
                        order_id=order_id,
                        product_id=product.id,
                        delivery_date=order.order_date + timedelta(days=random.randint(7, 30)),
                        order_quantity=Decimal(str(qty)),
                        unit=unit,
                        converted_quantity=converted_qty,
                        delivery_place_id=delivery_place.id,
                        status='pending',
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                    db.add(line)
                    line_id += 1
                
                order_id += 1
        
        db.commit()
        print(f"✓ Generated {order_id - 1} orders with {line_id - 1} lines")
        
        print("\n" + "=" * 60)
        print("✅ Test data generation completed successfully!")
        print("=" * 60)
        print("\n📊 Summary:")
        print(f"  Customers: {len(customers)}")
        print(f"  Products: {len(products)}")
        print(f"  Warehouses: {len(warehouses)}")
        print(f"  Lots: {lot_id - 1}")
        print(f"  Orders: {order_id - 1}")
        print(f"  Order Lines: {line_id - 1}")

        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    generate_test_data()
