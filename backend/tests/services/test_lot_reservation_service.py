# backend/tests/services/test_lot_reservation_service.py
"""
LotReservationService のテスト

Step1: lot_reservations テーブル新設と雛形実装の検証
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.application.services.inventory.lot_reservation_service import (
    LotReservationService,
    ReservationInsufficientStockError,
    ReservationLotNotFoundError,
    ReservationNotFoundError,
)
from app.infrastructure.persistence.models import (
    Lot,
    Product,
    ReservationSourceType,
    ReservationStatus,
    Supplier,
    Warehouse,
)


@pytest.fixture
def setup_reservation_test_data(db_session: Session):
    """予約テスト用の基本データをセットアップ"""
    # テストデータを作成
    warehouse = Warehouse(
        warehouse_code="W-RSV-TEST",
        warehouse_name="Reservation Test Warehouse",
        warehouse_type="internal",
    )
    supplier = Supplier(
        supplier_code="S-RSV-TEST",
        supplier_name="Reservation Test Supplier",
    )
    product = Product(
        maker_part_code="P-RSV-TEST",
        product_name="Reservation Test Product",
        internal_unit="EA",
        base_unit="EA",
    )
    db_session.add_all([warehouse, supplier, product])
    db_session.flush()

    # ロットを作成（在庫100）
    lot = Lot(
        supplier_id=supplier.id,
        product_id=product.id,
        lot_number="LOT-RSV-001",
        warehouse_id=warehouse.id,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=30),
        unit="EA",
        current_quantity=Decimal("100"),
        origin_type="order",
    )
    db_session.add(lot)
    db_session.flush()

    return {
        "warehouse": warehouse,
        "supplier": supplier,
        "product": product,
        "lot": lot,
    }


class TestLotReservationServiceReserve:
    """reserve() メソッドのテスト"""

    def test_reserve_creates_reservation(self, db_session: Session, setup_reservation_test_data):
        """予約が正常に作成されることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=123,
            quantity=Decimal("10"),
        )

        assert reservation.id is not None
        assert reservation.lot_id == lot.id
        assert reservation.source_type == "order"
        assert reservation.source_id == 123
        assert reservation.reserved_qty == Decimal("10")
        assert reservation.status == "active"
        assert reservation.created_at is not None

    def test_reserve_with_string_source_type(
        self, db_session: Session, setup_reservation_test_data
    ):
        """文字列でsource_typeを指定した場合も動作することを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        reservation = service.reserve(
            lot_id=lot.id,
            source_type="forecast",
            source_id=456,
            quantity=Decimal("20"),
        )

        assert reservation.source_type == "forecast"

    def test_reserve_with_confirmed_status(self, db_session: Session, setup_reservation_test_data):
        """確定ステータスで予約した場合、confirmed_atが設定されることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=789,
            quantity=Decimal("15"),
            status=ReservationStatus.CONFIRMED,
        )

        assert reservation.status == "confirmed"
        assert reservation.confirmed_at is not None

    def test_reserve_insufficient_stock_raises_error(
        self, db_session: Session, setup_reservation_test_data
    ):
        """在庫不足の場合、ReservationInsufficientStockErrorが発生することを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        with pytest.raises(ReservationInsufficientStockError) as exc_info:
            service.reserve(
                lot_id=lot.id,
                source_type=ReservationSourceType.ORDER,
                source_id=100,
                quantity=Decimal("150"),  # 在庫100に対して150を予約
            )

        assert exc_info.value.lot_id == lot.id
        assert exc_info.value.requested == Decimal("150")

    def test_reserve_considers_existing_reservations(
        self, db_session: Session, setup_reservation_test_data
    ):
        """既存の予約を考慮して利用可能在庫をチェックすることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 最初の予約（80）
        service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("80"),
        )
        db_session.flush()

        # 2番目の予約（30）は在庫不足で失敗するはず
        with pytest.raises(ReservationInsufficientStockError):
            service.reserve(
                lot_id=lot.id,
                source_type=ReservationSourceType.ORDER,
                source_id=2,
                quantity=Decimal("30"),
            )

    def test_reserve_lot_not_found_raises_error(self, db_session: Session):
        """存在しないロットIDを指定した場合、ReservationLotNotFoundErrorが発生することを確認"""
        service = LotReservationService(db_session)

        with pytest.raises(ReservationLotNotFoundError) as exc_info:
            service.reserve(
                lot_id=99999,
                source_type=ReservationSourceType.ORDER,
                source_id=1,
                quantity=Decimal("10"),
            )

        assert exc_info.value.lot_id == 99999

    def test_reserve_zero_quantity_raises_error(
        self, db_session: Session, setup_reservation_test_data
    ):
        """数量が0の場合、ValueErrorが発生することを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        with pytest.raises(ValueError) as exc_info:
            service.reserve(
                lot_id=lot.id,
                source_type=ReservationSourceType.ORDER,
                source_id=1,
                quantity=Decimal("0"),
            )

        assert "positive" in str(exc_info.value).lower()

    def test_reserve_negative_quantity_raises_error(
        self, db_session: Session, setup_reservation_test_data
    ):
        """数量がマイナスの場合、ValueErrorが発生することを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        with pytest.raises(ValueError):
            service.reserve(
                lot_id=lot.id,
                source_type=ReservationSourceType.ORDER,
                source_id=1,
                quantity=Decimal("-10"),
            )


