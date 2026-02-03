"""出荷用マスタ同期サービス."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    CustomerItemDeliverySetting,
    CustomerItemJikuMapping,
    DeliveryPlace,
    ProductMapping,
    Supplier,
    Warehouse,
    WarehouseDeliveryRoute,
)
from app.infrastructure.persistence.models.shipping_master_models import (
    ShippingMasterCurated,
)
from app.infrastructure.persistence.models.supplier_item_model import SupplierItem


if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

SyncPolicy = Literal["create-only", "upsert", "update-if-empty"]


@dataclass
class SyncSummary:
    """同期実行結果のサマリ."""

    processed_count: int = 0
    created_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


class ShippingMasterSyncService:
    """出荷用マスタデータを各種マスタへ同期するサービス."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def sync_batch(
        self,
        curated_ids: list[int] | None = None,
        policy: SyncPolicy = "create-only",
    ) -> SyncSummary:
        """指定された整形済みマスタをベースマスタへ同期する.

        Args:
            curated_ids: 同期対象のIDリスト。Noneの場合は全件（最新）
            policy: 反映ポリシー ('create-only', 'upsert', 'update-if-empty')

        Returns:
            SyncSummary: 実行結果のサマリ
        """
        summary = SyncSummary()

        # 1. 同期対象の取得
        stmt = select(ShippingMasterCurated)
        if curated_ids:
            stmt = stmt.where(ShippingMasterCurated.id.in_(curated_ids))

        curated_list = self.session.execute(stmt).scalars().all()
        summary.processed_count = len(curated_list)

        # 2. 依存順に同期処理
        # ループ内でキャッシュを活用してクエリ回数を抑制
        id_cache: dict[str, int] = {}

        for curated in curated_list:
            try:
                with self.session.begin_nested():
                    self._sync_row(curated, policy, summary, id_cache)
            except Exception as e:
                logger.exception(f"Sync error for curated_id {curated.id}")
                summary.errors.append(f"ID {curated.id} ({curated.customer_code}): {e!s}")
                summary.skipped_count += 1

        self.session.commit()
        return summary

    def _sync_row(
        self,
        curated: ShippingMasterCurated,
        policy: SyncPolicy,
        summary: SyncSummary,
        id_cache: dict[str, int],
    ) -> None:
        """1行分の同期処理."""
        # 1. Top-level masters (independent)
        customer_id = self._sync_customer(curated, policy, summary)
        supplier_id = self._sync_supplier(curated, policy, summary)
        warehouse_id = self._sync_warehouse(curated, policy, summary)

        # 2. Dependent masters
        dp_id = None
        if customer_id:
            dp_id = self._sync_delivery_place(curated, customer_id, policy, summary)

        si_id = None
        if supplier_id:
            si_id = self._sync_supplier_item(curated, supplier_id, policy, summary)

        ci_id = None
        if customer_id and si_id:
            ci_id = self._sync_customer_item(curated, customer_id, si_id, policy, summary)

        # 3. Third-level mappings/settings
        if ci_id:
            if dp_id:
                self._sync_jiku_mapping(curated, ci_id, dp_id, policy, summary)
                self._sync_delivery_setting(curated, ci_id, dp_id, policy, summary)

            if customer_id and supplier_id and si_id is not None:
                self._sync_product_mapping(
                    curated, customer_id, supplier_id, si_id, policy, summary
                )

        if warehouse_id and dp_id and si_id:
            self._sync_delivery_route(curated, warehouse_id, dp_id, si_id, policy, summary)

    # -------------------- 各マスタ同期メソッド --------------------

    def _should_update(self, entity: Any, data: dict[str, Any], policy: SyncPolicy) -> bool:
        """更新すべきか判定."""
        if policy == "create-only":
            return False

        if policy == "upsert":
            return True

        if policy == "update-if-empty":
            # 対象のフィールドが NULL または空文字の場合のみ更新対象とする
            for key in data:
                val = getattr(entity, key, None)
                if val is None or val == "":
                    return True
            return False

        return False

    def _apply_update(self, entity: Any, data: dict[str, Any], policy: SyncPolicy) -> bool:
        """データをエンティティに適用."""
        updated = False
        for key, value in data.items():
            current_val = getattr(entity, key, None)

            should_set = False
            if policy == "upsert":
                should_set = True
            elif policy == "update-if-empty":
                if current_val is None or current_val == "":
                    should_set = True

            if should_set and value is not None and value != current_val:
                setattr(entity, key, value)
                updated = True
        return updated

    def _sync_customer(
        self, curated: ShippingMasterCurated, policy: SyncPolicy, summary: SyncSummary
    ) -> int | None:
        if not curated.customer_code:
            return None

        stmt = select(Customer).where(Customer.customer_code == curated.customer_code)
        customer = self.session.execute(stmt).scalar_one_or_none()

        if not customer:
            name = curated.customer_name or curated.customer_code
            customer = Customer(
                customer_code=curated.customer_code,
                customer_name=name,
                display_name=name,
            )
            self.session.add(customer)
            self.session.flush()
            summary.created_count += 1
            return customer.id

        data: dict[str, Any] = {}
        if curated.customer_name:
            data["customer_name"] = curated.customer_name
            data["display_name"] = curated.customer_name

        if self._apply_update(customer, data, policy):
            summary.updated_count += 1
            self.session.flush()

        return customer.id

    def _sync_supplier(
        self, curated: ShippingMasterCurated, policy: SyncPolicy, summary: SyncSummary
    ) -> int | None:
        if not curated.supplier_code:
            return None

        stmt = select(Supplier).where(Supplier.supplier_code == curated.supplier_code)
        supplier = self.session.execute(stmt).scalar_one_or_none()

        if not supplier:
            name = curated.supplier_name or curated.supplier_code
            supplier = Supplier(
                supplier_code=curated.supplier_code,
                supplier_name=name,
                display_name=name,
            )
            self.session.add(supplier)
            self.session.flush()
            summary.created_count += 1
            return supplier.id

        data: dict[str, Any] = {}
        if curated.supplier_name:
            data["supplier_name"] = curated.supplier_name
            data["display_name"] = curated.supplier_name

        if self._apply_update(supplier, data, policy):
            summary.updated_count += 1
            self.session.flush()

        return supplier.id

    def _sync_warehouse(
        self, curated: ShippingMasterCurated, policy: SyncPolicy, summary: SyncSummary
    ) -> int | None:
        if not curated.shipping_warehouse_code:
            return None

        stmt = select(Warehouse).where(Warehouse.warehouse_code == curated.shipping_warehouse_code)
        warehouse = self.session.execute(stmt).scalar_one_or_none()

        if not warehouse:
            name = curated.shipping_warehouse_name or curated.shipping_warehouse_code
            warehouse = Warehouse(
                warehouse_code=curated.shipping_warehouse_code,
                warehouse_name=name,
                display_name=name,
                warehouse_type=None,  # DDLでNULL許容に変更
            )
            self.session.add(warehouse)
            self.session.flush()
            summary.created_count += 1
            return warehouse.id

        data: dict[str, Any] = {}
        if curated.shipping_warehouse_name:
            data["warehouse_name"] = curated.shipping_warehouse_name
            data["display_name"] = curated.shipping_warehouse_name

        if self._apply_update(warehouse, data, policy):
            summary.updated_count += 1
            self.session.flush()

        return warehouse.id

    def _sync_delivery_place(
        self,
        curated: ShippingMasterCurated,
        customer_id: int,
        policy: SyncPolicy,
        summary: SyncSummary,
    ) -> int | None:
        if not curated.delivery_place_code:
            return None

        # (jiku_code, delivery_place_code) のペアで検索
        stmt = select(DeliveryPlace).where(
            DeliveryPlace.jiku_code == curated.jiku_code,
            DeliveryPlace.delivery_place_code == curated.delivery_place_code,
        )
        dp = self.session.execute(stmt).scalar_one_or_none()

        if not dp:
            name = curated.delivery_place_name or curated.delivery_place_code
            dp = DeliveryPlace(
                customer_id=customer_id,
                jiku_code=curated.jiku_code,
                delivery_place_code=curated.delivery_place_code,
                delivery_place_name=name,
            )
            self.session.add(dp)
            self.session.flush()
            summary.created_count += 1
            return dp.id

        data: dict[str, Any] = (
            {"delivery_place_name": curated.delivery_place_name}
            if curated.delivery_place_name
            else {}
        )
        if self._apply_update(dp, data, policy):
            summary.updated_count += 1
            self.session.flush()

        return dp.id

    def _sync_supplier_item(
        self,
        curated: ShippingMasterCurated,
        supplier_id: int,
        policy: SyncPolicy,
        summary: SyncSummary,
    ) -> int | None:
        if not curated.maker_part_no:
            return None

        stmt = select(SupplierItem).where(
            SupplierItem.supplier_id == supplier_id,
            SupplierItem.maker_part_no == curated.maker_part_no,
        )
        si = self.session.execute(stmt).scalar_one_or_none()

        if not si:
            # 設計: 品名欠落時はスキップ
            if not curated.delivery_note_product_name:
                summary.warnings.append(
                    f"SupplierItem {curated.maker_part_no}: 品名欠落のためスキップ"
                )
                return None

            si = SupplierItem(
                supplier_id=supplier_id,
                maker_part_no=curated.maker_part_no,
                display_name=curated.delivery_note_product_name,
                base_unit="KG",  # デフォルト値
            )
            self.session.add(si)
            self.session.flush()
            summary.created_count += 1
            return si.id

        data: dict[str, Any] = (
            {"display_name": curated.delivery_note_product_name}
            if curated.delivery_note_product_name
            else {}
        )
        if self._apply_update(si, data, policy):
            summary.updated_count += 1
            self.session.flush()

        return si.id

    def _sync_customer_item(
        self,
        curated: ShippingMasterCurated,
        customer_id: int,
        si_id: int,
        policy: SyncPolicy,
        summary: SyncSummary,
    ) -> int | None:
        # customer_part_no がない場合は maker_part_no を代用（自動車業界の慣習）
        part_no = curated.customer_part_no or curated.maker_part_no
        if not part_no:
            return None

        stmt = select(CustomerItem).where(
            CustomerItem.customer_id == customer_id, CustomerItem.customer_part_no == part_no
        )
        ci = self.session.execute(stmt).scalar_one_or_none()

        if not ci:
            ci = CustomerItem(
                customer_id=customer_id,
                customer_part_no=part_no,
                supplier_item_id=si_id,
                base_unit="KG",
                special_instructions=curated.remarks,
            )
            self.session.add(ci)
            self.session.flush()
            summary.created_count += 1
            return ci.id

        data: dict[str, Any] = {}
        if curated.remarks:
            data["special_instructions"] = curated.remarks

        if self._apply_update(ci, data, policy):
            summary.updated_count += 1
            self.session.flush()

        return ci.id

    def _sync_jiku_mapping(
        self,
        curated: ShippingMasterCurated,
        ci_id: int,
        dp_id: int,
        policy: SyncPolicy,
        summary: SyncSummary,
    ) -> None:
        stmt = select(CustomerItemJikuMapping).where(
            CustomerItemJikuMapping.customer_item_id == ci_id,
            CustomerItemJikuMapping.jiku_code == curated.jiku_code,
        )
        mapping = self.session.execute(stmt).scalar_one_or_none()

        if not mapping:
            mapping = CustomerItemJikuMapping(
                customer_item_id=ci_id,
                jiku_code=curated.jiku_code,
                delivery_place_id=dp_id,
                is_default=True,  # 初回同期時はデフォルトとする方針
            )
            self.session.add(mapping)
            summary.created_count += 1
            self.session.flush()

    def _sync_delivery_setting(
        self,
        curated: ShippingMasterCurated,
        ci_id: int,
        dp_id: int,
        policy: SyncPolicy,
        summary: SyncSummary,
    ) -> None:
        # 船舶テキスト、リードタイム
        stmt = select(CustomerItemDeliverySetting).where(
            CustomerItemDeliverySetting.customer_item_id == ci_id,
            CustomerItemDeliverySetting.delivery_place_id == dp_id,
            CustomerItemDeliverySetting.jiku_code == curated.jiku_code,
        )
        setting = self.session.execute(stmt).scalar_one_or_none()

        if not setting:
            setting = CustomerItemDeliverySetting(
                customer_item_id=ci_id,
                delivery_place_id=dp_id,
                jiku_code=curated.jiku_code,
                shipment_text=curated.shipping_slip_text,
                lead_time_days=curated.transport_lt_days,
                is_default=True,
            )
            self.session.add(setting)
            summary.created_count += 1
            self.session.flush()
        else:
            data: dict[str, Any] = {}
            if curated.shipping_slip_text:
                data["shipment_text"] = curated.shipping_slip_text
            if curated.transport_lt_days is not None:
                data["lead_time_days"] = curated.transport_lt_days

            if self._apply_update(setting, data, policy):
                summary.updated_count += 1
                self.session.flush()

    def _sync_delivery_route(
        self,
        curated: ShippingMasterCurated,
        warehouse_id: int,
        dp_id: int,
        si_id: int,
        policy: SyncPolicy,
        summary: SyncSummary,
    ) -> None:
        if curated.transport_lt_days is None:
            return

        stmt = select(WarehouseDeliveryRoute).where(
            WarehouseDeliveryRoute.warehouse_id == warehouse_id,
            WarehouseDeliveryRoute.delivery_place_id == dp_id,
            WarehouseDeliveryRoute.supplier_item_id == si_id,
        )
        route = self.session.execute(stmt).scalar_one_or_none()

        if not route:
            route = WarehouseDeliveryRoute(
                warehouse_id=warehouse_id,
                delivery_place_id=dp_id,
                supplier_item_id=si_id,
                transport_lead_time_days=curated.transport_lt_days,
            )
            self.session.add(route)
            summary.created_count += 1
            self.session.flush()
        else:
            data: dict[str, Any] = {"transport_lead_time_days": curated.transport_lt_days}
            if self._apply_update(route, data, policy):
                summary.updated_count += 1
                self.session.flush()

    def _sync_product_mapping(
        self,
        curated: ShippingMasterCurated,
        customer_id: int,
        supplier_id: int,
        si_id: int,
        policy: SyncPolicy,
        summary: SyncSummary,
    ) -> None:
        part_no = curated.customer_part_no or curated.maker_part_no
        if not part_no:
            return

        stmt = select(ProductMapping).where(
            ProductMapping.customer_id == customer_id,
            ProductMapping.customer_part_code == part_no,
            ProductMapping.supplier_id == supplier_id,
        )
        mapping = self.session.execute(stmt).scalar_one_or_none()

        if not mapping:
            mapping = ProductMapping(
                customer_id=customer_id,
                customer_part_code=part_no,
                supplier_id=supplier_id,
                supplier_item_id=si_id,
                base_unit="KG",
                special_instructions=curated.remarks,
            )
            self.session.add(mapping)
            summary.created_count += 1
            self.session.flush()
        else:
            data: dict[str, Any] = {}
            if curated.remarks:
                data["special_instructions"] = curated.remarks

            if self._apply_update(mapping, data, policy):
                summary.updated_count += 1
                self.session.flush()
