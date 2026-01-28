from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.application.services.smartread.completion_service import SmartReadCompletionService
from app.infrastructure.persistence.models.smartread_models import (
    OcrResultEdit,
    OcrResultEditCompleted,
    SmartReadLongData,
    SmartReadLongDataCompleted,
)


@pytest.fixture
def completion_service(db_session: Session):
    return SmartReadCompletionService(db_session)


@pytest.fixture
def sample_data(db_session: Session):
    # Create dependency: Config
    from app.infrastructure.persistence.models.smartread_models import SmartReadConfig

    config = SmartReadConfig(
        name="Test Config",
        endpoint="http://example.com",
        api_key="secret",
    )
    db_session.add(config)
    db_session.flush()

    # Create sample SmartReadLongData
    long_data = SmartReadLongData(
        config_id=config.id,
        task_id="task_1",
        task_date=date(2023, 1, 1),
        row_index=1,
        content={"key": "value"},
        status="PENDING",
    )
    db_session.add(long_data)
    db_session.flush()

    # Create associated edit
    edit = OcrResultEdit(
        smartread_long_data_id=long_data.id,
        lot_no_1="LOT123",
        process_status="pending",
    )
    db_session.add(edit)
    db_session.commit()

    return long_data, edit


def test_mark_as_completed(completion_service, db_session, sample_data):
    long_data, edit = sample_data
    original_id = long_data.id

    # Execute
    count = completion_service.mark_as_completed([long_data.id])

    assert count == 1

    # Verify active data is gone
    active_item = db_session.get(SmartReadLongData, original_id)
    assert active_item is None

    active_edit = (
        db_session.query(OcrResultEdit).filter_by(smartread_long_data_id=original_id).first()
    )
    assert active_edit is None

    # Verify completed data exists
    completed_item = (
        db_session.query(SmartReadLongDataCompleted).filter_by(original_id=original_id).first()
    )
    assert completed_item is not None
    assert completed_item.status == "COMPLETED"

    completed_edit = (
        db_session.query(OcrResultEditCompleted)
        .filter_by(smartread_long_data_completed_id=completed_item.id)
        .first()
    )
    assert completed_edit is not None
    assert completed_edit.lot_no_1 == "LOT123"
    assert completed_edit.process_status == "completed"


def test_restore_items(completion_service, db_session, sample_data):
    long_data, edit = sample_data
    original_id = long_data.id

    # First complete it
    completion_service.mark_as_completed([long_data.id])

    completed_item = (
        db_session.query(SmartReadLongDataCompleted).filter_by(original_id=original_id).first()
    )
    assert completed_item is not None

    # Execute Restore
    count = completion_service.restore_items([completed_item.id])

    assert count == 1

    # Verify completed data is gone
    assert db_session.get(SmartReadLongDataCompleted, completed_item.id) is None

    # Verify active data is back
    # Note: ID might have changed depending on implementation logic (auto-inc)
    # Service implementation uses auto-inc, so we check by content/original keys if necessary,
    # but simplest is to check if ANY item exists that matches.
    restored_item = (
        db_session.query(SmartReadLongData).filter_by(task_id="task_1", row_index=1).first()
    )
    assert restored_item is not None
    assert restored_item.status == "PENDING"

    restored_edit = (
        db_session.query(OcrResultEdit).filter_by(smartread_long_data_id=restored_item.id).first()
    )
    assert restored_edit is not None
    assert restored_edit.lot_no_1 == "LOT123"


def test_mark_as_completed_skips_errors(completion_service, db_session, sample_data):
    long_data, edit = sample_data
    original_id = long_data.id

    # Set error flag on the edit
    edit.error_flags = {"master_not_found": True}
    db_session.add(edit)
    db_session.commit()

    # Execute
    count = completion_service.mark_as_completed([long_data.id])

    assert count == 0

    # Verify active data still exists
    active_item = db_session.get(SmartReadLongData, original_id)
    assert active_item is not None

    # Verify completed data does NOT exist
    completed_item = (
        db_session.query(SmartReadLongDataCompleted).filter_by(original_id=original_id).first()
    )
    assert completed_item is None
