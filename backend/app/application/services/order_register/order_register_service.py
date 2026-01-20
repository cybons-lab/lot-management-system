"""受注登録結果サービス.

OCR縦持ちデータと出荷用マスタを結合して、
受注情報登録Excel出力用のデータを生成する。
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, cast

from sqlalchemy import select

from app.infrastructure.persistence.models.shipping_master_models import (
    OrderRegisterRow,
    ShippingMasterCurated,
)
from app.infrastructure.persistence.models.smartread_models import SmartReadLongData


if TYPE_CHECKING:
    from sqlalchemy.orm import Session

from app.application.services.calendar_service import CalendarService
from app.presentation.schemas.calendar.calendar_schemas import BusinessDayCalculationRequest


class OrderRegisterService:
    """受注登録結果管理サービス."""

    # 固定得意先コード（OCRデータに得意先コードがない場合のデフォルト値）
    DEFAULT_CUSTOMER_CODE = "100427105"

    def __init__(self, session: Session) -> None:
        self.session = session
        self.calendar_service = CalendarService(session)

    def generate_from_ocr(self, task_date: date) -> tuple[int, list[str]]:
        """OCR縦持ちデータからマスタ参照して受注登録結果を生成.

        Args:
            task_date: 対象日

        Returns:
            (生成件数, 警告メッセージリスト)
        """
        # OCR縦持ちデータ取得
        stmt = (
            select(SmartReadLongData)
            .where(SmartReadLongData.task_date == task_date)
            .where(SmartReadLongData.status == "PENDING")
        )
        long_data_list = list(self.session.execute(stmt).scalars().all())

        warnings: list[str] = []
        count = 0

        for long_data in long_data_list:
            content = long_data.content

            # OCRから必要なフィールドを取得
            material_code = content.get("材質コード")
            customer_code = content.get("得意先コード") or self.DEFAULT_CUSTOMER_CODE
            jiku_code = content.get("次区")

            # マスタ参照（得意先 × 材質 × 次区）
            shipping_master = None
            if customer_code and material_code and jiku_code:
                shipping_master = self._get_shipping_master(customer_code, material_code, jiku_code)

            # 受注登録結果行を作成
            row = self._create_order_register_row(
                long_data=long_data,
                task_date=task_date,
                content=content,
                shipping_master=shipping_master,
            )

            if not shipping_master:
                warnings.append(
                    f"行{long_data.row_index}: マスタデータが見つかりません "
                    f"({customer_code}/{material_code}/{jiku_code})"
                )

            self.session.add(row)
            count += 1

        self.session.flush()
        return count, warnings

    def _get_shipping_master(
        self, customer_code: str, material_code: str, jiku_code: str
    ) -> ShippingMasterCurated | None:
        """出荷用マスタを取得."""
        stmt = (
            select(ShippingMasterCurated)
            .where(ShippingMasterCurated.customer_code == customer_code)
            .where(ShippingMasterCurated.material_code == material_code)
            .where(ShippingMasterCurated.jiku_code == jiku_code)
        )
        return cast(ShippingMasterCurated | None, self.session.execute(stmt).scalar_one_or_none())

    def _create_order_register_row(
        self,
        long_data: SmartReadLongData,
        task_date: date,
        content: dict,
        shipping_master: ShippingMasterCurated | None,
    ) -> OrderRegisterRow:
        """受注登録結果行を作成."""
        row = OrderRegisterRow(
            long_data_id=long_data.id,
            curated_master_id=shipping_master.id if shipping_master else None,
            task_date=task_date,
            # OCR由来
            inbound_no=content.get("入庫No"),
            delivery_date=self._parse_date(content.get("納期")),
            delivery_quantity=self._parse_int(content.get("納入量")),
            item_no=content.get("アイテムNo"),
            quantity_unit=content.get("数量単位"),
            # OCRまたはマスタ
            material_code=content.get("材質コード"),
            jiku_code=content.get("次区")
            or (shipping_master.jiku_code if shipping_master else None),
            customer_part_no=content.get("先方品番")
            or (shipping_master.customer_part_no if shipping_master else None),
            maker_part_no=content.get("メーカー品番")
            or (shipping_master.maker_part_no if shipping_master else None),
            # マスタ由来
            source="OCR",
            customer_code=shipping_master.customer_code
            if shipping_master
            else (content.get("得意先コード") or self.DEFAULT_CUSTOMER_CODE),
            customer_name=shipping_master.customer_name if shipping_master else None,
            supplier_code=shipping_master.supplier_code if shipping_master else None,
            supplier_name=shipping_master.supplier_name if shipping_master else None,
            shipping_warehouse_code=shipping_master.shipping_warehouse_code
            if shipping_master
            else None,
            shipping_warehouse_name=shipping_master.shipping_warehouse_name
            if shipping_master
            else None,
            delivery_place_code=shipping_master.delivery_place_code if shipping_master else None,
            delivery_place_name=shipping_master.delivery_place_name if shipping_master else None,
            shipping_slip_text=self._format_shipping_slip_text(
                shipping_master.shipping_slip_text, None, None, None, None
            )
            if shipping_master
            else None,
            remarks=shipping_master.remarks if shipping_master else None,
            # 出荷日計算
            shipping_date=self._calculate_shipping_date(
                self._parse_date(content.get("納期")),
                shipping_master.transport_lt_days if shipping_master else 0,
            ),
            # ステータス
            status="PENDING",
        )
        return row

    def _calculate_shipping_date(
        self, delivery_date: date | None, transport_lt_days: int | None
    ) -> date | None:
        """リードタイムを考慮して出荷日を計算."""
        if not delivery_date or transport_lt_days is None:
            return delivery_date

        request = BusinessDayCalculationRequest(
            start_date=delivery_date,
            days=transport_lt_days,
            direction="before",
            include_start=False,
        )
        return self.calendar_service.calculate_business_day(request)

    def _format_shipping_slip_text(
        self,
        base_text: str | None,
        lot1: str | None,
        qty1: int | None,
        lot2: str | None,
        qty2: int | None,
    ) -> str | None:
        """出荷票テキストのロット部分を置換."""
        if not base_text:
            return None

        lot_info = []
        if lot1:
            lot_info.append(f"{lot1}({qty1 or 0})")
        if lot2:
            lot_info.append(f"{lot2}({qty2 or 0})")

        lot_string = "、".join(lot_info)
        return (
            base_text.replace("ロット番号(数量)", lot_string)
            if lot_string
            else base_text.replace("ロット番号(数量)", "")
        )

    def _parse_date(self, value: str | date | None) -> date | None:
        """日付をパース."""
        if value is None or value == "":
            return None
        if isinstance(value, date):
            return value
        # TODO: 文字列から日付パース実装
        return None

    def _parse_int(self, value: str | int | None) -> int | None:
        """整数をパース."""
        if value is None or value == "":
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None

    # ==================== CRUD ====================

    def list_order_register_rows(
        self,
        task_date: date | None = None,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[OrderRegisterRow]:
        """受注登録結果一覧を取得."""
        stmt = select(OrderRegisterRow)

        if task_date:
            stmt = stmt.where(OrderRegisterRow.task_date == task_date)
        if status:
            stmt = stmt.where(OrderRegisterRow.status == status)

        stmt = (
            stmt.order_by(OrderRegisterRow.task_date.desc(), OrderRegisterRow.id)
            .offset(offset)
            .limit(limit)
        )

        return list(self.session.execute(stmt).scalars().all())

    def get_order_register_row(self, row_id: int) -> OrderRegisterRow | None:
        """受注登録結果を取得."""
        return cast(OrderRegisterRow | None, self.session.get(OrderRegisterRow, row_id))

    def update_lot_assignments(
        self,
        row_id: int,
        lot_no_1: str | None,
        quantity_1: int | None,
        lot_no_2: str | None,
        quantity_2: int | None,
    ) -> OrderRegisterRow | None:
        """ロット割当を更新."""
        row = self.get_order_register_row(row_id)
        if not row:
            return None

        row.lot_no_1 = lot_no_1
        row.quantity_1 = quantity_1
        row.lot_no_2 = lot_no_2
        row.quantity_2 = quantity_2

        # 出荷票テキストを更新（もしマスタが紐づいていれば）
        if row.curated_master_id:
            master = self.session.get(ShippingMasterCurated, row.curated_master_id)
            if master:
                row.shipping_slip_text = self._format_shipping_slip_text(
                    master.shipping_slip_text, lot_no_1, quantity_1, lot_no_2, quantity_2
                )

        self.session.flush()
        return row
