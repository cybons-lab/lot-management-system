"""Manual reservation operations.

Handles manual allocation (Drag & Assign):
- Direct lot-to-order-line reservation
- Event dispatching for reservation creation

P3: Uses LotReservation exclusively.

【設計意図】手動引当（Drag & Assign）の設計判断:

1. なぜ手動引当が必要なのか
   理由: 自動引当（FEFO）では対応できない業務要件がある
   業務的背景:
   - 顧客指定ロット: 「このロットを優先的に使ってほしい」
   - 期限が近いロット: FEFO で選ばれない場合でも、意図的に使いたい
   - 品質検査中のロット: 検査完了後、特定の受注に割り当てたい
   → 自動引当だけでは柔軟性が不足
   解決:
   - Drag & Assign: フロントエンドでロットをドラッグして受注明細にドロップ
   → 営業担当者が手動で引当を作成

2. なぜ LotReservation のみを作成するのか（L41）
   理由: v3.0 でAllocation を廃止し、LotReservation に統一
   背景:
   - v2.x: Allocation（引当） + LotReservation（予約）の2テーブル
   - 問題: 2つのテーブルで同じデータを管理（重複）
   - v3.0: LotReservation のみに統一
   → シンプルな設計、データ不整合のリスク削減
   実装:
   - ReservationSourceType.ORDER: 受注引当
   - ReservationStatus.ACTIVE: 有効な引当

3. なぜ with_for_update() でロックするのか（L73）
   理由: 並行処理での二重引当を防止
   問題:
   - ユーザーA: ロットX（在庫50個）を引当
   - ユーザーB: 同時にロットX（在庫50個）を引当
   → 両方が「在庫あり」と判定 → 合計100個引当（実在庫は50個）
   解決:
   - with_for_update(): SELECT ... FOR UPDATE でロット行をロック
   → 先に処理したユーザーの引当が完了するまで、後のユーザーは待機
   → 在庫不足を正確に検出

4. なぜ EPSILON 許容誤差を使うのか（L59, L86）
   理由: 浮動小数点数の精度問題を回避
   問題:
   - Decimal("10.0") - Decimal("9.999999") = Decimal("0.000001")
   → 厳密な比較（< 0）では、微小な誤差で引当失敗
   解決:
   - EPSILON = Decimal("1e-6"): 0.000001の許容誤差
   - available + EPSILON < quantity: 実質的に同値なら許可
   業務影響:
   - 丸め誤差による引当失敗を防ぐ

5. なぜ commit_db パラメータがあるのか（L37）
   理由: バルク処理でのパフォーマンス最適化
   背景:
   - 1件ずつcommit: 10件の引当 → 10回のcommit（遅い）
   - バルク処理: 10件を一括処理 → 1回のcommit（速い）
   使い分け:
   - 単一引当: commit_db=True（デフォルト）
   - バルク処理: commit_db=False → 呼び出し側で最後にcommit
   実装:
   - commit_db=False: flush() のみ（IDを取得、まだcommitしない）
   → 呼び出し側がまとめてcommit

6. なぜイベントディスパッチを行うのか（L113-120）
   理由: 引当作成時のサイドエフェクトを疎結合で処理
   サイドエフェクト例:
   - 在庫アラートの更新: 「ロットXの在庫が10個以下になった」
   - メール通知: 「製品Aの引当が完了しました」
   - 監査ログ: 「ユーザーBが引当を作成しました」
   設計:
   - AllocationCreatedEvent をキューに追加
   → 別の非同期ワーカーが処理
   → サービス層のコードがシンプルに保たれる

7. なぜ flush() の後にステータス更新するのか（L104-107）
   理由: reservation.id を取得してから、関連エンティティを更新
   処理順序:
   - db.add(reservation): 予約をセッションに追加
   - db.flush(): DBに書き込み、reservation.id を取得
   - update_order_allocation_status(): 受注のステータスを更新
     → 「一部引当済み」or「全量引当済み」を判定
   - update_order_line_status(): 明細のステータスを更新
   重要:
   - flush() 前に reservation.id は None
   → ステータス更新ロジックが reservation.id を使う場合、先に flush() が必要

8. なぜ数量を Decimal に変換するのか（L61-64）
   理由: 型の一貫性と精度の保証
   入力:
   - quantity: float | Decimal | int（多様な型）
   変換:
   - Decimal(str(quantity)): 必ず Decimal に統一
   → 精度が保証される（浮動小数点数の誤差を回避）
   理由:
   - データベース: Numeric(15,3)（Decimal型）
   → 型の不一致を防ぐ

9. なぜ製品IDの一致を検証するのか（L80-83）
   理由: 業務ルール違反の検出
   問題:
   - ロットA: 製品P-001（タイヤ）
   - 明細X: 製品P-002（ブレーキパッド）
   → タイヤをブレーキパッドに引当（誤り）
   解決:
   - lot.product_id != line.product_id → ValueError
   → フロントエンドのバグや不正リクエストを検出

10. なぜ在庫不足を AllocationCommitError にするのか（L87-89）
    理由: 業務エラーとシステムエラーの区別
    エラー分類:
    - ValueError: プログラミングエラー（開発者の責任）
    - AllocationCommitError: 業務エラー（在庫不足、ステータス不正等）
    → フロントエンドでの表示を分ける
    業務影響:
    - AllocationCommitError: ユーザーに「在庫不足です」と表示
    - ValueError: ログに記録して開発者に通知
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.application.services.allocations.schemas import AllocationCommitError
from app.application.services.allocations.utils import (
    update_order_allocation_status,
    update_order_line_status,
)
from app.application.services.inventory.stock_calculation import get_available_quantity
from app.core.time_utils import utcnow
from app.infrastructure.persistence.models import Lot, OrderLine
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationSourceType,
    ReservationStatus,
)


def create_manual_reservation(
    db: Session,
    order_line_id: int,
    lot_id: int,
    quantity: float | Decimal,
    *,
    commit_db: bool = True,
) -> LotReservation:
    """手動予約作成 (Drag & Assign).

    P3: LotReservation のみを作成。Allocation は作成しない。

    Args:
        db: データベースセッション
        order_line_id: 受注明細ID
        lot_id: ロットID
        quantity: 予約数量
        commit_db: Trueの場合、処理完了後にcommitを実行

    Returns:
        LotReservation: 作成された予約オブジェクト

    Raises:
        AllocationCommitError: 予約に失敗した場合
        ValueError: パラメータが不正な場合
    """
    from app.domain.events import AllocationCreatedEvent, EventDispatcher

    EPSILON = Decimal("1e-6")

    if isinstance(quantity, float):
        quantity = Decimal(str(quantity))
    elif isinstance(quantity, int):
        quantity = Decimal(quantity)

    if quantity <= 0:
        raise ValueError("Reservation quantity must be positive")

    line = db.query(OrderLine).filter(OrderLine.id == order_line_id).first()
    if not line:
        raise ValueError(f"OrderLine {order_line_id} not found")

    lot = db.query(Lot).filter(Lot.id == lot_id).with_for_update().first()
    if not lot:
        raise ValueError(f"Lot {lot_id} not found")

    if lot.status != "active":
        raise AllocationCommitError(f"Lot {lot_id} is not active")

    if lot.product_id != line.product_id:
        raise ValueError(
            f"Product mismatch: Lot product {lot.product_id} != Line product {line.product_id}"
        )

    available = get_available_quantity(db, lot)
    if available + EPSILON < quantity:
        raise AllocationCommitError(
            f"Insufficient stock: required {quantity}, available {available}"
        )

    now = utcnow()

    reservation = LotReservation(
        lot_id=lot.id,
        source_type=ReservationSourceType.ORDER,
        source_id=line.id,
        reserved_qty=quantity,
        status=ReservationStatus.ACTIVE,
        created_at=now,
    )
    db.add(reservation)
    lot.updated_at = now

    db.flush()

    update_order_allocation_status(db, line.order_id)
    update_order_line_status(db, line.id)

    if commit_db:
        db.commit()
        db.refresh(reservation)

        event = AllocationCreatedEvent(
            allocation_id=reservation.id,  # P3: Use reservation ID
            order_line_id=order_line_id,
            lot_id=lot_id,
            quantity=quantity,
            allocation_type="soft",
        )
        EventDispatcher.queue(event)

    return reservation
