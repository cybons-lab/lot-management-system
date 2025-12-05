# backend/app/services/allocation_service.py
"""
引当サービス
ユースケース実装とトランザクション管理を担当.

v2.2: lot_current_stock 依存を削除。Lot モデルを直接使用。
"""

from typing import cast

from sqlalchemy.orm import Session

from app.domain.allocation import (
    AllocationStateMachine,
    InsufficientStockError,
    NotFoundError,
    RoundingPolicy,
)
from app.models import Allocation, StockMovement, StockMovementReason, Warehouse
from app.repositories.allocation_repository import AllocationRepository


class AllocationService:
    """引当サービス."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = AllocationRepository(db)

    def _resolve_warehouse_id(self, lot) -> int:
        if lot:
            warehouse_id = getattr(lot, "warehouse_id", None)
            if warehouse_id is not None:
                return cast(int, warehouse_id)
            warehouse = getattr(lot, "warehouse", None)
            if warehouse:
                return cast(int, warehouse.id)

        fallback = cast(Warehouse | None, self.db.query(Warehouse).first())
        if not fallback:
            raise NotFoundError("Warehouse", "default")
        return cast(int, fallback.id)

    def allocate_lot(
        self, order_line_id: int, lot_id: int, allocate_qty: float
    ) -> tuple[Allocation, StockMovement]:
        """
        ロットを引当.

        v2.2: Lot モデルから直接在庫を確認。

        Args:
            order_line_id: 受注明細ID
            lot_id: ロットID
            allocate_qty: 引当数量

        Returns:
            (引当エンティティ, 在庫変動エンティティ)のタプル

        Raises:
            InsufficientStockError: 在庫不足の場合
            NotFoundError: ロットが存在しない場合
        """
        # 数量を丸める
        allocate_qty = RoundingPolicy.round_allocation_qty(allocate_qty)

        # ロット在庫確認
        lot = self.repository.get_lot(lot_id)
        if not lot:
            raise NotFoundError("Lot", lot_id)

        # 利用可能在庫 = 現在在庫 - 引当済み在庫
        available_quantity = lot.current_quantity - lot.allocated_quantity
        if available_quantity < allocate_qty:
            raise InsufficientStockError(
                lot_id=lot_id,
                required=allocate_qty,
                available=available_quantity,  # type: ignore[arg-type]
            )

        # トランザクション開始
        with self.db.begin_nested():
            # 1. 引当レコード作成
            allocation = self.repository.create(
                order_line_id=order_line_id,
                lot_id=lot_id,
                allocated_qty=allocate_qty,
                status="reserved",
            )
            self.db.flush()  # IDを取得するためflush

            # 2. 在庫変動記録
            movement = StockMovement(
                product_id=lot.product_id,
                warehouse_id=self._resolve_warehouse_id(lot),
                lot_id=lot_id,
                quantity_delta=-allocate_qty,
                reason=StockMovementReason.ALLOCATION_HOLD,
                source_table="allocations",
                source_id=allocation.id,
                batch_id=f"allocate_{allocation.id}",
                created_by="system",
            )
            self.db.add(movement)

            # 3. ロットの引当数量を更新
            self.repository.update_lot_allocated_quantity(lot_id, allocate_qty)

        return allocation, movement

    def cancel_allocation(self, allocation_id: int) -> tuple[Allocation, StockMovement]:
        """
        引当を取り消し.

        v2.2: Lot モデルの allocated_quantity を直接更新。

        Args:
            allocation_id: 引当ID

        Returns:
            (引当エンティティ, 在庫変動エンティティ)のタプル

        Raises:
            NotFoundError: 引当が存在しない場合
            InvalidTransitionError: 状態遷移が不正な場合
        """
        # 引当取得
        allocation = self.repository.find_by_id(allocation_id)
        if not allocation:
            raise NotFoundError("Allocation", allocation_id)

        # 状態遷移チェック
        AllocationStateMachine.validate_transition(allocation.status, "cancelled")

        # トランザクション開始
        with self.db.begin_nested():
            # 1. 在庫変動記録（引当数量を戻す）
            lot_ref = allocation.lot
            movement = StockMovement(
                product_id=lot_ref.product_id if lot_ref else None,
                warehouse_id=self._resolve_warehouse_id(lot_ref),
                lot_id=allocation.lot_id,
                quantity_delta=allocation.allocated_quantity,
                reason=StockMovementReason.ALLOCATION_RELEASE,
                source_table="allocations",
                source_id=allocation.id,
                batch_id=f"cancel_allocation_{allocation_id}",
                created_by="system",
            )
            self.db.add(movement)

            # 2. ロットの引当数量を解放
            if allocation.lot_id:
                self.repository.update_lot_allocated_quantity(
                    allocation.lot_id,
                    float(-allocation.allocated_quantity),
                )

            # 3. 引当ステータス更新
            self.repository.update_status(allocation, "cancelled")

        return allocation, movement

    def get_allocations_by_order_line(self, order_line_id: int) -> list[Allocation]:
        """
        受注明細の引当を取得.

        Args:
            order_line_id: 受注明細ID

        Returns:
            引当エンティティのリスト
        """
        return self.repository.find_by_order_line_id(order_line_id)

    def get_allocation(self, allocation_id: int) -> Allocation:
        """
        引当を取得.

        Args:
            allocation_id: 引当ID

        Returns:
            引当エンティティ

        Raises:
            NotFoundError: 引当が存在しない場合
        """
        allocation = self.repository.find_by_id(allocation_id)
        if not allocation:
            raise NotFoundError("Allocation", allocation_id)
        return allocation
