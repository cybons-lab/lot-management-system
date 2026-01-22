"""SmartRead export service."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import logging
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import delete, select

from app.application.services.smartread.base import SmartReadBaseService


if TYPE_CHECKING:
    from app.infrastructure.persistence.models import SmartReadConfig
    from app.infrastructure.smartread.client import SmartReadClient

from app.infrastructure.persistence.models.smartread_models import (
    SmartReadExportHistory,
    SmartReadLongData,
    SmartReadWideData,
)

from .types import ExportResult


logger = logging.getLogger(__name__)


class SmartReadExportService(SmartReadBaseService):
    """SmartRead export関連のサービス."""

    if TYPE_CHECKING:

        def _get_client(
            self, config_id: int
        ) -> tuple[SmartReadClient | None, SmartReadConfig | None]: ...

        def get_config(self, config_id: int) -> SmartReadConfig | None: ...

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
        client, config = self._get_client(config_id)
        if not client or not config:
            return None

        return await client.create_export(
            task_id,
            export_type=export_type,
            aggregation=config.aggregation_type,
        )

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

        # データ検証1: ZIPが取得できたか
        if not zip_data:
            logger.error(
                "[SmartRead] Failed to download export ZIP",
                extra={
                    "task_id": task_id,
                    "export_id": export_id,
                    "config_id": config_id,
                },
            )
            return None

        # データ検証2: ZIPサイズが0より大きいか
        zip_size = len(zip_data)
        if zip_size == 0:
            logger.error(
                "[SmartRead] Downloaded ZIP is empty (size=0)",
                extra={
                    "task_id": task_id,
                    "export_id": export_id,
                    "config_id": config_id,
                    "zip_size": zip_size,
                },
            )
            return {
                "state": "EMPTY",
                "message": "ダウンロードしたファイルが空です",
                "wide_data": [],
                "long_data": [],
                "errors": [],
                "filename": None,
            }

        logger.info(
            "[SmartRead] Downloaded ZIP successfully",
            extra={
                "task_id": task_id,
                "export_id": export_id,
                "config_id": config_id,
                "zip_size": zip_size,
            },
        )

        # ZIP展開→CSV抽出
        wide_data: list[dict[str, Any]] = []
        csv_filename: str | None = None
        csv_files_found = 0

        try:
            with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
                csv_files_in_zip = [name for name in zf.namelist() if name.endswith(".csv")]
                csv_files_found = len(csv_files_in_zip)

                # データ検証3: ZIP内にCSVファイルが存在するか
                if csv_files_found == 0:
                    logger.error(
                        "[SmartRead] No CSV files found in ZIP",
                        extra={
                            "task_id": task_id,
                            "export_id": export_id,
                            "config_id": config_id,
                            "zip_size": zip_size,
                            "files_in_zip": zf.namelist(),
                        },
                    )
                    return {
                        "state": "EMPTY",
                        "message": "ZIPファイル内にCSVが見つかりません",
                        "wide_data": [],
                        "long_data": [],
                        "errors": [],
                        "filename": None,
                    }

                for name in csv_files_in_zip:
                    csv_filename = name
                    with zf.open(name) as f:
                        # CSVを読み込み
                        reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
                        rows = list(reader)
                        if rows:
                            logger.info(f"[SmartRead] CSV columns found: {list(rows[0].keys())}")
                            for row in rows:
                                wide_data.append(dict(row))
                        else:
                            logger.warning(f"[SmartRead] CSV file {name} is empty (no rows)")
                    break  # 最初のCSVのみ処理

        except Exception as e:
            logger.error(
                f"[SmartRead] Failed to extract CSV from ZIP: {e}",
                extra={
                    "task_id": task_id,
                    "export_id": export_id,
                    "config_id": config_id,
                    "zip_size": zip_size,
                },
            )
            return None

        # データ検証4: CSVに行データがあるか（ヘッダのみではない）
        if len(wide_data) == 0:
            logger.warning(
                "[SmartRead] CSV file has no data rows (header only or empty)",
                extra={
                    "task_id": task_id,
                    "export_id": export_id,
                    "config_id": config_id,
                    "zip_size": zip_size,
                    "csv_files": csv_files_found,
                    "csv_filename": csv_filename,
                },
            )
            return {
                "state": "EMPTY",
                "message": "CSVファイルにデータがありません",
                "wide_data": [],
                "long_data": [],
                "errors": [],
                "filename": csv_filename,
            }

        # 横持ち→縦持ち変換
        logger.info(f"[SmartRead] Transforming {len(wide_data)} wide rows to long format...")
        transformer = SmartReadCsvTransformer()
        result = transformer.transform_to_long(wide_data)
        logger.info(
            f"[SmartRead] Transformation complete: {len(wide_data)} wide -> {len(result.long_data)} long rows",
            extra={
                "task_id": task_id,
                "export_id": export_id,
                "config_id": config_id,
                "zip_size": zip_size,
                "csv_files": csv_files_found,
                "rows_count": len(wide_data),
                "long_rows_count": len(result.long_data),
            },
        )

        if len(wide_data) > 0 and len(result.long_data) == 0:
            logger.warning(
                f"[SmartRead] TRANSFORMATION RESULT IS EMPTY! Check column names. "
                f"Available columns: {list(wide_data[0].keys()) if wide_data else 'None'}",
                extra={
                    "task_id": task_id,
                    "export_id": export_id,
                    "config_id": config_id,
                    "available_columns": list(wide_data[0].keys()) if wide_data else [],
                },
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
            # We use int() and handle exceptions for robust testing with mocks
            try:
                deleted_count = int(result.rowcount) if hasattr(result, "rowcount") else 0
            except (TypeError, ValueError):
                deleted_count = 0

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
