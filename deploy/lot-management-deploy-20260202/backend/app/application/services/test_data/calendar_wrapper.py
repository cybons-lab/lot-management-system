from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.calendar_models import (
    CompanyCalendar,
    HolidayCalendar,
)


class TestDataCalendar:
    """Helper to check business days mainly for test data generation.

    Caches calendar data in memory to avoid repeated DB queries.
    """

    def __init__(self, db: Session):
        self.db = db
        self.reload()

    def reload(self):
        """Load calendar data from DB."""
        self.holidays: set[date] = {h.holiday_date for h in self.db.query(HolidayCalendar).all()}
        self.company_overrides: dict[date, bool] = {
            c.calendar_date: c.is_workday for c in self.db.query(CompanyCalendar).all()
        }

    def is_business_day(self, target_date: date) -> bool:
        """Check if date is a business day."""
        # Check company overrides first
        override = self.company_overrides.get(target_date)
        if override is not None:
            return override

        # Check weekend (Sat=5, Sun=6)
        if target_date.weekday() >= 5:
            return False

        # Check holidays
        if target_date in self.holidays:
            return False

        return True

    def get_business_day_after(self, target_date: date) -> date:
        """Get the next business day (including target_date if it is one)."""
        current = target_date
        # Safety limit to avoid infinite loop
        for _ in range(365):
            if self.is_business_day(current):
                return current
            current += timedelta(days=1)
        return current

    def get_business_day_before(self, target_date: date) -> date:
        """Get the previous business day (including target_date if it is one)."""
        current = target_date
        for _ in range(365):
            if self.is_business_day(current):
                return current
            current -= timedelta(days=1)
        return current

    def adjust_date(self, target_date: date, forward: bool = True) -> date:
        """Adjust date to nearest business day."""
        if forward:
            return self.get_business_day_after(target_date)
        return self.get_business_day_before(target_date)
