from unittest.mock import AsyncMock

import pytest
from sqlalchemy.orm import Session

from app.application.services.rpa.orchestrator import MaterialDeliveryNoteOrchestrator
from app.application.services.system_config_service import ConfigKeys, SystemConfigService
from app.infrastructure.persistence.models.rpa_models import RpaRun, RpaRunItem, RpaRunStatus
from app.infrastructure.rpa.flow_client import RpaFlowClient


class TestMaterialDeliveryNoteOrchestrator:
    @pytest.fixture
    def orchestrator(self, db: Session):
        # Mock UoW for testing
        class MockUoW:
            def __init__(self, session):
                self.session = session

        return MaterialDeliveryNoteOrchestrator(MockUoW(db))

    def test_create_run_from_csv_success(
        self, orchestrator: MaterialDeliveryNoteOrchestrator, db: Session
    ):
        # Sample CSV content (Shift-JIS or UTF-8)
        csv_content = (
            "ステータス,出荷先,層別,材質コード,納期,納入量,出荷便\n"
            "集荷指示前,B509,0902,8891078,2025/12/22,200,B509/便\n"
        ).encode()

        run = orchestrator.create_run_from_csv(csv_content)

        assert run.id is not None
        assert run.rpa_type == "material_delivery_note"
        # Orchestrator automatically transitions to READY_FOR_STEP2 if issue items exist
        assert run.status == RpaRunStatus.READY_FOR_STEP2

        items = db.query(RpaRunItem).filter(RpaRunItem.run_id == run.id).all()
        assert len(items) == 1
        item = items[0]
        assert item.row_no == 1
        assert item.external_product_code == "8891078"
        assert item.delivery_quantity == 200

    def test_update_item_locked_error(
        self, orchestrator: MaterialDeliveryNoteOrchestrator, db: Session
    ):
        # Setup: Create run and item directly
        run = RpaRun(status=RpaRunStatus.DRAFT, rpa_type="material_delivery_note")
        db.add(run)
        db.commit()

        item = RpaRunItem(run_id=run.id, row_no=1, issue_flag=True, lock_flag=True)  # Locked!
        db.add(item)
        db.commit()

        # Attempt generic update (should fail)
        with pytest.raises(ValueError, match="Cannot update locked item"):
            orchestrator.update_item(run.id, item.id, delivery_quantity=500)

        # Attempt lot_no update (should succeed - specialized logic in loop?)
        # Orchestrator logic: if lot_no only, call _update_item_internal... BUT
        # orchestrator.update_item calls RpaStateManager.can_edit_item which raises ValueError for locked item
        # unless updating_lot_no=True is passed.
        # But wait, orchestrator.update_item logic:
        # updating_lot_no_only = (issue_flag is None and ... lot_no is not None)
        # RpaStateManager.can_edit_item(..., updating_lot_no=updating_lot_no_only)
        # So lot_no only update SHOULD pass if StateManager allows it.

        updated_item = orchestrator.update_item(run.id, item.id, lot_no="NEW_LOT")
        assert updated_item.lot_no == "NEW_LOT"

    @pytest.mark.asyncio
    async def test_execute_step2_success(
        self, orchestrator: MaterialDeliveryNoteOrchestrator, db: Session
    ):
        # Setup
        run = RpaRun(status=RpaRunStatus.READY_FOR_STEP2, rpa_type="material_delivery_note")
        db.add(run)
        db.commit()

        item = RpaRunItem(run_id=run.id, row_no=1, issue_flag=True)
        db.add(item)
        db.commit()

        # Mock FlowClient
        mock_client = AsyncMock(spec=RpaFlowClient)
        mock_client.call_flow.return_value = {"status": "ok"}
        orchestrator.flow_client = mock_client

        # Execute
        result = await orchestrator.execute_step2(
            run_id=run.id,
            flow_url="http://mock-flow-url",
            json_payload={},
            start_date=None,
            end_date=None,
        )

        assert result["status"] == "success"

        # Verify DB updates
        db.refresh(run)
        assert run.status == RpaRunStatus.STEP2_RUNNING

        db.refresh(item)
        assert item.lock_flag is True

        mock_client.call_flow.assert_awaited_once()

    def test_batch_update_items_completes_and_transitions(
        self, orchestrator: MaterialDeliveryNoteOrchestrator, db: Session
    ):
        run = RpaRun(status=RpaRunStatus.DRAFT, rpa_type="material_delivery_note")
        db.add(run)
        db.commit()

        item1 = RpaRunItem(run_id=run.id, row_no=1, issue_flag=True, complete_flag=False)
        item2 = RpaRunItem(run_id=run.id, row_no=2, issue_flag=True, complete_flag=False)
        db.add_all([item1, item2])
        db.commit()

        result = orchestrator.batch_update_items(
            run_id=run.id,
            item_ids=[item1.id, item2.id],
            issue_flag=False,
            complete_flag=True,
        )

        assert result is not None

        db.refresh(run)
        assert run.status == RpaRunStatus.READY_FOR_STEP2

        refreshed_items = (
            db.query(RpaRunItem)
            .filter(RpaRunItem.run_id == run.id)
            .order_by(RpaRunItem.row_no)
            .all()
        )
        assert all(item.issue_flag is False for item in refreshed_items)
        assert all(item.complete_flag is True for item in refreshed_items)

    def test_update_item_result_marks_run_complete(
        self, orchestrator: MaterialDeliveryNoteOrchestrator, db: Session
    ):
        run = RpaRun(status=RpaRunStatus.STEP2_RUNNING, rpa_type="material_delivery_note")
        db.add(run)
        db.commit()

        item = RpaRunItem(
            run_id=run.id,
            row_no=1,
            issue_flag=True,
            result_status="pending",
        )
        db.add(item)
        db.commit()

        updated = orchestrator.update_item_result(
            run_id=run.id,
            item_id=item.id,
            result_status="success",
            sap_registered=True,
        )

        assert updated is not None
        assert updated.result_status == "success"
        assert updated.sap_registered is True

        db.refresh(run)
        assert run.status == RpaRunStatus.STEP3_DONE_WAITING_EXTERNAL

    @pytest.mark.asyncio
    async def test_execute_step2_uses_config_flow_url(
        self, orchestrator: MaterialDeliveryNoteOrchestrator, db: Session
    ):
        run = RpaRun(status=RpaRunStatus.READY_FOR_STEP2, rpa_type="material_delivery_note")
        db.add(run)
        db.commit()

        item = RpaRunItem(run_id=run.id, row_no=1, issue_flag=True)
        db.add(item)
        db.commit()

        config_service = SystemConfigService(db)
        config_service.set(ConfigKeys.CLOUD_FLOW_URL_MATERIAL_DELIVERY, "http://configured-flow")

        mock_client = AsyncMock(spec=RpaFlowClient)
        mock_client.call_flow.return_value = {"status": "ok"}
        orchestrator.flow_client = mock_client

        result = await orchestrator.execute_step2(
            run_id=run.id,
            flow_url=None,
            json_payload={},
            start_date=None,
            end_date=None,
        )

        assert result["status"] == "success"
        mock_client.call_flow.assert_awaited_once()
        assert mock_client.call_flow.await_args.args[0] == "http://configured-flow"

    def test_csv_parser_integration(self, orchestrator: MaterialDeliveryNoteOrchestrator):
        # Test valid CSV parsing interaction integration
        csv_content = "ステータス,出荷先,層別,材質コード,納期,納入量,出荷便".encode()
        # Empty rows should raise ValueError
        with pytest.raises(ValueError, match="CSV is empty or invalid"):
            orchestrator.create_run_from_csv(csv_content)
