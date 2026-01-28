import csv
import io
from datetime import date, datetime
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.calendar_models import (
    CompanyCalendar,
    HolidayCalendar,
    OriginalDeliveryCalendar,
)
from app.presentation.schemas.calendar.calendar_schemas import (
    BusinessDayCalculationRequest,
    CompanyCalendarCreate,
    CompanyCalendarUpdate,
    HolidayCalendarCreate,
    HolidayCalendarUpdate,
    OriginalDeliveryCalendarCreate,
    OriginalDeliveryCalendarUpdate,
)


class CalendarService:
    """Service for calendar-related operations."""

    def __init__(self, db: Session):
        self.db = db

    def list_holidays(self) -> list[HolidayCalendar]:
        return self.db.query(HolidayCalendar).order_by(HolidayCalendar.holiday_date.asc()).all()

    def create_holiday(self, payload: HolidayCalendarCreate) -> HolidayCalendar:
        existing = (
            self.db.query(HolidayCalendar)
            .filter(HolidayCalendar.holiday_date == payload.holiday_date)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="同じ祝日が既に登録されています",
            )
        holiday = HolidayCalendar(**payload.model_dump())
        self.db.add(holiday)
        self._commit_or_raise()
        self.db.refresh(holiday)
        return holiday

    def update_holiday(self, holiday_id: int, payload: HolidayCalendarUpdate) -> HolidayCalendar:
        holiday = self._get_or_404(HolidayCalendar, holiday_id, "祝日が見つかりません")
        if payload.holiday_date and payload.holiday_date != holiday.holiday_date:
            duplicate = (
                self.db.query(HolidayCalendar)
                .filter(HolidayCalendar.holiday_date == payload.holiday_date)
                .first()
            )
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="同じ祝日が既に登録されています",
                )
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(holiday, key, value)
        self._commit_or_raise()
        self.db.refresh(holiday)
        return holiday  # type: ignore

    def delete_holiday(self, holiday_id: int) -> None:
        holiday = self._get_or_404(HolidayCalendar, holiday_id, "祝日が見つかりません")
        self.db.delete(holiday)
        self._commit_or_raise()

    def list_company_calendar(self) -> list[CompanyCalendar]:
        return self.db.query(CompanyCalendar).order_by(CompanyCalendar.calendar_date.asc()).all()

    def create_company_calendar(self, payload: CompanyCalendarCreate) -> CompanyCalendar:
        existing = (
            self.db.query(CompanyCalendar)
            .filter(CompanyCalendar.calendar_date == payload.calendar_date)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="同じ日付が既に登録されています",
            )
        company_date = CompanyCalendar(**payload.model_dump())
        self.db.add(company_date)
        self._commit_or_raise()
        self.db.refresh(company_date)
        return company_date

    def update_company_calendar(
        self, company_calendar_id: int, payload: CompanyCalendarUpdate
    ) -> CompanyCalendar:
        company_date = self._get_or_404(
            CompanyCalendar, company_calendar_id, "会社カレンダーが見つかりません"
        )
        if payload.calendar_date and payload.calendar_date != company_date.calendar_date:
            duplicate = (
                self.db.query(CompanyCalendar)
                .filter(CompanyCalendar.calendar_date == payload.calendar_date)
                .first()
            )
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="同じ日付が既に登録されています",
                )
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(company_date, key, value)
        self._commit_or_raise()
        self.db.refresh(company_date)
        return company_date  # type: ignore

    def delete_company_calendar(self, company_calendar_id: int) -> None:
        company_date = self._get_or_404(
            CompanyCalendar, company_calendar_id, "会社カレンダーが見つかりません"
        )
        self.db.delete(company_date)
        self._commit_or_raise()

    def list_original_delivery_calendar(self) -> list[OriginalDeliveryCalendar]:
        return (
            self.db.query(OriginalDeliveryCalendar)
            .order_by(OriginalDeliveryCalendar.delivery_date.asc())
            .all()
        )

    def create_original_delivery_calendar(
        self, payload: OriginalDeliveryCalendarCreate
    ) -> OriginalDeliveryCalendar:
        existing = (
            self.db.query(OriginalDeliveryCalendar)
            .filter(OriginalDeliveryCalendar.delivery_date == payload.delivery_date)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="同じ配信日が既に登録されています",
            )
        delivery_date = OriginalDeliveryCalendar(**payload.model_dump())
        self.db.add(delivery_date)
        self._commit_or_raise()
        self.db.refresh(delivery_date)
        return delivery_date

    def update_original_delivery_calendar(
        self, delivery_calendar_id: int, payload: OriginalDeliveryCalendarUpdate
    ) -> OriginalDeliveryCalendar:
        delivery_date = self._get_or_404(
            OriginalDeliveryCalendar,
            delivery_calendar_id,
            "配信日が見つかりません",
        )
        if payload.delivery_date and payload.delivery_date != delivery_date.delivery_date:
            duplicate = (
                self.db.query(OriginalDeliveryCalendar)
                .filter(OriginalDeliveryCalendar.delivery_date == payload.delivery_date)
                .first()
            )
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="同じ配信日が既に登録されています",
                )
        for key, value in payload.model_dump(exclude_unset=True).items():
            setattr(delivery_date, key, value)
        self._commit_or_raise()
        self.db.refresh(delivery_date)
        return delivery_date  # type: ignore

    def delete_original_delivery_calendar(self, delivery_calendar_id: int) -> None:
        delivery_date = self._get_or_404(
            OriginalDeliveryCalendar, delivery_calendar_id, "配信日が見つかりません"
        )
        self.db.delete(delivery_date)
        self._commit_or_raise()

    def sync_holidays_from_external(self) -> int:
        """Sync holidays from Cabinet Office CSV."""
        url = "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv"
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url)
                response.raise_for_status()
                # 内閣府のCSVはShift-JIS
                content = response.content.decode("cp932")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"祝日データの取得に失敗しました: {e!s}",
            ) from e

        reader = csv.reader(io.StringIO(content))
        header = next(reader, None)  # ヘッダーを飛ばす: 国民の祝日名,月日
        if not header:
            return 0

        count = 0
        for row in reader:
            if len(row) < 2:
                continue
            name, date_str = row[0], row[1]
            try:
                # 形式: YYYY/M/D or YYYY/MM/DD
                holiday_date = datetime.strptime(date_str, "%Y/%m/%d").date()
            except ValueError:
                # 日付が左側にくるパターン（または不正な行）を考慮
                try:
                    holiday_date = datetime.strptime(name, "%Y/%m/%d").date()
                    name, date_str = date_str, name
                except ValueError:
                    continue

            existing = (
                self.db.query(HolidayCalendar)
                .filter(HolidayCalendar.holiday_date == holiday_date)
                .first()
            )
            if existing:
                existing.holiday_name = name
            else:
                holiday = HolidayCalendar(holiday_date=holiday_date, holiday_name=name)
                self.db.add(holiday)
            count += 1

        self._commit_or_raise()
        return count

    def import_holidays_from_tsv(self, tsv_data: str) -> int:
        """Import holidays from TSV (Date [Tab] Name)."""
        count = 0
        lines = tsv_data.strip().splitlines()
        for line in lines:
            parts = line.split("\t")
            if not parts:
                continue
            date_str = parts[0].strip()
            name = parts[1].strip() if len(parts) > 1 else None

            try:
                # 柔軟な日付解析 (YYYY/MM/DD, YYYY-MM-DD, YYYYMMDD etc)
                # ここでは簡単な YYYY/MM/DD と YYYY-MM-DD をサポート
                if "/" in date_str:
                    holiday_date = datetime.strptime(date_str, "%Y/%m/%d").date()
                elif "-" in date_str:
                    holiday_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                else:
                    # その他の形式は必要に応じて追加
                    continue
            except ValueError:
                continue

            existing = (
                self.db.query(HolidayCalendar)
                .filter(HolidayCalendar.holiday_date == holiday_date)
                .first()
            )
            if existing:
                existing.holiday_name = name
            else:
                holiday = HolidayCalendar(holiday_date=holiday_date, holiday_name=name)
                self.db.add(holiday)
            count += 1

        self._commit_or_raise()
        return count

    def calculate_business_day(self, payload: BusinessDayCalculationRequest) -> date:
        if payload.days == 0:
            return payload.start_date
        holiday_dates = {holiday.holiday_date for holiday in self.db.query(HolidayCalendar).all()}
        company_overrides = {
            entry.calendar_date: entry.is_workday for entry in self.db.query(CompanyCalendar).all()
        }

        def is_business_day(target_date: date) -> bool:
            override = company_overrides.get(target_date)
            if override is not None:
                return override
            if target_date.weekday() >= 5:
                return False
            if target_date in holiday_dates:
                return False
            return True

        step = 1 if payload.direction == "after" else -1
        current = payload.start_date
        counted = 0

        if payload.include_start and is_business_day(current):
            counted = 1
            if counted >= payload.days:
                return current

        while counted < payload.days:
            current = current.fromordinal(current.toordinal() + step)
            if is_business_day(current):
                counted += 1

        return current

    def _get_or_404(self, model: Any, record_id: int, message: str) -> Any:
        record = self.db.query(model).filter(model.id == record_id).first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        return record

    def _commit_or_raise(self) -> None:
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="データの重複が検出されました",
            ) from exc
