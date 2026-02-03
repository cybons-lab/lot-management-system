"""出荷用マスタサービス."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.application.services.shipping_master.shipping_master_sync_service import (
    ShippingMasterSyncService,
    SyncPolicy,
)
from app.infrastructure.persistence.models.shipping_master_models import (
    ShippingMasterCurated,
    ShippingMasterRaw,
)


if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class ShippingMasterService:
    """出荷用マスタデータの管理サービス."""

    def __init__(self, session: Session) -> None:
        self.session = session

    # ==================== Raw Data ====================

    def import_raw_data(self, rows: list[dict]) -> tuple[int, list[str]]:
        """Excelファイルから生データを取り込む.

        Args:
            rows: Excelから読み込んだ行データのリスト

        Returns:
            (投入件数, エラーメッセージリスト)
        """
        batch_id = f"IMPORT_{uuid.uuid4().hex[:12].upper()}"
        errors: list[str] = []
        count = 0

        for i, row in enumerate(rows, start=2):  # Excel行番号（ヘッダー=1）
            try:
                raw = ShippingMasterRaw(
                    customer_code=row.get("得意先コード"),
                    material_code=row.get("材質コード"),
                    jiku_code=row.get("次区"),
                    warehouse_code=row.get("倉庫コード"),
                    delivery_note_product_name=row.get("素材納品書記載製品名"),
                    customer_part_no=row.get("先方品番"),
                    maker_part_no=row.get("メーカー品番"),
                    order_flag=row.get("発注"),
                    maker_code=row.get("メーカー"),
                    maker_name=row.get("メーカー名"),
                    supplier_code=row.get("仕入先コード"),
                    staff_name=row.get("担当者名"),
                    delivery_place_abbr=row.get("納入先略称"),
                    delivery_place_code=row.get("納入先コード"),
                    delivery_place_name=row.get("納入先"),
                    shipping_warehouse=row.get("出荷倉庫"),
                    shipping_slip_text=row.get("出荷票テキスト"),
                    transport_lt_days=self._parse_int(row.get("輸送LT(営業日)")),
                    order_existence=row.get("発注の有無"),
                    remarks=row.get("備考"),
                    row_index=i,
                    import_batch_id=batch_id,
                )
                self.session.add(raw)
                count += 1
            except Exception as e:
                errors.append(f"行{i}: {e!s}")

        self.session.flush()
        return count, errors

    def _parse_int(self, value: str | int | None) -> int | None:
        """整数値をパース."""
        if value is None or value == "":
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None

    # ==================== Curated Data ====================

    def curate_from_raw(
        self,
        batch_id: str | None = None,
        auto_sync: bool = False,
        sync_policy: SyncPolicy = "create-only",
    ) -> tuple[int, list[str]]:
        """生データから整形済みデータを生成.

        Args:
            batch_id: 特定バッチのみ処理する場合のID
            auto_sync: 同時にマスタ同期を実行するか
            sync_policy: 同期ポリシー

        Returns:
            (投入件数, 警告メッセージリスト)
        """
        stmt = select(ShippingMasterRaw)
        if batch_id:
            stmt = stmt.where(ShippingMasterRaw.import_batch_id == batch_id)

        raw_records = self.session.execute(stmt).scalars().all()
        warnings: list[str] = []
        count = 0
        curated_ids: list[int] = []

        for raw in raw_records:
            if not raw.customer_code or not raw.material_code or not raw.jiku_code:
                warnings.append(f"行{raw.row_index}: キー項目が不足")
                continue

            try:
                with self.session.begin_nested():
                    curated = ShippingMasterCurated(
                        raw_id=raw.id,
                        customer_code=raw.customer_code,
                        material_code=raw.material_code,
                        jiku_code=raw.jiku_code,
                        warehouse_code=raw.warehouse_code,
                        customer_name=None,
                        delivery_note_product_name=raw.delivery_note_product_name,
                        customer_part_no=raw.customer_part_no,
                        maker_part_no=raw.maker_part_no,
                        maker_code=raw.maker_code,
                        maker_name=raw.maker_name,
                        supplier_code=raw.supplier_code,
                        supplier_name=None,
                        staff_name=raw.staff_name,
                        delivery_place_code=raw.delivery_place_code,
                        delivery_place_name=raw.delivery_place_name,
                        delivery_place_abbr=raw.delivery_place_abbr,
                        shipping_warehouse=raw.shipping_warehouse,
                        shipping_slip_text=raw.shipping_slip_text,
                        transport_lt_days=raw.transport_lt_days,
                        order_flag=raw.order_flag,
                        order_existence=raw.order_existence,
                        has_order=raw.order_flag == "○" or raw.order_existence == "有",
                        remarks=raw.remarks,
                        has_duplicate_warning=False,
                    )
                    self.session.add(curated)
                    self.session.flush()
                    curated_ids.append(curated.id)
                    count += 1
            except IntegrityError:
                # begin_nested のおかげで、ここに来る時点でこの行の add 分だけがロールバックされている
                warnings.append(
                    f"行{raw.row_index}: キー重複（{raw.customer_code}/{raw.material_code}/{raw.jiku_code}）"
                )

        self.session.commit()

        if auto_sync and curated_ids:
            sync_service = ShippingMasterSyncService(self.session)
            summary = sync_service.sync_batch(curated_ids=curated_ids, policy=sync_policy)
            for err in summary.errors:
                warnings.append(f"同期エラー: {err}")
            for warn in summary.warnings:
                warnings.append(f"同期警告: {warn}")

        return count, warnings

    def sync_to_masters(
        self, curated_ids: list[int] | None = None, policy: SyncPolicy = "create-only"
    ) -> dict[str, Any]:
        """各種マスタへの同期を手動実行."""
        sync_service = ShippingMasterSyncService(self.session)
        summary = sync_service.sync_batch(curated_ids=curated_ids, policy=policy)
        return {
            "processed": summary.processed_count,
            "created": summary.created_count,
            "updated": summary.updated_count,
            "skipped": summary.skipped_count,
            "errors": summary.errors,
            "warnings": summary.warnings,
        }

    # ==================== CRUD ====================

    def list_curated(
        self,
        customer_code: str | None = None,
        material_code: str | None = None,
        jiku_code: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ShippingMasterCurated]:
        """整形済みマスタ一覧を取得."""
        stmt = select(ShippingMasterCurated)

        if customer_code:
            stmt = stmt.where(ShippingMasterCurated.customer_code == customer_code)
        if material_code:
            stmt = stmt.where(ShippingMasterCurated.material_code == material_code)
        if jiku_code:
            stmt = stmt.where(ShippingMasterCurated.jiku_code == jiku_code)

        stmt = (
            stmt.order_by(
                ShippingMasterCurated.customer_code,
                ShippingMasterCurated.material_code,
                ShippingMasterCurated.jiku_code,
            )
            .offset(offset)
            .limit(limit)
        )

        return list(self.session.execute(stmt).scalars().all())

    def get_curated_by_id(self, curated_id: int) -> ShippingMasterCurated | None:
        """IDで整形済みマスタを取得."""
        return cast(
            ShippingMasterCurated | None, self.session.get(ShippingMasterCurated, curated_id)
        )

    def get_curated_by_key(
        self,
        customer_code: str,
        material_code: str,
        jiku_code: str,
    ) -> ShippingMasterCurated | None:
        """キーで整形済みマスタを取得."""
        stmt = (
            select(ShippingMasterCurated)
            .where(ShippingMasterCurated.customer_code == customer_code)
            .where(ShippingMasterCurated.material_code == material_code)
            .where(ShippingMasterCurated.jiku_code == jiku_code)
        )
        return cast(ShippingMasterCurated | None, self.session.execute(stmt).scalar_one_or_none())

    def create_curated(self, data: dict) -> ShippingMasterCurated:
        """整形済みマスタを新規作成."""
        curated = ShippingMasterCurated(
            customer_code=data["customer_code"],
            material_code=data["material_code"],
            jiku_code=data["jiku_code"],
            warehouse_code=data.get("warehouse_code"),
            customer_name=data.get("customer_name"),
            delivery_note_product_name=data.get("delivery_note_product_name"),
            customer_part_no=data.get("customer_part_no"),
            maker_part_no=data.get("maker_part_no"),
            maker_code=data.get("maker_code"),
            maker_name=data.get("maker_name"),
            supplier_code=data.get("supplier_code"),
            supplier_name=data.get("supplier_name"),
            staff_name=data.get("staff_name"),
            delivery_place_code=data.get("delivery_place_code"),
            delivery_place_name=data.get("delivery_place_name"),
            delivery_place_abbr=data.get("delivery_place_abbr"),
            shipping_warehouse=data.get("shipping_warehouse"),
            shipping_slip_text=data.get("shipping_slip_text"),
            transport_lt_days=data.get("transport_lt_days"),
            order_flag=data.get("order_flag"),
            order_existence=data.get("order_existence"),
            has_order=data.get("has_order", False),
            remarks=data.get("remarks"),
            has_duplicate_warning=False,
        )
        self.session.add(curated)
        self.session.flush()
        return curated

    def update_curated(self, curated_id: int, data: dict) -> ShippingMasterCurated | None:
        """整形済みマスタを更新."""
        curated = self.get_curated_by_id(curated_id)
        if not curated:
            return None

        for key, value in data.items():
            if hasattr(curated, key) and key not in ("id", "created_at"):
                setattr(curated, key, value)

        curated.updated_at = datetime.now()  # noqa: DTZ005
        self.session.flush()
        return curated

    def delete_curated(self, curated_id: int) -> bool:
        """整形済みマスタを削除."""
        curated = self.get_curated_by_id(curated_id)
        if not curated:
            return False

        self.session.delete(curated)
        self.session.flush()
        return True

    def delete_all(self) -> None:
        """全ての出荷用マスタデータを削除（管理者専用）."""
        self.session.query(ShippingMasterCurated).delete()
        self.session.query(ShippingMasterRaw).delete()
        self.session.commit()

    def get_export_data(self) -> list[ShippingMasterCurated]:
        """エクスポート用データを取得."""
        return self.list_curated(limit=10000)

    @staticmethod
    def get_export_column_map() -> dict[str, str]:
        """エクスポート用カラムマッピングを取得."""
        return {
            "material_code": "材質コード",
            "jiku_code": "次区",
            "warehouse_code": "倉庫コード",
            "delivery_note_product_name": "素材納品書記載製品名",
            "customer_part_no": "先方品番",
            "maker_part_no": "メーカー品番",
            "order_flag": "発注",
            "maker_code": "メーカー",
            "maker_name": "メーカー名",
            "supplier_code": "仕入先コード",
            "staff_name": "担当者名",
            "delivery_place_abbr": "納入先略称",
            "delivery_place_code": "納入先コード",
            "delivery_place_name": "納入先",
            "shipping_warehouse": "出荷倉庫",
            "shipping_slip_text": "出荷票テキスト",
            "transport_lt_days": "輸送LT(営業日)",
            "order_existence": "発注の有無",
            "remarks": "備考",
            "has_order": "アプリ発注対象フラグ",
            "has_duplicate_warning": "重複警告",
            "created_at": "作成日時",
            "updated_at": "更新日時",
        }
