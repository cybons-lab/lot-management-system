from app.api.routes.admin_presets import list_presets, load_preset
from app.api.routes.masters_bulk_load import bulk_load_masters
from app.api.routes.masters_customers import (
    create_customer,
    delete_customer,
    get_customer,
    update_customer,
)
from app.api.routes.masters_products import (
    create_product,
    get_product,
    update_product,
)
from app.api.routes.masters_suppliers import (
    create_supplier,
    get_supplier,
    update_supplier,
)
from app.api.routes.masters_warehouses import (
    create_warehouse,
    delete_warehouse,
    get_warehouse,
    update_warehouse,
)
from app.schemas import (
    CustomerCreate,
    CustomerUpdate,
    MasterBulkLoadRequest,
    ProductCreate,
    ProductUpdate,
    SupplierCreate,
    SupplierUpdate,
    WarehouseCreate,
    WarehouseUpdate,
)


def test_master_crud_bulk_and_presets(db_session):
    # Warehouse CRUD
    create_warehouse(
        WarehouseCreate(
            warehouse_code="WH-CRUD", warehouse_name="倉庫CRUD", is_active=1
        ),
        db=db_session,
    )
    assert get_warehouse("WH-CRUD", db=db_session).warehouse_name == "倉庫CRUD"

    updated = update_warehouse(
        "WH-CRUD",
        WarehouseUpdate(warehouse_name="倉庫CRUD更新"),
        db=db_session,
    )
    assert updated.warehouse_name == "倉庫CRUD更新"
    delete_warehouse("WH-CRUD", db=db_session)

    # Supplier CRUD
    create_supplier(
        SupplierCreate(supplier_code="SUP-CRUD", supplier_name="仕入先CRUD"),
        db=db_session,
    )
    update_supplier(
        "SUP-CRUD",
        SupplierUpdate(supplier_name="仕入先CRUD更新"),
        db=db_session,
    )
    supplier = get_supplier("SUP-CRUD", db=db_session)
    assert supplier.supplier_name == "仕入先CRUD更新"

    # Customer CRUD
    create_customer(
        CustomerCreate(customer_code="CUS-CRUD", customer_name="得意先CRUD"),
        db=db_session,
    )
    update_customer(
        "CUS-CRUD",
        CustomerUpdate(customer_name="得意先CRUD更新"),
        db=db_session,
    )
    customer = get_customer("CUS-CRUD", db=db_session)
    assert customer.customer_name == "得意先CRUD更新"
    delete_customer("CUS-CRUD", db=db_session)

    # Product CRUD
    create_product(
        ProductCreate(
            product_code="PROD-CRUD",
            product_name="製品CRUD",
            packaging_qty=1,
            packaging_unit="EA",
            internal_unit="EA",
            base_unit="EA",
            requires_lot_number=True,
        ),
        db=db_session,
    )
    update_product(
        "PROD-CRUD",
        ProductUpdate(product_name="製品CRUD更新", requires_lot_number=False),
        db=db_session,
    )
    product = get_product("PROD-CRUD", db=db_session)
    assert product.product_name == "製品CRUD更新"
    assert bool(product.requires_lot_number) is False

    # Prepare duplicate supplier for bulk warnings
    create_supplier(
        SupplierCreate(supplier_code="SUP-DUP", supplier_name="既存仕入先"),
        db=db_session,
    )

    bulk_result = bulk_load_masters(
        MasterBulkLoadRequest(
            warehouses=[
                WarehouseCreate(warehouse_code="WH-BULK", warehouse_name="倉庫バルク")
            ],
            suppliers=[
                SupplierCreate(supplier_code="SUP-DUP", supplier_name="既存仕入先"),
                SupplierCreate(supplier_code="SUP-BULK", supplier_name="仕入先バルク"),
            ],
            customers=[
                CustomerCreate(customer_code="CUS-BULK", customer_name="得意先バルク")
            ],
            products=[
                ProductCreate(
                    product_code="PROD-BULK",
                    product_name="製品バルク",
                    packaging_qty=1,
                    packaging_unit="EA",
                    internal_unit="EA",
                    base_unit="EA",
                    requires_lot_number=True,
                )
            ],
        ),
        db=db_session,
    )
    assert "SUP-DUP" not in bulk_result.created["suppliers"]
    assert any("SUP-DUP" in warning for warning in bulk_result.warnings)

    presets = list_presets()
    assert "basic" in presets.presets

    load_result = load_preset(name="basic", db=db_session)
    assert load_result.preset == "basic"
    assert "PRST-PROD1" in load_result.result.created["products"]

    preset_product = get_product("PRST-PROD1", db=db_session)
    assert preset_product.product_name == "プリセット製品"

