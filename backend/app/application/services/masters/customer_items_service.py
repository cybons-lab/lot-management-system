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
        """Enrich customer item with related names."""
        self.db.refresh(item, attribute_names=["customer", "product", "supplier"])
        return {
            "id": item.id,
            "customer_id": item.customer_id,
            "customer_code": item.customer.customer_code,
            "customer_name": item.customer.customer_name,
            "customer_part_no": item.customer_part_no,
            "product_id": item.product_id,
            "product_code": item.product.maker_part_code,
            "product_name": item.product.product_name,
            "supplier_id": item.supplier_id,
            "supplier_item_id": item.supplier_item_id,
            "supplier_code": item.supplier.supplier_code if item.supplier else None,
            "supplier_name": item.supplier.supplier_name if item.supplier else None,
            "is_primary": item.is_primary,
            "base_unit": item.base_unit,
            "pack_unit": item.pack_unit,
            "pack_quantity": item.pack_quantity,
            "special_instructions": item.special_instructions,
            # Metadata
            "created_at": item.created_at,
            "updated_at": item.updated_at,
            "valid_to": item.valid_to,
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
        product_id: int | None = None,
        include_inactive: bool = False,
    ) -> list[dict]:
        """Get all customer item mappings with optional filtering and enriched data."""
        from sqlalchemy import select

        from app.infrastructure.persistence.models.masters_models import Customer, Product, Supplier

        # Build query with JOINs to get related names
        query = (
            select(
                CustomerItem,
                Customer.customer_code,
                Customer.customer_name,
                Product.product_name,
                Product.maker_part_code,
                Supplier.supplier_code,
                Supplier.supplier_name,
            )
            .join(Customer, CustomerItem.customer_id == Customer.id)
            .join(Product, CustomerItem.product_id == Product.id)
            .outerjoin(Supplier, CustomerItem.supplier_id == Supplier.id)
        )

        if customer_id is not None:
            query = query.filter(CustomerItem.customer_id == customer_id)

        if product_id is not None:
            query = query.filter(CustomerItem.product_id == product_id)

        if not include_inactive:
            query = query.filter(CustomerItem.get_active_filter())

        results = self.db.execute(query.offset(skip).limit(limit)).all()

        # Convert to dict with enriched data
        return [
            {
                "id": r.CustomerItem.id,
                "customer_id": r.CustomerItem.customer_id,
                "customer_code": r.customer_code,
                "customer_name": r.customer_name,
                "customer_part_no": r.CustomerItem.customer_part_no,
                "product_id": r.CustomerItem.product_id,
                "product_code": r.maker_part_code,
                "product_name": r.product_name,
                "supplier_id": r.CustomerItem.supplier_id,
                "supplier_item_id": r.CustomerItem.supplier_item_id,
                "supplier_code": r.supplier_code,
                "supplier_name": r.supplier_name,
                "is_primary": r.CustomerItem.is_primary,
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

        for key, value in item.model_dump(exclude_unset=True).items():
            setattr(db_item, key, value)

        db_item.updated_at = utcnow()
        self.db.commit()
        self.db.refresh(db_item)
        return self._enrich_item(db_item)

    def delete_by_id(self, item_id: int, end_date: date | None = None) -> bool:
        """Soft delete a customer item mapping by ID."""
        db_item = cast(
            CustomerItem | None,
            self.db.query(CustomerItem).filter(CustomerItem.id == item_id).first(),
        )
        if not db_item:
            return False

        db_item.soft_delete(end_date)
        self.db.commit()
        return True

    def permanent_delete_by_id(self, item_id: int) -> bool:
        """Permanently delete a customer item mapping by ID."""
        db_item = cast(
            CustomerItem | None,
            self.db.query(CustomerItem).filter(CustomerItem.id == item_id).first(),
        )
        if not db_item:
            return False

        self.db.delete(db_item)
        self.db.commit()
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
        from app.infrastructure.persistence.models.masters_models import Customer, Product, Supplier

        summary = {"total": 0, "created": 0, "updated": 0, "failed": 0}
        errors = []

        # 1. Collect all codes to resolve IDs efficiently
        customer_codes = {row.customer_code for row in rows}
        product_codes = {row.product_code for row in rows}
        supplier_codes = {row.supplier_code for row in rows if row.supplier_code}

        # 2. Resolve IDs
        customers = (
            self.db.query(Customer.customer_code, Customer.id)
            .filter(Customer.customer_code.in_(customer_codes))
            .all()
        )
        customer_map = {code: id for code, id in customers}

        products = (
            self.db.query(Product.maker_part_code, Product.id)
            .filter(Product.maker_part_code.in_(product_codes))
            .all()
        )
        product_map = {code: id for code, id in products}

        supplier_map = {}
        if supplier_codes:
            suppliers = (
                self.db.query(Supplier.supplier_code, Supplier.id)
                .filter(Supplier.supplier_code.in_(supplier_codes))
                .all()
            )
            supplier_map = {code: id for code, id in suppliers}

        # 3. Process rows
        for row in rows:
            try:
                # Resolve IDs
                customer_id = customer_map.get(row.customer_code)
                if not customer_id:
                    raise ValueError(f"Customer code not found: {row.customer_code}")

                product_id = product_map.get(row.product_code)
                if not product_id:
                    raise ValueError(f"Product code not found: {row.product_code}")

                supplier_id = None
                if row.supplier_code:
                    supplier_id = supplier_map.get(row.supplier_code)
                    if not supplier_id:
                        raise ValueError(f"Supplier code not found: {row.supplier_code}")

                # Check if customer item exists by composite key
                existing = self.get_by_key(customer_id, row.customer_part_no)

                if existing:
                    # UPDATE
                    existing.product_id = product_id
                    existing.supplier_id = supplier_id
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
                        product_id=product_id,
                        supplier_id=supplier_id,
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
