# backend/app/repositories/allocation_repository.py
"""予約リポジトリ - P3: LotReservation ベースに完全移行.

v3.0: Allocation を廃止し、LotReservation のみを使用。
"""

from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import Lot
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


class ReservationRepository:
    """予約リポジトリ（P3: LotReservation ベース）."""

    def __init__(self, db: Session, enable_history: bool = True):
        self.db = db
        self._enable_history = enable_history
        self._history_service = None

    @property
    def history_service(self):
        """Lazy load history service."""
        if self._history_service is None and self._enable_history:
            from app.application.services.inventory.lot_reservation_history_service import (
                LotReservationHistoryService,
            )

            self._history_service = LotReservationHistoryService(self.db)
        return self._history_service

    def find_by_id(self, reservation_id: int) -> LotReservation | None:
        """IDで予約を取得.

        Args:
            reservation_id: 予約ID

        Returns:
            予約エンティティ（存在しない場合はNone）
        """
        stmt = (
            select(LotReservation)
            .options(joinedload(LotReservation.lot))
            .where(LotReservation.id == reservation_id)
        )
        return cast(LotReservation | None, self.db.execute(stmt).scalar_one_or_none())

    def find_by_order_line_id(self, order_line_id: int) -> list[LotReservation]:
        """受注明細IDで予約を取得.

        Args:
            order_line_id: 受注明細ID

        Returns:
            予約エンティティのリスト
        """
        stmt = (
            select(LotReservation)
            .where(
                LotReservation.source_type == ReservationSourceType.ORDER,
                LotReservation.source_id == order_line_id,
            )
            .order_by(LotReservation.created_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_active_by_lot_id(self, lot_id: int) -> list[LotReservation]:
        """ロットIDでアクティブな予約を取得.

        Args:
            lot_id: ロットID

        Returns:
            アクティブな予約エンティティのリスト
        """
        stmt = (
            select(LotReservation)
            .where(
                LotReservation.lot_id == lot_id,
                LotReservation.status.in_([ReservationStatus.ACTIVE, ReservationStatus.CONFIRMED]),
            )
            .order_by(LotReservation.created_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_active_by_lot_number(self, lot_number: str) -> list[LotReservation]:
        """ロット番号でアクティブな予約を取得.

        Args:
            lot_number: ロット番号

        Returns:
            アクティブな予約エンティティのリスト
        """
        lot = self.db.execute(select(Lot).where(Lot.lot_number == lot_number)).scalar_one_or_none()
        if not lot:
            return []
        return self.find_active_by_lot_id(lot.id)

    def create(
        self,
        lot_id: int,
        source_type: ReservationSourceType,
        source_id: int,
        reserved_qty: float,
        status: ReservationStatus = ReservationStatus.ACTIVE,
    ) -> LotReservation:
        """予約を作成.

        Args:
            lot_id: ロットID
            source_type: ソースタイプ (ORDER, FORECAST, MANUAL)
            source_id: ソースID（order_line_id 等）
            reserved_qty: 予約数量
            status: ステータス（デフォルト: ACTIVE）

        Returns:
            作成された予約エンティティ
        """
        from decimal import Decimal

        reservation = LotReservation(
            lot_id=lot_id,
            source_type=source_type,
            source_id=source_id,
            reserved_qty=Decimal(str(reserved_qty)),
            status=status,
            created_at=utcnow(),
        )
        self.db.add(reservation)
        self.db.flush()  # Get ID for history record

        # Record history
        if self.history_service:
            self.history_service.record_insert(
                reservation=reservation,
                change_reason=f"Created via {source_type.value}",
            )

        return reservation

    def update_status(
        self,
        reservation: LotReservation,
        new_status: ReservationStatus,
        changed_by: str | None = None,
        change_reason: str | None = None,
    ) -> None:
        """予約ステータスを更新.

        Args:
            reservation: 予約エンティティ
            new_status: 新しいステータス
            changed_by: 変更者（任意）
            change_reason: 変更理由（任意）
        """
        old_status = reservation.status
        reservation.status = new_status
        reservation.updated_at = utcnow()

        if new_status == ReservationStatus.CONFIRMED:
            reservation.confirmed_at = utcnow()
        elif new_status == ReservationStatus.RELEASED:
            reservation.released_at = utcnow()

        # Record history
        if self.history_service:
            self.history_service.record_status_change(
                reservation=reservation,
                old_status=old_status,
                changed_by=changed_by,
                change_reason=change_reason,
            )

    def release(self, reservation: LotReservation) -> None:
        """予約を解放（論理削除）.

        Args:
            reservation: 予約エンティティ
        """
        self.update_status(reservation, ReservationStatus.RELEASED)

    def get_lot(self, lot_id: int) -> Lot | None:
        """ロットを取得.

        Args:
            lot_id: ロットID

        Returns:
            ロットエンティティ（存在しない場合はNone）
        """
        stmt = select(Lot).where(Lot.id == lot_id)
        return cast(Lot | None, self.db.execute(stmt).scalar_one_or_none())


# Backward compatibility alias
AllocationRepository = ReservationRepository
