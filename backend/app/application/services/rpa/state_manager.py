"""RPA Run State Manager.

RPAのRun状態遷移ロジックを管理。
MaterialDeliveryNoteServiceから抽出。
"""

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.rpa_models import (
    RpaRun,
    RpaRunItem,
    RpaRunStatus,
)


def update_run_status_if_needed(db: Session, run: RpaRun) -> None:
    """Runのステータスを状態遷移ルールに基づいて更新する.

    状態遷移ルール:
    - DRAFT -> READY_FOR_STEP2: issue_count > 0 または all_items_complete
    - STEP2_RUNNING -> STEP3_DONE_WAITING_EXTERNAL: 発行対象アイテムが全て処理完了
    - READY_FOR_STEP4_REVIEW -> DONE: 全アイテムがmatch

    Args:
        db: データベースセッション
        run: 対象のRpaRun
    """
    if not run:
        return

    # DRAFT -> READY_FOR_STEP2 (Step2完了)
    if run.status == RpaRunStatus.DRAFT and (run.issue_count > 0 or run.all_items_complete):
        run.status = RpaRunStatus.READY_FOR_STEP2
        run.updated_at = utcnow()
        db.commit()
        return

    # STEP2_RUNNING -> STEP3_DONE_WAITING_EXTERNAL (Step3完了)
    if run.status == RpaRunStatus.STEP2_RUNNING:
        unprocessed_count = (
            db.query(RpaRunItem)
            .filter(
                RpaRunItem.run_id == run.id,
                RpaRunItem.issue_flag.is_(True),
                or_(
                    RpaRunItem.result_status.is_(None),  # NULL = unprocessed
                    RpaRunItem.result_status == "pending",
                    RpaRunItem.result_status == "processing",
                ),
            )
            .count()
        )

        if unprocessed_count == 0:
            run.status = RpaRunStatus.STEP3_DONE_WAITING_EXTERNAL
            run.updated_at = utcnow()
            db.commit()
        return

    # READY_FOR_STEP4_REVIEW -> DONE (Step4全OK)
    if run.status == RpaRunStatus.READY_FOR_STEP4_REVIEW:
        has_mismatch = any(i.match_result is False for i in run.items)
        if not has_mismatch:
            run.status = RpaRunStatus.DONE
            run.updated_at = utcnow()
            db.commit()
