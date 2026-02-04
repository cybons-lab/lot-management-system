"""OCR結果削除サービスのテスト."""

from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.application.services.ocr.ocr_deletion_service import delete_ocr_results_service
from app.infrastructure.persistence.models.smartread_models import (
    OcrResultEdit,
    SmartReadConfig,
    SmartReadLongData,
)


@pytest.fixture
def smartread_config(db: Session) -> SmartReadConfig:
    """テスト用SmartRead設定を作成."""
    config = SmartReadConfig(
        name="test_config",
        api_url="https://example.com/api",
        api_key="test_key",
    )
    db.add(config)
    db.flush()
    return config


@pytest.fixture
def ocr_data_with_error(db: Session, smartread_config: SmartReadConfig) -> SmartReadLongData:
    """エラーありOCRデータを作成."""
    long_data = SmartReadLongData(
        config_id=smartread_config.id,
        task_id="TASK_DEL_001",
        task_date=date(2026, 2, 1),
        row_index=1,
        content={"材質コード": "MAT001", "次区": "A1"},
        status="PENDING",
    )
    db.add(long_data)
    db.flush()

    # エラーフラグ付き編集データ
    edit = OcrResultEdit(
        smartread_long_data_id=long_data.id,
        error_flags={"material_not_found": True},
    )
    db.add(edit)
    db.flush()

    return long_data


@pytest.fixture
def ocr_data_no_error(db: Session, smartread_config: SmartReadConfig) -> SmartReadLongData:
    """エラーなしOCRデータを作成."""
    long_data = SmartReadLongData(
        config_id=smartread_config.id,
        task_id="TASK_DEL_002",
        task_date=date(2026, 2, 1),
        row_index=2,
        content={"材質コード": "MAT002", "次区": "A2"},
        status="PENDING",
    )
    db.add(long_data)
    db.flush()
    return long_data


class TestDeleteOcrResultsService:
    """delete_ocr_results_service のテスト."""

    def test_delete_nonexistent_id_raises_404(
        self,
        db: Session,
    ) -> None:
        """存在しないIDを指定した場合、404が返る."""
        with pytest.raises(HTTPException) as exc_info:
            delete_ocr_results_service(db, [99999], user_id=1)
        assert exc_info.value.status_code == 404
