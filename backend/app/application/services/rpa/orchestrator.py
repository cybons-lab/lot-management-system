import logging
from datetime import timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.application.services.rpa.csv_parser import parse_material_delivery_csv
from app.application.services.system_config_service import (
    ConfigKeys,
    SystemConfigService,
)
from app.core.config import settings
from app.core.time_utils import utcnow
from app.domain.rpa.state_manager import RpaStateManager
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.rpa_models import (
    RpaRun,
    RpaRunItem,
    RpaRunStatus,
)
from app.infrastructure.persistence.repositories.rpa_repository import RpaRepository
from app.infrastructure.rpa.flow_client import RpaFlowClient


class MaterialDeliveryNoteOrchestrator:
    """素材納品書作成プロセスを統括するOrchestrator."""

    def __init__(self, uow: Any):
        """Initialize with UnitOfWork (or adapter)."""
        self.uow = uow
        # Alias for easier access, assuming uow has .session
        self.db: Session = uow.session
        self.repo = RpaRepository(self.db)
        self.flow_client = RpaFlowClient()
        self.logger = logging.getLogger(__name__)

    def create_run_from_csv(
        self,
        file_content: bytes,
        import_type: str = "material_delivery_note",
        user: User | None = None,
        customer_id: int | None = None,
    ) -> RpaRun:
        """CSVからRunを作成."""
        if import_type != "material_delivery_note":
            raise ValueError(f"Unknown import type: {import_type}")

        parsed_rows = parse_material_delivery_csv(file_content)
        if not parsed_rows:
            raise ValueError("CSV is empty or invalid")

        run = RpaRun(
            rpa_type="material_delivery_note",
            status=RpaRunStatus.DRAFT,
            started_at=utcnow(),
            started_by_user_id=user.id if user else None,
            customer_id=customer_id,
        )
        self.repo.add(run)
        self.db.flush()

        for row_data in parsed_rows:
            item = RpaRunItem(
                run_id=run.id,
                row_no=row_data["row_no"],
                status=row_data.get("status"),
                jiku_code=row_data.get("jiku_code"),
                layer_code=row_data.get("layer_code"),
                external_product_code=row_data.get("external_product_code"),
                delivery_date=row_data.get("delivery_date"),
                delivery_quantity=row_data.get("delivery_quantity"),
                shipping_vehicle=row_data.get("shipping_vehicle"),
                issue_flag=row_data.get("issue_flag", True),
                complete_flag=row_data.get("complete_flag", False),
                match_result=row_data.get("match_result"),
                sap_registered=row_data.get("sap_registered"),
                order_no=row_data.get("order_no"),
            )
            self.repo.add(item)

        # Remove explicit commit (handled by UoW)
        self.db.flush()
        # Note: self.db.refresh(run) requires flush or commit. Flush is enough for ID.
        self.repo.refresh(run)

        # ステータス自動更新チェック (作成直後に完了状態かもしれないため)
        self._update_run_status_if_needed(run.id)

        return run

    def get_run(self, run_id: int) -> RpaRun | None:
        """Run取得."""
        return self.repo.get_run(run_id)

    def get_runs(
        self,
        rpa_type: str = "material_delivery_note",
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[RpaRun], int]:
        """Run一覧取得."""
        return self.repo.get_runs(rpa_type, skip, limit)

    def pause_run(self, run_id: int, user: User | None = None) -> RpaRun:
        """Runを一時停止として記録する."""
        run = self.get_run(run_id)
        if not run:
            raise ValueError("Run not found")

        run.paused_at = utcnow()
        self.repo.add_run_event(
            run_id=run_id,
            event_type="paused",
            message="Run paused",
            created_by_user_id=user.id if user else None,
        )
        self.db.flush()
        self.repo.refresh(run)
        return run

    def resume_run(self, run_id: int, user: User | None = None) -> RpaRun:
        """Runの一時停止を解除する."""
        run = self.get_run(run_id)
        if not run:
            raise ValueError("Run not found")

        run.paused_at = None
        self.repo.add_run_event(
            run_id=run_id,
            event_type="resumed",
            message="Run resumed",
            created_by_user_id=user.id if user else None,
        )
        self.db.flush()
        self.repo.refresh(run)
        return run

    def cancel_run(self, run_id: int, user: User | None = None) -> RpaRun:
        """Runをキャンセルする."""
        run = self.get_run(run_id)
        if not run:
            raise ValueError("Run not found")

        run.status = RpaRunStatus.CANCELLED
        run.cancelled_at = utcnow()
        self.repo.add_run_event(
            run_id=run_id,
            event_type="cancelled",
            message="Run cancelled",
            created_by_user_id=user.id if user else None,
        )
        self.db.flush()
        self.repo.refresh(run)
        return run

    def get_run_events(self, run_id: int, limit: int = 100):
        """Runイベント一覧を取得."""
        return self.repo.get_run_events(run_id, limit=limit)

    def get_failed_items(self, run_id: int) -> list[RpaRunItem]:
        """失敗アイテム一覧を取得."""
        run = self.get_run(run_id)
        if not run:
            raise ValueError("Run not found")
        return self.repo.get_failed_items(run_id)

    def update_item(
        self,
        run_id: int,
        item_id: int,
        issue_flag: bool | None = None,
        complete_flag: bool | None = None,
        delivery_quantity: int | None = None,
        lot_no: str | None = None,
        commit: bool = True,  # Deprecated flag in UoW context, kept for signature compatibility
    ) -> RpaRunItem | None:
        """アイテム更新 (UI操作)."""
        run = self.get_run(run_id)
        if not run:
            return None

        item = self.repo.get_item(run_id, item_id)
        if not item:
            return None

        # StateManagerによる検証
        updating_lot_no_only = (
            issue_flag is None
            and complete_flag is None
            and delivery_quantity is None
            and lot_no is not None
        )
        RpaStateManager.can_edit_item(run, item, updating_lot_no=updating_lot_no_only)

        # 値の更新
        if issue_flag is not None:
            item.issue_flag = issue_flag
        if complete_flag is not None:
            item.complete_flag = complete_flag
        if delivery_quantity is not None:
            item.delivery_quantity = delivery_quantity
        if lot_no is not None:
            item.lot_no = lot_no

        item.updated_at = utcnow()

        # Remove explicit commit
        self.db.flush()
        self.repo.refresh(item)
        self._update_run_status_if_needed(run_id)

        return item

    def update_item_result(
        self,
        run_id: int,
        item_id: int,
        result_status: str | None = None,
        sap_registered: bool | None = None,
        issue_flag: bool | None = None,
    ) -> RpaRunItem | None:
        """Item結果更新 (PAD連携). 常に許可."""
        item = self.repo.get_item(run_id, item_id)
        if not item:
            return None

        if result_status is not None:
            item.result_status = result_status
        if sap_registered is not None:
            item.sap_registered = sap_registered
        if issue_flag is not None:
            item.issue_flag = issue_flag

        item.updated_at = utcnow()

        # Remove explicit commit
        self.db.flush()
        self.repo.refresh(item)
        self._update_run_status_if_needed(run_id)
        return item

    def batch_update_items(
        self,
        run_id: int,
        item_ids: list[int],
        issue_flag: bool | None = None,
        complete_flag: bool | None = None,
        delivery_quantity: int | None = None,
    ) -> RpaRun | None:
        """一括更新."""
        # TODO: StateManager check needed per item or run status check?
        # Assuming run status check is sufficient for batch update
        run = self.get_run(run_id)
        if not run:
            return None

        # 簡易チェック: Draft or Ready
        # RpaStateManager.can_edit_item is per item, expensive for batch
        # Just check status
        if run.status not in (RpaRunStatus.DRAFT, RpaRunStatus.READY_FOR_STEP2):
            # 厳密にはエラーだが、元コードに合わせて実行
            pass

        now = utcnow()
        update_values: dict[str, Any] = {"updated_at": now}
        if issue_flag is not None:
            update_values["issue_flag"] = issue_flag
        if complete_flag is not None:
            update_values["complete_flag"] = complete_flag
        if delivery_quantity is not None:
            update_values["delivery_quantity"] = delivery_quantity

        if len(update_values) > 1:
            self.repo.get_items_by_ids(run_id, item_ids).update(
                update_values, synchronize_session=False
            )

            # Remove explicit commit
            self.db.flush()
            self._update_run_status_if_needed(run_id)

        return self.get_run(run_id)

    async def execute_step2(
        self,
        run_id: int,
        flow_url: str | None,
        json_payload: dict[str, Any],
        start_date: Any,
        end_date: Any,
        user: User | None = None,
    ) -> dict[str, Any]:
        """Step2実行."""
        run = self.get_run(run_id)
        if not run:
            raise ValueError(f"Run not found: {run_id}")

        RpaStateManager.can_execute_step2(run)

        # Config resolution
        actual_flow_url = flow_url
        if not actual_flow_url:
            config_service = SystemConfigService(self.db)
            actual_flow_url = config_service.get(
                ConfigKeys.CLOUD_FLOW_URL_MATERIAL_DELIVERY,
                settings.CLOUD_FLOW_URL_MATERIAL_DELIVERY_NOTE,
            )

        if not actual_flow_url:
            raise ValueError("Flow URL is not configured")

        actual_start_date = start_date if start_date else run.data_start_date
        actual_end_date = end_date if end_date else run.data_end_date

        # Update status & Lock
        now = utcnow()
        run.status = RpaRunStatus.STEP2_RUNNING
        run.step2_executed_at = now
        run.step2_executed_by_user_id = user.id if user else None
        run.updated_at = now

        self.repo.lock_issue_items(run_id, now)

        # Checkpoint commit: 外部API呼び出し前にステータスを確定させる
        # NOTE: This explicit commit is required because the external Flow execution takes time.
        # Without this, the 'STEP2_RUNNING' status would not be visible to other transactions/requests
        # until the Flow returns, potentially causing double-execution or confusing UI states.
        # Ideally, this should be handled by an asynchronous job queue (e.g., Celery).
        self.db.commit()

        # Call Flow
        try:
            json_payload["run_id"] = run.id
            json_payload["executed_by"] = user.username if user else "system"
            json_payload["start_date"] = str(actual_start_date) if actual_start_date else ""
            json_payload["end_date"] = str(actual_end_date) if actual_end_date else ""

            flow_response = await self.flow_client.call_flow(actual_flow_url, json_payload)

            return {
                "status": "success",
                "message": "Step2 (Power Automate Flow) executed successfully",
                "executed_at": run.step2_executed_at,
                "flow_response": flow_response,
            }

        except Exception as e:
            # Checkpoint commit: エラー時にステータスを戻して確定させる
            run.status = RpaRunStatus.READY_FOR_STEP2  # Revert
            self.db.commit()
            raise e

    def mark_external_done(self, run_id: int, user: User | None) -> RpaRun:
        """外部完了."""
        run = self.get_run(run_id)
        if not run:
            raise ValueError(f"Run not found: {run_id}")

        RpaStateManager.can_mark_external_done(run)

        run.status = RpaRunStatus.READY_FOR_STEP4_CHECK
        run.external_done_at = utcnow()
        run.external_done_by_user_id = user.id if user else None
        run.updated_at = utcnow()

        # Remove explicit commit
        self.db.flush()
        return run

    def execute_step4_check(self, run_id: int, file_content: bytes) -> dict[str, int]:
        """Step4実行."""
        run = self.get_run(run_id)
        if not run:
            raise ValueError(f"Run not found: {run_id}")

        RpaStateManager.can_execute_step4_check(run)

        run.status = RpaRunStatus.STEP4_CHECK_RUNNING
        run.step4_executed_at = utcnow()
        self.db.flush()

        try:
            parsed_rows = parse_material_delivery_csv(file_content)
            csv_map = {row["row_no"]: row for row in parsed_rows}

            match_count = 0
            mismatch_count = 0

            for item in run.items:
                csv_row = csv_map.get(item.row_no)
                if not csv_row:
                    item.match_result = False
                    mismatch_count += 1
                else:
                    item.match_result = True
                    match_count += 1

            run.status = RpaRunStatus.READY_FOR_STEP4_REVIEW
            run.updated_at = utcnow()

            # Remove explicit commit
            self.db.flush()
            return {"match": match_count, "mismatch": mismatch_count}

        except Exception as e:
            run.status = RpaRunStatus.READY_FOR_STEP4_CHECK
            # No commit here; UoW rollback will handle it.
            raise e

    def complete_step4(self, run_id: int) -> RpaRun:
        """Step4完了."""
        run = self.get_run(run_id)
        if not run:
            raise ValueError(f"Run not found: {run_id}")

        if run.status != RpaRunStatus.DONE:
            RpaStateManager.can_complete_step4(run)
            run.status = RpaRunStatus.DONE
            run.updated_at = utcnow()
            self.db.flush()

        return run

    def retry_step3_failed(self, run_id: int) -> RpaRun:
        """Step3再試行."""
        run = self.get_run(run_id)
        if not run:
            raise ValueError(f"Run not found: {run_id}")

        RpaStateManager.can_retry_step3(run)

        ng_items = [i for i in run.items if i.match_result is False]
        if not ng_items:
            raise ValueError("No NG items to retry")

        for item in ng_items:
            item.result_status = "pending"
            item.match_result = None
            item.updated_at = utcnow()

        run.status = RpaRunStatus.STEP2_RUNNING
        run.external_done_at = None
        run.step4_executed_at = None
        run.updated_at = utcnow()

        # Remove explicit commit
        self.db.flush()
        return run

    def get_available_lots_for_item(self, run_id: int, item_id: int) -> dict[str, Any]:
        """ロット候補取得."""
        run = self.get_run(run_id)
        if not run:
            return {"lots": [], "auto_selected": None, "source": "none"}

        item = self.repo.get_item(run_id, item_id)
        if not item or not item.external_product_code:
            return {"lots": [], "auto_selected": None, "source": "none"}

        customer_id = run.customer_id
        # Fix: access attribute directly
        external_product_code = item.external_product_code

        product_id = None
        supplier_id = None
        source = "none"

        # 1. CustomerItem
        if customer_id:
            customer_item = self.repo.find_customer_item(customer_id, external_product_code)
            if customer_item:
                product_id = customer_item.product_id
                supplier_id = customer_item.supplier_id
                source = "customer_item"

        # 2. Product fallback
        if not product_id:
            product = self.repo.find_product_by_maker_part_code(external_product_code)
            if product:
                product_id = product.id
                source = "product_only"

        if not product_id:
            return {"lots": [], "auto_selected": None, "source": "none"}

        # 3. Lot fetch
        lots = self.repo.find_active_lots(product_id, supplier_id)

        lot_candidates = [
            {
                "lot_id": lot.lot_id,
                "lot_number": lot.lot_number,
                "available_qty": float(lot.available_quantity),
                "expiry_date": lot.expiry_date,
                "received_date": lot.received_date,
                "supplier_name": lot.supplier_name,
            }
            for lot in lots
        ]

        auto_selected = None
        if len(lot_candidates) == 1:
            auto_selected = lot_candidates[0]["lot_number"]

        return {
            "lots": lot_candidates,
            "auto_selected": auto_selected,
            "source": source,
        }

    def _update_run_status_if_needed(self, run_id: int) -> None:
        """ステータス自動更新."""
        run = self.get_run(run_id)
        if not run:
            return

        # DRAFT -> READY_FOR_STEP2
        if RpaStateManager.should_transition_to_ready_for_step2(run):
            run.status = RpaRunStatus.READY_FOR_STEP2
            run.updated_at = utcnow()
            # Remove explicit commit
            self.db.flush()
            return

        # STEP2_RUNNING -> STEP3_DONE_WAITING_EXTERNAL
        unprocessed_count = self.repo.get_unprocessed_items_count(run_id)

        if RpaStateManager.is_step3_complete(run, unprocessed_count):
            run.status = RpaRunStatus.STEP3_DONE_WAITING_EXTERNAL
            run.updated_at = utcnow()
            # Remove explicit commit
            self.db.flush()

    def get_next_processing_item(self, run_id: int) -> RpaRunItem | None:
        """次に処理すべきアイテムを取得."""
        return self.repo.get_next_processing_item(run_id)

    def claim_next_processing_item(
        self,
        run_id: int,
        lock_timeout_seconds: int = 600,
        lock_owner: str | None = None,
        include_failed: bool = False,
    ) -> RpaRunItem | None:
        """次に処理すべきアイテムをロックして取得."""
        run = self.get_run(run_id)
        if not run or run.status != RpaRunStatus.STEP3_RUNNING:
            return None

        now = utcnow()
        lock_until = now + timedelta(seconds=lock_timeout_seconds)
        released = self.repo.release_expired_item_locks(run_id, now)
        if released:
            self.logger.info(
                "Released expired RPA item locks", extra={"run_id": run_id, "count": released}
            )
        item = self.repo.claim_next_processing_item(
            run_id=run_id,
            now=now,
            lock_until=lock_until,
            include_failed=include_failed,
            lock_owner=lock_owner,
        )
        if not item:
            return None
        self.db.flush()
        self.repo.refresh(item)
        return item

    def mark_item_success(
        self,
        run_id: int,
        item_id: int,
        pdf_path: str | None = None,
        message: str | None = None,
        lock_owner: str | None = None,
    ) -> RpaRunItem | None:
        """PADから成功報告を受け取る."""
        item = self.repo.get_item(run_id, item_id)
        if not item:
            return None

        if item.result_status == "success":
            return item
        if item.result_status == "failure":
            raise ValueError("Cannot mark success after failure.")

        now = utcnow()
        if (
            lock_owner
            and item.locked_by
            and item.locked_by != lock_owner
            and item.locked_until
            and item.locked_until > now
        ):
            raise ValueError("Lock owner mismatch.")

        item.result_status = "success"
        item.result_pdf_path = pdf_path
        item.result_message = message
        item.locked_until = None
        item.locked_by = None
        item.updated_at = now
        self.db.flush()
        self.repo.refresh(item)
        self._update_run_status_if_needed(run_id)
        return item

    def mark_item_failure(
        self,
        run_id: int,
        item_id: int,
        error_code: str | None = None,
        error_message: str | None = None,
        screenshot_path: str | None = None,
        lock_owner: str | None = None,
    ) -> RpaRunItem | None:
        """PADから失敗報告を受け取る."""
        item = self.repo.get_item(run_id, item_id)
        if not item:
            return None

        if item.result_status == "failure":
            return item
        if item.result_status == "success":
            raise ValueError("Cannot mark failure after success.")

        now = utcnow()
        if (
            lock_owner
            and item.locked_by
            and item.locked_by != lock_owner
            and item.locked_until
            and item.locked_until > now
        ):
            raise ValueError("Lock owner mismatch.")

        item.result_status = "failure"
        item.last_error_code = error_code
        item.last_error_message = error_message
        item.last_error_screenshot_path = screenshot_path
        item.locked_until = None
        item.locked_by = None
        item.updated_at = now
        self.db.flush()
        self.repo.refresh(item)
        self._update_run_status_if_needed(run_id)
        return item

    def get_failed_items(self, run_id: int) -> list[RpaRunItem]:
        """失敗したアイテム一覧を取得."""
        return self.repo.get_failed_items(run_id)

    def get_loop_summary(self, run_id: int, top_n: int = 5) -> dict[str, Any]:
        """PADループの集計情報を取得."""
        return self.repo.get_loop_summary(run_id, top_n=top_n)

    def get_activity(self, run_id: int, limit: int = 50) -> list[RpaRunItem]:
        """PADループの活動ログを取得."""
        return self.repo.get_activity(run_id, limit=limit)

    def complete_all_items(self, run_id: int) -> RpaRun | None:
        """全アイテム完了処理 (Step3完了)."""
        run = self.get_run(run_id)
        if not run:
            return None

        # Step3完了判定とステータス更新を行う
        self._update_run_status_if_needed(run_id)

        # 強制的に完了ステータスにする場合（運用回避など）
        # ただし通常は _update_run_status_if_needed で十分
        self.db.refresh(run)
        return run

    def get_lot_suggestions(self, run_id: int, item_id: int) -> dict[str, Any]:
        """ロット候補取得 (Alias)."""
        return self.get_available_lots_for_item(run_id, item_id)