class TestLotReservationServiceRelease:
    """release() メソッドのテスト"""

    def test_release_updates_status(self, db_session: Session, setup_reservation_test_data):
        """予約をリリースするとステータスがreleasedになることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("10"),
        )
        db_session.flush()

        # リリース
        service.release(reservation.id)
        db_session.flush()

        # ステータス確認
        updated = service.get_by_id(reservation.id)
        assert updated is not None
        assert updated.status == "released"
        assert updated.released_at is not None

    def test_release_not_found_raises_error(self, db_session: Session):
        """存在しない予約IDを指定した場合、ReservationNotFoundErrorが発生することを確認"""
        service = LotReservationService(db_session)

        with pytest.raises(ReservationNotFoundError) as exc_info:
            service.release(99999)

        assert exc_info.value.reservation_id == 99999

    def test_release_frees_up_stock(self, db_session: Session, setup_reservation_test_data):
        """リリース後に在庫が利用可能になることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成（80）
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("80"),
        )
        db_session.flush()

        # 利用可能在庫は20のはず
        assert service.get_available_quantity(lot.id) == Decimal("20")

        # リリース
        service.release(reservation.id)
        db_session.flush()

        # 利用可能在庫は100に戻る
        assert service.get_available_quantity(lot.id) == Decimal("100")


class TestLotReservationServiceConfirm:
    """confirm() メソッドのテスト"""

    def test_confirm_updates_status(self, db_session: Session, setup_reservation_test_data):
        """予約を確定するとステータスがconfirmedになることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成（activeステータス）
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("10"),
            status=ReservationStatus.ACTIVE,
        )
        db_session.flush()

        # 確定
        confirmed = service.confirm(reservation.id)
        db_session.flush()

        assert confirmed.status == "confirmed"
        assert confirmed.confirmed_at is not None


class TestLotReservationServiceListByLot:
    """list_by_lot() メソッドのテスト"""

    def test_list_by_lot_returns_active_reservations(
        self, db_session: Session, setup_reservation_test_data
    ):
        """アクティブな予約のみ返されることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # アクティブな予約を作成
        reservation1 = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("10"),
        )
        reservation2 = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.FORECAST,
            source_id=2,
            quantity=Decimal("20"),
        )
        db_session.flush()

        # 1つをリリース
        service.release(reservation1.id)
        db_session.flush()

        # アクティブのみ取得
        reservations = service.list_by_lot(lot.id, active_only=True)

        assert len(reservations) == 1
        assert reservations[0].id == reservation2.id

    def test_list_by_lot_returns_all_reservations(
        self, db_session: Session, setup_reservation_test_data
    ):
        """active_only=Falseの場合、すべての予約が返されることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成
        reservation1 = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("10"),
        )
        _reservation2 = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.FORECAST,
            source_id=2,
            quantity=Decimal("20"),
        )
        db_session.flush()

        # 1つをリリース
        service.release(reservation1.id)
        db_session.flush()

        # すべて取得
        reservations = service.list_by_lot(lot.id, active_only=False)

        assert len(reservations) == 2


class TestLotReservationServiceListBySource:
    """list_by_source() メソッドのテスト"""

    def test_list_by_source_returns_matching_reservations(
        self, db_session: Session, setup_reservation_test_data
    ):
        """ソース別に予約が取得できることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 異なるソースで予約を作成
        service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=100,
            quantity=Decimal("10"),
        )
        service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=200,
            quantity=Decimal("20"),
        )
        service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.FORECAST,
            source_id=100,
            quantity=Decimal("15"),
        )
        db_session.flush()

        # source_type=order, source_id=100 で取得
        reservations = service.list_by_source(
            source_type=ReservationSourceType.ORDER,
            source_id=100,
        )

        assert len(reservations) == 1
        assert reservations[0].source_type == "order"
        assert reservations[0].source_id == 100


