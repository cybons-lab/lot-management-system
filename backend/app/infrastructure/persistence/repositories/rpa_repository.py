from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.inventory_models import Lot
from app.infrastructure.persistence.models.masters_models import CustomerItem, Product
from app.infrastructure.persistence.models.rpa_models import (
    RpaRun,
    RpaRunItem,
)


class RpaRepository:
    """RPA関連のデータアクセスを責務とするRepository."""

    def __init__(self, db: Session):
        self.db = db

    def add(self, entity: Any) -> None:
        """エンティティを追加."""
        self.db.add(entity)

    def refresh(self, entity: Any) -> None:
        """エンティティをリフレッシュ."""
        self.db.refresh(entity)

    def get_run(self, run_id: int) -> RpaRun | None:
        """Runを取得."""
        return self.db.query(RpaRun).filter(RpaRun.id == run_id).first()

    def get_runs(
        self,
        rpa_type: str,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[RpaRun], int]:
        """Run一覧を取得."""
        query = self.db.query(RpaRun).filter(RpaRun.rpa_type == rpa_type)
        total = query.count()
        runs = query.order_by(RpaRun.created_at.desc()).offset(skip).limit(limit).all()
        return runs, total

    def get_item(self, run_id: int, item_id: int) -> RpaRunItem | None:
        """Itemを取得."""
        return (
            self.db.query(RpaRunItem)
            .filter(RpaRunItem.id == item_id, RpaRunItem.run_id == run_id)
            .first()
        )

    def get_items_by_ids(self, run_id: int, item_ids: list[int]):
        """指定したIDのItemリストを取得（Update用クエリビルダとして利用も可）."""
        return self.db.query(RpaRunItem).filter(
            RpaRunItem.run_id == run_id, RpaRunItem.id.in_(item_ids)
        )

    def get_unprocessed_items_count(self, run_id: int) -> int:
        """Step3未完了アイテム数を取得."""
        return (
            self.db.query(RpaRunItem)
            .filter(
                RpaRunItem.run_id == run_id,
                RpaRunItem.issue_flag.is_(True),
                or_(
                    RpaRunItem.result_status.is_(None),
                    RpaRunItem.result_status == "pending",
                    RpaRunItem.result_status == "processing",
                ),
            )
            .count()
        )

    def lock_issue_items(self, run_id: int, now: Any) -> int:
        """発行対象アイテムをロックする (Step2開始時)."""
        return (
            self.db.query(RpaRunItem)
            .filter(
                RpaRunItem.run_id == run_id,
                RpaRunItem.issue_flag.is_(True),
            )
            .update({"lock_flag": True, "updated_at": now}, synchronize_session=False)
        )

    # --- Master / Lot Lookup Methods for Orchestrator Logic ---

    def find_customer_item(
        self, customer_id: int, external_product_code: str
    ) -> CustomerItem | None:
        """得意先商品マスタ検索."""
        return (
            self.db.query(CustomerItem)
            .filter(
                CustomerItem.customer_id == customer_id,
                CustomerItem.external_product_code == external_product_code,
            )
            .first()
        )

    def find_product_by_maker_part_code(self, code: str) -> Product | None:
        """メーカー品番で商品検索."""
        return self.db.query(Product).filter(Product.maker_part_code == code).first()

    def find_active_lots(
        self,
        product_id: int,
        supplier_id: int | None = None,
    ) -> list[Lot]:
        """有効なロットを検索."""
        query = self.db.query(Lot).filter(
            Lot.product_id == product_id,
            Lot.status == "active",
            Lot.current_quantity > 0,
        )
        if supplier_id:
            query = query.filter(Lot.supplier_id == supplier_id)

        return query.order_by(
            Lot.expiry_date.asc().nullslast(),
            Lot.received_date.asc(),
        ).all()
