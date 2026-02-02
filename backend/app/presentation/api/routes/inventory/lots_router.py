"""ロットAPIルーター.

【設計意図】ロットルーターの設計判断:

1. なぜロット一覧でFEFOソートが必要なのか（L43-44）
   理由: 有効期限管理の基本原則
   業務的背景:
   - 自動車部品商社: 部品の有効期限管理が必須
   - FEFO (First Expiry First Out): 有効期限の早いものから使う
   → 期限切れロスを最小化
   設計:
   - 一覧表示でFEFO順にソート
   → ユーザーが手動引当する場合も、上から順に選べば自動的にFEFO
   業務的意義:
   - 在庫確認画面: 期限の近い在庫が上位表示
   → 優先的に使うべき在庫が一目瞭然

2. with_stock パラメータの設計（L36, L56, L81）
   理由: 在庫あり/なしの切り替え
   用途:
   - with_stock=True（デフォルト）: 在庫ありのみ表示
   → 引当可能なロットのみを表示
   - with_stock=False: 在庫ゼロも含めて表示
   → 過去の入庫履歴、出庫履歴の確認用
   業務シナリオ:
   - 引当画面: with_stock=True
   → 引当可能なロットのみ
   - 履歴確認画面: with_stock=False
   → 「このロットはいつ在庫ゼロになったか」を確認

3. prioritize_assigned による優先表示（L37, L57, L64-69）
   理由: 営業担当の業務効率化
   背景:
   - 自動車部品商社: 営業担当が複数のサプライヤーを担当
   - ロット一覧: 全サプライヤーのロットが混在
   → 自分の担当サプライヤーのロットを探すのが大変
   解決:
   - prioritize_assigned=True（デフォルト）
   → 主担当サプライヤーのロットを上位表示
   実装:
   - UserSupplierAssignmentService で is_assigned=True の割り当てを取得
   - LotService.list_lots() に assigned_supplier_ids を渡す
   → SQLのCASE式で優先順位をつけてソート
   業務シナリオ:
   - 営業担当A: サプライヤー1, 2を主担当
   → ロット一覧の上位にサプライヤー1,2のロットが表示される

4. current_user: オプショナル認証（L38）
   理由: 未ログイン時も一覧表示可能
   設計:
   - get_current_user_optional: 認証トークンがあれば検証、なければNone
   → prioritize_assigned機能は無効化（全ロットを日付順表示）
   用途:
   - 管理画面: ログイン必須
   - 公開在庫照会: ログイン不要でロット一覧を表示
   セキュリティ:
   - ロット情報は機密性が高くないため、未ログインでも許容
   → 個別のロット詳細は認証必須にすることで、セキュリティバランスを取る

5. expiry_from / expiry_to フィルタの設計（L34-35, L54-55）
   理由: 有効期限範囲での絞り込み
   用途:
   - 期限切れ間近の在庫検索
   → expiry_from=今日, expiry_to=7日後
   → 「1週間以内に期限切れになるロット」を抽出
   - 長期保管在庫の検索
   → expiry_from=6ヶ月後
   → 「6ヶ月以上保管可能なロット」を抽出
   業務シナリオ:
   - 月次棚卸し: 期限切れ間近の在庫を優先的に確認
   - 長期受注対応: 有効期限が長い在庫を確保

6. v_lots_with_master ビューの使用（L43）
   理由: 複数テーブルのJOINを1回で実行
   背景:
   - ロット情報: lots テーブル
   - 製品情報: products テーブル
   - 仕入先情報: suppliers テーブル
   - 倉庫情報: warehouses テーブル
   → APIレスポンスに全ての情報を含める必要がある
   解決:
   - v_lots_with_master ビュー: 4テーブルをJOINした結果を保持
   → サービス層は1回のクエリで全情報を取得
   メリット:
   - パフォーマンス向上（N+1問題を回避）
   - ビジネスロジックが簡潔

7. status_code=201 の明示（L86）
   理由: RESTful API の標準プラクティス
   設計:
   - POST /lots でロット作成 → 201 Created
   - GET /lots で一覧取得 → 200 OK（デフォルト）
   メリット:
   - クライアント側で正しくステータスコードを判定可能
   → status === 201 で作成成功

8. supplier_item_id と product_code の両対応（L30-31, L50-51）
   理由: クライアント側の利便性
   用途:
   - supplier_item_id: 内部ID（数値）
   → フロントエンドがIDを保持している場合
   - product_code: 製品コード（文字列）
   → OCRやCSVから読み取った製品コードで検索する場合
   業務シナリオ:
   - 受注明細から検索: supplier_item_id で検索
   - 手入力検索: product_code で検索（ユーザーは製品コードを覚えている）

9. limit のデフォルト100（L29）
   理由: ページネーションとパフォーマンス
   背景:
   - ロットデータ: 数千〜数万件
   → 全件取得すると、レスポンスタイムが長い
   設計:
   - limit=100（デフォルト）
   → 1ページあたり100件まで
   - skip, limit でページング
   メリット:
   - API応答速度の向上
   - フロントエンドでの無限スクロール、ページネーション実装が可能

10. なぜ get_db() を使うのか（L39）
    理由: 読み取り専用操作
    設計:
    - list_lots(): get_db()
    → 読み取り専用、コミット不要
    - create_lot(), update_lot(): get_db() でも動作可能
    → しかし、将来的に get_uow() に変更する可能性
    メリット:
    - 意図の明確化（読むだけか、書き込むか）
    - パフォーマンス最適化（読み取り専用は軽量）
"""

