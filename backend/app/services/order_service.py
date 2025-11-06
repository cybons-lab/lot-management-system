# backend/app/services/order_service.py
"""
受注サービス層（全修正版）
ビジネスロジックとトランザクション管理を担当
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
    ProductNotFoundError,
)
from app.models import Order, OrderLine, Product
from app.schemas import (
    OrderCreate,
    OrderResponse,
    OrderWithLinesResponse,
)
from app.services.quantity import QuantityConversionError, to_internal_qty


class OrderService:
    """
    受注サービス
    
    Note:
        - 読み取り専用メソッド（get_orders, get_order_detail）は通常のSessionを使用
        - 更新系メソッド（create_order, update_order_status, cancel_order）はUnitOfWorkを使用
    """

    def __init__(self, db: Session):
        """
        コンストラクタ
        
        Args:
            db: SQLAlchemyセッション（通常のSessionまたはUnitOfWork.session）
        """
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
        """
        受注一覧取得（読み取り専用）
        
        Args:
            skip: オフセット
            limit: 取得件数上限
            status: ステータスフィルタ
            customer_code: 得意先コードフィルタ
            date_from: 受注日開始フィルタ
            date_to: 受注日終了フィルタ
            
        Returns:
            受注レスポンスのリスト
        """
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
        """
        受注詳細取得（読み取り専用、明細含む）
        
        Args:
            order_id: 受注ID
            
        Returns:
            受注詳細レスポンス（明細含む）
            
        Raises:
            OrderNotFoundError: 受注が存在しない場合
        """
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
        """
        受注作成（トランザクション管理はUnitOfWorkで実施）
        
        Args:
            order_data: 受注作成データ
            
        Returns:
            作成された受注（明細含む）
            
        Raises:
            DuplicateOrderError: 受注番号が重複している場合
            OrderValidationError: バリデーションエラーの場合
            ProductNotFoundError: 製品が存在しない場合
        """
        # ビジネスルールチェック
        OrderBusinessRules.validate_order_data(order_data)

        # 重複チェック
        existing = (
            self.db.query(Order)
            .filter(Order.order_no == order_data.order_no)
            .first()
        )
        if existing:
            raise DuplicateOrderError(order_data.order_no)

        # 受注ヘッダ作成
        order = Order(
            order_no=order_data.order_no,
            customer_code=order_data.customer_code,
            order_date=order_data.order_date,
            status="open",
        )
        self.db.add(order)
        self.db.flush()  # IDを取得するためflush

        # 受注明細作成
        for line_data in order_data.lines:
            # 【修正#3】製品マスタの存在チェックを明示
            product = (
                self.db.query(Product)
                .filter(Product.product_code == line_data.product_code)
                .first()
            )
            
            if not product:
                raise ProductNotFoundError(line_data.product_code)

            # 内部単位に変換
            try:
                internal_qty = to_internal_qty(
                    product=product,
                    qty_external=line_data.quantity,
                    external_unit=line_data.external_unit,
                )
            except QuantityConversionError as exc:
                raise OrderValidationError(str(exc)) from exc

            # 【修正#4】内部単位整合: 内部単位を保存
            # Note: OrderLine.unitには内部単位（product.internal_unit）を保存
            #       外部単位との変換は to_internal_qty で完結
            line = OrderLine(
                order_id=order.id,
                line_no=line_data.line_no,
                product_code=line_data.product_code,
                quantity=float(internal_qty),  # 内部単位での数量
                unit=product.internal_unit,     # 内部単位を保存（修正）
                due_date=line_data.due_date,
            )
            self.db.add(line)

        self.db.flush()  # 明細のIDを取得
        self.db.refresh(order)  # リレーションをリフレッシュ

        return OrderWithLinesResponse.model_validate(order)

    def update_order_status(self, order_id: int, new_status: str) -> OrderResponse:
        """
        受注ステータス更新（トランザクション管理はUnitOfWorkで実施）
        
        Args:
            order_id: 受注ID
            new_status: 新しいステータス
            
        Returns:
            更新された受注
            
        Raises:
            OrderNotFoundError: 受注が存在しない場合
            InvalidOrderStatusError: 状態遷移が不正な場合
        """
        order = self.db.query(Order).filter(Order.id == order_id).first()

        if not order:
            raise OrderNotFoundError(order_id)

        # 状態遷移バリデーション
        OrderStateMachine.validate_transition(order.status, new_status)

        # ステータス更新
        order.status = new_status

        self.db.flush()
        self.db.refresh(order)

        return OrderResponse.model_validate(order)

    def cancel_order(self, order_id: int) -> None:
        """
        受注キャンセル（トランザクション管理はUnitOfWorkで実施）
        
        Args:
            order_id: 受注ID
            
        Raises:
            OrderNotFoundError: 受注が存在しない場合
            InvalidOrderStatusError: キャンセル不可能なステータスの場合
        """
        order = self.db.query(Order).filter(Order.id == order_id).first()

        if not order:
            raise OrderNotFoundError(order_id)

        # キャンセル可能かチェック
        if order.status in ["shipped", "closed"]:
            raise InvalidOrderStatusError(
                f"ステータスが '{order.status}' の受注はキャンセルできません"
            )

        # ステータスをキャンセルに変更
        order.status = "cancelled"

        self.db.flush()
