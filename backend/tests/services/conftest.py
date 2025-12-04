import pytest
from datetime import date, timedelta
from app.models import Product, Customer, DeliveryPlace, Warehouse, Supplier

@pytest.fixture
def service_master_data(db):
    """Create master data for service tests."""
    # Create Warehouse
    warehouse = Warehouse(
        warehouse_code="WH-SVC",
        warehouse_name="Service Test Warehouse",
        warehouse_type="internal"
    )
    db.add(warehouse)
    
    # Create Supplier
    supplier = Supplier(
        supplier_code="SUP-SVC",
        supplier_name="Service Test Supplier"
    )
    db.add(supplier)
    
    # Create Products
    product1 = Product(
        maker_part_code="PRD-SVC-001",
        product_name="Service Test Product 1",
        base_unit="EA",
        internal_unit="BOX",
        external_unit="PLT",
        qty_per_internal_unit=10
    )
    product2 = Product(
        maker_part_code="PRD-SVC-002",
        product_name="Service Test Product 2",
        base_unit="KG"
    )
    db.add(product1)
    db.add(product2)
    
    # Create Customer
    customer = Customer(
        customer_code="CUST-SVC",
        customer_name="Service Test Customer"
    )
    db.add(customer)
    db.flush() # Ensure IDs are generated
    
    # Create DeliveryPlace
    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-SVC",
        delivery_place_name="Service Test Delivery Place"
    )
    db.add(delivery_place)
    
    db.flush()
    
    return {
        "warehouse": warehouse,
        "supplier": supplier,
        "product1": product1,
        "product2": product2,
        "customer": customer,
        "delivery_place": delivery_place
    }
