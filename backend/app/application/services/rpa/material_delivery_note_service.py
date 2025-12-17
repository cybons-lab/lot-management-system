"""Material Delivery Note RPA Service.

素材納品書発行ワークフローのビジネスロジックを提供。
"""

from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.auth_models import User
from app.infrastructure.persistence.models.rpa_models import (
    RpaRun,
    RpaRunItem,
    RpaRunStatus,
)

from .csv_parser import parse_material_delivery_csv


class MaterialDeliveryNoteService:
    """素材納品書発行サービス."""

    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db

    def create_run_from_csv(
        self,
        file_content: bytes,
        user: User | None = None,
    ) -> RpaRun:
        """CSVファイルからRunを作成する.

        Args:
            file_content: CSVファイルのバイト列
            user: 実行ユーザー

        Returns:
            作成されたRpaRun

        Raises:
            ValueError: CSVのパースに失敗した場合
        """
        # Parse CSV
        parsed_rows = parse_material_delivery_csv(file_content)

        if not parsed_rows:
            raise ValueError("CSV is empty or invalid")

        # Create Run
        run = RpaRun(
            rpa_type="material_delivery_note",
            status=RpaRunStatus.DRAFT,
            started_at=utcnow(),
            started_by_user_id=user.id if user else None,
        )
        self.db.add(run)
        self.db.flush()  # Get run.id

        # Create Items
        for row_data in parsed_rows:
            item = RpaRunItem(
                run_id=run.id,
                row_no=row_data["row_no"],
                status=row_data.get("status"),
                destination=row_data.get("destination"),
                layer_code=row_data.get("layer_code"),
                material_code=row_data.get("material_code"),
                delivery_date=row_data.get("delivery_date"),
                delivery_quantity=row_data.get("delivery_quantity"),
                shipping_vehicle=row_data.get("shipping_vehicle"),
                issue_flag=row_data.get("issue_flag", True),
                complete_flag=row_data.get("complete_flag", False),
                match_result=row_data.get("match_result"),
                sap_registered=row_data.get("sap_registered"),
                order_no=row_data.get("order_no"),
            )
            self.db.add(item)

        self.db.commit()
        self.db.refresh(run)

        return run

    def get_run(self, run_id: int) -> RpaRun | None:
        """Runを取得する.

        Args:
            run_id: Run ID

        Returns:
            RpaRun または None
        """
        return self.db.query(RpaRun).filter(RpaRun.id == run_id).first()

    def get_runs(
        self,
        rpa_type: str = "material_delivery_note",
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[list[RpaRun], int]:
        """Run一覧を取得する.

        Args:
            rpa_type: RPAタイプ
            skip: スキップ件数
            limit: 取得件数

        Returns:
            (Run一覧, 総件数)
        """
        query = self.db.query(RpaRun).filter(RpaRun.rpa_type == rpa_type)

        total = query.count()
        runs = query.order_by(RpaRun.created_at.desc()).offset(skip).limit(limit).all()

        return runs, total

    def update_item(
        self,
        run_id: int,
        item_id: int,
        issue_flag: bool | None = None,
        complete_flag: bool | None = None,
        delivery_quantity: int | None = None,
        commit: bool = True,
    ) -> RpaRunItem | None:
        """Itemを更新する.

        Args:
            run_id: Run ID
            item_id: Item ID
            issue_flag: 発行フラグ
            complete_flag: 完了フラグ
            delivery_quantity: 納入量
            commit: コミットするかどうか

        Returns:
            更新されたRpaRunItem または None
        """
        item = (
            self.db.query(RpaRunItem)
            .filter(RpaRunItem.id == item_id, RpaRunItem.run_id == run_id)
            .first()
        )

        if not item:
            return None

        if issue_flag is not None:
            item.issue_flag = issue_flag
        if complete_flag is not None:
            item.complete_flag = complete_flag
        if delivery_quantity is not None:
            item.delivery_quantity = delivery_quantity

        item.updated_at = utcnow()

        if commit:
            self.db.commit()
            self.db.refresh(item)
            # Check if all items are complete and update run status
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
        """複数のItemsを一括更新する.

        Args:
            run_id: Run ID
            item_ids: 更新対象のItem IDリスト
            issue_flag: 発行フラグ
            complete_flag: 完了フラグ
            delivery_quantity: 納入量

        Returns:
            更新後のRpaRun（最新状態）
        """
        # Validate items belong to the run
        # Update items
        now = utcnow()

        # Build update definitions
        update_values = {"updated_at": now}
        if issue_flag is not None:
            update_values["issue_flag"] = issue_flag
        if complete_flag is not None:
            update_values["complete_flag"] = complete_flag
        if delivery_quantity is not None:
            update_values["delivery_quantity"] = delivery_quantity

        if len(update_values) <= 1:
            # nothing to update
            return self.get_run(run_id)

        # Bulk update
        self.db.query(RpaRunItem).filter(
            RpaRunItem.run_id == run_id, RpaRunItem.id.in_(item_ids)
        ).update(update_values, synchronize_session=False)

        self.db.commit()

        # Update run status
        self._update_run_status_if_needed(run_id)

        return self.get_run(run_id)

    def complete_all_items(self, run_id: int) -> RpaRun | None:
        """全Itemsを完了にする.

        Args:
            run_id: Run ID

        Returns:
            更新されたRpaRun または None
        """
        run = self.get_run(run_id)
        if not run:
            return None

        now = utcnow()
        for item in run.items:
            item.complete_flag = True
            item.updated_at = now

        run.status = RpaRunStatus.READY_FOR_STEP2
        run.updated_at = now

        self.db.commit()
        self.db.refresh(run)

        return run

    async def execute_step2(
        self,
        run_id: int,
        flow_url: str,
        json_payload: dict[str, Any],
        start_date: Any,  # using Any for simplicity or Import date
        end_date: Any,
        user: User | None = None,
    ) -> dict[str, Any]:
        """Step2を実行する.

        事前条件: 全Itemsが完了していること。
        Power Automateフローを呼び出して、ステータスを更新する。

        Args:
            run_id: Run ID
            flow_url: Power AutomateフローURL
            json_payload: フローに渡すJSONペイロード
            start_date: 開始日
            end_date: 終了日
            user: 実行ユーザー

        Returns:
            実行結果

        Raises:
            ValueError: 事前条件を満たさない場合
            Exception: フロー呼び出し失敗時
        """
        run = self.get_run(run_id)
        if not run:
            raise ValueError(f"Run not found: {run_id}")

        if not run.all_items_complete:
            raise ValueError("Not all items are complete")

        if run.status not in (RpaRunStatus.DRAFT, RpaRunStatus.READY_FOR_STEP2):
            raise ValueError(f"Invalid run status for step2: {run.status}")

        # Update status to running
        now = utcnow()
        run.status = RpaRunStatus.STEP2_RUNNING
        run.step2_executed_at = now
        run.step2_executed_by_user_id = user.id if user else None
        run.updated_at = now
        self.db.commit()

        # Call Power Automate Flow
        try:
            # 実行情報（Run IDなど）をペイロードに追加
            json_payload["run_id"] = run.id
            json_payload["executed_by"] = user.username if user else "system"
            json_payload["start_date"] = str(start_date)
            json_payload["end_date"] = str(end_date)

            flow_response = await call_power_automate_flow(
                flow_url=flow_url,
                json_payload=json_payload,
            )

            # 成功時
            run.status = RpaRunStatus.DONE
            run.updated_at = utcnow()
            self.db.commit()
            self.db.refresh(run)

            return {
                "status": "success",
                "message": "Step2 (Power Automate Flow) executed successfully",
                "executed_at": run.step2_executed_at,
                "flow_response": flow_response,
            }

        except Exception as e:
            # 失敗時、ステータスを戻すべきか検討が必要だが、
            # とりあえずログを残してエラーを再送出する
            # ステータスは実行中のまま残る（手動リカバリ用）またはREADYに戻す
            # ここではシンプルにエラーとして扱う
            run.status = RpaRunStatus.READY_FOR_STEP2  # Retry可能にするため戻す
            self.db.commit()
            raise e

    def _update_run_status_if_needed(self, run_id: int) -> None:
        """必要に応じてRunのステータスを更新する.

        全Itemsが完了した場合、ステータスを READY_FOR_STEP2 に更新。
        """
        run = self.get_run(run_id)
        if not run:
            return

        if run.all_items_complete and run.status == RpaRunStatus.DRAFT:
            run.status = RpaRunStatus.READY_FOR_STEP2
            run.updated_at = utcnow()
            self.db.commit()


async def call_power_automate_flow(
    flow_url: str,
    json_payload: dict[str, Any],
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Power Automate Cloud Flowを呼び出す.

    Args:
        flow_url: FlowのHTTP Trigger URL
        json_payload: 送信するJSONペイロード
        timeout: タイムアウト秒数

    Returns:
        Flow応答

    Raises:
        httpx.RequestError: リクエストエラー
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            flow_url,
            json=json_payload,
            timeout=timeout,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()

        try:
            return response.json()
        except Exception:
            return {"status_code": response.status_code, "text": response.text}
