"""RPA State Management Logic.

Encapsulates status transitions and validation rules for RPA workflows.
"""

from app.infrastructure.persistence.models.rpa_models import (
    RpaRun,
    RpaRunItem,
    RpaRunStatus,
)


class RpaStateManager:
    """RPAプロセスの状態管理ロジック."""

    @staticmethod
    def can_edit_item(run: RpaRun, item: RpaRunItem, updating_lot_no: bool = False) -> None:
        """アイテムが編集可能か検証する.

        Raises:
            ValueError: 編集不可の場合
        """
        # ロック済みアイテムは原則編集禁止
        if item.lock_flag:
            # lot_noの更新のみ、Step4での修正用に許可する場合があるが
            # 基本的にはロック済みはNG。呼び出し元で lot_no only の例外判定をしている場合はここを通さない想定か、
            # あるいはここで引数を受け取る。
            if not updating_lot_no:
                raise ValueError("Cannot update locked item.")

        # Step3実行中以降は原則編集禁止
        editable_statuses = [RpaRunStatus.DRAFT, RpaRunStatus.READY_FOR_STEP2]
        if run.status not in editable_statuses:
            if not updating_lot_no:
                raise ValueError(f"Cannot update item in status {run.status}")

    @staticmethod
    def can_execute_step2(run: RpaRun) -> None:
        """Step2 (Flow実行) が可能か検証する."""
        # DRAFT or READY_FOR_STEP2
        # 要件: "Step2実行 (Flow呼び出し) は READY_FOR_STEP2 への遷移後" とされることが多いが、
        # サービスの実装では DRAFT でも完了していれば許容しているように見える。
        # ここでは厳格にチェックするか、呼び出し元の柔軟性を維持するか。
        # サービスのロジック: if run.status not in (DRAFT, READY_FOR_STEP2): pass (allow)
        # 基本的に実行済み (RUNNING以降) でなければ再実行も許容されている可能性がある。
        if run.status not in (RpaRunStatus.DRAFT, RpaRunStatus.READY_FOR_STEP2):
            raise ValueError(f"Invalid status for Step2 execution: {run.status}")

    @staticmethod
    def can_mark_external_done(run: RpaRun) -> None:
        """外部手順完了が可能か検証する."""
        if run.status != RpaRunStatus.STEP3_DONE_WAITING_EXTERNAL:
            raise ValueError(f"Invalid status for external done: {run.status}")

    @staticmethod
    def can_execute_step4_check(run: RpaRun) -> None:
        """Step4 (突合) が可能か検証する."""
        allowed = [
            RpaRunStatus.READY_FOR_STEP4_CHECK,
            RpaRunStatus.READY_FOR_STEP4_REVIEW,  # 再実行も許可
        ]
        if run.status not in allowed:
            raise ValueError(f"Invalid status for Step4 check: {run.status}")

    @staticmethod
    def can_retry_step3(run: RpaRun) -> None:
        """Step3再試行が可能か検証する."""
        if run.status != RpaRunStatus.READY_FOR_STEP4_REVIEW:
            raise ValueError("Can only retry from Step4 Review")

    @staticmethod
    def should_transition_to_ready_for_step2(run: RpaRun) -> bool:
        """DRAFT -> READY_FOR_STEP2 への自動遷移判定."""
        if run.status == RpaRunStatus.DRAFT:
            # 発行対象がある、または 全アイテム完了している場合
            # (サービスのロジック準拠: issue_count > 0 or all_items_complete)
            # Propertyアクセスになるため、呼び出し元で判定した値を渡す設計の方が良いかもしれないが、
            # ここではモデルを受け取る前提。
            return run.issue_count > 0 or run.all_items_complete
        return False

    @staticmethod
    def is_step3_complete(run: RpaRun, unprocessed_issue_items_count: int) -> bool:
        """STEP2_RUNNING -> STEP3_DONE_WAITING_EXTERNAL への自動遷移判定."""
        if run.status == RpaRunStatus.STEP2_RUNNING:
            return unprocessed_issue_items_count == 0
        return False
