# backend/tests/services/test_lot_service.py
"""
LotServiceのテスト
"""

from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from app.application.services.inventory.lot_service import LotService
from app.domain.lot import LotCandidate
from app.infrastructure.persistence.models import (
    LotCurrentStock,
    LotReceipt,
    Product,
    Supplier,
    Warehouse,
)
from app.infrastructure.persistence.models.lot_master_model import LotMaster


@pytest.fixture
def setup_lot_test_data(db_session: Session):
    """ロットテスト用の基本データをセットアップ"""
    # 既存データをクリア
    db_session.query(LotCurrentStock).delete()
    db_session.query(LotReceipt).delete()
    db_session.query(LotMaster).delete()
    db_session.query(Product).delete()
    db_session.query(Supplier).delete()
    db_session.query(Warehouse).delete()
    db_session.commit()

    # テストデータを作成
    wh1 = Warehouse(warehouse_code="W1", warehouse_name="Main", warehouse_type="internal")
    wh2 = Warehouse(warehouse_code="W2", warehouse_name="Sub", warehouse_type="internal")
    sup = Supplier(supplier_code="S1", supplier_name="Supplier")
    prod = Product(
        maker_part_code="P1",
        product_name="Product 1",
        internal_unit="EA",
        base_unit="EA",
    )
    db_session.add_all([wh1, wh2, sup, prod])
    db_session.flush()

    return {
        "wh1": wh1,
        "wh2": wh2,
        "supplier": sup,
        "product": prod,
    }


def test_get_fefo_candidates_filters_and_sorts(db_session: Session, setup_lot_test_data):
    """FEFO候補取得のフィルタとソートのテスト"""
    data = setup_lot_test_data
    wh1 = data["wh1"]
    wh2 = data["wh2"]
    sup = data["supplier"]
    prod = data["product"]

    # 期限が違うロットを2つ（W1に2つ置く）
    lm_a = LotMaster(product_id=prod.id, supplier_id=sup.id, lot_number="A")
    db_session.add(lm_a)
    db_session.flush()

    lot_a = LotReceipt(
        lot_master_id=lm_a.id,
        supplier_id=sup.id,
        product_id=prod.id,
        warehouse_id=wh1.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=10),
        unit="EA",
        received_quantity=3,
        origin_type="order",  # Explicitly set for FEFO candidate filtering
    )
    lm_b = LotMaster(product_id=prod.id, supplier_id=sup.id, lot_number="B")
    db_session.add(lm_b)
    db_session.flush()

    lot_b = LotReceipt(
        lot_master_id=lm_b.id,
        supplier_id=sup.id,
        product_id=prod.id,
        warehouse_id=wh1.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=20),
        unit="EA",
        received_quantity=2,
        origin_type="order",  # Explicitly set for FEFO candidate filtering
    )
    # W2にも1つ（フィルタで除外される想定）
    lm_c = LotMaster(product_id=prod.id, supplier_id=sup.id, lot_number="C")
    db_session.add(lm_c)
    db_session.flush()

    lot_c = LotReceipt(
        lot_master_id=lm_c.id,
        supplier_id=sup.id,
        product_id=prod.id,
        warehouse_id=wh2.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=5),
        unit="EA",
        received_quantity=9,
        origin_type="order",  # Explicitly set for FEFO candidate filtering
    )
    db_session.add_all([lot_a, lot_b, lot_c])
    db_session.commit()

    svc = LotService(db_session)
    candidates = svc.get_fefo_candidates(
        product_code="P1", warehouse_code="W1", exclude_expired=True
    )

    # 返ってくるのはW1のA,Bのみ。かつFEFO順（A→B）
    assert [c.lot_number for c in candidates] == ["A", "B"]
    assert isinstance(candidates[0], LotCandidate)


# ============================================================
# create_lot() Tests
# ============================================================