import logging
from dataclasses import dataclass
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.application.services.assignments.assignment_service import UserSupplierAssignmentService
from app.application.services.common.export_service import ExportService
from app.application.services.inventory.lot_service import LotService
from app.core.database import get_db
from app.infrastructure.persistence.models.auth_models import User
from app.presentation.api.routes.auth.auth_router import get_current_user, get_current_user_optional
from app.presentation.schemas.inventory.inventory_schema import (
    LotArchiveRequest,
    LotCreate,
    LotLock,
    LotResponse,
    LotUpdate,
    StockMovementCreate,
    StockMovementResponse,
)


router = APIRouter(prefix="/lots", tags=["lots"])
logger = logging.getLogger(__name__)


@dataclass
class LotExportRow:
    """ロットエクスポート用の軽量データクラス."""

    ロット番号: str
    先方品番: str
    製品名: str
    仕入先コード: str
    仕入先名: str
    倉庫コード: str
    倉庫名: str
    現在在庫: str
    引当済数量: str
    ロック数量: str
    単位: str
    入荷日: str
    有効期限: str
    ステータス: str
    検査ステータス: str
    ロック理由: str

    @classmethod
    def from_lot(cls, lot: LotResponse) -> "LotExportRow":
        """LotResponseからエクスポート行を生成."""
        # ステータスの日本語変換
        status_map = {
            "active": "有効",
            "depleted": "在庫切れ",
            "expired": "期限切れ",
            "quarantine": "隔離",
            "locked": "ロック中",
        }
        inspection_map = {
            "not_required": "不要",
            "pending": "検査待ち",
            "passed": "合格",
            "failed": "不合格",
        }

        return cls(
            ロット番号=lot.lot_number or "",
            先方品番=lot.product_code or "",
            製品名=lot.product_name or "",
            仕入先コード=lot.supplier_code or "",
            仕入先名=lot.supplier_name or "",
            倉庫コード=lot.warehouse_code or "",
            倉庫名=lot.warehouse_name or "",
            現在在庫=str(lot.current_quantity),
            引当済数量=str(lot.allocated_quantity),
            ロック数量=str(lot.locked_quantity),
            単位=lot.unit,
            入荷日=str(lot.received_date) if lot.received_date else "",
            有効期限=str(lot.expiry_date) if lot.expiry_date else "",
            ステータス=status_map.get(
                lot.status.value if lot.status else "", lot.status.value if lot.status else ""
            ),
            検査ステータス=inspection_map.get(
                lot.inspection_status or "", lot.inspection_status or ""
            ),
            ロック理由=lot.lock_reason or "",
        )


