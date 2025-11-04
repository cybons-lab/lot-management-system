# backend/app/services/order_service.py
"""
受注サービス層
ビジネスロジックとデータ永続化を担当
"""

from datetime import date
from typing import List, Optional

from sqlalchemy.orm import Session, selectinload

from app.domain.order import (
    DuplicateOrderError,
    InvalidOrderStatusError,
    OrderBusinessRules,
    OrderNotFoundError,
    OrderStateMachine,
    OrderValidationError,
)
from app.models import Order, OrderLine, Product
from app.schemas import (
    OrderCreate,
    OrderResponse,
    OrderWithLinesResponse,
)

# ✅ 修正: 単位変換関数をインポート
from app.services.quantity import QuantityConversionError, to_internal_qty


class OrderService:
    """受注サービス"""

    def __init__(self, db: Session):
        self.db = db

    def get_orders(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        customer_code: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> List[OrderResponse]:
        """受注一覧取得"""
        query = self.db.query(Order)

        if status:
            query = query.filter(Order.status == status)
        if customer_code:
            query = query.filter(Order.customer_code == customer_code)
        if date_from:
            query = query.filter(Order.order_date >= date_from)
        if date_to:
            query = query.filter(Order.order_date <= date_to)

        orders = query.order_by(Order.order_date.desc()).offset(skip).limit(limit).all()

        return [OrderResponse.model_validate(order) for order in orders]

    def get_order_detail(self, order_id: int) -> OrderWithLinesResponse:
        """受注詳細取得(明細含む)"""
        order = (
            self.db.query(Order)
            .options(selectinload(Order.lines))
            .filter(Order.id == order_id)
            .first()
        )

        if not order:
            raise OrderNotFoundError(order_id)

        return OrderWithLinesResponse.model_validate(order)

    def create_order(self, order_data: OrderCreate) -> OrderWithLinesResponse:
        """受注作成"""
        existing = self.db.query(Order).filter(Order.order_no == order_data.order_no).first()
        if existing:
            raise DuplicateOrderError(order_data.order_no)

        # ✅ 修正: external_unitを使った単位変換処理を追加
        for line in order_data.lines:
            # 製品存在チェック
            product = (
                self.db.query(Product).filter(Product.product_code == line.product_code).first()
            )
            if not product:
                raise OrderValidationError(f"製品コード '{line.product_code}' が見つかりません")

            # ✅ 修正: external_unitを使って内部単位に変換
            try:
                internal_qty = to_internal_qty(
                    product=product,
                    qty_external=line.quantity,
                    external_unit=line.external_unit,
                )
                # 変換後の数量でバリデーション
                OrderBusinessRules.validate_quantity(float(internal_qty), line.product_code)
            except QuantityConversionError as e:
                raise OrderValidationError(f"単位変換エラー: {str(e)}")

        order = Order(
            order_no=order_data.order_no,
            customer_code=order_data.customer_code,
            order_date=order_data.order_date,
            status="open",
        )
        self.db.add(order)
        self.db.flush()

        # ✅ 修正: 明細作成時に単位変換を実施
        for line_data in order_data.lines:
            product = (
                self.db.query(Product)
                .filter(Product.product_code == line_data.product_code)
                .first()
            )

            # 内部単位に変換
            internal_qty = to_internal_qty(
                product=product,
                qty_external=line_data.quantity,
                external_unit=line_data.external_unit,
            )

            line = OrderLine(
                order_id=order.id,
                line_no=line_data.line_no,
                product_code=line_data.product_code,
                quantity=float(internal_qty),  # 変換後の数量を保存
                unit=line_data.unit,
                due_date=line_data.due_date,
            )
            self.db.add(line)

        self.db.flush()
        self.db.refresh(order)

        return OrderWithLinesResponse.model_validate(order)

    def update_order_status(self, order_id: int, new_status: str) -> OrderResponse:
        """受注ステータス更新"""
        order = self.db.query(Order).filter(Order.id == order_id).first()

        if not order:
            raise OrderNotFoundError(order_id)

        OrderStateMachine.validate_transition(order.status, new_status)

        order.status = new_status

        self.db.flush()
        self.db.refresh(order)

        return OrderResponse.model_validate(order)

    def cancel_order(self, order_id: int) -> None:
        """受注キャンセル"""
        order = self.db.query(Order).filter(Order.id == order_id).first()

        if not order:
            raise OrderNotFoundError(order_id)

        if order.status in ["shipped", "closed"]:
            raise InvalidOrderStatusError(
                f"ステータスが '{order.status}' の受注はキャンセルできません"
            )

        order.status = "cancelled"

        self.db.flush()
