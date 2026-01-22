"""SmartRead request/result service."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from app.application.services.smartread.base import SmartReadBaseService
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadLongData,
    SmartReadRequest,
    SmartReadTask,
    SmartReadWideData,
)


if TYPE_CHECKING:
    from app.infrastructure.persistence.models import SmartReadConfig
    from app.infrastructure.smartread.client import SmartReadClient


logger = logging.getLogger(__name__)


class SmartReadRequestService(SmartReadBaseService):
    """requestId/resultsルート関連のサービス."""

    if TYPE_CHECKING:

        def _get_client(
            self, config_id: int
        ) -> tuple[SmartReadClient | None, SmartReadConfig | None]: ...

        def _calculate_row_fingerprint(self, row_data: dict[str, Any]) -> str: ...

    async def get_or_create_daily_task(
        self,
        config_id: int,
        task_date: date | None = None,
    ) -> tuple[str, SmartReadTask] | tuple[None, None]:
        """1日1タスク運用: 今日のタスクを取得または作成.

        Args:
            config_id: 設定ID
            task_date: タスク日付（デフォルトは今日）

        Returns:
            (task_id, SmartReadTaskレコード) または (None, None)
        """
        if task_date is None:
            task_date = date.today()

        # 既存タスクをチェック
        stmt = select(SmartReadTask).where(
            SmartReadTask.config_id == config_id,
            SmartReadTask.task_date == task_date,
        )
        existing = self.session.execute(stmt).scalar_one_or_none()

        if existing:
            logger.info(f"Reusing existing task for {task_date}: {existing.task_id}")
            return existing.task_id, existing

        # 新規タスクを作成
        client, config = self._get_client(config_id)
        if not client or not config:
            logger.error(f"No client available for config_id={config_id}")
            return None, None

        # タスク名: OCR_YYYYMMDD
        task_name = f"OCR_{task_date.strftime('%Y%m%d')}"
        task_id = await client.create_task_with_name(task_name)

        if not task_id:
            logger.error(f"Failed to create task with name {task_name}")
            return None, None

        # DB保存
        task_record = SmartReadTask(
            config_id=config_id,
            task_id=task_id,
            task_date=task_date,
            name=task_name,
            state="CREATED",
            synced_at=datetime.now(),
        )
        self.session.add(task_record)
        self.session.flush()

        logger.info(f"Created new daily task: {task_name} ({task_id})")
        return task_id, task_record

    async def submit_ocr_request(
        self,
        config_id: int,
        task_id: str,
        task_record: SmartReadTask,
        file_content: bytes,
        filename: str,
    ) -> SmartReadRequest | None:
        """OCRリクエストを投入してDBに保存.

        Args:
            config_id: 設定ID
            task_id: SmartRead API側のタスクID
            task_record: DBのタスクレコード
            file_content: ファイルのバイナリデータ
            filename: ファイル名

        Returns:
            SmartReadRequestレコード、またはNone
        """
        client, _ = self._get_client(config_id)
        if not client:
            return None

        # リクエスト投入
        request_id = await client.submit_request(task_id, file_content, filename)
        if not request_id:
            logger.error(f"Failed to submit request for {filename}")
            return None

        # DB保存
        request_record = SmartReadRequest(
            request_id=request_id,
            task_id_ref=task_record.id,
            task_id=task_id,
            task_date=task_record.task_date,
            config_id=config_id,
            filename=filename,
            state="PENDING",
        )
        self.session.add(request_record)
        self.session.flush()

        logger.info(f"Submitted OCR request: {request_id} for {filename}")
        return request_record

    async def poll_and_process_request(
        self,
        config_id: int,
        request_record: SmartReadRequest,
    ) -> bool:
        """リクエストをポーリングして結果を処理.

        Args:
            config_id: 設定ID
            request_record: SmartReadRequestレコード

        Returns:
            成功した場合True
        """
        client, _ = self._get_client(config_id)
        if not client:
            return False

        # ポーリング
        status = await client.poll_request_until_complete(request_record.request_id)

        if status is None:
            request_record.state = "ERROR"
            request_record.error_message = "Polling failed"
            self.session.flush()
            return False

        # 状態更新
        request_record.state = status.state
        if status.num_of_pages:
            request_record.num_of_pages = status.num_of_pages

        if status.is_failed() or status.state == "TIMEOUT":
            request_record.error_message = status.error_message or "Request failed"
            request_record.completed_at = datetime.now()
            self.session.flush()
            return False

        # 結果取得
        results = await client.get_request_results(request_record.request_id)
        if results is None or not results.success:
            request_record.state = "ERROR"
            request_record.error_message = (
                results.error_message if results else "Failed to get results"
            )
            request_record.completed_at = datetime.now()
            self.session.flush()
            return False

        # 結果をDBに保存
        request_record.result_json = results.raw_response
        request_record.completed_at = datetime.now()
        self.session.flush()

        # wide/long変換・保存
        try:
            wide_data, long_data = self.convert_results_to_wide_long(
                results=results.results,
                request_id=request_record.request_id,
                filename=request_record.filename or "unknown",
            )

            self._save_wide_and_long_from_request(
                config_id=config_id,
                request_record=request_record,
                wide_data=wide_data,
                long_data=long_data,
            )

            logger.info(
                f"Processed request {request_record.request_id}: "
                f"{len(wide_data)} wide rows, {len(long_data)} long rows"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to process results for {request_record.request_id}: {e}")
            request_record.error_message = str(e)
            self.session.flush()
            return False

    def convert_results_to_wide_long(
        self,
        results: list[dict[str, Any]],
        request_id: str,
        filename: str,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Results JSON → wide_data, long_data に変換.

        - wide_data: 1ページ1行（ヘッダー情報 + 全フィールドをフラット化）
        - long_data: 各フィールドを1行ずつ展開

        Args:
            results: SmartRead API の results 配列
            request_id: リクエストID
            filename: ファイル名

        Returns:
            (wide_data, long_data) のタプル
        """
        wide_data: list[dict[str, Any]] = []
        long_data: list[dict[str, Any]] = []

        for result in results:
            for page in result.get("pages", []):
                page_index = page.get("pageIndex", 0)
                template_info = page.get("templateMatching", {})
                matches = template_info.get("matches", [])
                template_id = matches[0]["templateId"] if matches else None
                template_confidence = matches[0]["confidence"] if matches else None

                # wide_data: 1ページ1行、全フィールドをカラムとして展開
                wide_row: dict[str, Any] = {
                    "request_id": request_id,
                    "filename": filename,
                    "page_index": page_index,
                    "form_id": page.get("formId"),
                    "template_id": template_id,
                    "template_confidence": template_confidence,
                    "page_state": page.get("state"),
                }

                for field in page.get("fields", []):
                    field_name = field.get("name", field.get("fieldId"))
                    wide_row[field_name] = self._extract_field_value(field)
                    wide_row[f"{field_name}_confidence"] = self._extract_field_confidence(field)

                wide_data.append(wide_row)

                # long_data: 各フィールドを1行ずつ展開
                for field_idx, field in enumerate(page.get("fields", [])):
                    long_row = {
                        "request_id": request_id,
                        "filename": filename,
                        "page_index": page_index,
                        "field_index": field_idx,
                        "field_id": field.get("fieldId"),
                        "field_name": field.get("name"),
                        "value": self._extract_field_value(field),
                        "confidence": self._extract_field_confidence(field),
                        "has_correction": "correction" in field and field["correction"],
                        "bounding_box": field.get("boundingBox"),
                    }
                    long_data.append(long_row)

        return wide_data, long_data

    def _extract_field_value(self, field: dict[str, Any]) -> str:
        """フィールドから値を抽出（correction優先）.

        Args:
            field: フィールドデータ

        Returns:
            抽出された値
        """
        # correction があればそれを使用
        if "correction" in field and field["correction"]:
            return str(field["correction"])

        # フィールドタイプに応じて値を抽出
        if "checkbox" in field:
            return str(field["checkbox"]["isChecked"]["result"])
        elif "boxedCharacters" in field:
            return str(field["boxedCharacters"].get("text", ""))
        elif "singleLine" in field:
            return str(field["singleLine"].get("text", ""))
        elif "multiLine" in field:
            lines = field["multiLine"].get("lines", [])
            return "\n".join(str(line.get("text", "")) for line in lines)

        return ""

    def _extract_field_confidence(self, field: dict[str, Any]) -> float | None:
        """フィールドからconfidenceを抽出.

        Args:
            field: フィールドデータ

        Returns:
            confidence値、またはNone
        """
        if "checkbox" in field:
            conf = field["checkbox"]["isChecked"].get("confidence")
            return float(conf) if conf is not None else None
        elif "boxedCharacters" in field:
            conf = field["boxedCharacters"].get("confidence")
            return float(conf) if conf is not None else None
        elif "singleLine" in field:
            conf = field["singleLine"].get("confidence")
            return float(conf) if conf is not None else None
        elif "multiLine" in field:
            lines = field["multiLine"].get("lines", [])
            if lines:
                confidences = [
                    float(line.get("confidence"))
                    for line in lines
                    if line.get("confidence") is not None
                ]
                return min(confidences) if confidences else None
        return None

    def _save_wide_and_long_from_request(
        self,
        config_id: int,
        request_record: SmartReadRequest,
        wide_data: list[dict[str, Any]],
        long_data: list[dict[str, Any]],
    ) -> None:
        """requestId/resultsルートからのwide/longデータをDBに保存.

        Args:
            config_id: 設定ID
            request_record: SmartReadRequestレコード
            wide_data: 横持ちデータ
            long_data: 縦持ちデータ
        """
        logger.info(
            f"[DB] Saving wide and long data from request: "
            f"{len(wide_data)} wide rows, {len(long_data)} long rows "
            f"for request_id={request_record.request_id}"
        )

        # 横持ちデータを保存
        for row_index, row in enumerate(wide_data):
            fingerprint = self._calculate_row_fingerprint(row)

            wide_record = SmartReadWideData(
                config_id=config_id,
                task_id=request_record.task_id,
                task_date=request_record.task_date,
                request_id_ref=request_record.id,
                export_id=None,  # exportルートではないのでNone
                filename=request_record.filename,
                row_index=row_index,
                content=row,
                row_fingerprint=fingerprint,
            )
            self.session.add(wide_record)

        self.session.flush()

        # 縦持ちデータを保存
        for row_index, row in enumerate(long_data):
            long_record = SmartReadLongData(
                config_id=config_id,
                task_id=request_record.task_id,
                task_date=request_record.task_date,
                request_id_ref=request_record.id,
                wide_data_id=None,  # 直接変換なのでwide_data_idは設定しない
                row_index=row_index,
                content=row,
                status="PENDING",
            )
            self.session.add(long_record)

        self.session.flush()
        logger.info(f"[DB] Saved {len(wide_data)} wide and {len(long_data)} long rows")

    def get_pending_requests(self, config_id: int) -> list[SmartReadRequest]:
        """処理待ちリクエストを取得.

        Args:
            config_id: 設定ID

        Returns:
            PENDINGまたはOCR_RUNNING状態のリクエスト一覧
        """
        stmt = select(SmartReadRequest).where(
            SmartReadRequest.config_id == config_id,
            SmartReadRequest.state.in_(["PENDING", "OCR_RUNNING", "SORTING_RUNNING"]),
        )
        return list(self.session.execute(stmt).scalars().all())

    def get_request_by_id(self, request_id: str) -> SmartReadRequest | None:
        """リクエストIDでレコードを取得.

        Args:
            request_id: リクエストID

        Returns:
            SmartReadRequestレコード、またはNone
        """
        stmt = select(SmartReadRequest).where(SmartReadRequest.request_id == request_id)
        return self.session.execute(stmt).scalar_one_or_none()

    def get_long_data_list(
        self,
        config_id: int,
        task_id: str | None = None,
        limit: int = 1000,
    ) -> list[SmartReadLongData]:
        """縦持ちデータ一覧を取得.

        Args:
            config_id: 設定ID
            task_id: タスクID（オプション）
            limit: 取得件数

        Returns:
            縦持ちデータのリスト
        """
        # 最新のデータを取得するために作成日時で降順ソート
        stmt = (
            select(SmartReadLongData)
            .where(SmartReadLongData.config_id == config_id)
            .order_by(SmartReadLongData.created_at.desc())
            .limit(limit)
        )

        if task_id:
            stmt = stmt.where(SmartReadLongData.task_id == task_id)

        result = self.session.execute(stmt)
        return list(result.scalars().all())


async def process_files_background(
    config_id: int,
    filenames: list[str],
) -> None:
    """バックグラウンドで複心ファイルを処理."""
    from app.application.services.common.uow_service import UnitOfWork
    from app.application.services.smartread.smartread_service import SmartReadService
    from app.core.database import SessionLocal

    logger.info(f"[SmartRead Background] Starting background processing for {len(filenames)} files")

    try:
        with UnitOfWork(SessionLocal) as uow:
            service = SmartReadService(uow.session)
            config = service.get_config(config_id)
            if not config or not config.watch_dir:
                logger.error(
                    f"[SmartRead Background] Config or watch_dir not found for {config_id}"
                )
                return

            await service.process_watch_dir_files(config_id, filenames)
            logger.info("[SmartRead Background] Completed watch dir processing")
    except Exception as e:
        logger.error(f"[SmartRead Background] Error processing watch dir files: {e}")
