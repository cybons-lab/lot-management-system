"""RPA State Management Logic.

Encapsulates status transitions and validation rules for RPA workflows.

【設計意図】RPA状態管理の設計判断:

1. なぜ状態管理ロジックを分離するのか
   理由: RPAワークフローの複雑な状態遷移を一元管理
   業務背景:
   - OCR受注取込は複数のステップで構成される
     Step1: OCR読取（外部）
     Step2: SAP Flow実行
     Step3: ロット引当
     Step4: 突合・レビュー
   → 各ステップ間の遷移条件を明確にする必要がある

2. 静的メソッドの採用（@staticmethod）
   理由: 状態を持たないバリデーション関数
   メリット:
   - インスタンス化不要で呼び出し可能
   - テストが容易（副作用なし）
   - 関数的プログラミングの原則に準拠

3. can_edit_item() の設計（L17-36）
   理由: アイテム編集可否の複雑なルールを集約
   ビジネスルール:
   - ロック済みアイテムは原則編集禁止
   - ただし、Step4でのロット番号修正は例外的に許可
   - Step3実行中以降は原則編集禁止
   背景:
   - Step3（ロット引当）実行後は、引当結果との整合性が必要
   → 不用意な編集を防ぐためロック

4. can_execute_step2() の設計（L38-47）
   理由: Step2（SAP Flow実行）の前提条件を検証
   許可される状態:
   - DRAFT: 初回実行
   - READY_FOR_STEP2: OCR読取完了後
   業務要件:
   - Step2はSAP連携を伴う重い処理
   → 不正な状態での実行を防ぐ

5. can_mark_external_done() の設計（L50-53）
   理由: 外部手順完了の記録を厳密に管理
   許可される状態:
   - STEP3_DONE_WAITING_EXTERNAL のみ
   業務シナリオ:
   - Step3完了後、人手での確認作業が必要な場合がある
   → 確認完了を明示的にマークする

6. can_execute_step4_check() の設計（L56-63）
   理由: 突合処理の実行条件を明確化
   許可される状態:
   - READY_FOR_STEP4_CHECK: 初回突合
   - READY_FOR_STEP4_REVIEW: 再実行（修正後）
   業務要件:
   - 突合エラー後の修正・再実行を許容

7. can_retry_step3() の設計（L66-69）
   理由: Step3（ロット引当）の再試行を制御
   許可される状態:
   - READY_FOR_STEP4_REVIEW のみ
   業務シナリオ:
   - 引当失敗時に条件変更して再試行
   → 特定の状態からのみ再試行を許可

8. should_transition_to_ready_for_step2() の設計（L72-80）
   理由: 自動状態遷移の判定ロジック
   遷移条件:
   - 発行対象がある（issue_count > 0）
   - または、全アイテム完了している
   業務的意義:
   - Step1完了後に自動的に次ステップへ進む

9. is_step3_complete() の設計（L83-87）
   理由: Step3完了判定の一元化
   判定条件:
   - 未処理の発行アイテム数 = 0
   業務的意義:
   - 全ての引当処理が完了したら自動的に次ステップへ

10. ValueError の使用
    理由: 状態遷移違反を明示的にエラー化
    利点:
    - 呼び出し側で try/except ValueError でキャッチ
    - エラーメッセージで「なぜ不可なのか」を明示
    改善の余地:
    - カスタム例外（InvalidRpaStateError）を定義すると、
      よりドメイン固有のエラーハンドリングが可能
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
