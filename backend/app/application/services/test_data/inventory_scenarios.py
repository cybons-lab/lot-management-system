"""在庫シナリオテストデータジェネレーター。."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Integer, Numeric, String, Text, inspect
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import (
    LotMaster,
    LotReceipt,
    LotReservation,
    Product,
    ProductWarehouse,
    Supplier,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_reservations_model import ReservationStatus


@dataclass(frozen=True)
class InventoryScenario:
    key: str
    description: str
    received_qty: Decimal
    consumed_qty: Decimal
    locked_qty: Decimal
    status: str
    lock_reason: str | None
    allocation_qty: Decimal | None
    reservation_qty: Decimal | None


SCENARIOS: list[InventoryScenario] = [
    InventoryScenario(
        key="P1",
        description="基本的な在庫あり",
        received_qty=Decimal("100"),
        consumed_qty=Decimal("0"),
        locked_qty=Decimal("0"),
        status="active",
        lock_reason=None,
        allocation_qty=None,
        reservation_qty=None,
    ),
    InventoryScenario(
        key="P2",
        description="一部引当済み",
        received_qty=Decimal("100"),
        consumed_qty=Decimal("0"),
        locked_qty=Decimal("0"),
        status="active",
        lock_reason=None,
        allocation_qty=Decimal("30"),
        reservation_qty=None,
    ),
    InventoryScenario(
        key="P3",
        description="一部ロック中",
        received_qty=Decimal("100"),
        consumed_qty=Decimal("0"),
        locked_qty=Decimal("40"),
        status="active",
        lock_reason="品質検査中",
        allocation_qty=None,
        reservation_qty=None,
    ),
    InventoryScenario(
        key="P4",
        description="確定引当 + ロック",
        received_qty=Decimal("100"),
        consumed_qty=Decimal("0"),
        locked_qty=Decimal("20"),
        status="active",
        lock_reason="出荷準備中",
        allocation_qty=Decimal("30"),
        reservation_qty=None,
    ),
    InventoryScenario(
        key="P5",
        description="予約（未確定）あり",
        received_qty=Decimal("100"),
        consumed_qty=Decimal("0"),
        locked_qty=Decimal("0"),
        status="active",
        lock_reason=None,
        allocation_qty=None,
        reservation_qty=Decimal("25"),
    ),
    InventoryScenario(
        key="P6",
        description="全て引当済み",
        received_qty=Decimal("100"),
        consumed_qty=Decimal("0"),
        locked_qty=Decimal("0"),
        status="active",
        lock_reason=None,
        allocation_qty=Decimal("100"),
        reservation_qty=None,
    ),
    InventoryScenario(
        key="P7",
        description="在庫枯渇",
        received_qty=Decimal("100"),
        consumed_qty=Decimal("100"),
        locked_qty=Decimal("0"),
        status="depleted",
        lock_reason=None,
        allocation_qty=None,
        reservation_qty=None,
    ),
    InventoryScenario(
        key="P8",
        description="複雑なケース",
        received_qty=Decimal("200"),
        consumed_qty=Decimal("0"),
        locked_qty=Decimal("40"),
        status="active",
        lock_reason="品質検査中",
        allocation_qty=Decimal("80"),
        reservation_qty=Decimal("30"),
    ),
]


def _default_value_for_column(column) -> object:
    if isinstance(column.type, String | Text):
        return "test"
    if isinstance(column.type, Boolean):
        return False
    if isinstance(column.type, Date):
        return date.today()
    if isinstance(column.type, DateTime):
        return utcnow()
    if isinstance(column.type, Numeric):
        return Decimal("0")
    if isinstance(column.type, BigInteger | Integer):
        return 0
    return None


def _set_required_fields(instance, values: dict[str, object]) -> None:
    for column in instance.__table__.columns:
        if column.name in values:
            setattr(instance, column.name, values[column.name])
            continue
        if column.primary_key and column.autoincrement:
            continue
        if getattr(instance, column.name, None) is not None:
            continue
        if column.nullable is False and column.default is None and column.server_default is None:
            setattr(instance, column.name, _default_value_for_column(column))


def _resolve_outbound_models(db: Session):
    """テーブルが存在する場合に出庫関連モデルを解決します。存在しない場合はNoneを返します。.




    Returns:
        (OutboundInstruction, OutboundAllocation) のタプル、またはテーブルが存在しない場合は (None, None)。
    """
    engine = db.get_bind()
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    missing = {
        name for name in ("outbound_instructions", "outbound_allocations") if name not in tables
    }
    if missing:
        # テーブルが存在しない - 出庫機能が未実装の場合は想定内
        return None, None

    base = automap_base()
    base.prepare(autoload_with=engine)
    return base.classes.outbound_instructions, base.classes.outbound_allocations


def _get_or_create_warehouse(db: Session) -> Warehouse:
    warehouse = db.query(Warehouse).filter(Warehouse.warehouse_code == "TEST-WH-INV").first()
    if warehouse:
        return warehouse

    warehouse = Warehouse(
        warehouse_code="TEST-WH-INV",
        warehouse_name="Test Warehouse (Inventory Scenarios)",
        warehouse_type="internal",
        short_name="InvTestWH",
    )
    db.add(warehouse)
    db.flush()
    return warehouse


def _get_or_create_supplier(db: Session) -> Supplier:
    supplier = db.query(Supplier).filter(Supplier.supplier_code == "TEST-SUP-INV").first()
    if supplier:
        return supplier

    supplier = Supplier(
        supplier_code="TEST-SUP-INV",
        supplier_name="Test Supplier (Inventory Scenarios)",
        short_name="InvTestSup",
    )
    db.add(supplier)
    db.flush()
    return supplier


def _get_or_create_product(db: Session, scenario: InventoryScenario) -> Product:
    maker_part_code = f"TEST-INV-{scenario.key}"
    product = db.query(Product).filter(Product.maker_part_no == maker_part_code).first()
    if product:
        return product

    product = Product(
        maker_part_code=maker_part_code,
        product_name=f"Inventory Scenario {scenario.key}",
        base_unit="PCS",
        internal_unit="PCS",
        external_unit="PCS",
        qty_per_internal_unit=Decimal("1"),
    )
    db.add(product)
    db.flush()
    return product


def _get_or_create_lot_master(
    db: Session,
    product: Product,
    supplier: Supplier,
    scenario: InventoryScenario,
) -> LotMaster:
    lot_number = f"TEST-INV-LOT-{scenario.key}"
    lot_master = (
        db.query(LotMaster)
        .filter(LotMaster.lot_number == lot_number, LotMaster.product_group_id == product.id)
        .first()
    )
    if lot_master:
        return lot_master

    lot_master = LotMaster(
        lot_number=lot_number,
        product_group_id=product.id,
        supplier_id=supplier.id,
        first_receipt_date=date.today(),
        latest_expiry_date=date.today() + timedelta(days=365),
    )
    db.add(lot_master)
    db.flush()
    return lot_master


def _ensure_product_warehouse(db: Session, product: Product, warehouse: Warehouse) -> None:
    exists = (
        db.query(ProductWarehouse)
        .filter(
            ProductWarehouse.product_group_id == product.id,
            ProductWarehouse.warehouse_id == warehouse.id,
        )
        .first()
    )
    if not exists:
        db.add(
            ProductWarehouse(product_group_id=product.id, warehouse_id=warehouse.id, is_active=True)
        )


def _upsert_lot_receipt(
    db: Session,
    lot_master: LotMaster,
    product: Product,
    warehouse: Warehouse,
    supplier: Supplier,
    scenario: InventoryScenario,
) -> LotReceipt:
    lot = (
        db.query(LotReceipt)
        .filter(
            LotReceipt.product_group_id == product.id,
            LotReceipt.origin_reference == f"inventory-scenario-{scenario.key}",
        )
        .first()
    )
    if not lot:
        lot = LotReceipt(
            lot_master_id=lot_master.id,
            product_group_id=product.id,
            warehouse_id=warehouse.id,
            supplier_id=supplier.id,
            received_date=date.today(),
            expiry_date=date.today() + timedelta(days=365),
            received_quantity=scenario.received_qty,
            consumed_quantity=scenario.consumed_qty,
            locked_quantity=scenario.locked_qty,
            status=scenario.status,
            lock_reason=scenario.lock_reason,
            unit=product.internal_unit,
            origin_type="adhoc",
            origin_reference=f"inventory-scenario-{scenario.key}",
        )
        db.add(lot)
        db.flush()
        return lot

    lot.lot_master_id = lot_master.id
    lot.product_group_id = product.id
    lot.warehouse_id = warehouse.id
    lot.supplier_id = supplier.id
    lot.received_date = date.today()
    lot.expiry_date = date.today() + timedelta(days=365)
    lot.received_quantity = scenario.received_qty
    lot.consumed_quantity = scenario.consumed_qty
    lot.locked_quantity = scenario.locked_qty
    lot.status = scenario.status
    lot.lock_reason = scenario.lock_reason
    lot.unit = product.internal_unit
    lot.origin_type = "adhoc"
    lot.origin_reference = f"inventory-scenario-{scenario.key}"
    db.flush()
    return lot


def _clear_existing_reservations(db: Session, lot_id: int) -> None:
    db.query(LotReservation).filter(LotReservation.lot_id == lot_id).delete()


def _clear_existing_allocations(db: Session, OutboundAllocation, lot_id: int) -> None:
    if OutboundAllocation is None:
        return
    db.query(OutboundAllocation).filter(OutboundAllocation.lot_id == lot_id).delete()


def _create_reservation(
    db: Session,
    lot_id: int,
    quantity: Decimal,
    status: ReservationStatus,
    source_id: int,
) -> LotReservation:
    reservation = LotReservation(
        lot_id=lot_id,
        reserved_qty=quantity,
        status=status.value if isinstance(status, ReservationStatus) else status,
        source_type="order",
        source_id=source_id,
    )
    db.add(reservation)
    return reservation


def _create_outbound_allocation(
    db: Session,
    OutboundInstruction,
    OutboundAllocation,
    lot_id: int,
    quantity: Decimal,
    scenario: InventoryScenario,
) -> None:
    if OutboundInstruction is None or OutboundAllocation is None:
        # 出庫テーブルが存在しない - 引当作成をスキップ
        return

    instruction = OutboundInstruction()
    _set_required_fields(
        instruction,
        {
            "shipping_date": date.today(),
            "status": "allocated",
        },
    )
    db.add(instruction)
    db.flush()

    allocation = OutboundAllocation()
    _set_required_fields(
        allocation,
        {
            "outbound_instruction_id": instruction.id,
            "lot_id": lot_id,
            "allocated_quantity": quantity,
            "note": f"inventory-scenario-{scenario.key}",
        },
    )
    db.add(allocation)


def generate_inventory_scenarios(db: Session, show_summary: bool = False) -> None:
    outbound_instruction_model, outbound_allocation_model = _resolve_outbound_models(db)

    warehouse = _get_or_create_warehouse(db)
    supplier = _get_or_create_supplier(db)

    for index, scenario in enumerate(SCENARIOS, start=1):
        product = _get_or_create_product(db, scenario)
        lot_master = _get_or_create_lot_master(db, product, supplier, scenario)
        _ensure_product_warehouse(db, product, warehouse)
        lot = _upsert_lot_receipt(db, lot_master, product, warehouse, supplier, scenario)

        _clear_existing_reservations(db, lot.id)
        _clear_existing_allocations(db, outbound_allocation_model, lot.id)

        if scenario.allocation_qty:
            _create_outbound_allocation(
                db,
                outbound_instruction_model,
                outbound_allocation_model,
                lot.id,
                scenario.allocation_qty,
                scenario,
            )
            _create_reservation(
                db,
                lot.id,
                scenario.allocation_qty,
                ReservationStatus.CONFIRMED,
                source_id=1000 + index,
            )

        if scenario.reservation_qty:
            _create_reservation(
                db,
                lot.id,
                scenario.reservation_qty,
                ReservationStatus.ACTIVE,
                source_id=2000 + index,
            )

    db.commit()

    if show_summary:
        _print_verification_summary(db)


def _print_verification_summary(db: Session) -> None:
    print("\n[INFO] Inventory scenario summary:")
    for scenario in SCENARIOS:
        lot = (
            db.query(LotReceipt)
            .filter(LotReceipt.origin_reference == f"inventory-scenario-{scenario.key}")
            .first()
        )
        if not lot:
            print(f"  - {scenario.key}: lot not found")
            continue
        confirmed_reserved = (
            db.query(LotReservation)
            .filter(
                LotReservation.lot_id == lot.id,
                LotReservation.status == ReservationStatus.CONFIRMED,
            )
            .with_entities(LotReservation.reserved_qty)
            .all()
        )
        provisional_reserved = (
            db.query(LotReservation)
            .filter(
                LotReservation.lot_id == lot.id,
                LotReservation.status == ReservationStatus.ACTIVE,
            )
            .with_entities(LotReservation.reserved_qty)
            .all()
        )
        confirmed_total = sum((row[0] for row in confirmed_reserved), Decimal("0"))
        provisional_total = sum((row[0] for row in provisional_reserved), Decimal("0"))
        available = lot.received_quantity - confirmed_total - lot.locked_quantity
        print(
            f"  - {scenario.key}: received={lot.received_quantity}, confirmed={confirmed_total}, provisional={provisional_total}, "
            f"locked={lot.locked_quantity}, available={available}"
        )
