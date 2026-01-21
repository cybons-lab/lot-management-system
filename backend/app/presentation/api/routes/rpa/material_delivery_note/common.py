"""Material Delivery Note router helpers."""

import logging

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import LayerCodeMapping
from app.presentation.schemas.rpa_run_schema import (
    RpaRunItemResponse,
    RpaRunResponse,
    RpaRunSummaryResponse,
)

logger = logging.getLogger(__name__)


def _get_maker_map(db: Session | None, layer_codes: list[str]) -> dict[str, str]:
    """層別コードに対応するメーカー名のマップを取得."""
    if not layer_codes:
        return {}

    # Session might be None in some contexts but here we expect a valid session
    if db is None:
        logger.warning("_get_maker_map called with None session")
        return {}

    mappings = (
        db.query(LayerCodeMapping).filter(LayerCodeMapping.layer_code.in_(set(layer_codes))).all()
    )
    return {m.layer_code: m.maker_name for m in mappings}


def _build_run_response(run, maker_map: dict[str, str] | None = None) -> RpaRunResponse:
    """RpaRunからレスポンスを構築."""
    maker_map = maker_map or {}
    items = []
    for item in run.items:
        resp_item = RpaRunItemResponse.model_validate(item)
        resp_item.maker_name = maker_map.get(item.layer_code)
        resp_item.result_status = item.result_status
        items.append(resp_item)

    return RpaRunResponse(
        id=run.id,
        rpa_type=run.rpa_type,
        status=run.status,
        run_group_id=run.run_group_id,
        customer_id=run.customer_id,
        data_start_date=run.data_start_date,
        data_end_date=run.data_end_date,
        progress_percent=run.progress_percent,
        estimated_minutes=run.estimated_minutes,
        paused_at=run.paused_at,
        cancelled_at=run.cancelled_at,
        started_at=run.started_at,
        started_by_user_id=run.started_by_user_id,
        started_by_username=run.started_by_user.username if run.started_by_user else None,
        step2_executed_at=run.step2_executed_at,
        step2_executed_by_user_id=run.step2_executed_by_user_id,
        step2_executed_by_username=run.step2_executed_by_user.username
        if run.step2_executed_by_user
        else None,
        created_at=run.created_at,
        updated_at=run.updated_at,
        item_count=run.item_count,
        complete_count=run.complete_count,
        issue_count=run.issue_count,
        all_items_complete=run.all_items_complete,
        items=items,
        external_done_at=run.external_done_at,
        external_done_by_user_id=run.external_done_by_user_id,
        external_done_by_username=run.external_done_by_user.username
        if run.external_done_by_user
        else None,
        step4_executed_at=run.step4_executed_at,
    )


def _build_run_summary(run) -> RpaRunSummaryResponse:
    """RpaRunからサマリレスポンスを構築."""
    return RpaRunSummaryResponse(
        id=run.id,
        rpa_type=run.rpa_type,
        status=run.status,
        run_group_id=run.run_group_id,
        data_start_date=run.data_start_date,
        data_end_date=run.data_end_date,
        progress_percent=run.progress_percent,
        estimated_minutes=run.estimated_minutes,
        paused_at=run.paused_at,
        cancelled_at=run.cancelled_at,
        started_at=run.started_at,
        started_by_username=run.started_by_user.username if run.started_by_user else None,
        step2_executed_at=run.step2_executed_at,
        created_at=run.created_at,
        item_count=run.item_count,
        complete_count=run.complete_count,
        issue_count=run.issue_count,
        all_items_complete=run.all_items_complete,
        external_done_at=run.external_done_at,
        step4_executed_at=run.step4_executed_at,
        updated_at=run.updated_at,
    )
