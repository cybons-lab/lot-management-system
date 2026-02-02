"""公開ダッシュボード機能のAPIエンドポイント.

主な責務:
- ログイン前/後に関わらず表示可能な統計情報の提供
- 読み取り専用の公開データへのアクセス
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import (
    LotReceipt,
    Order,
    OrderLine,
)
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)
from app.presentation.api.deps import get_db
from app.presentation.api.routes.auth.auth_router import (
    get_current_user_optional,
)
from app.presentation.schemas.admin.admin_schema import (
    DashboardStatsResponse,
)


router = APIRouter(prefix="/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),  # Allow anonymous access for dashboard
):
    """ダッシュボード用の統計情報を返す.

    在庫総数は lots.current_quantity の合計値を使用。 lot_current_stock
    ビューは使用しない（v2.2 以降は廃止）。
    """
    try:
        # lots テーブルから直接在庫を集計
        total_stock_result = db.execute(
            select(
                func.coalesce(
                    func.sum(LotReceipt.received_quantity - LotReceipt.consumed_quantity), 0.0
                )
            )
        )
        total_stock = total_stock_result.scalar_one()
    except SQLAlchemyError as e:
        logger.warning("在庫集計に失敗したため 0 扱いにします: %s", e)
        db.rollback()
        total_stock = 0.0  # type: ignore[assignment]

    total_orders = db.query(func.count(Order.id)).scalar() or 0

    # P3: Use LotReservation instead of Allocation
    unallocated_subquery = (
        db.query(OrderLine.order_id)
        .outerjoin(
            LotReservation,
            (LotReservation.source_type == ReservationSourceType.ORDER)
            & (LotReservation.source_id == OrderLine.id)
            & (LotReservation.status != ReservationStatus.RELEASED),
        )
        .group_by(OrderLine.id, OrderLine.order_id, OrderLine.order_quantity)
        .having(
            func.coalesce(func.sum(LotReservation.reserved_qty), 0)
            < func.coalesce(OrderLine.order_quantity, 0)
        )
        .subquery()
    )

    unallocated_orders = (
        db.query(func.count(func.distinct(unallocated_subquery.c.order_id))).scalar() or 0
    )

    # Calculate allocation rate
    allocated_orders = total_orders - unallocated_orders
    allocation_rate = (allocated_orders / total_orders * 100.0) if total_orders > 0 else 0.0

    return DashboardStatsResponse(
        total_stock=float(total_stock),
        total_orders=int(total_orders),
        unallocated_orders=int(unallocated_orders),
        allocation_rate=round(allocation_rate, 1),
    )
