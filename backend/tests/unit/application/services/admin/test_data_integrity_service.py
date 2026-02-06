import pytest
from sqlalchemy import BigInteger, Column, Date, DateTime, Integer, String, func, text
from sqlalchemy.orm import Session

from app.application.services.admin.data_integrity_service import REPAIR_RULES, DataIntegrityService
from app.infrastructure.persistence.models.base_model import Base


# Test model for data integrity
class IntegrityTestModel(Base):
    __tablename__ = "integrity_test_table"
    id = Column(BigInteger, primary_key=True)
    not_null_col = Column(String(100), nullable=False)
    nullable_col = Column(String(100), nullable=True)
    valid_to = Column(Date, nullable=False, server_default=text("'9999-12-31'"))
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    version = Column(Integer, nullable=False, server_default=text("1"))


@pytest.fixture
def setup_test_db(db: Session):
    db.execute(text("DROP TABLE IF EXISTS integrity_test_table CASCADE"))
    Base.metadata.create_all(bind=db.get_bind(), tables=[IntegrityTestModel.__table__])
    db.commit()
    yield db


def test_scan_all_finds_not_null_violation(setup_test_db: Session):
    # To test detection, we need NULLs in a NOT NULL column.
    # We must temporarily drop the constraint to insert the bad data.
    setup_test_db.execute(
        text("ALTER TABLE integrity_test_table ALTER COLUMN not_null_col DROP NOT NULL")
    )
    setup_test_db.execute(
        text(
            "INSERT INTO integrity_test_table (id, not_null_col, valid_to, created_at, updated_at, version) VALUES (1, NULL, '9999-12-31', NOW(), NOW(), 1)"
        )
    )
    setup_test_db.commit()

    service = DataIntegrityService(setup_test_db)
    violations = service.scan_all()

    target = [
        v
        for v in violations
        if v.table_name == "integrity_test_table" and v.column_name == "not_null_col"
    ]
    assert len(target) == 1
    assert target[0].violation_count == 1
    assert target[0].source == "auto"


def test_scan_all_finds_rule_violation(setup_test_db: Session, monkeypatch):
    monkeypatch.setitem(REPAIR_RULES, ("integrity_test_table", "nullable_col"), "default_val")

    setup_test_db.execute(
        text(
            "INSERT INTO integrity_test_table (id, not_null_col, nullable_col, valid_to, created_at, updated_at, version) VALUES (2, 'ok', NULL, '9999-12-31', NOW(), NOW(), 1)"
        )
    )
    setup_test_db.commit()

    service = DataIntegrityService(setup_test_db)
    violations = service.scan_all()

    target = [
        v
        for v in violations
        if v.table_name == "integrity_test_table" and v.column_name == "nullable_col"
    ]
    assert len(target) == 1
    assert target[0].fixable is True
    assert target[0].source == "rule"


def test_fix_violations_applies_fix(setup_test_db: Session, monkeypatch):
    monkeypatch.setitem(REPAIR_RULES, ("integrity_test_table", "not_null_col"), "fixed_val")

    # Drop constraint to allow seeding NULL
    setup_test_db.execute(
        text("ALTER TABLE integrity_test_table ALTER COLUMN not_null_col DROP NOT NULL")
    )
    setup_test_db.execute(
        text(
            "INSERT INTO integrity_test_table (id, not_null_col, valid_to, created_at, updated_at, version) VALUES (3, NULL, '9999-12-31', NOW(), NOW(), 1)"
        )
    )
    setup_test_db.commit()

    service = DataIntegrityService(setup_test_db)
    result = service.fix_violations(table_name="integrity_test_table", column_name="not_null_col")

    assert len(result["fixed"]) == 1
    val = setup_test_db.execute(
        text("SELECT not_null_col FROM integrity_test_table WHERE id = 3")
    ).scalar()
    assert val == "fixed_val"


def test_fix_violations_skips_clean_items(setup_test_db: Session, monkeypatch):
    monkeypatch.setitem(REPAIR_RULES, ("integrity_test_table", "not_null_col"), "fixed_val")

    setup_test_db.execute(
        text(
            "INSERT INTO integrity_test_table (id, not_null_col, valid_to, created_at, updated_at, version) VALUES (4, 'original', '9999-12-31', NOW(), NOW(), 1)"
        )
    )
    setup_test_db.commit()

    service = DataIntegrityService(setup_test_db)
    result = service.fix_violations(table_name="integrity_test_table", column_name="not_null_col")

    assert len(result["fixed"]) == 0
    assert len(result["skipped"]) == 1
