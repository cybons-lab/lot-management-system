"""
Route endpoint resolution tests.

These tests verify that FastAPI correctly resolves routes,
especially when there are potential conflicts between dynamic path parameters
and specific static routes (e.g., /{customer_id} vs /export/download).

Background:
- FastAPI matches routes in order of definition
- If /{customer_id} is defined before /export/download, "export" gets matched as customer_id
- This causes 422 Unprocessable Entity or incorrect behavior
"""


class TestCustomerItemsExportRoute:
    """Test that /export/download route is correctly matched for customer-items."""

    def test_export_download_returns_file_not_422(self, client):
        """
        Ensure /export/download route is matched before /{customer_id}.

        If this test fails with 422 Unprocessable Entity, it means:
        - /{customer_id} route was matched instead of /export/download
        - FastAPI is trying to parse "export" as an integer (customer_id)

        Fix: Define /export/download BEFORE /{customer_id} in the router.
        """
        response = client.get("/api/masters/customer-items/export/download?format=xlsx")

        # Should return 200 (with file) or 401 (auth required), NOT 422
        assert response.status_code != 422, (
            "Got 422 Unprocessable Entity - "
            "This likely means /export/download route is defined AFTER /{customer_id}, "
            "causing 'export' to be matched as customer_id path parameter"
        )

        # We expect either 200 (success) or 401 (auth required)
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"


class TestProductMappingsExportRoute:
    """Test that /export/download route is correctly matched for product-mappings."""

    def test_export_download_returns_file_not_422(self, client):
        """Ensure /export/download route is correctly resolved."""
        response = client.get("/api/masters/product-mappings/export/download?format=xlsx")

        assert response.status_code != 422, (
            "Got 422 - Route order issue. /export/download must be defined before /{id}"
        )
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"


class TestSupplierProductsExportRoute:
    """Test that /export/download route is correctly matched for supplier-products."""

    def test_export_download_returns_file_not_422(self, client):
        """Ensure /export/download route is correctly resolved."""
        response = client.get("/api/masters/supplier-products/export/download?format=xlsx")

        assert response.status_code != 422, (
            "Got 422 - Route order issue. /export/download must be defined before /{id}"
        )
        assert response.status_code in [200, 401], f"Unexpected status: {response.status_code}"
