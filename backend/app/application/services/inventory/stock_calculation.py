"""Stock calculation helpers using lot_reservations.

This module provides helper functions to calculate available stock dynamically
from lot_reservations instead of relying on the deprecated allocated_quantity column.

【設計意図】在庫計算サービスの設計判断:

1. なぜ利用可能数量を動的に計算するのか
   理由: 予約状態の変化をリアルタイムに反映
   背景:
   - v2.x: Lot.allocated_quantity カラムで静的管理
   → 予約追加・解放時に手動更新が必要
   → 更新漏れやトランザクション競合のリスク
   - v3.x: lot_reservations テーブルから動的計算
   → 予約の追加・削除時に自動的に反映
   → データ整合性の向上

2. なぜProvisional（ACTIVE）予約を除外するのか（L59-83）
   理由: 柔軟な受注対応（オーバーブッキング）を許容
   業務要件:
   - ACTIVE状態: 社内確定だが、SAP未登録の仮予約
   - 物理在庫が不足していても、緊急受注を受け付けたい
   → 後で在庫調達・納期調整する運用
   トレードオフ:
   - 利点: SAP連携遅延が新規受注に影響しない
   - リスク: 実在庫を超える予約が可能
   → 定期的な在庫確認と発注点管理でカバー

3. 利用可能数量の計算式（L87-94）
   理由: 3つの要素を考慮した正確な計算
   計算式:
   - available = current_quantity - reserved_quantity - locked_quantity
   要素:
   - current_quantity: 物理在庫（入荷・出荷・調整の結果）
   - reserved_quantity: 確定予約数量（CONFIRMED のみ）
   - locked_quantity: 品質検査中・顧客専用在庫
   業務的意義:
   - 新規引当可能な数量を正確に把握
   - 在庫不足アラートの基準

4. Decimal 型の使用（L7, L19, L26等）
   理由: 数量計算の精度保証
   設計:
   - float: 0.1 + 0.2 = 0.30000000000000004（誤差）
   - Decimal: 十進数を正確に表現
   業務影響:
   - 在庫数量の計算誤差を防止
   - 監査ログで正確な数量を記録

5. COALESCE の使用理由（L26, L43）
   理由: 予約が0件の場合のNULL処理
   設計:
   - SUM(reserved_qty): 予約なし → NULL
   - COALESCE(..., 0): NULL → 0 に変換
   → ゼロ除算エラー防止、計算の簡潔性

6. get_confirmed_reserved_quantity() の設計（L19-33）
   理由: 確定予約数量のみを集計
   フィルタ条件:
   - status == CONFIRMED
   → ACTIVE（仮予約）は除外
   → RELEASED（解放済み）は除外
   用途:
   - 利用可能数量の計算基準
   - SAP連携済みの確定数量

7. get_provisional_quantity() の設計（L36-50）
   理由: 仮予約数量をUI表示用に集計
   フィルタ条件:
   - status == ACTIVE
   用途:
   - ダッシュボードでの仮予約表示
   - 「物理在庫 - 確定予約 - 仮予約」の可視化
   → 実質的な在庫余力の把握

8. get_allocatable_quantity() の設計（L108-116）
   理由: ロック在庫を考慮しない引当可能数量
   計算式:
   - allocatable = current_quantity - reserved_quantity
   → locked_quantity を含む
   用途:
   - 特別な理由でロック在庫も引当対象とする場合
   - 品質検査完了見込みで事前引当

9. reserved_quantity_subquery() の設計（L120-138）
   理由: SQLクエリでの効率的な集計
   使用例:
   ```python
   reserved_subq = reserved_quantity_subquery(db)
   query = db.query(Lot, func.coalesce(reserved_subq.c.reserved_qty, 0))
       .outerjoin(reserved_subq, Lot.id == reserved_subq.c.lot_id)
   ```
   メリット:
   - 複数ロットの予約数量を1回のクエリで取得
   - N+1問題の防止
   - パフォーマンス向上

10. ヘルパー関数の設計原則
    理由: ロジックの一元管理と再利用性
    設計:
    - 各関数は単一責任（SRP）
    - テスト容易性（純粋関数に近い）
    - 命名の明確性（get_available_quantity, get_confirmed_reserved_quantity）
    メリット:
    - 利用可能数量の計算ロジックが1箇所に集約
    - バグ修正時の影響範囲が明確
    - リポジトリ層から呼び出し可能
"""

from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import LotReceipt
from app.infrastructure.persistence.models.lot_reservations_model import (
    LotReservation,
    ReservationStatus,
)


