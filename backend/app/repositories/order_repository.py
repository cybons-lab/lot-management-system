# backend/app/repositories/order_repository.py
"""受注リポジトリ DBアクセスのみを責務とする."""

from datetime import date
from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import Order, OrderLine
from app.models.masters_models import Customer


class OrderRepository:
    """受注リポジトリ（SQLAlchemy 2.0準拠）."""

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, order_id: int, with_lines: bool = False) -> Order | None:
        """IDで受注を取得.

        Args:
            order_id: 受注ID
            with_lines: 受注明細を含めるか

        Returns:
            受注エンティティ（存在しない場合はNone）
        """
        stmt = select(Order).where(Order.id == order_id)

        if with_lines:
            stmt = stmt.options(selectinload(Order.order_lines))

        return cast(Order | None, self.db.execute(stmt).scalar_one_or_none())

    def find_by_order_no(self, order_no: str) -> Order | None:
        """受注番号で受注を取得.

        Args:
            order_no: 受注番号

        Returns:
            受注エンティティ（存在しない場合はNone）
        """
        stmt = select(Order).where(Order.order_no == order_no)  # type: ignore[attr-defined]
        return cast(Order | None, self.db.execute(stmt).scalar_one_or_none())

    def find_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        customer_code: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Order]:
        """受注一覧を取得.

        Args:
            skip: スキップ件数
            limit: 取得件数
            status: ステータスフィルタ
            customer_code: 得意先コードフィルタ
            date_from: 開始日フィルタ
            date_to: 終了日フィルタ

        Returns:
            受注エンティティのリスト
        """
        stmt = select(Order)

        if status:
            stmt = stmt.where(Order.status == status)
        if customer_code:
            # JOIN Customer table to filter by customer_code
            # (Order table doesn't have customer_code column in DDL v2.2)
            stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
                Customer.customer_code == customer_code
            )
        if date_from:
            stmt = stmt.where(Order.order_date >= date_from)
        if date_to:
            stmt = stmt.where(Order.order_date <= date_to)

        stmt = stmt.order_by(Order.order_date.desc()).offset(skip).limit(limit)

        return list(self.db.execute(stmt).scalars().all())

    def create(
        self, order_no: str, customer_code: str, order_date: date, status: str = "open"
    ) -> Order:
        """受注を作成.

        Args:
            order_no: 受注番号
            customer_code: 得意先コード
            order_date: 受注日
            status: ステータス

        Returns:
            作成された受注エンティティ
        """
        order = Order(
            order_no=order_no, customer_code=customer_code, order_date=order_date, status=status
        )
        self.db.add(order)
        # NOTE: commitはservice層で行う
        return order

    def update_status(self, order: Order, new_status: str) -> None:
        """受注ステータスを更新.

        Args:
            order: 受注エンティティ
            new_status: 新しいステータス
        """
        order.status = new_status
        # NOTE: commitはservice層で行う

    def delete(self, order: Order) -> None:
        """受注を削除.

        Args:
            order: 受注エンティティ
        """
        self.db.delete(order)
        # NOTE: commitはservice層で行う


class OrderLineRepository:
    """受注明細リポジトリ（SQLAlchemy 2.0準拠）."""

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, order_line_id: int) -> OrderLine | None:
        """IDで受注明細を取得.

        Args:
            order_line_id: 受注明細ID

        Returns:
            受注明細エンティティ（存在しない場合はNone）
        """
        stmt = (
            select(OrderLine)
            .options(joinedload(OrderLine.order))
            .options(joinedload(OrderLine.product))
            .where(OrderLine.id == order_line_id)
        )
        return cast(OrderLine | None, self.db.execute(stmt).scalar_one_or_none())

    def find_by_order_id(self, order_id: int) -> list[OrderLine]:
        """受注IDで受注明細を取得.

        Args:
            order_id: 受注ID

        Returns:
            受注明細エンティティのリスト
        """
        stmt = select(OrderLine).where(OrderLine.order_id == order_id).order_by(OrderLine.line_no)  # type: ignore[attr-defined]
        return list(self.db.execute(stmt).scalars().all())

    def create(
        self,
        order_id: int,
        line_no: int,
        product_code: str,
        quantity: float,
        unit: str,
        due_date: date | None = None,
    ) -> OrderLine:
        """受注明細を作成.

        Args:
            order_id: 受注ID
            line_no: 明細行番号
            product_code: 製品コード
            quantity: 数量
            unit: 単位
            due_date: 納期

        Returns:
            作成された受注明細エンティティ
        """
        order_line = OrderLine(
            order_id=order_id,
            line_no=line_no,
            product_code=product_code,
            quantity=quantity,
            unit=unit,
            due_date=due_date,
        )
        self.db.add(order_line)
        # NOTE: commitはservice層で行う
        return order_line

    def update_status(self, order_line: OrderLine, new_status: str) -> None:
        """受注明細ステータスを更新.

        Args:
            order_line: 受注明細エンティティ
            new_status: 新しいステータス
        """
        order_line.status = new_status
        # NOTE: commitはservice層で行う
