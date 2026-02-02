"""Intake history service layer.

入庫履歴のビジネスロジック。
StockHistoryテーブルからINBOUNDトランザクションを取得し、
関連するロット、製品、仕入先、倉庫情報を結合して返す。
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.application.services.common.soft_delete_utils import (
    get_product_code,
    get_product_name,
    get_supplier_code,
    get_supplier_name,
    get_warehouse_code,
    get_warehouse_name,
)
from app.infrastructure.persistence.models import (
    ExpectedLot,
    InboundPlanLine,
    LotMaster,
    LotReceipt,
    Product,
    StockHistory,
    StockTransactionType,
    Supplier,
    Warehouse,
)
from app.presentation.schemas.inventory.intake_history_schema import (
    DailyIntakeSummary,
    IntakeHistoryListResponse,
    IntakeHistoryResponse,
)


class IntakeHistoryService:
    """入庫履歴サービス."""

    def __init__(self, db: Session):
        """Initialize intake history service.

        Args:
            db: Database session
        """
        self.db = db

    def get_intake_history(
        self,
        skip: int = 0,
        limit: int = 100,
        supplier_id: int | None = None,
        warehouse_id: int | None = None,
        product_group_id: int | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        search_query: str | None = None,
    ) -> IntakeHistoryListResponse:
        """入庫履歴一覧を取得.

        Args:
            skip: スキップ件数
            limit: 取得件数上限
            supplier_id: 仕入先IDでフィルタ
            warehouse_id: 倉庫IDでフィルタ
            product_group_id: 製品IDでフィルタ
            start_date: 開始日（入庫日）
            end_date: 終了日（入庫日）
            search_query: キーワード検索（ロット番号、製品名、仕入先名）

        Returns:
            入庫履歴一覧
        """
        query = (
            self.db.query(StockHistory)
            .filter(StockHistory.transaction_type == StockTransactionType.INBOUND)
            .options(
                joinedload(StockHistory.lot).joinedload(LotReceipt.product_group),
                joinedload(StockHistory.lot).joinedload(LotReceipt.warehouse),
                joinedload(StockHistory.lot).joinedload(LotReceipt.supplier),
                joinedload(StockHistory.lot)
                .joinedload(LotReceipt.expected_lot)
                .joinedload(ExpectedLot.inbound_plan_line)
                .joinedload(InboundPlanLine.inbound_plan),
            )
        )

        # Lot結合が必要なフィルタ
        if supplier_id is not None or warehouse_id is not None or product_group_id is not None:
            query = query.join(StockHistory.lot)
            if supplier_id is not None:
                query = query.filter(LotReceipt.supplier_id == supplier_id)
            if warehouse_id is not None:
                query = query.filter(LotReceipt.warehouse_id == warehouse_id)
            if product_group_id is not None:
                query = query.filter(LotReceipt.product_group_id == product_group_id)

        if search_query:
            term = f"%{search_query}%"
            # 検索に必要なテーブルを結合
            if supplier_id is None and warehouse_id is None and product_group_id is None:
                query = query.join(StockHistory.lot)
            query = query.join(LotReceipt.product_group)
            query = query.outerjoin(LotReceipt.supplier)
            query = query.outerjoin(LotReceipt.warehouse)

            # LotMaster is required for lot_number search
            query = query.join(LotMaster, LotReceipt.lot_master_id == LotMaster.id)

            query = query.filter(
                or_(
                    LotMaster.lot_number.ilike(term),
                    Product.maker_part_no.ilike(term),
                    Product.display_name.ilike(term),
                    Supplier.supplier_name.ilike(term),
                    Warehouse.warehouse_name.ilike(term),
                )
            )

        if start_date is not None:
            query = query.filter(func.date(StockHistory.transaction_date) >= start_date)

        if end_date is not None:
            query = query.filter(func.date(StockHistory.transaction_date) <= end_date)

        # 全件数を取得
        total = query.count()

        # ページング＋ソート
        query = query.order_by(StockHistory.transaction_date.desc())
        records = query.offset(skip).limit(limit).all()

        return IntakeHistoryListResponse(
            intakes=[self._to_response(r) for r in records],
            total=total,
            page=(skip // limit) + 1 if limit > 0 else 1,
            page_size=limit,
        )

    def get_intake_by_id(self, intake_id: int) -> IntakeHistoryResponse | None:
        """入庫履歴詳細を取得.

        Args:
            intake_id: StockHistory ID

        Returns:
            入庫履歴詳細、またはNone
        """
        record = (
            self.db.query(StockHistory)
            .filter(StockHistory.id == intake_id)
            .filter(StockHistory.transaction_type == StockTransactionType.INBOUND)
            .options(
                joinedload(StockHistory.lot).joinedload(LotReceipt.product_group),
                joinedload(StockHistory.lot).joinedload(LotReceipt.warehouse),
                joinedload(StockHistory.lot).joinedload(LotReceipt.supplier),
                joinedload(StockHistory.lot)
                .joinedload(LotReceipt.expected_lot)
                .joinedload(ExpectedLot.inbound_plan_line)
                .joinedload(InboundPlanLine.inbound_plan),
            )
            .first()
        )

        if not record:
            return None

        return self._to_response(record)

    def _to_response(self, record: StockHistory) -> IntakeHistoryResponse:
        """モデルをレスポンススキーマに変換."""
        lot = record.lot
        product = lot.product_group if lot else None
        warehouse = lot.warehouse if lot else None
        supplier = lot.supplier if lot else None

        # InboundPlan情報を取得
        inbound_plan_number = None
        sap_po_number = None
        if lot and lot.expected_lot:
            expected_lot = lot.expected_lot
            if expected_lot.inbound_plan_line:
                plan_line = expected_lot.inbound_plan_line
                if plan_line.inbound_plan:
                    plan = plan_line.inbound_plan
                    inbound_plan_number = plan.plan_number
                    sap_po_number = plan.sap_po_number

        return IntakeHistoryResponse(
            id=record.id,
            lot_id=record.lot_id,
            lot_number=lot.lot_number or "" if lot else "",
            supplier_item_id=lot.supplier_item_id or 0 if lot else 0,
            product_name=get_product_name(product),
            product_code=get_product_code(product),
            supplier_id=lot.supplier_id if lot else None,
            supplier_name=get_supplier_name(supplier),
            supplier_code=get_supplier_code(supplier),
            warehouse_id=lot.warehouse_id if lot else 0,
            warehouse_name=get_warehouse_name(warehouse) or "",
            warehouse_code=get_warehouse_code(warehouse),
            quantity=record.quantity_change or Decimal("0"),
            received_date=lot.received_date if lot else record.transaction_date.date(),
            expiry_date=lot.expiry_date if lot else None,
            inbound_plan_number=inbound_plan_number,
            sap_po_number=sap_po_number,
            transaction_date=record.transaction_date,
            created_at=record.transaction_date,
        )

    def get_calendar_summary(
        self,
        year: int,
        month: int,
        warehouse_id: int | None = None,
        product_group_id: int | None = None,
        supplier_id: int | None = None,
    ) -> list[DailyIntakeSummary]:
        """月間の日別入庫集計を取得.

        Args:
            year: 年
            month: 月
            warehouse_id: 倉庫IDフィルタ
            product_group_id: 製品IDフィルタ
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
                func.date(StockHistory.transaction_date).label("intake_date"),
                func.count(StockHistory.id).label("intake_count"),
                func.sum(StockHistory.quantity_change).label("total_quantity"),
            )
            .join(LotReceipt, StockHistory.lot_id == LotReceipt.id)
            .where(StockHistory.transaction_type == StockTransactionType.INBOUND)
            .where(func.date(StockHistory.transaction_date) >= start_date)
            .where(func.date(StockHistory.transaction_date) <= end_date)
        )

        if warehouse_id:
            stmt = stmt.where(LotReceipt.warehouse_id == warehouse_id)
        if product_group_id:
            stmt = stmt.where(LotReceipt.product_group_id == product_group_id)
        if supplier_id:
            stmt = stmt.where(LotReceipt.supplier_id == supplier_id)

        stmt = stmt.group_by(func.date(StockHistory.transaction_date)).order_by(
            func.date(StockHistory.transaction_date)
        )

        rows = self.db.execute(stmt).all()

        return [
            DailyIntakeSummary(
                date=row.intake_date,
                count=int(row.intake_count),
                total_quantity=row.total_quantity or Decimal("0"),
            )
            for row in rows
        ]
