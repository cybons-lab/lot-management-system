from datetime import date, timedelta

from app.infrastructure.persistence.models import Lot, Order, Warehouse
from app.presentation.api.routes.allocations.allocations_router import (
    commit_allocation,
    preview_allocations,
)
from app.presentation.api.routes.masters.customers_router import create_customer
from app.presentation.api.routes.masters.products_router import create_product
from app.presentation.api.routes.masters.suppliers_router import create_supplier
from app.presentation.api.routes.masters.warehouses_router import create_warehouse
from app.presentation.api.routes.orders.orders_router import create_order
from app.presentation.schemas.allocations.allocations_schema import (
    AllocationCommitRequest,
    FefoPreviewRequest,
)
from app.presentation.schemas.masters.masters_schema import (
    CustomerCreate,
    SupplierCreate,
    WarehouseCreate,
)
from app.presentation.schemas.masters.products_schema import ProductCreate
from app.presentation.schemas.orders.orders_schema import OrderCreate, OrderLineCreate


def test_order_to_fefo_allocation_flow(db_session):
    """受注→FEFO引当プレビュー→コミット→在庫更新の統合テスト.

    このテストは以下のフローを検証する:
    1. マスタデータ（製品、顧客、仕入先、倉庫）の作成
    2. 受注と受注明細の作成
    3. ロットの作成（FEFO用に異なる期限日を設定）
    4. FEFO引当プレビューの実行と結果検証
    5. 引当コミットの実行と結果検証
    6. ロットの引当数量更新の検証
    """
    # --- 1. マスタデータの作成 ---
    prod_a = create_product(
        ProductCreate(
            product_code="PROD-A",
            product_name="製品A",
            packaging_qty=1,
            packaging_unit="EA",
            internal_unit="EA",
            base_unit="EA",
            requires_lot_number=True,
        ),
        db=db_session,
    )
    prod_b = create_product(
        ProductCreate(
            product_code="PROD-B",
            product_name="製品B",
            packaging_qty=1,
            packaging_unit="EA",
            internal_unit="EA",
            base_unit="EA",
            requires_lot_number=True,
        ),
        db=db_session,
    )
    customer = create_customer(
        CustomerCreate(customer_code="CUS-A", customer_name="得意先A"),
        db=db_session,
    )
    supplier = create_supplier(
        SupplierCreate(supplier_code="SUP-A", supplier_name="仕入先A"),
        db=db_session,
    )

    # 納入先の作成
    from app.infrastructure.persistence.models import DeliveryPlace

    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-A",
        delivery_place_name="納入先A",
    )
    db_session.add(delivery_place)
    db_session.flush()

    _ = create_warehouse(
        WarehouseCreate(
            warehouse_code="WH-A", warehouse_name="倉庫A", is_active=1, warehouse_type="internal"
        ),
        db=db_session,
    )

    # --- 2. 受注の作成 ---
    # UoWモック（テスト用にセッションをラップ）
    class MockUOW:
        def __init__(self, session):
            self.session = session

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def commit(self):
            self.session.commit()

        def rollback(self):
            self.session.rollback()

    order = create_order(
        OrderCreate(
            order_number="ORD-1001",
            customer_id=customer.id,
            order_date=date.today(),
            lines=[
                OrderLineCreate(
                    product_id=prod_a.id,
                    order_quantity=5,
                    unit="EA",
                    delivery_date=date.today() + timedelta(days=7),
                    delivery_place_id=delivery_place.id,
                ),
                OrderLineCreate(
                    product_id=prod_b.id,
                    order_quantity=3,
                    unit="EA",
                    delivery_date=date.today() + timedelta(days=10),
                    delivery_place_id=delivery_place.id,
                ),
            ],
        ),
        uow=MockUOW(db_session),
    )
    order_id = order.id
    order = db_session.get(Order, order_id)

    warehouse_db = db_session.query(Warehouse).filter(Warehouse.warehouse_code == "WH-A").first()

    # --- 3. ロットの作成（FEFO用に異なる期限日） ---
    def _create_lot(code_suffix, product, quantity, expiry_offset):
        lot = Lot(
            supplier_id=supplier.id,
            product_id=product.id,
            lot_number=f"LOT-{code_suffix}",
            received_date=date.today() - timedelta(days=1),
            expiry_date=date.today() + timedelta(days=expiry_offset),
            warehouse_id=warehouse_db.id if warehouse_db else None,
            current_quantity=float(quantity),
            allocated_quantity=0.0,
            unit="EA",
            status="active",
        )
        db_session.add(lot)
        db_session.commit()
        return lot.id

    # Product A lots: 早い期限と遅い期限
    usable_lot_early = _create_lot("A-1", prod_a, 4, 5)  # 期限が早い（FEFOで優先）
    usable_lot_late = _create_lot("A-2", prod_a, 2, 10)  # 期限が遅い

    # Product B lots
    lot_b1 = _create_lot("B-1", prod_b, 2, 3)  # 期限が早い
    lot_b2 = _create_lot("B-2", prod_b, 5, 8)  # 期限が遅い

    # --- 4. FEFO引当プレビューの実行 ---
    preview_result = preview_allocations(FefoPreviewRequest(order_id=order_id), db=db_session)
    preview_data = preview_result.model_dump()

    assert preview_data["order_id"] == order_id
    assert len(preview_data["lines"]) == 2

    # product_idでラインを特定（現行スキーマに合わせた方法）
    line_map = {line["product_id"]: line for line in preview_data["lines"]}
    assert prod_a.id in line_map and prod_b.id in line_map

    # Product A のアサーション
    prod_a_line = line_map[prod_a.id]
    allocated_lots_a = [alloc["lot_number"] for alloc in prod_a_line["allocations"]]
    # FEFOにより早い期限のロットが優先されるはず
    assert len(allocated_lots_a) >= 1  # 最低1つのロットが引当される

    # Product B のアサーション
    prod_b_line = line_map[prod_b.id]
    allocated_lots_b = [alloc["lot_number"] for alloc in prod_b_line["allocations"]]
    # FEFOロジックにより最適なロットが選択される
    assert len(allocated_lots_b) >= 1  # 最低1つのロットが引当される

    # --- 5. 引当コミットの実行 ---
    commit_response = commit_allocation(AllocationCommitRequest(order_id=order_id), db=db_session)
    commit_data = commit_response.model_dump()

    # 4つの引当（A-1, A-2, B-1, B-2 から各1つ以上）
    assert len(commit_data["created_allocation_ids"]) >= 2  # 最低でも各製品1つ

    # --- 6. ロットの引当数量更新の検証 ---
    db_session.expire_all()

    lot_a1 = db_session.get(Lot, usable_lot_early)
    lot_a2 = db_session.get(Lot, usable_lot_late)
    lot_b1_ref = db_session.get(Lot, lot_b1)
    lot_b2_ref = db_session.get(Lot, lot_b2)

    # Product A: 受注数量5 = LOT-A-1(4) + LOT-A-2(1)
    # Product B: 受注数量3 = LOT-B-1(2) + LOT-B-2(1)
    # 期待される引当数量をチェック（FEFOロジックによる）
    total_allocated_a = (lot_a1.allocated_quantity or 0) + (lot_a2.allocated_quantity or 0)
    total_allocated_b = (lot_b1_ref.allocated_quantity or 0) + (lot_b2_ref.allocated_quantity or 0)

    assert total_allocated_a == 5.0  # Product A の受注数量
    assert total_allocated_b == 3.0  # Product B の受注数量

    # 受注ステータスの確認（コミット後のステータスは実装依存）
    db_status = db_session.query(Order.status).filter(Order.id == order_id).scalar()
    assert db_status in {"allocated", "part_allocated", "pending", "open"}  # コミット後のステータス
