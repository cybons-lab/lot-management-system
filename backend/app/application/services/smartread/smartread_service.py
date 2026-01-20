"""SmartRead OCR Service.

PDFや画像のOCR処理とエクスポート機能を提供する。
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import SmartReadConfig
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadExportHistory,
    SmartReadLongData,
    SmartReadRequest,
    SmartReadTask,
    SmartReadWideData,
)
from app.infrastructure.smartread.client import (
    SmartReadClient,
    SmartReadResult,
)


logger = logging.getLogger(__name__)


@dataclass
class AnalyzeResult:
    """解析結果."""

    success: bool
    filename: str
    data: list[dict[str, Any]]
    error_message: str | None = None


@dataclass
class ExportResult:
    """エクスポート結果."""

    content: str | bytes
    content_type: str
    filename: str


class SmartReadService:
    """SmartRead OCRサービス.

    SmartRead APIを使用したOCR処理と結果のエクスポートを提供。
    """

    def __init__(self, session: Session) -> None:
        """初期化.

        Args:
            session: DBセッション
        """
        self.session = session

    def get_config(self, config_id: int) -> SmartReadConfig | None:
        """設定を取得.

        Args:
            config_id: 設定ID

        Returns:
            設定、存在しない場合はNone
        """
        return self.session.get(SmartReadConfig, config_id)

    def get_active_configs(self) -> list[SmartReadConfig]:
        """有効な設定一覧を取得.

        Returns:
            有効な設定のリスト
        """
        stmt = select(SmartReadConfig).where(SmartReadConfig.is_active.is_(True))
        result = self.session.execute(stmt)
        return list(result.scalars().all())

    def get_all_configs(self) -> list[SmartReadConfig]:
        """全設定一覧を取得.

        Returns:
            全設定のリスト
        """
        stmt = select(SmartReadConfig).order_by(SmartReadConfig.id)
        result = self.session.execute(stmt)
        return list(result.scalars().all())

    def create_config(
        self,
        endpoint: str,
        api_key: str,
        name: str = "default",
        template_ids: str | None = None,
        export_type: str = "json",
        aggregation_type: str | None = None,
        watch_dir: str | None = None,
        export_dir: str | None = None,
        input_exts: str | None = "pdf,png,jpg,jpeg",
        description: str | None = None,
        is_active: bool = True,
    ) -> SmartReadConfig:
        """設定を作成.

        Args:
            endpoint: APIエンドポイント
            api_key: APIキー
            name: 設定名
            request_type: リクエストタイプ
            template_ids: テンプレートID（カンマ区切り）
            export_type: エクスポートタイプ
            aggregation_type: 集約タイプ
            watch_dir: 監視ディレクトリ
            export_dir: 出力ディレクトリ
            input_exts: 入力拡張子
            description: 説明
            is_active: 有効/無効

        Returns:
            作成された設定
        """
        config = SmartReadConfig(
            endpoint=endpoint,
            api_key=api_key,
            name=name,
            template_ids=template_ids,
            export_type=export_type,
            aggregation_type=aggregation_type,
            watch_dir=watch_dir,
            export_dir=export_dir,
            input_exts=input_exts,
            description=description,
            is_active=is_active,
        )
        self.session.add(config)
        self.session.flush()
        return config

    def update_config(
        self,
        config_id: int,
        **kwargs: Any,
    ) -> SmartReadConfig | None:
        """設定を更新.

        Args:
            config_id: 設定ID
            **kwargs: 更新するフィールド

        Returns:
            更新された設定、存在しない場合はNone
        """
        config = self.get_config(config_id)
        if not config:
            return None

        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)

        self.session.flush()
        return config

    def delete_config(self, config_id: int) -> bool:
        """設定を削除.

        Args:
            config_id: 設定ID

        Returns:
            削除成功した場合True
        """
        config = self.get_config(config_id)
        if not config:
            return False

        self.session.delete(config)
        self.session.flush()
        return True

    async def analyze_file(
        self,
        config_id: int,
        file_content: bytes,
        filename: str,
    ) -> AnalyzeResult:
        """ファイルをOCR解析.

        Args:
            config_id: 設定ID
            file_content: ファイルデータ
            filename: ファイル名

        Returns:
            解析結果
        """
        config = self.get_config(config_id)
        if not config:
            return AnalyzeResult(
                success=False,
                filename=filename,
                data=[],
                error_message="設定が見つかりません",
            )

        # テンプレートIDをパース
        template_ids = None
        if config.template_ids:
            template_ids = [t.strip() for t in config.template_ids.split(",") if t.strip()]

        client = SmartReadClient(
            endpoint=config.endpoint,
            api_key=config.api_key,
            template_ids=template_ids,
        )

        result: SmartReadResult = await client.analyze_file(file_content, filename)

        return AnalyzeResult(
            success=result.success,
            filename=filename,
            data=result.data,
            error_message=result.error_message,
        )

    def export_to_json(
        self,
        data: list[dict[str, Any]],
        filename: str = "export.json",
    ) -> ExportResult:
        """データをJSONでエクスポート.

        Args:
            data: エクスポートするデータ
            filename: 出力ファイル名

        Returns:
            エクスポート結果
        """
        content = json.dumps(data, ensure_ascii=False, indent=2)
        return ExportResult(
            content=content,
            content_type="application/json",
            filename=filename,
        )

    def export_to_csv(
        self,
        data: list[dict[str, Any]],
        filename: str = "export.csv",
    ) -> ExportResult:
        """データをCSVでエクスポート.

        Args:
            data: エクスポートするデータ
            filename: 出力ファイル名

        Returns:
            エクスポート結果
        """
        if not data:
            return ExportResult(
                content="",
                content_type="text/csv",
                filename=filename,
            )

        # フラット化されたデータからCSV生成
        flat_data = self._flatten_data(data)

        if not flat_data:
            return ExportResult(
                content="",
                content_type="text/csv",
                filename=filename,
            )

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=flat_data[0].keys())
        writer.writeheader()
        writer.writerows(flat_data)

        return ExportResult(
            content=output.getvalue(),
            content_type="text/csv; charset=utf-8",
            filename=filename,
        )

    def list_files_in_watch_dir(self, config_id: int) -> list[str]:
        """監視ディレクトリ内のファイル一覧を取得.

        Args:
            config_id: 設定ID

        Returns:
            ファイル名のリスト
        """
        config = self.get_config(config_id)
        if not config or not config.watch_dir:
            return []

        import os
        from pathlib import Path

        watch_dir = Path(config.watch_dir)
        if not watch_dir.exists() or not watch_dir.is_dir():
            return []

        extensions = set()
        if config.input_exts:
            extensions = {f".{ext.strip().lower()}" for ext in config.input_exts.split(",")}

        files = []
        try:
            for entry in os.scandir(watch_dir):
                if entry.is_file():
                    if not extensions or Path(entry.name).suffix.lower() in extensions:
                        files.append(entry.name)
        except OSError as e:
            logger.error(f"Error listing files in {watch_dir}: {e}")
            return []

        return sorted(files)

    async def process_watch_dir_files(
        self, config_id: int, filenames: list[str]
    ) -> list[AnalyzeResult]:
        """監視ディレクトリ内の指定ファイルを処理.

        複数ファイルを1タスクにまとめてSmartRead APIで処理する。

        Args:
            config_id: 設定ID
            filenames: 処理するファイル名のリスト

        Returns:
            解析結果のリスト
        """
        config = self.get_config(config_id)
        if not config or not config.watch_dir:
            return []

        import os
        from pathlib import Path

        watch_dir = Path(config.watch_dir)
        export_dir = Path(config.export_dir) if config.export_dir else None

        # ファイルを読み込み
        files_to_process: list[tuple[bytes, str]] = []
        results: list[AnalyzeResult] = []

        for filename in filenames:
            file_path = watch_dir / filename
            if not file_path.exists():
                results.append(AnalyzeResult(False, filename, [], "File not found"))
                continue

            try:
                with open(file_path, "rb") as f:
                    content = f.read()
                files_to_process.append((content, filename))
            except Exception as e:
                logger.error(f"Error reading file {filename}: {e}")
                results.append(AnalyzeResult(False, filename, [], str(e)))

        # ファイルがなければ終了
        if not files_to_process:
            return results

        # テンプレートIDをパース
        template_ids = None
        if config.template_ids:
            template_ids = [t.strip() for t in config.template_ids.split(",") if t.strip()]

        client = SmartReadClient(
            endpoint=config.endpoint,
            api_key=config.api_key,
            template_ids=template_ids,
        )

        # 複数ファイルを1タスクで処理
        multi_result = await client.analyze_files(files_to_process)

        # 結果を変換
        for sr_result in multi_result.results:
            analyze_result = AnalyzeResult(
                success=sr_result.success,
                filename=sr_result.filename or "",
                data=sr_result.data,
                error_message=sr_result.error_message,
            )

            # JSON出力
            if analyze_result.success and export_dir and analyze_result.filename:
                if not export_dir.exists():
                    try:
                        os.makedirs(export_dir, exist_ok=True)
                    except OSError as e:
                        logger.error(f"Failed to create export dir: {e}")

                if export_dir.exists():
                    json_name = f"{Path(analyze_result.filename).stem}.json"
                    json_path = export_dir / json_name
                    with open(json_path, "w", encoding="utf-8") as f:
                        json.dump(analyze_result.data, f, ensure_ascii=False, indent=2)

            results.append(analyze_result)

        return results

    def _flatten_data(self, data: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """ネストされたデータをフラット化.

        Args:
            data: 元データ

        Returns:
            フラット化されたデータ
        """
        result = []
        for item in data:
            flat_item = self._flatten_dict(item)
            result.append(flat_item)
        return result

    def _flatten_dict(
        self,
        d: dict[str, Any],
        parent_key: str = "",
        sep: str = "_",
    ) -> dict[str, Any]:
        """辞書をフラット化.

        Args:
            d: 元の辞書
            parent_key: 親キー
            sep: セパレータ

        Returns:
            フラット化された辞書
        """
        items: list[tuple[str, Any]] = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep).items())
            elif isinstance(v, list):
                # リストはJSON文字列として保持
                items.append((new_key, json.dumps(v, ensure_ascii=False)))
            else:
                items.append((new_key, v))
        return dict(items)

    # ==================== タスク・Export API ====================

    def _get_client(self, config_id: int) -> tuple[SmartReadClient | None, SmartReadConfig | None]:
        """設定からクライアントを取得."""
        config = self.get_config(config_id)
        if not config:
            return None, None

        template_ids = None
        if config.template_ids:
            template_ids = [t.strip() for t in config.template_ids.split(",") if t.strip()]

        client = SmartReadClient(
            endpoint=config.endpoint,
            api_key=config.api_key,
            template_ids=template_ids,
        )
        return client, config

    async def get_tasks(self, config_id: int) -> list:
        """タスク一覧を取得し、DBに同期.

        Args:
            config_id: 設定ID

        Returns:
            タスク一覧
        """
        client, _ = self._get_client(config_id)
        if not client:
            return []

        api_tasks = await client.get_tasks()

        # DBに同期
        for api_task in api_tasks:
            # 日付のパース
            task_date = date.today()
            if api_task.created_at:
                try:
                    # '2024-01-20T12:34:56.789Z'
                    dt = datetime.fromisoformat(api_task.created_at.replace("Z", "+00:00"))
                    task_date = dt.date()
                except (ValueError, TypeError):
                    pass

            self.get_or_create_task(
                config_id=config_id,
                task_id=api_task.task_id,
                task_date=task_date,
                name=api_task.name,
                state=api_task.status,
            )

        return api_tasks

    async def sync_task_results(
        self,
        config_id: int,
        task_id: str,
        export_type: str = "csv",
        timeout_sec: float = 300.0,
        force: bool = False,
    ) -> dict[str, Any] | None:
        """タスクの結果をAPIから同期してDBに保存.

        Args:
            config_id: 設定ID
            task_id: タスクID
            export_type: エクスポート形式
            timeout_sec: タイムアウト秒数
            force: 強制的に再取得するか

        Returns:
            同期結果、またはNone
        """
        logger.info(f"[SmartRead] Starting sync for task {task_id} (config_id={config_id})")

        # 0. 既存データの確認 (force=Falseの場合)
        if not force:
            from sqlalchemy import select

            from app.infrastructure.persistence.models.smartread_models import (
                SmartReadLongData,
                SmartReadWideData,
            )

            # WideDataがあるか確認
            stmt_wide = select(SmartReadWideData).where(SmartReadWideData.task_id == task_id)
            existing_wide = self.session.execute(stmt_wide).scalars().all()

            if existing_wide:
                logger.info(
                    f"[SmartRead] Task {task_id} already has {len(existing_wide)} wide rows in DB. Fetching long data..."
                )
                stmt_long = select(SmartReadLongData).where(SmartReadLongData.task_id == task_id)
                existing_long = self.session.execute(stmt_long).scalars().all()

                return {
                    "wide_data": [w.content for w in existing_wide],
                    "long_data": [l.content for l in existing_long],
                    "errors": [],
                    "filename": existing_wide[0].filename if existing_wide else None,
                    "from_cache": True,
                }

        client, _ = self._get_client(config_id)
        if not client:
            logger.error(f"[SmartRead] Could not initialize client for config {config_id}")
            return None

        # 1. Exportを作成
        logger.info(f"[SmartRead] Creating export for task {task_id}...")
        export = await client.create_export(task_id, export_type)
        if not export:
            logger.error(f"[SmartRead] Failed to create export for task {task_id}")
            return None
        logger.info(f"[SmartRead] Export created: {export.export_id}")

        # 2. 完了まで待機
        logger.info(f"[SmartRead] Polling export {export.export_id} until ready...")
        export_ready = await client.poll_export_until_ready(task_id, export.export_id, timeout_sec)

        # APIによっては COMPLETED, SUCCEEDED のいずれかが返る
        if not export_ready or export_ready.state.upper() not in ["COMPLETED", "SUCCEEDED"]:
            logger.error(
                f"[SmartRead] Export did not complete for task {task_id}. State: {export_ready.state if export_ready else 'None'}"
            )
            return None
        logger.info(f"[SmartRead] Export is ready. State: {export_ready.state}")

        # 3. CSVデータを取得してDBに保存
        return await self.get_export_csv_data(
            config_id=config_id,
            task_id=task_id,
            export_id=export.export_id,
            save_to_db=True,
        )

    async def create_export(
        self,
        config_id: int,
        task_id: str,
        export_type: str = "csv",
    ):
        """エクスポートを作成.

        Args:
            config_id: 設定ID
            task_id: タスクID
            export_type: エクスポート形式

        Returns:
            エクスポート情報
        """
        client, _ = self._get_client(config_id)
        if not client:
            return None

        return await client.create_export(task_id, export_type)

    async def get_export_status(
        self,
        config_id: int,
        task_id: str,
        export_id: str,
    ):
        """エクスポート状態を取得.

        Args:
            config_id: 設定ID
            task_id: タスクID
            export_id: エクスポートID

        Returns:
            エクスポート情報
        """
        client, _ = self._get_client(config_id)
        if not client:
            return None

        return await client.get_export_status(task_id, export_id)

    async def get_export_csv_data(
        self,
        config_id: int,
        task_id: str,
        export_id: str,
        save_to_db: bool = True,
        task_date: date | None = None,
    ) -> dict[str, Any] | None:
        """エクスポートからCSVデータを取得し、横持ち・縦持ち両方を返す.

        Args:
            config_id: 設定ID
            task_id: タスクID
            export_id: エクスポートID
            save_to_db: DBに保存するか
            task_date: タスク日付（指定がない場合は今日）

        Returns:
            横持ち・縦持ちデータとエラー
        """
        import zipfile

        from app.application.services.smartread.csv_transformer import (
            SmartReadCsvTransformer,
        )

        client, _ = self._get_client(config_id)
        if not client:
            return None

        # ZIPダウンロード
        zip_data = await client.download_export(task_id, export_id)
        if not zip_data:
            return None

        # ZIP展開→CSV抽出
        wide_data: list[dict[str, Any]] = []
        csv_filename: str | None = None

        try:
            with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
                for name in zf.namelist():
                    if name.endswith(".csv"):
                        csv_filename = name
                        with zf.open(name) as f:
                            # CSVを読み込み
                            reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
                            rows = list(reader)
                            if rows:
                                logger.info(
                                    f"[SmartRead] CSV columns found: {list(rows[0].keys())}"
                                )
                                for row in rows:
                                    wide_data.append(dict(row))
                            else:
                                logger.warning(f"[SmartRead] CSV file {name} is empty (no rows)")
                        break  # 最初のCSVのみ処理

        except Exception as e:
            logger.error(f"Failed to extract CSV from ZIP: {e}")
            return None

        # 横持ち→縦持ち変換
        logger.info(f"[SmartRead] Transforming {len(wide_data)} wide rows to long format...")
        transformer = SmartReadCsvTransformer()
        result = transformer.transform_to_long(wide_data)
        logger.info(
            f"[SmartRead] Transformation complete: {len(wide_data)} wide -> {len(result.long_data)} long rows"
        )

        if len(wide_data) > 0 and len(result.long_data) == 0:
            logger.warning(
                f"[SmartRead] TRANSFORMATION RESULT IS EMPTY! Check column names. "
                f"Available columns: {list(wide_data[0].keys()) if wide_data else 'None'}"
            )

        # DBに保存
        if save_to_db and wide_data:
            if task_date is None:
                task_date = date.today()

            self._save_wide_and_long_data(
                config_id=config_id,
                task_id=task_id,
                export_id=export_id,
                task_date=task_date,
                wide_data=wide_data,
                long_data=result.long_data,
                filename=csv_filename,
            )

        # export_dirが設定されている場合、縦持ちデータをCSV出力
        config = self.get_config(config_id)
        if config and config.export_dir and result.long_data:
            self._save_long_data_to_csv(
                export_dir=config.export_dir,
                long_data=result.long_data,
                task_id=task_id,
                task_date=task_date if task_date else date.today(),
            )

        # request_id調査用ログ出力
        self._log_export_investigation(
            task_id=task_id,
            export_id=export_id,
            csv_filename=csv_filename,
            wide_row_count=len(wide_data),
            long_row_count=len(result.long_data),
        )

        # エクスポート履歴をDBに記録
        self._record_export_history(
            config_id=config_id,
            task_id=task_id,
            export_id=export_id,
            task_date=task_date if task_date else date.today(),
            filename=csv_filename,
            wide_row_count=len(wide_data),
            long_row_count=len(result.long_data),
            status="SUCCESS",
        )

        return {
            "wide_data": wide_data,
            "long_data": result.long_data,
            "errors": result.errors,
            "filename": csv_filename,
        }

    def _calculate_row_fingerprint(self, row_data: dict[str, Any]) -> str:
        """行データからfingerprintを計算.

        Args:
            row_data: 行データ

        Returns:
            SHA256ハッシュ値
        """
        # JSONにして安定したソート順でハッシュ化
        content_str = json.dumps(row_data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(content_str.encode("utf-8")).hexdigest()

    def _save_wide_and_long_data(
        self,
        config_id: int,
        task_id: str,
        export_id: str,
        task_date: date,
        wide_data: list[dict[str, Any]],
        long_data: list[dict[str, Any]],
        filename: str | None,
    ) -> None:
        """横持ち・縦持ちデータをDBに保存（高速化版）.

        Args:
            config_id: 設定ID
            task_id: タスクID
            export_id: エクスポートID
            task_date: タスク日付
            wide_data: 横持ちデータ
            long_data: 縦持ちデータ
            filename: ファイル名
        """
        import time

        start_time = time.time()

        # 1. すべての指紋を事前に計算
        fingerprints = [self._calculate_row_fingerprint(row) for row in wide_data]

        # 2. 既存の指紋を一括取得してキャッシュ (N+1解消)
        stmt = select(SmartReadWideData.id, SmartReadWideData.row_fingerprint).where(
            SmartReadWideData.config_id == config_id,
            SmartReadWideData.task_date == task_date,
            SmartReadWideData.row_fingerprint.in_(fingerprints),
        )
        existing_rows = self.session.execute(stmt).all()
        # fingerprint -> id
        fingerprint_to_id: dict[str, int] = {r.row_fingerprint: r.id for r in existing_rows}

        # 3. 新規横持ちレコードの作成と保存
        # 挿入後のIDを取得するため、個別または小バッチでflushする必要があるが、
        # ここでは1行ずつ追加して最後にまとめてflushする
        wide_id_by_index: dict[int, int] = {}
        new_wide_count = 0

        for row_index, (row, fingerprint) in enumerate(zip(wide_data, fingerprints, strict=True)):
            if fingerprint in fingerprint_to_id:
                wide_id_by_index[row_index] = fingerprint_to_id[fingerprint]
            else:
                wide_record = SmartReadWideData(
                    config_id=config_id,
                    task_id=task_id,
                    export_id=export_id,
                    task_date=task_date,
                    filename=filename,
                    row_index=row_index,
                    content=row,
                    row_fingerprint=fingerprint,
                )
                self.session.add(wide_record)
                self.session.flush()  # 1行ずつIDを確定させる
                wide_id_by_index[row_index] = wide_record.id
                fingerprint_to_id[fingerprint] = wide_record.id
                new_wide_count += 1

        # 4. 縦持ちデータの保存（重複防止付き）
        # 既存の縦持ちデータを削除（同じwide_data_idに対する再変換に対応）
        wide_ids_to_process = list(wide_id_by_index.values())
        deleted_count = 0
        if wide_ids_to_process:
            delete_stmt = delete(SmartReadLongData).where(
                SmartReadLongData.wide_data_id.in_(wide_ids_to_process)
            )
            result = self.session.execute(delete_stmt)
            # SQLAlchemy 2.0: CursorResult has rowcount attribute
            deleted_count = result.rowcount if hasattr(result, "rowcount") else 0
            if deleted_count > 0:
                logger.info(
                    f"[SmartRead] Deleted {deleted_count} existing long data rows for wide_data_ids={wide_ids_to_process}"
                )

        # 縦持ちデータを再生成して保存
        from app.application.services.smartread.csv_transformer import SmartReadCsvTransformer

        transformer = SmartReadCsvTransformer()

        long_count = 0
        for row_idx, row in enumerate(wide_data):
            wide_data_id = wide_id_by_index.get(row_idx)
            # 各行ごとに変換して wide_data_id を紐付け
            res = transformer.transform_to_long([row])
            for long_row in res.long_data:
                long_record = SmartReadLongData(
                    wide_data_id=wide_data_id,
                    config_id=config_id,
                    task_id=task_id,
                    task_date=task_date,
                    row_index=row_idx,  # 元の行インデックス
                    content=long_row,
                    status="PENDING",
                )
                self.session.add(long_record)
                long_count += 1

        self.session.flush()
        elapsed = time.time() - start_time
        logger.info(
            f"[SmartRead] DB SAVE SUCCESS: Config={config_id}, Task={task_id}, Date={task_date}\n"
            f"  - Wide Rows: {new_wide_count} newly inserted / {len(wide_data)} total\n"
            f"  - Long Rows: {long_count} inserted\n"
            f"  - Filename: {filename}\n"
            f"  - Elapsed: {elapsed:.2f}s"
        )

    # ==================== タスク管理 ====================

    def get_or_create_task(
        self,
        config_id: int,
        task_id: str,
        task_date: date,
        name: str | None = None,
        state: str | None = None,
    ) -> SmartReadTask:
        """タスクを取得または作成.

        Args:
            config_id: 設定ID
            task_id: タスクID
            task_date: タスク日付
            name: タスク名
            state: ステータス

        Returns:
            タスクレコード
        """
        stmt = select(SmartReadTask).where(SmartReadTask.task_id == task_id)
        task = self.session.execute(stmt).scalar_one_or_none()

        if task:
            # 既存タスクを更新
            if name:
                task.name = name
            if state:
                task.state = state
            self.session.flush()
            return task

        # 新規作成
        task = SmartReadTask(
            config_id=config_id,
            task_id=task_id,
            task_date=task_date,
            name=name,
            state=state,
        )
        self.session.add(task)
        self.session.flush()
        return task

    def update_task_synced_at(self, task_id: str) -> None:
        """タスクのsynced_atを更新.

        Args:
            task_id: タスクID
        """
        stmt = select(SmartReadTask).where(SmartReadTask.task_id == task_id)
        task = self.session.execute(stmt).scalar_one_or_none()
        if task:
            task.synced_at = datetime.now()
            self.session.flush()

    def get_task_by_date(self, config_id: int, task_date: date) -> SmartReadTask | None:
        """指定日のタスクを取得.

        Args:
            config_id: 設定ID
            task_date: タスク日付

        Returns:
            タスクレコード、存在しない場合はNone
        """
        stmt = select(SmartReadTask).where(
            SmartReadTask.config_id == config_id,
            SmartReadTask.task_date == task_date,
        )
        return self.session.execute(stmt).scalar_one_or_none()

    def should_skip_today(self, task_id: str) -> bool:
        """今日スキップすべきかチェック.

        Args:
            task_id: タスクID

        Returns:
            スキップすべき場合True
        """
        stmt = select(SmartReadTask).where(SmartReadTask.task_id == task_id)
        task = self.session.execute(stmt).scalar_one_or_none()
        return task.skip_today if task else False

    def set_skip_today(self, task_id: str, skip: bool) -> None:
        """skip_todayフラグを設定.

        Args:
            task_id: タスクID
            skip: スキップするか
        """
        stmt = select(SmartReadTask).where(SmartReadTask.task_id == task_id)
        task = self.session.execute(stmt).scalar_one_or_none()
        if task:
            task.skip_today = skip
            self.session.flush()

    def _save_long_data_to_csv(
        self,
        export_dir: str,
        long_data: list[dict[str, Any]],
        task_id: str,
        task_date: date,
    ) -> None:
        """縦持ちデータをCSVファイルに保存.

        Args:
            export_dir: 出力先ディレクトリ
            long_data: 縦持ちデータ
            task_id: タスクID
            task_date: タスク日付
        """
        import os
        from pathlib import Path

        if not long_data:
            return

        try:
            export_path = Path(export_dir)
            if not export_path.exists():
                os.makedirs(export_path, exist_ok=True)

            # ファイル名: long_data_{task_id}_{YYYYMMDD}.csv
            date_str = task_date.strftime("%Y%m%d")
            csv_filename = f"long_data_{task_id}_{date_str}.csv"
            csv_path = export_path / csv_filename

            # CSVとして出力
            with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
                if long_data:
                    writer = csv.DictWriter(f, fieldnames=long_data[0].keys())
                    writer.writeheader()
                    writer.writerows(long_data)

            logger.info(f"Saved long data to CSV: {csv_path}")

        except Exception as e:
            logger.error(f"Failed to save long data to CSV: {e}")

    def _log_export_investigation(
        self,
        task_id: str,
        export_id: str,
        csv_filename: str | None,
        wide_row_count: int,
        long_row_count: int,
    ) -> None:
        """request_id調査用のログを出力.

        Args:
            task_id: タスクID
            export_id: エクスポートID
            csv_filename: CSVファイル名
            wide_row_count: 横持ちデータ行数
            long_row_count: 縦持ちデータ行数
        """
        logger.info(
            "[REQUEST_ID_INVESTIGATION] Export processed",
            extra={
                "task_id": task_id,
                "export_id": export_id,
                "csv_filename": csv_filename,
                "wide_row_count": wide_row_count,
                "long_row_count": long_row_count,
                "timestamp": datetime.now().isoformat(),
            },
        )

    def _record_export_history(
        self,
        config_id: int,
        task_id: str,
        export_id: str,
        task_date: date,
        filename: str | None,
        wide_row_count: int,
        long_row_count: int,
        status: str = "SUCCESS",
        error_message: str | None = None,
    ) -> None:
        """エクスポート履歴をDBに記録.

        Args:
            config_id: 設定ID
            task_id: タスクID
            export_id: エクスポートID
            task_date: タスク日付
            filename: CSVファイル名
            wide_row_count: 横持ちデータ行数
            long_row_count: 縦持ちデータ行数
            status: ステータス (SUCCESS / FAILED)
            error_message: エラーメッセージ
        """
        try:
            history = SmartReadExportHistory(
                config_id=config_id,
                task_id=task_id,
                export_id=export_id,
                task_date=task_date,
                filename=filename,
                wide_row_count=wide_row_count,
                long_row_count=long_row_count,
                status=status,
                error_message=error_message,
            )
            self.session.add(history)
            self.session.commit()
            logger.debug(f"Export history recorded: {task_id} / {export_id}")
        except Exception as e:
            logger.error(f"Failed to record export history: {e}")
            self.session.rollback()

    # ==================== requestId/results ルート 全自動化 ====================

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