def get_confirmed_reserved_quantity(db: Session, lot_id: int) -> Decimal:
    """Get total CONFIRMED reserved quantity for a lot from lot_reservations.

    Only confirmed reservations affect Available Qty (per §1.2 invariant).
    Provisional (ACTIVE) reservations do NOT reduce Available Qty.
    """
    result = (
        db.query(func.coalesce(func.sum(LotReservation.reserved_qty), Decimal(0)))
        .filter(
            LotReservation.lot_id == lot_id,
            LotReservation.status == ReservationStatus.CONFIRMED,
        )
        .scalar()
    )
    return Decimal(result) if result else Decimal(0)


def get_provisional_quantity(db: Session, lot_id: int) -> Decimal:
    """Get total provisional (ACTIVE) reserved quantity for a lot.

    This is for UI display purposes only. Provisional reservations
    do NOT affect Available Qty calculations.
    """
    result = (
        db.query(func.coalesce(func.sum(LotReservation.reserved_qty), Decimal(0)))
        .filter(
            LotReservation.lot_id == lot_id,
            LotReservation.status == ReservationStatus.ACTIVE,
        )
        .scalar()
    )
    return Decimal(result) if result else Decimal(0)


def get_reserved_quantity(db: Session, lot_id: int) -> Decimal:
    """Get total reserved quantity for a lot (Confirmed ONLY).

    Used for Reservation Validation (Loose availability).
    Calculates `current - confirmed - locked`.

    【重要な設計判断】なぜProvisional（ACTIVE）を除外するのか:

    理由1: 柔軟な受注対応を可能にする
    - ACTIVE状態は「社内では確定だが、SAP未登録」の仮予約
    - 物理在庫が不足していても、緊急受注を仮押さえしたいケースがある
    - 例: 「納期調整が必要だが、とりあえず受注だけ受け付ける」

    理由2: 過剰予約（オーバーブッキング）の許容
    - ビジネス要件: 在庫不足でも受注を受け付け、後で調達・調整する運用
    - 航空業界のオーバーブッキングと同様の考え方
    - 実際の出荷時までに在庫が補充される見込みがあれば問題ない

    理由3: システム運用の安定性
    - SAP登録は外部システムとの連携のため、即座に完了しない
    - ACTIVE状態の予約が大量にあっても、利用可能数量計算に影響させない
    - → 新規受注の可否判定がSAP連携の遅延に左右されない

    トレードオフ:
    - 実在庫を超える予約が可能 → 出荷時に在庫不足が判明するリスク
    - → 運用でカバー: 定期的な在庫確認、発注点管理、緊急調達体制

    Note: Active (Provisional) reservations are EXCLUDED to allow overbooking/provisional
    reservations even if stock is insufficient, per business requirement.
    """
    return get_confirmed_reserved_quantity(db, lot_id)


def get_available_quantity(db: Session, lot: LotReceipt) -> Decimal:
    """Calculate available quantity for a lot.

    available = received_quantity - reserved_quantity - locked_quantity
    """
    reserved = get_reserved_quantity(db, lot.id)
    locked = lot.locked_quantity or Decimal(0)
    current = lot.received_quantity or Decimal(0)
    return current - reserved - locked


def get_available_quantity_by_id(db: Session, lot_id: int) -> Decimal:
    """Calculate available quantity for a lot by ID.

    available = current_quantity - reserved_quantity - locked_quantity
    """
    lot = db.query(LotReceipt).filter(LotReceipt.id == lot_id).first()
    if not lot:
        return Decimal(0)
    return get_available_quantity(db, lot)


def get_allocatable_quantity(db: Session, lot: LotReceipt) -> Decimal:
    """Calculate allocatable quantity (excluding locked).

    allocatable = current_quantity - reserved_quantity
    Used for allocation where locked stock might still be considered.
    """
    reserved = get_reserved_quantity(db, lot.id)
    current = lot.received_quantity or Decimal(0)
    return current - reserved


# Subquery for use in SQLAlchemy queries
def reserved_quantity_subquery(db: Session):
    """Create a subquery that returns reserved_qty per lot_id.

    Usage in query:
        reserved_subq = reserved_quantity_subquery(db)
        query = (
            db.query(Lot, func.coalesce(reserved_subq.c.reserved_qty, 0))
            .outerjoin(reserved_subq, Lot.id == reserved_subq.c.lot_id)
        )
    """
    return (
        db.query(
            LotReservation.lot_id.label("lot_id"),
            func.sum(LotReservation.reserved_qty).label("reserved_qty"),
        )
        .filter(LotReservation.status == ReservationStatus.CONFIRMED)
        .group_by(LotReservation.lot_id)
        .subquery()
    )
