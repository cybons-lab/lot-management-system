from decimal import Decimal

import pytest


class DummyProduct:
    def __init__(self, packaging_unit: str, packaging_qty: Decimal, internal_unit: str = "EA"):
        self.packaging_unit = packaging_unit
        self.packaging_qty = packaging_qty
        self.internal_unit = internal_unit


pytest.skip("Refactoring required for async/db dependency", allow_module_level=True)