class TestCreateLot:
    """LotService.create_lot() のテスト"""

    @pytest.fixture
    def lot_master_data(self, db_session: Session):
        """ロット作成テスト用のマスタデータをセットアップ"""
        # 既存データをクリア
        from app.infrastructure.persistence.models import (
            LotCurrentStock,
            StockHistory,
        )

        db_session.query(StockHistory).delete()
        db_session.query(LotCurrentStock).delete()
        db_session.query(LotReceipt).delete()
        db_session.query(LotMaster).delete()
        db_session.query(Product).delete()
        db_session.query(Supplier).delete()
        db_session.query(Warehouse).delete()
        db_session.commit()

        # テストデータを作成
        warehouse = Warehouse(
            warehouse_code="WH-TEST", warehouse_name="Test Warehouse", warehouse_type="internal"
        )
        supplier = Supplier(supplier_code="SUP-TEST", supplier_name="Test Supplier")
        product = Product(
            maker_part_code="PRD-TEST",
            product_name="Test Product",
            internal_unit="EA",
            base_unit="EA",
        )
        db_session.add_all([warehouse, supplier, product])
        db_session.flush()

        return {
            "warehouse": warehouse,
            "supplier": supplier,
            "product": product,
        }

    def test_create_lot_basic_adhoc(self, db_session: Session, lot_master_data):
        """基本的なアドホックロット作成テスト（origin_type=adhoc）"""
        from decimal import Decimal

        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        lot_create = LotCreate(
            lot_number="TEST-LOT-001",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            received_date=date.today(),
            received_quantity=Decimal("100"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )

        result = svc.create_lot(lot_create)

        assert result.lot_number == "TEST-LOT-001"
        assert result.product_id == data["product"].id
        assert result.warehouse_id == data["warehouse"].id
        assert result.current_quantity == Decimal("100")
        assert result.status.value == "active"
        assert result.origin_type.value == "adhoc"

    def test_create_lot_sample_type(self, db_session: Session, lot_master_data):
        """サンプルロット作成テスト（origin_type=sample）"""
        from decimal import Decimal

        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        lot_create = LotCreate(
            lot_number="SMP-001",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            received_date=date.today(),
            received_quantity=Decimal("10"),
            unit="EA",
            origin_type=LotOriginType.SAMPLE,
            origin_reference="キャンペーン用サンプル",
        )

        result = svc.create_lot(lot_create)

        assert result.lot_number == "SMP-001"
        assert result.origin_type.value == "sample"
        assert result.origin_reference == "キャンペーン用サンプル"

    def test_create_lot_safety_stock_type(self, db_session: Session, lot_master_data):
        """安全在庫ロット作成テスト（origin_type=safety_stock）"""
        from decimal import Decimal

        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        lot_create = LotCreate(
            lot_number="SAF-001",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            received_date=date.today(),
            received_quantity=Decimal("500"),
            unit="EA",
            origin_type=LotOriginType.SAFETY_STOCK,
        )

        result = svc.create_lot(lot_create)

        assert result.lot_number == "SAF-001"
        assert result.origin_type.value == "safety_stock"

    def test_create_lot_with_supplier_code(self, db_session: Session, lot_master_data):
        """仕入先コード指定でのロット作成テスト"""
        from decimal import Decimal

        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        lot_create = LotCreate(
            lot_number="TEST-LOT-WITH-SUPPLIER",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            supplier_code="SUP-TEST",
            received_date=date.today(),
            received_quantity=Decimal("50"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )

        result = svc.create_lot(lot_create)

        assert result.lot_number == "TEST-LOT-WITH-SUPPLIER"
        assert result.supplier_id == data["supplier"].id
        assert result.supplier_code == "SUP-TEST"

    def test_create_lot_without_supplier(self, db_session: Session, lot_master_data):
        """仕入先なしでのロット作成テスト（supplier_code=None）"""
        from decimal import Decimal

        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        lot_create = LotCreate(
            lot_number="TEST-NO-SUPPLIER",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            supplier_code=None,
            received_date=date.today(),
            received_quantity=Decimal("25"),
            unit="EA",
            origin_type=LotOriginType.SAMPLE,
        )

        result = svc.create_lot(lot_create)

        assert result.lot_number == "TEST-NO-SUPPLIER"
        assert result.supplier_id is None

    def test_create_lot_invalid_supplier_code(self, db_session: Session, lot_master_data):
        """存在しない仕入先コードでエラーとなるテスト"""
        from decimal import Decimal

        from app.domain.lot import LotSupplierNotFoundError
        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        lot_create = LotCreate(
            lot_number="TEST-INVALID-SUPPLIER",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            supplier_code="INVALID-SUPPLIER",
            received_date=date.today(),
            received_quantity=Decimal("50"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )

        with pytest.raises(LotSupplierNotFoundError) as exc_info:
            svc.create_lot(lot_create)

        assert "INVALID-SUPPLIER" in str(exc_info.value)

    def test_create_lot_invalid_product_id(self, db_session: Session, lot_master_data):
        """存在しない製品IDでエラーとなるテスト"""
        from decimal import Decimal

        from app.domain.lot import LotProductNotFoundError
        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        lot_create = LotCreate(
            lot_number="TEST-INVALID-PRODUCT",
            product_id=99999,  # 存在しないID
            warehouse_id=data["warehouse"].id,
            received_date=date.today(),
            received_quantity=Decimal("50"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )

        with pytest.raises(LotProductNotFoundError):
            svc.create_lot(lot_create)

    def test_create_lot_invalid_warehouse_id(self, db_session: Session, lot_master_data):
        """存在しない倉庫IDでエラーとなるテスト"""
        from decimal import Decimal

        from app.domain.lot import LotWarehouseNotFoundError
        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        lot_create = LotCreate(
            lot_number="TEST-INVALID-WAREHOUSE",
            product_id=data["product"].id,
            warehouse_id=99999,  # 存在しないID
            received_date=date.today(),
            received_quantity=Decimal("50"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )

        with pytest.raises(LotWarehouseNotFoundError):
            svc.create_lot(lot_create)

    def test_create_lot_creates_lot_master(self, db_session: Session, lot_master_data):
        """ロット作成時にLotMasterも作成されるテスト"""
        from decimal import Decimal

        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        # 最初にLotMasterが存在しないことを確認
        initial_count = db_session.query(LotMaster).count()

        lot_create = LotCreate(
            lot_number="TEST-NEW-MASTER",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            received_date=date.today(),
            received_quantity=Decimal("100"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )

        svc.create_lot(lot_create)

        # LotMasterが作成されたことを確認
        final_count = db_session.query(LotMaster).count()
        assert final_count == initial_count + 1

        # 作成されたLotMasterの内容を確認
        lot_master = (
            db_session.query(LotMaster).filter(LotMaster.lot_number == "TEST-NEW-MASTER").first()
        )
        assert lot_master is not None
        assert lot_master.product_id == data["product"].id
        assert lot_master.supplier_id is None

    def test_create_lot_reuses_existing_lot_master(self, db_session: Session, lot_master_data):
        """同一ロット番号・製品・仕入先の場合、既存LotMasterを再利用するテスト"""
        from decimal import Decimal

        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        # 最初のロット作成
        lot_create1 = LotCreate(
            lot_number="SHARED-MASTER",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            received_date=date.today(),
            received_quantity=Decimal("100"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )
        result1 = svc.create_lot(lot_create1)

        master_count_after_first = db_session.query(LotMaster).count()

        # 同じロット番号で2番目のロット作成（小分け入荷のシナリオ）
        lot_create2 = LotCreate(
            lot_number="SHARED-MASTER",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            received_date=date.today(),
            received_quantity=Decimal("50"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )
        result2 = svc.create_lot(lot_create2)

        master_count_after_second = db_session.query(LotMaster).count()

        # LotMasterは増えていない（再利用された）
        assert master_count_after_second == master_count_after_first

        # 両方のロットが異なるIDを持つ
        assert result1.id != result2.id

    def test_create_lot_with_expiry_date(self, db_session: Session, lot_master_data):
        """有効期限付きロット作成テスト"""
        from decimal import Decimal

        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)
        expiry = date.today() + timedelta(days=365)

        lot_create = LotCreate(
            lot_number="TEST-WITH-EXPIRY",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            received_date=date.today(),
            expiry_date=expiry,
            received_quantity=Decimal("100"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )

        result = svc.create_lot(lot_create)

        assert result.expiry_date == expiry

    def test_create_lot_creates_stock_history(self, db_session: Session, lot_master_data):
        """ロット作成時にstock_historyレコードが作成されるテスト"""
        from decimal import Decimal

        from app.infrastructure.persistence.models import StockHistory
        from app.presentation.schemas.inventory.inventory_schema import LotCreate, LotOriginType

        data = lot_master_data
        svc = LotService(db_session)

        lot_create = LotCreate(
            lot_number="TEST-STOCK-HISTORY",
            product_id=data["product"].id,
            warehouse_id=data["warehouse"].id,
            received_date=date.today(),
            received_quantity=Decimal("100"),
            unit="EA",
            origin_type=LotOriginType.ADHOC,
        )

        result = svc.create_lot(lot_create)

        # stock_historyが作成されたことを確認
        history = db_session.query(StockHistory).filter(StockHistory.lot_id == result.id).first()
        assert history is not None
        assert history.transaction_type == "inbound"
        assert history.quantity_change == Decimal("100")
        assert history.reference_type == "adhoc_intake"
