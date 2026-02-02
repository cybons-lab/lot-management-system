"""Data access for products.

【設計意図】製品リポジトリの設計判断:

1. なぜシンプルなCRUD設計なのか
   理由: 製品マスタは頻繁に変更されない静的データ
   背景:
   - 製品マスタ: メーカー品番、製品名、単位等の基本情報
   - 更新頻度: 低（新製品登録、廃番処理のみ）
   → 複雑なビジネスロジックは不要、シンプルなCRUDで十分
   設計原則:
   - YAGNI（You Aren't Gonna Need It）: 必要になるまで複雑化しない

2. list() のページネーション設計（L17-39）
   理由: 大量データの効率的な取得
   業務的背景:
   - 製品マスタ: 数千〜数万件の製品データ
   - フロントエンド: 一度に全件表示すると遅い
   → ページネーション（page, per_page）で必要な分だけ取得
   実装:
   - offset((page - 1) * per_page).limit(per_page)
   → 例: page=2, per_page=50 → offset(50).limit(50)

3. 検索機能（q パラメータ）の設計（L20-27）
   理由: 製品マスタの柔軟な検索
   検索対象:
   - maker_part_code: メーカー品番（例: "ABC-123"）
   - product_name: 製品名（例: "ブレーキパッド"）
   SQL:
   - ilike(pattern): 大文字小文字を区別しない部分一致検索
   → PostgreSQL の ILIKE 演算子を使用
   業務シナリオ:
   - 営業担当者: 「ブレーキ」で検索 → 「ブレーキパッド」「ブレーキローター」がヒット

4. 総件数取得の設計（L29-32）
   理由: ページネーションのUI表示
   実装:
   - select(func.count(Product.id))
   → フィルタ条件を適用した後の総件数を取得
   用途:
   - フロントエンド: 「全100件中 1-50件を表示」と表示
   - ページング制御: 「次へ」ボタンの有効/無効判定

5. なぜ2回クエリを発行するのか（L29-32, L34-38）
   理由: 総件数とデータを別々に取得
   実装:
   - 1回目: SELECT COUNT(*) → 総件数
   - 2回目: SELECT * ... LIMIT 50 → 実データ
   トレードオフ:
   - デメリット: クエリ2回（パフォーマンス影響）
   - メリット: 総件数とデータを独立して取得（柔軟性）
   代替案:
   - SELECT COUNT(*) OVER() ... → 1回で取得可能
   → ただし、複雑度が上がるため、シンプルな2回クエリを採用

6. cast() の使用理由（L38）
   理由: 型安全性の向上
   背景:
   - scalars().all() は Any 型を返す
   → mypy等の型チェッカーで型エラーを防ぐため cast() を使用
   型ヒント:
   - list[Product] を明示することで、IDEの補完が効く

7. get() の設計（L41-43）
   理由: ID による単一製品の取得
   実装:
   - session.get(Product, supplier_item_id)
   → SQLAlchemy 2.0 の get() メソッド（主キー検索）
   メリット:
   - セッションキャッシュを活用（同一トランザクション内で2回目以降は高速）

8. flush() の使用理由（L48, L53, L59）
   理由: 即座にSQLを発行してIDを取得
   背景:
   - add(product) → メモリ上のオブジェクト追加（SQL未発行）
   - flush() → INSERT発行、IDを取得（コミットはしない）
   用途:
   - 作成直後に product.id を参照したい場合
   → flush() でIDを確定
   トランザクション:
   - flush() はコミットしない → サービス層でまとめてコミット

9. update() がシンプルな理由（L51-54）
   理由: SQLAlchemy の自動追跡機能
   実装:
   - product.display_name = "新しい名前"
   - flush() → 自動的に UPDATE SQL 発行
   メリット:
   - 明示的な update() 呼び出し不要
   - ORM が変更を追跡し、自動的に SQL 生成

10. delete() の設計（L56-59）
    理由: 物理削除（論理削除ではない）
    実装:
    - session.delete(product)
    - flush() → DELETE SQL 発行
    業務的考慮:
    - 製品マスタ: 論理削除（deleted_at フラグ）は未実装
    → 必要であれば将来的に Soft Delete パターンを導入
    注意:
    - 外部キー制約により、ロット紐付きの製品は削除できない
    → IntegrityError が発生（サービス層でハンドリング）
"""

from typing import Any, cast

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.infrastructure.persistence.models import Product


class ProductRepository:
    """Repository for product persistence."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def list(self, page: int, per_page: int, q: str | None) -> tuple[list[Product], int]:
        """Return products with pagination and optional search."""
        filters: list[Any] = []
        if q:
            pattern = f"%{q}%"
            filters.append(
                or_(
                    Product.maker_part_no.ilike(pattern),
                    Product.display_name.ilike(pattern),
                )
            )

        total_stmt = select(func.count(Product.id)).select_from(Product)
        if filters:
            total_stmt = total_stmt.where(*filters)
        total = self.session.execute(total_stmt).scalar_one()

        stmt = select(Product).order_by(Product.id).offset((page - 1) * per_page).limit(per_page)
        if filters:
            stmt = stmt.where(*filters)

        items = cast(list[Product], self.session.execute(stmt).scalars().all())
        return items, total

    def get(self, supplier_item_id: int) -> Product | None:
        """Fetch a product by id."""
        return cast(Product | None, self.session.get(Product, supplier_item_id))

    def create(self, product: Product) -> Product:
        """Persist a new product."""
        self.session.add(product)
        self.session.flush()
        return product

    def update(self, product: Product) -> Product:
        """Flush changes for an existing product."""
        self.session.flush()
        return product

    def delete(self, product: Product) -> None:
        """Delete a product."""
        self.session.delete(product)
        self.session.flush()
