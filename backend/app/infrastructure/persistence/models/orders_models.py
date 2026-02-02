r"""Order management models aligned with DDL v2.2
(lot_management_ddl_v2_2_id.sql).

All models strictly follow the DDL as the single source of truth.

Updated 2025-12-08: Added business key columns for order management:
- order_group_id: References order_groups for logical grouping
- customer_order_no: Customer's 6-digit order number (business key)
- sap_order_item_no: SAP order item number (business key with sap_order_no)

【設計意図】受注モデルの設計判断:

1. なぜ Order と OrderLine を分離するのか
   理由: 1受注に複数明細を持つ正規化設計
   背景:
   - 自動車部品商社: 1回の受注で複数の部品を注文
   → 受注ヘッダ（Order）と受注明細（OrderLine）を分離
   設計:
   - Order: 受注全体の情報（顧客、受注日、ステータス）
   - OrderLine: 明細ごとの情報（製品、数量、納期、倉庫）
   メリット:
   - 正規化: データの重複を避ける
   - 柔軟性: 明細ごとに異なる納期、倉庫を設定可能
   業務シナリオ:
   - 受注1件で、製品A（100個、納期: 2025-01-10）+ 製品B（50個、納期: 2025-01-15）

2. status フィールドの設計（Order.status, OrderLine.status）
   理由: 受注全体とその明細の状態を個別管理
   Order.status:
   - open: 未引当
   - part_allocated: 一部引当済み
   - allocated: 全量引当済み
   - shipped: 出荷済み
   - closed: クローズ済み
   OrderLine.status:
   - pending: 未処理
   - allocated: 引当済み
   - shipped: 出荷済み
   関係:
   - 全明細が allocated → Order.status = allocated
   - 一部明細のみ allocated → Order.status = part_allocated
   業務的意義:
   - 受注一覧画面: Order.status で絞り込み
   - 明細一覧画面: OrderLine.status で絞り込み

3. Optimistic Locking の設計（Order.locked_by_user_id, L75-81）
   理由: 同時編集の競合を防ぐ
   問題:
   - ユーザーA と ユーザーB が同じ受注を同時に編集
   → 片方の変更が上書きされる（データロス）
   解決:
   - locked_by_user_id: ロックを取得したユーザーID
   - locked_at: ロック取得日時
   - lock_expires_at: ロック有効期限
   ロジック:
   - ユーザーAが編集開始 → ロック取得（5分間有効）
   - ユーザーBが編集開始しようとする → 「ユーザーAが編集中」と表示
   - 5分経過 → ロック自動解除
   業務的意義:
   - 営業担当が受注を編集中に、他の営業が上書きしてしまうのを防止

4. lock_expires_at のインデックス設計（L94-96）
   理由: 期限切れロックの効率的なクリーンアップ
   設計:
   - postgresql_where=text(\"lock_expires_at IS NOT NULL\")
   → Partial Index: ロック中のレコードのみインデックス化
   メリット:
   - 期限切れロックの検索が高速
   - インデックスサイズの削減（ロックされていないレコードは除外）
   用途:
   - バッチ処理: 期限切れロックを自動解除
   → WHERE lock_expires_at < NOW() の検索が高速

5. ocr_source_filename フィールド（L84-86）
   理由: OCR取込元の追跡
   用途:
   - OCRで取り込んだ受注: ファイル名を記録
   → 「どのExcelファイルから取り込んだか」を追跡可能
   - 手入力の受注: NULL
   業務シナリオ:
   - OCRエラー発生時に、元ファイルを確認して修正

6. cascade=\"all, delete-orphan\" の設計（OrderLine, L102）
   理由: 受注削除時に明細も自動削除
   動作:
   - Order を削除 → 紐づく OrderLine も自動削除
   - all: 全ての操作（削除、更新等）を伝播
   - delete-orphan: 親から切り離された子レコードを削除
   メリット:
   - データ整合性の保証（孤立レコードの発生を防止）
   - アプリケーション側で明細削除を明示的に実行不要

7. locked_by_user_name プロパティ（L106-109）
   理由: API レスポンスでのユーザー名表示
   設計:
   - @property: 計算プロパティ（DBカラムではない）
   - locked_by_user.display_name を返す
   → リレーションを辿ってユーザー名を取得
   用途:
   - API レスポンス: \"locked_by_user_name\": \"山田太郎\"
   → フロントエンドで「山田太郎が編集中」と表示
   代替案との比較:
   - locked_by_user_name カラムを追加: 冗長、データ重複
   - @property: 必要な時だけ計算、データ重複なし

8. なぜ order_date は Date型なのか（L61）
   理由: 時刻情報は不要
   業務要件:
   - 受注日: 日付のみ（時刻は意味がない）
   → 2025-01-10（時刻不要）
   メリット:
   - ストレージ節約（Date型は4バイト、DateTime型は8バイト）
   - タイムゾーン問題の回避（日付のみなのでタイムゾーン不要）
   対比:
   - created_at, updated_at: DateTime型（時刻まで記録）
   → システムの動作追跡に時刻が必要

9. customer_id の RESTRICT 制約（L57）
   理由: 顧客マスタ削除時のデータ保護
   動作:
   - 顧客を削除しようとする → 関連する Order が存在する場合、削除拒否
   → エラー: \"この顧客には受注が紐づいているため削除できません\"
   メリット:
   - 誤削除の防止（顧客を削除すると、受注が孤立する）
   代替案との比較:
   - CASCADE: 顧客削除時に受注も削除（危険）
   - SET NULL: 顧客削除時に customer_id を NULL に（受注が誰のものか不明に）
   → RESTRICT が最も安全

10. created_at と updated_at の設計（L64-72）
    理由: 監査証跡とトラブルシューティング
    設計:
    - server_default=func.current_timestamp()
    → DB側で自動的にタイムスタンプを設定
    - onupdate=func.current_timestamp()
    → レコード更新時に自動的に updated_at を更新
    メリット:
    - アプリケーション側で明示的に設定不要
    - DB側で一貫してタイムスタンプを管理
    用途:
    - 監査ログ: 「この受注はいつ作成されたか」
    - トラブルシューティング: 「最終更新はいつか」
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover - for type checkers only
    from .auth_models import User
    from .lot_reservations_model import LotReservation
    from .masters_models import Customer, SupplierItem
    from .order_groups_models import OrderGroup


class Order(Base):
    """Order headers (受注ヘッダ).

    DDL: orders
    Primary key: id (BIGSERIAL)
    Foreign keys: customer_id -> customers(id), delivery_place_id -> delivery_places(id)
    """

    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )

    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'open'"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    # Optimistic Locking
    locked_by_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lock_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # OCR取込情報
    ocr_source_filename: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="OCR取込元ファイル名"
    )
    cancel_reason: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="キャンセル・保留理由"
    )

    __table_args__ = (
        Index("idx_orders_customer", "customer_id"),
        Index("idx_orders_date", "order_date"),
        Index("idx_orders_locked_by", "locked_by_user_id"),
        Index(
            "idx_orders_lock_expires",
            "lock_expires_at",
            postgresql_where=text("lock_expires_at IS NOT NULL"),
        ),
    )

    # Relationships
    customer: Mapped[Customer] = relationship("Customer", back_populates="orders")
    order_lines: Mapped[list[OrderLine]] = relationship(
        "OrderLine", back_populates="order", cascade="all, delete-orphan"
    )
    locked_by_user: Mapped[User | None] = relationship("User", foreign_keys=[locked_by_user_id])

    @property
    def locked_by_user_name(self) -> str | None:
        """Flattened locked_by_user display_name for API response."""
        return self.locked_by_user.display_name if self.locked_by_user else None


class OrderLine(Base):
    """Order detail lines (受注明細).

    DDL: order_lines
    Primary key: id (BIGSERIAL)
    Foreign keys: order_id -> orders(id), supplier_item_id -> product_groups(id)
    """

    __tablename__ = "order_lines"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    order_group_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("order_groups.id", ondelete="SET NULL"),
        nullable=True,
        comment="受注グループへの参照（得意先×製品×受注日）",
    )
    supplier_item_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("supplier_items.id", ondelete="RESTRICT"),
        nullable=False,
        comment="仕入先製品ID",
    )

    # OCR取込時の元データ
    customer_part_no: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="OCR元の先方品番（変換前の生データ）"
    )
    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    order_quantity: Mapped[Decimal] = mapped_column(Numeric(15, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    converted_quantity: Mapped[Decimal] = mapped_column(
        Numeric(15, 3), nullable=True
    )  # Quantity in Product's internal_unit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.current_timestamp()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    delivery_place_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # 得意先側業務キー
    customer_order_no: Mapped[str | None] = mapped_column(
        String(6), nullable=True, comment="得意先6桁受注番号（業務キー）"
    )
    customer_order_line_no: Mapped[str | None] = mapped_column(
        String(10), nullable=True, comment="得意先側行番号"
    )

    # SAP側業務キー
    sap_order_no: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="SAP受注番号（業務キー）"
    )
    sap_order_item_no: Mapped[str | None] = mapped_column(
        String(6), nullable=True, comment="SAP明細番号（業務キー）"
    )
    shipping_document_text: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="出荷表テキスト"
    )

    # Forecast/Order integration
    order_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=text("'ORDER'"),
        comment="需要種別: FORECAST_LINKED / KANBAN / SPOT / ORDER",
    )
    forecast_reference: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="Forecast business key reference (replaces forecast_id FK)",
    )

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'pending'")
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))

    __table_args__ = (
        Index("idx_order_lines_order", "order_id"),
        Index("idx_order_lines_supplier_item", "supplier_item_id"),
        Index("idx_order_lines_date", "delivery_date"),
        Index("idx_order_lines_delivery_place", "delivery_place_id"),
        Index("idx_order_lines_status", "status"),
        Index("idx_order_lines_order_type", "order_type"),
        Index(
            "idx_order_lines_forecast_reference",
            "forecast_reference",
            postgresql_where=text("forecast_reference IS NOT NULL"),
        ),
        Index("idx_order_lines_order_group", "order_group_id"),
        Index(
            "idx_order_lines_sap_order_no",
            "sap_order_no",
            postgresql_where=text("sap_order_no IS NOT NULL"),
        ),
        Index(
            "idx_order_lines_customer_order_no",
            "customer_order_no",
            postgresql_where=text("customer_order_no IS NOT NULL"),
        ),
        CheckConstraint(
            "status IN ('pending', 'allocated', 'shipped', 'completed', 'cancelled', 'on_hold')",
            name="chk_order_lines_status",
        ),
        CheckConstraint(
            "order_type IN ('FORECAST_LINKED', 'KANBAN', 'SPOT', 'ORDER')",
            name="chk_order_lines_order_type",
        ),
        # 業務キー制約: 同一グループ内での得意先受注番号の一意性
        UniqueConstraint(
            "order_group_id",
            "customer_order_no",
            name="uq_order_lines_customer_key",
        ),
    )

    __mapper_args__ = {"version_id_col": version}

    # Relationships
    order: Mapped[Order] = relationship("Order", back_populates="order_lines")
    order_group: Mapped[OrderGroup | None] = relationship(
        "OrderGroup", back_populates="order_lines"
    )
    supplier_item: Mapped[SupplierItem] = relationship("SupplierItem", back_populates="order_lines")

    # P3: Relationship to LotReservation for efficient loading (avoid N+1)
    lot_reservations: Mapped[list[LotReservation]] = relationship(
        "LotReservation",
        primaryjoin="and_(foreign(LotReservation.source_id) == OrderLine.id, LotReservation.source_type == 'order')",
        viewonly=True,
    )

    @property
    def _lot_reservations(self) -> list:
        """Deprecated: Use self.lot_reservations relationship instead."""
        return self.lot_reservations

    @property
    def allocated_quantity(self) -> Decimal:
        """Calculate total allocated quantity from lot_reservations.

        P3: lot_reservations is the single source of truth.
        """
        # If lot_reservations is eager loaded, this is fast.
        # If not, it triggers 1 query (still better than manual session query inside loop if managed well)
        return sum((r.reserved_qty for r in self.lot_reservations), Decimal("0"))


# NOTE: Allocation class removed in P3.
# All allocation data is now in lot_reservations table.
# All allocation data is now in lot_reservations table.
