"""Lot repository and service utilities with FEFO support.

v2.2: lot_current_stock 依存を削除。Lot モデルを直接使用。
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date, datetime
from decimal import Decimal
from typing import cast

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.domain.lot import (
    FefoPolicy,
    InsufficientLotStockError,
    LotCandidate,
    LotDatabaseError,
    LotNotFoundError,
    LotProductNotFoundError,
    LotSupplierNotFoundError,
    LotValidationError,
    LotWarehouseNotFoundError,
    StockValidator,
)
from app.models import (
    Lot,
    Product,
    StockMovement,
    Supplier,
    VLotDetails,
    Warehouse,
)
from app.schemas.inventory.inventory_schema import (
    LotCreate,
    LotLock,
    LotResponse,
    LotStatus,
    LotUpdate,
    StockMovementCreate,
    StockMovementResponse,
)


class LotRepository:
    """Data-access helpers for lot entities."""

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, lot_id: int) -> Lot | None:
        """Return a lot by its primary key."""
        stmt: Select[tuple[Lot]] = (
            select(Lot)
            .options(joinedload(Lot.product), joinedload(Lot.warehouse))
            .where(Lot.id == lot_id)
        )
        return cast(Lot | None, self.db.execute(stmt).scalar_one_or_none())

    def find_available_lots(
        self,
        product_code: str,
        warehouse_code: str | None = None,
        min_quantity: float = 0.0,
    ) -> Sequence[Lot]:
        """Fetch lots that have stock remaining for a product.

        v2.2: Uses Lot.current_quantity - Lot.allocated_quantity directly.
        """
        # product_codeからproduct_idに変換
        from app.models import Product

        product = self.db.query(Product).filter(Product.maker_part_code == product_code).first()
        if not product:
            return []

        stmt: Select[tuple[Lot]] = select(Lot).where(
            Lot.product_id == product.id,
            Lot.status == "active",
            (Lot.current_quantity - Lot.allocated_quantity) > min_quantity,
        )

        if warehouse_code:
            from app.models import Warehouse

            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.warehouse_code == warehouse_code).first()
            )
            if warehouse:
                stmt = stmt.where(Lot.warehouse_id == warehouse.id)
            else:
                return []

        return cast(Sequence[Lot], self.db.execute(stmt).scalars().all())

    def create(
        self,
        supplier_code: str,
        product_code: str,
        lot_number: str,
        warehouse_id: int,
        receipt_date: date | None = None,
        expiry_date: date | None = None,
    ) -> Lot:
        """Create a lot placeholder using known identifiers."""
        warehouse: Warehouse | None = self.db.get(Warehouse, warehouse_id)
        product: Product | None = None
        supplier: Supplier | None = None
        if supplier_code:
            supplier_stmt = select(Supplier).where(Supplier.supplier_code == supplier_code)
            supplier = self.db.execute(supplier_stmt).scalar_one_or_none()
        if product_code:
            product_stmt = select(Product).where(Product.maker_part_code == product_code)
            product = self.db.execute(product_stmt).scalar_one_or_none()

        lot = Lot(
            supplier_id=supplier.id if supplier else None,
            supplier_code=supplier.supplier_code if supplier else supplier_code,
            product_id=product.id if product else None,
            product_code=product.maker_part_code if product else product_code,
            lot_number=lot_number,
            warehouse_id=warehouse_id,
            warehouse_code=warehouse.warehouse_code if warehouse else None,
            received_date=receipt_date or date.today(),
            expiry_date=expiry_date,
        )
        self.db.add(lot)
        return lot


class LotService:
    """Business logic for lot operations and FEFO candidate retrieval."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = LotRepository(db)

    def get_lot(self, lot_id: int) -> Lot:
        lot = self.repository.find_by_id(lot_id)
        if not lot:
            raise LotNotFoundError(lot_id)
        return lot

    def get_fefo_candidates(
        self,
        product_code: str,
        warehouse_code: str | None = None,
        exclude_expired: bool = True,
    ) -> list[LotCandidate]:
        """Get FEFO candidate lots.

        v2.2: Uses Lot.current_quantity - Lot.allocated_quantity for available quantity.
        """
        lots = self.repository.find_available_lots(
            product_code=product_code,
            warehouse_code=warehouse_code,
            min_quantity=0.0,
        )

        candidates = [
            LotCandidate(
                lot_id=lot.id,
                lot_code=lot.lot_number,
                lot_number=lot.lot_number,
                product_code=lot.product.maker_part_code if lot.product else product_code,
                warehouse_code=lot.warehouse.warehouse_code if lot.warehouse else "",
                available_qty=float((lot.current_quantity - lot.allocated_quantity) or 0.0),
                expiry_date=lot.expiry_date,
                receipt_date=lot.received_date,
            )
            for lot in lots
        ]

        if exclude_expired:
            candidates, _ = FefoPolicy.filter_expired_lots(candidates)

        return FefoPolicy.sort_lots_by_fefo(candidates)

    def validate_lot_availability(self, lot_id: int, required_qty: float) -> None:
        """Validate lot availability.

        v2.2: Uses Lot.current_quantity - Lot.allocated_quantity directly.
        """
        lot = self.get_lot(lot_id)

        # 利用可能在庫を計算
        available_qty = float(lot.current_quantity - lot.allocated_quantity)

        StockValidator.validate_sufficient_stock(lot_id, required_qty, available_qty)
        StockValidator.validate_not_expired(lot_id, lot.expiry_date)

    # --- New Methods Extracted from Router ---

    def list_lots(
        self,
        skip: int = 0,
        limit: int = 100,
        product_id: int | None = None,
        product_code: str | None = None,
        supplier_code: str | None = None,
        warehouse_code: str | None = None,
        expiry_from: date | None = None,
        expiry_to: date | None = None,
        with_stock: bool = True,
        primary_supplier_ids: list[int] | None = None,
    ) -> list[LotResponse]:
        """List lots using VLotDetails view.

        Args:
            skip: スキップ件数
            limit: 取得件数
            product_id: 製品ID
            product_code: 製品コード
            supplier_code: 仕入先コード
            warehouse_code: 倉庫コード
            expiry_from: 有効期限開始日
            expiry_to: 有効期限終了日
            with_stock: 在庫ありのみ取得するかどうか
            primary_supplier_ids: 主担当の仕入先IDリスト。指定された場合、これらを優先表示。

        Returns:
            LotResponseのリスト
        """
        from sqlalchemy import case

        query = self.db.query(VLotDetails)

        if product_id is not None:
            query = query.filter(VLotDetails.product_id == product_id)
        elif product_code:
            query = query.filter(VLotDetails.maker_part_code == product_code)

        if supplier_code:
            supplier = (
                self.db.query(Supplier).filter(Supplier.supplier_code == supplier_code).first()
            )
            if supplier:
                query = query.filter(VLotDetails.supplier_id == supplier.id)

        if warehouse_code:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.warehouse_code == warehouse_code).first()
            )
            if warehouse:
                query = query.filter(VLotDetails.warehouse_id == warehouse.id)

        if expiry_from:
            query = query.filter(VLotDetails.expiry_date >= expiry_from)
        if expiry_to:
            query = query.filter(VLotDetails.expiry_date <= expiry_to)

        if with_stock:
            query = query.filter(VLotDetails.available_quantity > 0)

        # ソート: 主担当優先 → 製品コード → 仕入先 → 有効期限(FEFO)
        if primary_supplier_ids:
            priority_case = case(
                (VLotDetails.supplier_id.in_(primary_supplier_ids), 0),
                else_=1,
            )
            query = query.order_by(
                priority_case,
                VLotDetails.maker_part_code.asc(),
                VLotDetails.supplier_name.asc(),
                VLotDetails.expiry_date.asc().nullslast(),
            )
        else:
            query = query.order_by(
                VLotDetails.maker_part_code.asc(),
                VLotDetails.supplier_name.asc(),
                VLotDetails.expiry_date.asc().nullslast(),
            )

        lot_views = query.offset(skip).limit(limit).all()

        responses: list[LotResponse] = []
        for lot_view in lot_views:
            response = LotResponse(
                id=lot_view.lot_id,
                lot_number=lot_view.lot_number,
                product_id=lot_view.product_id,
                product_code=lot_view.maker_part_code or "",
                product_name=lot_view.product_name,
                supplier_id=lot_view.supplier_id,
                supplier_code=lot_view.supplier_code,
                supplier_name=lot_view.supplier_name or "",
                warehouse_id=lot_view.warehouse_id,
                warehouse_code=lot_view.warehouse_code,
                warehouse_name=lot_view.warehouse_name,
                current_quantity=lot_view.current_quantity or Decimal("0"),
                allocated_quantity=lot_view.allocated_quantity or Decimal("0"),
                unit=lot_view.unit,
                received_date=lot_view.received_date,
                expiry_date=lot_view.expiry_date,
                status=LotStatus(lot_view.status) if lot_view.status else LotStatus.ACTIVE,
                created_at=lot_view.created_at,
                updated_at=lot_view.updated_at,
                last_updated=lot_view.updated_at,
                is_primary_supplier=bool(
                    primary_supplier_ids and lot_view.supplier_id in primary_supplier_ids
                ),
            )
            responses.append(response)
        return responses

    def create_lot(self, lot_create: LotCreate) -> LotResponse:
        """Create a new lot."""
        # Validation
        if not lot_create.product_id:
            raise LotValidationError("product_id は必須です")

        product = self.db.query(Product).filter(Product.id == lot_create.product_id).first()
        if not product:
            raise LotProductNotFoundError(lot_create.product_id)

        supplier = (
            self.db.query(Supplier)
            .filter(Supplier.supplier_code == lot_create.supplier_code)
            .first()
        )
        if not supplier:
            if not lot_create.supplier_code:
                raise LotValidationError("supplier_code is required")
            raise LotSupplierNotFoundError(lot_create.supplier_code)

        warehouse_id: int | None = None
        if lot_create.warehouse_id is not None:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.id == lot_create.warehouse_id).first()
            )
            if not warehouse:
                raise LotWarehouseNotFoundError(f"ID={lot_create.warehouse_id}")
            warehouse_id = warehouse.id
        elif lot_create.warehouse_code:
            warehouse = (
                self.db.query(Warehouse)
                .filter(Warehouse.warehouse_code == lot_create.warehouse_code)
                .first()
            )
            if not warehouse:
                raise LotWarehouseNotFoundError(f"コード={lot_create.warehouse_code}")
            warehouse_id = warehouse.id
        else:
            raise LotValidationError("倉庫コードまたは倉庫IDを指定してください")

        lot_payload = lot_create.model_dump()
        lot_payload["warehouse_id"] = warehouse_id
        lot_payload.pop("warehouse_code", None)

        try:
            db_lot = Lot(**lot_payload)
            self.db.add(db_lot)
            self.db.commit()
            self.db.refresh(db_lot)
        except IntegrityError as exc:
            self.db.rollback()
            raise LotDatabaseError("ロット作成時のDB整合性エラー", exc) from exc
        except SQLAlchemyError as exc:
            self.db.rollback()
            raise LotDatabaseError("ロット作成時のDBエラー", exc) from exc

        # Response Construction
        return self._build_lot_response(db_lot.id)

    def update_lot(self, lot_id: int, lot_update: LotUpdate) -> LotResponse:
        """Update an existing lot."""
        db_lot = self.db.query(Lot).filter(Lot.id == lot_id).first()
        if not db_lot:
            raise LotNotFoundError(lot_id)

        updates = lot_update.model_dump(exclude_unset=True)

        if "warehouse_id" in updates:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.id == updates["warehouse_id"]).first()
            )
            if not warehouse:
                raise LotWarehouseNotFoundError(f"ID={updates['warehouse_id']}")
        elif "warehouse_code" in updates:
            warehouse = (
                self.db.query(Warehouse)
                .filter(Warehouse.warehouse_code == updates["warehouse_code"])
                .first()
            )
            if not warehouse:
                raise LotWarehouseNotFoundError(f"コード={updates['warehouse_code']}")
            updates["warehouse_id"] = warehouse.id

        updates.pop("warehouse_code", None)

        for key, value in updates.items():
            setattr(db_lot, key, value)

        db_lot.updated_at = datetime.now()

        try:
            self.db.commit()
            self.db.refresh(db_lot)
        except IntegrityError as exc:
            self.db.rollback()
            raise LotDatabaseError("ロット更新時のDB整合性エラー", exc) from exc
        except SQLAlchemyError as exc:
            self.db.rollback()
            raise LotDatabaseError("ロット更新時のDBエラー", exc) from exc

        return self._build_lot_response(db_lot.id)

    def delete_lot(self, lot_id: int) -> None:
        """Delete a lot."""
        db_lot = self.db.query(Lot).filter(Lot.id == lot_id).first()
        if not db_lot:
            raise LotNotFoundError(lot_id)

        self.db.delete(db_lot)
        self.db.commit()

    def lock_lot(self, lot_id: int, lock_data: LotLock) -> LotResponse:
        """Lock lot quantity."""
        db_lot = self.db.query(Lot).filter(Lot.id == lot_id).first()
        if not db_lot:
            raise LotNotFoundError(lot_id)

        quantity_to_lock = lock_data.quantity
        current_qty = db_lot.current_quantity or Decimal(0)
        allocated_qty = db_lot.allocated_quantity or Decimal(0)
        locked_qty = db_lot.locked_quantity or Decimal(0)
        available_qty = current_qty - allocated_qty - locked_qty

        if quantity_to_lock is None:
            quantity_to_lock = available_qty

        if quantity_to_lock < 0:
            raise LotValidationError("ロック数量は0以上である必要があります")

        if quantity_to_lock > available_qty:
            raise InsufficientLotStockError(lot_id, float(quantity_to_lock), float(available_qty))

        db_lot.locked_quantity = locked_qty + quantity_to_lock
        if lock_data.reason:
            db_lot.lock_reason = lock_data.reason

        db_lot.updated_at = datetime.now()

        try:
            self.db.commit()
            self.db.refresh(db_lot)
        except IntegrityError as exc:
            self.db.rollback()
            raise LotDatabaseError("ロットロック時のDB整合性エラー", exc) from exc

        # Return view-based response
        lot_view = self.db.query(VLotDetails).filter(VLotDetails.lot_id == lot_id).first()
        if not lot_view:
            # Fallback if view not updated immediately (though within txn usually fine)
            return self._build_lot_response(lot_id)
        return LotResponse.model_validate(lot_view)

    def unlock_lot(self, lot_id: int, unlock_data: LotLock | None = None) -> LotResponse:
        """Unlock lot quantity."""
        db_lot = self.db.query(Lot).filter(Lot.id == lot_id).first()
        if not db_lot:
            raise LotNotFoundError(lot_id)

        quantity_to_unlock = unlock_data.quantity if unlock_data else None
        locked_qty = db_lot.locked_quantity or Decimal(0)

        if quantity_to_unlock is None:
            # Full unlock
            db_lot.locked_quantity = Decimal(0)
            db_lot.lock_reason = None
            if db_lot.status == "locked":
                db_lot.status = "active"
        else:
            if quantity_to_unlock < 0:
                raise LotValidationError("解除数量は0以上である必要があります")
            if quantity_to_unlock > locked_qty:
                raise LotValidationError(
                    f"解除数量({quantity_to_unlock})がロック済み数量({locked_qty})を超えています"
                )
            db_lot.locked_quantity = locked_qty - quantity_to_unlock

        db_lot.updated_at = datetime.now()
        self.db.commit()

        lot_view = self.db.query(VLotDetails).filter(VLotDetails.lot_id == lot_id).first()
        if not lot_view:
            return self._build_lot_response(lot_id)
        return LotResponse.model_validate(lot_view)

    def create_stock_movement(self, movement: StockMovementCreate) -> StockMovementResponse:
        """Create a stock movement (history) and update lot quantity."""
        lot = None
        if movement.lot_id is not None:
            lot = self.db.query(Lot).filter(Lot.id == movement.lot_id).first()
            if not lot:
                raise LotNotFoundError(movement.lot_id)

        # StockHistory does not store product/warehouse directly, but we validate lot link

        # We need to map schema fields to model fields correctly
        # Schema: StockMovementCreate (alias of StockHistoryCreate) -> StockHistoryBase
        # Fields: transaction_type, quantity_change, quantity_after, reference_type, reference_id

        db_movement = StockMovement(
            lot_id=movement.lot_id,
            transaction_type=movement.transaction_type,
            quantity_change=movement.quantity_change,
            quantity_after=movement.quantity_after,  # We will overwrite this after calc if needed
            reference_type=movement.reference_type,
            reference_id=movement.reference_id,
        )
        # Note: product_id, warehouse_id, batch_id, created_by are NOT in StockHistory model.

        self.db.add(db_movement)

        if movement.lot_id:
            # Re-fetch or use lot
            if not lot:  # Already fetched above
                lot = self.db.query(Lot).filter(Lot.id == movement.lot_id).first()

            if not lot:
                self.db.rollback()
                raise LotNotFoundError(movement.lot_id)

            # Calculate new quantity based on change
            # movement.quantity_change should be signed (+ or -)
            current_qty = float(lot.current_quantity or 0.0)
            projected_quantity = current_qty + float(movement.quantity_change)

            if projected_quantity < 0:
                self.db.rollback()
                raise InsufficientLotStockError(
                    movement.lot_id,
                    abs(float(movement.quantity_change)),
                    current_qty,
                )

            lot.current_quantity = Decimal(str(projected_quantity))
            lot.updated_at = datetime.now()

            # Update quantity_after in history to match reality
            db_movement.quantity_after = lot.current_quantity

        self.db.commit()
        self.db.refresh(db_movement)
        return StockMovementResponse.model_validate(db_movement)

    def list_lot_movements(self, lot_id: int) -> list[StockMovementResponse]:
        """List movements for a lot."""
        movements = (
            self.db.query(StockMovement)
            .filter(StockMovement.lot_id == lot_id)
            .order_by(StockMovement.transaction_date.desc())
            .all()
        )
        return [StockMovementResponse.model_validate(m) for m in movements]

    def _build_lot_response(self, lot_id: int) -> LotResponse:
        """Helper to build LotResponse from Lot model definition (joined
        load).
        """
        db_lot = (
            self.db.query(Lot)
            .options(joinedload(Lot.product), joinedload(Lot.warehouse), joinedload(Lot.supplier))
            .filter(Lot.id == lot_id)
            .first()
        )
        if not db_lot:
            raise LotNotFoundError(lot_id)

        response = LotResponse.model_validate(db_lot)

        if db_lot.product:
            response.product_name = db_lot.product.product_name
            response.product_code = db_lot.product.product_code  # type: ignore[attr-defined]

        if db_lot.warehouse:
            response.warehouse_name = db_lot.warehouse.warehouse_name
            response.warehouse_code = db_lot.warehouse.warehouse_code

        if db_lot.supplier:
            response.supplier_name = db_lot.supplier.supplier_name
            response.supplier_code = db_lot.supplier.supplier_code

        response.current_quantity = db_lot.current_quantity or Decimal("0")
        response.last_updated = db_lot.updated_at
        return response
