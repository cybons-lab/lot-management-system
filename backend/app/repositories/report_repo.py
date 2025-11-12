# app/repositories/report_repo.py
from sqlalchemy import text


def fetch_forecast_order_pairs(session, limit: int = 100):
    sql = text("SELECT * FROM public.v_forecast_order_pairs LIMIT :limit")
    return session.execute(sql, {"limit": limit}).mappings().all()
