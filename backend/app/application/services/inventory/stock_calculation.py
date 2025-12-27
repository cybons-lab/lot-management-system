"""Stock calculation helpers using lot_reservations.

This module provides helper functions to calculate available stock dynamically
from lot_reservations instead of relying on the deprecated allocated_quantity column.
"""

from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Lot
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationStatus,
)


def get_confirmed_reserved_quantity(db: Session, lot_id: int) -> Decimal:
    """Get total CONFIRMED reserved quantity for a lot from lot_reservations.

    Only confirmed reservations affect Available Qty (per §1.2 invariant).
    Provisional (ACTIVE) reservations do NOT reduce Available Qty.
    """
    result = (
        db.query(func.coalesce(func.sum(LotReservation.reserved_qty), Decimal(0)))
        .filter(
            LotReservation.lot_id == lot_id,
            LotReservation.status == ReservationStatus.CONFIRMED,
        )
        .scalar()
    )
    return Decimal(result) if result else Decimal(0)


def get_provisional_quantity(db: Session, lot_id: int) -> Decimal:
    """Get total provisional (ACTIVE) reserved quantity for a lot.

    This is for UI display purposes only. Provisional reservations
    do NOT affect Available Qty calculations.
    """
    result = (
        db.query(func.coalesce(func.sum(LotReservation.reserved_qty), Decimal(0)))
        .filter(
            LotReservation.lot_id == lot_id,
            LotReservation.status == ReservationStatus.ACTIVE,
        )
        .scalar()
    )
    return Decimal(result) if result else Decimal(0)


def get_reserved_quantity(db: Session, lot_id: int) -> Decimal:
    """Get total reserved quantity for a lot (Confirmed ONLY).

    Used for Reservation Validation (Loose availability).
    Calculates `current - confirmed - locked`.

    【重要な設計判断】なぜProvisional（ACTIVE）を除外するのか:

    理由1: 柔軟な受注対応を可能にする
    - ACTIVE状態は「社内では確定だが、SAP未登録」の仮予約
    - 物理在庫が不足していても、緊急受注を仮押さえしたいケースがある
    - 例: 「納期調整が必要だが、とりあえず受注だけ受け付ける」

    理由2: 過剰予約（オーバーブッキング）の許容
    - ビジネス要件: 在庫不足でも受注を受け付け、後で調達・調整する運用
    - 航空業界のオーバーブッキングと同様の考え方
    - 実際の出荷時までに在庫が補充される見込みがあれば問題ない

    理由3: システム運用の安定性
    - SAP登録は外部システムとの連携のため、即座に完了しない
    - ACTIVE状態の予約が大量にあっても、利用可能数量計算に影響させない
    - → 新規受注の可否判定がSAP連携の遅延に左右されない

    トレードオフ:
    - 実在庫を超える予約が可能 → 出荷時に在庫不足が判明するリスク
    - → 運用でカバー: 定期的な在庫確認、発注点管理、緊急調達体制

    Note: Active (Provisional) reservations are EXCLUDED to allow overbooking/provisional
    reservations even if stock is insufficient, per business requirement.
    """
    return get_confirmed_reserved_quantity(db, lot_id)


def get_available_quantity(db: Session, lot: Lot) -> Decimal:
    """Calculate available quantity for a lot.

    available = current_quantity - reserved_quantity - locked_quantity
    """
    reserved = get_reserved_quantity(db, lot.id)
    locked = lot.locked_quantity or Decimal(0)
    current = lot.current_quantity or Decimal(0)
    return current - reserved - locked


def get_available_quantity_by_id(db: Session, lot_id: int) -> Decimal:
    """Calculate available quantity for a lot by ID.

    available = current_quantity - reserved_quantity - locked_quantity
    """
    lot = db.query(Lot).filter(Lot.id == lot_id).first()
    if not lot:
        return Decimal(0)
    return get_available_quantity(db, lot)


def get_allocatable_quantity(db: Session, lot: Lot) -> Decimal:
    """Calculate allocatable quantity (excluding locked).

    allocatable = current_quantity - reserved_quantity
    Used for allocation where locked stock might still be considered.
    """
    reserved = get_reserved_quantity(db, lot.id)
    current = lot.current_quantity or Decimal(0)
    return current - reserved


# Subquery for use in SQLAlchemy queries
def reserved_quantity_subquery(db: Session):
    """Create a subquery that returns reserved_qty per lot_id.

    Usage in query:
        reserved_subq = reserved_quantity_subquery(db)
        query = (
            db.query(Lot, func.coalesce(reserved_subq.c.reserved_qty, 0))
            .outerjoin(reserved_subq, Lot.id == reserved_subq.c.lot_id)
        )
    """
    return (
        db.query(
            LotReservation.lot_id.label("lot_id"),
            func.sum(LotReservation.reserved_qty).label("reserved_qty"),
        )
        .filter(LotReservation.status == ReservationStatus.CONFIRMED)
        .group_by(LotReservation.lot_id)
        .subquery()
    )
