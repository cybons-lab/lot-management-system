"""Withdrawal service layer.

出庫（受注外出庫）のビジネスロジック。

【設計意図】出庫サービスの設計判断:

1. with_for_update() によるロック（L144）
   理由: 同時出庫による在庫の二重払い出しを防ぐ
   → 複数ユーザーが同じロットから同時に出庫しようとした場合、
      片方がロックを取得し、もう片方は待機
   → available_quantity（利用可能数量）のチェックが正確に実行される
   TOCTOU脆弱性の回避: ロック取得後に在庫チェック

2. StockHistory への記録（L207-217）
   理由: 在庫変動の監査証跡を完全に保持
   → 誰が、いつ、どのロットから、何個出庫したか
   → 不変（Immutable）なレコードとして保存
   業務上の重要性: 在庫差異が発生した場合のトラブルシューティング

3. EventDispatcher によるドメインイベント発行（L222-230）
   理由: 出庫完了後の副作用処理を疎結合に実装
   用途:
   - 在庫アラートの通知（在庫が閾値を下回った場合）
   - 外部システムへの連携（SAP等）
   - 監査ログの記録
   メリット: 出庫処理本体と、通知・連携ロジックが分離

4. withdrawal_type による得意先バリデーション（L159-170）
   理由: 出庫タイプによって必須項目が異なる
   - ORDER_MANUAL（受注手動）: 得意先必須
   - SCRAP（廃棄）: 得意先不要
   → ビジネスルールに基づいたバリデーション

5. lot.status を "depleted" に更新（L203-205）
   理由: 在庫ゼロになったロットを明示
   用途:
   - 引当画面で「在庫なし」と表示
   - FEFO自動引当から除外
   業務上の意味: 在庫ゼロのロットは、新規受注に割り当てない

6. commit() 後の refresh() と再取得（L232-247）
   理由: リレーション（customer, product等）を含めたレスポンス生成
   → withdrawal.customer.customer_name 等を参照可能にする
   → joinedload で関連データを一括取得（N+1回避）
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.application.services.common.soft_delete_utils import (
    get_customer_code,
    get_customer_name,
    get_delivery_place_code,
    get_delivery_place_name,
    get_product_code,
    get_product_name,
)
from app.application.services.inventory.lot_reservation_service import (
    ReservationInsufficientStockError,
    ReservationLotNotFoundError,
)
from app.application.services.inventory.stock_calculation import get_reserved_quantity
from app.core.time_utils import utcnow
from app.domain.events import EventDispatcher, StockChangedEvent
from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    LotReceipt,
    LotMaster,
    Product,
    StockHistory,
    StockTransactionType,
)
from app.infrastructure.persistence.models.withdrawal_models import (
    Withdrawal,
)
from app.presentation.schemas.inventory.withdrawal_schema import (
    CANCEL_REASON_LABELS,
    WITHDRAWAL_TYPE_LABELS,
    DailyWithdrawalSummary,
    WithdrawalCancelReason,
    WithdrawalCancelRequest,
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
        start_date: date | None = None,
        end_date: date | None = None,
        product_id: int | None = None,
        warehouse_id: int | None = None,
        search_query: str | None = None,
    ) -> WithdrawalListResponse:
        """出庫履歴一覧を取得.

        Args:
            skip: スキップ件数
            limit: 取得件数上限
            lot_id: ロットIDでフィルタ
            customer_id: 得意先IDでフィルタ
            withdrawal_type: 出庫タイプでフィルタ
            start_date: 開始日（出荷日）
            end_date: 終了日（出荷日）
            product_id: 製品IDでフィルタ
            warehouse_id: 倉庫IDでフィルタ
            search_query: キーワード検索（ロット、製品、得意先、納入先、参照番号）

        Returns:
            出庫履歴一覧
        """
        query = self.db.query(Withdrawal).options(
            joinedload(Withdrawal.lot).joinedload(LotReceipt.product),
            joinedload(Withdrawal.customer),
            joinedload(Withdrawal.delivery_place),
            joinedload(Withdrawal.user),
            joinedload(Withdrawal.cancelled_by_user),
        )

        if lot_id is not None:
            query = query.filter(Withdrawal.lot_id == lot_id)

        # Lot結合が必要なフィルタ
        if product_id is not None or warehouse_id is not None:
            query = query.join(Withdrawal.lot)
            if product_id is not None:
                query = query.filter(LotReceipt.product_id == product_id)
            if warehouse_id is not None:
                query = query.filter(LotReceipt.warehouse_id == warehouse_id)

        if search_query:
            term = f"%{search_query}%"
            # 検索に必要なテーブルを結合（重複結合を防ぐため、既に結合されているか確認するか、joinの仕方を統一する）
            # ここではシンプルに、まだ結合されていない場合に結合する戦略をとるが、
            # SQLAlchemyは同じテーブルへのjoinを自動で重複排除しない場合があるため、明示的にjoinする。
            # ただし、options(joinedload)はEager Load用であり、フィルタリングのためのjoinとは別。
            # フィルタリングのためにjoinが必要。

            # LotとProductは結合必須
            if product_id is None and warehouse_id is None:  # 上ですでに結合していない場合
                query = query.join(Withdrawal.lot)
            query = query.join(LotReceipt.product)

            # CustomerとDeliveryPlaceは外部結合（存在しない場合もあるため）
            query = query.outerjoin(Withdrawal.customer)
            query = query.outerjoin(Withdrawal.delivery_place)

            # LotMaster needed for lot_number search
            query = query.join(LotMaster, LotReceipt.lot_master_id == LotMaster.id)

            query = query.filter(
                or_(
                    LotMaster.lot_number.ilike(term),
                    Product.maker_part_code.ilike(term),
                    Product.product_name.ilike(term),
                    Product.maker_item_code.ilike(term),
                    Customer.customer_name.ilike(term),
                    DeliveryPlace.delivery_place_name.ilike(term),
                    Withdrawal.reference_number.ilike(term),
                )
            )

        if customer_id is not None:
            query = query.filter(Withdrawal.customer_id == customer_id)

        if withdrawal_type is not None:
            query = query.filter(Withdrawal.withdrawal_type == withdrawal_type)

        if start_date is not None:
            query = query.filter(Withdrawal.ship_date >= start_date)

        if end_date is not None:
            query = query.filter(Withdrawal.ship_date <= end_date)

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
                joinedload(Withdrawal.lot).joinedload(LotReceipt.product),
                joinedload(Withdrawal.customer),
                joinedload(Withdrawal.delivery_place),
                joinedload(Withdrawal.user),
                joinedload(Withdrawal.cancelled_by_user),
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
        lot = self.db.query(LotReceipt).filter(LotReceipt.id == data.lot_id).with_for_update().first()

        if not lot:
            raise ReservationLotNotFoundError(data.lot_id)

        # 利用可能数量をチェック (using lot_reservations)
        reserved_qty = get_reserved_quantity(self.db, lot.id)
        available_quantity = lot.current_quantity - reserved_qty - lot.locked_quantity
        if data.quantity > available_quantity:
            raise ReservationInsufficientStockError(lot.id, data.quantity, available_quantity)

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
        lot.updated_at = utcnow()

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
            transaction_date=utcnow(),
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
                joinedload(Withdrawal.lot).joinedload(LotReceipt.product),
                joinedload(Withdrawal.customer),
                joinedload(Withdrawal.delivery_place),
                joinedload(Withdrawal.user),
                joinedload(Withdrawal.cancelled_by_user),
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
        lot = withdrawal.lot
        product = lot.product if lot else None

        # 取消理由の変換
        cancel_reason = None
        cancel_reason_label = None
        if withdrawal.cancel_reason:
            try:
                cancel_reason = WithdrawalCancelReason(withdrawal.cancel_reason)
                cancel_reason_label = CANCEL_REASON_LABELS.get(
                    cancel_reason, str(cancel_reason.value)
                )
            except ValueError:
                cancel_reason_label = withdrawal.cancel_reason

        return WithdrawalResponse(
            id=withdrawal.id,
            lot_id=withdrawal.lot_id or 0,
            lot_number=lot.lot_number if lot else "",
            product_id=lot.product_id if lot else 0,
            product_name=get_product_name(product),
            product_code=get_product_code(product),
            quantity=withdrawal.quantity or Decimal("0"),
            withdrawal_type=withdrawal_type,
            withdrawal_type_label=WITHDRAWAL_TYPE_LABELS.get(
                withdrawal_type, str(withdrawal_type.value)
            ),
            customer_id=withdrawal.customer_id,
            customer_name=get_customer_name(withdrawal.customer) or None,
            customer_code=get_customer_code(withdrawal.customer) or None,
            delivery_place_id=withdrawal.delivery_place_id,
            delivery_place_name=get_delivery_place_name(withdrawal.delivery_place) or None,
            delivery_place_code=get_delivery_place_code(withdrawal.delivery_place) or None,
            ship_date=withdrawal.ship_date,
            reason=withdrawal.reason,
            reference_number=withdrawal.reference_number,
            withdrawn_by=withdrawal.withdrawn_by,
            withdrawn_by_name=withdrawal.user.username if withdrawal.user else None,
            withdrawn_at=withdrawal.withdrawn_at,
            created_at=withdrawal.created_at,
            # 取消関連フィールド
            is_cancelled=withdrawal.cancelled_at is not None,
            cancelled_at=withdrawal.cancelled_at,
            cancelled_by=withdrawal.cancelled_by,
            cancelled_by_name=(
                withdrawal.cancelled_by_user.username if withdrawal.cancelled_by_user else None
            ),
            cancel_reason=cancel_reason,
            cancel_reason_label=cancel_reason_label,
            cancel_note=withdrawal.cancel_note,
        )

    def cancel_withdrawal(
        self, withdrawal_id: int, data: WithdrawalCancelRequest
    ) -> WithdrawalResponse:
        """出庫を取消（反対仕訳方式）.

        取消済みの出庫に対してRETURNトランザクションを記録し、
        ロットの在庫を復元する。

        Args:
            withdrawal_id: 出庫ID
            data: 取消リクエスト

        Returns:
            取消後の出庫レコード

        Raises:
            ValueError: 出庫が見つからない、または既に取消済みの場合
        """
        # 出庫レコードを取得（行ロック取得して同時実行を防ぐ）
        withdrawal = (
            self.db.query(Withdrawal)
            .filter(Withdrawal.id == withdrawal_id)
            .with_for_update()
            .first()
        )

        if not withdrawal:
            raise ValueError(f"出庫（ID={withdrawal_id}）が見つかりません")

        # べき等性: 既に取消済みの場合はそのまま返す
        if withdrawal.cancelled_at is not None:
            return self.get_withdrawal_by_id(withdrawal_id)  # type: ignore

        # ロットを取得（ロック付き）
        lot = self.db.query(LotReceipt).filter(LotReceipt.id == withdrawal.lot_id).with_for_update().first()

        if not lot:
            raise ValueError(f"ロット（ID={withdrawal.lot_id}）が見つかりません")

        # 在庫を復元
        quantity_before = lot.current_quantity
        new_quantity = lot.current_quantity + (withdrawal.quantity or Decimal("0"))
        lot.current_quantity = new_quantity
        lot.updated_at = utcnow()

        # depletedだった場合はactiveに戻す
        if lot.status == "depleted":
            lot.status = "active"

        # stock_historyにRETURNトランザクションを記録（反対仕訳）
        stock_history = StockHistory(
            lot_id=lot.id,
            transaction_type=StockTransactionType.RETURN,
            quantity_change=+(withdrawal.quantity or Decimal("0")),  # 戻りはプラス
            quantity_after=new_quantity,
            reference_type="withdrawal_cancellation",
            reference_id=withdrawal.id,
            transaction_date=utcnow(),
        )
        self.db.add(stock_history)

        # 出庫レコードに取消情報を記録
        withdrawal.cancelled_at = utcnow()
        withdrawal.cancelled_by = data.cancelled_by
        withdrawal.cancel_reason = data.reason.value
        withdrawal.cancel_note = data.note

        self.db.commit()
        self.db.refresh(withdrawal)

        # ドメインイベント発行
        event = StockChangedEvent(
            lot_id=lot.id,
            quantity_before=quantity_before,
            quantity_after=new_quantity,
            quantity_change=+(withdrawal.quantity or Decimal("0")),
            reason=f"withdrawal_cancellation:{data.reason.value}",
        )
        EventDispatcher.queue(event)

        # レスポンス用にリレーションを再取得
        refreshed = (
            self.db.query(Withdrawal)
            .options(
                joinedload(Withdrawal.lot).joinedload(LotReceipt.product),
                joinedload(Withdrawal.customer),
                joinedload(Withdrawal.delivery_place),
                joinedload(Withdrawal.user),
                joinedload(Withdrawal.cancelled_by_user),
            )
            .filter(Withdrawal.id == withdrawal.id)
            .first()
        )

        if not refreshed:
            raise ValueError(f"出庫（ID={withdrawal.id}）の再取得に失敗しました")

        return self._to_response(refreshed)

    def get_calendar_summary(
        self,
        year: int,
        month: int,
        warehouse_id: int | None = None,
        product_id: int | None = None,
        supplier_id: int | None = None,
    ) -> list[DailyWithdrawalSummary]:
        """月間の日別出庫集計を取得.

        Args:
            year: 年
            month: 月
            warehouse_id: 倉庫IDフィルタ
            product_id: 製品IDフィルタ
            supplier_id: 仕入先IDフィルタ

        Returns:
            日別集計リスト
        """
        start_date = date(year, month, 1)
        if month == 12:
            next_month = date(year + 1, 1, 1)
        else:
            next_month = date(year, month + 1, 1)
        end_date = next_month - timedelta(days=1)

        stmt = (
            select(
                Withdrawal.ship_date,
                func.count(Withdrawal.id).label("withdrawal_count"),
                func.sum(Withdrawal.quantity).label("total_quantity"),
            )
            .join(LotReceipt, Withdrawal.lot_id == LotReceipt.id)
            .where(Withdrawal.ship_date >= start_date)
            .where(Withdrawal.ship_date <= end_date)
        )

        if warehouse_id:
            stmt = stmt.where(LotReceipt.warehouse_id == warehouse_id)
        if product_id:
            stmt = stmt.where(LotReceipt.product_id == product_id)
        if supplier_id:
            stmt = stmt.where(LotReceipt.supplier_id == supplier_id)

        stmt = stmt.group_by(Withdrawal.ship_date).order_by(Withdrawal.ship_date)

        rows = self.db.execute(stmt).all()

        return [
            DailyWithdrawalSummary(
                date=row.ship_date,
                count=int(row.withdrawal_count),
                total_quantity=row.total_quantity or Decimal("0"),
            )
            for row in rows
        ]
