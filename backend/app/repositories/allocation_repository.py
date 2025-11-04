# backend/app/repositories/allocation_repository.py
"""
引当リポジトリ
DBアクセスのみを責務とし、ビジネスロジックは含まない
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Allocation, Lot, LotCurrentStock, OrderLine


class AllocationRepository:
    """引当リポジトリ（SQLAlchemy 2.0準拠）"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def find_by_id(self, allocation_id: int) -> Optional[Allocation]:
        """
        IDで引当を取得
        
        Args:
            allocation_id: 引当ID
            
        Returns:
            引当エンティティ（存在しない場合はNone）
        """
        stmt = (
            select(Allocation)
            .options(joinedload(Allocation.lot))
            .options(joinedload(Allocation.order_line))
            .where(Allocation.id == allocation_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()
    
    def find_by_order_line_id(self, order_line_id: int) -> List[Allocation]:
        """
        受注明細IDで引当を取得
        
        Args:
            order_line_id: 受注明細ID
            
        Returns:
            引当エンティティのリスト
        """
        stmt = (
            select(Allocation)
            .options(joinedload(Allocation.lot))
            .where(Allocation.order_line_id == order_line_id)
            .order_by(Allocation.allocation_date)
        )
        return list(self.db.execute(stmt).scalars().all())
    
    def find_active_by_lot_id(self, lot_id: int) -> List[Allocation]:
        """
        ロットIDでアクティブな引当を取得
        
        Args:
            lot_id: ロットID
            
        Returns:
            アクティブな引当エンティティのリスト
        """
        stmt = (
            select(Allocation)
            .where(
                Allocation.lot_id == lot_id,
                Allocation.status == "active"
            )
            .order_by(Allocation.allocation_date)
        )
        return list(self.db.execute(stmt).scalars().all())
    
    def create(
        self,
        order_line_id: int,
        lot_id: int,
        allocated_qty: float,
        status: str = "active"
    ) -> Allocation:
        """
        引当を作成
        
        Args:
            order_line_id: 受注明細ID
            lot_id: ロットID
            allocated_qty: 引当数量
            status: ステータス
            
        Returns:
            作成された引当エンティティ
        """
        allocation = Allocation(
            order_line_id=order_line_id,
            lot_id=lot_id,
            allocated_qty=allocated_qty,
            status=status,
            allocation_date=datetime.now()
        )
        self.db.add(allocation)
        # NOTE: commitはservice層で行う
        return allocation
    
    def update_status(self, allocation: Allocation, new_status: str) -> None:
        """
        引当ステータスを更新
        
        Args:
            allocation: 引当エンティティ
            new_status: 新しいステータス
        """
        allocation.status = new_status
        # NOTE: commitはservice層で行う
    
    def delete(self, allocation: Allocation) -> None:
        """
        引当を削除
        
        Args:
            allocation: 引当エンティティ
        """
        self.db.delete(allocation)
        # NOTE: commitはservice層で行う
    
    def get_lot_current_stock(self, lot_id: int) -> Optional[LotCurrentStock]:
        """
        ロットの現在在庫を取得
        
        Args:
            lot_id: ロットID
            
        Returns:
            現在在庫エンティティ（存在しない場合はNone）
        """
        stmt = select(LotCurrentStock).where(LotCurrentStock.lot_id == lot_id)
        return self.db.execute(stmt).scalar_one_or_none()
    
    def update_lot_current_stock(
        self,
        lot_id: int,
        quantity_delta: float
    ) -> None:
        """
        ロット現在在庫を更新
        
        Args:
            lot_id: ロットID
            quantity_delta: 数量変動（正=増加、負=減少）
        """
        current_stock = self.get_lot_current_stock(lot_id)
        if current_stock:
            current_stock.current_quantity += quantity_delta
            current_stock.last_updated = datetime.now()
        # NOTE: commitはservice層で行う
