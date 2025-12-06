"""ProductSupplier model for product-supplier relationships."""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.models.base_model import Base


class ProductSupplier(Base):
    """製品-仕入先の関連テーブル.

    1製品に対して複数の仕入先を紐づけ可能。
    is_primary=True の仕入先が主要仕入先（1製品につき1つ）。
    """

    __tablename__ = "product_suppliers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    product_id = Column(BigInteger, ForeignKey("products.id"), nullable=False)
    supplier_id = Column(BigInteger, ForeignKey("suppliers.id"), nullable=False)
    is_primary = Column(Boolean, nullable=False, default=False)
    lead_time_days = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    # Relationships
    product = relationship("Product", back_populates="product_suppliers")
    supplier = relationship("Supplier", back_populates="product_suppliers")

    __table_args__ = (
        UniqueConstraint("product_id", "supplier_id", name="uq_product_supplier"),
        Index(
            "uq_product_primary_supplier",
            "product_id",
            unique=True,
            postgresql_where=(is_primary == True),  # noqa: E712
        ),
    )
