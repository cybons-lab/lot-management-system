"""在庫調整サービス層.

在庫調整の作成・取得・履歴管理のビジネスロジックを提供します。
"""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.application.services.common.base_service import BaseService
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.inventory_models import (
    Adjustment,
    Lot,
    StockHistory,
    StockTransactionType,
)
from app.presentation.schemas.inventory.inventory_schema import (
    AdjustmentCreate,
    AdjustmentResponse,
    AdjustmentType,
)


class AdjustmentService(BaseService[Adjustment, AdjustmentCreate, AdjustmentResponse, int]):
    """在庫調整のビジネスロジック.

    調整レコードは作成後は不変（immutable）であるため、
    AdjustmentResponseを更新スキーマとしても使用します。

    BaseServiceから基本操作を継承:
    - get_by_id(adjustment_id) -> Adjustment (AdjustmentResponseを返すようオーバーライド)

    在庫更新を伴う複雑なビジネスロジックを実装しています。
    """

    def __init__(self, db: Session):
        """在庫調整サービスを初期化.

        Args:
            db: データベースセッション
        """
        super().__init__(db=db, model=Adjustment)

    def get_adjustments(
        self,
        skip: int = 0,
        limit: int = 100,
        lot_id: int | None = None,
        adjustment_type: str | None = None,
    ) -> list[AdjustmentResponse]:
        """在庫調整履歴を取得（オプションでフィルタリング）.

        Args:
            skip: スキップ件数（ページネーション用）
            limit: 取得件数上限
            lot_id: ロットIDでフィルタ
            adjustment_type: 調整タイプでフィルタ

        Returns:
            在庫調整レコードのリスト
        """
        query = self.db.query(Adjustment)

        if lot_id is not None:
            query = query.filter(Adjustment.lot_id == lot_id)

        if adjustment_type is not None:
            query = query.filter(Adjustment.adjustment_type == adjustment_type)

        query = query.order_by(Adjustment.adjusted_at.desc())

        adjustments = query.offset(skip).limit(limit).all()

        return [
            AdjustmentResponse(
                id=adj.id,
                lot_id=adj.lot_id,
                adjustment_type=AdjustmentType(adj.adjustment_type),
                adjusted_quantity=adj.adjusted_quantity,
                reason=adj.reason,
                adjusted_by=adj.adjusted_by,
                adjusted_at=adj.adjusted_at,
            )
            for adj in adjustments
        ]

    def get_adjustment_by_id(self, adjustment_id: int) -> AdjustmentResponse | None:
        """在庫調整をIDで取得.

        Args:
            adjustment_id: 在庫調整ID

        Returns:
            在庫調整レコード、見つからない場合はNone
        """
        adjustment = self.db.query(Adjustment).filter(Adjustment.id == adjustment_id).first()

        if not adjustment:
            return None

        return AdjustmentResponse(
            id=adjustment.id,
            lot_id=adjustment.lot_id,
            adjustment_type=AdjustmentType(adjustment.adjustment_type),
            adjusted_quantity=adjustment.adjusted_quantity,
            reason=adjustment.reason,
            adjusted_by=adjustment.adjusted_by,
            adjusted_at=adjustment.adjusted_at,
        )

    def create_adjustment(self, adjustment: AdjustmentCreate) -> AdjustmentResponse:
        """在庫調整を作成.

        Args:
            adjustment: 在庫調整作成データ

        Returns:
            作成された在庫調整レコード

        Raises:
            ValueError: ロットが見つからない場合、または調整後の数量がマイナスになる場合

        Note:
            - ロットのcurrent_quantityを更新
            - stock_historyレコードを作成
        """
        # Get lot
        lot = self.db.query(Lot).filter(Lot.id == adjustment.lot_id).first()

        if not lot:
            raise ValueError(f"Lot with id={adjustment.lot_id} not found")

        # Calculate new quantity
        new_quantity = lot.current_quantity + adjustment.adjusted_quantity

        if new_quantity < Decimal("0"):
            raise ValueError(
                f"Adjustment would result in negative quantity. "
                f"Current: {lot.current_quantity}, Adjustment: {adjustment.adjusted_quantity}"
            )

        # Create adjustment record
        db_adjustment = Adjustment(
            lot_id=adjustment.lot_id,
            adjustment_type=adjustment.adjustment_type,
            adjusted_quantity=adjustment.adjusted_quantity,
            reason=adjustment.reason,
            adjusted_by=adjustment.adjusted_by,
        )

        self.db.add(db_adjustment)
        self.db.flush()

        # Update lot quantity
        lot.current_quantity = new_quantity
        lot.updated_at = utcnow()

        # Update lot status if necessary
        if new_quantity == Decimal("0"):
            lot.status = "depleted"

        # Create stock history record
        stock_history = StockHistory(
            lot_id=lot.id,
            transaction_type=StockTransactionType.ADJUSTMENT,
            quantity_change=adjustment.adjusted_quantity,
            quantity_after=new_quantity,
            reference_type="adjustment",
            reference_id=db_adjustment.id,
            transaction_date=utcnow(),
        )

        self.db.add(stock_history)

        self.db.commit()
        self.db.refresh(db_adjustment)

        return AdjustmentResponse(
            id=db_adjustment.id,
            lot_id=db_adjustment.lot_id,
            adjustment_type=AdjustmentType(db_adjustment.adjustment_type),
            adjusted_quantity=db_adjustment.adjusted_quantity,
            reason=db_adjustment.reason,
            adjusted_by=db_adjustment.adjusted_by,
            adjusted_at=db_adjustment.adjusted_at,
        )
