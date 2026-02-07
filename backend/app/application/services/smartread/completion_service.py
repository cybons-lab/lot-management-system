import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.services.sap.sap_reconciliation_service import SapReconciliationService
from app.infrastructure.persistence.models.smartread_models import (
    OcrResultEdit,
    OcrResultEditCompleted,
    SmartReadLongData,
    SmartReadLongDataCompleted,
)


logger = logging.getLogger(__name__)


class SmartReadCompletionService:
    def __init__(self, db: Session):
        self.db = db

    def mark_as_completed(self, ids: list[int]) -> int:
        """Mark items as completed by moving them to history tables."""
        if not ids:
            return 0

        logger.info("Completion started", extra={"ids_count": len(ids)})

        # Fetch active data
        active_items = self.db.scalars(
            select(SmartReadLongData).where(SmartReadLongData.id.in_(ids))
        ).all()

        # SAP Reconciliation Service
        sap_service = SapReconciliationService(self.db)
        sap_service.load_sap_cache(kunnr="100427105")

        if not active_items:
            return 0

        # Fetch associated edits
        active_edits = self.db.scalars(
            select(OcrResultEdit).where(
                OcrResultEdit.smartread_long_data_id.in_([item.id for item in active_items])
            )
        ).all()
        edits_map = {edit.smartread_long_data_id: edit for edit in active_edits}

        moved_count = 0
        for item in active_items:
            # Fetch associated edit
            edit = edits_map.get(item.id)

            # [NEW] Skip if has error
            # Check if edit exists and has error flags
            has_error = False
            if edit and edit.error_flags:
                # error_flags is expected to be a dict e.g. {"master_error": True, ...}
                # If any value is True, treat as error.
                if any(edit.error_flags.values()):
                    has_error = True

            # Additional check: If item status is "ERROR"? (If applicable)
            # if item.status == "ERROR": has_error = True

            if has_error:
                logger.debug("Completion skipped (has error)", extra={"item_id": item.id})
                continue

            # Create completed item
            completed_item = SmartReadLongDataCompleted(
                original_id=item.id,
                wide_data_id=item.wide_data_id,
                config_id=item.config_id,
                task_id=item.task_id,
                task_date=item.task_date,
                request_id_ref=item.request_id_ref,
                row_index=item.row_index,
                content=item.content,
                status="COMPLETED",
                sap_order_no=item.sap_order_no,
                created_at=item.created_at,
            )
            self.db.add(completed_item)
            self.db.flush()  # to get ID

            # Perform final SAP reconciliation for snapshot
            customer_code = item.content.get("得意先コード") or "100427105"
            material_code = (
                (edit.material_code if edit else None)
                or item.content.get("材質コード")
                or item.content.get("材料コード")
            )
            jiku_code = (edit.jiku_code if edit else None) or item.content.get("次区")

            sap_result = (
                sap_service.reconcile_single(
                    material_code=material_code, jiku_code=jiku_code, customer_code=customer_code
                )
                if material_code
                else None
            )

            # Create completed edit record (always, to store SAP snapshot)
            completed_edit = OcrResultEditCompleted(
                original_id=edit.id if edit else None,
                smartread_long_data_completed_id=completed_item.id,
                lot_no_1=edit.lot_no_1 if edit else None,
                quantity_1=edit.quantity_1 if edit else None,
                lot_no_2=edit.lot_no_2 if edit else None,
                quantity_2=edit.quantity_2 if edit else None,
                inbound_no=edit.inbound_no if edit else None,
                inbound_no_2=edit.inbound_no_2 if edit else None,
                shipping_date=edit.shipping_date if edit else None,
                shipping_slip_text=edit.shipping_slip_text if edit else None,
                shipping_slip_text_edited=edit.shipping_slip_text_edited if edit else False,
                jiku_code=edit.jiku_code if edit else None,
                material_code=edit.material_code if edit else None,
                delivery_quantity=edit.delivery_quantity if edit else None,
                delivery_date=edit.delivery_date if edit else None,
                process_status="completed",
                error_flags=edit.error_flags if edit else {},
                # SAP Snapshot data
                sap_match_type=sap_result.sap_match_type.value if sap_result else None,
                sap_matched_zkdmat_b=sap_result.sap_matched_zkdmat_b if sap_result else None,
                sap_supplier_code=sap_result.sap_raw_data.get("ZLIFNR_H")
                if sap_result and sap_result.sap_raw_data
                else None,
                sap_qty_unit=sap_result.sap_raw_data.get("MEINS")
                if sap_result and sap_result.sap_raw_data
                else None,
                sap_maker_item=sap_result.sap_raw_data.get("ZMKMAT_B")
                if sap_result and sap_result.sap_raw_data
                else None,
                created_at=edit.created_at if edit else datetime.now(),
                updated_at=edit.updated_at if edit else datetime.now(),
            )
            self.db.add(completed_edit)
            if edit:
                self.db.delete(edit)

            # Delete active item
            self.db.delete(item)
            moved_count += 1

        self.db.commit()
        logger.info(
            "Completion finished", extra={"moved_count": moved_count, "total_requested": len(ids)}
        )
        return moved_count

    def restore_items(self, ids: list[int]) -> int:
        """Restore items from history to active tables.

        Args:
            ids: List of SmartReadLongDataCompleted.id to restore
        """
        if not ids:
            return 0

        logger.info("Restore started", extra={"ids_count": len(ids)})

        # Fetch completed items
        completed_items = self.db.scalars(
            select(SmartReadLongDataCompleted).where(SmartReadLongDataCompleted.id.in_(ids))
        ).all()

        if not completed_items:
            return 0

        # Fetch associated completed edits
        completed_edits = self.db.scalars(
            select(OcrResultEditCompleted).where(
                OcrResultEditCompleted.smartread_long_data_completed_id.in_(
                    [item.id for item in completed_items]
                )
            )
        ).all()
        edits_map = {edit.smartread_long_data_completed_id: edit for edit in completed_edits}

        restored_count = 0
        for comp_item in completed_items:
            # Restore to active
            # We use comp_item.original_id if we want to try to preserve ID,
            # but usually auto-inc PKs shouldn't be forced unless we are sure.
            # However, if we don't preserve ID, 'wide_data' relation might be fine (it's just an ID),
            # but usually restoring as a "new"ID is safer to avoid conflicts if ID was reused.
            # BUT, we saved `original_id`. Let's try to ignore it for PK and let DB assign new ID,
            # or use it if we are sure it's free.
            # Given `ForecastHistory` doesn't seem to restore, we are blazing new trails here.
            # Safest: Let DB assign new ID.

            active_item = SmartReadLongData(
                wide_data_id=comp_item.wide_data_id,
                config_id=comp_item.config_id,
                task_id=comp_item.task_id,
                task_date=comp_item.task_date,
                request_id_ref=comp_item.request_id_ref,
                row_index=comp_item.row_index,
                content=comp_item.content,
                status="PENDING",  # Reset status to pending or IMPORTED? Users usually want to edit it again.
                created_at=comp_item.created_at,
            )
            self.db.add(active_item)
            self.db.flush()  # Get new ID

            # Restore edit
            comp_edit = edits_map.get(comp_item.id)
            if comp_edit:
                active_edit = OcrResultEdit(
                    smartread_long_data_id=active_item.id,
                    lot_no_1=comp_edit.lot_no_1,
                    quantity_1=comp_edit.quantity_1,
                    lot_no_2=comp_edit.lot_no_2,
                    quantity_2=comp_edit.quantity_2,
                    inbound_no=comp_edit.inbound_no,
                    inbound_no_2=comp_edit.inbound_no_2,
                    shipping_date=comp_edit.shipping_date,
                    shipping_slip_text=comp_edit.shipping_slip_text,
                    shipping_slip_text_edited=comp_edit.shipping_slip_text_edited,
                    jiku_code=comp_edit.jiku_code,
                    material_code=comp_edit.material_code,
                    delivery_quantity=comp_edit.delivery_quantity,
                    delivery_date=comp_edit.delivery_date,
                    process_status="pending",  # Reset status
                    error_flags=comp_edit.error_flags,
                    created_at=comp_edit.created_at,
                    updated_at=comp_edit.updated_at,
                )
                self.db.add(active_edit)
                self.db.delete(comp_edit)

            self.db.delete(comp_item)
            restored_count += 1

        self.db.commit()
        logger.info(
            "Restore finished",
            extra={"restored_count": restored_count, "total_requested": len(ids)},
        )
        return restored_count
