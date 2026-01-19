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

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import SmartReadConfig
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadLongData,
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
        """タスク一覧を取得.

        Args:
            config_id: 設定ID

        Returns:
            タスク一覧
        """
        client, _ = self._get_client(config_id)
        if not client:
            return []

        return await client.get_tasks()

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
                            for row in reader:
                                wide_data.append(dict(row))
                        break  # 最初のCSVのみ処理

        except Exception as e:
            logger.error(f"Failed to extract CSV from ZIP: {e}")
            return None

        # 横持ち→縦持ち変換
        transformer = SmartReadCsvTransformer()
        result = transformer.transform_to_long(wide_data)

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
        """横持ち・縦持ちデータをDBに保存.

        Args:
            config_id: 設定ID
            task_id: タスクID
            export_id: エクスポートID
            task_date: タスク日付
            wide_data: 横持ちデータ
            long_data: 縦持ちデータ
            filename: ファイル名
        """
        # 横持ちデータを行単位で保存（重複排除）
        saved_wide_ids: list[int] = []

        for row_index, row in enumerate(wide_data):
            fingerprint = self._calculate_row_fingerprint(row)

            # 既存レコードをチェック
            stmt = select(SmartReadWideData).where(
                SmartReadWideData.config_id == config_id,
                SmartReadWideData.task_date == task_date,
                SmartReadWideData.row_fingerprint == fingerprint,
            )
            existing = self.session.execute(stmt).scalar_one_or_none()

            if existing:
                logger.debug(f"Row {row_index} already exists (fingerprint: {fingerprint[:8]}...)")
                saved_wide_ids.append(existing.id)
                continue

            # 新規保存
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
            self.session.flush()
            saved_wide_ids.append(wide_record.id)

        # 縦持ちデータを保存
        for long_index, long_row in enumerate(long_data):
            # 対応するwide_data_idを取得（行インデックスが一致するもの）
            wide_data_id = None
            if long_index < len(saved_wide_ids):
                wide_data_id = saved_wide_ids[long_index]

            long_record = SmartReadLongData(
                wide_data_id=wide_data_id,
                config_id=config_id,
                task_id=task_id,
                task_date=task_date,
                row_index=long_index,
                content=long_row,
                status="PENDING",
            )
            self.session.add(long_record)

        self.session.flush()
        logger.info(
            f"Saved {len(saved_wide_ids)} wide rows and {len(long_data)} long rows "
            f"for task {task_id} on {task_date}"
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
