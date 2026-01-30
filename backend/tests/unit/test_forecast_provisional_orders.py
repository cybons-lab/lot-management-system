from datetime import date
from decimal import Decimal

from app.application.services.forecasts.forecast_service import ForecastService
from app.infrastructure.persistence.models.forecast_models import ForecastCurrent
from app.infrastructure.persistence.models.orders_models import Order, OrderLine


def _build_forecast(master_data):
    return ForecastCurrent(
        customer_id=master_data["customer"].id,
        delivery_place_id=master_data["delivery_place"].id,
        product_group_id=master_data["product1"].id,
        forecast_date=date(2026, 1, 15),
        forecast_quantity=Decimal("10.0"),
        unit="EA",
        forecast_period="2026-01",
    )


def test_build_forecast_reference(master_data, db):
    service = ForecastService(db)
    forecast = _build_forecast(master_data)

    reference = service._build_forecast_reference(forecast)

    assert reference == (
        f"FC-{master_data['customer'].id}-"
        f"{master_data['delivery_place'].id}-"
        f"{master_data['product1'].id}-{forecast.forecast_date}"
    )


def test_create_provisional_order_creates_order_line(master_data, db):
    service = ForecastService(db)
    forecast = _build_forecast(master_data)

    service._create_provisional_order(forecast)

    reference = service._build_forecast_reference(forecast)
    order_lines = db.query(OrderLine).filter(OrderLine.forecast_reference == reference).all()

    assert len(order_lines) == 1

    order_line = order_lines[0]
    assert order_line.order_type == "FORECAST_LINKED"

    order = db.query(Order).filter(Order.id == order_line.order_id).first()
    assert order is not None

    service._create_provisional_order(forecast)

    order_lines_after = db.query(OrderLine).filter(OrderLine.forecast_reference == reference).all()
    assert len(order_lines_after) == 1
