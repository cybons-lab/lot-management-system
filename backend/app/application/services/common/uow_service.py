r"""Unit of Work (UoW) パターンの実装.

【設計意図】Unit of Work パターンの設計判断:

1. なぜ Unit of Work パターンを採用したのか
   理由: 複数のリポジトリ操作を単一のトランザクションでまとめる
   業務要件:
   - 受注登録時: Order作成 + OrderLine複数作成 + 在庫引当 を一括トランザクション
   - 入庫処理時: Lot作成 + StockHistory記録 + 予約在庫の更新 を一括トランザクション
   → 途中で失敗したら全てロールバック（原子性保証）

   代替案との比較:
   - 各リポジトリが独自にcommit → 途中で失敗すると不整合
   - グローバルなトランザクション管理 → 密結合、テストが困難
   - UoW → トランザクション境界を明示的に制御、テスタブル

2. なぜ AbstractContextManager を継承するのか
   理由: with文でトランザクション境界を明確に表現
   使用例:
   ```python
   with UnitOfWork(session_factory) as uow:
       uow.session.add(order)
       uow.session.add(order_line)
       # with ブロック終了時に自動commit
   ```
   メリット:
   - トランザクション開始・終了が視覚的に明確
   - 例外発生時に自動rollback（L22-23）
   - Pythonの慣用的パターン（コンテキストマネージャー）

3. なぜ session.begin() を明示的に呼ぶのか（L14）
   理由: トランザクション開始を明示的にする
   SQLAlchemyの動作:
   - autocommit=False の場合、最初のクエリで暗黙的にトランザクション開始
   - 明示的に begin() を呼ぶことで、トランザクション境界が明確になる
   → デバッグ時に「いつトランザクションが開始されたか」が分かりやすい

4. __exit__ での commit/rollback ロジック（L17-25）
   理由: 例外の有無でトランザクションの成否を判定
   動作:
   - exc_type is None → 正常終了 → commit
   - exc_type is not None → 例外発生 → rollback
   メリット:
   - with ブロック内でraiseしても、自動的にrollback
   - try-finally で明示的にrollbackを書く必要がない
   例:
   ```python
   with UnitOfWork(session_factory) as uow:
       # 何か処理
       raise ValueError("エラー")  # 自動的にrollback
   ```

5. finally で session.close() する理由（L24-25）
   理由: commit/rollback に関わらず、必ずコネクションを返却
   背景:
   - データベースコネクションプールの枯渇を防ぐ
   - 長時間セッションを保持すると、他のリクエストがコネクション待ちになる
   → 必ず close() してコネクションプールに返却

6. session_factory パターンの採用（L8-9）
   理由: 依存性注入（DI）とテスタビリティの向上
   設計:
   - UnitOfWork はセッション生成方法を知らない（factory経由で取得）
   → テスト時に、モックセッションファクトリを注入可能
   本番環境:
   ```python
   uow = UnitOfWork(lambda: SessionLocal())
   ```
   テスト環境:
   ```python
   uow = UnitOfWork(lambda: mock_session)
   ```
"""

from collections.abc import Callable
from contextlib import AbstractContextManager

from sqlalchemy.orm import Session


class UnitOfWork(AbstractContextManager):
    def __init__(self, session_factory: Callable[[], Session]):
        self._session_factory = session_factory
        self.session: Session | None = None

    def __enter__(self):
        self.session = self._session_factory()
        self.session.begin()  # 明示開始
        return self

    def __exit__(self, exc_type, exc, tb):
        assert self.session is not None, "Session not initialized"
        try:
            if exc_type is None:
                self.session.commit()
            else:
                self.session.rollback()
        finally:
            self.session.close()
