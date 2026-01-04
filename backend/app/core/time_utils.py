"""Time utilities for consistent UTC timestamp handling.

This module provides helpers for generating timezone-aware UTC timestamps.
All persisted timestamps in the application should use these helpers.
"""

from datetime import UTC, datetime


def utcnow() -> datetime:
    """Return the current time as a timezone-aware UTC datetime.

    Use this instead of datetime.now() or datetime.utcnow() for all
    persisted timestamps to ensure timezone consistency.

    【設計意図】なぜUTCタイムスタンプを使うのか:

    1. タイムゾーンの問題を回避
       理由: システムが日本で稼働していても、サーバーのタイムゾーン設定に依存しない
       → UTCで統一することで、サーバー移行やクラウド環境でも一貫性を保つ
       例: AWSのデフォルトタイムゾーンはUTC、ローカル開発はJST
       → すべてUTCで保存し、表示時にJSTに変換（フロントエンド側で処理）

    2. datetime.now(UTC) vs datetime.utcnow()
       理由: datetime.utcnow()は非推奨（timezone情報なし）
       → datetime.now(UTC)はtimezone-aware（tzinfo付き）
       → SQLAlchemyやPydanticでのシリアライズ時にエラーを防ぐ
       参考: Python 3.12+では datetime.utcnow() は非推奨

    3. データベースとの整合性
       理由: PostgreSQLのTIMESTAMPTZカラムに保存する際、timezone情報が必要
       → timezone-naiveなdatetimeはデータベース側でタイムゾーン解釈が曖昧
       → UTC明示で保存することで、データ精度を保証

    4. アプリケーション全体での統一
       用途: created_at、updated_at、adjusted_at等、すべてのタイムスタンプで使用
       → システム全体で時刻基準を統一することで、比較演算が安全

    Returns:
        datetime: Current time in UTC with timezone info attached.
    """
    return datetime.now(UTC)
