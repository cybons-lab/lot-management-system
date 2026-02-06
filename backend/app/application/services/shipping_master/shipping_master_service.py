"""出荷用マスタサービス."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.application.services.shipping_master.shipping_master_sync_service import (
    ShippingMasterSyncService,
    SyncPolicy,
)
from app.infrastructure.persistence.models.masters_models import Customer, Supplier
from app.infrastructure.persistence.models.sap_models import SapMaterialCache
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
        prefill_result = self.prefill_curated_for_sync(curated_ids=curated_ids)
        sync_service = ShippingMasterSyncService(self.session)
        summary = sync_service.sync_batch(curated_ids=curated_ids, policy=policy)
        return {
            "processed_count": summary.processed_count,
            "created_count": summary.created_count,
            "updated_count": summary.updated_count,
            "skipped_count": summary.skipped_count,
            "errors": summary.errors,
            "warnings": [*prefill_result["warnings"], *summary.warnings],
            "prefill_updated_count": prefill_result["updated_count"],
            "processed": summary.processed_count,
            "created": summary.created_count,
            "updated": summary.updated_count,
            "skipped": summary.skipped_count,
        }

    def prefill_curated_for_sync(self, curated_ids: list[int] | None = None) -> dict[str, Any]:
        """同期前に出荷用マスタ空欄を補完する.

        - customer_name: customers から補完
        - supplier_code: SAPキャッシュ(customer_code + material_code)から補完
        - supplier_name: suppliers / SAPキャッシュから補完
        """
        stmt = select(ShippingMasterCurated)
        if curated_ids:
            stmt = stmt.where(ShippingMasterCurated.id.in_(curated_ids))
        curated_rows = list(self.session.execute(stmt).scalars().all())
        if not curated_rows:
            return {"updated_count": 0, "warnings": []}

        def is_blank(value: str | None) -> bool:
            return value is None or value.strip() == ""

        customer_code_set = {r.customer_code for r in curated_rows if r.customer_code}
        supplier_code_set = {
            r.supplier_code for r in curated_rows if r.supplier_code and r.supplier_code.strip()
        }
        key_set = {
            (r.customer_code.strip(), r.material_code.strip())
            for r in curated_rows
            if r.customer_code
            and r.material_code
            and r.customer_code.strip()
            and r.material_code.strip()
        }

        customer_name_map = {
            c.customer_code: c.customer_name
            for c in self.session.execute(
                select(Customer).where(Customer.customer_code.in_(customer_code_set))
            )
            .scalars()
            .all()
            if c.customer_code and c.customer_name
        }

        supplier_name_map = {
            s.supplier_code: s.supplier_name
            for s in self.session.execute(
                select(Supplier).where(Supplier.supplier_code.in_(supplier_code_set))
            )
            .scalars()
            .all()
            if s.supplier_code and s.supplier_name
        }

        def _extract_supplier_code(raw_data: dict[str, Any]) -> str | None:
            for key in ("ZLIFNR_H", "LIFNR", "supplier_code"):
                value = raw_data.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
            return None

        def _extract_supplier_name(raw_data: dict[str, Any]) -> str | None:
            for key in (
                "ZLIFNR_NAME",
                "ZLIFNR_TXT",
                "NAME1",
                "LIFNR_NAME",
                "supplier_name",
            ):
                value = raw_data.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
            return None

        sap_stmt = select(SapMaterialCache).where(SapMaterialCache.kunnr.in_(customer_code_set))
        sap_records = list(self.session.execute(sap_stmt).scalars().all())
        sap_supplier_code_map: dict[tuple[str, str], str] = {}
        sap_supplier_name_map: dict[tuple[str, str], str] = {}
        for rec in sap_records:
            customer_code = (rec.kunnr or "").strip()
            material_code = (rec.zkdmat_b or "").strip()
            if not customer_code or not material_code:
                continue
            key = (customer_code, material_code)
            if key not in key_set:
                continue
            raw_data = rec.raw_data or {}
            if key not in sap_supplier_code_map:
                supplier_code = _extract_supplier_code(raw_data)
                if supplier_code:
                    sap_supplier_code_map[key] = supplier_code
            if key not in sap_supplier_name_map:
                supplier_name = _extract_supplier_name(raw_data)
                if supplier_name:
                    sap_supplier_name_map[key] = supplier_name

        updated_count = 0
        warnings: list[str] = []
        for row in curated_rows:
            changed = False
            row_customer_code = (row.customer_code or "").strip()
            row_material_code = (row.material_code or "").strip()
            key = (row_customer_code, row_material_code)

            if is_blank(row.customer_name) and row_customer_code:
                customer_name = customer_name_map.get(row_customer_code)
                if customer_name:
                    row.customer_name = customer_name
                    changed = True

            if is_blank(row.supplier_code) and key in sap_supplier_code_map:
                row.supplier_code = sap_supplier_code_map[key]
                changed = True
                if row.supplier_code and row.supplier_code not in supplier_name_map:
                    supplier = self.session.execute(
                        select(Supplier).where(Supplier.supplier_code == row.supplier_code)
                    ).scalar_one_or_none()
                    if supplier and supplier.supplier_name:
                        supplier_name_map[supplier.supplier_code] = supplier.supplier_name

            if is_blank(row.supplier_name):
                supplier_name = None
                if row.supplier_code:
                    supplier_name = supplier_name_map.get(row.supplier_code.strip())
                if not supplier_name:
                    supplier_name = sap_supplier_name_map.get(key)
                if supplier_name:
                    row.supplier_name = supplier_name
                    changed = True

            if changed:
                updated_count += 1

            if is_blank(row.supplier_code) and row_customer_code and row_material_code:
                warnings.append(
                    f"ID {row.id}: 仕入先コードを補完できませんでした "
                    f"(得意先={row_customer_code}, 材質コード={row_material_code})"
                )

        if updated_count > 0:
            self.session.flush()

        return {"updated_count": updated_count, "warnings": warnings}

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

        curated.updated_at = datetime.now(UTC)
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
