"""SAP Gateway interface for allocation registration.

This module defines the interface for SAP integration.
CONFIRMED status requires successful SAP registration.

Design:
- SapGateway is a Protocol (interface)
- MockSapGateway is used for development/testing
- Real implementation will integrate with SAP system
"""

from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Protocol

from app.core.time_utils import utcnow


if TYPE_CHECKING:
    from app.infrastructure.persistence.models.lot_reservations_model import LotReservation


@dataclass
class SapRegistrationResult:
    """Result of SAP registration attempt.

    Attributes:
        success: Whether registration succeeded
        document_no: SAP document number (if success)
        registered_at: Registration timestamp (if success)
        error_message: Error message (if failure)
    """

    success: bool
    document_no: str | None = None
    registered_at: datetime | None = None
    error_message: str | None = None


class SapGateway(Protocol):
    """Protocol for SAP gateway implementations.

    Any class implementing this protocol can be used for SAP integration.
    """

    def register_allocation(self, reservation: "LotReservation") -> SapRegistrationResult:
        """Register allocation in SAP system.

        Args:
            reservation: LotReservation to register

        Returns:
            SapRegistrationResult with success/failure and document info
        """
        ...


class MockSapGateway:
    """Mock SAP gateway for development and testing.

    Always returns success with a generated document number.
    """

    def register_allocation(self, reservation: "LotReservation") -> SapRegistrationResult:
        """Mock SAP registration - always succeeds.

        Args:
            reservation: LotReservation to register

        Returns:
            Successful SapRegistrationResult with mock document number
        """
        now = utcnow()
        document_no = f"SAP-{now.strftime('%Y%m%d')}-{reservation.id:06d}"

        return SapRegistrationResult(
            success=True,
            document_no=document_no,
            registered_at=now,
            error_message=None,
        )


class FailingSapGateway:
    """SAP gateway that always fails (for testing error handling)."""

    def register_allocation(self, reservation: "LotReservation") -> SapRegistrationResult:
        """Always fails SAP registration.

        Args:
            reservation: LotReservation to register

        Returns:
            Failed SapRegistrationResult
        """
        return SapRegistrationResult(
            success=False,
            document_no=None,
            registered_at=None,
            error_message="SAP system unavailable (mock failure)",
        )


# Default gateway instance (can be overridden in DI container)
_default_gateway: SapGateway | None = None


def get_sap_gateway() -> SapGateway:
    """Get the configured SAP gateway instance.

    Returns:
        SapGateway instance (MockSapGateway by default)
    """
    global _default_gateway
    if _default_gateway is None:
        _default_gateway = MockSapGateway()
    return _default_gateway


def set_sap_gateway(gateway: SapGateway) -> None:
    """Set the SAP gateway instance (for testing/configuration).

    Args:
        gateway: SapGateway implementation to use
    """
    global _default_gateway
    _default_gateway = gateway
