from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    CustomerItem,
    CustomerItemDeliverySetting,
    ProductMapping,
    ProductSupplier,
    ProductUomConversion,
    WarehouseDeliveryRoute,
)


def test_bulk_export_download_all_targets_integration(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session, master_data: dict
):
    """
    Integration test for bulk export download.
    Verifies that we can request all 15 targets and get a valid ZIP response.
    It relies on master_data fixture and adds some additional specific data.
    """

    # 1. Setup additional data required for specific exports

    # Product Mappings
    mapping = ProductMapping(
        customer_id=master_data["customer"].id,
        supplier_id=master_data["supplier"].id,
        product_id=master_data["product1"].id,
        customer_part_code="CUST-PART-001",
        base_unit="EA",
        pack_unit="BOX",
        pack_quantity=10,
    )
    db.add(mapping)

    # Customer Items
    customer_item = CustomerItem(
        customer_id=master_data["customer"].id,
        product_id=master_data["product1"].id,
        external_product_code="CP-001",
        base_unit="EA",
    )
    db.add(customer_item)

    # Customer Item Delivery Settings
    delivery_setting = CustomerItemDeliverySetting(
        customer_id=master_data["customer"].id,
        external_product_code="CP-001",  # simplified correlation
        delivery_place_id=master_data["delivery_place"].id,
        shipment_text="Shipment Text",
        is_default=True,
    )
    db.add(delivery_setting)

    # Supplier Products
    prod_supplier = ProductSupplier(
        product_id=master_data["product1"].id,
        supplier_id=master_data["supplier"].id,
        is_primary=True,
        lead_time_days=5,
    )
    db.add(prod_supplier)

    # UOM Conversions
    uom = ProductUomConversion(
        product_id=master_data["product1"].id, external_unit="CTN", factor=20
    )
    db.add(uom)

    # Warehouse Delivery Routes
    route = WarehouseDeliveryRoute(
        warehouse_id=master_data["warehouse"].id,
        delivery_place_id=master_data["delivery_place"].id,
        product_id=master_data["product1"].id,
        transport_lead_time_days=3,
    )
    db.add(route)

    # Lots
    from datetime import date
    from decimal import Decimal

    from app.infrastructure.persistence.models import LotReceipt
    from app.infrastructure.persistence.models.lot_master_model import LotMaster

    lm = LotMaster(
        product_id=master_data["product1"].id,
        supplier_id=master_data["supplier"].id,
        lot_number="LOT-001",
    )
    db.add(lm)
    db.flush()

    lot = LotReceipt(
        lot_master_id=lm.id,
        product_id=master_data["product1"].id,
        warehouse_id=master_data["warehouse"].id,
        supplier_id=master_data["supplier"].id,
        current_quantity=Decimal("100"),
        unit="EA",
        received_date=date.today(),
        expiry_date=date.today(),
        status="active",
    )

    db.add(lot)

    # Orders
    from app.infrastructure.persistence.models import Order, OrderLine

    order = Order(customer_id=master_data["customer"].id, order_date=date.today(), status="open")
    db.add(order)
    db.flush()

    order_line = OrderLine(
        order_id=order.id,
        product_id=master_data["product1"].id,
        delivery_place_id=master_data["delivery_place"].id,
        delivery_date=date.today(),
        order_quantity=Decimal("50"),
        unit="EA",
        status="pending",
        order_type="SPOT",
    )
    db.add(order_line)

    # Forecasts
    from app.infrastructure.persistence.models.forecast_models import ForecastCurrent

    forecast = ForecastCurrent(
        customer_id=master_data["customer"].id,
        product_id=master_data["product1"].id,
        delivery_place_id=master_data["delivery_place"].id,
        forecast_date=date.today(),
        forecast_quantity=Decimal("200"),
        unit="EA",
        forecast_period=date.today().strftime("%Y-%m"),
    )
    db.add(forecast)

    db.commit()

    # 2. Define all targets
    targets = [
        "customers",
        "products",
        "suppliers",
        "warehouses",
        "delivery_places",
        "product_mappings",
        "customer_items",
        "supplier_products",
        "uom_conversions",
        "warehouse_delivery_routes",
        "customer_item_delivery_settings",
        "lots",
        "orders",
        "forecasts",
        "users",
    ]

    # 3. Request Download
    # Construct query parameters: ?targets=customers&targets=products...
    query_params = [("targets", t) for t in targets]

    response = client.get(
        "/api/bulk-export/download", params=query_params, headers=superuser_token_headers
    )

    # 4. Verify Response
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "bulk_export" in response.headers["content-disposition"]

    # 5. Verify ZIP content (basic check)
    import io
    import zipfile

    zip_buffer = io.BytesIO(response.content)
    with zipfile.ZipFile(zip_buffer, "r") as z:
        file_list = z.namelist()
        # Check if we have files for all targets
        for target in targets:
            # Just checking if any file starts with the target name (e.g. customers.xlsx)
            assert any(f.startswith(target) for f in file_list), f"Missing export file for {target}"
