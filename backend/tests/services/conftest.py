import pytest
from datetime import date, timedelta
from app.models import Product, Customer, DeliveryPlace, Warehouse, Supplier
from app.models.auth_models import User

@pytest.fixture
def service_master_data(master_data):
    """Alias for master_data fixture."""
    return master_data
