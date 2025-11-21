# backend/tests/services/test_lot_service.py
"""
LotServiceのテスト
"""

from datetime import date, timedelta

import pytest
from sqlalchemy.orm import Session

from app.domain.lot import LotCandidate
from app.models import Lot, LotCurrentStock, Product, Supplier, Warehouse
from app.services.inventory.lot_service import LotService


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
    wh1 = Warehouse(warehouse_code="W1", warehouse_name="Main")
    wh2 = Warehouse(warehouse_code="W2", warehouse_name="Sub")
    sup = Supplier(supplier_code="S1", supplier_name="Supplier")
    prod = Product(
        product_code="P1",
        product_name="Product 1",
        packaging_qty=1.0,
        packaging_unit="EA",
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

    # 期限が違うロットを2つ（W1に2つ置く）
    lot_a = Lot(
        supplier_code="S1",
        product_code="P1",
        lot_number="A",
        warehouse_id=wh1.id,
        receipt_date=date.today(),
        expiry_date=date.today() + timedelta(days=10),
    )
    lot_b = Lot(
        supplier_code="S1",
        product_code="P1",
        lot_number="B",
        warehouse_id=wh1.id,
        receipt_date=date.today(),
        expiry_date=date.today() + timedelta(days=20),
    )
    # W2にも1つ（フィルタで除外される想定）
    lot_c = Lot(
        supplier_code="S1",
        product_code="P1",
        lot_number="C",
        warehouse_id=wh2.id,
        receipt_date=date.today(),
        expiry_date=date.today() + timedelta(days=5),
    )
    db_session.add_all([lot_a, lot_b, lot_c])
    db_session.flush()

    db_session.add_all(
        [
            LotCurrentStock(lot_id=lot_a.id, current_quantity=3),
            LotCurrentStock(lot_id=lot_b.id, current_quantity=2),
            LotCurrentStock(lot_id=lot_c.id, current_quantity=9),
        ]
    )
    db_session.commit()

    svc = LotService(db_session)
    candidates = svc.get_fefo_candidates(
        product_code="P1", warehouse_code="W1", exclude_expired=True
    )

    # 返ってくるのはW1のA,Bのみ。かつFEFO順（A→B）
    assert [c.lot_number for c in candidates] == ["A", "B"]
    assert isinstance(candidates[0], LotCandidate)
