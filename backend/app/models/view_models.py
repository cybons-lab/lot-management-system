"""View models for read-only database views."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Date, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import Base


class LotWithMaster(Base):
    """Read-only view: v_lots_with_master.
    
    Combines lots with products and suppliers via INNER JOIN.
    This view is used for efficient lot listing queries.
    
    DO NOT use this model for INSERT/UPDATE/DELETE operations.
    Use the Lot model instead.
    """

    __tablename__ = "v_lots_with_master"
    __table_args__ = {"info": {"is_view": True}}

    # Primary key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    # Lot fields
    lot_number: Mapped[str] = mapped_column(String(100))
    product_id: Mapped[int] = mapped_column(BigInteger)
    supplier_id: Mapped[int] = mapped_column(BigInteger)
    warehouse_id: Mapped[int] = mapped_column(BigInteger)
    current_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    allocated_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    unit: Mapped[str] = mapped_column(String(20))
    received_date: Mapped[date] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20))
    lock_reason: Mapped[str | None] = mapped_column(Text)
    
    # Inspection certificate fields
    inspection_status: Mapped[str] = mapped_column(String(20))
    inspection_date: Mapped[date | None] = mapped_column(Date)
    inspection_cert_number: Mapped[str | None] = mapped_column(String(100))
    
    # Metadata
    expected_lot_id: Mapped[int | None] = mapped_column(BigInteger)
    version_id: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)

    # Joined fields from products (non-nullable due to INNER JOIN)
    product_code: Mapped[str] = mapped_column(String(100))
    product_name: Mapped[str] = mapped_column(String(200))

    # Joined fields from suppliers (non-nullable due to INNER JOIN)
    supplier_name: Mapped[str] = mapped_column(String(200))
