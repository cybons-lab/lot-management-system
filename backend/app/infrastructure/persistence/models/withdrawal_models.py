"""Withdrawal models for manual lot withdrawal.

出庫（受注外出庫）の記録用モデル。

【設計意図】出庫モデルの設計判断:

1. なぜ Withdrawal テーブルが必要なのか
   理由: 受注以外の出庫を記録
   業務的背景:
   - 受注出庫: 顧客への正式な出荷（OrderLine → Allocation で管理）
   - 受注外出庫: 社内使用、廃棄、サンプル等（Withdrawal で管理）
   → 受注と無関係な在庫減少を記録
   実装:
   - Withdrawal: 受注外出庫の記録
   → lot_id + quantity で在庫を減らす
   業務影響:
   - 在庫の正確な追跡（受注外でも在庫が減る）

2. なぜ WithdrawalType が6種類あるのか（L36-44）
   理由: 出庫理由の分類
   業務的背景:
   - ORDER_MANUAL: 受注（手動）→ システム外で管理された受注
   - INTERNAL_USE: 社内使用 → 検査、試作、社内消費
   - DISPOSAL: 廃棄処理 → 期限切れ、不良品
   - RETURN: 返品対応 → 顧客からの返品
   - SAMPLE: サンプル出荷 → 見本品の提供
   - OTHER: その他 → 上記以外
   用途:
   - 在庫減少理由の分析
   → 「廃棄が多い製品」を特定

3. なぜ customer_id と delivery_place_id が Nullable なのか（L65-73）
   理由: 出庫タイプによっては不要
   業務ルール:
   - ORDER_MANUAL, SAMPLE: 顧客・納入先あり
   - INTERNAL_USE, DISPOSAL: 顧客・納入先なし
   → 出庫タイプによって必須/任意が変わる
   実装:
   - customer_id: Nullable（顧客がいない場合は NULL）
   - delivery_place_id: Nullable（納入先がない場合は NULL）
   業務影響:
   - 廃棄処理時に顧客情報を入力不要

4. なぜ CheckConstraint で数量を検証するのか（L91）
   理由: 業務ルール違反の検出
   業務ルール:
   - 出庫数量は必ず正数（0以下は無効）
   実装:
   - CheckConstraint("quantity > 0", name="chk_withdrawals_quantity")
   → データベースレベルで検証
   メリット:
   - アプリケーション以外からの登録でも検証

5. なぜ CheckConstraint で withdrawal_type を検証するのか（L92-95）
   理由: 不正な出庫タイプの防止
   業務ルール:
   - withdrawal_type は6種類のみ有効
   実装:
   - CheckConstraint(..., name="chk_withdrawals_type")
   → データベースレベルで検証
   メリット:
   - Enum以外の値が登録されるのを防ぐ

6. なぜ ship_date があるのか（L75）
   理由: 実際の出庫日を記録
   業務的背景:
   - withdrawn_at: システム登録日時
   - ship_date: 実際の出庫日
   → 後日、出庫日をバックデート登録するケースがある
   例:
   - 1月10日に廃棄処理を実施
   - 1月15日にシステム登録（ship_date = 1月10日）
   用途:
   - 在庫推移の正確な分析

7. なぜ reason と reference_number があるのか（L76-77）
   理由: 出庫理由と参照番号の記録
   業務的背景:
   - reason: 出庫理由の詳細（例: 「期限切れのため廃棄」）
   - reference_number: 参照番号（例: 「廃棄承認書 No.123」）
   用途:
   - 監査証跡: なぜ出庫したかを記録
   - 外部文書との紐付け

8. なぜ withdrawn_by があるのか（L78-82）
   理由: 出庫実施者の記録
   監査要件:
   - 誰が出庫処理を行ったか
   → 責任の所在を明確化
   実装:
   - withdrawn_by: User の外部キー（Nullable）
   → 退職者削除時も記録を保持（ondelete="RESTRICT"）
   業務影響:
   - 不正な出庫の検出

9. なぜ lot_id に RESTRICT があるのか（L60）
   理由: ロット削除の防止
   業務ルール:
   - 出庫記録があるロットは削除不可
   → 過去の出庫履歴を保持
   実装:
   - ondelete="RESTRICT"
   → ロット削除時にエラー
   業務影響:
   - 出庫履歴の保全（監査証跡）

10. なぜ複数のインデックスがあるのか（L96-99）
    理由: 頻繁な検索クエリの最適化
    検索パターン:
    - lot_id: 「このロットの出庫履歴を表示」
    - customer_id: 「顧客Aへの出庫を一覧表示」
    - ship_date: 「今月の出庫を集計」
    - withdrawal_type: 「廃棄処理の一覧を表示」
    実装:
    - Index("idx_withdrawals_lot", "lot_id")
    - Index("idx_withdrawals_customer", "customer_id")
    - Index("idx_withdrawals_date", "ship_date")
    - Index("idx_withdrawals_type", "withdrawal_type")
    メリット:
    - 検索パフォーマンスの向上
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base


if TYPE_CHECKING:  # pragma: no cover
    from .auth_models import User
    from .lot_receipt_models import LotReceipt
    from .masters_models import Customer, DeliveryPlace
    from .withdrawal_line_model import WithdrawalLine


class WithdrawalType(StrEnum):
    """出庫タイプ."""

    ORDER_MANUAL = "order_manual"  # 受注（手動）
    INTERNAL_USE = "internal_use"  # 社内使用
    DISPOSAL = "disposal"  # 廃棄処理
    RETURN = "return"  # 返品対応
    SAMPLE = "sample"  # サンプル出荷
    OTHER = "other"  # その他


class WithdrawalCancelReason(StrEnum):
    """出庫取消理由."""

    INPUT_ERROR = "input_error"  # 入力ミス
    WRONG_QUANTITY = "wrong_quantity"  # 数量誤り
    WRONG_LOT = "wrong_lot"  # ロット選択誤り
    WRONG_PRODUCT = "wrong_product"  # 品目誤り
    CUSTOMER_REQUEST = "customer_request"  # 顧客都合
    DUPLICATE = "duplicate"  # 重複登録
    OTHER = "other"  # その他


class Withdrawal(Base):
    """出庫記録（受注外出庫）.

    DDL: withdrawals
    Primary key: id (BIGSERIAL)
    Foreign keys: lot_id, customer_id, delivery_place_id, withdrawn_by
    """

    __tablename__ = "withdrawals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # B-Plan: lot_id/quantity are nullable (use withdrawal_lines instead)
    lot_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("lot_receipts.id", ondelete="RESTRICT"),
        nullable=True,  # B-Plan: nullable for new workflow
        comment="レガシー: withdrawal_lines 移行後は未使用",
    )
    quantity: Mapped[Decimal | None] = mapped_column(
        Numeric(15, 3),
        nullable=True,  # B-Plan: nullable for new workflow
        comment="レガシー: withdrawal_lines 移行後は未使用",
    )
    withdrawal_type: Mapped[WithdrawalType] = mapped_column(String(20), nullable=False)
    customer_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=True,
    )
    delivery_place_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("delivery_places.id", ondelete="RESTRICT"),
        nullable=True,
    )
    ship_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # B-Plan: New date fields
    due_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        comment="納期（必須）",
    )
    planned_ship_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        comment="予定出荷日（任意、LT計算用）",
    )

    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    withdrawn_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    withdrawn_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp()
    )

    # 取消関連フィールド
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancelled_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    cancel_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cancel_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_withdrawals_quantity"),
        CheckConstraint(
            "withdrawal_type IN ('order_manual','internal_use','disposal','return','sample','other')",
            name="chk_withdrawals_type",
        ),
        Index("idx_withdrawals_lot", "lot_id"),
        Index("idx_withdrawals_customer", "customer_id"),
        Index("idx_withdrawals_date", "ship_date"),
        Index("idx_withdrawals_type", "withdrawal_type"),
        # B-Plan: due_date index for calendar queries
        Index("idx_withdrawals_due_date", "due_date"),
    )

    # Relationships
    lot: Mapped[LotReceipt | None] = relationship("LotReceipt")
    customer: Mapped[Customer | None] = relationship("Customer")
    delivery_place: Mapped[DeliveryPlace | None] = relationship("DeliveryPlace")
    user: Mapped[User | None] = relationship("User", foreign_keys=[withdrawn_by])
    cancelled_by_user: Mapped[User | None] = relationship("User", foreign_keys=[cancelled_by])

    # B-Plan: Withdrawal lines (FIFO consumption from multiple receipts)
    lines: Mapped[list[WithdrawalLine]] = relationship(
        "WithdrawalLine",
        back_populates="withdrawal",
        cascade="all, delete-orphan",
    )

    @property
    def total_quantity(self) -> Decimal:
        """Total quantity from all lines (B-Plan computed)."""
        if self.lines:
            return sum((line.quantity for line in self.lines), Decimal("0"))
        # Fallback to legacy quantity
        return self.quantity if self.quantity is not None else Decimal("0")
