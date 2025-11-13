# backend/tests/api/test_lots.py
from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.main import app
from app.models import Lot, LotCurrentStock, Product, StockMovementReason, Supplier, Warehouse


# ---- テスト用DBセッションを使う（トランザクションは外側のpytest設定に依存）
def override_get_db():
    from app.db.session import SessionLocal

    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def _truncate_all(db: Session):
    # 依存関係の弱い順に消す
    db.query(LotCurrentStock).delete()
    db.query(Lot).delete()
    db.query(Product).delete()
    db.query(Supplier).delete()
    db.query(Warehouse).delete()
    db.commit()


def test_list_lots_filters_by_warehouse_code():
    client = TestClient(app)
    db: Session = next(override_get_db())

    _truncate_all(db)

    # マスタ
    wh1 = Warehouse(warehouse_code="W1", warehouse_name="Main")
    wh2 = Warehouse(warehouse_code="W2", warehouse_name="Sub")
    db.add_all([wh1, wh2])

    sup = Supplier(supplier_code="S1", supplier_name="Supplier")
    db.add(sup)

    prod = Product(product_code="P1", product_name="Product 1")
    db.add(prod)
    db.flush()

    # ロット（W1=在庫あり、W2=在庫あり）
    lot1 = Lot(
        supplier_code="S1",
        product_code="P1",
        lot_number="L-001",
        warehouse_id=wh1.id,
        receipt_date=date.today(),
        expiry_date=date.today() + timedelta(days=30),
    )
    lot2 = Lot(
        supplier_code="S1",
        product_code="P1",
        lot_number="L-002",
        warehouse_id=wh2.id,
        receipt_date=date.today(),
        expiry_date=date.today() + timedelta(days=40),
    )
    db.add_all([lot1, lot2])
    db.flush()

    db.add_all(
        [
            LotCurrentStock(lot_id=lot1.id, current_quantity=5),
            LotCurrentStock(lot_id=lot2.id, current_quantity=7),
        ]
    )
    db.commit()

    # フィルタ無し → 2件
    r = client.get("/lots?with_stock=true")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 2

    # warehouse_code=W1 → 1件（L-001のみ）
    r = client.get("/lots", params={"warehouse_code": "W1", "with_stock": True})
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["lot_number"] == "L-001"
    assert body[0]["warehouse_code"] == "W1"


def test_list_lots_filters_by_product_id():
    client = TestClient(app)
    db: Session = next(override_get_db())

    _truncate_all(db)

    wh = Warehouse(warehouse_code="W1", warehouse_name="Main")
    sup = Supplier(supplier_code="S1", supplier_name="Supplier")
    product_a = Product(product_code="PA", product_name="Product A")
    product_b = Product(product_code="PB", product_name="Product B")
    db.add_all([wh, sup, product_a, product_b])
    db.flush()

    lot_a = Lot(
        supplier_code="S1",
        lot_number="L-A",
        warehouse_id=wh.id,
        receipt_date=date.today(),
        expiry_date=date.today() + timedelta(days=15),
        product_id=product_a.id,
    )
    lot_b = Lot(
        supplier_code="S1",
        lot_number="L-B",
        warehouse_id=wh.id,
        receipt_date=date.today(),
        expiry_date=date.today() + timedelta(days=25),
        product_id=product_b.id,
    )
    db.add_all([lot_a, lot_b])
    db.flush()
    db.add_all(
        [
            LotCurrentStock(lot_id=lot_a.id, current_quantity=3),
            LotCurrentStock(lot_id=lot_b.id, current_quantity=6),
        ]
    )
    db.commit()

    r = client.get("/lots", params={"product_id": product_a.id, "with_stock": True})
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["product_id"] == product_a.id
    assert body[0]["lot_number"] == "L-A"


def test_create_stock_movement_updates_current_stock():
    client = TestClient(app)
    db: Session = next(override_get_db())

    _truncate_all(db)

    wh = Warehouse(warehouse_code="W1", warehouse_name="Main")
    sup = Supplier(supplier_code="S1", supplier_name="Supplier")
    prod = Product(product_code="P1", product_name="Product 1")
    db.add_all([wh, sup, prod])
    db.flush()

    lot = Lot(
        supplier_code="S1",
        product_code="P1",
        lot_number="L-100",
        warehouse_id=wh.id,
        receipt_date=date.today(),
        expiry_date=date.today() + timedelta(days=60),
    )
    db.add(lot)
    db.flush()
    db.add(LotCurrentStock(lot_id=lot.id, current_quantity=5))
    db.commit()

    # lot_id を渡せば product_id / warehouse_id はロットから補完される想定
    payload = {
        "lot_id": lot.id,
        "quantity_delta": 3.0,
        "reason": StockMovementReason.ALLOCATION_HOLD.value,  # 既存の有効値を使用
        "product_id": None,
        "warehouse_id": None,
        "source_table": "test",
        "source_id": "case-1",
        "batch_id": "b-1",
        "created_by": "pytest",
    }
    r = client.post("/lots/movements", json=payload)
    assert r.status_code == 201, r.text

    # 在庫が 5 → 8 に
    r = client.get(f"/lots/{lot.id}")
    assert r.status_code == 200
    body = r.json()
    assert body["current_quantity"] == 8.0
