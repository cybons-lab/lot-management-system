import pytest
from sqlalchemy import BigInteger, Column, Date, DateTime, Integer, String, func, text
from sqlalchemy.orm import Session

from app.application.services.admin.data_integrity_service import (
    EXCLUDED_TABLES,
    REPAIR_RULES,
    DataIntegrityService,
)
from app.infrastructure.persistence.models.base_model import Base


# テスト専用テーブル名。他テストの scan_all() で WARNING が出ないよう
# EXCLUDED_TABLES に登録しておく（このテストファイルの fixture 内でのみ除外解除する）。
TEST_TABLE_NAME = "integrity_test_table"
EXCLUDED_TABLES.add(TEST_TABLE_NAME)


class IntegrityTestModel(Base):
    """scan_all() のテスト用モデル.

    Base を継承して Base.metadata に登録する必要がある
    （DataIntegrityService が Base.metadata.tables を走査するため）。
    """

    __tablename__ = TEST_TABLE_NAME
    id = Column(BigInteger, primary_key=True)
    not_null_col = Column(String(100), nullable=False)
    nullable_col = Column(String(100), nullable=True)
    valid_to = Column(Date, nullable=False, server_default=text("'9999-12-31'"))
    created_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    version = Column(Integer, nullable=False, server_default=text("1"))


@pytest.fixture
def setup_test_db(db: Session):
    """テスト用テーブルを作成し、スキャン対象に含める."""
    db.execute(text(f"DROP TABLE IF EXISTS {TEST_TABLE_NAME} CASCADE"))
    Base.metadata.create_all(bind=db.get_bind(), tables=[IntegrityTestModel.__table__])
    db.commit()

    # スキャン対象にするため一時的に EXCLUDED_TABLES から除外
    EXCLUDED_TABLES.discard(TEST_TABLE_NAME)
    yield db
    EXCLUDED_TABLES.add(TEST_TABLE_NAME)


def test_scan_all_finds_not_null_violation(setup_test_db: Session):
    """NOT NULL 違反を自動検出できること."""
    setup_test_db.execute(
        text(f"ALTER TABLE {TEST_TABLE_NAME} ALTER COLUMN not_null_col DROP NOT NULL")
    )
    setup_test_db.execute(
        text(
            f"INSERT INTO {TEST_TABLE_NAME} "
            "(id, not_null_col, valid_to, created_at, updated_at, version) "
            "VALUES (1, NULL, '9999-12-31', NOW(), NOW(), 1)"
        )
    )
    setup_test_db.commit()

    service = DataIntegrityService(setup_test_db)
    violations = service.scan_all()

    target = [
        v for v in violations if v.table_name == TEST_TABLE_NAME and v.column_name == "not_null_col"
    ]
    assert len(target) == 1
    assert target[0].violation_count == 1
    assert target[0].source == "auto"


def test_scan_all_finds_rule_violation(setup_test_db: Session, monkeypatch):
    """REPAIR_RULES に定義された nullable カラムの NULL 違反を検出できること."""
    monkeypatch.setitem(REPAIR_RULES, (TEST_TABLE_NAME, "nullable_col"), "default_val")

    setup_test_db.execute(
        text(
            f"INSERT INTO {TEST_TABLE_NAME} "
            "(id, not_null_col, nullable_col, valid_to, created_at, updated_at, version) "
            "VALUES (2, 'ok', NULL, '9999-12-31', NOW(), NOW(), 1)"
        )
    )
    setup_test_db.commit()

    service = DataIntegrityService(setup_test_db)
    violations = service.scan_all()

    target = [
        v for v in violations if v.table_name == TEST_TABLE_NAME and v.column_name == "nullable_col"
    ]
    assert len(target) == 1
    assert target[0].fixable is True
    assert target[0].source == "rule"


def test_fix_violations_applies_fix(setup_test_db: Session, monkeypatch):
    """REPAIR_RULES に基づき NULL を修正できること."""
    monkeypatch.setitem(REPAIR_RULES, (TEST_TABLE_NAME, "not_null_col"), "fixed_val")

    setup_test_db.execute(
        text(f"ALTER TABLE {TEST_TABLE_NAME} ALTER COLUMN not_null_col DROP NOT NULL")
    )
    setup_test_db.execute(
        text(
            f"INSERT INTO {TEST_TABLE_NAME} "
            "(id, not_null_col, valid_to, created_at, updated_at, version) "
            "VALUES (3, NULL, '9999-12-31', NOW(), NOW(), 1)"
        )
    )
    setup_test_db.commit()

    service = DataIntegrityService(setup_test_db)
    result = service.fix_violations(table_name=TEST_TABLE_NAME, column_name="not_null_col")

    assert len(result["fixed"]) == 1
    val = setup_test_db.execute(
        text(f"SELECT not_null_col FROM {TEST_TABLE_NAME} WHERE id = 3")
    ).scalar()
    assert val == "fixed_val"


def test_fix_violations_skips_clean_items(setup_test_db: Session, monkeypatch):
    """NULL がない場合はスキップされること."""
    monkeypatch.setitem(REPAIR_RULES, (TEST_TABLE_NAME, "not_null_col"), "fixed_val")

    setup_test_db.execute(
        text(
            f"INSERT INTO {TEST_TABLE_NAME} "
            "(id, not_null_col, valid_to, created_at, updated_at, version) "
            "VALUES (4, 'original', '9999-12-31', NOW(), NOW(), 1)"
        )
    )
    setup_test_db.commit()

    service = DataIntegrityService(setup_test_db)
    result = service.fix_violations(table_name=TEST_TABLE_NAME, column_name="not_null_col")

    assert len(result["fixed"]) == 0
    assert len(result["skipped"]) == 1
