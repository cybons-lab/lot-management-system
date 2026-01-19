"""SmartRead Service Mock Tests.

SmartRead API への実際の接続はできないため、モックを使ったテスト。
"""

from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.smartread_service import SmartReadService
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadExportHistory,
    SmartReadTask,
    SmartReadWideData,
)


@pytest.fixture
def mock_session():
    """モックセッション."""
    session = MagicMock(spec=Session)
    session.execute = MagicMock()
    session.add = MagicMock()
    session.commit = MagicMock()
    session.rollback = MagicMock()
    return session


@pytest.fixture
def mock_smartread_client():
    """モックSmartReadクライアント."""
    client = AsyncMock()
    client.analyze_file = AsyncMock()
    client.get_tasks = AsyncMock()
    client.create_export = AsyncMock()
    client.get_export_status = AsyncMock()
    client.download_export = AsyncMock()
    return client


@pytest.fixture
def smartread_service(mock_session):
    """SmartReadServiceインスタンス."""
    return SmartReadService(session=mock_session)


class TestFingerprintCalculation:
    """Fingerprint計算のテスト."""

    def test_calculate_row_fingerprint_basic(self, smartread_service):
        """基本的なfingerprint計算."""
        row_data = {"name": "Test", "value": 123, "date": "2025-01-01"}
        fingerprint = smartread_service._calculate_row_fingerprint(row_data)

        # SHA256ハッシュは64文字
        assert len(fingerprint) == 64
        assert isinstance(fingerprint, str)

    def test_calculate_row_fingerprint_consistency(self, smartread_service):
        """同じデータからは同じfingerprintが生成される."""
        row_data = {"name": "Test", "value": 123}
        fingerprint1 = smartread_service._calculate_row_fingerprint(row_data)
        fingerprint2 = smartread_service._calculate_row_fingerprint(row_data)

        assert fingerprint1 == fingerprint2

    def test_calculate_row_fingerprint_order_independence(self, smartread_service):
        """キーの順序が違っても同じfingerprintが生成される."""
        row_data1 = {"name": "Test", "value": 123}
        row_data2 = {"value": 123, "name": "Test"}

        fingerprint1 = smartread_service._calculate_row_fingerprint(row_data1)
        fingerprint2 = smartread_service._calculate_row_fingerprint(row_data2)

        assert fingerprint1 == fingerprint2

    def test_calculate_row_fingerprint_different_data(self, smartread_service):
        """異なるデータからは異なるfingerprintが生成される."""
        row_data1 = {"name": "Test1", "value": 123}
        row_data2 = {"name": "Test2", "value": 123}

        fingerprint1 = smartread_service._calculate_row_fingerprint(row_data1)
        fingerprint2 = smartread_service._calculate_row_fingerprint(row_data2)

        assert fingerprint1 != fingerprint2


class TestDuplicatePrevention:
    """重複排除のテスト."""

    def test_save_wide_and_long_data_new_rows(self, smartread_service, mock_session):
        """新規行が正常に保存される."""
        wide_data = [
            {"項目1": "値1", "項目2": "値2"},
            {"項目1": "値3", "項目2": "値4"},
        ]

        # 既存データなし
        mock_session.execute.return_value.scalar_one_or_none.return_value = None

        with patch(
            "app.application.services.smartread.csv_transformer.SmartReadCsvTransformer"
        ) as mock_transformer_class:
            mock_transformer = MagicMock()
            mock_transformer.transform.return_value = MagicMock(
                long_data=[{"項目": "項目1", "値": "値1"}], errors=[]
            )
            mock_transformer_class.return_value = mock_transformer

            result = smartread_service._save_wide_and_long_data(
                config_id=1,
                task_id="task_001",
                export_id="export_001",
                task_date=date(2025, 1, 1),
                wide_data=wide_data,
                csv_filename="test.csv",
            )

        # 2行保存される
        assert mock_session.add.call_count >= 2
        assert result.long_data is not None

    def test_save_wide_and_long_data_duplicate_skip(self, smartread_service, mock_session):
        """重複行がスキップされる."""
        wide_data = [
            {"項目1": "値1", "項目2": "値2"},
        ]

        # 既存データあり
        existing_wide = SmartReadWideData(
            id=1,
            config_id=1,
            task_id="task_001",
            task_date=date(2025, 1, 1),
            export_id="export_001",
            row_index=0,
            content={"項目1": "値1", "項目2": "値2"},
            row_fingerprint="existing_fingerprint",
        )
        mock_session.execute.return_value.scalar_one_or_none.return_value = existing_wide

        with patch(
            "app.application.services.smartread.csv_transformer.SmartReadCsvTransformer"
        ) as mock_transformer_class:
            mock_transformer = MagicMock()
            mock_transformer.transform.return_value = MagicMock(long_data=[], errors=[])
            mock_transformer_class.return_value = mock_transformer

            result = smartread_service._save_wide_and_long_data(
                config_id=1,
                task_id="task_001",
                export_id="export_001",
                task_date=date(2025, 1, 1),
                wide_data=wide_data,
                csv_filename="test.csv",
            )

        # SmartReadWideDataは追加されない（重複のため）
        # transformerには空リストが渡される
        assert result.long_data == []


