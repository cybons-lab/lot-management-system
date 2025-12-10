"""Withdrawal service layer.

出庫（受注外出庫）のビジネスロジック。
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.application.services.inventory.stock_calculation import get_reserved_quantity
from app.domain.events import EventDispatcher, StockChangedEvent
from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    Lot,
    StockHistory,
    StockTransactionType,
)
from app.infrastructure.persistence.models.withdrawal_models import (
    Withdrawal,
)
from app.presentation.schemas.inventory.withdrawal_schema import (
    WITHDRAWAL_TYPE_LABELS,
    WithdrawalCreate,
    WithdrawalListResponse,
    WithdrawalResponse,
    WithdrawalType,
)


class WithdrawalService:
    """出庫サービス."""

    def __init__(self, db: Session):
        """Initialize withdrawal service.

        Args:
            db: Database session
        """
        self.db = db

    def get_withdrawals(
        self,
        skip: int = 0,
        limit: int = 100,
        lot_id: int | None = None,
        customer_id: int | None = None,
        withdrawal_type: str | None = None,
    ) -> WithdrawalListResponse:
        """出庫履歴一覧を取得.

        Args:
            skip: スキップ件数
            limit: 取得件数上限
            lot_id: ロットIDでフィルタ
            customer_id: 得意先IDでフィルタ
            withdrawal_type: 出庫タイプでフィルタ

        Returns:
            出庫履歴一覧
        """
        query = self.db.query(Withdrawal).options(
            joinedload(Withdrawal.lot).joinedload(Lot.product),
            joinedload(Withdrawal.customer),
            joinedload(Withdrawal.delivery_place),
            joinedload(Withdrawal.user),
        )

        if lot_id is not None:
            query = query.filter(Withdrawal.lot_id == lot_id)

        if customer_id is not None:
            query = query.filter(Withdrawal.customer_id == customer_id)

        if withdrawal_type is not None:
            query = query.filter(Withdrawal.withdrawal_type == withdrawal_type)

        # 全件数を取得
        total = query.count()

        # ページング＋ソート
        query = query.order_by(Withdrawal.withdrawn_at.desc())
        withdrawals = query.offset(skip).limit(limit).all()

        return WithdrawalListResponse(
            withdrawals=[self._to_response(w) for w in withdrawals],
            total=total,
            page=(skip // limit) + 1 if limit > 0 else 1,
            page_size=limit,
        )

    def get_withdrawal_by_id(self, withdrawal_id: int) -> WithdrawalResponse | None:
        """出庫詳細を取得.

        Args:
            withdrawal_id: 出庫ID

        Returns:
            出庫詳細、またはNone
        """
        withdrawal = (
            self.db.query(Withdrawal)
            .options(
                joinedload(Withdrawal.lot).joinedload(Lot.product),
                joinedload(Withdrawal.customer),
                joinedload(Withdrawal.delivery_place),
                joinedload(Withdrawal.user),
            )
            .filter(Withdrawal.id == withdrawal_id)
            .first()
        )

        if not withdrawal:
            return None

        return self._to_response(withdrawal)

    def create_withdrawal(self, data: WithdrawalCreate) -> WithdrawalResponse:
        """出庫を登録.

        Args:
            data: 出庫登録リクエスト

        Returns:
            作成された出庫レコード

        Raises:
            ValueError: ロットが見つからない、利用可能数量が不足している場合
        """
        # ロットを取得（ロック付き）- joinedloadはFOR UPDATEと互換性がないため分離
        lot = self.db.query(Lot).filter(Lot.id == data.lot_id).with_for_update().first()

        if not lot:
            raise ValueError(f"ロット（ID={data.lot_id}）が見つかりません")

        # 利用可能数量をチェック (using lot_reservations)
        reserved_qty = get_reserved_quantity(self.db, lot.id)
        available_quantity = lot.current_quantity - reserved_qty - lot.locked_quantity
        if data.quantity > available_quantity:
            raise ValueError(
                f"利用可能数量が不足しています。"
                f"出庫数量: {data.quantity}, 利用可能: {available_quantity}"
            )

        # 得意先・納入場所を確認（受注手動の場合のみ必須）
        customer = None
        delivery_place = None

        if data.withdrawal_type == WithdrawalType.ORDER_MANUAL:
            # 受注手動の場合は得意先必須
            if not data.customer_id:
                raise ValueError("受注（手動）の場合、得意先は必須です")
            customer = self.db.query(Customer).filter(Customer.id == data.customer_id).first()
            if not customer:
                raise ValueError(f"得意先（ID={data.customer_id}）が見つかりません")
        elif data.customer_id:
            # 他のタイプでも指定があれば検証
            customer = self.db.query(Customer).filter(Customer.id == data.customer_id).first()
            if not customer:
                raise ValueError(f"得意先（ID={data.customer_id}）が見つかりません")

        if data.delivery_place_id:
            delivery_place = (
                self.db.query(DeliveryPlace)
                .filter(DeliveryPlace.id == data.delivery_place_id)
                .first()
            )
            if not delivery_place:
                raise ValueError(f"納入場所（ID={data.delivery_place_id}）が見つかりません")

        # 出庫レコード作成
        quantity_before = lot.current_quantity
        new_quantity = lot.current_quantity - data.quantity

        withdrawal = Withdrawal(
            lot_id=data.lot_id,
            quantity=data.quantity,
            withdrawal_type=data.withdrawal_type.value,
            customer_id=data.customer_id,
            delivery_place_id=data.delivery_place_id,
            ship_date=data.ship_date,
            reason=data.reason,
            reference_number=data.reference_number,
            withdrawn_by=data.withdrawn_by,
        )
        self.db.add(withdrawal)
        self.db.flush()

        # ロットの現在数量を減算
        lot.current_quantity = new_quantity
        lot.updated_at = datetime.now()

        # 数量がゼロになった場合はステータスを更新
        if new_quantity == Decimal("0"):
            lot.status = "depleted"

        # stock_historyに記録
        stock_history = StockHistory(
            lot_id=lot.id,
            transaction_type=StockTransactionType.WITHDRAWAL,
            quantity_change=-data.quantity,  # 出庫はマイナス
            quantity_after=new_quantity,
            reference_type="withdrawal",
            reference_id=withdrawal.id,
            transaction_date=datetime.now(),
        )
        self.db.add(stock_history)

        self.db.commit()
        self.db.refresh(withdrawal)

        # ドメインイベント発行
        event = StockChangedEvent(
            lot_id=lot.id,
            quantity_before=quantity_before,
            quantity_after=new_quantity,
            quantity_change=-data.quantity,
            reason=f"withdrawal:{data.withdrawal_type.value}",
        )
        EventDispatcher.queue(event)

        # レスポンス用にリレーションを再取得
        refreshed = (
            self.db.query(Withdrawal)
            .options(
                joinedload(Withdrawal.lot).joinedload(Lot.product),
                joinedload(Withdrawal.customer),
                joinedload(Withdrawal.delivery_place),
                joinedload(Withdrawal.user),
            )
            .filter(Withdrawal.id == withdrawal.id)
            .first()
        )

        if not refreshed:
            raise ValueError(f"出庫（ID={withdrawal.id}）の再取得に失敗しました")

        return self._to_response(refreshed)

    def _to_response(self, withdrawal: Withdrawal) -> WithdrawalResponse:
        """モデルをレスポンススキーマに変換."""
        withdrawal_type = WithdrawalType(withdrawal.withdrawal_type)
        return WithdrawalResponse(
            id=withdrawal.id,
            lot_id=withdrawal.lot_id,
            lot_number=withdrawal.lot.lot_number,
            product_id=withdrawal.lot.product_id,
            product_name=withdrawal.lot.product.product_name,
            product_code=withdrawal.lot.product.maker_part_code,
            quantity=withdrawal.quantity,
            withdrawal_type=withdrawal_type,
            withdrawal_type_label=WITHDRAWAL_TYPE_LABELS.get(
                withdrawal_type, str(withdrawal_type.value)
            ),
            customer_id=withdrawal.customer_id,
            customer_name=withdrawal.customer.customer_name if withdrawal.customer else None,
            customer_code=withdrawal.customer.customer_code if withdrawal.customer else None,
            delivery_place_id=withdrawal.delivery_place_id,
            delivery_place_name=withdrawal.delivery_place.delivery_place_name
            if withdrawal.delivery_place
            else None,
            delivery_place_code=withdrawal.delivery_place.delivery_place_code
            if withdrawal.delivery_place
            else None,
            ship_date=withdrawal.ship_date,
            reason=withdrawal.reason,
            reference_number=withdrawal.reference_number,
            withdrawn_by=withdrawal.withdrawn_by,
            withdrawn_by_name=withdrawal.user.username if withdrawal.user else None,
            withdrawn_at=withdrawal.withdrawn_at,
            created_at=withdrawal.created_at,
        )
