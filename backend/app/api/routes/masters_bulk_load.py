"""Bulk load endpoint for master data."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models import Customer, Product, Supplier, Warehouse
from app.schemas import MasterBulkLoadRequest, MasterBulkLoadResponse

router = APIRouter()


def _convert_requires_lot_number(payload: dict) -> dict:
    if "requires_lot_number" in payload and payload["requires_lot_number"] is not None:
        payload["requires_lot_number"] = 1 if payload["requires_lot_number"] else 0
    return payload


def perform_master_bulk_load(
    db: Session, request: MasterBulkLoadRequest
) -> MasterBulkLoadResponse:
    """Persist master records if not existing and collect warnings."""

    created: dict[str, list[str]] = {
        "warehouses": [],
        "suppliers": [],
        "customers": [],
        "products": [],
    }
    warnings: list[str] = []

    try:
        for warehouse in request.warehouses:
            code = warehouse.warehouse_code
            exists = (
                db.query(Warehouse)
                .filter(Warehouse.warehouse_code == code)
                .first()
            )
            if exists:
                warnings.append(f"倉庫コード {code} は既に存在します")
                continue
            db.add(Warehouse(**warehouse.model_dump()))
            created["warehouses"].append(code)

        for supplier in request.suppliers:
            code = supplier.supplier_code
            exists = (
                db.query(Supplier)
                .filter(Supplier.supplier_code == code)
                .first()
            )
            if exists:
                warnings.append(f"仕入先コード {code} は既に存在します")
                continue
            db.add(Supplier(**supplier.model_dump()))
            created["suppliers"].append(code)

        for customer in request.customers:
            code = customer.customer_code
            exists = (
                db.query(Customer)
                .filter(Customer.customer_code == code)
                .first()
            )
            if exists:
                warnings.append(f"得意先コード {code} は既に存在します")
                continue
            db.add(Customer(**customer.model_dump()))
            created["customers"].append(code)

        for product in request.products:
            code = product.product_code
            exists = (
                db.query(Product).filter(Product.product_code == code).first()
            )
            if exists:
                warnings.append(f"製品コード {code} は既に存在します")
                continue
            payload = _convert_requires_lot_number(product.model_dump())
            payload.pop("packaging", None)
            db.add(Product(**payload))
            created["products"].append(code)

        db.commit()
    except Exception:
        db.rollback()
        raise

    return MasterBulkLoadResponse(created=created, warnings=warnings)


@router.post("/bulk-load", response_model=MasterBulkLoadResponse)
def bulk_load_masters(
    request: MasterBulkLoadRequest, db: Session = Depends(get_db)
) -> MasterBulkLoadResponse:
    """Create or update masters in bulk."""

    return perform_master_bulk_load(db, request)
