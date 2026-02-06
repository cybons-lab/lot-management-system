"""Product mappings service (商品マスタ明細連携)."""

from typing import Any

from sqlalchemy.orm import Session

from app.application.services.common.base_service import BaseService
from app.infrastructure.persistence.models import Customer, ProductMapping, Supplier, SupplierItem
from app.presentation.schemas.masters.masters_schema import (
    ProductMappingCreate,
    ProductMappingUpdate,
)


class ProductMappingsService(
    BaseService[ProductMapping, ProductMappingCreate, ProductMappingUpdate, int]
):
    """Service for managing product mappings."""

    def __init__(self, db: Session):
        super().__init__(db, ProductMapping)

    def get_all(
        self, skip: int = 0, limit: int = 100, *, include_inactive: bool = False
    ) -> list[ProductMapping]:
        """Get all product mappings with pagination."""
        return self.db.query(ProductMapping).offset(skip).limit(limit).all()

    def get_export_data(self) -> list[dict[str, Any]]:
        """Get data formatted for export."""
        query = (
            self.db.query(
                ProductMapping.id,
                Customer.customer_code,
                Customer.customer_name,
                ProductMapping.customer_part_code,
                Supplier.supplier_code,
                Supplier.supplier_name,
                SupplierItem.maker_part_no.label("product_code"),
                SupplierItem.display_name,
                ProductMapping.base_unit,
                ProductMapping.pack_unit,
                ProductMapping.pack_quantity,
                ProductMapping.special_instructions,
            )
            .join(Customer, ProductMapping.customer_id == Customer.id)
            .join(Supplier, ProductMapping.supplier_id == Supplier.id)
            .join(SupplierItem, ProductMapping.supplier_item_id == SupplierItem.id)
        )

        results = query.all()

        return [
            {
                "customer_code": r.customer_code,
                "customer_name": r.customer_name,
                "customer_part_code": r.customer_part_code,
                "supplier_code": r.supplier_code,
                "supplier_name": r.supplier_name,
                "product_code": r.product_code,
                "product_name": r.display_name,
                "base_unit": r.base_unit,
                "pack_unit": r.pack_unit,
                "pack_quantity": r.pack_quantity,
                "special_instructions": r.special_instructions,
            }
            for r in results
        ]
