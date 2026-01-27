"""SmartRead PAD互換ランナーサービス.

PADスクリプトの手順（task→request→poll→export→download→CSV後処理）を
サーバ側で「一本道」として確実に実行し、各工程をDBに記録する。

See: docs/smartread/pad_runner_implementation_plan.md
"""

from __future__ import annotations

import csv
import io
import logging
import mimetypes
import shutil
import time
import uuid
import zipfile
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any, cast

import requests
from sqlalchemy.orm import Session


if TYPE_CHECKING:
    from app.infrastructure.persistence.models import SmartReadConfig, SmartReadPadRun


logger = logging.getLogger(__name__)

# Stale判定の閾値（この時間heartbeatが更新されなければSTALE）
HEARTBEAT_STALE_THRESHOLD_SECONDS = 120
# ポーリング中のheartbeat更新間隔
HEARTBEAT_UPDATE_INTERVAL_SECONDS = 30


class SmartReadPadRunnerService:
    """PAD互換フローのオーケストレータ.

    重要: execute_run は同期関数。HTTP I/O や ZIP処理など重い処理を含むため、
    threading.Thread で実行すること。BackgroundTasks は使用しない。
    """

    def __init__(self, session: Session):
        self.session = session

    def start_run(
        self,
        config_id: int,
        filenames: list[str],
    ) -> str:
        """PAD互換フローを開始し、run_id を返す（同期）.

        Args:
            config_id: SmartRead設定ID
            filenames: 監視フォルダ内のファイル名リスト

        Note:
            ブラウザからの直接アップロードは /analyze-simple を使用。
            このAPIは監視フォルダ内のファイルを指定して実行する用途。
        """
        from app.infrastructure.persistence.models import SmartReadPadRun

        run_id = str(uuid.uuid4())

        run = SmartReadPadRun(
            run_id=run_id,
            config_id=config_id,
            status="RUNNING",
            step="CREATED",
            filenames=filenames,
            heartbeat_at=datetime.now(),
        )
        self.session.add(run)
        self.session.commit()

        logger.info(f"[PAD Run {run_id}] Started with {len(filenames)} files")
        return run_id

    def execute_run(self, run_id: str) -> None:
        """PAD互換フローを実行（同期関数・スレッドで実行すること）.

        重要: この関数は同期I/O（requests, ZIP処理）を含むため、
        threading.Thread で呼び出すこと。
        """
        run = self._get_run(run_id)
        if not run:
            logger.error(f"[PAD Run {run_id}] Run not found")
            return

        config = self._get_config(run.config_id)
        if not config:
            self._fail_run(run, "設定が見つかりません")
            return

        if not run.filenames:
            self._fail_run(run, "処理対象ファイルが指定されていません")
            return

        try:
            # requests.Session を使用（同期HTTP）
            api_session = self._create_api_session(config.api_key)
            endpoint = config.endpoint.rstrip("/")
            template_ids = self._parse_template_ids(config.template_ids)
            export_type = config.export_type or "csv"
            aggregation = config.aggregation_type or "oneFilePerTemplate"

            # 1. タスク作成
            self._update_step(run, "TASK_CREATED")
            task_name = f"PAD_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            task_id = self._create_task(
                api_session,
                endpoint,
                task_name,
                "templateMatching",
                template_ids,
                export_type,
                aggregation,
            )
            run.task_id = task_id
            self._update_heartbeat(run)

            # 2. ファイルアップロード
            self._update_step(run, "UPLOADED")
            watch_dir = Path(config.watch_dir) if config.watch_dir else None
            filenames = run.filenames or []
            request_ids = self._upload_files(api_session, endpoint, task_id, filenames, watch_dir)
            self._update_heartbeat(run)

            # 3. リクエスト完了待ち（ポーリング中もheartbeat更新）
            self._update_step(run, "REQUEST_DONE")
            for request_id in request_ids:

                def check_rid(rid: str = request_id) -> bool | None:
                    return self._check_request_done(api_session, endpoint, rid)

                self._poll_with_heartbeat(
                    run,
                    check_rid,
                    timeout_sec=600,
                    poll_interval=2.0,
                )

            # 4. タスク完了待ち（ポーリング中もheartbeat更新）
            self._update_step(run, "TASK_DONE")

            def check_task() -> bool | None:
                return self._check_task_done(api_session, endpoint, task_id)

            self._poll_with_heartbeat(
                run,
                check_task,
                timeout_sec=600,
                poll_interval=2.0,
            )

            # 5. Export開始 ★PADスクリプトと同じ・必須ゲート
            self._update_step(run, "EXPORT_STARTED")
            export_id = self._start_export(api_session, endpoint, task_id, export_type, aggregation)
            run.export_id = export_id
            self.session.commit()
            logger.info(f"[PAD Run {run_id}] Export started: {export_id}")
            self._update_heartbeat(run)

            # 6. Export完了待ち（ポーリング中もheartbeat更新）
            self._update_step(run, "EXPORT_DONE")

            def check_export() -> bool | None:
                return self._check_export_done(api_session, endpoint, task_id, export_id)

            self._poll_with_heartbeat(
                run,
                check_export,
                timeout_sec=300,
                poll_interval=2.0,
            )

            # 7. ZIPダウンロード
            self._update_step(run, "DOWNLOADED")
            zip_content = self._download_export_zip(api_session, endpoint, task_id, export_id)
            self._update_heartbeat(run)

            # 8. CSV後処理（縦持ち変換）
            self._update_step(run, "POSTPROCESSED")
            wide_data = self._extract_csv_from_zip(zip_content)
            long_data, errors = self._transform_to_long(wide_data)
            self._update_heartbeat(run)

            # 結果をDBに保存
            self._save_results(run, config.id, task_id, export_id, wide_data, long_data)

            # ★★★ 成功判定: EXPORT_STARTEDを通過していることを確認 ★★★
            if not run.export_id:
                raise RuntimeError("Export工程を通過していません（export_idが未設定）")

            # 成功
            run.status = "SUCCEEDED"
            run.wide_data_count = len(wide_data)
            run.long_data_count = len(long_data)
            run.completed_at = datetime.now()
            # 処理済みファイルの移動 (Success)
            if watch_dir and filenames:
                for filename in filenames:
                    try:
                        self._move_watch_file(watch_dir, filename, "Done")
                    except Exception as e:
                        logger.warning(
                            f"[PAD Run {run_id}] Failed to move file {filename} to Done: {e}"
                        )

            # 成功
            run.status = "SUCCEEDED"

        except Exception as e:
            logger.exception(f"[PAD Run {run_id}] Failed: {e}")
            self._fail_run(run, str(e))
        finally:
            api_session.close()

    def get_run_status(self, run_id: str) -> dict[str, Any] | None:
        """実行状態を取得（stale検出含む）."""
        run = self._get_run(run_id)
        if not run:
            return None

        # Stale検出: RUNNINGで一定時間heartbeatが更新されていない場合
        if run.status == "RUNNING":
            threshold = datetime.now() - timedelta(seconds=HEARTBEAT_STALE_THRESHOLD_SECONDS)
            if run.heartbeat_at < threshold:
                run.status = "STALE"
                run.error_message = (
                    f"バックグラウンド処理が応答なし（{HEARTBEAT_STALE_THRESHOLD_SECONDS}秒以上）"
                )
                self.session.commit()
                logger.warning(f"[PAD Run {run_id}] Marked as STALE")

        return {
            "run_id": run.run_id,
            "config_id": run.config_id,
            "status": run.status,
            "step": run.step,
            "task_id": run.task_id,
            "export_id": run.export_id,
            "filenames": run.filenames,
            "wide_data_count": run.wide_data_count,
            "long_data_count": run.long_data_count,
            "error_message": run.error_message,
            "created_at": run.created_at.isoformat(),
            "updated_at": run.updated_at.isoformat(),
            "heartbeat_at": run.heartbeat_at.isoformat(),
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "can_retry": run.status in ("FAILED", "STALE") and run.retry_count < run.max_retries,
            "retry_count": run.retry_count,
            "max_retries": run.max_retries,
        }

    def retry_run(self, run_id: str) -> str | None:
        """失敗/Staleの実行をリトライ（新しいrun_idを返す）."""
        run = self._get_run(run_id)
        if not run:
            return None

        if run.status not in ("FAILED", "STALE"):
            return None

        if run.retry_count >= run.max_retries:
            return None

        # 元のrunのリトライカウントを増やす
        run.retry_count += 1
        self.session.commit()

        # 新しいrunを作成（同じ入力で）
        new_run_id = self.start_run(
            config_id=run.config_id,
            filenames=run.filenames or [],
        )

        logger.info(f"[PAD Run {run_id}] Retrying as {new_run_id}")
        return new_run_id

    def list_runs(
        self,
        config_id: int,
        limit: int = 20,
        status_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """PAD Runの一覧を取得."""
        from app.infrastructure.persistence.models import SmartReadPadRun

        query = self.session.query(SmartReadPadRun).filter(SmartReadPadRun.config_id == config_id)

        if status_filter:
            query = query.filter(SmartReadPadRun.status == status_filter)

        runs = query.order_by(SmartReadPadRun.created_at.desc()).limit(limit).all()

        return [
            {
                "run_id": r.run_id,
                "status": r.status,
                "step": r.step,
                "filenames": r.filenames,
                "wide_data_count": r.wide_data_count,
                "long_data_count": r.long_data_count,
                "created_at": r.created_at.isoformat(),
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in runs
        ]

    # --- Private methods ---

    def _get_run(self, run_id: str) -> SmartReadPadRun | None:
        from app.infrastructure.persistence.models import SmartReadPadRun

        return self.session.query(SmartReadPadRun).filter_by(run_id=run_id).first()

    def _get_config(self, config_id: int) -> SmartReadConfig | None:
        from app.infrastructure.persistence.models import SmartReadConfig

        return self.session.query(SmartReadConfig).filter_by(id=config_id).first()

    def _update_step(self, run: SmartReadPadRun, step: str) -> None:
        run.step = step
        run.updated_at = datetime.now()
        self.session.commit()
        logger.info(f"[PAD Run {run.run_id}] Step: {step}")

    def _update_heartbeat(self, run: SmartReadPadRun) -> None:
        run.heartbeat_at = datetime.now()
        self.session.commit()

    def _fail_run(self, run: SmartReadPadRun, error_message: str) -> None:
        run.status = "FAILED"
        run.error_message = error_message
        run.completed_at = datetime.now()
        self.session.commit()
        logger.error(f"[PAD Run {run.run_id}] Failed: {error_message}")

        # 失敗ファイルの移動
        try:
            config = self._get_config(run.config_id)
            if config and config.watch_dir and run.filenames:
                watch_dir = Path(config.watch_dir)
                for filename in run.filenames:
                    try:
                        self._move_watch_file(watch_dir, filename, "Error")
                    except Exception as e:
                        logger.warning(f"Failed to move file {filename} to Error: {e}")
        except Exception as e:
            logger.error(f"Failed to process file moving for failed run: {e}")

    def _move_watch_file(self, watch_dir: Path, filename: str, subdir: str) -> None:
        """処理済みファイルをサブフォルダへ移動."""
        destination_dir = watch_dir / subdir
        destination_dir.mkdir(parents=True, exist_ok=True)
        source_path = watch_dir / filename
        destination_path = destination_dir / filename

        # ファイルが存在する場合のみ移動
        if source_path.exists():
            shutil.move(str(source_path), str(destination_path))
            logger.info(f"[PAD Runner] Moved {filename} to {subdir}")

    def _parse_template_ids(self, template_ids_str: str | None) -> list[str] | None:
        if not template_ids_str:
            return None
        return [t.strip() for t in template_ids_str.split(",") if t.strip()]

    def _create_api_session(self, api_key: str) -> requests.Session:
        """requests.Session を作成（SmartRead API用）."""
        session = requests.Session()
        session.headers.update(
            {
                "Authorization": f"apikey {api_key}",
                "User-Agent": "LotManagementSystem-PADRunner/1.0",
            }
        )
        return session

    def _poll_with_heartbeat(
        self,
        run: SmartReadPadRun,
        check_fn: Callable[[], bool | None],
        timeout_sec: float = 600,
        poll_interval: float = 2.0,
    ) -> None:
        """ポーリング中もheartbeatを更新するラッパー.

        Args:
            run: 実行中のPadRun（heartbeat更新用）
            check_fn: 1回のポーリングを行う関数（Trueを返したら完了、Noneで継続）
            timeout_sec: タイムアウト（秒）
            poll_interval: ポーリング間隔（秒）
        """
        start_time = time.time()
        last_heartbeat = time.time()

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout_sec:
                raise TimeoutError(f"Polling timeout after {timeout_sec}s")

            # 定期的にheartbeat更新
            if time.time() - last_heartbeat > HEARTBEAT_UPDATE_INTERVAL_SECONDS:
                self._update_heartbeat(run)
                last_heartbeat = time.time()

            # ポーリング実行
            result = check_fn()
            if result is True:
                return

            time.sleep(poll_interval)

    # --- SmartRead API methods ---

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
        payload: dict[str, Any] = {
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
        logger.info(f"[PAD Runner] Creating task: {url}")
        r = session.post(url, json=payload, timeout=30)

        if r.status_code != 202:
            raise RuntimeError(f"タスク作成に失敗: HTTP {r.status_code} {r.text}")

        data = r.json()
        task_id = cast(str | None, data.get("taskId"))
        if not task_id:
            raise RuntimeError(f"taskId が取得できませんでした: {data}")

        logger.info(f"[PAD Runner] Task created: {task_id}")
        return task_id

    def _upload_files(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        filenames: list[str],
        watch_dir: Path | None,
    ) -> list[str]:
        """ファイルをアップロードしてrequestIdのリストを返す."""
        request_ids = []

        for filename in filenames:
            if watch_dir:
                file_path = watch_dir / filename
                if not file_path.exists():
                    raise RuntimeError(f"ファイルが見つかりません: {file_path}")
                file_content = file_path.read_bytes()
            else:
                raise RuntimeError("watch_dir が設定されていません")

            request_id = self._upload_file(session, endpoint, task_id, file_content, filename)
            request_ids.append(request_id)

        return request_ids

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

        logger.info(f"[PAD Runner] Uploading file: {filename}")
        r = session.post(url, files=files, timeout=60)

        if r.status_code not in (200, 202):
            raise RuntimeError(f"アップロード失敗: {filename} HTTP {r.status_code} {r.text}")

        data = r.json()
        request_id = cast(str | None, data.get("requestId"))
        if not request_id:
            raise RuntimeError(f"requestId が取得できませんでした: {data}")

        logger.info(f"[PAD Runner] File uploaded, requestId: {request_id}")
        return request_id

    def _check_request_done(
        self,
        session: requests.Session,
        endpoint: str,
        request_id: str,
    ) -> bool | None:
        """リクエストが完了したかチェック."""
        url = f"{endpoint}/request/{request_id}"
        r = session.get(url, timeout=30)
        r.raise_for_status()
        data = r.json()
        state = data.get("state")

        logger.debug(f"[PAD Runner] Request {request_id} state: {state}")

        if state not in ("SORTING_RUNNING", "OCR_RUNNING"):
            return True
        return None

    def _check_task_done(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
    ) -> bool | None:
        """タスクが完了したかチェック."""
        url = f"{endpoint}/task/{task_id}"
        r = session.get(url, timeout=30)
        r.raise_for_status()
        data = r.json()
        state = data.get("state")

        logger.debug(f"[PAD Runner] Task {task_id} state: {state}")

        if state == "OCR_COMPLETED":
            return True

        if state in ("SORTING_FAILED", "OCR_FAILED"):
            summary = data.get("formStateSummary") or {}
            if summary.get("OCR_RUNNING", 0) == 0 and summary.get("OCR_COMPLETED", 0) > 0:
                return True
            raise RuntimeError(f"タスク処理失敗: {state}")

        return None

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

        logger.info(f"[PAD Runner] Starting export for task {task_id}")
        r = session.post(url, json=payload, timeout=30)

        if r.status_code not in (200, 202):
            raise RuntimeError(f"Export開始失敗: HTTP {r.status_code} {r.text}")

        data = r.json()
        export_id = cast(str | None, data.get("exportId"))
        if not export_id:
            raise RuntimeError(f"exportId が取得できませんでした: {data}")

        logger.info(f"[PAD Runner] Export started: {export_id}")
        return export_id

    def _check_export_done(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        export_id: str,
    ) -> bool | None:
        """エクスポートが完了したかチェック."""
        url = f"{endpoint}/task/{task_id}/export/{export_id}"
        r = session.get(url, timeout=30)
        r.raise_for_status()
        data = r.json()
        state = data.get("state")

        logger.debug(f"[PAD Runner] Export {export_id} state: {state}")

        if state == "COMPLETED":
            return True
        if state == "FAILED":
            raise RuntimeError(f"Export処理失敗: {data}")
        return None

    def _download_export_zip(
        self,
        session: requests.Session,
        endpoint: str,
        task_id: str,
        export_id: str,
    ) -> bytes:
        """エクスポートZIPをダウンロード."""
        url = f"{endpoint}/task/{task_id}/export/{export_id}/download"

        logger.info("[PAD Runner] Downloading export ZIP")
        r = session.get(url, timeout=120)

        if r.status_code != 200:
            raise RuntimeError(
                f"ダウンロード失敗: TaskId={task_id} ExportId={export_id} HTTP {r.status_code}"
            )

        logger.info(f"[PAD Runner] Downloaded {len(r.content)} bytes")
        return r.content

    def _extract_csv_from_zip(self, zip_content: bytes) -> list[dict[str, Any]]:
        """ZIPからCSVを抽出してパース."""
        wide_data: list[dict[str, Any]] = []

        with zipfile.ZipFile(io.BytesIO(zip_content)) as zf:
            for name in zf.namelist():
                if name.endswith(".csv"):
                    logger.info(f"[PAD Runner] Extracting CSV: {name}")
                    with zf.open(name) as f:
                        content = f.read()
                        try:
                            text = content.decode("utf-8-sig")
                        except UnicodeDecodeError:
                            text = content.decode("cp932", errors="replace")

                        reader = csv.DictReader(io.StringIO(text))
                        for row in reader:
                            wide_data.append(dict(row))

                    logger.info(f"[PAD Runner] Parsed {len(wide_data)} rows from {name}")

        return wide_data

    def _transform_to_long(
        self, wide_data: list[dict[str, Any]]
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """横持ちデータを縦持ちに変換."""
        from app.application.services.smartread.csv_transformer import SmartReadCsvTransformer

        transformer = SmartReadCsvTransformer()
        result = transformer.transform_to_long(wide_data, skip_empty=True)

        errors = [
            {"row": e.row, "field": e.field, "message": e.message, "value": e.value}
            for e in result.errors
        ]

        return result.long_data, errors

    def _save_results(
        self,
        run: SmartReadPadRun,
        config_id: int,
        task_id: str,
        export_id: str,
        wide_data: list[dict[str, Any]],
        long_data: list[dict[str, Any]],
    ) -> None:
        """結果をDBに保存."""
        from app.application.services.smartread.smartread_service import SmartReadService

        # SmartReadService の _save_wide_and_long_data を利用
        service = SmartReadService(self.session)
        service._save_wide_and_long_data(
            config_id=config_id,
            task_id=task_id,
            export_id=export_id,
            task_date=date.today(),
            wide_data=wide_data,
            long_data=long_data,
            filename=f"pad_run_{run.run_id}",
        )
