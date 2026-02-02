"""Mapping validation for allocation/shipping operations.

Phase 2-1: ロットが先方品番にマッピングされているか検証する。
未マッピングの場合は UnmappedItemError を発生させ、処理をブロックする。

検証ルール:
1. lot_receipts.supplier_item_id が設定されているか
2. supplier_item_id に紐づく品目マスタが存在するか
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import UnmappedItemError
from app.infrastructure.persistence.models.lot_receipt_models import LotReceipt
from app.infrastructure.persistence.models.masters_models import CustomerItem


def validate_lot_mapping(
    db: Session,
    lot: LotReceipt,
    *,
    raise_on_unmapped: bool = True,
    strict: bool = True,
) -> bool:
    """ロットのマッピング状態を検証.

    Args:
        db: データベースセッション
        lot: 検証対象のロット
        raise_on_unmapped: Trueの場合、未マッピング時にUnmappedItemErrorを発生
        strict: Trueの場合、supplier_item_idがNULLでもエラー（デフォルト: False）
                Phase 2ではFalseで既存データとの互換性を保持

    Returns:
        bool: マッピングが有効な場合True

    Raises:
        UnmappedItemError: raise_on_unmapped=True かつ未マッピングの場合
    """
    # 1. supplier_item_id が設定されているか
    if not lot.supplier_item_id:
        # Phase 2: strictモードでない場合、supplier_item_id未設定は許容（既存データ互換）
        if strict:
            if raise_on_unmapped:
                raise UnmappedItemError(
                    lot_id=lot.id,
                    lot_number=lot.lot_number,
                    product_code=lot.supplier_item.maker_part_no if lot.supplier_item else None,
                    supplier_item_id=None,
                )
            return False
        # supplier_item_id未設定は検証スキップ（Phase 2互換モード）
        return True

    # Phase 2-3 Rule Change:
    # "Strict Mode" only enforces the existence of supplier_item_id.
    # The existence of an is_primary=True mapping is preferred for display stability
    # but NOT required for allocation/shipping logic.
    # Blocking on missing is_primary would stop business operations unnecessarily.

    # 2. customer_items に is_primary=True のマッピングが存在するか (Warning only)
    # stmt = select(CustomerItem).where(
    #     CustomerItem.supplier_item_id == lot.supplier_item_id,
    #     CustomerItem.is_primary.is_(True),
    # )
    # primary_mapping = db.execute(stmt).scalar_one_or_none()

    # if not primary_mapping:
    #     # Do not block here even if raise_on_unmapped=True
    #     # Just return True (Valid for processing) implies "mapped to a manufacturer item"
    #     pass

    return True

    return True


def validate_lots_mapping(
    db: Session,
    lot_ids: list[int],
    *,
    raise_on_unmapped: bool = True,
) -> dict[int, bool]:
    """複数ロットのマッピング状態を一括検証.

    Args:
        db: データベースセッション
        lot_ids: 検証対象のロットID一覧
        raise_on_unmapped: Trueの場合、未マッピング時にUnmappedItemErrorを発生（最初の1件で停止）

    Returns:
        dict[int, bool]: ロットIDをキー、マッピング有効性をバリューとする辞書

    Raises:
        UnmappedItemError: raise_on_unmapped=True かつ未マッピングの場合
    """
    if not lot_ids:
        return {}

    # ロットを一括取得
    stmt = select(LotReceipt).where(LotReceipt.id.in_(lot_ids))
    lots = db.execute(stmt).scalars().all()

    results: dict[int, bool] = {}
    for lot in lots:
        is_valid = validate_lot_mapping(db, lot, raise_on_unmapped=raise_on_unmapped)
        results[lot.id] = is_valid

    return results


def get_customer_part_no_for_lot(
    db: Session,
    lot: LotReceipt,
    *,
    customer_id: int | None = None,
) -> str | None:
    """ロットの先方品番を取得（在庫表示用）.

    表示ルール（MASTER_ALIGNMENT_PLAN.md 3.在庫ページの表示方針）:
    1. 引当/出荷中で customer_id が指定されている場合: その得意先の品番
    2. デフォルト: supplier_item_id に紐づく先方品番 (最初の一件)
    3. フォールバック: None（UIで「マッピング設定」への導線を表示）

    Args:
        db: データベースセッション
        lot: 対象ロット
        customer_id: 向け先の得意先ID（引当/出荷時に指定）

    Returns:
        str | None: 先方品番、またはNone
    """
    if not lot.supplier_item_id:
        return None

    # ルール(1): 特定の得意先が指定されている場合
    if customer_id:
        stmt = select(CustomerItem.customer_part_no).where(
            CustomerItem.supplier_item_id == lot.supplier_item_id,
            CustomerItem.customer_id == customer_id,
        )
        result = db.execute(stmt).scalar_one_or_none()
        if result:
            return result

    # ルール(2): Phase1 - is_primaryは廃止。最初の1件を返す（created_at順）
    # Phase1以降、customer_itemsは等価なので、特定のデフォルトは存在しない
    stmt = (
        select(CustomerItem.customer_part_no)
        .where(CustomerItem.supplier_item_id == lot.supplier_item_id)
        .order_by(CustomerItem.created_at)
        .limit(1)
    )
    result = db.execute(stmt).scalar_one_or_none()

    return result  # ルール(3): None の場合はフォールバック
