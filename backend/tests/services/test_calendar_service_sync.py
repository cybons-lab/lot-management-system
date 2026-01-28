from datetime import date
from unittest.mock import MagicMock, patch

from app.application.services.calendar_service import CalendarService
from app.infrastructure.persistence.models.calendar_models import HolidayCalendar


@patch("httpx.Client")
def test_sync_holidays_from_external(mock_client_class, db_session):
    # Mocking httpx response
    mock_client = MagicMock()
    mock_client_class.return_value.__enter__.return_value = mock_client

    mock_response = MagicMock()
    mock_response.content = "国民の祝日名,月日\r\n元日,2026/01/01\r\n成人の日,2026/01/12".encode(
        "cp932"
    )
    mock_response.status_code = 200
    mock_client.get.return_value = mock_response

    service = CalendarService(db_session)
    count = service.sync_holidays_from_external()

    assert count >= 2

    # Check if holidays were added to DB
    h1 = (
        db_session.query(HolidayCalendar)
        .filter(HolidayCalendar.holiday_date == date(2026, 1, 1))
        .first()
    )
    assert h1 is not None
    assert h1.holiday_name == "元日"


def test_import_holidays_from_tsv(db_session):
    service = CalendarService(db_session)
    tsv_data = "2026/02/11\t建国記念の日\n2026-02-23\t天皇誕生日"

    count = service.import_holidays_from_tsv(tsv_data)
    assert count == 2

    h1 = (
        db_session.query(HolidayCalendar)
        .filter(HolidayCalendar.holiday_date == date(2026, 2, 11))
        .first()
    )
    assert h1 is not None
    assert h1.holiday_name == "建国記念の日"

    h2 = (
        db_session.query(HolidayCalendar)
        .filter(HolidayCalendar.holiday_date == date(2026, 2, 23))
        .first()
    )
    assert h2 is not None
    assert h2.holiday_name == "天皇誕生日"
