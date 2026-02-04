"""Tests for SmartReadExportService."""

import csv
import io
import zipfile
from datetime import date
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.export_service import SmartReadExportService
from app.infrastructure.persistence.models.smartread_models import (
    SmartReadConfig,
    SmartReadLongData,
    SmartReadWideData,
)


@pytest.fixture
def export_service(db: Session) -> SmartReadExportService:
    """Create an SmartReadExportService instance."""
    from app.application.services.smartread import SmartReadService

    return SmartReadService(db)


@pytest.fixture
def smartread_config(db: Session) -> SmartReadConfig:
    """Create a SmartReadConfig for export tests."""
    config = SmartReadConfig(
        name="Export Test",
        endpoint="https://api.example.com",
        api_key="sk-test-key",
        export_dir="/tmp/smartread_export_test",
    )
    db.add(config)
    db.flush()
    return config


class TestBasicExport:
    """Tests for basic JSON/CSV formatting."""

    def test_export_to_json(self, export_service: SmartReadExportService):
        data = [{"a": 1}, {"b": 2}]
        result = export_service.export_to_json(data, "results.json")
        assert result.content_type == "application/json"
        assert result.filename == "results.json"
        assert '"a": 1' in result.content

    def test_export_to_csv(self, export_service: SmartReadExportService):
        data = [{"col1": "val1", "col2": "val2"}]
        result = export_service.export_to_csv(data, "results.csv")
        assert result.content_type == "text/csv; charset=utf-8"
        assert "col1,col2" in result.content
        assert "val1,val2" in result.content


class TestGetExportCsvData:
    """Tests for get_export_csv_data which involves ZIP/CSV processing."""

    @pytest.mark.asyncio
    async def test_get_export_csv_data_success(
        self,
        export_service: SmartReadExportService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        task_id = "task-zip-unique"
        export_id = "exp-zip-unique"

        # 1. Create a dummy ZIP with a CSV file
        csv_buffer = io.StringIO()
        writer = csv.DictWriter(csv_buffer, fieldnames=["材質コード1", "納入量1"])
        writer.writeheader()
        writer.writerow({"材質コード1": "MAT001", "納入量1": "100"})

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w") as zf:
            zf.writestr("test_results.csv", csv_buffer.getvalue())

        zip_content = zip_buffer.getvalue()

        # Mock client.download_export
        with patch(
            "app.infrastructure.smartread.client.SmartReadClient.download_export",
            new_callable=AsyncMock,
        ) as mock_download:
            mock_download.return_value = zip_content

            result = await export_service.get_export_csv_data(
                config_id=smartread_config.id, task_id=task_id, export_id=export_id, save_to_db=True
            )

        assert result is not None
        assert result["filename"] == "test_results.csv"
        assert len(result["wide_data"]) == 1
        assert result["wide_data"][0]["材質コード1"] == "MAT001"

        # Verify DB records
        db.flush()
        wide = db.query(SmartReadWideData).filter_by(task_id=task_id).first()
        assert wide is not None
        assert wide.content["材質コード1"] == "MAT001"

        long = db.query(SmartReadLongData).filter_by(task_id=task_id).first()
        assert long is not None
        assert long.content["材質コード"] == "MAT001"


class TestFingerprintAndDuplicateElimination:
    """Tests for data deduplication logic."""

    def test_calculate_row_fingerprint(self, export_service: SmartReadExportService):
        data1 = {"a": 1, "b": 2}
        data2 = {"b": 2, "a": 1}
        fp1 = export_service._calculate_row_fingerprint(data1)
        fp2 = export_service._calculate_row_fingerprint(data2)
        assert fp1 == fp2
        assert len(fp1) == 64

    def test_save_deduplicated_data(
        self,
        export_service: SmartReadExportService,
        smartread_config: SmartReadConfig,
        db: Session,
    ) -> None:
        task_id = "task-dedup-unique-2"
        # Use columns that transformer recognizes to ensure long data is created
        data = [{"材質コード1": "DEDUP001", "納入量1": "50"}]

        # 1. Save first time
        export_service._save_wide_and_long_data(
            config_id=smartread_config.id,
            task_id=task_id,
            export_id="exp-1",
            task_date=date.today(),
            wide_data=data,
            long_data=[],  # This arg is ignored anyway
            filename="test.csv",
        )
        db.flush()

        count_wide = db.query(SmartReadWideData).filter_by(config_id=smartread_config.id).count()
        assert count_wide == 1, f"Should have 1 wide row for config {smartread_config.id}"

        # 2. Save again with same data (different task_id/export_id but same fingerprint/config/date)
        export_service._save_wide_and_long_data(
            config_id=smartread_config.id,
            task_id=task_id + "-new",
            export_id="exp-2",
            task_date=date.today(),
            wide_data=data,
            long_data=[],
            filename="test.csv",
        )
        db.flush()

        # Wide data should still be 1 because fingerprint+config+date matched
        count_wide_after = (
            db.query(SmartReadWideData).filter_by(config_id=smartread_config.id).count()
        )
        assert count_wide_after == 1

        # Long data should exist
        count_long = db.query(SmartReadLongData).filter_by(config_id=smartread_config.id).count()
        assert count_long == 1
