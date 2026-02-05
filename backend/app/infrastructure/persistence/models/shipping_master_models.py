"""出荷用マスタデータモデル.

既存マスタ（得意先・仕入先など）とは独立して動作。
ForeignKey制約なし、コードが既存マスタになくてもOK。
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.persistence.models.base_model import Base


class ShippingMasterRaw(Base):
    """出荷用マスタ生データ（監査・完全再現用）.

    Excel「マスタ」シートの列A〜T（20列）をそのまま保持。
    """

    __tablename__ = "shipping_master_raw"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # キー候補列
    customer_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 得意先コード
    material_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 材質コード
    jiku_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 次区（出荷先区分）
    warehouse_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 倉庫コード

    # 製品情報
    delivery_note_product_name: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # 素材納品書記載製品名
    customer_part_no: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 先方品番
    maker_part_no: Mapped[str | None] = mapped_column(String(100), nullable=True)  # メーカー品番

    # 発注・メーカー情報
    order_flag: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 発注
    maker_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # メーカー
    maker_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # メーカー名
    supplier_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 仕入先コード
    staff_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 担当者名

    # 納入先情報
    delivery_place_abbr: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # 納入先略称
    delivery_place_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # 納入先コード
    delivery_place_name: Mapped[str | None] = mapped_column(String(200), nullable=True)  # 納入先

    # 倉庫情報
    shipping_warehouse: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 出荷倉庫

    # 出荷票・ルール
    shipping_slip_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # 出荷票テキスト
    transport_lt_days: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 輸送LT(営業日)
    order_existence: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 発注の有無
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)  # 備考

    # メタ情報
    row_index: Mapped[int] = mapped_column(Integer, nullable=False)  # Excel行番号
    import_batch_id: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # インポートバッチID
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )


class ShippingMasterCurated(Base):
    """出荷用マスタ整形済み（アプリ参照用）.

    キー: 得意先コード × 材質コード × 次区(jiku_code)
    重複時は倉庫キーも使用、それでも重複ならアラート。
    """

    __tablename__ = "shipping_master_curated"
    __table_args__ = (
        UniqueConstraint(
            "customer_code",
            "material_code",
            "jiku_code",
            name="uq_shipping_master_curated_key",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    raw_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("shipping_master_raw.id", ondelete="SET NULL"), nullable=True
    )

    # キー列（NOT NULL）
    customer_code: Mapped[str] = mapped_column(String(50), nullable=False)  # 得意先コード
    material_code: Mapped[str] = mapped_column(String(50), nullable=False)  # 材質コード
    jiku_code: Mapped[str] = mapped_column(String(50), nullable=False)  # 次区（出荷先区分）

    # 拡張キー
    # warehouse_code は重複定義されていたため削除

    # 正規化された値（既存マスタへの参照なし、独立データ）
    customer_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 得意先名
    delivery_note_product_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_part_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    maker_part_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    order_flag: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="発注（Excel 6列目）"
    )
    maker_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    maker_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    supplier_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    supplier_name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 仕入先名称
    staff_name: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="担当者名（Excel 10列目）"
    )
    delivery_place_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    delivery_place_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    delivery_place_abbr: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="納入先略称（Excel 12列目）"
    )
    warehouse_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="倉庫コード（Excel 15列目）"
    )
    shipping_warehouse: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="出荷倉庫名（Excel 16列目）"
    )
    shipping_slip_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    transport_lt_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    order_existence: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="発注の有無（Excel 19列目）"
    )
    has_order: Mapped[bool] = mapped_column(Boolean, default=False)  # アプリ制御フラグ
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 重複フラグ
    has_duplicate_warning: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1"), comment="楽観的ロック用バージョン"
    )


class OrderRegisterRow(Base):
    """受注登録結果（OCR + マスタ参照）.

    Excel出力・React表示の単一ソース。
    """

    __tablename__ = "order_register_rows"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # 参照元（ForeignKeyなし、独立動作）
    long_data_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True
    )  # smartread_long_data
    curated_master_id: Mapped[int | None] = mapped_column(
        BigInteger, nullable=True
    )  # shipping_master_curated
    task_date: Mapped[date] = mapped_column(Date, nullable=False)

    # ロット割当（手入力）
    lot_no_1: Mapped[str | None] = mapped_column(String(50), nullable=True)
    quantity_1: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lot_no_2: Mapped[str | None] = mapped_column(String(50), nullable=True)
    quantity_2: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # OCR由来
    inbound_no: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 入庫No
    shipping_date: Mapped[date | None] = mapped_column(Date, nullable=True)  # 出荷日（生成値）
    delivery_date: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # 納期 (OCR生データ保持)
    delivery_quantity: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # 納入量 (OCR生データ保持)
    item_no: Mapped[str | None] = mapped_column(String(50), nullable=True)  # アイテムNo
    quantity_unit: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 数量単位

    # マスタ/OCR混在
    material_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    jiku_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_part_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    maker_part_no: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # マスタ由来
    source: Mapped[str] = mapped_column(
        String(20), default="OCR", server_default=text("'OCR'")
    )  # 取得元
    shipping_slip_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    supplier_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    supplier_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipping_warehouse_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    shipping_warehouse_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivery_place_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    delivery_place_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ステータス
    status: Mapped[str] = mapped_column(
        String(20), default="PENDING", server_default=text("'PENDING'")
    )  # PENDING/EXPORTED/ERROR
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
