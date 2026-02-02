"""Master import service for multi-table bulk import.

Handles the business logic for importing related master data
across multiple tables in the correct order.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    DeliveryPlace,
    ProductMapping,
    Supplier,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem
from app.presentation.schemas.import_schema import (
    CustomerDataImport,
    ImportResultDetail,
    MasterImportRequest,
    MasterImportResponse,
    SupplyDataImport,
)


if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class MasterImportService:
    """Service for importing master data across multiple tables."""

    def __init__(self, db: Session):
        self.db = db

    def execute_import(self, request: MasterImportRequest) -> MasterImportResponse:
        """Execute master data import.

        Processing order:
        1. Supply-side (suppliers, products, product_suppliers)
        2. Customer-side (customers, delivery_places, customer_items)
        """
        results: list[ImportResultDetail] = []
        global_errors: list[str] = []

        try:
            # Process supply-side first (products are needed for customer_items)
            if request.supply_data:
                supply_results = self._import_supply_data(request.supply_data)
                results.extend(supply_results)

            # Then process customer-side
            if request.customer_data:
                customer_results = self._import_customer_data(request.customer_data)
                results.extend(customer_results)

            # Commit or rollback based on dry_run
            if request.dry_run:
                self.db.rollback()
            else:
                self.db.commit()

        except Exception as e:
            self.db.rollback()
            global_errors.append(f"Import failed: {str(e)}")
            logger.exception("Import failed")

        # Determine overall status
        total_failed = sum(r.failed for r in results)
        total_success = sum(r.created + r.updated for r in results)  # noqa: F841

        if global_errors or total_failed == sum(r.created + r.updated + r.failed for r in results):
            status = "failed"
        elif total_failed > 0:
            status = "partial"
        else:
            status = "success"

        return MasterImportResponse(
            status=status,
            dry_run=request.dry_run,
            results=results,
            errors=global_errors,
        )

    def _import_supply_data(self, data: SupplyDataImport) -> list[ImportResultDetail]:
        """Import supply-side data."""
        results: list[ImportResultDetail] = []

        supplier_result = ImportResultDetail(table_name="suppliers")
        product_result = ImportResultDetail(table_name="products")
        ps_result = ImportResultDetail(table_name="product_suppliers")

        for supplier_row in data.suppliers:
            # Upsert supplier
            supplier = self._upsert_supplier(supplier_row.supplier_code, supplier_row.supplier_name)
            if supplier:
                if supplier.id is None:
                    supplier_result.created += 1
                else:
                    supplier_result.updated += 1

                # Process products
                for product_row in supplier_row.products:
                    product = self._upsert_product(
                        product_row.maker_part_code,
                        product_row.product_name or "",
                        product_row.base_unit,
                    )
                    if product:
                        if product.id is None:
                            product_result.created += 1
                        else:
                            product_result.updated += 1

                        # Create product-supplier relationship
                        self.db.flush()  # Ensure IDs are assigned
                        ps = self._upsert_product_supplier(
                            product.id,
                            supplier.id,
                            product_row.is_primary,
                            product_row.lead_time_days,
                        )
                        if ps:
                            ps_result.created += 1

        results.extend([supplier_result, product_result, ps_result])
        return results

    def _import_customer_data(self, data: CustomerDataImport) -> list[ImportResultDetail]:
        """Import customer-side data."""
        results: list[ImportResultDetail] = []

        customer_result = ImportResultDetail(table_name="customers")
        dp_result = ImportResultDetail(table_name="delivery_places")
        ci_result = ImportResultDetail(table_name="customer_items")
        pm_result = ImportResultDetail(table_name="product_mappings")

        for customer_row in data.customers:
            # Upsert customer
            customer = self._upsert_customer(customer_row.customer_code, customer_row.customer_name)
            if customer:
                if customer.id is None:
                    customer_result.created += 1
                else:
                    customer_result.updated += 1

                self.db.flush()  # Ensure customer ID is assigned

                # Process delivery places
                for dp_row in customer_row.delivery_places:
                    dp = self._upsert_delivery_place(
                        customer.id,
                        dp_row.delivery_place_code,
                        dp_row.delivery_place_name,
                        dp_row.jiku_code,
                    )
                    if dp:
                        dp_result.created += 1

                # Process customer items
                for item_row in customer_row.items:
                    ci = self._upsert_customer_item(
                        customer.id,
                        item_row.customer_part_no,
                        item_row.maker_part_code,
                        item_row.supplier_code,
                        item_row.base_unit,
                        item_row.pack_unit,
                        item_row.pack_quantity,
                        item_row.special_instructions,
                    )
                    if ci:
                        ci_result.created += 1
                    else:
                        ci_result.failed += 1
                        ci_result.errors.append(
                            f"Failed to create customer_item: {item_row.customer_part_no}"
                        )

                # Process product mappings
                for pm_row in customer_row.product_mappings:
                    pm = self._upsert_product_mapping(
                        customer.id,
                        pm_row.customer_part_code,
                        pm_row.maker_part_code,
                        pm_row.supplier_code,
                        pm_row.base_unit,
                        pm_row.pack_unit,
                        pm_row.pack_quantity,
                        pm_row.special_instructions,
                        pm_row.is_active,
                    )
                    if pm:
                        pm_result.created += 1
                    else:
                        pm_result.failed += 1
                        pm_result.errors.append(
                            f"Failed to create product_mapping: {pm_row.customer_part_code}"
                        )

        results.extend([customer_result, dp_result, ci_result, pm_result])
        return results

    def _upsert_supplier(self, code: str, name: str) -> Supplier | None:
        """Upsert supplier by code."""
        existing = self.db.query(Supplier).filter(Supplier.supplier_code == code).first()
        if existing:
            existing.supplier_name = name
            return existing
        else:
            supplier = Supplier(supplier_code=code, supplier_name=name)
            self.db.add(supplier)
            return supplier

    def _upsert_product(
        self, code: str, name: str | None, base_unit: str | None
    ) -> SupplierItem | None:
        """Upsert product by maker_part_code."""
        existing = self.db.query(SupplierItem).filter(SupplierItem.maker_part_no == code).first()
        if existing:
            if name:
                existing.display_name = name
            if base_unit:
                existing.internal_unit = base_unit
            return existing
        else:
            product = SupplierItem(
                maker_part_no=code,
                display_name=name or code,
                internal_unit=base_unit or "EA",
            )
            self.db.add(product)
            return product

    def _upsert_product_supplier(
        self,
        product_group_id: int,
        supplier_id: int,
        is_primary: bool,
        lead_time_days: int | None,
    ) -> SupplierItem | None:
        """Upsert product-supplier relationship."""
        existing = (
            self.db.query(SupplierItem)
            .filter(
                SupplierItem.product_group_id == product_group_id,  # type: ignore[attr-defined]
                SupplierItem.supplier_id == supplier_id,
            )
            .first()
        )
        if existing:
            existing.is_primary = is_primary  # type: ignore[attr-defined]
            if lead_time_days is not None:
                existing.lead_time_days = lead_time_days
            return existing
        else:
            ps = SupplierItem(
                product_group_id=product_group_id,
                supplier_id=supplier_id,
                is_primary=is_primary,
                lead_time_days=lead_time_days or 0,
            )
            self.db.add(ps)
            return ps

    def _upsert_customer(self, code: str, name: str) -> Customer | None:
        """Upsert customer by code."""
        existing = self.db.query(Customer).filter(Customer.customer_code == code).first()
        if existing:
            existing.customer_name = name
            return existing
        else:
            customer = Customer(customer_code=code, customer_name=name)
            self.db.add(customer)
            return customer

    def _upsert_delivery_place(
        self,
        customer_id: int,
        code: str,
        name: str,
        jiku_code: str | None,
    ) -> DeliveryPlace | None:
        """Upsert delivery place."""
        existing = (
            self.db.query(DeliveryPlace).filter(DeliveryPlace.delivery_place_code == code).first()
        )
        if existing:
            existing.delivery_place_name = name
            existing.customer_id = customer_id
            if jiku_code:
                existing.jiku_code = jiku_code
            return existing
        else:
            dp = DeliveryPlace(
                customer_id=customer_id,
                delivery_place_code=code,
                delivery_place_name=name,
                jiku_code=jiku_code,
            )
            self.db.add(dp)
            return dp

    def _upsert_customer_item(
        self,
        customer_id: int,
        customer_part_no: str,
        maker_part_code: str,
        supplier_code: str | None,
        base_unit: str | None,
        pack_unit: str | None,
        pack_quantity: int | None,
        special_instructions: str | None,
    ) -> CustomerItem | None:
        """Upsert customer item."""
        # Phase1: Find supplier_item by maker_part_code
        supplier_item = (
            self.db.query(SupplierItem)
            .filter(SupplierItem.maker_part_no == maker_part_code)
            .first()
        )
        if not supplier_item:
            return None

        # Phase1: supplier_id is removed from customer_items
        # It's available via supplier_item.supplier_id if needed

        # Check for existing
        existing = (
            self.db.query(CustomerItem)
            .filter(
                CustomerItem.customer_id == customer_id,
                CustomerItem.customer_part_no == customer_part_no,
            )
            .first()
        )

        if existing:
            existing.supplier_item_id = supplier_item.id
            if base_unit:
                existing.base_unit = base_unit
            if pack_unit:
                existing.pack_unit = pack_unit
            if pack_quantity is not None:
                existing.pack_quantity = pack_quantity
            if special_instructions:
                existing.special_instructions = special_instructions
            return existing
        else:
            ci = CustomerItem(
                customer_id=customer_id,
                customer_part_no=customer_part_no,
                supplier_item_id=supplier_item.id,
                base_unit=base_unit or "個",  # Phase1: base_unit is required
                pack_unit=pack_unit,
                pack_quantity=pack_quantity,
                special_instructions=special_instructions,
            )
            self.db.add(ci)
            return ci

    def _upsert_product_mapping(
        self,
        customer_id: int,
        customer_part_code: str,
        maker_part_code: str,
        supplier_code: str,
        base_unit: str,
        pack_unit: str | None,
        pack_quantity: int | None,
        special_instructions: str | None,
        is_active: bool,
    ) -> ProductMapping | None:
        """Upsert product mapping (4-party relationship)."""
        # Find product by maker_part_code
        product = (
            self.db.query(SupplierItem)
            .filter(SupplierItem.maker_part_no == maker_part_code)
            .first()
        )
        if not product:
            return None

        # Find supplier (required for product_mappings)
        supplier = self.db.query(Supplier).filter(Supplier.supplier_code == supplier_code).first()
        if not supplier:
            return None

        # Check for existing mapping
        existing = (
            self.db.query(ProductMapping)
            .filter(
                ProductMapping.customer_id == customer_id,
                ProductMapping.customer_part_code == customer_part_code,
                ProductMapping.supplier_id == supplier.id,
            )
            .first()
        )

        if existing:
            existing.product_group_id = product.id
            existing.base_unit = base_unit
            if pack_unit:
                existing.pack_unit = pack_unit
            if pack_quantity is not None:
                existing.pack_quantity = pack_quantity
            if special_instructions:
                existing.special_instructions = special_instructions
            if is_active:
                existing.restore()
            else:
                existing.soft_delete()
            return existing
        else:
            pm = ProductMapping(
                customer_id=customer_id,
                customer_part_code=customer_part_code,
                supplier_id=supplier.id,
                product_group_id=product.id,
                base_unit=base_unit,
                pack_unit=pack_unit,
                pack_quantity=pack_quantity,
                special_instructions=special_instructions,
                is_active=is_active,
            )
            self.db.add(pm)
            return pm
