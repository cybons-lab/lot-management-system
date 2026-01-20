"""Tests for OcrSapComplementService."""

import pytest

from app.application.services.ocr import MatchType, OcrSapComplementService
from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    Product,
)


class TestOcrSapComplementService:
    """Test cases for OCR→SAP complement search service."""

    @pytest.fixture
    def service(self, db_session):
        """Create service instance."""
        return OcrSapComplementService(db_session)

    @pytest.fixture
    def setup_test_data(self, db_session):
        """Setup test data for search tests."""
        # Create customer
        customer = Customer(
            customer_code="CUST001",
            customer_name="Test Customer",
        )
        db_session.add(customer)
        db_session.flush()

        # Create product
        product = Product(
            maker_part_code="PROD001",
            product_name="Test Product",
            base_unit="KG",
        )
        db_session.add(product)
        db_session.flush()

        # Create customer item
        customer_item = CustomerItem(
            customer_id=customer.id,
            customer_part_no="ABC-123",
            product_id=product.id,
            base_unit="KG",
        )
        db_session.add(customer_item)

        # Create another item for prefix match test
        customer_item_2 = CustomerItem(
            customer_id=customer.id,
            customer_part_no="XYZ-001-A",
            product_id=product.id,
            base_unit="KG",
        )
        db_session.add(customer_item_2)

        db_session.commit()

        return {
            "customer": customer,
            "product": product,
            "customer_item": customer_item,
            "customer_item_2": customer_item_2,
        }

    def test_exact_match_found(self, service, setup_test_data):
        """Test exact match returns correct result."""
        result = service.find_complement(
            customer_code="CUST001",
            jiku_code="J01",  # Not used in current implementation
            external_product_code="ABC-123",
        )

        assert result.match_type == MatchType.EXACT
        assert result.product_id == setup_test_data["product"].id
        assert result.customer_item is not None
        assert result.customer_item.customer_part_no == "ABC-123"

    def test_exact_match_not_found_fallback_to_prefix(self, service, setup_test_data):
        """Test prefix match when exact match fails."""
        result = service.find_complement(
            customer_code="CUST001",
            jiku_code="J01",
            external_product_code="XYZ-001",  # Will prefix match XYZ-001-A
        )

        assert result.match_type == MatchType.PREFIX
        assert result.product_id == setup_test_data["product"].id
        assert result.customer_item is not None
        assert result.customer_item.customer_part_no == "XYZ-001-A"
        assert "Prefix match" in (result.message or "")

    def test_no_match_found(self, service, setup_test_data):
        """Test no match returns NOT_FOUND."""
        result = service.find_complement(
            customer_code="CUST001",
            jiku_code="J01",
            external_product_code="NONEXISTENT",
        )

        assert result.match_type == MatchType.NOT_FOUND
        assert result.product_id is None
        assert result.customer_item is None

    def test_invalid_customer_code(self, service, setup_test_data):
        """Test invalid customer code returns NOT_FOUND."""
        result = service.find_complement(
            customer_code="INVALID",
            jiku_code="J01",
            external_product_code="ABC-123",
        )

        assert result.match_type == MatchType.NOT_FOUND
        assert "Customer not found" in (result.message or "")

    def test_resolve_product_id_shorthand(self, service, setup_test_data):
        """Test resolve_product_id returns tuple."""
        product_id, match_type, message = service.resolve_product_id(
            customer_code="CUST001",
            jiku_code="J01",
            external_product_code="ABC-123",
        )

        assert product_id == setup_test_data["product"].id
        assert match_type == MatchType.EXACT
