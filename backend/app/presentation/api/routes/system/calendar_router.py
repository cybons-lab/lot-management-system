from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.application.services.calendar_service import CalendarService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_user_or_above
from app.presentation.schemas.calendar.calendar_schemas import (
    BusinessDayCalculationRequest,
    BusinessDayCalculationResponse,
    CompanyCalendarCreate,
    CompanyCalendarResponse,
    CompanyCalendarUpdate,
    HolidayCalendarCreate,
    HolidayCalendarResponse,
    HolidayCalendarUpdate,
    OriginalDeliveryCalendarCreate,
    OriginalDeliveryCalendarResponse,
    OriginalDeliveryCalendarUpdate,
)


router = APIRouter(tags=["calendar"])


@router.get("/calendar/holidays", response_model=list[HolidayCalendarResponse])
def list_holiday_calendars(
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    return service.list_holidays()


@router.post("/calendar/holidays", response_model=HolidayCalendarResponse, status_code=201)
def create_holiday_calendar(
    payload: HolidayCalendarCreate,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    return service.create_holiday(payload)


@router.put("/calendar/holidays/{holiday_id}", response_model=HolidayCalendarResponse)
def update_holiday_calendar(
    holiday_id: int,
    payload: HolidayCalendarUpdate,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    return service.update_holiday(holiday_id, payload)


@router.delete("/calendar/holidays/{holiday_id}", status_code=204)
def delete_holiday_calendar(
    holiday_id: int,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    service.delete_holiday(holiday_id)
    return None


@router.get("/calendar/company-days", response_model=list[CompanyCalendarResponse])
def list_company_calendar(
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    return service.list_company_calendar()


@router.post("/calendar/company-days", response_model=CompanyCalendarResponse, status_code=201)
def create_company_calendar(
    payload: CompanyCalendarCreate,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    return service.create_company_calendar(payload)


@router.put("/calendar/company-days/{company_calendar_id}", response_model=CompanyCalendarResponse)
def update_company_calendar(
    company_calendar_id: int,
    payload: CompanyCalendarUpdate,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    return service.update_company_calendar(company_calendar_id, payload)


@router.delete("/calendar/company-days/{company_calendar_id}", status_code=204)
def delete_company_calendar(
    company_calendar_id: int,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    service.delete_company_calendar(company_calendar_id)
    return None


@router.get(
    "/calendar/original-delivery-dates", response_model=list[OriginalDeliveryCalendarResponse]
)
def list_original_delivery_calendar(
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    return service.list_original_delivery_calendar()


@router.post(
    "/calendar/original-delivery-dates",
    response_model=OriginalDeliveryCalendarResponse,
    status_code=201,
)
def create_original_delivery_calendar(
    payload: OriginalDeliveryCalendarCreate,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    return service.create_original_delivery_calendar(payload)


@router.put(
    "/calendar/original-delivery-dates/{delivery_calendar_id}",
    response_model=OriginalDeliveryCalendarResponse,
)
def update_original_delivery_calendar(
    delivery_calendar_id: int,
    payload: OriginalDeliveryCalendarUpdate,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    return service.update_original_delivery_calendar(delivery_calendar_id, payload)


@router.delete("/calendar/original-delivery-dates/{delivery_calendar_id}", status_code=204)
def delete_original_delivery_calendar(
    delivery_calendar_id: int,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    service.delete_original_delivery_calendar(delivery_calendar_id)
    return None


@router.post("/calendar/business-day-calc", response_model=BusinessDayCalculationResponse)
def calculate_business_day(
    payload: BusinessDayCalculationRequest,
    _: User = Depends(get_current_user_or_above),
    db: Session = Depends(get_db),
):
    service = CalendarService(db)
    result_date = service.calculate_business_day(payload)
    return BusinessDayCalculationResponse(
        start_date=payload.start_date,
        result_date=result_date,
        days=payload.days,
        direction=payload.direction,
        include_start=payload.include_start,
    )
