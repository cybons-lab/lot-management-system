"""OrderRegisterService のテスト."""

from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.application.services.order_register.order_register_service import (
    OrderRegisterService,
)
from app.infrastructure.persistence.models.shipping_master_models import (
    OrderRegisterRow,
    ShippingMasterCurated,
)
from app.infrastructure.persistence.models.smartread_models import (
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
def shipping_master(db: Session) -> ShippingMasterCurated:
    """テスト用出荷マスタを作成."""
    master = ShippingMasterCurated(
        customer_code="100427105",
        material_code="MAT001",
        jiku_code="A1",
        customer_name="テスト得意先",
        supplier_code="SUP001",
        supplier_name="テスト仕入先",
        warehouse_code="WH001",
        shipping_warehouse="東京倉庫",
        delivery_place_code="DP001",
        delivery_place_name="テスト納入先",
        customer_part_no="CP001",
        maker_part_no="MP001",
        shipping_slip_text="ロット 入庫番号",
        transport_lt_days=2,
        remarks="テスト備考",
    )
    db.add(master)
    db.flush()
    return master


@pytest.fixture
def service(db: Session) -> OrderRegisterService:
    """OrderRegisterServiceインスタンスを作成."""
    return OrderRegisterService(db)


class TestGenerateFromOcr:
    """generate_from_ocr のテスト."""

    def test_generate_with_matching_master(
        self,
        db: Session,
        service: OrderRegisterService,
        smartread_config: SmartReadConfig,
        shipping_master: ShippingMasterCurated,
    ) -> None:
        """マスタが一致する場合、正常に受注登録結果が生成される."""
        # Setup: OCR縦持ちデータを作成
        task_date = date(2026, 2, 1)
        long_data = SmartReadLongData(
            config_id=smartread_config.id,
            task_id="TASK001",
            task_date=task_date,
            row_index=1,
            content={
                "材質コード": "MAT001",
                "得意先コード": "100427105",
                "次区": "A1",
                "納期": "2026-02-10",
                "納入量": "100",
                "アイテムNo": "ITEM001",
                "入庫No": "INB001",
            },
            status="PENDING",
        )
        db.add(long_data)
        db.flush()

        # Execute
        count, warnings = service.generate_from_ocr(task_date)

        # Assert
        assert count == 1
        assert len(warnings) == 0

        # DB確認
        rows = db.query(OrderRegisterRow).filter(OrderRegisterRow.task_date == task_date).all()
        assert len(rows) == 1
        row = rows[0]
        assert row.material_code == "MAT001"
        assert row.customer_code == "100427105"
        assert row.supplier_code == "SUP001"
        assert row.shipping_warehouse_code == "WH001"
        assert row.shipping_warehouse_name == "東京倉庫"

    def test_generate_without_matching_master(
        self,
        db: Session,
        service: OrderRegisterService,
        smartread_config: SmartReadConfig,
    ) -> None:
        """マスタが一致しない場合、警告が生成される."""
        task_date = date(2026, 2, 2)
        long_data = SmartReadLongData(
            config_id=smartread_config.id,
            task_id="TASK002",
            task_date=task_date,
            row_index=1,
            content={
                "材質コード": "UNKNOWN_MAT",
                "得意先コード": "100427105",
                "次区": "X9",
                "納期": "2026-02-10",
            },
            status="PENDING",
        )
        db.add(long_data)
        db.flush()

        count, warnings = service.generate_from_ocr(task_date)

        assert count == 1
        assert len(warnings) == 1
        assert "マスタデータが見つかりません" in warnings[0]

    def test_generate_no_pending_data(
        self,
        db: Session,
        service: OrderRegisterService,
    ) -> None:
        """PENDINGデータがない場合、0件が返る."""
        task_date = date(2026, 3, 1)
        count, warnings = service.generate_from_ocr(task_date)

        assert count == 0
        assert len(warnings) == 0

    def test_generate_uses_default_customer_code(
        self,
        db: Session,
        service: OrderRegisterService,
        smartread_config: SmartReadConfig,
        shipping_master: ShippingMasterCurated,
    ) -> None:
        """得意先コードがない場合、デフォルト値が使用される."""
        task_date = date(2026, 2, 3)
        long_data = SmartReadLongData(
            config_id=smartread_config.id,
            task_id="TASK003",
            task_date=task_date,
            row_index=1,
            content={
                "材質コード": "MAT001",
                # 得意先コードなし → デフォルト "100427105" が使われる
                "次区": "A1",
                "納期": "2026-02-10",
            },
            status="PENDING",
        )
        db.add(long_data)
        db.flush()

        count, warnings = service.generate_from_ocr(task_date)

        assert count == 1
        rows = db.query(OrderRegisterRow).filter(OrderRegisterRow.task_date == task_date).all()
        assert len(rows) == 1
        assert rows[0].customer_code == "100427105"


class TestUpdateLotAssignments:
    """update_lot_assignments のテスト."""

    def test_update_lot_assignments_success(
        self,
        db: Session,
        service: OrderRegisterService,
    ) -> None:
        """ロット割当が正常に更新される."""
        row = OrderRegisterRow(
            task_date=date(2026, 2, 1),
            material_code="MAT001",
            customer_code="100427105",
            source="OCR",
            status="PENDING",
        )
        db.add(row)
        db.flush()

        updated = service.update_lot_assignments(
            row_id=row.id,
            lot_no_1="LOT-001",
            quantity_1=50,
            lot_no_2="LOT-002",
            quantity_2=30,
        )

        assert updated is not None
        assert updated.lot_no_1 == "LOT-001"
        assert updated.quantity_1 == 50
        assert updated.lot_no_2 == "LOT-002"
        assert updated.quantity_2 == 30

    def test_update_lot_assignments_not_found(
        self,
        db: Session,
        service: OrderRegisterService,
    ) -> None:
        """存在しないIDの場合、Noneが返る."""
        result = service.update_lot_assignments(
            row_id=99999,
            lot_no_1="LOT-001",
            quantity_1=50,
            lot_no_2=None,
            quantity_2=None,
        )
        assert result is None


class TestListAndGet:
    """list_order_register_rows, get_order_register_row のテスト."""

    def test_list_with_task_date_filter(
        self,
        db: Session,
        service: OrderRegisterService,
    ) -> None:
        """タスク日付でフィルタリングできる."""
        date1 = date(2026, 1, 10)
        date2 = date(2026, 1, 11)

        db.add(
            OrderRegisterRow(task_date=date1, material_code="M1", source="OCR", status="PENDING")
        )
        db.add(
            OrderRegisterRow(task_date=date2, material_code="M2", source="OCR", status="PENDING")
        )
        db.flush()

        rows = service.list_order_register_rows(task_date=date1)
        assert len(rows) == 1
        assert rows[0].material_code == "M1"

    def test_get_existing_row(
        self,
        db: Session,
        service: OrderRegisterService,
    ) -> None:
        """存在するIDで受注登録結果を取得できる."""
        row = OrderRegisterRow(
            task_date=date(2026, 1, 10),
            material_code="MAT001",
            source="OCR",
            status="PENDING",
        )
        db.add(row)
        db.flush()

        result = service.get_order_register_row(row.id)
        assert result is not None
        assert result.material_code == "MAT001"

    def test_get_nonexistent_row(
        self,
        db: Session,
        service: OrderRegisterService,
    ) -> None:
        """存在しないIDではNoneが返る."""
        result = service.get_order_register_row(99999)
        assert result is None
