"""Integration tests for test data generation.

Validates that all test data generators can execute without errors
against the actual database schema, catching model-DB mismatches early.
"""

import pytest
from sqlalchemy.orm import Session

from app.application.services.test_data.orchestrator import GenerateOptions
from app.application.services.test_data_generator import generate_all_test_data


class TestTestDataGeneration:
    """Test that test data generation completes without errors."""

    @pytest.mark.skip_n_plus_one
    def test_generate_all_test_data_quick_preset(self, db: Session) -> None:
        """Quick preset should generate all test data without schema errors.

        This test catches model-DB column mismatches (e.g. using a column
        name that exists in the model but not in the actual DB table).

        Note: N+1 detection is disabled because test data generators
        intentionally do many individual inserts.
        """
        options = GenerateOptions(
            preset_id="quick",
            scale="small",
            mode="strict",
            history_months=3,
        )
        result = generate_all_test_data(db, options=options)
        assert result is True
