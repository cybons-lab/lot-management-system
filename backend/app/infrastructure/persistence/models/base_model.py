# backend/app/models/base_model.py
"""SQLAlchemy declarative base utilities.

【設計意図】DeclarativeBase の設計判断:

1. なぜ DeclarativeBase を使うのか（SQLAlchemy 2.0+）
   理由: SQLAlchemy 2.0 の新しい型安全な設計
   SQLAlchemy 1.x との違い:
   - 1.x: declarative_base() 関数でクラスを生成
   → 型チェッカー（mypy, pyright）がBase型を正しく推論できない
   - 2.0: DeclarativeBase クラスを継承
   → 型安全、IDE補完が効く、Mapped[]型との相性が良い

2. なぜ空のクラスなのか（pass のみ）
   理由: 全モデル共通の基底クラスとして機能すれば十分
   用途:
   - metadata属性の共有（全テーブルのメタデータを一元管理）
   - クエリビルダーの共通基盤
   - マイグレーションツール（Alembic）がmetadataを参照
   → カスタムメソッドは Mixin で追加（SoftDeleteMixin等）

3. なぜ Base に共通メソッドを追加しないのか
   理由: 責務の分離（SRP: Single Responsibility Principle）
   設計判断:
   - Base: ORM宣言の基盤のみを提供
   - Mixin: 特定機能（soft delete, timestamp等）を提供
   → 必要な機能だけを選択的に継承可能
   例:
   - class Product(Base, SoftDeleteMixin, TimestampMixin): ...
   - class StockHistory(Base, TimestampMixin): ... （soft deleteは不要）
   メリット: 各モデルが必要な機能のみを持つ（肥大化を防ぐ）

4. 配置場所の意図（infrastructure/persistence/models/base_model.py）
   理由: レイヤードアーキテクチャの一部
   構造:
   - domain/: 純粋なビジネスロジック（ORMに依存しない）
   - infrastructure/persistence/: データ永続化の詳細
   → Baseはインフラストラクチャ層の責務
   → ドメイン層はORMに依存せず、リポジトリパターンで分離
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""

    pass
