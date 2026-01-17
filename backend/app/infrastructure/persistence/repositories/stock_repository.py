# backend/app/repositories/stock_repository.py
"""Repository helpers for stock validation and FIFO lot retrieval.

【設計意図】在庫リポジトリの設計判断:

1. なぜ専用のStockRepositoryを作るのか
   理由: 受注検証特化のデータアクセス層
   背景:
   - LotRepository: 汎用的なロット操作（CRUD、候補検索）
   - StockRepository: 受注検証に特化（FIFO、期限チェック、在庫数量計算）
   設計原則:
   - 単一責任の原則（SRP）: 用途ごとにリポジトリを分離
   メリット:
   - 受注検証ロジックが独立し、変更影響が限定的

2. find_fifo_lots_for_allocation() の設計（L21-65）
   理由: 受注向けFIFOロット取得の専用メソッド
   業務的背景:
   - 受注検証: 「この受注に対して在庫が足りるか？」
   - FIFO（First In First Out）: 入荷日が古い順に引当
   用途:
   - 受注入力時の在庫確認
   - 引当可能性の事前チェック
   戻り値:
   - FIFO順にソートされたロットリスト

3. なぜ product_id と warehouse_id を使うのか（L33-35, L44-45）
   理由: DDL v2.2 準拠
   設計:
   - v1.x: product_code, warehouse_code（文字列）で検索
   - v2.2: product_id, warehouse_id（数値）で検索
   → 正規化により、コード変更時の影響を最小化
   メリット:
   - 外部キー制約による整合性保証
   - JOINが高速（数値インデックス）

4. 期限切れフィルタの設計（L51-53）
   理由: 出荷可能なロットのみ対象
   業務ルール:
   - ship_date 指定時: 出荷日に期限切れのロットは除外
   - ship_date なし: 期限チェックしない（全ロット対象）
   SQL:
   - or_(expiry_date IS NULL, expiry_date >= ship_date)
   → 期限なしロットも含める
   業務影響:
   - 期限切れ部品の出荷防止

5. 検査ステータスフィルタ（L48）
   理由: 出荷可能なロットのみ対象（v2.3）
   業務ルール:
   - not_required: 検査不要品（即出荷可能）
   - passed: 検査合格品（出荷可能）
   - pending: 検査中（出荷不可）
   - failed: 検査不合格（出荷不可）
   SQL:
   - inspection_status IN ('not_required', 'passed')
   業務影響:
   - 不合格品の誤出荷を防止

6. FIFOソート順の設計（L55-56）
   理由: 入荷日が古い順に出荷
   ソートロジック:
   - 第1キー: received_date ASC（入荷日昇順）
   - 第2キー: id ASC（タイブレーカー）
   タイブレーカーの重要性:
   - 同一入荷日のロットが複数ある場合、決定的なソート順を保証
   - テストの再現性向上

7. skip_locked の使用理由（L62）
   理由: 並行処理時の待機回避
   背景:
   - for_update=True: 行ロック取得（競合時は待機）
   - skip_locked=True: 競合ロットをスキップ（待機しない）
   業務シナリオ:
   - 複数ユーザーが同時に受注入力
   → 競合ロットは次のロットで引当（タイムアウト回避）
   メリット:
   - レスポンス速度優先
   - デッドロック防止

8. calc_available_qty() の設計（L67-78）
   理由: 引当可能数量の計算
   計算式（v2.3）:
   - available = current_quantity - allocated_quantity - locked_quantity
   → 手動ロック数量も考慮
   業務的意義:
   - current_quantity: 実在庫
   - allocated_quantity: 既に引当済みの数量
   - locked_quantity: 手動ロック（出荷保留等）
   戻り値:
   - max(0, ...) で負数を防止

9. なぜ @staticmethod なのか（L67）
   理由: インスタンス状態に依存しない計算
   設計:
   - self を使わない純粋な計算ロジック
   → staticmethod として定義
   メリット:
   - テストが容易（インスタンス化不要）
   - 用途: lot オブジェクトを渡せば計算可能

10. データベース方言の判定（L59-62）
    理由: PostgreSQL/MySQL のみ行ロックをサポート
    設計:
    - dialect_name in {"postgresql", "mysql"}: 行ロック有効化
    - SQLite等: with_for_update() をスキップ
    → 開発環境（SQLite）でもエラーにならない
    メリット:
    - クロスDBの互換性
    - 開発とプロダクションで同じコードが動作
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date

from sqlalchemy import Select, or_, select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import LotReceipt


class StockRepository:
    """Stock access helpers dedicated to order validation use cases."""

    def __init__(self, db: Session):
        self._db = db

    def find_fifo_lots_for_allocation(
        self,
        product_id: int,
        warehouse_id: int,
        ship_date: date | None,
        for_update: bool = True,
    ) -> list[LotReceipt]:
        """Fetch candidate lots in FIFO order with optional row locking.

        v2.2: Updated to use product_id and warehouse_id (DDL compliant).
        Removed joinedload(Lot.current_stock) - no longer needed.

        Args:
            product_id: Product ID (not product_code)
            warehouse_id: Warehouse ID (not warehouse_code)
            ship_date: Optional ship date for expiry filtering
            for_update: Whether to lock rows for update

        Returns:
            List of candidate lots in FIFO order
        """
        stmt: Select[tuple[LotReceipt]] = (
            select(LotReceipt)
            .where(LotReceipt.product_id == product_id)
            .where(LotReceipt.warehouse_id == warehouse_id)
            .where(LotReceipt.status == "active")  # DDL v2.2 compliant
            # v2.3: 検査合格または検査不要のロットのみ対象
            .where(LotReceipt.inspection_status.in_(["not_required", "passed"]))
        )

        # Filter by expiry date if ship_date is provided
        if ship_date is not None:
            stmt = stmt.where(or_(LotReceipt.expiry_date.is_(None), LotReceipt.expiry_date >= ship_date))

        # Order by received_date (FIFO) - DDL v2.2 uses received_date
        stmt = stmt.order_by(LotReceipt.received_date.asc(), LotReceipt.id.asc())

        # Row locking for PostgreSQL/MySQL
        bind = self._db.get_bind()
        dialect_name = bind.dialect.name if bind is not None else ""
        if for_update and dialect_name in {"postgresql", "mysql"}:
            stmt = stmt.with_for_update(skip_locked=True, of=LotReceipt)

        result: Sequence[LotReceipt] = self._db.execute(stmt).scalars().all()
        return list(result)

    @staticmethod
    def calc_available_qty(lot: LotReceipt) -> int:
        """Calculate allocatable quantity for a lot.

        v2.3: ロック数量を考慮 (current - allocated - locked).
        """
        current_qty = float(getattr(lot, "current_quantity", 0) or 0)
        allocated_qty = float(getattr(lot, "allocated_quantity", 0) or 0)
        locked_qty = float(getattr(lot, "locked_quantity", 0) or 0)

        available = current_qty - allocated_qty - locked_qty
        return max(0, int(round(available)))
