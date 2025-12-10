import pytest

from app.infrastructure.persistence.models import (
    Customer,
    DeliveryPlace,
    Product,
)


@pytest.fixture
def setup_forecast_data(db_session):
    # Master Data
    product = Product(
        maker_part_code="PRD-FCST-001",
        product_name="Test Product Forecast",
        base_unit="EA",
    )
    db_session.add(product)

    customer = Customer(
        customer_code="CUST-FCST",
        customer_name="Test Customer Forecast",
    )
    db_session.add(customer)
    db_session.flush()

    delivery_place = DeliveryPlace(
        customer_id=customer.id,
        delivery_place_code="DP-FCST",
        delivery_place_name="Test DP Forecast",
        jiku_code="JK-FCST",
    )
    db_session.add(delivery_place)
    db_session.commit()

    return {
        "product": product,
        "customer": customer,
        "delivery_place": delivery_place,
    }


def test_import_forecasts(client, setup_forecast_data):
    """Test POST /api/v2/forecast/import"""
    customer = setup_forecast_data["customer"]
    delivery_place = setup_forecast_data["delivery_place"]
    product = setup_forecast_data["product"]

    payload = {
        "replace_existing": True,
        "items": [
            {
                "customer_code": customer.customer_code,
                "delivery_place_code": delivery_place.delivery_place_code,
                "product_code": product.maker_part_code,
                "forecast_date": "2025-12-01",
                "forecast_quantity": 100.0,
                "unit": "EA",
                "forecast_period": "2025-12",
            },
            {
                "customer_code": customer.customer_code,
                "delivery_place_code": delivery_place.delivery_place_code,
                "product_code": product.maker_part_code,
                "forecast_date": "2025-12-08",
                "forecast_quantity": 120.0,
                "unit": "EA",
                "forecast_period": "2025-12",
            },
        ],
    }

    response = client.post("/api/v2/forecast/import", json=payload)
    if response.status_code != 200:
        print(response.json())

    assert response.status_code == 200
    data = response.json()
    assert data["imported_count"] == 2
    assert len(data["errors"]) == 0


def test_list_forecasts(client, setup_forecast_data):
    """Test GET /api/v2/forecast/"""
    # Import first
    test_import_forecasts(client, setup_forecast_data)

    response = client.get("/api/v2/forecast/")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) >= 1

    # ForecastListResponse is ListResponse[ForecastGroupResponse]
    # item is ForecastGroupResponse
    group = data["items"][0]
    assert "group_key" in group
    assert group["group_key"]["customer_code"] == "CUST-FCST"
    assert len(group["forecasts"]) >= 1
