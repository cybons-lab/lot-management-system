"""Material Delivery Note RPA Service (Legacy Wrapper).

Refactored to delegate to MaterialDeliveryNoteOrchestrator and RpaFlowClient.
This file is maintained for backward compatibility.
"""

from typing import Any

from app.application.services.rpa.orchestrator import MaterialDeliveryNoteOrchestrator
from app.infrastructure.rpa.flow_client import RpaFlowClient


class SessionUnitOfWorkAdapter:
    """Adapts a raw Session to the UnitOfWork interface/usage for backward compatibility."""

    def __init__(self, session: Any):
        self.session = session

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def commit(self):
        self.session.commit()

    def rollback(self):
        self.session.rollback()


class MaterialDeliveryNoteService(MaterialDeliveryNoteOrchestrator):
    """(Deprecated) Use MaterialDeliveryNoteOrchestrator instead."""

    def __init__(self, db: Any):
        """Initialize with simple db session, adapting it to UoW."""
        uow = SessionUnitOfWorkAdapter(db)
        super().__init__(uow)
        self.db = db  # Keep direct check for legacy methods if any

    # Override methods to ensure commit happens for legacy callers (Router with get_db)
    # create_run_from_csv, update_item, etc. need commits if Orchestrator stops committing.

    def create_run_from_csv(self, *args, **kwargs):
        res = super().create_run_from_csv(*args, **kwargs)
        self.db.commit()
        self.db.refresh(res)
        return res

    def update_item(self, *args, **kwargs):
        # update_item in service historically had confirm logic
        # Orchestrator update_item should rely on UoW.
        # We commit here.
        res = super().update_item(*args, **kwargs)
        self.db.commit()
        if res:
            self.db.refresh(res)
        return res

    def update_item_result(self, *args, **kwargs):
        res = super().update_item_result(*args, **kwargs)
        self.db.commit()
        if res:
            self.db.refresh(res)
        return res

    def batch_update_items(self, *args, **kwargs):
        res = super().batch_update_items(*args, **kwargs)
        self.db.commit()
        if res:
            self.db.refresh(res)
        return res

    def complete_all_items(self, *args, **kwargs):
        res = super().complete_all_items(*args, **kwargs)
        self.db.commit()
        if res:
            self.db.refresh(res)
        return res

    def mark_external_done(self, *args, **kwargs):
        res = super().mark_external_done(*args, **kwargs)
        self.db.commit()
        self.db.refresh(res)
        return res

    def execute_step4_check(self, *args, **kwargs):
        res = super().execute_step4_check(*args, **kwargs)
        self.db.commit()
        return res

    def retry_step3_failed(self, *args, **kwargs):
        res = super().retry_step3_failed(*args, **kwargs)
        self.db.commit()
        self.db.refresh(res)
        return res


async def call_power_automate_flow(
    flow_url: str,
    json_payload: dict[str, Any],
    timeout: float = 30.0,
) -> dict[str, Any]:
    """(Deprecated) Power Automate Cloud Flowを呼び出す.

    Delegates to RpaFlowClient.
    """
    client = RpaFlowClient()
    return await client.call_flow(flow_url, json_payload, timeout)