@router.get("/export/download")
def export_lots(
    supplier_item_id: int | None = None,
    product_code: str | None = None,
    supplier_code: str | None = None,
    warehouse_code: str | None = None,
    expiry_from: date | None = None,
    expiry_to: date | None = None,
    with_stock: bool = True,
    db: Session = Depends(get_db),
) -> Response:
    """ロット一覧をExcelファイルとしてエクスポート.

    Args:
        supplier_item_id: 製品ID（フィルタ）
        product_code: 製品コード（フィルタ）
        supplier_code: 仕入先コード（フィルタ）
        warehouse_code: 倉庫コード（フィルタ）
        expiry_from: 有効期限開始日（フィルタ）
        expiry_to: 有効期限終了日（フィルタ）
        with_stock: 在庫ありのみ取得するかどうか（デフォルト: True）
        db: データベースセッション

    Returns:
        Response: Excelファイル（application/vnd.openxmlformats-officedocument.spreadsheetml.sheet）
    """
    service = LotService(db)
    lots = service.list_lots(
        skip=0,
        limit=10000,  # エクスポート用に十分な件数を取得
        supplier_item_id=supplier_item_id,
        product_code=product_code,
        supplier_code=supplier_code,
        warehouse_code=warehouse_code,
        expiry_from=expiry_from,
        expiry_to=expiry_to,
        with_stock=with_stock,
        assigned_supplier_ids=None,
    )

    # Export rows - convert dataclass to dict
    rows_data = [row.__dict__ for row in [LotExportRow.from_lot(lot) for lot in lots]]
    return ExportService.export_to_excel(rows_data, "lots")


@router.get("", response_model=list[LotResponse])
def list_lots(
    skip: int = 0,
    limit: int = 100,
    supplier_item_id: int | None = None,
    product_code: str | None = None,
    supplier_code: str | None = None,
    warehouse_code: str | None = None,
    expiry_from: date | None = None,
    expiry_to: date | None = None,
    with_stock: bool = True,
    prioritize_assigned: bool = True,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """ロット一覧取得.

    v_lots_with_master ビューを使用してロット一覧を取得します。
    製品コード・仕入先コード・倉庫コード・有効期限範囲でフィルタリング可能で、
    FEFO (First Expiry First Out) 順に並べて返します。

    Args:
        skip: スキップ件数（ページネーション用）
        limit: 取得件数（最大100件）
        supplier_item_id: 製品ID（フィルタ）
        product_code: 製品コード（フィルタ）
        supplier_code: 仕入先コード（フィルタ）
        warehouse_code: 倉庫コード（フィルタ）
        expiry_from: 有効期限開始日（フィルタ）
        expiry_to: 有効期限終了日（フィルタ）
        with_stock: 在庫ありのみ取得するかどうか（デフォルト: True）
        prioritize_assigned: 担当の仕入先を優先表示するかどうか（デフォルト: True）
        current_user: 現在のログインユーザー（担当仕入先取得に使用、オプショナル）
        db: データベースセッション

    Returns:
        list[LotResponse]: ロット情報のリスト
    """
    # 担当仕入先IDを取得
    assigned_supplier_ids: list[int] | None = None
    if prioritize_assigned and current_user:
        assignment_service = UserSupplierAssignmentService(db)
        assignments = assignment_service.get_user_suppliers(current_user.id)
        assigned_supplier_ids = [a.supplier_id for a in assignments]

    service = LotService(db)
    return service.list_lots(
        skip=skip,
        limit=limit,
        supplier_item_id=supplier_item_id,
        product_code=product_code,
        supplier_code=supplier_code,
        warehouse_code=warehouse_code,
        expiry_from=expiry_from,
        expiry_to=expiry_to,
        with_stock=with_stock,
        assigned_supplier_ids=assigned_supplier_ids,
    )


@router.post("", response_model=LotResponse, status_code=201)
def create_lot(lot: LotCreate, db: Session = Depends(get_db)):
    """ロット新規登録.

    ロットマスタへの登録と現在在庫テーブルの初期化を行います。

    Args:
        lot: ロット作成リクエストデータ
        db: データベースセッション

    Returns:
        LotResponse: 作成されたロット情報

    Raises:
        HTTPException: ロット作成に失敗した場合
    """
    service = LotService(db)
    return service.create_lot(lot)


@router.get("/{lot_id}", response_model=LotResponse)
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    """ロット詳細取得.

    指定されたIDのロット情報を取得します（v2.2: Lot モデルから直接取得）。

    Args:
        lot_id: ロットID
        db: データベースセッション

    Returns:
        LotResponse: ロット詳細情報

    Raises:
        HTTPException: ロットが存在しない場合（404）
    """
    # Use generic get_lot_details from service which handles VLotDetails join logic consistently
    service = LotService(db)
    return service.get_lot_details(lot_id)


@router.put("/{lot_id}", response_model=LotResponse)
def update_lot(lot_id: int, lot: LotUpdate, db: Session = Depends(get_db)):
    """ロット更新.

    Args:
        lot_id: ロットID
        lot: ロット更新リクエストデータ
        db: データベースセッション

    Returns:
        LotResponse: 更新されたロット情報

    Raises:
        HTTPException: ロットが存在しない場合（404）または更新に失敗した場合
    """
    service = LotService(db)
    return service.update_lot(lot_id, lot)


@router.delete("/{lot_id}", status_code=403)
def delete_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # M-04 Fix: 認証必須
):
    """ロット削除 (無効化).

    ロットの物理削除はポリシーにより禁止されています。
    在庫調整には /api/lots/{lot_id}/adjustment エンドポイントを使用してください。

    Note:
        M-04 Fix: 認証チェックを追加。未認証ユーザーは401を返す。
    """
    # lot_id, current_user は使用しないが、認証ログのために必要
    _ = lot_id, db, current_user
    from fastapi import HTTPException

    raise HTTPException(
        status_code=403,
        detail={
            "error": "LOT_DELETE_FORBIDDEN",
            "message": "ロットの物理削除は禁止されています。在庫調整機能を使用してください。",
            "guidance": "POST /api/inventory/adjustments を使用して在庫を調整してください。",
        },
    )


