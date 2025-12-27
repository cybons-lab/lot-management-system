# backend/app/repositories/order_repository.py
"""受注リポジトリ DBアクセスのみを責務とする.

【設計意図】リポジトリパターンの設計判断:

1. リポジトリの責務範囲
   責務: データベースアクセスのみ（CRUD操作）
   → ビジネスロジックは含めない（Service層が担当）
   → トランザクション制御（commit/rollback）も含めない（Service層が担当）
   理由:
   - 単一責任の原則（SRP）: リポジトリはデータ永続化のみ
   - テスタビリティ: リポジトリをモック化しやすい

2. selectinload vs joinedload の使い分け（L33）
   使い分け基準:
   - selectinload: 1対多リレーション（Order → OrderLines）
     → 複数明細がある場合、JOINだとOrderが重複する
     → 別クエリで明細を取得し、Pythonでマージ
   - joinedload: 1対1または多対1リレーション（OrderLine → Order/Product）
     → 1行ずつのデータなので、JOINでも重複しない
   パフォーマンス: selectinloadは2回のクエリ（Order取得 + Lines取得）

3. with_lines パラメータ
   理由: 明細が不要な場合はロードしない
   例:
   - 受注一覧表示: 受注ヘッダのみ（明細不要）
   - 受注詳細表示: 受注 + 明細（明細必要）
   → 不要なデータ取得を避け、パフォーマンス向上

4. commit はサービス層で実行（L108, L119, L128）
   理由: トランザクション境界はビジネスロジック単位
   例:
   - 受注作成 + 明細作成 + 在庫引当 → 一括でcommit
   → リポジトリ内でcommitすると、部分的なコミットが発生
   → データの整合性が保てない
   メリット: トランザクションスコープをサービス層で制御

5. cast() の使用（L35）
   理由: SQLAlchemy 2.0 の scalar_one_or_none() は Any 型を返す
   → 型ヒントで Order | None を明示するため cast() を使用
   → mypy等の型チェッカーでエラーを防ぐ
"""

from datetime import date
from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.infrastructure.persistence.models import Order, OrderLine
from app.infrastructure.persistence.models.masters_models import Customer


class OrderRepository:
    """受注リポジトリ（SQLAlchemy 2.0準拠）."""

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, order_id: int, with_lines: bool = False) -> Order | None:
        """IDで受注を取得.

        Args:
            order_id: 受注ID
            with_lines: 受注明細を含めるか

        Returns:
            受注エンティティ（存在しない場合はNone）
        """
        stmt = select(Order).where(Order.id == order_id)

        # 【設計】selectinloadで明細を別クエリで取得（N+1回避）
        if with_lines:
            stmt = stmt.options(selectinload(Order.order_lines))

        return cast(Order | None, self.db.execute(stmt).scalar_one_or_none())

    def find_by_order_no(self, order_no: str) -> Order | None:
        """受注番号で受注を取得.

        Args:
            order_no: 受注番号

        Returns:
            受注エンティティ（存在しない場合はNone）
        """
        stmt = select(Order).where(Order.order_no == order_no)  # type: ignore[attr-defined]
        return cast(Order | None, self.db.execute(stmt).scalar_one_or_none())

    def find_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: str | None = None,
        customer_code: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Order]:
        """受注一覧を取得.

        Args:
            skip: スキップ件数
            limit: 取得件数
            status: ステータスフィルタ
            customer_code: 得意先コードフィルタ
            date_from: 開始日フィルタ
            date_to: 終了日フィルタ

        Returns:
            受注エンティティのリスト
        """
        stmt = select(Order)

        if status:
            stmt = stmt.where(Order.status == status)
        if customer_code:
            # JOIN Customer table to filter by customer_code
            # (Order table doesn't have customer_code column in DDL v2.2)
            stmt = stmt.join(Customer, Order.customer_id == Customer.id).where(
                Customer.customer_code == customer_code
            )
        if date_from:
            stmt = stmt.where(Order.order_date >= date_from)
        if date_to:
            stmt = stmt.where(Order.order_date <= date_to)

        stmt = stmt.order_by(Order.order_date.desc()).offset(skip).limit(limit)

        return list(self.db.execute(stmt).scalars().all())

    def create(
        self, order_no: str, customer_code: str, order_date: date, status: str = "open"
    ) -> Order:
        """受注を作成.

        Args:
            order_no: 受注番号
            customer_code: 得意先コード
            order_date: 受注日
            status: ステータス

        Returns:
            作成された受注エンティティ
        """
        order = Order(
            order_no=order_no, customer_code=customer_code, order_date=order_date, status=status
        )
        self.db.add(order)
        # NOTE: commitはservice層で行う
        return order

    def update_status(self, order: Order, new_status: str) -> None:
        """受注ステータスを更新.

        Args:
            order: 受注エンティティ
            new_status: 新しいステータス
        """
        order.status = new_status
        # NOTE: commitはservice層で行う

    def delete(self, order: Order) -> None:
        """受注を削除.

        Args:
            order: 受注エンティティ
        """
        self.db.delete(order)
        # NOTE: commitはservice層で行う


