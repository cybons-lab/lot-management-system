"""Lot reservation service for managing lot reservations.

This service provides CRUD operations for lot reservations as part of
the decoupling migration (Step 1). It operates independently of the
existing allocated_quantity-based logic.

See: docs/architecture/system_invariants.md
"""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING


if TYPE_CHECKING:
    from datetime import datetime

from sqlalchemy.orm import Session

from app.application.services.inventory import stock_calculation
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import (
    Lot,
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


if TYPE_CHECKING:
    pass


class ReservationInsufficientStockError(Exception):
    """Raised when there isn't enough available stock for a reservation."""

    def __init__(
        self, lot_id: int, requested: Decimal, available: Decimal, message: str | None = None
    ):
        self.lot_id = lot_id
        self.requested = requested
        self.available = available
        self.message = message or (
            f"Insufficient stock in lot {lot_id}: requested {requested}, available {available}"
        )
        super().__init__(self.message)


class ReservationNotFoundError(Exception):
    """Raised when a reservation is not found."""

    def __init__(self, reservation_id: int | str):
        self.reservation_id = reservation_id
        super().__init__(f"Reservation {reservation_id} not found")


class ReservationLotNotFoundError(Exception):
    """Raised when a lot is not found for reservation operations."""

    def __init__(self, lot_id: int):
        self.lot_id = lot_id
        super().__init__(f"Lot {lot_id} not found")


class LotReservationService:
    """Service for managing lot reservations.

    This service provides methods to create, release, and query lot
    reservations. It implements the reservation logic defined in
    system_invariants.md.

    Invariants:
    - All lot reservations go through this service
    - Only 'active' and 'confirmed' reservations affect available qty
    - Reservation quantity must be positive
    - Available qty cannot go negative
    """

    def __init__(self, db: Session):
        """Initialize the service with a database session.

        Args:
            db: SQLAlchemy session for database operations
        """
        self.db = db

    def reserve(
        self,
        lot_id: int,
        source_type: str | ReservationSourceType,
        source_id: int | None,
        quantity: Decimal,
        status: str | ReservationStatus = ReservationStatus.ACTIVE,
        expires_at: datetime | None = None,
    ) -> LotReservation:
        """Create a new reservation against a lot.

        This method validates that sufficient stock is available before
        creating the reservation. The available quantity is calculated
        dynamically based on current reservations.

        【設計意図】なぜこの順序で処理するのか:

        1. with_for_update()によるロック取得
           理由: 複数ユーザーの同時引当で在庫が重複割当されるのを防ぐ
           例: 営業A・営業Bが同時に最後の在庫を引当しようとした場合
           → 片方は待機し、もう片方の引当が完了してから利用可能数を再計算
           トレードオフ: ロック待機による遅延（通常は数ミリ秒程度）

        2. 在庫チェックをロック内で実行
           理由: ロック取得後に最新の利用可能数量を計算することで、
           TOCTOU（Time Of Check, Time Of Use）脆弱性を回避
           → チェック時点と予約作成時点で在庫状況が変わらないことを保証

        3. flush()のみでcommitしない
           理由: この処理は大きなトランザクションの一部として呼ばれることが多い
           例: 受注登録で「受注ヘッダ作成 → 明細作成 → 在庫引当」を1トランザクションで処理
           → 途中でcommitすると、後続処理でエラーが出ても引当だけ残ってしまう
           → 呼び出し側がcommit責任を持つ設計

        Args:
            lot_id: ID of the lot to reserve from
            source_type: Source of the reservation ('forecast', 'order', 'manual')
            source_id: ID of the source entity (order_line_id, etc.)
            quantity: Quantity to reserve (must be positive)
            status: Initial status of the reservation (default: 'active')
            expires_at: Expiration time for temporary reservations

        Returns:
            The created LotReservation

        Raises:
            ReservationLotNotFoundError: If the lot doesn't exist
            ReservationInsufficientStockError: If there isn't enough available stock
            ValueError: If quantity is not positive
        """
        if quantity <= 0:
            raise ValueError("Reservation quantity must be positive")

        # Normalize source_type to string
        if isinstance(source_type, ReservationSourceType):
            source_type = source_type.value

        # Normalize status to string
        if isinstance(status, ReservationStatus):
            status = status.value

        # Lock the lot row for update to prevent race conditions
        # 【重要】このロックにより在庫の重複割当を防ぐ
        lot = self.db.query(Lot).filter(Lot.id == lot_id).with_for_update().first()
        if not lot:
            raise ReservationLotNotFoundError(lot_id)

        # Calculate available quantity (dynamic calculation per invariants)
        # ロック取得後に計算することで、チェック時点と予約作成時点で在庫状況が同じであることを保証
        available = self._calculate_available_qty(lot_id)

        if available < quantity:
            raise ReservationInsufficientStockError(lot_id, quantity, available)

        # Create the reservation
        reservation = LotReservation(
            lot_id=lot_id,
            source_type=source_type,
            source_id=source_id,
            reserved_qty=quantity,
            status=status,
            expires_at=expires_at,
        )

        if status == ReservationStatus.CONFIRMED.value:
            reservation.confirmed_at = utcnow()

        self.db.add(reservation)
        self.db.flush()  # Get the ID without committing (caller manages transaction)

        return reservation

    def release(self, reservation_id: int) -> None:
        """Release a reservation.

        This marks the reservation as 'released' and records the release
        timestamp. The reservation is not deleted for audit purposes.

        【設計意図】なぜ削除せずにステータス変更のみなのか:

        1. 監査証跡の保持
           理由: 在庫予約の履歴を完全に保持することで、問題発生時の原因追跡が可能
           例: 「なぜあの時点で在庫不足だったのか？」という問い合わせに対応
           → 過去の予約・解放の履歴から、在庫の動きを完全に再現できる

        2. 在庫計算の正確性
           理由: RELEASEDステータスは利用可能数量の計算から除外される
           → 論理削除でも物理削除でも、在庫計算の結果は同じ
           → であれば、履歴を残せる論理削除の方が有益

        3. 誤操作からの保護
           理由: 物理削除だと、誤って解放した予約を復元できない
           → 論理削除なら、緊急時にステータスを戻すことも可能（運用判断）

        4. パフォーマンスへの影響
           検討事項: RELEASEDレコードが大量に蓄積するとクエリが遅くなる可能性
           対策: 定期的なアーカイブ処理（例: 1年以上前のRELEASEDを別テーブルへ移動）

        Args:
            reservation_id: ID of the reservation to release

        Raises:
            ReservationNotFoundError: If the reservation doesn't exist
        """
        reservation = (
            self.db.query(LotReservation).filter(LotReservation.id == reservation_id).first()
        )
        if not reservation:
            raise ReservationNotFoundError(reservation_id)

        reservation.status = ReservationStatus.RELEASED.value
        reservation.released_at = utcnow()
        self.db.flush()

    def confirm(self, reservation_id: int) -> LotReservation:
        """予約を確定する.

        Args:
            reservation_id: 予約ID

        Returns:
            LotReservation: 更新された予約

        Raises:
            ReservationNotFoundError: 予約が見つからない場合
        """
        reservation = self.db.get(LotReservation, reservation_id)
        if not reservation:
            raise ReservationNotFoundError(f"Reservation {reservation_id} not found")

        if reservation.status == ReservationStatus.CONFIRMED.value:
            return reservation

        reservation.status = ReservationStatus.CONFIRMED.value
        reservation.confirmed_at = utcnow()
        reservation.updated_at = utcnow()

        # 関連するLotの更新日時も更新
        if reservation.lot:
            reservation.lot.updated_at = utcnow()

        return reservation

    def transfer_reservation(
        self,
        reservation_id: int,
        new_source_type: ReservationSourceType,
        new_source_id: int,
        new_status: ReservationStatus | None = None,
    ) -> LotReservation:
        """予約を別のソースに振り替える（例: Forecast -> Order）.

        【設計意図】なぜ予約の振替機能が必要なのか:

        1. 予測需要から実受注への転換
           用途: 予測需要で仮押さえした在庫を、実受注確定時に正式な受注予約に切り替える
           理由: 予測で既に引き当てたロットをそのまま使うことで、
           顧客に一貫した納期を提示できる
           例:
           - 1月: 予測需要で「3月に100個必要」としてロットAを仮押さえ（FORECAST, id=1）
           - 2月: 実受注確定「3月に80個」→ 予約を振替（ORDER, id=456）
           → 改めてロット選定をやり直すより、既存予約を引き継ぐ方が効率的

        2. 受注間の予約振替
           用途: 顧客Aの受注を顧客Bに振り替える（稀なケース）
           理由: 優先度の高い顧客からの緊急依頼に対応
           → 既に引き当てたロットを別の受注に付け替える

        3. 在庫の二重引当を防ぐ
           理由: 新規予約を作成すると、同じ在庫を2回引き当ててしまう
           → 既存予約のsource情報だけを書き換えることで、在庫数量は変わらない

        トレードオフ:
        - 振替履歴が追いにくくなる可能性
           → lot_reservation_historyで変更履歴を記録することで対応

        Args:
            reservation_id: 予約ID
            new_source_type: 新しいソースタイプ
            new_source_id: 新しいソースID
            new_status: 新しいステータス（指定がない場合は維持）

        Returns:
            LotReservation: 更新された予約

        Raises:
            ReservationNotFoundError: 予約が見つからない場合
            ValueError: 振替不可能な状態の場合
        """
        reservation = self.db.get(LotReservation, reservation_id)
        if not reservation:
            raise ReservationNotFoundError(f"Reservation {reservation_id} not found")

        if reservation.status == ReservationStatus.RELEASED:
            raise ValueError(f"Cannot transfer released reservation {reservation_id}")

        reservation.source_type = new_source_type
        reservation.source_id = new_source_id

        if new_status:
            reservation.status = new_status
            if new_status == ReservationStatus.CONFIRMED and not reservation.confirmed_at:
                reservation.confirmed_at = utcnow()

        reservation.updated_at = utcnow()

        # 関連するLotの更新日時も更新
        if reservation.lot:
            reservation.lot.updated_at = utcnow()

        return reservation

    def list_by_lot(self, lot_id: int, active_only: bool = True) -> list[LotReservation]:
        """List reservations for a specific lot.

        Args:
            lot_id: ID of the lot
            active_only: If True, only return active/confirmed reservations

        Returns:
            List of reservations for the lot
        """
        query = self.db.query(LotReservation).filter(LotReservation.lot_id == lot_id)

        if active_only:
            query = query.filter(
                LotReservation.status.in_(
                    [
                        ReservationStatus.ACTIVE.value,
                        ReservationStatus.CONFIRMED.value,
                    ]
                )
            )

        return query.order_by(LotReservation.created_at.desc()).all()

    def list_by_source(
        self, source_type: str | ReservationSourceType, source_id: int
    ) -> list[LotReservation]:
        """List reservations by source.

        Args:
            source_type: Type of the source ('forecast', 'order', 'manual')
            source_id: ID of the source entity

        Returns:
            List of reservations for the source
        """
        if isinstance(source_type, ReservationSourceType):
            source_type = source_type.value

        return (
            self.db.query(LotReservation)
            .filter(
                LotReservation.source_type == source_type,
                LotReservation.source_id == source_id,
            )
            .order_by(LotReservation.created_at.desc())
            .all()
        )

    def get_reserved_quantity(self, lot_id: int) -> Decimal:
        """Get the total reserved quantity for a lot.

        Only includes 'active' and 'confirmed' reservations as per
        system_invariants.md.

        Args:
            lot_id: ID of the lot

        Returns:
            Total reserved quantity
        """
        return stock_calculation.get_reserved_quantity(self.db, lot_id)

    def get_available_quantity(self, lot_id: int) -> Decimal:
        """Get the available quantity for a lot.

        Available = current_quantity - reserved_quantity

        Args:
            lot_id: ID of the lot

        Returns:
            Available quantity

        Raises:
            ReservationLotNotFoundError: If the lot doesn't exist
        """
        lot = self.db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            raise ReservationLotNotFoundError(lot_id)

        return self._calculate_available_qty(lot_id)

    def _calculate_available_qty(self, lot_id: int) -> Decimal:
        """Calculate available quantity for a lot.

        Available = current_quantity - sum(active/confirmed reservations)

        This follows the dynamic calculation principle from
        system_invariants.md.

        Args:
            lot_id: ID of the lot

        Returns:
            Available quantity
        """
        lot = self.db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            return Decimal("0")

        return stock_calculation.get_available_quantity(self.db, lot)

    def get_by_id(self, reservation_id: int) -> LotReservation | None:
        """Get a reservation by ID.

        Args:
            reservation_id: ID of the reservation

        Returns:
            The reservation if found, None otherwise
        """
        return self.db.query(LotReservation).filter(LotReservation.id == reservation_id).first()

    def update_quantity(self, reservation_id: int, new_quantity: Decimal) -> LotReservation:
        """Update the quantity of a reservation.

        Args:
            reservation_id: ID of the reservation
            new_quantity: New quantity (must be positive)

        Returns:
            The updated reservation

        Raises:
            ReservationNotFoundError: If the reservation doesn't exist
            ValueError: If new_quantity is not positive
            ReservationInsufficientStockError: If there isn't enough stock for increased qty
        """
        if new_quantity <= 0:
            raise ValueError("Reservation quantity must be positive")

        reservation = (
            self.db.query(LotReservation).filter(LotReservation.id == reservation_id).first()
        )
        if not reservation:
            raise ReservationNotFoundError(reservation_id)

        # If increasing quantity, check availability
        if new_quantity > reservation.reserved_qty:
            additional = new_quantity - reservation.reserved_qty
            available = self._calculate_available_qty(reservation.lot_id)
            if available < additional:
                raise ReservationInsufficientStockError(reservation.lot_id, additional, available)

        reservation.reserved_qty = new_quantity
        self.db.flush()

        return reservation
