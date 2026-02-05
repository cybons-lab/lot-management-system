"""Customer items service (得意先品番マッピング管理).

Updated: サロゲートキー（id）ベースに移行
- external_product_code → customer_part_no にリネーム
- ID-based operations (get_by_id, update_by_id, delete_by_id, etc.)
- Composite key methods maintained for backward compatibility
"""

from datetime import date
from typing import cast

from sqlalchemy.orm import Session

from app.application.services.common.base_service import BaseService
from app.application.services.common.optimistic_lock import (
    hard_delete_with_version,
    soft_delete_with_version,
    update_with_version,
)
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.masters_models import CustomerItem
from app.presentation.schemas.masters.customer_items_schema import (
    CustomerItemBulkRow,
    CustomerItemCreate,
    CustomerItemUpdate,
)
from app.presentation.schemas.masters.masters_schema import BulkUpsertResponse, BulkUpsertSummary


class CustomerItemsService(BaseService[CustomerItem, CustomerItemCreate, CustomerItemUpdate, int]):
    """Service for managing customer item mappings.

    Inherits common CRUD operations from BaseService:
    - get_by_id(id) -> CustomerItem
    - create(payload) -> CustomerItem
    - update(id, payload) -> CustomerItem
    - delete(id) -> None

    ID-based operations for surrogate key access.
    Composite key methods maintained for backward compatibility.
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db=db, model=CustomerItem)

    def _enrich_item(self, item: CustomerItem) -> dict:
        """Enrich customer item with related names.

        Phase1: Get maker_part_no and display_name from supplier_items
        instead of product_groups (which no longer exists).
        supplier_item is required (NOT NULL) after Phase1 migration.
        """
        self.db.refresh(item, attribute_names=["customer", "supplier_item"])

        # supplier_item is NOT NULL after Phase1, but mypy doesn't know that
        if item.supplier_item is None:
            raise ValueError(f"customer_item {item.id} has null supplier_item_id")

        return {
            "id": item.id,
            "customer_id": item.customer_id,
            "customer_code": item.customer.customer_code,
            "customer_name": item.customer.customer_name,
            "customer_part_no": item.customer_part_no,
            "supplier_item_id": item.supplier_item_id,
            "maker_part_no": item.supplier_item.maker_part_no,
            "display_name": item.supplier_item.display_name,
            "supplier_id": item.supplier_item.supplier.id,
            "supplier_code": item.supplier_item.supplier.supplier_code,
            "supplier_name": item.supplier_item.supplier.supplier_name,
            "base_unit": item.base_unit,
            "pack_unit": item.pack_unit,
            "pack_quantity": item.pack_quantity,
            "special_instructions": item.special_instructions,
            # Metadata
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "valid_to": item.valid_to,
            "version": item.version,
        }

    def create(self, item: CustomerItemCreate) -> dict:  # type: ignore[override]
        """Create a new customer item mapping and return enriched data."""
        created_item = super().create(item)
        return self._enrich_item(created_item)

    def get_all(  # type: ignore[override]
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: int | None = None,
        supplier_item_id: int | None = None,
        supplier_id: int | None = None,
        include_inactive: bool = False,
    ) -> list[dict]:
        """Get all customer item mappings with optional filtering and enriched data.

        Phase1: Filter by supplier_item_id instead of supplier_item_id.
        """
        from sqlalchemy import select

        from app.infrastructure.persistence.models.masters_models import (
            Customer,
            Supplier,
        )
        from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

        # Build query with JOINs to get related names
        # Phase1: Join via supplier_item_id
        query = (
            select(
                CustomerItem,
                Customer.customer_code,
                Customer.customer_name,
                SupplierItem.display_name,
                SupplierItem.maker_part_no,
                Supplier.id.label("supplier_id"),
                Supplier.supplier_code,
                Supplier.supplier_name,
            )
            .join(Customer, CustomerItem.customer_id == Customer.id)
            .join(SupplierItem, CustomerItem.supplier_item_id == SupplierItem.id)
            .join(Supplier, SupplierItem.supplier_id == Supplier.id)
        )

        if customer_id is not None:
            query = query.filter(CustomerItem.customer_id == customer_id)

        if supplier_item_id is not None:
            query = query.filter(CustomerItem.supplier_item_id == supplier_item_id)

        if supplier_id is not None:
            # Filter via supplier_items.supplier_id
            query = query.filter(SupplierItem.supplier_id == supplier_id)

        if not include_inactive:
            query = query.filter(CustomerItem.get_active_filter())

        results = self.db.execute(query.offset(skip).limit(limit)).all()

        # Convert to dict with enriched data
        # Phase1: Return maker_part_no and display_name instead of product_code/product_name
        return [
            {
                "id": r.CustomerItem.id,
                "customer_id": r.CustomerItem.customer_id,
                "customer_code": r.customer_code,
                "customer_name": r.customer_name,
                "customer_part_no": r.CustomerItem.customer_part_no,
                "supplier_item_id": r.CustomerItem.supplier_item_id,
                "maker_part_no": r.maker_part_no,
                "display_name": r.display_name,
                "supplier_id": r.supplier_id,
                "supplier_code": r.supplier_code,
                "supplier_name": r.supplier_name,
                "base_unit": r.CustomerItem.base_unit,
                "pack_unit": r.CustomerItem.pack_unit,
                "pack_quantity": float(r.CustomerItem.pack_quantity)
                if r.CustomerItem.pack_quantity
                else None,
                "special_instructions": r.CustomerItem.special_instructions,
                # Metadata
                "created_at": r.CustomerItem.created_at.isoformat()
                if r.CustomerItem.created_at
                else None,
                "updated_at": r.CustomerItem.updated_at.isoformat()
                if r.CustomerItem.updated_at
                else None,
                "valid_to": r.CustomerItem.valid_to,
                "version": r.CustomerItem.version,
            }
            for r in results
        ]

    def get_by_customer(self, customer_id: int) -> list[dict]:
        """Get all customer item mappings for a specific customer."""
        return self.get_all(customer_id=customer_id)

    # ============================================================
    # ID-based operations (new primary interface)
    # ============================================================

    def get_by_id_enriched(self, item_id: int) -> dict | None:
        """Get customer item by ID with enriched data."""
        db_item = cast(
            CustomerItem | None,
            self.db.query(CustomerItem).filter(CustomerItem.id == item_id).first(),
        )
        if not db_item:
            return None
        return self._enrich_item(db_item)

    def update_by_id(
        self, item_id: int, item: CustomerItemUpdate, *, is_admin: bool = False
    ) -> dict | None:
        """Update an existing customer item mapping by ID.

        customer_part_no を変更する場合:
        - 管理者のみ変更可能
        - 同一customer_id内での重複をチェック
        """
        from fastapi import HTTPException, status

        db_item = cast(
            CustomerItem | None,
            self.db.query(CustomerItem).filter(CustomerItem.id == item_id).first(),
        )
        if not db_item:
            return None

        # customer_part_no 変更時のチェック
        if item.customer_part_no and item.customer_part_no != db_item.customer_part_no:
            # 1. 管理者権限チェック
            if not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="得意先品番の変更は管理者のみ許可されています。",
                )
            # 2. 重複チェック
            existing = self.get_by_key(db_item.customer_id, item.customer_part_no)
            if existing and existing.id != item_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"得意先品番 '{item.customer_part_no}' は既に存在します。",
                )

        update_data = item.model_dump(exclude_unset=True, exclude={"version"})
        update_data["updated_at"] = utcnow()
        updated = update_with_version(
            self.db,
            CustomerItem,
            filters=[CustomerItem.id == item_id],
            update_values=update_data,
            expected_version=item.version,
            not_found_detail="Customer item mapping not found",
        )
        return self._enrich_item(updated)

    def delete_by_id(self, item_id: int, end_date: date | None, expected_version: int) -> bool:
        """Soft delete a customer item mapping by ID with optimistic lock."""
        soft_delete_with_version(
            self.db,
            CustomerItem,
            filters=[CustomerItem.id == item_id],
            expected_version=expected_version,
            end_date=end_date,
            not_found_detail="Customer item mapping not found",
        )
        return True

    def permanent_delete_by_id(self, item_id: int, expected_version: int) -> bool:
        """Permanently delete a customer item mapping by ID with optimistic lock."""
        hard_delete_with_version(
            self.db,
            CustomerItem,
            filters=[CustomerItem.id == item_id],
            expected_version=expected_version,
            not_found_detail="Customer item mapping not found",
        )
        return True

    def restore_by_id(self, item_id: int) -> dict | None:
        """Restore a soft-deleted customer item mapping by ID."""
        db_item = cast(
            CustomerItem | None,
            self.db.query(CustomerItem).filter(CustomerItem.id == item_id).first(),
        )
        if not db_item:
            return None

        db_item.restore()
        self.db.commit()
        self.db.refresh(db_item)
        return self._enrich_item(db_item)

    # ============================================================
    # Composite key operations (backward compatibility)
    # ============================================================

    def get_by_key(self, customer_id: int, customer_part_no: str) -> CustomerItem | None:
        """Get customer item mapping by composite key (customer_id, customer_part_no)."""
        return cast(
            CustomerItem | None,
            self.db.query(CustomerItem)
            .filter(
                CustomerItem.customer_id == customer_id,
                CustomerItem.customer_part_no == customer_part_no,
            )
            .first(),
        )

    def update_by_key(
        self, customer_id: int, customer_part_no: str, item: CustomerItemUpdate
    ) -> dict | None:
        """Update an existing customer item mapping by composite key."""
        db_item = self.get_by_key(customer_id, customer_part_no)
        if not db_item:
            return None

        for key, value in item.model_dump(exclude_unset=True).items():
            setattr(db_item, key, value)

        db_item.updated_at = utcnow()
        self.db.commit()
        self.db.refresh(db_item)
        return self._enrich_item(db_item)

    def delete_by_key(
        self, customer_id: int, customer_part_no: str, end_date: date | None = None
    ) -> bool:
        """Soft delete a customer item mapping by composite key."""
        db_item = self.get_by_key(customer_id, customer_part_no)
        if not db_item:
            return False

        db_item.soft_delete(end_date)
        self.db.commit()
        return True

    def permanent_delete_by_key(self, customer_id: int, customer_part_no: str) -> bool:
        """Permanently delete a customer item mapping by composite key."""
        db_item = self.get_by_key(customer_id, customer_part_no)
        if not db_item:
            return False

        self.db.delete(db_item)
        self.db.commit()
        return True

    def restore_by_key(self, customer_id: int, customer_part_no: str) -> dict | None:
        """Restore a soft-deleted customer item mapping by composite key."""
        db_item = self.get_by_key(customer_id, customer_part_no)
        if not db_item:
            return None

        db_item.restore()
        self.db.commit()
        self.db.refresh(db_item)
        return self._enrich_item(db_item)

    # ============================================================
    # Bulk operations
    # ============================================================

    def bulk_upsert(self, rows: list[CustomerItemBulkRow]) -> BulkUpsertResponse:
        """Bulk upsert customer items by composite key (customer_code, customer_part_no).

        Args:
            rows: List of customer item rows to upsert

        Returns:
            BulkUpsertResponse with summary and errors
        """
        from app.infrastructure.persistence.models.masters_models import (
            Customer,
            Supplier,
        )
        from app.infrastructure.persistence.models.supplier_item_model import SupplierItem

        summary = {"total": 0, "created": 0, "updated": 0, "failed": 0}
        errors = []

        # 1. Collect all codes to resolve IDs efficiently
        customer_codes = {row.customer_code for row in rows}
        product_codes = {row.product_code for row in rows}
        # Phase1: supplier_codes used for validation only (not stored in customer_items)

        # 2. Resolve IDs
        customers = (
            self.db.query(Customer.customer_code, Customer.id)
            .filter(Customer.customer_code.in_(customer_codes))
            .all()
        )
        customer_map = {code: id for code, id in customers}

        # Phase1: product_code -> supplier_item_id
        supplier_items = (
            self.db.query(SupplierItem.maker_part_no, SupplierItem.id)
            .filter(SupplierItem.maker_part_no.in_(product_codes))
            .all()
        )
        supplier_item_map = {code: id for code, id in supplier_items}

        # Phase1: supplier_id is no longer stored in customer_items (available via supplier_item)
        # We keep supplier_codes validation for data integrity but don't store it directly

        # 3. Process rows
        for row in rows:
            try:
                # Resolve IDs
                customer_id = customer_map.get(row.customer_code)
                if not customer_id:
                    raise ValueError(f"Customer code not found: {row.customer_code}")

                supplier_item_id = supplier_item_map.get(row.product_code)
                if not supplier_item_id:
                    raise ValueError(f"Product code not found: {row.product_code}")

                # Phase1: Validate supplier_code if provided (for data integrity)
                # but we don't store it directly in customer_items
                if row.supplier_code:
                    supplier = (
                        self.db.query(Supplier)
                        .filter(Supplier.supplier_code == row.supplier_code)
                        .first()
                    )
                    if not supplier:
                        raise ValueError(f"Supplier code not found: {row.supplier_code}")

                # Check if customer item exists by composite key
                existing = self.get_by_key(customer_id, row.customer_part_no)

                if existing:
                    # UPDATE
                    existing.supplier_item_id = supplier_item_id
                    existing.base_unit = row.base_unit
                    existing.pack_unit = row.pack_unit
                    existing.pack_quantity = row.pack_quantity
                    existing.special_instructions = row.special_instructions
                    existing.updated_at = utcnow()
                    summary["updated"] += 1
                else:
                    # CREATE
                    new_item = CustomerItem(
                        customer_id=customer_id,
                        customer_part_no=row.customer_part_no,
                        supplier_item_id=supplier_item_id,
                        base_unit=row.base_unit,
                        pack_unit=row.pack_unit,
                        pack_quantity=row.pack_quantity,
                        special_instructions=row.special_instructions,
                    )
                    self.db.add(new_item)
                    summary["created"] += 1

                summary["total"] += 1

            except Exception as e:
                summary["failed"] += 1
                errors.append(
                    f"customer={row.customer_code}, part_no={row.customer_part_no}: {str(e)}"
                )
                self.db.rollback()
                continue

        # Commit all successful operations
        if summary["created"] + summary["updated"] > 0:
            try:
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                errors.append(f"Commit failed: {str(e)}")
                summary["failed"] = summary["total"]
                summary["created"] = 0
                summary["updated"] = 0

        # Determine status
        if summary["failed"] == 0:
            status = "success"
        elif summary["created"] + summary["updated"] > 0:
            status = "partial"
        else:
            status = "failed"

        return BulkUpsertResponse(
            status=status, summary=BulkUpsertSummary(**summary), errors=errors
        )
