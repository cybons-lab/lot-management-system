"""ProductWarehouse model for managed product×warehouse combinations."""

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.infrastructure.persistence.models.base_model import Base


class ProductWarehouse(Base):
    """製品×倉庫の管理対象組み合わせ.

    在庫一覧の母集団として使用。ロットが0件でも表示可能にする。
    """

    __tablename__ = "product_warehouse"

    product_id = Column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    warehouse_id = Column(
        BigInteger, ForeignKey("warehouses.id", ondelete="CASCADE"), primary_key=True
    )
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<ProductWarehouse product={self.product_id} warehouse={self.warehouse_id}>"
