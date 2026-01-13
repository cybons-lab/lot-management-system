# backend/app/api/routes/orders/orders_router.py
r"""受注エンドポイント（全修正版） I/O整形のみを責務とし、例外変換はグローバルハンドラに委譲.

【設計意図】受注ルーターの設計判断:

1. なぜルーター層が必要なのか
   理由: API層とサービス層の責務分離
   責務:
   - ルーター層: HTTP入出力の整形、認証、バリデーション
   - サービス層: ビジネスロジック、トランザクション管理
   メリット:
   - ビジネスロジックがHTTPから独立
   → テストが容易（HTTP不要でサービス単体テスト可能）
   - 再利用性向上（CLIツール、バッチ処理でもサービス再利用）

2. get_db() vs get_uow() の使い分け（L46, L104）
   理由: 読み取り専用 vs 更新系の明示的区別
   設計:
   - list_orders(), get_order(): get_db()
   → 読み取り専用、コミット不要
   - create_order(): get_uow()
   → 更新系、トランザクション管理が必要
   メリット:
   - 意図の明確化（読むだけか、書き込むか）
   - パフォーマンス最適化（読み取り専用は軽量）
   業務的意義:
   - 一覧表示: 高速レスポンス必要 → get_db()
   - 受注作成: 整合性が最優先 → get_uow()

3. prioritize_primary パラメータの設計（L45, L59, L68-70）
   理由: 営業担当の業務効率化
   背景:
   - 自動車部品商社: 営業担当が複数のサプライヤーを担当
   - 受注一覧: 全ての受注が混在表示
   → 自分の担当製品を含む受注を探すのが大変
   解決:
   - prioritize_primary=True（デフォルト）
   → 主担当サプライヤーの製品を含む受注を上位表示
   実装:
   - UserSupplierAssignmentService で主担当サプライヤーID取得
   - OrderService.get_orders() に primary_supplier_ids を渡す
   業務シナリオ:
   - 営業担当A: サプライヤー1, 2を主担当
   → 受注一覧の上位にサプライヤー1,2の製品を含む受注が表示される

4. current_user: オプショナル認証（L47）
   理由: 未ログイン時も受注一覧を表示可能
   設計:
   - get_current_user_optional: 認証トークンがあれば検証、なければNone
   → prioritize_primary機能は無効化（全受注を日付順表示）
   用途:
   - 管理画面: ログイン必須
   - 公開ダッシュボード: ログイン不要で受注一覧を表示
   トレードオフ:
   - セキュリティ vs 利便性
   → 受注一覧は機密性が高くないため、未ログインでも許容

5. なぜ例外変換をグローバルハンドラに委譲するのか（L2）
   理由: 例外ハンドリングの一元化
   設計:
   - ルーター: service.get_order_detail() を直接呼び出し
   → OrderNotFoundError が発生
   - グローバルハンドラ（app/core/errors.py）: 自動的に404レスポンスに変換
   メリット:
   - 各ルーターで try-except 不要
   → コードがシンプル
   - エラーレスポンスフォーマットが統一
   → 全エンドポイントで一貫したエラー構造

6. response_model の明示（L36, L85, L103）
   理由: OpenAPI仕様の自動生成とバリデーション
   設計:
   - response_model=list[OrderWithLinesResponse]
   → 戻り値の型を明示
   メリット:
   - Swagger UIで自動的にレスポンス構造を表示
   - Pydantic による自動バリデーション
   → サービス層が誤った形式を返すとエラー
   業務的意義:
   - フロントエンド開発者がAPI仕様を確認可能
   - 型安全性の保証

7. status_code=201 の明示（L103）
   理由: HTTP仕様への準拠
   設計:
   - POST /orders で受注作成 → 201 Created
   - GET /orders で一覧取得 → 200 OK（デフォルト）
   メリット:
   - RESTful API の標準プラクティスに従う
   → クライアント側で正しくステータスコードを判定可能
   業務的意義:
   - フロントエンド: status === 201 で作成成功を判定
   → 201以外は失敗として扱う

8. なぜ prefix=\"/orders\" を使うのか（L33）
   理由: ルーター単位でのパス管理
   設計:
   - router = APIRouter(prefix=\"/orders\")
   - @router.get(\"\") → GET /orders
   - @router.get(\"/{order_id}\") → GET /orders/{order_id}
   メリット:
   - パスの重複記述を削減
   - ルーター単位での整理（orders_router.py は /orders 以下を担当）
   main.py での登録:
   - app.include_router(router)
   → /api/orders にマウント

9. なぜ tags=[\"orders\"] を指定するのか（L33）
   理由: Swagger UIでのエンドポイントグルーピング
   用途:
   - Swagger UI: タグごとにエンドポイントを分類表示
   → \"orders\" タグの下に全ての受注エンドポイントをグループ化
   メリット:
   - API仕様の可読性向上
   - フロントエンド開発者が関連エンドポイントを探しやすい

10. limit のデフォルト100（L39）
    理由: ページネーションとパフォーマンス
    背景:
    - 受注データ: 数千〜数万件
    → 全件取得すると、レスポンスタイムが長い
    設計:
    - limit=100（デフォルト）
    → 1ページあたり100件まで
    - skip, limit でページング
    メリット:
    - API応答速度の向上
    - フロントエンドでの無限スクロール、ページネーション実装が可能
    業務的意義:
    - 受注一覧画面: 初回表示が高速
    → スクロールで追加読み込み
"""

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.services.allocations.actions import (
    create_manual_reservation,
    release_reservation,
)
from app.application.services.assignments.assignment_service import UserSupplierAssignmentService
from app.application.services.common.uow_service import UnitOfWork
from app.application.services.orders.order_service import OrderService
from app.infrastructure.persistence.models import Order, OrderLine, User
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)
from app.presentation.api.deps import get_db, get_uow
from app.presentation.api.routes.auth.auth_router import get_current_user, get_current_user_optional
from app.presentation.schemas.orders.orders_schema import (
    OrderCreate,
    OrderLineResponse,
    OrderWithLinesResponse,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderWithLinesResponse])
