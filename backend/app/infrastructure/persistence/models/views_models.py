"""Database view models (read-only)."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Float, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from .base_model import Base


class VLotCurrentStock(Base):
    """v_lot_current_stock ビュー."""

    __tablename__ = "v_lot_current_stock"
    __table_args__ = {"info": {"is_view": True}}

    lot_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer)
    warehouse_id: Mapped[int] = mapped_column(Integer)
    current_quantity: Mapped[float] = mapped_column(Float)
    last_updated: Mapped[date | None] = mapped_column(Date)


# Alias for backward compatibility
LotCurrentStock = VLotCurrentStock


class VCustomerDailyProduct(Base):
    """v_customer_daily_products ビュー."""

    __tablename__ = "v_customer_daily_products"
    __table_args__ = {"info": {"is_view": True}}

    customer_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)


class VLotAvailableQty(Base):
    """v_lot_available_qty ビュー（読み取り専用）.

    利用可能なロットの数量情報を提供するビュー。
    - 期限切れのロットを除外
    - ロックされていないロット
    - 利用可能なロットのみ
    """

    __tablename__ = "v_lot_available_qty"
    __table_args__ = {"info": {"is_view": True}}

    lot_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer)
    warehouse_id: Mapped[int] = mapped_column(Integer)
    available_qty: Mapped[float] = mapped_column(Float)
    receipt_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    lot_status: Mapped[str] = mapped_column(String)


class VOrderLineContext(Base):
    """v_order_line_context ビュー（読み取り専用）.

    注文行のコンテキスト情報を提供するビュー。
    """

    __tablename__ = "v_order_line_context"
    __table_args__ = {"info": {"is_view": True}}

    order_line_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(Integer)
    customer_id: Mapped[int | None] = mapped_column(Integer)
    product_id: Mapped[int | None] = mapped_column(Integer)
    delivery_place_id: Mapped[int | None] = mapped_column(Integer)
    quantity: Mapped[float] = mapped_column(Float)


class VCustomerCodeToId(Base):
    """v_customer_code_to_id ビュー."""

    __tablename__ = "v_customer_code_to_id"
    __table_args__ = {"info": {"is_view": True}}

    customer_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_code: Mapped[str] = mapped_column(String)
    customer_name: Mapped[str] = mapped_column(String)


class VDeliveryPlaceCodeToId(Base):
    """v_delivery_place_code_to_id ビュー."""

    __tablename__ = "v_delivery_place_code_to_id"
    __table_args__ = {"info": {"is_view": True}}

    delivery_place_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    delivery_place_code: Mapped[str] = mapped_column(String)
    delivery_place_name: Mapped[str] = mapped_column(String)


class VForecastOrderPair(Base):
    """v_forecast_order_pairs ビュー."""

    __tablename__ = "v_forecast_order_pairs"
    __table_args__ = {"info": {"is_view": True}}

    forecast_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(Integer)
    product_id: Mapped[int] = mapped_column(Integer)
    order_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    delivery_place_id: Mapped[int | None] = mapped_column(Integer)


class VProductCodeToId(Base):
    """v_product_code_to_id ビュー."""

    __tablename__ = "v_product_code_to_id"
    __table_args__ = {"info": {"is_view": True}}

    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_code: Mapped[str] = mapped_column(String)
    product_name: Mapped[str] = mapped_column(String)


class VCandidateLotsByOrderLine(Base):
    """v_candidate_lots_by_order_line ビュー（読み取り専用）.

    注文行ごとの候補ロット一覧を提供するビュー。 FEFO（先入先出）順にソートされている。
    """

    __tablename__ = "v_candidate_lots_by_order_line"
    __table_args__ = {"info": {"is_view": True}}

    # 複合主キー（order_line_id + lot_id）
    order_line_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lot_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer)
    warehouse_id: Mapped[int | None] = mapped_column(Integer)
    available_qty: Mapped[float] = mapped_column(Float)
    receipt_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)


class VLotDetails(Base):
    """v_lot_details ビュー（読み取り専用）.

    ロット詳細情報を提供するビュー。
    - lots テーブルをベースに、products, warehouses, suppliers を JOIN
    - 在庫数量（current_quantity, allocated_quantity, available_quantity）を含む
    - 消費期限までの日数（days_to_expiry）を算出
    - 論理削除されたマスタ参照時はCOALESCEでフォールバック値を設定
    """

    __tablename__ = "v_lot_details"
    __table_args__ = {"info": {"is_view": True}}

    lot_id: Mapped[int] = mapped_column("lot_id", BigInteger, primary_key=True)
    lot_number: Mapped[str] = mapped_column(String(100))
    product_id: Mapped[int] = mapped_column(BigInteger)
    maker_part_code: Mapped[str] = mapped_column(String)  # COALESCE ensures non-null
    product_name: Mapped[str] = mapped_column(String)  # COALESCE ensures non-null
    warehouse_id: Mapped[int] = mapped_column(BigInteger)
    warehouse_code: Mapped[str] = mapped_column(String)  # COALESCE ensures non-null
    warehouse_name: Mapped[str] = mapped_column(String)  # COALESCE ensures non-null
    supplier_id: Mapped[int | None] = mapped_column(BigInteger)
    supplier_code: Mapped[str] = mapped_column(String)  # COALESCE ensures non-null
    supplier_name: Mapped[str] = mapped_column(String)  # COALESCE ensures non-null
    received_date: Mapped[date] = mapped_column(Date)
    expiry_date: Mapped[date | None] = mapped_column(Date)
    current_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    allocated_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    reserved_quantity_active: Mapped[Decimal] = mapped_column(Numeric(15, 3), default=Decimal(0))
    locked_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    available_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    unit: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    lock_reason: Mapped[str | None] = mapped_column(String)
    days_to_expiry: Mapped[int | None] = mapped_column(Integer)
    # 仮入庫識別キー（UUID）
    temporary_lot_key: Mapped[str | None] = mapped_column(String)

    # Origin tracking
    origin_type: Mapped[str | None] = mapped_column(String)
    origin_reference: Mapped[str | None] = mapped_column(String)

    # Financial and Logistical details
    shipping_date: Mapped[date | None] = mapped_column(Date)
    cost_price: Mapped[Decimal | None] = mapped_column(Numeric(15, 3))
    sales_price: Mapped[Decimal | None] = mapped_column(Numeric(15, 3))
    tax_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))

    # 担当者情報
    primary_user_id: Mapped[int | None] = mapped_column(Integer)
    primary_username: Mapped[str | None] = mapped_column(String)
    primary_user_display_name: Mapped[str | None] = mapped_column(String)
    # 論理削除フラグ（マスタの状態確認用）
    product_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    warehouse_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    supplier_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


# Backward compatibility alias
LotDetails = VLotDetails


class VOrderLineDetails(Base):
    """v_order_line_details ビュー（読み取り専用）.

    受注明細の詳細情報ビュー。
    - 受注、顧客、商品、納入先、仕入元、引当情報を含む
    - OrderServiceの_populate_additional_info処理をDB側に委譲
    - 論理削除されたマスタ参照時はCOALESCEでフォールバック値を設定
    """

    __tablename__ = "v_order_line_details"
    __table_args__ = {"info": {"is_view": True}}

    # 受注情報
    order_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_date: Mapped[date | None] = mapped_column(Date)
    customer_id: Mapped[int] = mapped_column(Integer)

    # 顧客情報 (COALESCE ensures non-null for code/name)
    customer_code: Mapped[str] = mapped_column(String)
    customer_name: Mapped[str] = mapped_column(String)

    # 受注明細情報
    line_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int | None] = mapped_column(Integer)
    delivery_date: Mapped[date | None] = mapped_column(Date)
    order_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    unit: Mapped[str | None] = mapped_column(String)
    delivery_place_id: Mapped[int | None] = mapped_column(Integer)
    line_status: Mapped[str | None] = mapped_column(String)
    shipping_document_text: Mapped[str | None] = mapped_column(String)

    # 商品情報 (COALESCE ensures non-null for code/name)
    product_code: Mapped[str] = mapped_column(String)
    product_name: Mapped[str] = mapped_column(String)
    product_internal_unit: Mapped[str | None] = mapped_column(String)
    product_external_unit: Mapped[str | None] = mapped_column(String)
    product_qty_per_internal_unit: Mapped[Decimal | None] = mapped_column(Numeric(10, 4))

    # 納入先情報 (COALESCE ensures non-null for code/name)
    delivery_place_code: Mapped[str] = mapped_column(String)
    delivery_place_name: Mapped[str] = mapped_column(String)
    jiku_code: Mapped[str | None] = mapped_column(String)

    # 得意先品番
    external_product_code: Mapped[str | None] = mapped_column(String)

    # 仕入元情報 (COALESCE ensures non-null)
    supplier_name: Mapped[str] = mapped_column(String)

    # 引当情報（集計）
    allocated_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))

    # 論理削除フラグ（マスタの状態確認用）
    customer_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    product_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    delivery_place_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class VInventorySummary(Base):
    """v_inventory_summary ビュー（読み取り専用）.

    在庫集計ビュー（product_warehouse起点）。
    - 商品・倉庫ごとの在庫総数、引当済数、有効在庫数を集計
    - ロット0件の製品×倉庫も表示可能
    - inventory_state: 'in_stock', 'depleted_only', 'no_lots'
    """

    __tablename__ = "v_inventory_summary"
    __table_args__ = {"info": {"is_view": True}}

    product_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    active_lot_count: Mapped[int] = mapped_column(Integer, default=0)
    total_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    allocated_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    locked_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    available_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    provisional_stock: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    available_with_provisional: Mapped[Decimal] = mapped_column(Numeric(15, 3))
    last_updated: Mapped[datetime | None] = mapped_column(DateTime)
    inventory_state: Mapped[str] = mapped_column(String(20), default="no_lots")
