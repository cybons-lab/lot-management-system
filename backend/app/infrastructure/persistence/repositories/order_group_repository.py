# backend/app/infrastructure/persistence/repositories/order_group_repository.py
"""受注グループリポジトリ - 業務キーベースの操作を提供."""

from datetime import date
from typing import cast

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from app.infrastructure.persistence.models import OrderGroup


class OrderGroupRepository:
    """受注グループリポジトリ（SQLAlchemy 2.0準拠）.

    業務キー: customer_id × product_id × order_date
    """

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, group_id: int, with_lines: bool = False) -> OrderGroup | None:
        """IDで受注グループを取得.

        Args:
            group_id: 受注グループID
            with_lines: 受注明細を含めるか

        Returns:
            受注グループエンティティ（存在しない場合はNone）
        """
        stmt = select(OrderGroup).where(OrderGroup.id == group_id)

        if with_lines:
            stmt = stmt.options(selectinload(OrderGroup.order_lines))

        return cast(OrderGroup | None, self.db.execute(stmt).scalar_one_or_none())

    def find_by_business_key(
        self,
        customer_id: int,
        product_id: int,
        order_date: date,
    ) -> OrderGroup | None:
        """業務キーで受注グループを取得.

        Args:
            customer_id: 得意先ID
            product_id: 製品ID
            order_date: 受注日

        Returns:
            受注グループエンティティ（存在しない場合はNone）
        """
        stmt = select(OrderGroup).where(
            OrderGroup.customer_id == customer_id,
            OrderGroup.product_id == product_id,
            OrderGroup.order_date == order_date,
        )
        return cast(OrderGroup | None, self.db.execute(stmt).scalar_one_or_none())

    def upsert_by_business_key(
        self,
        customer_id: int,
        product_id: int,
        order_date: date,
        source_file_name: str | None = None,
    ) -> OrderGroup:
        """業務キーでupsert（存在すれば取得、なければ作成）.

        Args:
            customer_id: 得意先ID
            product_id: 製品ID
            order_date: 受注日
            source_file_name: 取り込み元ファイル名

        Returns:
            受注グループエンティティ
        """
        # PostgreSQL INSERT ... ON CONFLICT DO NOTHING ... RETURNING
        stmt = (
            insert(OrderGroup)
            .values(
                customer_id=customer_id,
                product_id=product_id,
                order_date=order_date,
                source_file_name=source_file_name,
            )
            .on_conflict_do_nothing(constraint="uq_order_groups_business_key")
            .returning(OrderGroup.id)
        )

        result = self.db.execute(stmt)
        group_id = result.scalar()

        if group_id is None:
            # 既存レコードを取得
            existing = self.find_by_business_key(customer_id, product_id, order_date)
            if existing is None:
                raise RuntimeError(
                    f"Failed to upsert OrderGroup: {customer_id}/{product_id}/{order_date}"
                )
            return existing

        # 新規作成されたレコードを取得
        new_group = self.find_by_id(group_id)
        if new_group is None:
            raise RuntimeError(f"Failed to fetch newly created OrderGroup: {group_id}")
        return new_group

    def find_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: int | None = None,
        product_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[OrderGroup]:
        """受注グループ一覧を取得.

        Args:
            skip: スキップ件数
            limit: 取得件数
            customer_id: 得意先IDフィルタ
            product_id: 製品IDフィルタ
            date_from: 開始日フィルタ
            date_to: 終了日フィルタ

        Returns:
            受注グループエンティティのリスト
        """
        stmt = select(OrderGroup)

        if customer_id:
            stmt = stmt.where(OrderGroup.customer_id == customer_id)
        if product_id:
            stmt = stmt.where(OrderGroup.product_id == product_id)
        if date_from:
            stmt = stmt.where(OrderGroup.order_date >= date_from)
        if date_to:
            stmt = stmt.where(OrderGroup.order_date <= date_to)

        stmt = stmt.order_by(OrderGroup.order_date.desc()).offset(skip).limit(limit)

        return list(self.db.execute(stmt).scalars().all())

    def delete(self, group: OrderGroup) -> None:
        """受注グループを削除.

        Args:
            group: 受注グループエンティティ
        """
        self.db.delete(group)
        # NOTE: commitはservice層で行う
