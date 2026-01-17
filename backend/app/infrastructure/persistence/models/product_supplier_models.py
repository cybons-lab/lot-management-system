"""ProductSupplier model for product-supplier relationships."""

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import relationship

from app.core.time_utils import utcnow
from app.infrastructure.persistence.models.base_model import Base
from app.infrastructure.persistence.models.soft_delete_mixin import SoftDeleteMixin


class ProductSupplier(SoftDeleteMixin, Base):
    """製品-仕入先の関連テーブル.

    1製品に対して複数の仕入先を紐づけ可能。 is_primary=True の仕入先が主要仕入先（1製品につき1つ）。
    Supports soft delete via valid_to column.
    """

    __tablename__ = "product_suppliers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    product_id = Column(BigInteger, ForeignKey("products.id"), nullable=False)
    supplier_id = Column(BigInteger, ForeignKey("suppliers.id"), nullable=False)
    is_primary = Column(Boolean, nullable=False, default=False)
    lead_time_days = Column(Integer, nullable=True)
    valid_to = Column(Date, nullable=False, server_default=text("'9999-12-31'"))  # type: ignore[assignment]
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

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
        Index("idx_product_suppliers_valid_to", "valid_to"),
    )
