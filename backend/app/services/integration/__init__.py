"""Integration services subpackage."""

from app.services.integration.submissions_service import process_external_submission


__all__ = [
    "process_external_submission",
]