def list_orders(
    skip: int = 0,
    limit: int = 100,
    status: str | None = None,
    customer_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    order_type: str | None = None,
    prioritize_primary: bool = True,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """受注一覧取得（読み取り専用）.

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数（最大100件）
        status: ステータスフィルタ
        customer_code: 顧客コードフィルタ
        date_from: 受注日開始日フィルタ
        date_to: 受注日終了日フィルタ
        order_type: 受注種別フィルタ
        prioritize_primary: 主担当の仕入先を優先表示するかどうか（デフォルト: True）
        db: データベースセッション
        current_user: 現在のログインユーザー（主担当仕入先取得に使用、オプショナル）

    Returns:
        list[OrderWithLinesResponse]: 受注情報のリスト（明細含む）
    """
    # Get primary supplier IDs for sorting
    primary_supplier_ids: list[int] | None = None
    if prioritize_primary and current_user:
        assignment_service = UserSupplierAssignmentService(db)
        primary_supplier_ids = assignment_service.get_primary_supplier_ids(current_user.id)

    service = OrderService(db)
    return service.get_orders(
        skip=skip,
        limit=limit,
        status=status,
        customer_code=customer_code,
        date_from=date_from,
        date_to=date_to,
        order_type=order_type,
        primary_supplier_ids=primary_supplier_ids,
    )


@router.get("/{order_id}", response_model=OrderWithLinesResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """受注詳細取得（読み取り専用、明細含む）.

    Args:
        order_id: 受注ID
        db: データベースセッション

    Returns:
        OrderWithLinesResponse: 受注詳細情報（明細含む）

    Raises:
        HTTPException: 受注が存在しない場合（404）
    """
    service = OrderService(db)
    return service.get_order_detail(order_id)


@router.get("/lines", response_model=list[OrderLineResponse])
def list_order_lines(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    status: str | None = None,
    customer_code: str | None = None,
    product_code: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    order_type: str | None = None,
    db: Session = Depends(get_db),
):
    """受注明細一覧取得（フラット表示用）.

    Args:
        skip: スキップ件数
        limit: 取得件数
        status: ステータスフィルタ
        customer_code: 顧客コードフィルタ
        product_code: 製品コードフィルタ
        date_from: 納期開始日
        date_to: 納期終了日
        order_type: 受注種別フィルタ
        db: データベースセッション

    Returns:
        list[OrderLineResponse]: 受注明細リスト
    """
    service = OrderService(db)
    return service.get_order_lines(
        skip=skip,
        limit=limit,
        status=status,
        customer_code=customer_code,
        product_code=product_code,
        date_from=date_from,
        date_to=date_to,
        order_type=order_type,
    )


@router.post("", response_model=OrderWithLinesResponse, status_code=201)
def create_order(order: OrderCreate, uow: UnitOfWork = Depends(get_uow)):
    """受注作成.

    Args:
        order: 受注作成リクエストデータ
        uow: Unit of Work（トランザクション管理）

    Returns:
        OrderWithLinesResponse: 作成された受注情報（明細含む）

    Raises:
        HTTPException: 受注作成に失敗した場合
    """
    assert uow.session is not None
    service = OrderService(uow.session)
    return service.create_order(order)


@router.delete("/{order_id}/cancel", status_code=204)
def cancel_order(order_id: int, uow: UnitOfWork = Depends(get_uow)):
    """受注キャンセル."""
    assert uow.session is not None
    service = OrderService(uow.session)
    service.cancel_order(order_id)
    return None


class ManualAllocationItem(BaseModel):
    lot_id: int
    quantity: float


class ManualAllocationSavePayload(BaseModel):
    allocations: list[ManualAllocationItem]


@router.post("/{order_line_id}/allocations", status_code=200)
def save_manual_allocations(
    order_line_id: int, payload: ManualAllocationSavePayload, uow: UnitOfWork = Depends(get_uow)
):
    """
    手動引当保存 (確定) - UoWによるトランザクション保護版.

    既存の引当を一度クリアし、リクエストされた内容で再作成する（上書き保存）。
    全ての操作をUoWのトランザクションで実行し、エラー時は自動ロールバック。
    """
    assert uow.session is not None
    db = uow.session

    # 1. P3: 既存の予約を全てリリース（在庫を解放、commit無し）
    existing_reservations = (
        db.query(LotReservation)
        .filter(
            LotReservation.source_type == ReservationSourceType.ORDER,
            LotReservation.source_id == order_line_id,
            LotReservation.status != ReservationStatus.RELEASED,
        )
        .all()
    )
    for res in existing_reservations:
        release_reservation(db, res.id, commit_db=False)

    # 2. 新しい予約を作成（在庫を引き当てる、commit無し）
    created_ids = []
    for item in payload.allocations:
        if item.quantity <= 0:
            continue

        try:
            reservation = create_manual_reservation(
                db, order_line_id, item.lot_id, item.quantity, commit_db=False
            )
            created_ids.append(reservation.id)
        except ValueError as e:
            # P1: Preserve validation behavior (ValueError -> 422)
            # This allows frontend to show field-specific errors
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(e),
            )

    # 3. UoWがスコープ終了時に自動commit（成功時）/ rollback（例外時）
    db.flush()  # Ensure IDs are assigned

    # 4. 作成された予約をrefresh
    for res_id in created_ids:
        refreshed_res = db.get(LotReservation, res_id)
        if refreshed_res:
            db.refresh(refreshed_res)

    logger.info(f"Saved allocations for line {order_line_id}: {len(created_ids)} items")

    return {
        "success": True,
        "message": f"Allocations saved successfully. ({len(created_ids)} items)",
        "allocated_ids": created_ids,
    }


@router.post("/refresh-all-statuses", status_code=200)
def refresh_all_order_line_statuses(uow: UnitOfWork = Depends(get_uow)):
    """全受注明細および受注のステータスを再計算・更新.

    既存の allocations データに基づいて OrderLine.status と Order.status
    を正しい値に更新します。
    """
    assert uow.session is not None
    db = uow.session

    from app.application.services.allocations.utils import (
        update_order_allocation_status,
        update_order_line_status,
    )

    # 1. 全ての OrderLine のステータスを更新
    lines = db.query(OrderLine).all()
    updated_line_count = 0

    for line in lines:
        old_status = line.status
        update_order_line_status(db, line.id)
        db.flush()

        if line.status != old_status:
            updated_line_count += 1

    # 2. 全ての Order のステータスを更新

    orders = db.query(Order).all()
    updated_order_count = 0

    for order in orders:
        old_status = order.status
        update_order_allocation_status(db, order.id)
        db.flush()

        if order.status != old_status:
            updated_order_count += 1

    # UoWがスコープ終了時に自動commit
    logger.info(
        f"Refreshed {updated_line_count} order line statuses and "
        f"{updated_order_count} order statuses"
    )

    return {
        "success": True,
        "message": (f"Successfully refreshed {len(lines)} order lines and {len(orders)} orders"),
        "updated_line_count": updated_line_count,
        "updated_order_count": updated_order_count,
        "total_line_count": len(lines),
        "total_order_count": len(orders),
    }


@router.post("/{order_id}/lock")
def acquire_lock(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """受注の編集ロックを取得."""
    service = OrderService(db)
    result = service.acquire_lock(order_id, current_user.id)
    db.commit()
    return result


@router.delete("/{order_id}/lock")
def release_lock(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """受注の編集ロックを解放."""
    service = OrderService(db)
    result = service.release_lock(order_id, current_user.id)
    db.commit()
    return result
