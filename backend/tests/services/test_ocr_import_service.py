"""OcrImportService のテスト."""

from datetime import date

import pytest
from sqlalchemy.orm import Session

from app.application.services.ocr.ocr_import_service import OcrImportService
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    DeliveryPlace,
    Supplier,
    SupplierItem,
)
from app.infrastructure.persistence.models.orders_models import Order, OrderLine
from app.presentation.schemas.ocr_import_schema import (
    OcrImportLineRequest,
    OcrImportRequest,
)


@pytest.fixture
def supplier(db: Session) -> Supplier:
    """テスト用仕入先を作成."""
    sup = Supplier(
        supplier_code="SUP001",
        supplier_name="テスト仕入先",
    )
    db.add(sup)
    db.flush()
    return sup


@pytest.fixture
def supplier_item(db: Session, supplier: Supplier) -> SupplierItem:
    """テスト用仕入先品目を作成."""
    item = SupplierItem(
        supplier_id=supplier.id,
        maker_part_no="MKR-001",
        unit="KG",
    )
    db.add(item)
    db.flush()
    return item


@pytest.fixture
def customer(db: Session) -> Customer:
    """テスト用得意先を作成."""
    cust = Customer(
        customer_code="CUST001",
        customer_name="テスト得意先",
    )
    db.add(cust)
    db.flush()
    return cust


@pytest.fixture
def customer_item(db: Session, customer: Customer, supplier_item: SupplierItem) -> CustomerItem:
    """テスト用得意先品目を作成."""
    ci = CustomerItem(
        customer_id=customer.id,
        supplier_item_id=supplier_item.id,
        customer_part_no="CPART-001",
    )
    db.add(ci)
    db.flush()
    return ci


@pytest.fixture
def delivery_place(db: Session, customer: Customer) -> DeliveryPlace:
    """テスト用納入先を作成."""
    dp = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP001",
        delivery_place_name="テスト工場",
        jiku_code="J1",
    )
    db.add(dp)
    db.flush()
    return dp


@pytest.fixture
def service(db: Session) -> OcrImportService:
    """OcrImportServiceインスタンスを作成."""
    return OcrImportService(db)


class TestImportOcrData:
    """import_ocr_data のテスト."""

    def test_import_success_with_resolved_item(
        self,
        db: Session,
        service: OcrImportService,
        customer: Customer,
        customer_item: CustomerItem,
        delivery_place: DeliveryPlace,
    ) -> None:
        """得意先品目が解決される場合、resolvedとして処理される."""
        request = OcrImportRequest(
            customer_code="CUST001",
            source_filename="test_order.csv",
            lines=[
                OcrImportLineRequest(
                    customer_part_no="CPART-001",
                    jiku_code="J1",
                    quantity=100.0,
                    delivery_date=date(2026, 3, 1),
                ),
            ],
        )

        response = service.import_ocr_data(request)

        assert response.order_id is not None
        assert response.total_lines == 1
        assert response.resolved_count == 1
        assert response.unresolved_count == 0
        assert response.customer_code == "CUST001"

        # 受注ヘッダが作成されている
        order = db.query(Order).filter(Order.id == response.order_id).first()
        assert order is not None
        assert order.ocr_source_filename == "test_order.csv"

    def test_import_with_unresolved_item(
        self,
        db: Session,
        service: OcrImportService,
        customer: Customer,
    ) -> None:
        """得意先品目が見つからない場合、unresolvedとして処理される."""
        request = OcrImportRequest(
            customer_code="CUST001",
            source_filename="test_unresolved.csv",
            lines=[
                OcrImportLineRequest(
                    customer_part_no="UNKNOWN-PART",
                    jiku_code="J1",
                    quantity=50.0,
                    delivery_date=date(2026, 3, 1),
                ),
            ],
        )

        response = service.import_ocr_data(request)

        assert response.total_lines == 1
        assert response.resolved_count == 0
        assert response.unresolved_count == 1
        assert response.lines[0].status == "unresolved"

    def test_import_customer_not_found(
        self,
        db: Session,
        service: OcrImportService,
    ) -> None:
        """存在しない得意先コードの場合、ValueErrorが発生する."""
        request = OcrImportRequest(
            customer_code="NONEXISTENT",
            source_filename="test_err.csv",
            lines=[
                OcrImportLineRequest(
                    customer_part_no="PART-001",
                    jiku_code="J1",
                    quantity=10.0,
                    delivery_date=date(2026, 3, 1),
                ),
            ],
        )

        with pytest.raises(ValueError, match="Customer not found"):
            service.import_ocr_data(request)

    def test_import_multiple_lines(
        self,
        db: Session,
        service: OcrImportService,
        customer: Customer,
        customer_item: CustomerItem,
        delivery_place: DeliveryPlace,
    ) -> None:
        """複数明細行を正常に処理できる."""
        request = OcrImportRequest(
            customer_code="CUST001",
            source_filename="test_multi.csv",
            lines=[
                OcrImportLineRequest(
                    customer_part_no="CPART-001",
                    jiku_code="J1",
                    quantity=100.0,
                    delivery_date=date(2026, 3, 1),
                ),
                OcrImportLineRequest(
                    customer_part_no="UNKNOWN-PART",
                    jiku_code="J1",
                    quantity=200.0,
                    delivery_date=date(2026, 3, 2),
                ),
            ],
        )

        response = service.import_ocr_data(request)

        assert response.total_lines == 2
        assert response.resolved_count == 1
        assert response.unresolved_count == 1

        # 受注明細行が作成されている
        lines = db.query(OrderLine).filter(OrderLine.order_id == response.order_id).all()
        assert len(lines) == 2