@router.post("/{lot_id}/lock", response_model=LotResponse)
def lock_lot(lot_id: int, lock_data: LotLock, db: Session = Depends(get_db)):
    """ロットをロックする（数量指定可）.

    Args:
        lot_id: ロットID
        lock_data: ロックデータ（数量、理由等）
        db: データベースセッション

    Returns:
        LotResponse: ロック後のロット情報

    Raises:
        HTTPException: ロットが存在しない場合（404）またはロックに失敗した場合
    """
    service = LotService(db)
    return service.lock_lot(lot_id, lock_data)


@router.post("/{lot_id}/unlock", response_model=LotResponse)
def unlock_lot(lot_id: int, unlock_data: LotLock | None = None, db: Session = Depends(get_db)):
    """ロットのロックを解除する（数量指定可）.

    Args:
        lot_id: ロットID
        unlock_data: ロック解除データ（数量指定等、省略可）
        db: データベースセッション

    Returns:
        LotResponse: ロック解除後のロット情報

    Raises:
        HTTPException: ロットが存在しない場合（404）またはロック解除に失敗した場合
    """
    service = LotService(db)
    return service.unlock_lot(lot_id, unlock_data)


@router.patch("/{lot_id}/archive", response_model=LotResponse)
def archive_lot(
    lot_id: int,
    request: LotArchiveRequest | None = None,
    db: Session = Depends(get_db),
    # Add permission check
    current_user: User = Depends(get_current_user),
) -> Any:
    """Archive a lot with optional confirmation.

    For lots with remaining inventory, lot_number confirmation is required
    in the request body to prevent accidental archiving.

    Archived lots are excluded from default list views but remain in the database.

    Args:
        lot_id: ロットID
        request: アーカイブリクエスト（在庫がある場合はlot_number必須）
        db: データベースセッション
        current_user: 現在のログインユーザー（権限チェック用）

    Returns:
        LotResponse: アーカイブされたロット情報

    Raises:
        HTTPException: ロット番号不一致または在庫があるのに確認なし
    """
    logger.info(
        "Lot archive request received",
        extra={
            "lot_id": lot_id,
            "user_id": current_user.id,
            "username": current_user.username,
            "has_confirmation": request is not None and request.lot_number is not None,
        },
    )
    service = LotService(db)
    confirmation_lot_number = request.lot_number if request else None
    return service.archive_lot(lot_id, confirmation_lot_number)


# ===== Stock Movements =====
@router.get("/{lot_id}/movements", response_model=list[StockMovementResponse])
def list_lot_movements(lot_id: int, db: Session = Depends(get_db)):
    """ロットの在庫変動履歴取得.

    Args:
        lot_id: ロットID
        db: データベースセッション

    Returns:
        list[StockMovementResponse]: 在庫変動履歴のリスト

    Raises:
        HTTPException: ロットが存在しない場合（404）
    """
    service = LotService(db)
    return service.list_lot_movements(lot_id)


@router.post("/movements", response_model=StockMovementResponse, status_code=201)
def create_stock_movement(movement: StockMovementCreate, db: Session = Depends(get_db)):
    """在庫変動記録.

    在庫変動履歴の追加と現在在庫の更新を行います。

    Args:
        movement: 在庫変動データ
        db: データベースセッション

    Returns:
        StockMovementResponse: 記録された在庫変動情報

    Raises:
        HTTPException: 在庫変動記録に失敗した場合
    """
    service = LotService(db)
    return service.create_stock_movement(movement)
