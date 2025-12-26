"""Lot repository and service utilities with FEFO support.

v2.2: lot_current_stock 依存を削除。Lot モデルを直接使用。
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, joinedload

from app.application.services.inventory.stock_calculation import (
    get_available_quantity,
    get_reserved_quantity,
)
from app.core.time_utils import utcnow
from app.domain.lot import (
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
from app.infrastructure.persistence.models import (
    Lot,
    Product,
    StockMovement,
    Supplier,
    VLotDetails,
    Warehouse,
)
from app.infrastructure.persistence.repositories.lot_repository import LotRepository
from app.presentation.schemas.inventory.inventory_schema import (
    LotCreate,
    LotLock,
    LotOriginType,
    LotResponse,
    LotStatus,
    LotUpdate,
    StockMovementCreate,
    StockMovementResponse,
)


class LotService:
    """ロット操作とFEFO候補取得のビジネスロジック.

    ロットの作成・更新・削除、在庫変動記録、引当候補の取得など、
    ロット在庫管理の中核となるビジネスロジックを提供します。
    """

    def __init__(self, db: Session):
        """サービスの初期化.

        Args:
            db: データベースセッション
        """
        self.db = db
        self.repository = LotRepository(db)

    def get_lot(self, lot_id: int) -> Lot:
        """ロットを取得.

        Args:
            lot_id: ロットID

        Returns:
            Lot: ロットエンティティ

        Raises:
            LotNotFoundError: ロットが存在しない場合
        """
        lot = self.repository.find_by_id(lot_id)
        if not lot:
            raise LotNotFoundError(lot_id)
        return lot

    def get_fefo_candidates(
        self,
        product_code: str,
        warehouse_code: str | None = None,
        exclude_expired: bool = True,
        include_sample: bool = False,
        include_adhoc: bool = False,
    ) -> list[LotCandidate]:
        """FEFO引当候補ロットを取得.

        有効期限の早い順（FEFO: First Expiry First Out）に並べた引当候補ロットを返します。
        v2.2: Lot.current_quantity - Lot.allocated_quantityで利用可能数量を計算
        v2.3: デフォルトでサンプル/アドホック起源ロットを除外
        v3.0: AllocationCandidateService（SSOT）に処理を委譲

        Args:
            product_code: フィルタ対象の製品コード
            warehouse_code: 倉庫コードフィルタ（省略可）
            exclude_expired: 期限切れロットを除外するか（デフォルト: True）
            include_sample: サンプル起源ロットを含めるか（デフォルト: False）
            include_adhoc: アドホック起源ロットを含めるか（デフォルト: False）

        Returns:
            list[LotCandidate]: FEFO順に並んだ引当候補ロットのリスト
        """
        from app.application.services.allocations.candidate_service import (
            AllocationCandidateService,
        )
        from app.domain.allocation_policy import AllocationPolicy, LockMode

        # Resolve product_code to product_id
        product = self.db.query(Product).filter(Product.maker_part_code == product_code).first()
        if not product:
            return []

        # Resolve warehouse_code to warehouse_id if provided
        warehouse_id: int | None = None
        if warehouse_code:
            warehouse = (
                self.db.query(Warehouse).filter(Warehouse.warehouse_code == warehouse_code).first()
            )
            if warehouse:
                warehouse_id = warehouse.id
            else:
                return []

        # Delegate to SSOT
        candidate_service = AllocationCandidateService(self.db)
        return candidate_service.get_candidates(
            product_id=product.id,
            policy=AllocationPolicy.FEFO,
            lock_mode=LockMode.NONE,
            warehouse_id=warehouse_id,
            exclude_expired=exclude_expired,
            exclude_locked=False,  # Maintain backward compatibility
            include_sample=include_sample,
            include_adhoc=include_adhoc,
        )

    def validate_lot_availability(self, lot_id: int, required_qty: float) -> None:
        """Validate lot availability.

        Uses lot_reservations for available quantity calculation.
        """
        lot = self.get_lot(lot_id)

        # 利用可能在庫を計算 (using lot_reservations)
        available_qty = float(get_available_quantity(self.db, lot))

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
        """Create a new lot.

        For non-order origin types (sample, safety_stock, adhoc),
        supplier_code is optional and lot number is auto-generated.
        """
        # Validation
        if not lot_create.product_id:
            raise LotValidationError("product_id は必須です")

        product = self.db.query(Product).filter(Product.id == lot_create.product_id).first()
        if not product:
            raise LotProductNotFoundError(lot_create.product_id)

        # Supplier validation: required only for ORDER origin type
        supplier = None
        if lot_create.supplier_code:
            supplier = (
                self.db.query(Supplier)
                .filter(Supplier.supplier_code == lot_create.supplier_code)
                .first()
            )
            if not supplier:
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
        lot_payload["supplier_id"] = supplier.id if supplier else None
        lot_payload.pop("warehouse_code", None)
        lot_payload.pop("supplier_code", None)
        lot_payload.pop("product_code", None)
        # Lotモデルに存在しないフィールドを削除
        lot_payload.pop("allocated_quantity", None)

        # 仮入庫対応: lot_number が未指定/空の場合
        # - temporary_lot_key に UUID を発行
        # - lot_number に TMP-YYYYMMDD-XXXX 形式の暫定番号を採番
        is_temporary_lot = (
            not lot_payload.get("lot_number") or lot_payload["lot_number"].strip() == ""
        )

        if is_temporary_lot:
            lot_payload["lot_number"], lot_payload["temporary_lot_key"] = (
                self._generate_temporary_lot_info()
            )
        elif lot_create.origin_type != LotOriginType.ORDER:
            # Auto-generate lot number for non-order origin types if placeholder
            if lot_payload["lot_number"] == "AUTO":
                lot_payload["lot_number"] = self._generate_adhoc_lot_number(
                    lot_create.origin_type.value
                )

        try:
            db_lot = Lot(**lot_payload)
            self.db.add(db_lot)
            self.db.commit()
            self.db.refresh(db_lot)
        except IntegrityError as exc:
            self.db.rollback()
            # 重複キーエラーを検出してユーザーフレンドリーなメッセージを返す
            error_str = str(exc.orig) if exc.orig else str(exc)
            if (
                "uq_lots_number_product_warehouse" in error_str
                or "duplicate key" in error_str.lower()
            ):
                raise LotValidationError(
                    f"ロット番号「{lot_payload.get('lot_number', '')}」は既に存在します。別のロット番号を入力してください。"
                ) from exc
            raise LotDatabaseError("ロット作成時のDB整合性エラー", exc) from exc
        except SQLAlchemyError as exc:
            self.db.rollback()
            raise LotDatabaseError("ロット作成時のDBエラー", exc) from exc

        # Response Construction
        return self._build_lot_response(db_lot.id)

    def _generate_adhoc_lot_number(self, origin_type: str) -> str:
        """Generate lot number for non-order lots.

        Format: {PREFIX}-{YYYYMMDD}-{SEQUENCE}
        Example: SAF-20250304-0001, SMP-20250304-0001
        """
        from sqlalchemy import func

        prefix_map = {
            "forecast": "FCT",
            "sample": "SMP",
            "safety_stock": "SAF",
            "adhoc": "ADH",
        }
        prefix = prefix_map.get(origin_type, "ADH")
        today = date.today().strftime("%Y%m%d")

        # Get today's sequence count
        count = (
            self.db.query(func.count(Lot.id))
            .filter(Lot.lot_number.like(f"{prefix}-{today}-%"))
            .scalar()
        )
        sequence = (count or 0) + 1
        return f"{prefix}-{today}-{sequence:04d}"

    def _generate_temporary_lot_info(self) -> tuple[str, str]:
        """Generate temporary lot number and UUID key for provisional inbound.

        仮入庫対応:
        - lot_number が未確定の場合に呼び出される
        - UUID を発行し、その一部を lot_number に使用して衝突を完全回避
        - 形式: TMP-YYYYMMDD-XXXX (XXXX は UUID の先頭8文字)

        Returns:
            tuple[str, str]: (lot_number, temporary_lot_key)

        Example:
            ("TMP-20251213-a1b2c3d4", "a1b2c3d4-e5f6-7890-...")
        """
        import uuid

        # Generate UUID for unique identification
        temp_key = uuid.uuid4()
        temp_key_str = str(temp_key)

        # Use first 8 characters of UUID for readable lot number (衝突ゼロ保証)
        today = date.today().strftime("%Y%m%d")
        uuid_prefix = temp_key_str[:8]
        lot_number = f"TMP-{today}-{uuid_prefix}"

        return lot_number, temp_key_str

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

        db_lot.updated_at = utcnow()

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
        reserved_qty = get_reserved_quantity(self.db, lot_id)
        locked_qty = db_lot.locked_quantity or Decimal(0)
        available_qty = current_qty - reserved_qty - locked_qty

        if quantity_to_lock is None:
            quantity_to_lock = available_qty

        if quantity_to_lock < 0:
            raise LotValidationError("ロック数量は0以上である必要があります")

        if quantity_to_lock > available_qty:
            raise InsufficientLotStockError(lot_id, float(quantity_to_lock), float(available_qty))

        db_lot.locked_quantity = locked_qty + quantity_to_lock
        if lock_data.reason:
            db_lot.lock_reason = lock_data.reason

        db_lot.updated_at = utcnow()

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

        db_lot.updated_at = utcnow()
        self.db.commit()

        lot_view = self.db.query(VLotDetails).filter(VLotDetails.lot_id == lot_id).first()
        if not lot_view:
            return self._build_lot_response(lot_id)
        return LotResponse.model_validate(lot_view)

    def create_stock_movement(self, movement: StockMovementCreate) -> StockMovementResponse:
        """Create a stock movement (history) and update lot quantity.

        v2.3: ドメインイベント(StockChangedEvent)を発行するように拡張。
        """
        from app.domain.events import EventDispatcher, StockChangedEvent

        lot = None
        quantity_before = Decimal("0")

        if movement.lot_id is not None:
            lot = self.db.query(Lot).filter(Lot.id == movement.lot_id).first()
            if not lot:
                raise LotNotFoundError(movement.lot_id)
            quantity_before = lot.current_quantity or Decimal("0")

        db_movement = StockMovement(
            lot_id=movement.lot_id,
            transaction_type=movement.transaction_type,
            quantity_change=movement.quantity_change,
            quantity_after=movement.quantity_after,
            reference_type=movement.reference_type,
            reference_id=movement.reference_id,
        )

        self.db.add(db_movement)

        quantity_after = quantity_before
        if movement.lot_id and lot:
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
            lot.updated_at = utcnow()
            quantity_after = lot.current_quantity

            db_movement.quantity_after = lot.current_quantity

        self.db.commit()
        self.db.refresh(db_movement)

        # ドメインイベント発行
        if movement.lot_id:
            event = StockChangedEvent(
                lot_id=movement.lot_id,
                quantity_before=quantity_before,
                quantity_after=quantity_after,
                quantity_change=movement.quantity_change,
                reason=movement.reference_type or "",
            )
            EventDispatcher.queue(event)

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

        # LotResponseの必須フィールドをリレーションから取得（削除済みマスタ対応）
        product = db_lot.product
        warehouse = db_lot.warehouse
        supplier = db_lot.supplier

        # 削除済みフラグの判定（SoftDeleteMixinのis_soft_deletedプロパティを使用）
        product_deleted = (
            product.is_soft_deleted if product and hasattr(product, "is_soft_deleted") else False
        )
        warehouse_deleted = (
            warehouse.is_soft_deleted
            if warehouse and hasattr(warehouse, "is_soft_deleted")
            else False
        )
        supplier_deleted = (
            supplier.is_soft_deleted if supplier and hasattr(supplier, "is_soft_deleted") else False
        )

        # 削除済みマスタの場合はフォールバック値を設定
        product_name = (
            product.product_name
            if product and not product_deleted
            else "[削除済み製品]"
            if product_deleted
            else ""
        )
        product_code = product.maker_part_code if product else ""
        supplier_name = (
            supplier.supplier_name
            if supplier and not supplier_deleted
            else "[削除済み仕入先]"
            if supplier_deleted
            else ""
        )
        supplier_code = supplier.supplier_code if supplier else None
        warehouse_name = (
            warehouse.warehouse_name
            if warehouse and not warehouse_deleted
            else "[削除済み倉庫]"
            if warehouse_deleted
            else None
        )
        warehouse_code = warehouse.warehouse_code if warehouse else None

        return LotResponse(
            id=db_lot.id,
            lot_number=db_lot.lot_number,
            product_id=db_lot.product_id,
            warehouse_id=db_lot.warehouse_id,
            supplier_id=db_lot.supplier_id,
            expected_lot_id=db_lot.expected_lot_id,
            received_date=db_lot.received_date,
            expiry_date=db_lot.expiry_date,
            current_quantity=db_lot.current_quantity or Decimal("0"),
            allocated_quantity=Decimal("0"),  # Lotモデルにはないため固定値
            locked_quantity=db_lot.locked_quantity or Decimal("0"),
            unit=db_lot.unit,
            status=LotStatus(db_lot.status) if db_lot.status else LotStatus.ACTIVE,
            lock_reason=db_lot.lock_reason,
            inspection_status=db_lot.inspection_status,
            inspection_date=db_lot.inspection_date,
            inspection_cert_number=db_lot.inspection_cert_number,
            origin_type=LotOriginType(db_lot.origin_type)
            if db_lot.origin_type
            else LotOriginType.ADHOC,
            origin_reference=db_lot.origin_reference,
            temporary_lot_key=str(db_lot.temporary_lot_key) if db_lot.temporary_lot_key else None,
            product_name=product_name,
            product_code=product_code,
            supplier_name=supplier_name,
            supplier_code=supplier_code,
            warehouse_name=warehouse_name,
            warehouse_code=warehouse_code,
            last_updated=db_lot.updated_at,
            created_at=db_lot.created_at,
            updated_at=db_lot.updated_at,
            product_deleted=product_deleted,
            warehouse_deleted=warehouse_deleted,
            supplier_deleted=supplier_deleted,
        )
