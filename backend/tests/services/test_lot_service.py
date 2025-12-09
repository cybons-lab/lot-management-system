# backend/tests/services/test_lot_service.py
"""
LotServiceのテスト
"""

from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from app.application.services.inventory.lot_service import LotService
from app.domain.lot import LotCandidate
from app.infrastructure.persistence.models import Lot, LotCurrentStock, Product, Supplier, Warehouse


@pytest.fixture
def setup_lot_test_data(db_session: Session):
    """ロットテスト用の基本データをセットアップ"""
    # 既存データをクリア
    db_session.query(LotCurrentStock).delete()
    db_session.query(Lot).delete()
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
    lot_a = Lot(
        supplier_id=sup.id,
        product_id=prod.id,
        lot_number="A",
        warehouse_id=wh1.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=10),
        unit="EA",
        current_quantity=3,
        origin_type="order",  # Explicitly set for FEFO candidate filtering
    )
    lot_b = Lot(
        supplier_id=sup.id,
        product_id=prod.id,
        lot_number="B",
        warehouse_id=wh1.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=20),
        unit="EA",
        current_quantity=2,
        origin_type="order",  # Explicitly set for FEFO candidate filtering
    )
    # W2にも1つ（フィルタで除外される想定）
    lot_c = Lot(
        supplier_id=sup.id,
        product_id=prod.id,
        lot_number="C",
        warehouse_id=wh2.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=5),
        unit="EA",
        current_quantity=9,
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
