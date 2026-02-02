from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.withdrawal_line_model import WithdrawalLine
from app.infrastructure.persistence.models.withdrawal_models import Withdrawal


class DemandRepository:
    """需要履歴へのアクセスを提供するリポジトリ."""

    def __init__(self, db: Session):
        self.db = db

    def get_demand_history(
        self,
        product_group_id: int,
        warehouse_id: int | None,
        start_date: date,
        end_date: date,
        demand_types: list[str],
    ) -> list[tuple[date, Decimal]]:
        """指定期間の需要履歴を取得する.

        Returns:
            List[tuple[date, Decimal]]: (日付, 数量) のリスト
        """
        # Withdrawal -> WithdrawalLine -> LotReceipt (where product_group_id)
        # Sum quantity by date
        stmt = (
            select(
                Withdrawal.ship_date,
                func.sum(WithdrawalLine.quantity).label("total_quantity"),
            )
            .join(WithdrawalLine, Withdrawal.id == WithdrawalLine.withdrawal_id)
            .join(LotReceipt, WithdrawalLine.lot_receipt_id == LotReceipt.id)
            .where(
                LotReceipt.supplier_item_id == product_group_id,
                Withdrawal.ship_date >= start_date,
                Withdrawal.ship_date <= end_date,
                Withdrawal.withdrawal_type.in_(demand_types),
            )
            .group_by(Withdrawal.ship_date)
            .order_by(Withdrawal.ship_date)
        )

        if warehouse_id:
            stmt = stmt.where(LotReceipt.warehouse_id == warehouse_id)

        result = self.db.execute(stmt).all()
        return [(row.ship_date, row.total_quantity) for row in result]
