"""Soft Delete Mixin for master data models.

This module provides a mixin class for implementing soft delete functionality
using the valid_to date approach. Records are considered "deleted" when their
valid_to date is in the past.

【設計意図】Soft Delete（論理削除）パターンの設計判断:

1. なぜ物理削除（DELETE）ではなく論理削除なのか
   理由: マスタデータの履歴追跡と参照整合性の保持
   業務背景:
   - 自動車部品商社では、得意先・仕入先・製品等のマスタ変更履歴が重要
   - 例: 2年前の受注データを見た時、当時の製品名・得意先名を表示したい
   → 物理削除すると、過去データの参照が壊れる（NULL参照）
   → 論理削除なら、過去データから削除済みマスタを参照可能

2. なぜ valid_to（有効終了日）方式を採用したのか
   理由: 「いつまで有効だったか」を明示的に記録
   代替案との比較:
   - deleted_at方式: 削除日時のみ記録（NULL = 有効, 日時あり = 削除済み）
   → 「いつまで有効だったか」が不明確
   - is_deleted (boolean): 削除フラグのみ（True/False）
   → 削除日が分からない
   - valid_to方式: 「9999-12-31まで有効」= 有効、「過去日付」= その日まで有効だった
   → 時点復元が可能（例: 「2023年1月1日時点で有効だったマスタ一覧」）

3. なぜ 9999-12-31 を「無期限有効」とするのか
   理由: NULL回避とクエリの簡潔性
   - NULL を使うと、WHERE valid_to > CURRENT_DATE OR valid_to IS NULL が必要
   → 常に OR条件が必要で複雑
   - 9999-12-31 を使うと、WHERE valid_to > CURRENT_DATE だけでOK
   → シンプルなクエリ、インデックスも効率的

4. valid_to > date.today() の設計（L50）
   理由: 「今日を含む過去」は無効とする
   業務ルール:
   - valid_to = 2024-12-27（今日）→ 今日で有効期限切れ → 無効
   - valid_to = 2024-12-28（明日）→ まだ有効 → 有効
   → 厳格な日付管理、境界値の明確化

5. soft_delete() でデフォルト「昨日」にする理由（L74）
   理由: 「即座に無効化」の意図を明確に表現
   - 今日（date.today()）だと、is_active判定（>today()）で今日は有効と判定される
   → 削除したのに一瞬有効になる
   - 昨日（today() - 1日）だと、確実に無効になる
   → 削除操作が即座に反映される

6. get_active_filter() でfunc.current_date()を使う理由（L93）
   理由: データベース側の日付を基準にする
   - Python側の date.today(): アプリサーバーのタイムゾーン依存
   → サーバー複数台でタイムゾーンが異なると、結果が不整合
   - DB側の CURRENT_DATE: DBサーバーの日付
   → 全てのアプリサーバーで一貫した結果
   → クエリのキャッシュやプリコンパイルも可能
"""

from datetime import date
from typing import ClassVar

from sqlalchemy import Date, text
from sqlalchemy.orm import Mapped, mapped_column


# Default value for valid_to (indefinitely valid)
INFINITE_VALID_TO = date(9999, 12, 31)


class SoftDeleteMixin:
    """Mixin for soft delete functionality using valid_to date.

    This mixin adds a `valid_to` column to the model and provides methods
    for soft deletion and checking if a record is active.

    Usage:
        class MyModel(Base, SoftDeleteMixin):
            __tablename__ = "my_table"
            id: Mapped[int] = mapped_column(primary_key=True)
            name: Mapped[str] = mapped_column(String(100))
    """

    # Class variable to track that this model supports soft delete
    __soft_delete__: ClassVar[bool] = True

    valid_to: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        server_default=text("'9999-12-31'"),
        doc="有効終了日。9999-12-31は無期限有効を示す。",
    )

    @property
    def is_active(self) -> bool:
        """Check if the record is currently active (not soft deleted).

        Returns:
            True if valid_to is in the future (after today), False otherwise.
            A record with valid_to = today is considered inactive.
        """
        return self.valid_to > date.today()

    @property
    def is_soft_deleted(self) -> bool:
        """Check if the record has been soft deleted.

        Returns:
            True if valid_to is today or in the past, False otherwise.
        """
        return self.valid_to <= date.today()

    def soft_delete(self, end_date: date | None = None) -> None:
        """Mark this record as soft deleted.

        Args:
            end_date: The date until which the record is valid.
                     Defaults to yesterday (immediately inactive).
        """
        from datetime import timedelta

        if end_date is not None:
            self.valid_to = end_date
        else:
            # Set to yesterday so the record is immediately inactive
            self.valid_to = date.today() - timedelta(days=1)

    def restore(self) -> None:
        """Restore a soft-deleted record to active status."""
        self.valid_to = INFINITE_VALID_TO

    @classmethod
    def get_active_filter(cls):
        """Get a SQLAlchemy filter expression for active records.

        Returns:
            A filter expression that can be used in queries.
            Filters to records where valid_to > today.

        Usage:
            session.query(MyModel).filter(MyModel.get_active_filter())
        """
        from sqlalchemy import func

        return cls.valid_to > func.current_date()
