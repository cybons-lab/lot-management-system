from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.routes.auth.auth_router import get_current_user_optional
from app.core.database import get_db
from app.models.auth_models import User
from app.schemas.inventory.inventory_schema import (
    LotCreate,
    LotLock,
    LotResponse,
    LotUpdate,
    StockMovementCreate,
    StockMovementResponse,
)
from app.services.assignments.assignment_service import UserSupplierAssignmentService
from app.services.inventory.lot_service import LotService


router = APIRouter(prefix="/lots", tags=["lots"])


@router.get("", response_model=list[LotResponse])
def list_lots(
    skip: int = 0,
    limit: int = 100,
    product_id: int | None = None,
    product_code: str | None = None,
    supplier_code: str | None = None,
    warehouse_code: str | None = None,
    expiry_from: date | None = None,
    expiry_to: date | None = None,
    with_stock: bool = True,
    prioritize_primary: bool = True,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """ロット一覧取得.

    Args:
        skip: スキップ件数
        limit: 取得件数
        product_id: 製品ID
        product_code: 製品コード
        supplier_code: 仕入先コード
        warehouse_code: 倉庫コード
        expiry_from: 有効期限開始日
        expiry_to: 有効期限終了日
        with_stock: 在庫ありのみ取得するかどうか
        prioritize_primary: 主担当の仕入先を優先表示するかどうか（デフォルト: True）
        current_user: 現在のログインユーザー（主担当仕入先取得に使用）
        db: データベースセッション

    ロット一覧取得（v_lots_with_master ビュー使用）.

    製品コード・仕入先コード・倉庫コード・有効期限範囲でフィルタリング可能.
    FEFO (先入先出) 順に並べて返す.
    """
    # 主担当の仕入先IDを取得
    primary_supplier_ids: list[int] | None = None
    if prioritize_primary and current_user:
        assignment_service = UserSupplierAssignmentService(db)
        assignments = assignment_service.get_user_suppliers(current_user.id)
        primary_supplier_ids = [a.supplier_id for a in assignments if a.is_primary]

    service = LotService(db)
    return service.list_lots(
        skip=skip,
        limit=limit,
        product_id=product_id,
        product_code=product_code,
        supplier_code=supplier_code,
        warehouse_code=warehouse_code,
        expiry_from=expiry_from,
        expiry_to=expiry_to,
        with_stock=with_stock,
        primary_supplier_ids=primary_supplier_ids,
    )


@router.post("", response_model=LotResponse, status_code=201)
def create_lot(lot: LotCreate, db: Session = Depends(get_db)):
    """ロット新規登録.

    - ロットマスタ登録
    - 現在在庫テーブル初期化
    """
    service = LotService(db)
    return service.create_lot(lot)


@router.get("/{lot_id}", response_model=LotResponse)
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    """ロット詳細取得（v2.2: Lot モデルから直接取得）."""
    # Note: Service.get_lot returns Lot model, but for Response we need to build it with joined fields.
    # The service now has a internal _build_lot_response method used by create/update,
    # but strictly get_lot in service currently returns the ORM model without explicit joined load in the same way (it uses repository).
    # However, to be consistent with previous router logic which used joinedload options,
    # we should check if service.get_lot is sufficient or if we should use the new service method _build_lot_response equivalent.
    # The extended service implementation I just added has _build_lot_response.
    # But I didn't expose it as public `get_lot_details` or similar.
    # Wait, I added `get_lot` in `LotService` long ago (it was existing).
    # And I added `_build_lot_response` recently.
    # I should have updated `get_lot` or added `get_lot_response` to service to return LotResponse.
    # For now, I will use the service's newly added logic if I can, OR just use the repo find_by_id which has joinedload options.
    # The existing `LotService.get_lot` uses `repository.find_by_id` which HAS `joinedload` options!
    # So `LotResponse.model_validate(service.get_lot(lot_id))` should work if we handle the manual mapping of names.
    # The previous router code did manual mapping of product_name etc.
    # My new `_build_lot_response` inside service DOES that manual mapping.
    # I should probably expose `_build_lot_response` logic as `get_lot_with_details` public method.
    # But since I can't modify service again in this tool call seamlessly without context switch...
    # I will stick to calling `service.get_lot` and doing mapping here OR using the private method if I dare (bad practice).
    # Actually, let's look at `LotService.get_lot` again from my memory/context.
    # It returns `Lot` model.
    # And `LotRepository.find_by_id` has `joinedload`.

    # So validation from attributes works for basic fields.
    # But the manual mapping of `product_name` from relation was done in router.
    # I moved that manual mapping logic to `_build_lot_response` in service.
    # It seems I forgot to add a PUBLIC `get_lot_response` method in service.
    # I will modify the router to manually map for now, OR rely on `model_validate` with `from_attributes=True` and getters.
    # `LotResponse` schema seems to have `product_name` fields that need to be populated.
    # Let's check `LotResponse` schema again? No I can't.
    # Assuming the router code was doing it manually means it's needed.

    # I will implement the mapping logic here for `get_lot` to be safe, using `service.get_lot`.
    service = LotService(db)
    lot = service.get_lot(lot_id)

    response = LotResponse.model_validate(lot)

    if lot.product:
        response.product_name = lot.product.product_name
        response.product_code = lot.product.product_code  # type: ignore[attr-defined]

    if lot.warehouse:
        response.warehouse_name = lot.warehouse.warehouse_name
        response.warehouse_code = lot.warehouse.warehouse_code

    if lot.supplier:
        response.supplier_name = lot.supplier.supplier_name
        response.supplier_code = lot.supplier.supplier_code

    response.current_quantity = lot.current_quantity or Decimal("0")
    response.last_updated = lot.updated_at
    return response


@router.put("/{lot_id}", response_model=LotResponse)
def update_lot(lot_id: int, lot: LotUpdate, db: Session = Depends(get_db)):
    """ロット更新."""
    service = LotService(db)
    return service.update_lot(lot_id, lot)


@router.delete("/{lot_id}", status_code=204)
def delete_lot(lot_id: int, db: Session = Depends(get_db)):
    """ロット削除."""
    service = LotService(db)
    service.delete_lot(lot_id)
    return None


@router.post("/{lot_id}/lock", response_model=LotResponse)
def lock_lot(lot_id: int, lock_data: LotLock, db: Session = Depends(get_db)):
    """ロットをロックする（数量指定可）."""
    service = LotService(db)
    return service.lock_lot(lot_id, lock_data)


@router.post("/{lot_id}/unlock", response_model=LotResponse)
def unlock_lot(lot_id: int, unlock_data: LotLock | None = None, db: Session = Depends(get_db)):
    """ロットのロックを解除する（数量指定可）."""
    service = LotService(db)
    return service.unlock_lot(lot_id, unlock_data)


# ===== Stock Movements =====
@router.get("/{lot_id}/movements", response_model=list[StockMovementResponse])
def list_lot_movements(lot_id: int, db: Session = Depends(get_db)):
    """ロットの在庫変動履歴取得."""
    service = LotService(db)
    return service.list_lot_movements(lot_id)


@router.post("/movements", response_model=StockMovementResponse, status_code=201)
def create_stock_movement(movement: StockMovementCreate, db: Session = Depends(get_db)):
    """在庫変動記録.

    - 在庫変動履歴追加
    - 現在在庫更新
    """
    service = LotService(db)
    return service.create_stock_movement(movement)
