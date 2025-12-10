# backend/app/repositories/allocation_repository.py
"""引当リポジトリ DBアクセスのみを責務とし、ビジネスロジックは含まない.

v2.3: lot_referenceベースに移行。allocations.lot_idは廃止。
"""

from datetime import datetime
from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.persistence.models import Allocation, Lot


class AllocationRepository:
    """引当リポジトリ（SQLAlchemy 2.0準拠）."""

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, allocation_id: int) -> Allocation | None:
        """IDで引当を取得.

        Args:
            allocation_id: 引当ID

        Returns:
            引当エンティティ（存在しない場合はNone）
        """
        stmt = (
            select(Allocation)
            .options(joinedload(Allocation.order_line))
            .where(Allocation.id == allocation_id)
        )
        return cast(Allocation | None, self.db.execute(stmt).scalar_one_or_none())

    def find_by_order_line_id(self, order_line_id: int) -> list[Allocation]:
        """受注明細IDで引当を取得.

        Args:
            order_line_id: 受注明細ID

        Returns:
            引当エンティティのリスト
        """
        stmt = (
            select(Allocation)
            .where(Allocation.order_line_id == order_line_id)
            .order_by(Allocation.created_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_active_by_lot_reference(self, lot_number: str) -> list[Allocation]:
        """ロット番号でアクティブな引当を取得.

        Args:
            lot_number: ロット番号

        Returns:
            アクティブな引当エンティティのリスト
        """
        stmt = (
            select(Allocation)
            .where(Allocation.lot_reference == lot_number, Allocation.status == "reserved")
            .order_by(Allocation.created_at)
        )
        return list(self.db.execute(stmt).scalars().all())

    def create(
        self, order_line_id: int, lot_reference: str, allocated_qty: float, status: str = "reserved"
    ) -> Allocation:
        """引当を作成.

        Args:
            order_line_id: 受注明細ID
            lot_reference: ロット番号
            allocated_qty: 引当数量
            status: ステータス（デフォルト: 'reserved'）

        Returns:
            作成された引当エンティティ
        """
        allocation = Allocation(
            order_line_id=order_line_id,
            lot_reference=lot_reference,
            allocated_quantity=allocated_qty,
            status=status,
            created_at=datetime.now(),
        )
        self.db.add(allocation)
        # NOTE: commitはservice層で行う
        return allocation

    def update_status(self, allocation: Allocation, new_status: str) -> None:
        """引当ステータスを更新.

        Args:
            allocation: 引当エンティティ
            new_status: 新しいステータス
        """
        allocation.status = new_status
        allocation.updated_at = datetime.now()
        # NOTE: commitはservice層で行う

    def delete(self, allocation: Allocation) -> None:
        """引当を削除.

        Args:
            allocation: 引当エンティティ
        """
        self.db.delete(allocation)
        # NOTE: commitはservice層で行う

    def get_lot(self, lot_id: int) -> Lot | None:
        """ロットを取得.

        v2.2: lot_current_stock の代わりに lots テーブルを直接参照。

        Args:
            lot_id: ロットID

        Returns:
            ロットエンティティ（存在しない場合はNone）
        """
        stmt = select(Lot).where(Lot.id == lot_id)
        return cast(Lot | None, self.db.execute(stmt).scalar_one_or_none())

    def update_lot_quantities(self, lot_id: int, quantity_delta: float) -> None:
        """ロット在庫数量を更新.

        v2.2: lots.current_quantity を直接更新。

        Args:
            lot_id: ロットID
            quantity_delta: 数量変動（正=増加、負=減少）

        Note:
            allocated_quantity の更新は別途行う必要があります。
            このメソッドは current_quantity のみを更新します。
        """
        lot = self.get_lot(lot_id)
        if lot:
            from decimal import Decimal

            lot.current_quantity += Decimal(str(quantity_delta))
            lot.updated_at = datetime.now()
        # NOTE: commitはservice層で行う

    def update_lot_allocated_quantity(self, lot_id: int, allocated_delta: float) -> None:
        """ロットの引当数量を更新.

        DEPRECATED: This method is deprecated. Use LotReservation instead.
        v2.3: allocated_quantity is now dynamically calculated from lot_reservations.

        Args:
            lot_id: ロットID
            allocated_delta: 引当数量変動（正=増加、負=減少）
        """
        import warnings

        warnings.warn(
            "update_lot_allocated_quantity is deprecated. Use LotReservation instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        # No-op: allocated_quantity is now calculated from lot_reservations
        pass
