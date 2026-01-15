"""SmartRead OCR Service.

PDFや画像のOCR処理とエクスポート機能を提供する。
"""

from __future__ import annotations

import csv
import io
import json
import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import SmartReadConfig
from app.infrastructure.smartread.client import SmartReadClient, SmartReadResult


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

        results = []
        for filename in filenames:
            file_path = watch_dir / filename
            if not file_path.exists():
                results.append(AnalyzeResult(False, filename, [], "File not found"))
                continue

            try:
                with open(file_path, "rb") as f:
                    content = f.read()

                result = await self.analyze_file(config_id, content, filename)

                if result.success and export_dir:
                    # JSON出力
                    if not export_dir.exists():
                        try:
                            # ディレクトリが存在しない場合は作成を試みる（権限次第）
                            os.makedirs(export_dir, exist_ok=True)
                        except OSError as e:
                            logger.error(f"Failed to create export dir: {e}")

                    if export_dir.exists():
                        json_name = f"{Path(filename).stem}.json"
                        json_path = export_dir / json_name
                        with open(json_path, "w", encoding="utf-8") as f:
                            import json

                            json.dump(result.data, f, ensure_ascii=False, indent=2)

                results.append(result)

            except Exception as e:
                logger.error(f"Error processing file {filename}: {e}")
                results.append(AnalyzeResult(False, filename, [], str(e)))

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
