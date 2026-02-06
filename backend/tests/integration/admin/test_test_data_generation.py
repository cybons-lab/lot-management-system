"""Integration tests for test data generation.

Validates that all test data generators can execute without errors
against the actual database schema, catching model-DB mismatches early.
"""

from sqlalchemy.orm import Session

from app.application.services.test_data.orchestrator import GenerateOptions
from app.application.services.test_data_generator import generate_all_test_data


class TestTestDataGeneration:
    """Test that test data generation completes without errors."""

    def test_generate_all_test_data_quick_preset(self, db: Session) -> None:
        """Quick preset should generate all test data without schema errors.

        This test catches model-DB column mismatches (e.g. using a column
        name that exists in the model but not in the actual DB table).
        """
        options = GenerateOptions(
            preset_id="quick",
            scale="small",
            mode="strict",
            history_months=3,
        )
        result = generate_all_test_data(db, options=options)
        assert result is True
