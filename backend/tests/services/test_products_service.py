import pytest
from sqlalchemy.orm import Session

from app.services.masters.products_service import ProductService
from app.schemas.masters.products_schema import ProductCreate
from app.models import Product

@pytest.fixture
def product_service(db: Session):
    return ProductService(db)

def test_create_product(product_service: ProductService):
    data = ProductCreate(
        product_code="TEST-001",
        product_name="Test Product",
        internal_unit="EA",
        external_unit="EA",
        qty_per_internal_unit=1.0,
        is_active=True
    )
    product = product_service.create(data)
    assert product.id is not None
    assert product.maker_part_code == "TEST-001"

def test_list_products(product_service: ProductService):
    # Create sample products
    for i in range(3):
        data = ProductCreate(
            product_code=f"TEST-{i}",
            product_name=f"Product {i}",
            internal_unit="EA",
            external_unit="EA",
            qty_per_internal_unit=1.0
        )
        product_service.create(data)
    
    # Test list
    products, total = product_service.list_products(page=1, per_page=10, q=None)
    assert total == 3
    assert len(products) == 3
    
    # Test search
    products, total = product_service.list_products(page=1, per_page=10, q="TEST-1")
    assert total == 1
    assert products[0].maker_part_code == "TEST-1"
