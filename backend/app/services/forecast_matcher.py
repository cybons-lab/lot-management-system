from datetime import date
from typing import Literal, Optional, Tuple

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.forecast import Forecast

MatchStatus = Literal["EXACT", "PERIOD", "FALLBACK", "DIFF", "NONE"]


def _dekad_start(d: date) -> date:
    day = 1 if d.day <= 10 else (11 if d.day <= 20 else 21)
    return d.replace(day=day)


def _year_month_str(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def pick_forecast(
    db: Session,
    product_id: str,
    customer_id: str,
    supplier_id: str,
    order_date: date,
) -> Tuple[Optional[Forecast], Optional[str]]:
    # 1) daily
    stmt = (
        select(Forecast)
        .where(
            Forecast.product_id == product_id,
            Forecast.customer_id == customer_id,
            Forecast.supplier_id == supplier_id,
            Forecast.granularity == "daily",
            Forecast.date_day == order_date,
            Forecast.is_active == True,
        )
        .order_by(desc(Forecast.version_no))
        .limit(1)
    )
    row = db.execute(stmt).scalars().first()
    if row:
        return row, "daily"

    # 2) dekad（旬：期間内マッチ）
    dk_start = _dekad_start(order_date)
    stmt = (
        select(Forecast)
        .where(
            Forecast.product_id == product_id,
            Forecast.customer_id == customer_id,
            Forecast.supplier_id == supplier_id,
            Forecast.granularity == "dekad",
            Forecast.date_dekad_start == dk_start,
            Forecast.is_active == True,
        )
        .order_by(desc(Forecast.version_no))
        .limit(1)
    )
    row = db.execute(stmt).scalars().first()
    if row:
        return row, "dekad"

    # 3) monthly
    ym = _year_month_str(order_date)
    stmt = (
        select(Forecast)
        .where(
            Forecast.product_id == product_id,
            Forecast.customer_id == customer_id,
            Forecast.supplier_id == supplier_id,
            Forecast.granularity == "monthly",
            Forecast.year_month == ym,
            Forecast.is_active == True,
        )
        .order_by(desc(Forecast.version_no))
        .limit(1)
    )
    row = db.execute(stmt).scalars().first()
    if row:
        return row, "monthly"

    return None, None


def judge_status(
    matched_granularity: Optional[str], diff_qty: Optional[int]
) -> MatchStatus:
    if matched_granularity is None:
        return "NONE"
    if diff_qty is None:
        return "PERIOD"  # 粒度一致/数量差分不明の場合の暫定
    if diff_qty == 0:
        return "EXACT" if matched_granularity == "daily" else "PERIOD"
    return (
        "DIFF" if matched_granularity in ("daily", "dekad", "monthly") else "FALLBACK"
    )