class TestLotReservationServiceGetReservedQuantity:
    """get_reserved_quantity() メソッドのテスト"""

    def test_get_reserved_quantity_sums_active_reservations(
        self, db_session: Session, setup_reservation_test_data
    ):
        """アクティブな予約の合計が返されることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成
        r1 = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("10"),
        )
        service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=2,
            quantity=Decimal("25"),
        )
        db_session.flush()

        # 予約合計は35
        assert service.get_reserved_quantity(lot.id) == Decimal("35")

        # 1つをリリース
        service.release(r1.id)
        db_session.flush()

        # 予約合計は25に減少
        assert service.get_reserved_quantity(lot.id) == Decimal("25")

    def test_get_reserved_quantity_excludes_released(
        self, db_session: Session, setup_reservation_test_data
    ):
        """リリース済みの予約は合計に含まれないことを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成してリリース
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("50"),
        )
        db_session.flush()
        service.release(reservation.id)
        db_session.flush()

        # 予約合計は0
        assert service.get_reserved_quantity(lot.id) == Decimal("0")


class TestLotReservationServiceUpdateQuantity:
    """update_quantity() メソッドのテスト"""

    def test_update_quantity_increases(self, db_session: Session, setup_reservation_test_data):
        """予約数量を増やせることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("10"),
        )
        db_session.flush()

        # 数量を更新
        updated = service.update_quantity(reservation.id, Decimal("30"))

        assert updated.reserved_qty == Decimal("30")

    def test_update_quantity_decreases(self, db_session: Session, setup_reservation_test_data):
        """予約数量を減らせることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("50"),
        )
        db_session.flush()

        # 数量を更新
        updated = service.update_quantity(reservation.id, Decimal("20"))

        assert updated.reserved_qty == Decimal("20")

    def test_update_quantity_insufficient_stock_raises_error(
        self, db_session: Session, setup_reservation_test_data
    ):
        """在庫不足になる増加は失敗することを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.ORDER,
            source_id=1,
            quantity=Decimal("90"),
        )
        db_session.flush()

        # 在庫不足になる更新（100以上に）
        with pytest.raises(ReservationInsufficientStockError):
            service.update_quantity(reservation.id, Decimal("110"))


class TestLotReservationServiceTransfer:
    """transfer_reservation() メソッドのテスト"""

    def test_transfer_updates_source(self, db_session: Session, setup_reservation_test_data):
        """予約の転送が正しくsource_type/idを更新することを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # Forecast予約を作成
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.FORECAST,
            source_id=101,
            quantity=Decimal("50"),
        )
        db_session.flush()

        # Orderへ転送
        transferred = service.transfer_reservation(
            reservation_id=reservation.id,
            new_source_type=ReservationSourceType.ORDER,
            new_source_id=202,
        )
        db_session.flush()

        assert transferred.id == reservation.id
        assert transferred.source_type == "order"
        assert transferred.source_id == 202
        assert transferred.status == "active"  # ステータス維持

    def test_transfer_with_status_update(self, db_session: Session, setup_reservation_test_data):
        """転送と同時にステータスを変更できることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # Forecast予約を作成
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.FORECAST,
            source_id=101,
            quantity=Decimal("50"),
        )
        db_session.flush()

        # Orderへ転送して確定
        transferred = service.transfer_reservation(
            reservation_id=reservation.id,
            new_source_type=ReservationSourceType.ORDER,
            new_source_id=202,
            new_status=ReservationStatus.CONFIRMED,
        )
        db_session.flush()

        assert transferred.source_type == "order"
        assert transferred.status == "confirmed"
        assert transferred.confirmed_at is not None

    def test_transfer_released_reservation_raises_error(
        self, db_session: Session, setup_reservation_test_data
    ):
        """リリース済みの予約は転送できないことを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        # 予約を作成してリリース
        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.FORECAST,
            source_id=101,
            quantity=Decimal("50"),
        )
        service.release(reservation.id)
        db_session.flush()

        with pytest.raises(ValueError) as exc_info:
            service.transfer_reservation(
                reservation_id=reservation.id,
                new_source_type=ReservationSourceType.ORDER,
                new_source_id=202,
            )

        assert "released" in str(exc_info.value).lower()

    def test_transfer_updates_updated_at(self, db_session: Session, setup_reservation_test_data):
        """転送時にupdated_atが更新されることを確認"""
        data = setup_reservation_test_data
        lot = data["lot"]
        service = LotReservationService(db_session)

        reservation = service.reserve(
            lot_id=lot.id,
            source_type=ReservationSourceType.FORECAST,
            source_id=101,
            quantity=Decimal("50"),
        )
        db_session.flush()

        transferred = service.transfer_reservation(
            reservation_id=reservation.id,
            new_source_type=ReservationSourceType.ORDER,
            new_source_id=202,
        )
        db_session.flush()

        assert transferred.updated_at is not None
