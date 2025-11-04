from decimal import Decimal

import pytest

from app.services.quantity import QuantityConversionError, to_internal_qty


class DummyProduct:
    def __init__(self, packaging_unit: str, packaging_qty: Decimal, internal_unit: str = "EA"):
        self.packaging_unit = packaging_unit
        self.packaging_qty = packaging_qty
        self.internal_unit = internal_unit


def test_to_internal_qty_rounds_up_for_box():
    product = DummyProduct(packaging_unit="箱", packaging_qty=Decimal("12"))
    result = to_internal_qty(product, qty_external=1, external_unit="箱")
    assert result == Decimal("1")


def test_to_internal_qty_rounds_up_for_can():
    product = DummyProduct(packaging_unit="缶", packaging_qty=Decimal("4"))
    result = to_internal_qty(product, qty_external=1, external_unit="缶")
    assert result == Decimal("1")


def test_to_internal_qty_half_up_for_ea():
    product = DummyProduct(packaging_unit="EA", packaging_qty=Decimal("1"))
    result = to_internal_qty(product, qty_external=Decimal("1.235"), external_unit="EA")
    assert result == Decimal("1.24")


def test_to_internal_qty_handles_zero():
    product = DummyProduct(packaging_unit="EA", packaging_qty=Decimal("2"))
    result = to_internal_qty(product, qty_external=0, external_unit="EA")
    assert result == Decimal("0.00")


def test_to_internal_qty_decimal_precision():
    product = DummyProduct(packaging_unit="EA", packaging_qty=Decimal("3"))
    result = to_internal_qty(product, qty_external=1, external_unit="EA")
    assert result == Decimal("0.33")


def test_to_internal_qty_negative_error():
    product = DummyProduct(packaging_unit="EA", packaging_qty=Decimal("1"))
    with pytest.raises(QuantityConversionError):
        to_internal_qty(product, qty_external=-1, external_unit="EA")


def test_to_internal_qty_zero_packaging_error():
    product = DummyProduct(packaging_unit="EA", packaging_qty=Decimal("0"))
    with pytest.raises(QuantityConversionError):
        to_internal_qty(product, qty_external=1, external_unit="EA")

