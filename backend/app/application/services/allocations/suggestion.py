"""Allocation suggestions service (引当推奨サービス).

This module provides the main AllocationSuggestionService that composes
functionality from specialized sub-services.

For direct usage:
- PeriodAllocationSuggestionService: period-based operations
- GroupAllocationSuggestionService: customer/product group operations
"""

import logging
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import cast

from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.application.services.allocations.group_suggestion import (
    GroupAllocationSuggestionService,
)
from app.application.services.allocations.period_suggestion import (
    PeriodAllocationSuggestionService,
)
from app.application.services.allocations.suggestion_base import AllocationSuggestionBase
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.infrastructure.persistence.models.inventory_models import AllocationSuggestion
from app.infrastructure.persistence.models.orders_models import OrderLine
from app.presentation.schemas.allocations.allocation_suggestions_schema import (
    AllocationGap,
    AllocationStatsSummary,
    AllocationSuggestionPreviewResponse,
    AllocationSuggestionResponse,
)


logger = logging.getLogger(__name__)


class AllocationSuggestionService(AllocationSuggestionBase):
    """Service for allocation suggestions (引当推奨).

    This class provides a unified interface to all allocation suggestion
    functionality by delegating to specialized sub-services.
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        super().__init__(db)
        self._period_service = PeriodAllocationSuggestionService(db)
        self._group_service = GroupAllocationSuggestionService(db)

    def regenerate_for_periods(
        self, forecast_periods: list[str]
    ) -> AllocationSuggestionPreviewResponse:
        """Regenerate allocation suggestions for specified forecast periods.

        Args:
            forecast_periods: List of forecast periods (e.g. ["2025-11", "2025-12"])

        Returns:
            AllocationSuggestionPreviewResponse with suggestions, stats, and gaps.
        """
        return self._period_service.regenerate_for_periods(forecast_periods)

    def regenerate_for_group(
        self,
        customer_id: int,
        delivery_place_id: int,
        supplier_item_id: int,
        forecast_period: str | None = None,
    ) -> AllocationSuggestionPreviewResponse:
        """Regenerate allocation suggestions for a specific forecast group.

        Args:
            customer_id: 得意先ID
            delivery_place_id: 納入先ID
            supplier_item_id: 製品ID
            forecast_period: 期間 (YYYY-MM)、省略時は全期間

        Returns:
            AllocationSuggestionPreviewResponse with suggestions, stats, and gaps.
        """
        return self._group_service.regenerate_for_group(
            customer_id, delivery_place_id, supplier_item_id, forecast_period
        )

    def preview_for_order(self, order_line_id: int) -> AllocationSuggestionPreviewResponse:
        """Generate allocation suggestions for a specific order line (preview only, no save)."""
        order_line = self.db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
        if not order_line:
            return AllocationSuggestionPreviewResponse(
                suggestions=[],
                stats=AllocationStatsSummary(
                    total_forecast_quantity=Decimal(0),
                    total_allocated_quantity=Decimal(0),
                    total_shortage_quantity=Decimal(0),
                    per_key=[],
                ),
                gaps=[],
            )

        needed = order_line.order_quantity
        supplier_item_id = order_line.supplier_item_id

        # Fetch lots
        lots = self._fetch_available_lots([supplier_item_id or 0]).get(supplier_item_id or 0, [])

        suggestions = []
        allocated_total = Decimal("0")
        priority_counter = 1

        for lot in lots:
            if needed <= 0:
                break

            from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt

            available = get_available_quantity(self.db, cast(LotReceipt, lot))
            if available <= 0:
                continue

            alloc_qty = min(needed, available)

            # Create transient object (not added to session)
            s = AllocationSuggestion(
                order_line_id=order_line_id,
                forecast_period="PREVIEW",  # Dummy
                customer_id=order_line.order.customer_id,
                delivery_place_id=order_line.delivery_place_id,
                supplier_item_id=supplier_item_id,
                lot_id=lot.lot_id,
                quantity=alloc_qty,
                priority=priority_counter,
                allocation_type="soft",
                source="order_preview",
                lot=lot,
            )

            s.id = 0
            s.created_at = datetime.now(UTC)
            s.updated_at = datetime.now(UTC)

            suggestions.append(s)
            needed -= alloc_qty
            allocated_total += alloc_qty
            priority_counter += 1

        shortage = max(Decimal("0"), needed)

        stats = AllocationStatsSummary(
            total_forecast_quantity=order_line.order_quantity,
            total_allocated_quantity=allocated_total,
            total_shortage_quantity=shortage,
            per_key=[],
        )

        gaps = []
        if shortage > 0:
            gaps.append(
                AllocationGap(
                    customer_id=order_line.order.customer_id,
                    delivery_place_id=order_line.delivery_place_id,
                    supplier_item_id=supplier_item_id or 0,
                    forecast_period="PREVIEW",
                    shortage_quantity=shortage,
                )
            )

        return AllocationSuggestionPreviewResponse(
            suggestions=[
                AllocationSuggestionResponse.model_validate(s, from_attributes=True)
                for s in suggestions
            ],
            stats=stats,
            gaps=gaps,
        )

    def update_manual_suggestions(
        self,
        updates: list[dict],
    ) -> int:
        """Update multiple allocation suggestions manually.

        Args:
            updates: List of dicts with keys:
                customer_id, delivery_place_id, supplier_item_id,
                lot_id, forecast_period, quantity, coa_issue_date (optional),
                comment (optional, Phase 9.2), manual_shipment_date (optional, Phase 9.3)

        Returns:
            Number of records updated/created/deleted.
        """
        from app.infrastructure.persistence.models.forecast_models import ForecastCurrent

        lot_ids = {up.get("lot_id") for up in updates if up.get("lot_id") is not None}
        logger.info(
            "Manual allocation suggestions update started",
            extra={"update_count": len(updates), "lot_count": len(lot_ids)},
        )

        try:
            count = 0
            for up in updates:
                # 1. 既存の提案を検索
                items = (
                    self.db.query(AllocationSuggestion)
                    .filter(
                        AllocationSuggestion.customer_id == up["customer_id"],
                        AllocationSuggestion.delivery_place_id == up["delivery_place_id"],
                        AllocationSuggestion.supplier_item_id == up["supplier_item_id"],
                        AllocationSuggestion.lot_id == up["lot_id"],
                        AllocationSuggestion.forecast_period == up["forecast_period"],
                    )
                    .order_by(AllocationSuggestion.updated_at.desc())
                    .all()
                )

                quantity = Decimal(str(up["quantity"]))
                coa_date = None
                if up.get("coa_issue_date"):
                    if isinstance(up["coa_issue_date"], str):
                        coa_date = date.fromisoformat(up["coa_issue_date"])
                    else:
                        coa_date = up["coa_issue_date"]

                # Phase 9.2: Extract comment
                comment = up.get("comment")

                # Phase 9.3: Extract manual_shipment_date
                manual_shipment_date = None
                if up.get("manual_shipment_date"):
                    if isinstance(up["manual_shipment_date"], str):
                        manual_shipment_date = date.fromisoformat(up["manual_shipment_date"])
                    else:
                        manual_shipment_date = up["manual_shipment_date"]

                if items:
                    # manual_excelソースのレコードがあるか確認
                    manual_item = next(
                        (item for item in items if item.source == "manual_excel"), None
                    )

                    if (
                        quantity <= 0
                        and coa_date is None
                        and comment is None
                        and manual_shipment_date is None
                    ):
                        # 数量0かつCOA日付・コメント・手動出荷日すべてなしの場合
                        if manual_item:
                            # 手動レコードなら、あえて残す（マッピング保持のため）
                            manual_item.quantity = Decimal(0)
                            manual_item.coa_issue_date = None
                            manual_item.comment = None
                            manual_item.manual_shipment_date = None
                            # 他の重複（自動作成分など）を削除
                            for item in items:
                                if item.id != manual_item.id:
                                    self.db.delete(item)
                        else:
                            # 全て削除
                            for item in items:
                                self.db.delete(item)
                    else:
                        # 更新または統合
                        manual_item = next(
                            (item for item in items if item.source == "manual_excel"), None
                        )
                        target = manual_item or items[0]
                        target.quantity = quantity
                        target.coa_issue_date = coa_date
                        target.comment = comment  # Phase 9.2
                        target.manual_shipment_date = manual_shipment_date  # Phase 9.3
                        target.source = "manual_excel"
                        target.allocation_type = "soft"
                        # 他の重複を削除
                        for item in items:
                            if item.id != target.id:
                                self.db.delete(item)
                    count += len(items)
                elif (
                    quantity > 0
                    or coa_date is not None
                    or comment is not None
                    or manual_shipment_date is not None
                ):
                    # 対応するフォーキャストを取得（任意で紐付け）
                    forecast = (
                        self.db.query(ForecastCurrent)
                        .filter(
                            ForecastCurrent.customer_id == up["customer_id"],
                            ForecastCurrent.delivery_place_id == up["delivery_place_id"],
                            ForecastCurrent.supplier_item_id == up["supplier_item_id"],
                            ForecastCurrent.forecast_period == up["forecast_period"],
                        )
                        .first()
                    )

                    new_item = AllocationSuggestion(
                        customer_id=up["customer_id"],
                        delivery_place_id=up["delivery_place_id"],
                        supplier_item_id=up["supplier_item_id"],
                        lot_id=up["lot_id"],
                        forecast_period=up["forecast_period"],
                        quantity=quantity,
                        coa_issue_date=coa_date,
                        comment=comment,  # Phase 9.2
                        manual_shipment_date=manual_shipment_date,  # Phase 9.3
                        forecast_id=forecast.id if forecast else None,
                        allocation_type="soft",
                        source="manual_excel",
                    )
                    self.db.add(new_item)
                    count += 1

            self.db.commit()
            logger.info(
                "Manual allocation suggestions update completed",
                extra={"updated_count": count, "lot_count": len(lot_ids)},
            )
            return count
        except IntegrityError as exc:
            self.db.rollback()
            logger.error(
                "Database integrity error during manual suggestions update",
                extra={
                    "update_count": len(updates),
                    "lot_count": len(lot_ids),
                    "error": str(exc.orig)[:500] if exc.orig else str(exc)[:500],
                },
                exc_info=True,
            )
            raise
        except SQLAlchemyError as exc:
            self.db.rollback()
            logger.error(
                "Database operation failed during manual suggestions update",
                extra={
                    "update_count": len(updates),
                    "lot_count": len(lot_ids),
                    "error": str(exc)[:500],
                },
                exc_info=True,
            )
            raise
        except Exception as exc:
            self.db.rollback()
            logger.error(
                "Manual suggestions update failed",
                extra={
                    "update_count": len(updates),
                    "lot_count": len(lot_ids),
                    "error": str(exc)[:500],
                },
                exc_info=True,
            )
            raise
