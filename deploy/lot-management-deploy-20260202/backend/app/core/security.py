"""Security utilities (JWT).

【設計意図】JWT認証の設定値について:

1. ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24（1日）
   理由: 在庫管理システムの業務特性
   - 営業担当者は終日システムを使用
   - 頻繁なログイン要求はユーザビリティを損なう
   → 1日有効なトークンで業務を継続できる

   セキュリティとの兼ね合い:
   - 短期: セキュアだが、ユーザーの手間が増える
   - 長期: 便利だが、トークン盗難のリスク
   → 社内システムかつVPN経由のため、1日は許容範囲

   将来の改善案:
   - リフレッシュトークン機構の導入
   - アクセストークン15分 + リフレッシュトークン1週間

2. デフォルト15分（create_access_token内）
   用途: 特定の短期操作用（パスワードリセット等）
   → 通常のログインでは明示的に1日を指定

3. SECRET_KEY（開発用ハードコード）
   注意: 本番環境では必ず環境変数から読み込むこと
   → 現状は開発の利便性を優先
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt  # PyJWT

from app.core.config import settings


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return str(encoded_jwt)


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify JWT."""
    try:
        payload: dict[str, Any] = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        return payload
    except jwt.PyJWTError:
        return None
