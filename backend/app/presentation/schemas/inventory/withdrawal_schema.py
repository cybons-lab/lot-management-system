"""Withdrawal-related Pydantic schemas.

出庫（受注外出庫）のリクエスト・レスポンススキーマ。
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import Field

from app.presentation.schemas.common.base import BaseSchema


class WithdrawalType(str, Enum):
    """出庫タイプ."""

    ORDER_MANUAL = "order_manual"  # 受注（手動）
    INTERNAL_USE = "internal_use"  # 社内使用
    DISPOSAL = "disposal"  # 廃棄処理
    RETURN = "return"  # 返品対応
    SAMPLE = "sample"  # サンプル出荷
    OTHER = "other"  # その他


WITHDRAWAL_TYPE_LABELS = {
    WithdrawalType.ORDER_MANUAL: "受注（手動）",
    WithdrawalType.INTERNAL_USE: "社内使用",
    WithdrawalType.DISPOSAL: "廃棄処理",
    WithdrawalType.RETURN: "返品対応",
    WithdrawalType.SAMPLE: "サンプル出荷",
    WithdrawalType.OTHER: "その他",
}


class WithdrawalCancelReason(str, Enum):
    """出庫取消理由."""

    INPUT_ERROR = "input_error"  # 入力ミス
    WRONG_QUANTITY = "wrong_quantity"  # 数量誤り
    WRONG_LOT = "wrong_lot"  # ロット選択誤り
    WRONG_PRODUCT = "wrong_product"  # 品目誤り
    CUSTOMER_REQUEST = "customer_request"  # 顧客都合
    DUPLICATE = "duplicate"  # 重複登録
    OTHER = "other"  # その他


CANCEL_REASON_LABELS = {
    WithdrawalCancelReason.INPUT_ERROR: "入力ミス",
    WithdrawalCancelReason.WRONG_QUANTITY: "数量誤り",
    WithdrawalCancelReason.WRONG_LOT: "ロット選択誤り",
    WithdrawalCancelReason.WRONG_PRODUCT: "品目誤り",
    WithdrawalCancelReason.CUSTOMER_REQUEST: "顧客都合",
    WithdrawalCancelReason.DUPLICATE: "重複登録",
    WithdrawalCancelReason.OTHER: "その他",
}


class WithdrawalCreate(BaseSchema):
    """出庫登録リクエスト."""

    lot_id: int = Field(..., description="出庫対象のロットID")
    quantity: Decimal = Field(..., gt=0, description="出庫数量（正の値）")
    withdrawal_type: WithdrawalType = Field(..., description="出庫タイプ")
    customer_id: int | None = Field(None, description="得意先ID（受注手動の場合必須）")
    delivery_place_id: int | None = Field(None, description="納入場所ID（任意）")
    ship_date: date = Field(..., description="出荷日")
    reason: str | None = Field(None, description="備考")
    reference_number: str | None = Field(
        None, max_length=100, description="参照番号（SAP受注番号など）"
    )
    withdrawn_by: int | None = Field(None, description="出庫実行者ユーザーID")


class WithdrawalCancelRequest(BaseSchema):
    """出庫取消リクエスト."""

    reason: WithdrawalCancelReason = Field(..., description="取消理由")
    note: str | None = Field(None, max_length=500, description="取消メモ（その他の場合など）")
    cancelled_by: int | None = Field(None, description="取消実行者ユーザーID")


class WithdrawalResponse(BaseSchema):
    """出庫レスポンス."""

    id: int = Field(..., serialization_alias="withdrawal_id")
    lot_id: int
    lot_number: str
    product_id: int
    product_name: str
    product_code: str
    quantity: Decimal
    withdrawal_type: WithdrawalType
    withdrawal_type_label: str = Field(..., description="出庫タイプの日本語表示")
    customer_id: int | None = None
    customer_name: str | None = None
    customer_code: str | None = None
    delivery_place_id: int | None = None
    delivery_place_name: str | None = None
    delivery_place_code: str | None = None
    ship_date: date
    reason: str | None
    reference_number: str | None
    withdrawn_by: int | None = None
    withdrawn_by_name: str | None = None
    withdrawn_at: datetime
    created_at: datetime
    # 取消関連フィールド
    is_cancelled: bool = Field(False, description="取消済みフラグ")
    cancelled_at: datetime | None = None
    cancelled_by: int | None = None
    cancelled_by_name: str | None = None
    cancel_reason: WithdrawalCancelReason | None = None
    cancel_reason_label: str | None = None
    cancel_note: str | None = None


class WithdrawalListResponse(BaseSchema):
    """出庫一覧レスポンス."""

    withdrawals: list[WithdrawalResponse]
    total: int
    page: int
    page_size: int


class DailyWithdrawalSummary(BaseSchema):
    """日別出庫集計（カレンダー用）."""

    date: date
    count: int
    total_quantity: Decimal
