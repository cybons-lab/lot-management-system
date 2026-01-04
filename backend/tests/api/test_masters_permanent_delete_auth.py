"""Tests for master permanent delete endpoints with admin authorization."""

from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    Customer,
    CustomerItem,
    DeliveryPlace,
    Product,
    ProductSupplier,
    ProductUomConversion,
    Supplier,
    Warehouse,
)


def _setup_customer(db: Session):
    customer = Customer(customer_code="PERM-CUST", customer_name="Permanent Customer")
    db.add(customer)
    db.flush()
    return (
        f"/api/masters/customers/{customer.customer_code}/permanent",
        lambda session: session.query(Customer)
        .filter(Customer.customer_code == customer.customer_code)
        .first(),
    )


def _setup_supplier(db: Session):
    supplier = Supplier(supplier_code="PERM-SUP", supplier_name="Permanent Supplier")
    db.add(supplier)
    db.flush()
    return (
        f"/api/masters/suppliers/{supplier.supplier_code}/permanent",
        lambda session: session.query(Supplier)
        .filter(Supplier.supplier_code == supplier.supplier_code)
        .first(),
    )


def _setup_warehouse(db: Session):
    warehouse = Warehouse(
        warehouse_code="PERM-WH",
        warehouse_name="Permanent Warehouse",
        warehouse_type="internal",
    )
    db.add(warehouse)
    db.flush()
    return (
        f"/api/masters/warehouses/{warehouse.warehouse_code}/permanent",
        lambda session: session.query(Warehouse)
        .filter(Warehouse.warehouse_code == warehouse.warehouse_code)
        .first(),
    )


def _setup_product(db: Session):
    product = Product(
        maker_part_code="PERM-PROD",
        product_name="Permanent Product",
        base_unit="EA",
    )
    db.add(product)
    db.flush()
    return (
        f"/api/masters/products/{product.maker_part_code}/permanent",
        lambda session: session.query(Product)
        .filter(Product.maker_part_code == product.maker_part_code)
        .first(),
    )


def _setup_delivery_place(db: Session):
    customer = Customer(customer_code="PERM-CUST-DP", customer_name="Customer for DP")
    db.add(customer)
    db.flush()
    place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="PERM-DP",
        delivery_place_name="Permanent Delivery Place",
    )
    db.add(place)
    db.flush()
    return (
        f"/api/masters/delivery-places/{place.id}/permanent",
        lambda session: session.query(DeliveryPlace).filter(DeliveryPlace.id == place.id).first(),
    )


def _setup_customer_item(db: Session):
    customer = Customer(customer_code="PERM-CUST-CI", customer_name="Customer for Item")
    supplier = Supplier(supplier_code="PERM-SUP-CI", supplier_name="Supplier for Item")
    product = Product(
        maker_part_code="PERM-PROD-CI",
        product_name="Product for Item",
        base_unit="EA",
    )
    db.add_all([customer, supplier, product])
    db.flush()
    item = CustomerItem(
        customer_id=customer.id,
        external_product_code="EXT-ITEM",
        product_id=product.id,
        supplier_id=supplier.id,
        base_unit="EA",
    )
    db.add(item)
    db.flush()
    return (
        f"/api/masters/customer-items/{item.customer_id}/{item.external_product_code}/permanent",
        lambda session: session.query(CustomerItem)
        .filter(
            CustomerItem.customer_id == item.customer_id,
            CustomerItem.external_product_code == item.external_product_code,
        )
        .first(),
    )


def _setup_uom_conversion(db: Session):
    product = Product(
        maker_part_code="PERM-PROD-UOM",
        product_name="Product for UOM",
        base_unit="EA",
    )
    db.add(product)
    db.flush()
    conversion = ProductUomConversion(
        product_id=product.id,
        external_unit="BOX",
        factor=Decimal("10.0"),
    )
    db.add(conversion)
    db.flush()
    return (
        f"/api/masters/uom-conversions/{conversion.conversion_id}/permanent",
        lambda session: session.query(ProductUomConversion)
        .filter(ProductUomConversion.conversion_id == conversion.conversion_id)
        .first(),
    )


def _setup_supplier_product(db: Session):
    supplier = Supplier(supplier_code="PERM-SUP-SP", supplier_name="Supplier for SP")
    product = Product(
        maker_part_code="PERM-PROD-SP",
        product_name="Product for SP",
        base_unit="EA",
    )
    db.add_all([supplier, product])
    db.flush()
    sp = ProductSupplier(
        product_id=product.id,
        supplier_id=supplier.id,
        is_primary=True,
        lead_time_days=1,
    )
    db.add(sp)
    db.flush()
    return (
        f"/api/masters/supplier-products/{sp.id}/permanent",
        lambda session: session.query(ProductSupplier).filter(ProductSupplier.id == sp.id).first(),
    )


PERMANENT_DELETE_CASES = [
    _setup_customer,
    _setup_supplier,
    _setup_warehouse,
    _setup_product,
    _setup_delivery_place,
    _setup_customer_item,
    _setup_uom_conversion,
    _setup_supplier_product,
]


@pytest.fixture(params=PERMANENT_DELETE_CASES)
def permanent_delete_case(request):
    return request.param


def test_permanent_delete_requires_admin(
    client: TestClient,
    db: Session,
    normal_user_token_headers: dict[str, str],
    permanent_delete_case,
):
    path, finder = permanent_delete_case(db)

    response = client.delete(path, headers=normal_user_token_headers)

    assert response.status_code == 403
    assert finder(db) is not None


def test_permanent_delete_allows_admin(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
    permanent_delete_case,
):
    path, finder = permanent_delete_case(db)

    response = client.delete(path, headers=superuser_token_headers)

    assert response.status_code == 204
    assert finder(db) is None
