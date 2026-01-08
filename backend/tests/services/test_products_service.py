import pytest
from sqlalchemy.orm import Session

from app.application.services.masters.products_service import ProductService
from app.presentation.schemas.masters.products_schema import ProductCreate


@pytest.fixture
def product_service(db: Session):
    return ProductService(db)


def test_create_product(product_service: ProductService):
    data = ProductCreate(
        product_code="TEST-001",
        product_name="Test Product",
        customer_part_no="CUST-TEST-001",
        maker_item_code="MAKER-TEST-001",
        internal_unit="EA",
        external_unit="EA",
        qty_per_internal_unit=1.0,
        is_active=True,
    )
    product = product_service.create(data)
    assert product.id is not None
    assert product.maker_part_code == "TEST-001"


def test_list_products(product_service: ProductService):
    # Get initial count
    _, initial_count = product_service.list_products(page=1, per_page=1, q=None)

    # Create sample products
    for i in range(3):
        data = ProductCreate(
            product_code=f"TEST-LP-{i}",
            product_name=f"Product LP {i}",
            customer_part_no=f"CUST-LP-{i}",
            maker_item_code=f"MAKER-LP-{i}",
            internal_unit="EA",
            external_unit="EA",
            qty_per_internal_unit=1.0,
        )
        product_service.create(data)

    # Test list - should have at least 3 more than initial
    products, total = product_service.list_products(page=1, per_page=1000, q=None)
    assert total >= initial_count + 3
    assert len(products) >= 3

    # Test search - search for our specific products
    products, total = product_service.list_products(page=1, per_page=10, q="TEST-LP-1")
    assert total == 1
    assert products[0].maker_part_code == "TEST-LP-1"