class OrderLineRepository:
    """受注明細リポジトリ（SQLAlchemy 2.0準拠）."""

    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, order_line_id: int) -> OrderLine | None:
        """IDで受注明細を取得.

        Args:
            order_line_id: 受注明細ID

        Returns:
            受注明細エンティティ（存在しない場合はNone）
        """
        stmt = (
            select(OrderLine)
            .options(joinedload(OrderLine.order))
            .options(joinedload(OrderLine.product))
            .where(OrderLine.id == order_line_id)
        )
        return cast(OrderLine | None, self.db.execute(stmt).scalar_one_or_none())

    def find_by_order_id(self, order_id: int) -> list[OrderLine]:
        """受注IDで受注明細を取得.

        Args:
            order_id: 受注ID

        Returns:
            受注明細エンティティのリスト
        """
        stmt = select(OrderLine).where(OrderLine.order_id == order_id).order_by(OrderLine.id)
        return list(self.db.execute(stmt).scalars().all())

    def find_by_order_group_id(self, order_group_id: int) -> list[OrderLine]:
        """受注グループIDで受注明細を取得.

        Args:
            order_group_id: 受注グループID

        Returns:
            受注明細エンティティのリスト
        """
        stmt = (
            select(OrderLine)
            .where(OrderLine.order_group_id == order_group_id)
            .order_by(OrderLine.customer_order_no)
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_by_customer_order_key(
        self,
        order_group_id: int,
        customer_order_no: str,
    ) -> OrderLine | None:
        """得意先側業務キーで受注明細を取得.

        Args:
            order_group_id: 受注グループID
            customer_order_no: 得意先6桁受注番号

        Returns:
            受注明細エンティティ（存在しない場合はNone）
        """
        stmt = select(OrderLine).where(
            OrderLine.order_group_id == order_group_id,
            OrderLine.customer_order_no == customer_order_no,
        )
        return cast(OrderLine | None, self.db.execute(stmt).scalar_one_or_none())

    def find_by_sap_order_key(
        self,
        sap_order_no: str,
        sap_order_item_no: str,
    ) -> OrderLine | None:
        """SAP側業務キーで受注明細を取得.

        Args:
            sap_order_no: SAP受注番号
            sap_order_item_no: SAP明細番号

        Returns:
            受注明細エンティティ（存在しない場合はNone）
        """
        stmt = select(OrderLine).where(
            OrderLine.sap_order_no == sap_order_no,
            OrderLine.sap_order_item_no == sap_order_item_no,
        )
        return cast(OrderLine | None, self.db.execute(stmt).scalar_one_or_none())

    def create(
        self,
        order_id: int,
        line_no: int,
        product_code: str,
        quantity: float,
        unit: str,
        due_date: date | None = None,
    ) -> OrderLine:
        """受注明細を作成.

        Args:
            order_id: 受注ID
            line_no: 明細行番号
            product_code: 製品コード
            quantity: 数量
            unit: 単位
            due_date: 納期

        Returns:
            作成された受注明細エンティティ
        """
        order_line = OrderLine(
            order_id=order_id,
            line_no=line_no,
            product_code=product_code,
            quantity=quantity,
            unit=unit,
            due_date=due_date,
        )
        self.db.add(order_line)
        # NOTE: commitはservice層で行う
        return order_line

    def update_status(self, order_line: OrderLine, new_status: str) -> None:
        """受注明細ステータスを更新.

        Args:
            order_line: 受注明細エンティティ
            new_status: 新しいステータス
        """
        order_line.status = new_status
        # NOTE: commitはservice層で行う

    def update_sap_order_key(
        self,
        order_line: OrderLine,
        sap_order_no: str,
        sap_order_item_no: str,
    ) -> None:
        """SAP側業務キーを更新（SAP登録後に呼び出す）.

        Args:
            order_line: 受注明細エンティティ
            sap_order_no: SAP受注番号
            sap_order_item_no: SAP明細番号
        """
        order_line.sap_order_no = sap_order_no
        order_line.sap_order_item_no = sap_order_item_no
        # NOTE: commitはservice層で行う