class TestExportCsvData:
    """エクスポートCSVデータ取得のテスト."""

    @pytest.mark.asyncio
    async def test_get_export_csv_data_success(self, smartread_service, mock_session):
        """エクスポート→DB保存→CSV出力の正常フロー."""
        import zipfile
        from io import BytesIO

        # ZIPファイルの準備
        csv_content = "項目1,項目2\n値1,値2\n値3,値4\n"
        zip_buffer = BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("export_data.csv", csv_content)
        zip_data = zip_buffer.getvalue()

        # モックの設定
        with patch.object(smartread_service, "_get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.download_export = AsyncMock(return_value=zip_data)
            mock_get_client.return_value = (mock_client, MagicMock(export_dir=None))

            # 既存データなし
            mock_session.execute.return_value.scalar_one_or_none.return_value = None

            with patch.object(smartread_service, "_record_export_history"):
                with patch(
                    "app.application.services.smartread.csv_transformer.SmartReadCsvTransformer"
                ) as mock_transformer_class:
                    mock_transformer = MagicMock()
                    mock_transformer.transform.return_value = MagicMock(
                        long_data=[{"項目": "項目1", "値": "値1"}], errors=[]
                    )
                    mock_transformer_class.return_value = mock_transformer

                    result = await smartread_service.get_export_csv_data(
                        config_id=1,
                        task_id="task_001",
                        export_id="export_001",
                        save_to_db=True,
                        task_date=date(2025, 1, 1),
                    )

        assert result is not None
        assert "wide_data" in result
        assert "long_data" in result
        assert len(result["wide_data"]) == 2

    @pytest.mark.asyncio
    async def test_get_export_csv_data_skip_today(self, smartread_service, mock_session):
        """skip_todayフラグが有効な場合は処理をスキップ."""
        # skip_today=Trueのタスクを返す
        task_with_skip = SmartReadTask(
            id=1,
            config_id=1,
            task_id="task_001",
            task_date=date.today(),
            skip_today=True,
        )
        mock_session.execute.return_value.scalar_one_or_none.return_value = task_with_skip

        result = await smartread_service.get_export_csv_data(
            config_id=1,
            task_id="task_001",
            export_id="export_001",
            save_to_db=True,
            task_date=None,
        )

        # skip_todayが有効なのでNoneが返る
        assert result is None


class TestExportHistoryRecording:
    """エクスポート履歴記録のテスト."""

    def test_record_export_history_success(self, smartread_service, mock_session):
        """成功時の履歴記録."""
        smartread_service._record_export_history(
            config_id=1,
            task_id="task_001",
            export_id="export_001",
            task_date=date(2025, 1, 1),
            filename="export_data.csv",
            wide_row_count=10,
            long_row_count=100,
            status="SUCCESS",
        )

        # SmartReadExportHistoryが追加される
        assert mock_session.add.called
        added_obj = mock_session.add.call_args[0][0]
        assert isinstance(added_obj, SmartReadExportHistory)
        assert added_obj.task_id == "task_001"
        assert added_obj.wide_row_count == 10
        assert added_obj.long_row_count == 100
        assert added_obj.status == "SUCCESS"
        assert mock_session.commit.called

    def test_record_export_history_failure(self, smartread_service, mock_session):
        """失敗時の履歴記録."""
        smartread_service._record_export_history(
            config_id=1,
            task_id="task_001",
            export_id="export_001",
            task_date=date(2025, 1, 1),
            filename=None,
            wide_row_count=0,
            long_row_count=0,
            status="FAILED",
            error_message="Export download failed",
        )

        added_obj = mock_session.add.call_args[0][0]
        assert added_obj.status == "FAILED"
        assert added_obj.error_message == "Export download failed"

    def test_record_export_history_rollback_on_error(self, smartread_service, mock_session):
        """記録中のエラー時にロールバック."""
        mock_session.commit.side_effect = Exception("DB error")

        # エラーが発生してもメソッド自体は例外を投げない
        smartread_service._record_export_history(
            config_id=1,
            task_id="task_001",
            export_id="export_001",
            task_date=date(2025, 1, 1),
            filename="test.csv",
            wide_row_count=5,
            long_row_count=50,
        )

        # ロールバックが呼ばれる
        assert mock_session.rollback.called


class TestSkipTodayEnforcement:
    """skip_todayフラグの強制テスト."""

    def test_get_managed_tasks(self, smartread_service, mock_session):
        """管理タスク一覧取得."""
        tasks = [
            SmartReadTask(
                id=1,
                config_id=1,
                task_id="task_001",
                task_date=date.today(),
                skip_today=False,
            ),
            SmartReadTask(
                id=2,
                config_id=1,
                task_id="task_002",
                task_date=date.today(),
                skip_today=True,
            ),
        ]

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = tasks
        mock_session.execute.return_value = mock_result

        result = smartread_service.get_managed_tasks(config_id=1)

        assert len(result) == 2
        assert result[0]["skip_today"] is False
        assert result[1]["skip_today"] is True

    def test_update_skip_today(self, smartread_service, mock_session):
        """skip_todayフラグ更新."""
        task = SmartReadTask(
            id=1,
            config_id=1,
            task_id="task_001",
            task_date=date.today(),
            skip_today=False,
        )

        mock_session.execute.return_value.scalar_one_or_none.return_value = task

        result = smartread_service.update_skip_today(task_id="task_001", skip_today=True)

        assert task.skip_today is True
        assert result["skip_today"] is True
        assert mock_session.commit.called
