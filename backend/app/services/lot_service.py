# backend/app/repositories/lot_repository.py
"""
ロットリポジトリ
DBアクセスのみを責務とする
"""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Lot, LotCurrentStock, Product, Warehouse


class LotRepository:
    """ロットリポジトリ（SQLAlchemy 2.0準拠）"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def find_by_id(self, lot_id: int) -> Optional[Lot]:
        """IDでロットを取得"""
        stmt = (
            select(Lot)
            .options(joinedload(Lot.product))
            .options(joinedload(Lot.warehouse))
            .where(Lot.id == lot_id)
        )
        return self.db.execute(stmt).scalar_one_or_none()
    
    def find_available_lots(
        self,
        product_code: str,
        warehouse_code: Optional[str] = None,
        min_quantity: float = 0.0
    ) -> List[tuple[Lot, LotCurrentStock]]:
        """
        利用可能なロットを取得（在庫あり）
        
        Args:
            product_code: 製品コード
            warehouse_code: 倉庫コードフィルタ
            min_quantity: 最小在庫数量
            
        Returns:
            (Lot, LotCurrentStock)のタプルのリスト
        """
        stmt = (
            select(Lot, LotCurrentStock)
            .join(LotCurrentStock, Lot.id == LotCurrentStock.lot_id)
            .where(
                Lot.product_code == product_code,
                LotCurrentStock.current_quantity > min_quantity
            )
        )
        
        if warehouse_code:
            stmt = stmt.where(Lot.warehouse_code == warehouse_code)
        
        results = self.db.execute(stmt).all()
        return [(lot, stock) for lot, stock in results]
    
    def create(
        self,
        supplier_code: str,
        product_code: str,
        lot_number: str,
        warehouse_code: str,
        receipt_date: Optional[date] = None,
        expiry_date: Optional[date] = None
    ) -> Lot:
        """ロットを作成"""
        from datetime import date
        lot = Lot(
            supplier_code=supplier_code,
            product_code=product_code,
            lot_number=lot_number,
            warehouse_code=warehouse_code,
            receipt_date=receipt_date or date.today(),
            expiry_date=expiry_date
        )
        self.db.add(lot)
        return lot


# ===== Service層 =====
# backend/app/services/lot_service.py
"""
ロットサービス
FEFOロジックの実装とトランザクション管理
"""

from datetime import date
from typing import List
from sqlalchemy.orm import Session

from app.domain.lot import (
    FefoPolicy,
    InsufficientLotStockError,
    LotCandidate,
    LotNotFoundError,
    StockValidator,
)
from app.models import Lot
from app.repositories.lot_repository import LotRepository


class LotService:
    """ロットサービス"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repository = LotRepository(db)
    
    def get_lot(self, lot_id: int) -> Lot:
        """ロットを取得"""
        lot = self.repository.find_by_id(lot_id)
        if not lot:
            raise LotNotFoundError(lot_id)
        return lot
    
    def get_fefo_candidates(
        self,
        product_code: str,
        warehouse_code: Optional[str] = None,
        exclude_expired: bool = True
    ) -> List[LotCandidate]:
        """
        FEFO順にロット候補を取得
        
        Args:
            product_code: 製品コード
            warehouse_code: 倉庫コードフィルタ
            exclude_expired: 期限切れロットを除外するか
            
        Returns:
            FEFO順にソートされたロット候補のリスト
        """
        # 利用可能なロットを取得
        lot_stocks = self.repository.find_available_lots(
            product_code=product_code,
            warehouse_code=warehouse_code,
            min_quantity=0.0
        )
        
        # LotCandidateに変換
        candidates = [
            LotCandidate(
                lot_id=lot.id,
                lot_code=lot.lot_code,
                lot_number=lot.lot_number,
                product_code=lot.product_code,
                warehouse_code=lot.warehouse_code,
                available_qty=stock.current_quantity,
                expiry_date=lot.expiry_date,
                receipt_date=lot.receipt_date
            )
            for lot, stock in lot_stocks
        ]
        
        # 期限切れロットを除外
        if exclude_expired:
            candidates, _ = FefoPolicy.filter_expired_lots(candidates)
        
        # FEFO順にソート
        return FefoPolicy.sort_lots_by_fefo(candidates)
    
    def validate_lot_availability(
        self,
        lot_id: int,
        required_qty: float
    ) -> None:
        """
        ロットの利用可能性をバリデーション
        
        Args:
            lot_id: ロットID
            required_qty: 必要数量
            
        Raises:
            LotNotFoundError: ロットが存在しない場合
            InsufficientLotStockError: 在庫不足の場合
            ExpiredLotError: 期限切れの場合
        """
        lot = self.get_lot(lot_id)
        
        # 在庫チェック
        current_stock = self.repository.db.query(LotCurrentStock).filter(
            LotCurrentStock.lot_id == lot_id
        ).first()
        
        if current_stock:
            StockValidator.validate_sufficient_stock(
                lot_id,
                required_qty,
                current_stock.current_quantity
            )
        
        # 期限チェック
        StockValidator.validate_not_expired(lot_id, lot.expiry_date)
