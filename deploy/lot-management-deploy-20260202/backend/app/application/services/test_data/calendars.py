from datetime import date

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.calendar_models import HolidayCalendar


def generate_calendars(db: Session, options: object = None):
    """Generate holiday calendar data for 2024-2026."""
    # Simple list of Japanese holidays (Approximate for testing)
    holidays_2024 = [
        date(2024, 1, 1),
        date(2024, 1, 8),
        date(2024, 2, 11),
        date(2024, 2, 12),
        date(2024, 2, 23),
        date(2024, 3, 20),
        date(2024, 4, 29),
        date(2024, 5, 3),
        date(2024, 5, 4),
        date(2024, 5, 5),
        date(2024, 5, 6),
        date(2024, 7, 15),
        date(2024, 8, 11),
        date(2024, 8, 12),
        date(2024, 9, 16),
        date(2024, 9, 22),
        date(2024, 9, 23),
        date(2024, 10, 14),
        date(2024, 11, 3),
        date(2024, 11, 4),
        date(2024, 11, 23),
    ]

    holidays_2025 = [
        date(2025, 1, 1),
        date(2025, 1, 13),
        date(2025, 2, 11),
        date(2025, 2, 23),
        date(2025, 2, 24),
        date(2025, 3, 20),
        date(2025, 4, 29),
        date(2025, 5, 3),
        date(2025, 5, 4),
        date(2025, 5, 5),
        date(2025, 5, 6),
        date(2025, 7, 21),
        date(2025, 8, 11),
        date(2025, 9, 15),
        date(2025, 9, 23),
        date(2025, 10, 13),
        date(2025, 11, 3),
        date(2025, 11, 23),
        date(2025, 11, 24),
    ]

    holidays_2026 = [
        date(2026, 1, 1),
        date(2026, 1, 12),
        date(2026, 2, 11),
        date(2026, 2, 23),
        date(2026, 3, 21),
        date(2026, 4, 29),
        date(2026, 5, 3),
        date(2026, 5, 4),
        date(2026, 5, 5),
        date(2026, 5, 6),
        date(2026, 7, 20),
        date(2026, 8, 11),
        date(2026, 9, 21),
        date(2026, 9, 22),
        date(2026, 9, 23),
        date(2026, 10, 12),
        date(2026, 11, 3),
        date(2026, 11, 23),
    ]

    all_holidays = holidays_2024 + holidays_2025 + holidays_2026

    # Bulk insert if empty
    existing_count = db.query(HolidayCalendar).count()
    if existing_count == 0:
        objects = [HolidayCalendar(holiday_date=h, holiday_name="Holiday") for h in all_holidays]
        db.add_all(objects)
        db.flush()
        print(f"[INFO] Generated {len(objects)} holiday records.")
