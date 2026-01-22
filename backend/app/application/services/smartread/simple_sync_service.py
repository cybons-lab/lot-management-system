"""SmartRead Simple Sync Service.

参考コードを基にしたシンプルで確実な同期実装。
requestsライブラリを使用した同期処理。
"""

from __future__ import annotations

import csv
import io
import logging
import mimetypes
import time
import zipfile
from datetime import date, datetime
from typing import TYPE_CHECKING, Any, cast

import requests

from app.application.services.smartread.base import SmartReadBaseService


if TYPE_CHECKING:
    from app.infrastructure.persistence.models import SmartReadConfig


logger = logging.getLogger(__name__)


class SmartReadSimpleSyncService(SmartReadBaseService):
    """シンプルなSmartRead同期サービス.

    参考コードを基にした確実な実装。
    """

    if TYPE_CHECKING:

        def get_config(self, config_id: int) -> SmartReadConfig | None: ...

        def _save_wide_and_long_data(
            self,
            config_id: int,
            task_id: str,
            export_id: str,
            task_date: date,
            wide_data: list[dict[str, Any]],
            long_data: list[dict[str, Any]],
            filename: str,
        ) -> None: ...

    def _create_session(self, api_key: str) -> requests.Session:
        """認証済みセッションを作成."""
        s = requests.Session()
        s.headers.update({"Authorization": f"apikey {api_key}"})
        s.headers.update(
            {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Python-Requests"}
        )
        return s

    def _create_task(
        self,
        session: requests.Session,
        endpoint: str,
        name: str,
        request_type: str,
        template_ids: list[str] | None,
        export_type: str,
        aggregation: str,
    ) -> str:
        """タスクを作成してtaskIdを返す."""
        payload = {
            "name": name,
            "requestType": request_type,
            "exportSettings": {
                "type": export_type,
                "aggregation": aggregation,
            },
        }
        if template_ids:
            payload["templateIds"] = template_ids

        url = f"{endpoint}/task"
        logger.info(f"[SimpleSync] Creating task: {url}")
        r = session.post(url, json=payload, timeout=30)

        if r.status_code != 202:
            raise RuntimeError(f"タスク作成に失敗: HTTP {r.status_code} {r.text}")

        data = r.json()
        task_id = cast(str | None, data.get("taskId"))
        if not task_id:
            raise RuntimeError(f"taskId が取得できませんでした: {data}")

        logger.info(f"[SimpleSync] Task created: {task_id}")
        return task_id

    def _upload_file(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        file_content: bytes,
        filename: str,
    ) -> str:
        """ファイルをアップロードしてrequestIdを返す."""
        url = f"{endpoint}/task/{task_id}/request"
        mime, _ = mimetypes.guess_type(filename)
        if mime is None:
            mime = "application/octet-stream"

        files = {"image": (filename, file_content, mime)}

        logger.info(f"[SimpleSync] Uploading file: {filename}")
        r = session.post(url, files=files, timeout=60)

        if r.status_code not in (200, 202):
            raise RuntimeError(f"アップロード失敗: {filename} HTTP {r.status_code} {r.text}")

        data = r.json()
        request_id = cast(str | None, data.get("requestId"))
        if not request_id:
            raise RuntimeError(f"requestId が取得できませんでした: {data}")

        logger.info(f"[SimpleSync] File uploaded, requestId: {request_id}")
        return request_id

    def _poll_request_until_done(
        self,
        session: requests.Session,
        endpoint: str,
        request_id: str,
        timeout_sec: int = 600,
    ) -> dict[str, Any]:
        """リクエストが完了するまでポーリング."""
        url = f"{endpoint}/request/{request_id}"
        start = time.time()

        logger.info(f"[SimpleSync] Polling request {request_id} until completed...")

        while True:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            data = r.json()
            state = data.get("state")

            logger.info(f"[SimpleSync] Request state: {state}")

            if state not in ("SORTING_RUNNING", "OCR_RUNNING"):
                return cast(dict[str, Any], data)

            if time.time() - start > timeout_sec:
                raise TimeoutError(f"request {request_id} の処理がタイムアウトしました")

            time.sleep(1)

    def _poll_task_until_completed(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        timeout_sec: int = 600,
    ) -> dict[str, Any]:
        """タスクが完了するまでポーリング."""
        url = f"{endpoint}/task/{task_id}"
        start = time.time()

        logger.info(f"[SimpleSync] Polling task {task_id} until completed...")

        while True:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            data = r.json()
            state = data.get("state")

            logger.info(f"[SimpleSync] Task state: {state}")

            # 完了条件
            if state == "OCR_COMPLETED":
                return cast(dict[str, Any], data)

            # 失敗チェック
            if state in ("SORTING_FAILED", "OCR_FAILED"):
                summary = data.get("formStateSummary") or {}
                if summary.get("OCR_RUNNING", 0) == 0 and summary.get("OCR_COMPLETED", 0) > 0:
                    return cast(dict[str, Any], data)
                raise RuntimeError(f"タスク処理失敗: {state}")

            # タイムアウトチェック
            if time.time() - start > timeout_sec:
                raise TimeoutError(f"タスク {task_id} の処理がタイムアウトしました")

            time.sleep(2)

    def _start_export(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        export_type: str,
        aggregation: str,
    ) -> str:
        """エクスポートを開始してexportIdを返す."""
        url = f"{endpoint}/task/{task_id}/export"
        payload = {"type": export_type, "aggregation": aggregation}

        logger.info(f"[SimpleSync] Starting export for task {task_id}")
        r = session.post(url, json=payload, timeout=30)

        if r.status_code not in (200, 202):
            raise RuntimeError(f"Export開始失敗: HTTP {r.status_code} {r.text}")

        data = r.json()
        export_id = cast(str | None, data.get("exportId"))
        if not export_id:
            raise RuntimeError(f"exportId が取得できませんでした: {data}")

        logger.info(f"[SimpleSync] Export started: {export_id}")
        return export_id

    def _poll_export_until_completed(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        export_id: str,
        timeout_sec: int = 600,
    ) -> dict[str, Any]:
        """エクスポートが完了するまでポーリング."""
        url = f"{endpoint}/task/{task_id}/export/{export_id}"
        start = time.time()

        logger.info(f"[SimpleSync] Polling export {export_id} until completed...")

        while True:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            data = r.json()
            state = data.get("state")

            logger.info(f"[SimpleSync] Export state: {state}")

            if state != "RUNNING":
                return cast(dict[str, Any], data)

            if time.time() - start > timeout_sec:
                raise TimeoutError(f"Export {export_id} の処理がタイムアウトしました")

            time.sleep(2)

    def _download_export_zip(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        export_id: str,
    ) -> bytes:
        """エクスポートZIPをダウンロード."""
        url = f"{endpoint}/task/{task_id}/export/{export_id}/download"

        logger.info(f"[SimpleSync] Downloading export ZIP: {url}")
        r = session.get(url, timeout=120)

        if r.status_code != 200:
            raise RuntimeError(
                f"ダウンロード失敗: TaskId={task_id} ExportId={export_id} HTTP {r.status_code}"
            )

        logger.info(f"[SimpleSync] Downloaded {len(r.content)} bytes")
        return r.content

    def _extract_csv_from_zip(self, zip_content: bytes) -> list[dict[str, Any]]:
        """ZIPからCSVを抽出してパース."""
        wide_data: list[dict[str, Any]] = []

        with zipfile.ZipFile(io.BytesIO(zip_content)) as zf:
            for name in zf.namelist():
                if name.endswith(".csv"):
                    logger.info(f"[SimpleSync] Extracting CSV: {name}")
                    with zf.open(name) as f:
                        # UTF-8 with BOMを考慮
                        content = f.read()
                        try:
                            text = content.decode("utf-8-sig")
                        except UnicodeDecodeError:
                            text = content.decode("cp932", errors="replace")

                        reader = csv.DictReader(io.StringIO(text))
                        for row in reader:
                            wide_data.append(dict(row))

                    logger.info(f"[SimpleSync] Parsed {len(wide_data)} rows from {name}")

        return wide_data

    async def sync_with_simple_flow(
        self,
        config_id: int,
        file_content: bytes,
        filename: str,
        *,
        export_type_override: str | None = None,
        aggregation_override: str | None = None,
    ) -> dict[str, Any]:
        """シンプルなフローでPDFを処理して結果を返す.

        1. タスク作成
        2. ファイルアップロード
        3. タスク完了待ち
        4. エクスポート開始
        5. エクスポート完了待ち
        6. ZIPダウンロード
        7. CSV抽出
        8. DB保存

        Args:
            config_id: 設定ID
            file_content: ファイルのバイナリデータ
            filename: ファイル名
            export_type_override: エクスポート形式の上書き
            aggregation_override: 集約形式の上書き

        Returns:
            処理結果 (wide_data, long_data, errors)
        """
        config = self.get_config(config_id)
        if not config:
            raise RuntimeError(f"設定が見つかりません: config_id={config_id}")

        # 設定から値を取得
        endpoint = config.endpoint.rstrip("/")
        api_key = config.api_key
        template_ids = None
        if config.template_ids:
            template_ids = [
                t.strip() for t in config.template_ids.split(",") if t.strip()
            ]
        export_type = export_type_override or config.export_type or "csv"
        aggregation = aggregation_override or config.aggregation_type or "perPage"

        # セッション作成
        session = self._create_session(api_key)

        try:
            # 1. タスク作成
            task_name = f"OCR_{date.today().strftime('%Y%m%d')}_{filename}"
            task_id = self._create_task(
                session=session,
                endpoint=endpoint,
                name=task_name,
                request_type="templateMatching",
                template_ids=template_ids,
                export_type=export_type,
                aggregation=aggregation,
            )

            # 2. ファイルアップロード
            _request_id = self._upload_file(
                session=session,
                endpoint=endpoint,
                task_id=task_id,
                file_content=file_content,
                filename=filename,
            )

            # 3. タスク完了待ち (10分タイムアウト)
            self._poll_task_until_completed(
                session=session,
                endpoint=endpoint,
                task_id=task_id,
                timeout_sec=600,
            )

            # 4. エクスポート開始
            export_id = self._start_export(
                session=session,
                endpoint=endpoint,
                task_id=task_id,
                export_type=export_type,
                aggregation=aggregation,
            )

            # 5. エクスポート完了待ち
            self._poll_export_until_completed(
                session=session,
                endpoint=endpoint,
                task_id=task_id,
                export_id=export_id,
                timeout_sec=300,
            )

            # 6. ZIPダウンロード
            zip_content = self._download_export_zip(
                session=session,
                endpoint=endpoint,
                task_id=task_id,
                export_id=export_id,
            )

            # 7. CSV抽出
            wide_data = self._extract_csv_from_zip(zip_content)

            # 8. 縦持ち変換
            from app.application.services.smartread.csv_transformer import (
                SmartReadCsvTransformer,
            )

            transformer = SmartReadCsvTransformer()
            transform_result = transformer.transform_to_long(wide_data, skip_empty=True)

            # 9. DB保存
            self._save_wide_and_long_data(
                config_id=config_id,
                task_id=task_id,
                export_id=export_id,
                task_date=date.today(),
                wide_data=wide_data,
                long_data=transform_result.long_data,
                filename=filename,
            )
            self.session.commit()

            logger.info(
                f"[SimpleSync] Complete: {len(wide_data)} wide rows, "
                f"{len(transform_result.long_data)} long rows"
            )

            return {
                "success": True,
                "task_id": task_id,
                "export_id": export_id,
                "wide_data": wide_data,
                "long_data": transform_result.long_data,
                "errors": [
                    {
                        "row": e.row,
                        "field": e.field,
                        "message": e.message,
                        "value": e.value,
                    }
                    for e in transform_result.errors
                ],
                "filename": filename,
            }

        except Exception as e:
            logger.error(f"[SimpleSync] Failed: {e}")
            raise
        finally:
            session.close()

    async def sync_watch_dir_files(
        self,
        config_id: int,
        files_to_process: list[tuple[bytes, str]],
    ) -> dict[str, Any]:
        """監視フォルダの複数ファイルを1タスクで処理する."""
        config = self.get_config(config_id)
        if not config:
            raise RuntimeError(f"設定が見つかりません: config_id={config_id}")

        endpoint = config.endpoint.rstrip("/")
        api_key = config.api_key
        template_ids = None
        if config.template_ids:
            template_ids = [
                t.strip() for t in config.template_ids.split(",") if t.strip()
            ]
        export_type = config.export_type or "csv"
        aggregation = config.aggregation_type or "oneFilePerTemplate"

        session = self._create_session(api_key)
        request_states: list[dict[str, Any]] = []
        task_id = None
        export_id = None

        try:
            task_name = f"OCR_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            task_id = self._create_task(
                session=session,
                endpoint=endpoint,
                name=task_name,
                request_type="templateMatching",
                template_ids=template_ids,
                export_type=export_type,
                aggregation=aggregation,
            )

            for file_content, filename in files_to_process:
                request_id = self._upload_file(
                    session=session,
                    endpoint=endpoint,
                    task_id=task_id,
                    file_content=file_content,
                    filename=filename,
                )
                state = self._poll_request_until_done(
                    session=session,
                    endpoint=endpoint,
                    request_id=request_id,
                    timeout_sec=600,
                )
                request_states.append(
                    {"request_id": request_id, "filename": filename, "state": state}
                )

            self._poll_task_until_completed(
                session=session,
                endpoint=endpoint,
                task_id=task_id,
                timeout_sec=600,
            )

            export_id = self._start_export(
                session=session,
                endpoint=endpoint,
                task_id=task_id,
                export_type=export_type,
                aggregation=aggregation,
            )

            export_status = self._poll_export_until_completed(
                session=session,
                endpoint=endpoint,
                task_id=task_id,
                export_id=export_id,
                timeout_sec=600,
            )
            if export_status.get("state") != "COMPLETED":
                raise RuntimeError(f"Export処理でエラーが発生しました: {export_status}")

            zip_content = self._download_export_zip(
                session=session,
                endpoint=endpoint,
                task_id=task_id,
                export_id=export_id,
            )

            wide_data = self._extract_csv_from_zip(zip_content)

            from app.application.services.smartread.csv_transformer import (
                SmartReadCsvTransformer,
            )

            transformer = SmartReadCsvTransformer()
            transform_result = transformer.transform_to_long(wide_data, skip_empty=True)

            self._save_wide_and_long_data(
                config_id=config_id,
                task_id=task_id,
                export_id=export_id,
                task_date=date.today(),
                wide_data=wide_data,
                long_data=transform_result.long_data,
                filename="watch_dir_batch",
            )
            self.session.commit()

            logger.info(
                f"[SimpleSync] Watch dir complete: {len(wide_data)} wide rows, "
                f"{len(transform_result.long_data)} long rows"
            )

            return {
                "success": True,
                "task_id": task_id,
                "export_id": export_id,
                "wide_data": wide_data,
                "long_data": transform_result.long_data,
                "errors": [
                    {
                        "row": e.row,
                        "field": e.field,
                        "message": e.message,
                        "value": e.value,
                    }
                    for e in transform_result.errors
                ],
                "requests": request_states,
            }
        except Exception as e:
            logger.error(f"[SimpleSync] Watch dir failed: {e}")
            raise
        finally:
            session.close()
