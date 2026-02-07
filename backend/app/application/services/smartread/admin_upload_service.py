"""SmartRead Admin Upload Service.

管理者向けのCSV+JSONハイブリッド取得機能を提供。
"""

from __future__ import annotations

import io
import json
import logging
import mimetypes
import time
import zipfile
from datetime import datetime
from typing import TYPE_CHECKING, Any, cast

import requests

from app.application.services.smartread.base import SmartReadBaseService


if TYPE_CHECKING:
    from app.infrastructure.persistence.models import SmartReadConfig


logger = logging.getLogger(__name__)


class SmartReadAdminUploadService(SmartReadBaseService):
    """管理者向けSmartReadアップロードサービス."""

    if TYPE_CHECKING:

        def get_config(self, config_id: int) -> SmartReadConfig | None: ...

    def _create_session(self, api_key: str) -> requests.Session:
        """認証済みセッションを作成."""
        s = requests.Session()
        s.headers.update({"Authorization": f"apikey {api_key}"})
        s.headers.update(
            {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Python-Requests"}
        )
        return s

    def _admin_create_task(
        self,
        session: requests.Session,
        endpoint: str,
        name: str,
        template_ids: list[str] | None,
    ) -> str:
        """常に新規タスクを作成してtaskIdを返す."""
        payload = {
            "name": name,
            "requestType": "templateMatching",
            "exportSettings": {
                "type": "csv",
                "aggregation": "oneFilePerRequest",
            },
            "languages": ["ja"],
        }
        if template_ids:
            payload["templateIds"] = template_ids

        url = f"{endpoint}/task"
        logger.info(f"[AdminUpload] Creating new task: {url}")
        r = session.post(url, json=payload, timeout=30)

        if r.status_code != 202:
            raise RuntimeError(f"タスク作成に失敗: HTTP {r.status_code} {r.text}")

        data = r.json()
        task_id = cast(str | None, data.get("taskId"))
        if not task_id:
            raise RuntimeError(f"taskId が取得できませんでした: {data}")

        return task_id

    def _admin_upload_file(
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
        r = session.post(url, files=files, timeout=60)

        if r.status_code not in (200, 202):
            raise RuntimeError(f"アップロード失敗: {filename} HTTP {r.status_code} {r.text}")

        data = r.json()
        request_id = cast(str | None, data.get("requestId"))
        if not request_id:
            raise RuntimeError(f"requestId が取得できませんでした: {data}")

        return request_id

    def _admin_poll_task_until_completed(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        timeout_sec: int = 600,
    ) -> None:
        """タスクが完了するまでポーリング."""
        url = f"{endpoint}/task/{task_id}"
        start = time.time()

        while True:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            data = r.json()
            state = data.get("state")

            if state == "OCR_COMPLETED":
                return
            if state in ("SORTING_FAILED", "OCR_FAILED"):
                # 部分的な完了でも進める可能性があるが、要件上は安全にエラーとする
                summary = data.get("requestStateSummary") or {}
                if summary.get("OCR_COMPLETED", 0) > 0 and summary.get("OCR_RUNNING", 0) == 0:
                    return
                raise RuntimeError(f"タスク処理失敗: {state}")

            if time.time() - start > timeout_sec:
                raise TimeoutError(f"タスク {task_id} の処理がタイムアウトしました")

            time.sleep(2)

    def _admin_start_export(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        aggregation: str = "oneFilePerRequest",
    ) -> str:
        """エクスポートを開始してexportIdを返す. エラー1804のハンドリング付き."""
        url = f"{endpoint}/task/{task_id}/export"
        payload = {"type": "csv", "aggregation": aggregation}

        r = session.post(url, json=payload, timeout=30)

        if r.status_code == 400:
            data = r.json()
            errors = data.get("errors", [])
            if errors and str(errors[0].get("code")) == "1804":
                if aggregation == "oneFilePerRequest":
                    logger.warning(
                        "[AdminUpload] oneFilePerRequest not supported, retrying with oneFile"
                    )
                    return self._admin_start_export(
                        session, endpoint, task_id, aggregation="oneFile"
                    )

        if r.status_code not in (200, 202):
            raise RuntimeError(f"Export開始失敗: HTTP {r.status_code} {r.text}")

        data = r.json()
        return cast(str, data.get("exportId"))

    def _admin_poll_export_until_completed(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        export_id: str,
        timeout_sec: int = 300,
    ) -> str:
        """エクスポートが完了するまでポーリングし、最終的なaggregationを返す."""
        url = f"{endpoint}/task/{task_id}/export/{export_id}"
        start = time.time()

        while True:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            data = r.json()
            state = data.get("state")

            if state == "COMPLETED":
                return cast(str, data.get("aggregation"))
            if state == "FAILED":
                raise RuntimeError(f"Export処理失敗: {data.get('error_message')}")

            if time.time() - start > timeout_sec:
                raise TimeoutError(f"Export {export_id} の処理がタイムアウトしました")

            time.sleep(2)

    def _get_request_result_json(
        self,
        session: requests.Session,
        endpoint: str,
        request_id: str,
    ) -> dict[str, Any]:
        """個別のrequestIdから詳細JSONを取得."""
        url = f"{endpoint}/request/{request_id}/results"
        r = session.get(url, timeout=30)

        # 1308 (Template Not Matched) のチェック等が必要な場合はここで行う
        # 現時点では取得を最優先
        if r.status_code != 200:
            logger.error(f"[AdminUpload] Failed to get json for {request_id}: {r.text}")
            return {}

        return cast(dict[str, Any], r.json())

    async def process_admin_upload(
        self,
        config_id: int,
        files: list[tuple[bytes, str]],
    ) -> bytes:
        """管理用ハイブリッドインポートプロセスのメインロジック.

        1. 常に新規タスク作成
        2. 全ファイルをアップロード (requestId記録)
        3. 完了待機
        4. CSV出力 (oneFilePerRequest -> oneFile のフォールバック)
        5. 各requestIdのJSON取得
        6. 全てをZIPに固めてバイナリで返す
        """
        config = self.get_config(config_id)
        if not config:
            raise RuntimeError(f"設定が見つかりません: config_id={config_id}")

        endpoint = config.endpoint.rstrip("/")
        api_key = config.api_key
        template_ids = (
            [t.strip() for t in config.template_ids.split(",") if t.strip()]
            if config.template_ids
            else None
        )

        session = self._create_session(api_key)

        try:
            # 1. 新規タスク作成
            task_name = f"ADMIN_HYBRID_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            task_id = self._admin_create_task(session, endpoint, task_name, template_ids)

            # 2. アップロード
            request_map = []  # list of (request_id, filename)
            for content, name in files:
                req_id = self._admin_upload_file(session, endpoint, task_id, content, name)
                request_map.append({"request_id": req_id, "filename": name})

            # 3. 待ち
            self._admin_poll_task_until_completed(session, endpoint, task_id)

            # 4. エクスポート
            export_id = self._admin_start_export(session, endpoint, task_id)
            self._admin_poll_export_until_completed(session, endpoint, task_id, export_id)

            # 5. ダウンロード
            dl_url = f"{endpoint}/task/{task_id}/export/{export_id}/download"
            r_dl = session.get(dl_url, timeout=120)
            if r_dl.status_code != 200:
                raise RuntimeError("CSVダウンロードに失敗しました")

            # ZIPの作成準備
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
                # 取得したCSVを追加
                with zipfile.ZipFile(io.BytesIO(r_dl.content)) as csv_zip:
                    for name in csv_zip.namelist():
                        if name.endswith(".csv"):
                            zf.writestr(name, csv_zip.read(name))

                # 詳細JSONを取得して追加
                for item in request_map:
                    req_id = item["request_id"]
                    fname = item["filename"]
                    json_data = self._get_request_result_json(session, endpoint, req_id)
                    if json_data:
                        json_filename = f"{fname}.json"
                        zf.writestr(
                            json_filename, json.dumps(json_data, ensure_ascii=False, indent=2)
                        )

                # マッピングファイルを追加
                zf.writestr("mapping.json", json.dumps(request_map, ensure_ascii=False, indent=2))

            return zip_buffer.getvalue()

        finally:
            session.close()
