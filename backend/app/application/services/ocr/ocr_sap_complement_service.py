"""OCR→SAP変換用補完マスタ検索サービス.

2段階検索ロジック:
1. 完全一致検索（customer_code + jiku_code + external_product_code）
2. 前方一致フォールバック（1件のみヒット時に採用）
"""

from dataclasses import dataclass
from enum import Enum

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.masters_models import (
    Customer,
    CustomerItem,
    CustomerItemJikuMapping,
)


class MatchType(str, Enum):
    """検索マッチ種別."""

    EXACT = "exact"
    PREFIX = "prefix"
    NOT_FOUND = "not_found"
    MULTIPLE = "multiple"


@dataclass
class ComplementResult:
    """補完検索結果."""

    customer_item: CustomerItem | None
    match_type: MatchType
    product_id: int | None
    message: str | None = None


class OcrSapComplementService:
    """OCR→SAP変換用補完マスタ検索サービス.

    2段階検索ロジックを実装:
    1. 完全一致検索
    2. 前方一致フォールバック（例外処理）
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def find_complement(
        self,
        customer_code: str,
        jiku_code: str,
        customer_part_no: str,
    ) -> ComplementResult:
        """OCR入力データから補完マスタを検索.

        Args:
            customer_code: 得意先コード
            jiku_code: 次区コード
            customer_part_no: 先方品番（OCR読取値）

        Returns:
            ComplementResult: 検索結果（マスタ、マッチ種別、製品ID）
        """
        # Step 1: 完全一致検索
        result = self._find_exact_match(customer_code, jiku_code, customer_part_no)
        if result.match_type == MatchType.EXACT:
            return result

        # Step 2: 前方一致フォールバック
        return self._find_prefix_match(customer_code, jiku_code, customer_part_no)

    def _find_exact_match(
        self,
        customer_code: str,
        jiku_code: str,
        customer_part_no: str,
    ) -> ComplementResult:
        """完全一致検索."""
        # customer_codeからcustomer_idを取得
        customer = (
            self.db.query(Customer)
            .filter(
                Customer.customer_code == customer_code,
                Customer.get_active_filter(),
            )
            .first()
        )
        if not customer:
            return ComplementResult(
                customer_item=None,
                match_type=MatchType.NOT_FOUND,
                product_id=None,
                message=f"Customer not found: {customer_code}",
            )

        # customer_items から完全一致検索
        items = (
            self.db.query(CustomerItem)
            .filter(
                CustomerItem.customer_id == customer.id,
                CustomerItem.customer_part_no == customer_part_no,
                CustomerItem.get_active_filter(),
            )
            .all()
        )

        if len(items) == 0:
            return ComplementResult(
                customer_item=None,
                match_type=MatchType.NOT_FOUND,
                product_id=None,
            )

        if len(items) > 1:
            return ComplementResult(
                customer_item=None,
                match_type=MatchType.MULTIPLE,
                product_id=None,
                message=f"Multiple matches found: {len(items)} items",
            )

        item = items[0]

        # 次区コードで納入先を解決（オプション：将来の拡張用）
        # 現時点では検索のみ、結果の使用は今後の実装で追加
        _jiku_mapping = (
            self.db.query(CustomerItemJikuMapping)
            .filter(
                CustomerItemJikuMapping.customer_item_id == item.id,
                CustomerItemJikuMapping.jiku_code == jiku_code,
            )
            .first()
        )

        # 次区マッピングがなくても、customer_itemは返す
        return ComplementResult(
            customer_item=item,
            match_type=MatchType.EXACT,
            product_id=item.product_id,
        )

    def _find_prefix_match(
        self,
        customer_code: str,
        jiku_code: str,
        customer_part_no: str,
    ) -> ComplementResult:
        """前方一致検索（フォールバック）.

        枝番（サフィックス）差異の吸収を目的とした例外処理。
        1件のみヒット時のみ採用。
        """
        customer = (
            self.db.query(Customer)
            .filter(
                Customer.customer_code == customer_code,
                Customer.get_active_filter(),
            )
            .first()
        )
        if not customer:
            return ComplementResult(
                customer_item=None,
                match_type=MatchType.NOT_FOUND,
                product_id=None,
                message=f"Customer not found: {customer_code}",
            )

        # 前方一致検索 (LIKE 'xxx%')
        items = (
            self.db.query(CustomerItem)
            .filter(
                CustomerItem.customer_id == customer.id,
                CustomerItem.customer_part_no.like(f"{customer_part_no}%"),
                CustomerItem.get_active_filter(),
            )
            .all()
        )

        if len(items) == 0:
            return ComplementResult(
                customer_item=None,
                match_type=MatchType.NOT_FOUND,
                product_id=None,
                message=f"No match found for: {customer_part_no}",
            )

        if len(items) > 1:
            return ComplementResult(
                customer_item=None,
                match_type=MatchType.MULTIPLE,
                product_id=None,
                message=f"Multiple prefix matches: {len(items)} items",
            )

        item = items[0]
        return ComplementResult(
            customer_item=item,
            match_type=MatchType.PREFIX,
            product_id=item.product_id,
            message=f"Prefix match: {customer_part_no} -> {item.customer_part_no}",
        )

    def resolve_product_id(
        self,
        customer_code: str,
        jiku_code: str,
        customer_part_no: str,
    ) -> tuple[int | None, MatchType, str | None]:
        """製品IDを解決（簡易版）.

        Returns:
            tuple: (product_id, match_type, message)
        """
        result = self.find_complement(customer_code, jiku_code, customer_part_no)
        return (result.product_id, result.match_type, result.message)
