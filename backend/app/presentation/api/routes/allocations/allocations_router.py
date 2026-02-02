r"""引当APIルーター.

【設計意図】引当ルーターの設計判断:

1. なぜ preview と commit を分離するのか（L68, L101）
   理由: Two-Phase Commit パターン
   業務的背景:
   - 自動車部品商社: 引当実行前に結果を確認したい
   → 「期限の近いロットから引当されるか」を事前確認
   設計:
   - Phase 1: preview_allocation() - 引当シミュレーション
   → 実際のデータベース更新なし、計画のみ返す
   - Phase 2: commit_allocation() - 引当確定
   → LotReservation レコードを作成、在庫を予約
   メリット:
   - ユーザーが結果を確認してから実行
   - 誤った引当の防止（「意図しないロットから引当された」を回避）

2. _map_fefo_preview() ヘルパーの設計（L37-65）
   理由: 内部モデルとAPIスキーマの変換を一元化
   変換内容:
   - FefoPreviewResult（サービス層） → FefoPreviewResponse（APIスキーマ）
   - FefoLinePlan → FefoLineAllocation
   - FefoLotPlan → FefoLotAllocation
   メリット:
   - 変換ロジックの重複を避ける
   - preview と commit の両方で同じ変換を使用
   設計原則:
   - ルーター層: データ変換のみ
   - サービス層: ビジネスロジック
   → 責務の明確な分離

3. なぜ product_group_id or 0 としているのか（L54）
   理由: Pydantic スキーマの型安全性
   問題:
   - line_plan.product_group_id が None の可能性
   - FefoLineAllocation.product_group_id: int（NonNullable）
   → None を渡すと Pydantic バリデーションエラー
   解決:
   - product_group_id or 0: None の場合は 0 を返す
   → 型エラー回避
   業務的意義:
   - product_group_id=0 は「製品未設定」を意味
   → フロントエンドで警告表示

4. manual_allocate() の drag-assign エンドポイント（L146）
   理由: UIでのドラッグ&ドロップ操作
   業務フロー:
   - ユーザーが画面でロットを受注明細にドラッグ
   → POST /drag-assign で手動引当を作成
   設計:
   - 自動引当（FEFO）とは別のエンドポイント
   → 手動引当は即座に確定（preview不要）
   業務シナリオ:
   - 特定のロットを特定の受注に割り当てたい
   → 自動引当では意図したロットが選ばれない場合

5. confirm_allocation() の設計（L193）
   理由: Soft → Hard の状態遷移
   背景:
   - Soft Allocation（仮引当）: 在庫を予約するが、まだSAP未連携
   - Hard Allocation（本引当）: SAP連携済み、確定引当
   処理:
   - PATCH /{allocation_id}/confirm
   → ReservationStatus.TEMPORARY → ReservationStatus.ACTIVE
   業務的意義:
   - 営業担当が引当内容を確認後、「確定」ボタンを押す
   → SAP連携バッチが実行される前に、社内で引当を確定

6. 例外ハンドリングの設計（L93-98, L136-143, L178-190）
   理由: エラーの適切な分類とHTTPステータスコード変換
   パターン:
   - ValueError("not found"): 404 Not Found
   - ValueError("insufficient"): 409 Conflict（在庫不足）
   - AllocationCommitError: 400 Bad Request
   - その他の例外: グローバルハンドラに委譲
   メリット:
   - クライアント側で適切なエラーハンドリング可能
   → 404 はリトライ不要、409 は在庫不足メッセージ表示

7. get_available_quantity() の呼び出し（L164）
   理由: 手動引当後の最新在庫数を返す
   設計:
   - reservation を作成後、lot の available_qty を再計算
   → current_quantity - reserved_quantity - locked_quantity
   用途:
   - フロントエンドで「残り在庫: XX個」と表示
   → ユーザーが次の引当を判断する材料

8. db.refresh(reservation) の重要性（L162）
   理由: リレーションのロード
   問題:
   - create_manual_reservation() の戻り値
   → reservation オブジェクトのリレーション（lot等）が未ロード
   解決:
   - db.refresh(reservation)
   → リレーションを明示的にロード
   → reservation.lot にアクセス可能
   用途:
   - lot.lot_number, lot.expiry_date 等をレスポンスに含める

9. current_user: 認証必須（L72, L105, L150, L198）
   理由: 引当操作は機密性が高い
   背景:
   - 引当 = 在庫の予約
   → 誰が引当を実行したかの記録が必要（監査証跡）
   設計:
   - Depends(AuthService.get_current_user)
   → 認証トークンが無効な場合、401 Unauthorized
   業務的意義:
   - 「誰がこの引当を作成したか」を記録
   → トラブル時に責任を明確化

10. status=\"preview\" の意味（L175）
    理由: フロントエンドでの状態表示
    用途:
    - 手動引当作成後、まだ「仮」の状態
    → フロントエンドで「仮引当」と表示
    実際のステータス:
    - LotReservation.status = ReservationStatus.TEMPORARY
    → しかし、APIレスポンスでは \"preview\" という文字列
    設計:
    - APIスキーマとドメインモデルの分離
    → APIはクライアントに優しい表現を使う
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.application.services.allocations import actions, cancel, fefo
from app.application.services.allocations.schemas import (
    AllocationCommitError,
    AllocationNotFoundError,
    InsufficientStockError,
)
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.core.database import get_db
from app.infrastructure.external.sap_gateway import MockSapGateway, get_sap_gateway
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import (
    get_current_user,
    get_current_user_optional,
)
from app.presentation.schemas.allocations.allocations_schema import (
    AllocationCommitRequest,
    AllocationCommitResponse,
    BulkAutoAllocateRequest,
    BulkAutoAllocateResponse,
    BulkCancelRequest,
    BulkCancelResponse,
    FefoLineAllocation,
    FefoLotAllocation,
    FefoPreviewRequest,
    FefoPreviewResponse,
    HardAllocationBatchConfirmRequest,
    HardAllocationBatchConfirmResponse,
    HardAllocationConfirmRequest,
    HardAllocationConfirmResponse,
    ManualAllocationRequest,
    ManualAllocationResponse,
    ReservationCancelRequest,
    ReservationCancelResponse,
)


router = APIRouter()
logger = logging.getLogger(__name__)


def _map_fefo_preview(result) -> FefoPreviewResponse:
    """Map internal FefoPreviewResult to FefoPreviewResponse schema."""
    lines = []
    for line_plan in result.lines:
        allocations = [
            FefoLotAllocation(
                lot_id=plans.lot_id,
                lot_number=plans.lot_number,
                allocated_quantity=plans.allocate_qty,
                expiry_date=plans.expiry_date,
                received_date=plans.receipt_date,
            )
            for plans in line_plan.allocations
        ]
        lines.append(
            FefoLineAllocation(
                order_line_id=line_plan.order_line_id,
                product_group_id=line_plan.product_group_id or 0,  # Handle None safety
                order_quantity=line_plan.required_qty,  # Mapped from required_qty
                already_allocated_quantity=line_plan.already_allocated_qty,
                allocations=allocations,
                warnings=line_plan.warnings,
            )
        )
    return FefoPreviewResponse(
        order_id=result.order_id,
        lines=lines,
        warnings=result.warnings,
    )


@router.post("/preview", response_model=FefoPreviewResponse)
def preview_allocation(
    request: FefoPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FefoPreviewResponse:
    """FEFO引当プレビュー.

    指定された受注に対してFEFO（先入先出）アルゴリズムで
    自動引当をシミュレーションし、結果をプレビュー表示します。

    Args:
        request: プレビューリクエスト（受注ID含む）
        db: データベースセッション
        current_user: 現在のログインユーザー（認証必須）

    Returns:
        FefoPreviewResponse: 引当プレビュー結果（各明細の引当候補ロット情報）

    Raises:
        HTTPException: 受注が見つからない場合（404）またはバリデーションエラー（400）
    """
    try:
        result = fefo.preview_fefo_allocation(db, request.order_id)
        return _map_fefo_preview(result)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except SQLAlchemyError as e:
        logger.exception("Database error while previewing allocation.")
        raise HTTPException(status_code=500, detail="Database error") from e


@router.post("/commit", response_model=AllocationCommitResponse)
def commit_allocation(
    request: AllocationCommitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AllocationCommitResponse:
    """FEFO引当確定.

    プレビューした引当結果を確定し、ロット予約を作成します。

    Args:
        request: 引当確定リクエスト（受注ID含む）
        db: データベースセッション
        current_user: 現在のログインユーザー（認証必須）

    Returns:
        AllocationCommitResponse: 引当確定結果（作成された予約ID等）

    Raises:
        HTTPException: 受注が見つからない、在庫不足、または確定に失敗した場合
    """
    try:
        result = actions.commit_fefo_reservation(db, request.order_id)

        # Map internal result to schema
        created_ids = [a.id for a in result.created_reservations]
        preview_response = _map_fefo_preview(result.preview)

        return AllocationCommitResponse(
            order_id=request.order_id,
            created_allocation_ids=created_ids,
            preview=preview_response,
            status="committed",
            message="Commit successful",
        )
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except SQLAlchemyError as e:
        logger.exception("Database error while committing allocation.")
        raise HTTPException(status_code=500, detail="Database error") from e


@router.post("/drag-assign", response_model=ManualAllocationResponse)
def manual_allocate(
    request: ManualAllocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ManualAllocationResponse:
    """Manual allocation (Drag & Assign)."""
    try:
        reservation = actions.create_manual_reservation(
            db,
            request.order_line_id,
            request.lot_id,
            float(request.allocated_quantity),
        )

        # Ensure relationships are loaded for response
        db.refresh(reservation)
        lot = reservation.lot_receipt
        available_qty = get_available_quantity(db, lot)

        return ManualAllocationResponse(
            id=reservation.id,
            order_line_id=reservation.source_id or 0,
            lot_id=reservation.lot_id or 0,
            lot_number=lot.lot_number or "" if lot else "",
            allocated_quantity=reservation.reserved_qty,
            available_quantity=available_qty,
            product_group_id=lot.product_group_id if lot else 0,
            expiry_date=lot.expiry_date if lot else None,
            status="preview",
            message="Reservation created",
        )
    except ValueError as e:
        err_msg = str(e).lower()
        if "product mismatch" in err_msg:
            raise HTTPException(status_code=404, detail=str(e))
        if "insufficient" in err_msg:
            raise HTTPException(status_code=409, detail=str(e))
        if "not found" in err_msg:
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except SQLAlchemyError as e:
        logger.exception("Database error while creating manual allocation.")
        raise HTTPException(status_code=500, detail="Database error") from e


@router.patch("/{allocation_id}/confirm", response_model=HardAllocationConfirmResponse)
def confirm_allocation(
    allocation_id: int,
    request: HardAllocationConfirmRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HardAllocationConfirmResponse:
    """Confirm allocation (Soft to Hard)."""
    # Check for Mock usage
    if isinstance(get_sap_gateway(), MockSapGateway):
        response.headers["X-Mock-Status"] = "true"

    try:
        # returns confirmed reservation
        confirmed_res = actions.confirm_reservation(
            db,
            allocation_id,
            confirmed_by=request.confirmed_by,
            quantity=request.quantity,
        )

        # status is stored as string in DB, not Enum
        status_str = (
            confirmed_res.status.value
            if hasattr(confirmed_res.status, "value")
            else confirmed_res.status
        )
        return HardAllocationConfirmResponse(
            id=confirmed_res.id,
            order_line_id=confirmed_res.source_id or 0,
            lot_id=confirmed_res.lot_id or 0,
            allocated_quantity=confirmed_res.reserved_qty,
            allocation_type="hard" if status_str == "confirmed" else "soft",
            status="allocated",
            confirmed_at=confirmed_res.confirmed_at or confirmed_res.updated_at,  # type: ignore[arg-type]
            confirmed_by=confirmed_res.confirmed_by,
        )
    except ValueError as e:
        err_msg = str(e).lower()
        if "not found" in err_msg:
            raise HTTPException(
                status_code=404, detail={"error": "ALLOCATION_NOT_FOUND", "message": str(e)}
            )
        if "already confirmed" in err_msg:
            raise HTTPException(
                status_code=400, detail={"error": "ALREADY_CONFIRMED", "message": str(e)}
            )
        if "insufficient" in err_msg:
            raise HTTPException(
                status_code=409, detail={"error": "INSUFFICIENT_STOCK", "message": str(e)}
            )
        raise HTTPException(status_code=400, detail=str(e))
    except AllocationCommitError as e:
        # Map known error codes
        if getattr(e, "error_code", "") == "ALREADY_CONFIRMED":
            raise HTTPException(
                status_code=400, detail={"error": "ALREADY_CONFIRMED", "message": str(e)}
            )
        if getattr(e, "error_code", "") == "LOT_NOT_FOUND":
            raise HTTPException(
                status_code=404, detail={"error": "LOT_NOT_FOUND", "message": str(e)}
            )

        raise HTTPException(status_code=400, detail=str(e))
    except AllocationNotFoundError as e:
        raise HTTPException(
            status_code=404, detail={"error": "RESERVATION_NOT_FOUND", "message": str(e)}
        )
    except InsufficientStockError as e:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "INSUFFICIENT_STOCK",
                "message": str(e),
                "lot_id": e.lot_id,
                "lot_number": e.lot_number,
                "required": e.required,
                "available": e.available,
            },
        )


@router.post("/confirm-batch", response_model=HardAllocationBatchConfirmResponse)
def confirm_allocations_batch(
    request: HardAllocationBatchConfirmRequest,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HardAllocationBatchConfirmResponse:
    """Batch confirm allocations."""
    # Check for Mock usage
    if isinstance(get_sap_gateway(), MockSapGateway):
        response.headers["X-Mock-Status"] = "true"

    # returns (confirmed_ids, failed_items)
    confirmed_ids, failed_items = actions.confirm_reservations_batch(
        db,
        request.allocation_ids,
        confirmed_by=request.confirmed_by,
    )

    from app.presentation.schemas.allocations.allocations_schema import (
        HardAllocationBatchFailedItem,
    )

    failed_items_typed = [
        HardAllocationBatchFailedItem(
            id=item["id"],
            error=item["error"],
            message=item["message"],
        )
        for item in failed_items
    ]

    return HardAllocationBatchConfirmResponse(confirmed=confirmed_ids, failed=failed_items_typed)


@router.delete("/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel allocation."""
    try:
        actions.release_reservation(db, allocation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except AllocationCommitError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bulk-cancel", response_model=BulkCancelResponse)
def bulk_cancel(
    request: BulkCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BulkCancelResponse:
    """Bulk cancel allocations."""
    cancelled, failed = actions.bulk_release_reservations(db, request.allocation_ids)

    msg = f"Cancelled {len(cancelled)} allocations"
    if failed:
        msg += f", failed {len(failed)}"

    return BulkCancelResponse(cancelled_ids=cancelled, failed_ids=failed, message=msg)


@router.post("/bulk-auto-allocate", response_model=BulkAutoAllocateResponse)
async def bulk_auto_allocate(
    request: BulkAutoAllocateRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> BulkAutoAllocateResponse:
    """Group-based bulk auto-allocation using FEFO strategy.

    Can filter by product, customer, delivery_place, and order_type.
    """
    try:
        result = actions.auto_reserve_bulk(
            db,
            supplier_item_id=request.product_group_id,
            customer_id=request.customer_id,
            delivery_place_id=request.delivery_place_id,
            order_type=request.order_type,
            skip_already_reserved=request.skip_already_allocated,
        )
        # Helper string construction moved to logic or kept here if simple
        # result keys: processed_lines, reserved_lines, total_reservations, skipped_lines, failed_lines
        result["message"] = (
            f"処理数: {result['processed_lines']}件, "
            f"引当数: {result['reserved_lines']}件, "
            f"作成: {result['total_reservations']}ロット"
        )
        # Map result keys to BulkAutoAllocateResponse schema (allocated_lines, total_allocations)
        return BulkAutoAllocateResponse(
            processed_lines=result["processed_lines"],
            allocated_lines=result["reserved_lines"],
            total_allocations=result["total_reservations"],
            skipped_lines=result.get("skipped_lines", 0),
            message=result["message"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except SQLAlchemyError as e:
        logger.exception("Database error while running bulk auto allocation.")
        raise HTTPException(status_code=500, detail="Database error") from e


@router.post("/{allocation_id}/cancel", response_model=ReservationCancelResponse)
def cancel_confirmed_allocation(
    allocation_id: int,
    request: ReservationCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReservationCancelResponse:
    """CONFIRMED予約を取消（反対仕訳方式）.

    SAP連携後のCONFIRMED予約を取消す。
    stock_historyにALLOCATION_RELEASEトランザクションを記録し、
    予約ステータスをRELEASEDに変更する。

    Args:
        allocation_id: 予約ID
        request: 取消リクエスト（理由、メモ、実行者）
        db: データベースセッション
        current_user: 現在のログインユーザー（認証必須）

    Returns:
        ReservationCancelResponse: 取消後の予約情報

    Raises:
        HTTPException: 予約が見つからない（404）、不正な状態遷移（400）
    """
    try:
        reservation = cancel.cancel_confirmed_reservation(
            db,
            allocation_id,
            cancel_reason=request.reason,
            cancel_note=request.note,
            cancelled_by=request.cancelled_by,
        )

        # Get lot info for response
        lot_number = None
        if reservation.lot_receipt:
            lot_number = reservation.lot_receipt.lot_number

        # Get cancel reason label
        cancel_reason_label = cancel.ReservationCancelReason.LABELS.get(
            reservation.cancel_reason or "", None
        )

        return ReservationCancelResponse(
            id=reservation.id,
            lot_id=reservation.lot_id,
            lot_number=lot_number,
            reserved_quantity=reservation.reserved_qty,
            status="released",
            cancel_reason=reservation.cancel_reason,
            cancel_reason_label=cancel_reason_label,
            cancel_note=reservation.cancel_note,
            cancelled_by=reservation.cancelled_by,
            released_at=reservation.released_at,
            message="Reservation cancelled successfully",
        )
    except AllocationNotFoundError as e:
        raise HTTPException(
            status_code=404, detail={"error": "RESERVATION_NOT_FOUND", "message": str(e)}
        )
    except AllocationCommitError as e:
        error_code = getattr(e, "error_code", "CANCELLATION_FAILED")
        if error_code == "INVALID_STATE_TRANSITION":
            raise HTTPException(
                status_code=400,
                detail={"error": "INVALID_STATE_TRANSITION", "message": str(e)},
            )
        raise HTTPException(status_code=400, detail={"error": error_code, "message": str(e)})
