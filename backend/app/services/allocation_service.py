# backend/app/services/allocation_service.py
"""
引当サービス
ユースケース実装とトランザクション管理を担当
"""

from typing import List, Tuple

from sqlalchemy.orm import Session

from app.domain.allocation import (
    AllocationStateMachine,
    InsufficientStockError,
    InvalidTransitionError,
    NotFoundError,
    RoundingPolicy,
)
from app.models import Allocation, StockMovement, StockMovementReason
from app.repositories.allocation_repository import AllocationRepository


class AllocationService:
    """引当サービス"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repository = AllocationRepository(db)
    
    def allocate_lot(
        self,
        order_line_id: int,
        lot_id: int,
        allocate_qty: float
    ) -> Tuple[Allocation, StockMovement]:
        """
        ロットを引当
        
        Args:
            order_line_id: 受注明細ID
            lot_id: ロットID
            allocate_qty: 引当数量
            
        Returns:
            (引当エンティティ, 在庫変動エンティティ)のタプル
            
        Raises:
            InsufficientStockError: 在庫不足の場合
        """
        # 数量を丸める
        allocate_qty = RoundingPolicy.round_allocation_qty(allocate_qty)
        
        # 在庫確認
        current_stock = self.repository.get_lot_current_stock(lot_id)
        if not current_stock:
            raise NotFoundError("LotCurrentStock", lot_id)
        
        if current_stock.current_quantity < allocate_qty:
            raise InsufficientStockError(
                lot_id=lot_id,
                required=allocate_qty,
                available=current_stock.current_quantity
            )
        
        # トランザクション開始
        with self.db.begin_nested():
            # 1. 引当レコード作成
            allocation = self.repository.create(
                order_line_id=order_line_id,
                lot_id=lot_id,
                allocated_qty=allocate_qty,
                status="active"
            )
            self.db.flush()  # IDを取得するためflush
            
            # 2. 在庫変動記録
            movement = StockMovement(
                product_id=current_stock.lot.product_code if hasattr(current_stock, 'lot') else None,
                warehouse_id=current_stock.lot.warehouse_code if hasattr(current_stock, 'lot') else None,
                lot_id=lot_id,
                quantity_delta=-allocate_qty,
                reason=StockMovementReason.ALLOCATION,
                source_table="allocations",
                source_id=allocation.id,
                batch_id=f"allocate_{allocation.id}",
                created_by="system"
            )
            self.db.add(movement)
            
            # 3. 現在在庫更新
            self.repository.update_lot_current_stock(lot_id, -allocate_qty)
        
        return allocation, movement
    
    def cancel_allocation(self, allocation_id: int) -> Tuple[Allocation, StockMovement]:
        """
        引当を取り消し
        
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
            movement = StockMovement(
                product_id=allocation.lot.product_code if allocation.lot else None,
                warehouse_id=allocation.lot.warehouse_code if allocation.lot else None,
                lot_id=allocation.lot_id,
                quantity_delta=allocation.allocated_qty,
                reason=StockMovementReason.ALLOCATION_RELEASE,
                source_table="allocations",
                source_id=allocation.id,
                batch_id=f"cancel_allocation_{allocation_id}",
                created_by="system"
            )
            self.db.add(movement)
            
            # 2. 現在在庫更新
            self.repository.update_lot_current_stock(
                allocation.lot_id,
                allocation.allocated_qty
            )
            
            # 3. 引当ステータス更新
            self.repository.update_status(allocation, "cancelled")
        
        return allocation, movement
    
    def get_allocations_by_order_line(self, order_line_id: int) -> List[Allocation]:
        """
        受注明細の引当を取得
        
        Args:
            order_line_id: 受注明細ID
            
        Returns:
            引当エンティティのリスト
        """
        return self.repository.find_by_order_line_id(order_line_id)
    
    def get_allocation(self, allocation_id: int) -> Allocation:
        """
        引当を取得
        
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
